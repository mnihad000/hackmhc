(function (global) {
  const DEFAULT_WEIGHTS = {
    semantic: 0.45,
    schema: 0.2,
    validation: 0.2,
    source: 0.15
  };

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function sourceReliabilityScore(sourceType) {
    switch (String(sourceType || "").toLowerCase()) {
      case "canonical":
        return 1;
      case "learned":
        return 0.85;
      case "rag":
        return 0.7;
      case "inferred":
        return 0.5;
      default:
        return 0.4;
    }
  }

  function validationScore(fieldType, value) {
    const v = String(value || "").trim();
    const t = String(fieldType || "text").toLowerCase();
    if (!v) return 0;

    if (t === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 1 : 0;
    if (t === "tel") return /^[+()\d\s-]{7,}$/.test(v) ? 1 : 0.2;
    if (t === "date") return /^\d{4}-\d{2}-\d{2}$/.test(v) ? 1 : 0.2;
    return 1;
  }

  function schemaMatchScore(descriptor, suggestion) {
    const a = String(descriptor.normalized_key || "unknown");
    const b = String(suggestion.normalized_key || "unknown");
    if (a === "unknown" || b === "unknown") return 0.5;
    return a === b ? 1 : 0.2;
  }

  function computeConfidence(descriptor, suggestion, weights = DEFAULT_WEIGHTS) {
    const semantic = clamp01(suggestion.semantic_score);
    const schema = schemaMatchScore(descriptor, suggestion);
    const validation = validationScore(descriptor.type, suggestion.value);
    const source = sourceReliabilityScore(suggestion.sourceType || suggestion.source_type);

    const score =
      semantic * weights.semantic +
      schema * weights.schema +
      validation * weights.validation +
      source * weights.source;

    return {
      score: clamp01(score),
      components: { semantic, schema, validation, source }
    };
  }

  function confidenceBucket(score) {
    const s = clamp01(score);
    if (s >= 0.85) return "high";
    if (s >= 0.65) return "medium";
    return "low";
  }

  const api = {
    DEFAULT_WEIGHTS,
    computeConfidence,
    confidenceBucket,
    sourceReliabilityScore,
    validationScore
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.FamilyOSConfidence = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
