if (typeof importScripts === "function") {
  importScripts("../shared/mock_autofill.js");
}

const DEFAULT_API_BASE = "http://localhost:8000";
const ACTION_BADGE_COLOR = "#0f766e";
const DEFAULT_ACTION_TITLE = "FamilyOS Autofill";

function badgeTextForCount(fieldCount) {
  if (!fieldCount) return "";
  if (fieldCount > 99) return "99+";
  return String(fieldCount);
}

async function getApiBase() {
  const { api_base } = await chrome.storage.local.get("api_base");
  return api_base || DEFAULT_API_BASE;
}

async function isMockModeEnabled() {
  const key = FamilyOSMockAutofill?.MOCK_AUTOFILL_ENABLED_KEY || "mock_autofill_enabled";
  const data = await chrome.storage.local.get(key);
  return Boolean(data[key]);
}

async function getAuthHeaders() {
  const { token } = await chrome.storage.local.get("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function requestAutofillSuggestions(payload) {
  if (await isMockModeEnabled()) {
    const mockPayload = await FamilyOSMockAutofill.mockPayloadForRequest(payload);
    if (mockPayload) return mockPayload;
  }

  const apiBase = await getApiBase();
  const headers = await getAuthHeaders();
  const response = await fetch(`${apiBase}/api/autofill`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `Autofill request failed (${response.status})`);
  }

  return response.json();
}

async function submitFeedback(payload) {
  if (await isMockModeEnabled()) {
    return FamilyOSMockAutofill.mockFeedbackAck(payload);
  }

  const apiBase = await getApiBase();
  const headers = await getAuthHeaders();
  const response = await fetch(`${apiBase}/api/autofill/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `Feedback request failed (${response.status})`);
  }

  return response.json();
}

async function updateActionState(tabId, fieldCount) {
  if (!chrome.action || !tabId) return;

  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: ACTION_BADGE_COLOR
  });
  await chrome.action.setBadgeText({
    tabId,
    text: badgeTextForCount(fieldCount)
  });
  await chrome.action.setTitle({
    tabId,
    title: fieldCount
      ? `${DEFAULT_ACTION_TITLE}: ${fieldCount} field(s) detected`
      : DEFAULT_ACTION_TITLE
  });
}

async function openExtensionPopup(sender) {
  if (typeof chrome.action?.openPopup !== "function") {
    return { ok: false, fallback: "toolbar_click" };
  }

  await chrome.action.openPopup(
    sender?.tab?.windowId ? { windowId: sender.tab.windowId } : undefined
  );
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "form_presence_changed") {
    updateActionState(_sender?.tab?.id, Number(msg.fieldCount || 0))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (msg.action === "open_autofill_popup") {
    openExtensionPopup(_sender)
      .then((payload) => sendResponse(payload))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (msg.action === "autofill_suggest") {
    requestAutofillSuggestions(msg.request || { fields: msg.fields || [] })
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (msg.action === "autofill_feedback") {
    submitFeedback(msg.feedback || { events: msg.events || [] })
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
