const test = require("node:test");
const assert = require("node:assert/strict");

function createMockStorage() {
  const store = {};
  return {
    async get(key) {
      if (typeof key === "string") return { [key]: store[key] };
      return store;
    },
    async set(payload) {
      Object.assign(store, payload);
    }
  };
}

test("feedback queue enqueues and dequeues in order", async () => {
  global.chrome = { storage: { local: createMockStorage() } };
  let counter = 0;
  global.crypto = { randomUUID: () => `event-${(counter += 1)}` };

  const {
    acknowledgeEvents,
    enqueueFeedback,
    enqueueFeedbackEvents,
    peekBatch,
    queueSize
  } = require("../../shared/feedback_queue.js");

  const accepted = await enqueueFeedback({
    field_id: "district_code|0",
    field_name: "district_code",
    action: "manual"
  });
  await enqueueFeedbackEvents([
    {
      field_id: "guardian_email|1",
      field_name: "guardian_email",
      action: "accepted"
    }
  ]);

  assert.equal(await queueSize(), 2);

  const batch = await peekBatch(1);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].field_name, "district_code");
  assert.equal(batch[0].event_id, accepted.event_id);
  await acknowledgeEvents(batch.map((event) => event.event_id));
  assert.equal(await queueSize(), 1);
});
