const test = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeText,
  deriveFieldKeyFromText,
  normalizeFieldDescriptor
} = require("../../shared/field_normalization.js");

test("sanitizeText normalizes spacing and case", () => {
  assert.equal(sanitizeText("  Guardian   E-mail  "), "guardian e-mail");
});

test("deriveFieldKeyFromText maps common phone labels", () => {
  assert.equal(deriveFieldKeyFromText("Primary mobile phone"), "phone");
});

test("normalizeFieldDescriptor builds context and key", () => {
  const normalized = normalizeFieldDescriptor({
    field_id: "guardian_email|0",
    field_name: "guardian_email",
    label: "Guardian Email",
    section: "Parent contact",
    type: "email",
    required: true,
    autocomplete: "email"
  });

  assert.equal(normalized.field_id, "guardian_email|0");
  assert.equal(normalized.field_name, "guardian_email");
  assert.equal(normalized.label, "Guardian Email");
  assert.equal(normalized.normalized_key, "email");
  assert.match(normalized.context, /guardian email/);
  assert.equal(normalized.required, true);
  assert.equal(normalized.autocomplete, "email");
});
