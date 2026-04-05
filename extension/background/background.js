if (typeof importScripts === "function") {
  importScripts(
    "../shared/mock_profiles/housing_application_profile.js",
    "../shared/mock_autofill.js",
    "../shared/feedback_queue.js"
  );
}

const CONTRACT_VERSION = "familyos.autofill.v1";
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
  return data[key] !== false;
}

async function getAuthHeaders() {
  const { token } = await chrome.storage.local.get("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function persistLoggedInSession(payload, apiBaseOverride) {
  const token = String(payload?.access_token || "").trim();
  if (!token) {
    throw new Error("Login succeeded without an access token.");
  }

  const updates = {
    token,
    refresh_token: String(payload?.refresh_token || "").trim(),
    auth_user_email: String(payload?.user?.email || "").trim(),
    auth_user_id: String(payload?.user?.id || "").trim()
  };

  const apiBase = String(apiBaseOverride || "").trim();
  if (apiBase && apiBase !== DEFAULT_API_BASE) {
    updates.api_base = apiBase;
  }

  await chrome.storage.local.set(updates);
  if (!apiBase || apiBase === DEFAULT_API_BASE) {
    await chrome.storage.local.remove("api_base");
  }

  return {
    authenticated: true,
    email: updates.auth_user_email,
    api_base: apiBase || DEFAULT_API_BASE
  };
}

async function clearAuthSession() {
  await chrome.storage.local.remove([
    "token",
    "refresh_token",
    "auth_user_email",
    "auth_user_id"
  ]);
  return { authenticated: false };
}

async function loginWithPassword(credentials) {
  const email = String(credentials?.email || "").trim().toLowerCase();
  const password = String(credentials?.password || "").trim();
  const apiBase = String(credentials?.api_base || "").trim() || (await getApiBase());

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  let response;
  try {
    response = await fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  } catch {
    throw new Error(`Could not reach backend at ${apiBase}.`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `Login failed (${response.status})`);
  }

  const payload = await response.json();
  return persistLoggedInSession(payload, apiBase);
}

async function requestAutofillSuggestions(payload) {
  if (await isMockModeEnabled()) {
    const mockPayload = await FamilyOSMockAutofill.mockPayloadForRequest(payload);
    if (mockPayload) return mockPayload;
  }

  const apiBase = await getApiBase();
  const headers = await getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error("Not authenticated. Sign in in the extension.");
  }
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
  if (!headers.Authorization) {
    throw new Error("Not authenticated. Sign in in the extension.");
  }
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

async function queueAndFlushFeedback(events) {
  const items = Array.isArray(events) ? events.filter(Boolean) : [];
  if (!items.length) {
    return { accepted_events: 0, flushed: true, queued: 0 };
  }

  await FamilyOSFeedbackQueue.enqueueFeedbackEvents(items);

  try {
    const batch = await FamilyOSFeedbackQueue.peekBatch();
    if (!batch.length) {
      return { accepted_events: 0, flushed: true, queued: 0 };
    }

    const payload = await submitFeedback({
      contract_version: CONTRACT_VERSION,
      events: batch
    });
    await FamilyOSFeedbackQueue.acknowledgeEvents(batch.map((event) => event.event_id));
    return {
      accepted_events: Number(payload?.accepted_events || batch.length),
      flushed: true,
      queued: 0
    };
  } catch (_error) {
    return {
      accepted_events: 0,
      flushed: false,
      queued: await FamilyOSFeedbackQueue.queueSize()
    };
  }
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

  if (msg.action === "queue_feedback_events") {
    queueAndFlushFeedback(msg.events || [])
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (msg.action === "auth_login") {
    loginWithPassword(msg.credentials || {})
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (msg.action === "auth_logout") {
    clearAuthSession()
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
