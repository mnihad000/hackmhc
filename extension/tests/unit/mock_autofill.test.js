const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MOCK_AUTOFILL_ENABLED_KEY,
  MOCK_FIXTURE_INDEX_PATH,
  buildDemoPayloadForRequest,
  pageFixtureName
} = require("../../shared/mock_autofill.js");

test("pageFixtureName returns the HTML fixture basename from a URL", () => {
  assert.equal(
    pageFixtureName("http://localhost:5501/school_enrollment_basic.html"),
    "school_enrollment_basic.html"
  );
});

test("pageFixtureName tolerates invalid input", () => {
  assert.equal(pageFixtureName("not a real url"), null);
  assert.equal(pageFixtureName(""), null);
});

test("mock autofill constants stay stable", () => {
  assert.equal(MOCK_AUTOFILL_ENABLED_KEY, "mock_autofill_enabled");
  assert.equal(MOCK_FIXTURE_INDEX_PATH, "tests/fixtures/autofill/manual_fixture_responses.json");
});

test("buildDemoPayloadForRequest maps common live-form fields", () => {
  const payload = buildDemoPayloadForRequest({
    request_id: "req_demo_test",
    fields: [
      {
        field_id: "24emailadr|0",
        field_name: "24emailadr",
        label: "E-mail",
        type: "text",
        normalized_key: "email",
        context: "e mail 24emailadr"
      },
      {
        field_id: "40cc__type|1",
        field_name: "40cc__type",
        label: "Credit Card Type",
        type: "select",
        options: [
          { label: "(Select Card Type)", value: "" },
          { label: "Visa (Preferred)", value: "Visa (Preferred)" },
          { label: "Master Card", value: "Master Card" }
        ],
        context: "credit card type 40cc type"
      }
    ]
  });

  assert.equal(payload.contract_version, "familyos.autofill.v1");
  assert.equal(payload.request_id, "req_demo_test");
  assert.equal(payload._mock.mode, "demo_profile");
  assert.equal(payload.suggestions.length, 2);

  const emailSuggestion = payload.suggestions.find((item) => item.field_name === "24emailadr");
  assert.ok(emailSuggestion);
  assert.equal(emailSuggestion.value, "amina.diallo@example.com");
  assert.equal(emailSuggestion.confidence_bucket, "high");

  const cardTypeSuggestion = payload.suggestions.find((item) => item.field_name === "40cc__type");
  assert.ok(cardTypeSuggestion);
  assert.equal(cardTypeSuggestion.value, "Visa (Preferred)");
  assert.equal(cardTypeSuggestion.fill_strategy, "select_by_label");
});
