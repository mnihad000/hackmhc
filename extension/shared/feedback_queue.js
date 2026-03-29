(function (global) {
  const QUEUE_KEY = "familyos_feedback_queue";

  function createId(prefix) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getChromeStorage() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return chrome.storage.local;
    }
    return null;
  }

  async function readQueue() {
    const storage = getChromeStorage();
    if (!storage) return [];
    const data = await storage.get(QUEUE_KEY);
    return Array.isArray(data[QUEUE_KEY]) ? data[QUEUE_KEY] : [];
  }

  async function writeQueue(items) {
    const storage = getChromeStorage();
    if (!storage) return;
    await storage.set({ [QUEUE_KEY]: items });
  }

  function normalizeEvent(eventPayload) {
    return {
      ...eventPayload,
      event_id: String(eventPayload?.event_id || createId("evt")),
      timestamp: String(eventPayload?.timestamp || new Date().toISOString()),
      field_id: String(eventPayload?.field_id || ""),
      field_name: String(eventPayload?.field_name || ""),
      action: String(eventPayload?.action || "")
    };
  }

  async function enqueueFeedback(eventPayload) {
    const queue = await readQueue();
    const event = normalizeEvent(eventPayload);
    queue.push(event);
    await writeQueue(queue);
    return event;
  }

  async function enqueueFeedbackEvents(eventPayloads) {
    const queue = await readQueue();
    const events = (eventPayloads || []).map(normalizeEvent);
    queue.push(...events);
    await writeQueue(queue);
    return events;
  }

  async function peekBatch(limit = 20) {
    const queue = await readQueue();
    return queue.slice(0, limit);
  }

  async function acknowledgeEvents(eventIds) {
    const ids = new Set((eventIds || []).map((eventId) => String(eventId)));
    if (!ids.size) return 0;

    const queue = await readQueue();
    const rest = queue.filter((item) => !ids.has(String(item.event_id)));
    await writeQueue(rest);
    return queue.length - rest.length;
  }

  async function dequeueBatch(limit = 20) {
    const batch = await peekBatch(limit);
    await acknowledgeEvents(batch.map((item) => item.event_id));
    return batch;
  }

  async function queueSize() {
    const queue = await readQueue();
    return queue.length;
  }

  const api = {
    QUEUE_KEY,
    acknowledgeEvents,
    enqueueFeedback,
    enqueueFeedbackEvents,
    dequeueBatch,
    peekBatch,
    queueSize,
    readQueue
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.FamilyOSFeedbackQueue = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
