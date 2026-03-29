const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence, confidenceBucket } = require("../../shared/confidence.js");

test("computeConfidence favors canonical validated matches", () => {
  const descriptor = { normalized_key: "email", type: "email" };
  const suggestion = {
    normalized_key: "email",
    semantic_score: 0.92,
    source_type: "canonical",
    value: "guardian@example.com"
  };

  const result = computeConfidence(descriptor, suggestion);
  assert.ok(result.score >= 0.85);
  assert.equal(confidenceBucket(result.score), "high");
});

test("computeConfidence demotes unknown and invalid values", () => {
  const descriptor = { normalized_key: "email", type: "email" };
  const suggestion = {
    normalized_key: "unknown",
    semantic_score: 0.4,
    source_type: "inferred",
    value: "not-an-email"
  };

  const result = computeConfidence(descriptor, suggestion);
  assert.ok(result.score < 0.65);
  assert.equal(confidenceBucket(result.score), "low");
});
