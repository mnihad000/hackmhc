(function (global) {
  const FIELD_HINTS = {
    first_name: ["first name", "given name", "fname"],
    last_name: ["last name", "surname", "lname", "family name"],
    email: ["email", "e-mail"],
    phone: ["phone", "mobile", "cell", "telephone", "tel"],
    dob: ["dob", "date of birth", "birth date", "birthday"],
    address_line_1: ["address", "street", "address line 1"],
    city: ["city", "town"],
    state: ["state", "province", "region"],
    zip: ["zip", "postal", "postcode"]
  };

  function trimText(value) {
    return String(value || "").trim();
  }

  function sanitizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\s_]+/g, " ")
      .replace(/[^\w\s-]/g, "")
      .trim();
  }

  function findLabelForElement(el) {
    if (!el) return "";
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl && labelEl.textContent) return labelEl.textContent.trim();
    }
    const wrappingLabel = el.closest("label");
    if (wrappingLabel && wrappingLabel.textContent) return wrappingLabel.textContent.trim();
    return (el.getAttribute("aria-label") || el.placeholder || "").trim();
  }

  function deriveSection(el) {
    if (!el) return "";
    const fieldset = el.closest("fieldset");
    if (fieldset) {
      const legend = fieldset.querySelector("legend");
      if (legend && legend.textContent) return legend.textContent.trim();
    }
    return "";
  }

  function deriveFieldKeyFromText(inputText) {
    const text = sanitizeText(inputText);
    if (!text) return "unknown";
    for (const [key, hints] of Object.entries(FIELD_HINTS)) {
      if (hints.some((hint) => text.includes(hint))) return key;
    }
    return "unknown";
  }

  function normalizeFieldDescriptor(raw) {
    const fieldName = trimText(raw.field_name || raw.name || raw.id || "");
    const label = trimText(raw.label || raw.placeholder || "");
    const section = trimText(raw.section || "");
    const placeholder = trimText(raw.placeholder || "");
    const type = trimText(raw.type || "text").toLowerCase() || "text";
    const autocomplete = trimText(raw.autocomplete || "");
    const context = [sanitizeText(label), sanitizeText(section), sanitizeText(fieldName)]
      .filter(Boolean)
      .join(" ");
    const normalizedKey = deriveFieldKeyFromText(context);
    const descriptor = {
      field_name: fieldName,
      label,
      section,
      type,
      placeholder,
      normalized_key: normalizedKey,
      context,
      required: Boolean(raw.required)
    };

    const fieldId = trimText(raw.field_id || "");
    if (fieldId) descriptor.field_id = fieldId;
    if (autocomplete) descriptor.autocomplete = autocomplete;
    if (Array.isArray(raw.options) && raw.options.length) {
      descriptor.options = raw.options.map((option) => ({
        label: trimText(option?.label),
        value: trimText(option?.value)
      }));
    }

    return descriptor;
  }

  const api = {
    trimText,
    sanitizeText,
    findLabelForElement,
    deriveSection,
    deriveFieldKeyFromText,
    normalizeFieldDescriptor
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.FamilyOSFieldNormalization = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
