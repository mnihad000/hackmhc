const test = require("node:test");
const assert = require("node:assert/strict");

require("../../shared/field_normalization.js");
const {
  CONTRACT_VERSION,
  buildApplyFeedbackEvents,
  buildAutofillRequest,
  normalizeSuggestionsResponse
} = require("../../shared/autofill_runtime.js");

test("buildAutofillRequest emits contract envelope with stable field ids", () => {
  const request = buildAutofillRequest({
    requestId: "req_test",
    pageUrl: "https://school.example.com/enrollment",
    pageTitle: "Enrollment",
    fields: [
      {
        field_name: "guardian_email",
        label: "Guardian Email",
        type: "email",
        required: true
      }
    ]
  });

  assert.equal(request.contract_version, CONTRACT_VERSION);
  assert.equal(request.request_id, "req_test");
  assert.equal(request.fields[0].field_id, "guardian_email|0");
  assert.equal(request.fields[0].label, "Guardian Email");
  assert.equal(request.fields[0].required, true);
});

test("normalizeSuggestionsResponse filters low-confidence items and keeps the best candidate", () => {
  const fields = [
    {
      field_id: "email|0",
      field_name: "email",
      label: "Email",
      type: "email",
      normalized_key: "email",
      required: true,
      context: "email",
      placeholder: "",
      section: ""
    }
  ];

  const normalized = normalizeSuggestionsResponse(
    {
      suggestions: [
        {
          field_name: "email",
          value: "sam.old@example.com",
          confidence: 0.67,
          sourceType: "rag",
          normalized_key: "email",
          reason: "older_document"
        },
        {
          field_name: "email",
          value: "sam.lee@example.com",
          confidence: 0.9,
          sourceType: "canonical",
          normalized_key: "email",
          reason: "latest_verified_profile"
        },
        {
          field_name: "email",
          value: "bad@example.com",
          confidence: 0.3,
          sourceType: "inferred",
          normalized_key: "email",
          reason: "weak_similarity"
        }
      ]
    },
    fields
  );

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].field_id, "email|0");
  assert.equal(normalized[0].value, "sam.lee@example.com");
  assert.equal(normalized[0].confidence_bucket, "high");
  assert.equal(normalized[0].source_type, "canonical");
});

test("buildApplyFeedbackEvents creates accepted and rejected contract events", () => {
  const feedback = buildApplyFeedbackEvents({
    displayedSuggestions: [
      {
        suggestion_id: "sug_email",
        field_id: "email|0",
        field_name: "email",
        value: "sam.lee@example.com",
        confidence_bucket: "high",
        fill_strategy: "text"
      },
      {
        suggestion_id: "sug_phone",
        field_id: "phone|1",
        field_name: "phone",
        value: "+1 555 303 4444",
        confidence_bucket: "medium",
        fill_strategy: "text"
      }
    ],
    selectedFieldIds: ["email|0"],
    applyResults: [
      {
        field_id: "email|0",
        field_name: "email",
        status: "filled",
        final_value: "sam.lee@example.com"
      }
    ]
  });

  assert.equal(feedback.length, 2);
  assert.equal(feedback[0].action, "accepted");
  assert.equal(feedback[0].suggestion_id, "sug_email");
  assert.equal(feedback[1].action, "rejected");
  assert.equal(feedback[1].field_id, "phone|1");
});
