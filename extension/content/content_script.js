(function () {
  const INLINE_LAUNCHER_ROOT_ID = "familyos-inline-launcher";
  const INLINE_LAUNCHER_STYLE_ID = "familyos-inline-launcher-style";
  const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "file", "image"]);
  let detectionTimeout = null;
  let observer = null;
  let lastReportedFieldCount = -1;
  let feedbackListenerAttached = false;
  const feedbackTracking = new Map();

  function escapeSelector(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function getElementType(el) {
    if (!el) return "text";
    if (el.tagName === "SELECT") return "select";
    if (el.tagName === "TEXTAREA") return "textarea";
    return (el.type || "text").toLowerCase();
  }

  function elementFieldName(el) {
    if (!el) return "";
    return String(el.name || el.id || "").trim();
  }

  function findElementsByFieldName(fieldName) {
    if (!fieldName) return [];

    const byName = document.querySelectorAll(`[name="${escapeSelector(fieldName)}"]`);
    if (byName.length) {
      return Array.from(byName);
    }

    const byId = document.getElementById(fieldName);
    return byId ? [byId] : [];
  }

  function readFieldValue(fieldName) {
    const elements = findElementsByFieldName(fieldName);
    if (!elements.length) return "";

    const type = getElementType(elements[0]);
    if (type === "radio") {
      const checked = elements.find((el) => el.checked);
      return checked ? String(checked.value || "").trim() : "";
    }

    if (type === "checkbox") {
      if (elements.length > 1) {
        return elements
          .filter((el) => el.checked)
          .map((el) => String(el.value || "true").trim())
          .join(",");
      }

      const [el] = elements;
      return el.checked ? String(el.value || "true").trim() : "";
    }

    return String(elements[0].value ?? "").trim();
  }

  function queueFeedbackEvent(eventPayload) {
    chrome.runtime.sendMessage({
      action: "queue_feedback_events",
      events: [eventPayload]
    }).catch(() => {});
  }

  function trackedFieldRecord(fieldName) {
    return feedbackTracking.get(String(fieldName || "").trim()) || null;
  }

  function buildTrackingIndex(fields, suggestions) {
    feedbackTracking.clear();

    const suggestionsByFieldId = new Map();
    const suggestionsByFieldName = new Map();

    (suggestions || []).forEach((suggestion) => {
      if (suggestion?.field_id) suggestionsByFieldId.set(suggestion.field_id, suggestion);
      if (suggestion?.field_name && !suggestionsByFieldName.has(suggestion.field_name)) {
        suggestionsByFieldName.set(suggestion.field_name, suggestion);
      }
    });

    (fields || []).forEach((field) => {
      const fieldName = String(field?.field_name || "").trim();
      if (!fieldName) return;

      const suggestion =
        suggestionsByFieldId.get(field.field_id) ||
        suggestionsByFieldName.get(fieldName) ||
        null;

      feedbackTracking.set(fieldName, {
        field_id: String(field.field_id || fieldName).trim(),
        field_name: fieldName,
        has_suggestion: Boolean(suggestion),
        suggestion_id: suggestion?.suggestion_id || null,
        suggestion_value: suggestion ? String(suggestion.value ?? "") : "",
        applied_value: null,
        last_manual_value: null,
        last_edited_value: null
      });
    });
  }

  function updateTrackingAfterApply(suggestions, applyResults) {
    const resultMap = new Map();

    (applyResults || []).forEach((result) => {
      if (result?.field_id) resultMap.set(result.field_id, result);
      if (result?.field_name && !resultMap.has(result.field_name)) {
        resultMap.set(result.field_name, result);
      }
    });

    (suggestions || []).forEach((suggestion) => {
      const record = trackedFieldRecord(suggestion?.field_name);
      if (!record) return;

      const result =
        resultMap.get(suggestion.field_id) ||
        resultMap.get(suggestion.field_name) ||
        null;

      if (result?.status !== "filled") return;

      record.applied_value = String(result.final_value ?? suggestion.value ?? "").trim();
      record.suggestion_id = suggestion.suggestion_id || record.suggestion_id;
      record.suggestion_value = String(suggestion.value ?? record.suggestion_value ?? "").trim();
      record.last_edited_value = null;
    });
  }

  function handleTrackedFieldChange(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const fieldName = elementFieldName(target);
    if (!fieldName) return;

    const record = trackedFieldRecord(fieldName);
    if (!record) return;

    const currentValue = readFieldValue(fieldName);

    if (record.applied_value != null) {
      if (currentValue === record.applied_value) {
        record.last_edited_value = null;
        return;
      }

      if (currentValue !== record.last_edited_value) {
        queueFeedbackEvent({
          field_id: record.field_id,
          field_name: record.field_name,
          action: "edited",
          suggestion_id: record.suggestion_id,
          original_value: record.applied_value,
          final_value: currentValue
        });
        record.last_edited_value = currentValue;
      }
      return;
    }

    if (record.has_suggestion || !currentValue || currentValue === record.last_manual_value) {
      return;
    }

    queueFeedbackEvent({
      field_id: record.field_id,
      field_name: record.field_name,
      action: "manual",
      final_value: currentValue
    });
    record.last_manual_value = currentValue;
  }

  function ensureFeedbackTrackingListener() {
    if (feedbackListenerAttached) return;
    document.addEventListener("change", handleTrackedFieldChange, true);
    feedbackListenerAttached = true;
  }

  function fieldOptionsForElement(el, fieldName, type) {
    if (type === "select") {
      return Array.from(el.options || []).map((option) => ({
        label: String(option.textContent || "").trim(),
        value: String(option.value || "").trim()
      }));
    }

    if (type === "radio" || type === "checkbox") {
      return findElementsByFieldName(fieldName)
        .filter((candidate) => getElementType(candidate) === type)
        .map((candidate) => ({
          label: FamilyOSFieldNormalization.findLabelForElement(candidate),
          value: String(candidate.value || "").trim()
        }));
    }

    return undefined;
  }

  function extractFormFields() {
    const fields = [];
    const seen = new Set();
    const nodes = document.querySelectorAll("input, select, textarea");

    nodes.forEach((el) => {
      const type = getElementType(el);
      if (SKIP_TYPES.has(type)) return;
      if (el.disabled || el.readOnly) return;

      const fieldName = el.name || el.id;
      if (!fieldName || seen.has(fieldName)) return;
      seen.add(fieldName);

      const label = FamilyOSFieldNormalization.findLabelForElement(el);
      const section = FamilyOSFieldNormalization.deriveSection(el);
      const descriptor = FamilyOSFieldNormalization.normalizeFieldDescriptor({
        field_id: `${fieldName}|${fields.length}`,
        field_name: fieldName,
        label,
        type,
        section,
        placeholder: el.placeholder || "",
        required: Boolean(el.required),
        autocomplete: el.autocomplete || "",
        options: fieldOptionsForElement(el, fieldName, type)
      });

      fields.push(descriptor);
    });

    return fields;
  }

  function removeLegacyLauncherNodes() {
    const legacyRoot = document.getElementById(INLINE_LAUNCHER_ROOT_ID);
    if (legacyRoot) {
      legacyRoot.remove();
    }

    const legacyStyle = document.getElementById(INLINE_LAUNCHER_STYLE_ID);
    if (legacyStyle) {
      legacyStyle.remove();
    }
  }

  function reportFormPresence(fieldCount) {
    if (fieldCount === lastReportedFieldCount) return;
    lastReportedFieldCount = fieldCount;

    chrome.runtime.sendMessage({
      action: "form_presence_changed",
      fieldCount
    }).catch(() => {});
  }

  function detectAndSyncFormPresence() {
    const fields = extractFormFields();
    removeLegacyLauncherNodes();
    reportFormPresence(fields.length);
  }

  function schedulePresenceSync() {
    if (!topLevelPage()) return;

    window.clearTimeout(detectionTimeout);
    detectionTimeout = window.setTimeout(() => {
      detectAndSyncFormPresence();
    }, 250);
  }

  function startPresenceObserver() {
    if (!topLevelPage()) return;
    if (observer || !document.documentElement) return;

    observer = new MutationObserver(() => {
      schedulePresenceSync();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["type", "name", "id", "placeholder", "required", "disabled", "readonly"]
    });
  }

  function initContentScript() {
    if (!topLevelPage()) return;
    if (!document.body) return;

    detectAndSyncFormPresence();
    startPresenceObserver();
  }

  function setNativeValue(el, value) {
    if (el.tagName === "TEXTAREA") {
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
      if (descriptor?.set) {
        descriptor.set.call(el, value);
        return;
      }
    }

    if (el.tagName === "INPUT") {
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      if (descriptor?.set) {
        descriptor.set.call(el, value);
        return;
      }
    }

    el.value = value;
  }

  function setNativeChecked(el, checked) {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked");
    if (descriptor?.set) {
      descriptor.set.call(el, checked);
      return;
    }
    el.checked = checked;
  }

  function dispatchInputEvents(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function matchOption(options, value, useLabel = false) {
    const target = String(value || "").trim().toLowerCase();
    return options.find((option) => {
      const optionValue = String(option.value || "").trim().toLowerCase();
      const optionLabel = String(option.textContent || "").trim().toLowerCase();
      return useLabel ? optionLabel === target : optionValue === target;
    });
  }

  function applyTextSuggestion(el, value) {
    setNativeValue(el, String(value ?? ""));
    dispatchInputEvents(el);
    return { status: "filled", final_value: String(el.value ?? "") };
  }

  function applySelectSuggestion(el, value, useLabel = false) {
    const options = Array.from(el.options || []);
    const match = matchOption(options, value, useLabel);
    if (!match) return { status: "no_match" };

    el.value = match.value;
    dispatchInputEvents(el);
    return { status: "filled", final_value: String(el.value ?? "") };
  }

  function choiceLabel(el) {
    return FamilyOSFieldNormalization.findLabelForElement(el).toLowerCase();
  }

  function applyBooleanSuggestion(elements, suggestion, checked) {
    if (!elements.length) return { status: "missing" };

    const type = getElementType(elements[0]);
    const target = String(suggestion.value || "").trim().toLowerCase();

    if (type === "radio") {
      if (!checked) return { status: "incompatible" };
      const match = elements.find((el) => {
        return (
          String(el.value || "").trim().toLowerCase() === target ||
          choiceLabel(el) === target
        );
      });
      if (!match) return { status: "no_match" };
      setNativeChecked(match, true);
      dispatchInputEvents(match);
      return { status: "filled", final_value: String(match.value || "") };
    }

    if (elements.length > 1) {
      const match = elements.find((el) => {
        return (
          String(el.value || "").trim().toLowerCase() === target ||
          choiceLabel(el) === target
        );
      });
      if (!match) return { status: "no_match" };
      setNativeChecked(match, checked);
      dispatchInputEvents(match);
      return { status: "filled", final_value: checked ? String(match.value || "") : "" };
    }

    const [el] = elements;
    if (type !== "checkbox") return { status: "incompatible" };
    setNativeChecked(el, checked);
    dispatchInputEvents(el);
    return { status: "filled", final_value: checked ? String(el.value || "true") : "" };
  }

  function applySuggestion(item) {
    const elements = findElementsByFieldName(item.field_name);
    if (!elements.length) {
      return { field_id: item.field_id, field_name: item.field_name, status: "missing" };
    }

    const strategy = String(item.fill_strategy || "").toLowerCase();
    let result = { status: "incompatible" };

    if (strategy === "text") {
      const [el] = elements;
      if (el.tagName === "SELECT" || getElementType(el) === "checkbox" || getElementType(el) === "radio") {
        result = { status: "incompatible" };
      } else {
        result = applyTextSuggestion(el, item.value);
      }
    } else if (strategy === "select_by_value") {
      const [el] = elements;
      result = el?.tagName === "SELECT" ? applySelectSuggestion(el, item.value, false) : { status: "incompatible" };
    } else if (strategy === "select_by_label") {
      const [el] = elements;
      result = el?.tagName === "SELECT" ? applySelectSuggestion(el, item.value, true) : { status: "incompatible" };
    } else if (strategy === "check") {
      result = applyBooleanSuggestion(elements, item, true);
    } else if (strategy === "uncheck") {
      result = applyBooleanSuggestion(elements, item, false);
    } else if (strategy === "skip") {
      result = { status: "skipped" };
    }

    return {
      field_id: item.field_id,
      field_name: item.field_name,
      ...result
    };
  }

  function applySuggestions(suggestions) {
    const results = (suggestions || []).map((item) => applySuggestion(item));
    updateTrackingAfterApply(suggestions, results);
    return {
      filled: results.filter((result) => result.status === "filled").length,
      results
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "extract_fields") {
      sendResponse({ fields: extractFormFields() });
      return true;
    }

    if (msg.action === "apply_suggestions") {
      const response = applySuggestions(msg.suggestions || []);
      sendResponse(response);
      return true;
    }

    if (msg.action === "track_feedback_candidates") {
      buildTrackingIndex(msg.fields || [], msg.suggestions || []);
      ensureFeedbackTrackingListener();
      sendResponse({ ok: true, tracked: feedbackTracking.size });
      return true;
    }

    return false;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContentScript, { once: true });
  } else {
    initContentScript();
  }

  window.addEventListener("pageshow", () => {
    schedulePresenceSync();
  });
})();

