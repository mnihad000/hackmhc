(function (global) {
  const CONTRACT_VERSION = "familyos.autofill.v1";
  const HIGH_CONFIDENCE_THRESHOLD = 0.85;
  const LOW_CONFIDENCE_THRESHOLD = 0.65;
  const SOURCE_PRIORITY = {
    canonical: 4,
    learned: 3,
    rag: 2,
    inferred: 1
  };

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function safeText(value) {
    return value == null ? "" : String(value).trim();
  }

  function createId(prefix) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function confidenceBucket(score) {
    const value = clamp01(score);
    if (value >= HIGH_CONFIDENCE_THRESHOLD) return "high";
    if (value >= LOW_CONFIDENCE_THRESHOLD) return "medium";
    return "low";
  }

  function normalizeSourceType(value) {
    switch (safeText(value).toLowerCase()) {
      case "canonical":
      case "rag":
      case "inferred":
      case "learned":
        return safeText(value).toLowerCase();
      default:
        return "inferred";
    }
  }

  function buildFieldLookup(fields) {
    const byId = new Map();
    const byName = new Map();

    for (const field of fields || []) {
      if (field?.field_id) byId.set(field.field_id, field);
      if (field?.field_name && !byName.has(field.field_name)) {
        byName.set(field.field_name, field);
      }
    }

    return { byId, byName };
  }

  function inferFillStrategy(descriptor, value) {
    const fieldType = safeText(descriptor?.type).toLowerCase();
    const target = safeText(value).toLowerCase();

    if (fieldType === "select") {
      const options = Array.isArray(descriptor?.options) ? descriptor.options : [];
      const matchesValue = options.some((option) => safeText(option.value).toLowerCase() === target);
      return matchesValue ? "select_by_value" : "select_by_label";
    }

    if (fieldType === "checkbox" || fieldType === "radio") {
      return "check";
    }

    return "text";
  }

  function isBetterSuggestion(candidate, current) {
    if (!current) return true;
    if (candidate.confidence !== current.confidence) {
      return candidate.confidence > current.confidence;
    }

    const candidatePriority = SOURCE_PRIORITY[candidate.source_type] || 0;
    const currentPriority = SOURCE_PRIORITY[current.source_type] || 0;
    if (candidatePriority !== currentPriority) {
      return candidatePriority > currentPriority;
    }

    if (candidate.requires_review !== current.requires_review) {
      return current.requires_review;
    }

    return candidate.reason.length > current.reason.length;
  }

  function sortSuggestions(items) {
    return [...items].sort((left, right) => {
      if (left.confidence !== right.confidence) return right.confidence - left.confidence;

      const leftPriority = SOURCE_PRIORITY[left.source_type] || 0;
      const rightPriority = SOURCE_PRIORITY[right.source_type] || 0;
      if (leftPriority !== rightPriority) return rightPriority - leftPriority;

      return left.field_label.localeCompare(right.field_label);
    });
  }

  function legacySuggestionsFromPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.suggestions)) return payload.suggestions;
    if (payload?.fills && typeof payload.fills === "object") {
      return Object.entries(payload.fills).map(([field_name, value]) => ({
        field_name,
        value,
        confidence: 0.8,
        source_type: "rag",
        reason: "legacy_fills_payload"
      }));
    }
    return [];
  }

  function normalizeSuggestion(rawSuggestion, index, lookup) {
    const descriptor =
      lookup.byId.get(rawSuggestion?.field_id) ||
      lookup.byName.get(rawSuggestion?.field_name) ||
      null;

    const fieldName = safeText(rawSuggestion?.field_name || descriptor?.field_name);
    const fallbackFieldId = fieldName ? `${fieldName}|${index}` : `field_${index}|${index}`;
    const fieldId = safeText(rawSuggestion?.field_id || descriptor?.field_id || fallbackFieldId);
    const confidence = clamp01(rawSuggestion?.confidence);
    const sourceType = normalizeSourceType(rawSuggestion?.source_type || rawSuggestion?.sourceType);
    const rawBucket = safeText(rawSuggestion?.confidence_bucket).toLowerCase();
    const bucket =
      rawBucket === "high" || rawBucket === "medium" || rawBucket === "low"
        ? rawBucket
        : confidenceBucket(confidence);
    const fillStrategy = safeText(rawSuggestion?.fill_strategy || inferFillStrategy(descriptor, rawSuggestion?.value));

    return {
      suggestion_id: safeText(rawSuggestion?.suggestion_id || `sug_${fieldId.replace(/[^\w]+/g, "_")}`),
      field_id: fieldId,
      field_name: fieldName,
      field_label: descriptor?.label || fieldName,
      field_type: safeText(descriptor?.type),
      value: String(rawSuggestion?.value ?? ""),
      confidence,
      confidence_bucket: bucket,
      source_type: sourceType,
      source_ref: rawSuggestion?.source_ref ?? rawSuggestion?.sourceRef ?? null,
      profile_key: safeText(
        rawSuggestion?.profile_key || rawSuggestion?.normalized_key || descriptor?.normalized_key || "unknown"
      ),
      reason: safeText(rawSuggestion?.reason),
      fill_strategy: fillStrategy,
      requires_review: Boolean(rawSuggestion?.requires_review)
    };
  }

  function normalizeSuggestionsResponse(payload, fields = []) {
    const lookup = buildFieldLookup(fields);
    const bestByField = new Map();
    const rawSuggestions = legacySuggestionsFromPayload(payload);

    for (let index = 0; index < rawSuggestions.length; index += 1) {
      const suggestion = normalizeSuggestion(rawSuggestions[index], index, lookup);
      if (!suggestion.field_name) continue;
      if (suggestion.confidence_bucket === "low") continue;
      if (suggestion.fill_strategy === "skip") continue;

      const dedupeKey = suggestion.field_id || suggestion.field_name;
      const current = bestByField.get(dedupeKey);
      if (isBetterSuggestion(suggestion, current)) {
        bestByField.set(dedupeKey, suggestion);
      }
    }

    return sortSuggestions(Array.from(bestByField.values()));
  }

  function buildAutofillRequest({ fields, pageUrl, pageTitle, requestId }) {
    const normalizer = global.FamilyOSFieldNormalization?.normalizeFieldDescriptor;
    const normalizedFields = (fields || [])
      .map((field, index) => {
        const fallbackFieldId = safeText(field?.field_id || `${field?.field_name || `field_${index}`}|${index}`);
        const normalized = normalizer
          ? normalizer({ ...field, field_id: fallbackFieldId })
          : { ...field, field_id: fallbackFieldId };

        return {
          ...normalized,
          field_id: safeText(normalized.field_id || fallbackFieldId),
          required: Boolean(normalized.required)
        };
      })
      .filter((field) => field.field_name);

    return {
      contract_version: CONTRACT_VERSION,
      request_id: safeText(requestId || createId("req")),
      page_url: safeText(pageUrl),
      page_title: safeText(pageTitle),
      fields: normalizedFields
    };
  }

  function buildFeedbackEvent(eventPayload) {
    return {
      event_id: safeText(eventPayload?.event_id || createId("evt")),
      timestamp: safeText(eventPayload?.timestamp || new Date().toISOString()),
      field_id: safeText(eventPayload?.field_id),
      field_name: safeText(eventPayload?.field_name),
      action: safeText(eventPayload?.action),
      ...(eventPayload?.suggestion_id ? { suggestion_id: safeText(eventPayload.suggestion_id) } : {}),
      ...(eventPayload?.original_value !== undefined
        ? { original_value: String(eventPayload.original_value ?? "") }
        : {}),
      ...(eventPayload?.final_value !== undefined ? { final_value: String(eventPayload.final_value ?? "") } : {})
    };
  }

  function isSuggestionSelectable(suggestion) {
    return suggestion?.confidence_bucket !== "low" && suggestion?.fill_strategy !== "skip";
  }

  function isSuggestionPreselected(suggestion) {
    return isSuggestionSelectable(suggestion) && suggestion?.confidence_bucket === "high" && !suggestion?.requires_review;
  }

  function buildApplyFeedbackEvents({ displayedSuggestions, selectedFieldIds, applyResults }) {
    const selected = new Set(selectedFieldIds || []);
    const resultMap = new Map();

    for (const result of applyResults || []) {
      if (result?.field_id) resultMap.set(result.field_id, result);
      if (result?.field_name && !resultMap.has(result.field_name)) {
        resultMap.set(result.field_name, result);
      }
    }

    const events = [];
    for (const suggestion of displayedSuggestions || []) {
      if (!isSuggestionSelectable(suggestion)) continue;

      const result = resultMap.get(suggestion.field_id) || resultMap.get(suggestion.field_name) || null;
      const wasSelected = selected.has(suggestion.field_id);

      if (wasSelected) {
        const wasFilled = result?.status === "filled";
        events.push(
          buildFeedbackEvent({
            action: wasFilled ? "accepted" : "rejected",
            field_id: suggestion.field_id,
            field_name: suggestion.field_name,
            suggestion_id: suggestion.suggestion_id,
            original_value: suggestion.value,
            final_value: result?.final_value ?? suggestion.value
          })
        );
        continue;
      }

      events.push(
        buildFeedbackEvent({
          action: "rejected",
          field_id: suggestion.field_id,
          field_name: suggestion.field_name,
          suggestion_id: suggestion.suggestion_id,
          original_value: suggestion.value
        })
      );
    }

    return events;
  }

  const api = {
    CONTRACT_VERSION,
    buildApplyFeedbackEvents,
    buildAutofillRequest,
    buildFeedbackEvent,
    confidenceBucket,
    createId,
    inferFillStrategy,
    isSuggestionPreselected,
    isSuggestionSelectable,
    normalizeSuggestionsResponse
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.FamilyOSAutofillRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
