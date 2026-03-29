let latestFields = [];
let latestSuggestions = [];
let latestUsedMockFixture = null;
let scanInFlight = false;
const DEFAULT_API_BASE = "http://localhost:8000";
const CONTENT_SCRIPT_FILES = [
  "shared/field_normalization.js",
  "shared/confidence.js",
  "content/content_script.js"
];
let authState = {
  token: null,
  email: null
};

function setStatus(text, isError = false) {
  const status = document.getElementById("status");
  status.textContent = text;
  status.style.color = isError ? "#dc2626" : "#0f172a";
}

function fieldForSuggestion(suggestion) {
  return latestFields.find((field) => field.field_id === suggestion.field_id) || null;
}

function updateApplyButtonState() {
  const hasSelection = Array.from(
    document.querySelectorAll('#suggestion-list input[type="checkbox"]')
  ).some((input) => input.checked && !input.disabled);
  document.getElementById("apply-btn").disabled = !hasSelection;
}

function renderSuggestions(items) {
  const list = document.getElementById("suggestion-list");
  list.innerHTML = "";

  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "No confident suggestions found for this form.";
    list.appendChild(li);
    document.getElementById("apply-btn").disabled = true;
    return;
  }

  items.forEach((item) => {
    const field = fieldForSuggestion(item);
    const score = Number(item.confidence || 0);
    const li = document.createElement("li");
    if (item.requires_review) {
      li.classList.add("requires-review");
    }

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.fieldId = item.field_id;
    checkbox.checked = FamilyOSAutofillRuntime.isSuggestionPreselected(item);

    const body = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = field?.label || item.field_label || item.field_name;

    const value = document.createElement("div");
    value.className = "value";
    value.textContent = item.value || "(empty)";

    const source = document.createElement("div");
    source.className = "meta";
    source.textContent = `${item.confidence_bucket} ${score.toFixed(2)} | ${item.source_type}`;

    body.appendChild(heading);
    body.appendChild(value);
    body.appendChild(source);

    if (field?.section) {
      const section = document.createElement("div");
      section.className = "meta";
      section.textContent = field.section;
      body.appendChild(section);
    }

    if (item.reason) {
      const reason = document.createElement("div");
      reason.className = "meta";
      reason.textContent = item.reason;
      body.appendChild(reason);
    }

    if (item.requires_review) {
      const review = document.createElement("div");
      review.className = "meta review-note";
      review.textContent = "Requires explicit review";
      body.appendChild(review);
    }

    label.appendChild(checkbox);
    label.appendChild(body);
    li.appendChild(label);
    list.appendChild(li);
  });

  updateApplyButtonState();
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function unsupportedPageMessage(url) {
  const value = String(url || "").trim();
  if (!value) {
    return "Open a website with a form before scanning.";
  }

  const restrictedPrefixes = ["chrome://", "edge://", "about:", "chrome-extension://"];
  if (restrictedPrefixes.some((prefix) => value.startsWith(prefix))) {
    return "Chrome internal pages cannot be scanned. Open a regular website instead.";
  }

  if (
    value.startsWith("https://chromewebstore.google.com") ||
    value.startsWith("https://chrome.google.com/webstore")
  ) {
    return "The Chrome Web Store cannot be scanned. Open a regular website instead.";
  }

  return null;
}

function isMissingReceiverError(error) {
  const text = String(error?.message || error || "");
  return (
    text.includes("Receiving end does not exist") ||
    text.includes("Could not establish connection") ||
    text.includes("The message port closed before a response was received")
  );
}

async function ensureContentScriptInjected(tab) {
  if (!tab?.id) {
    throw new Error("Open a website with a form before scanning.");
  }

  const unsupportedMessage = unsupportedPageMessage(tab.url);
  if (unsupportedMessage) {
    throw new Error(unsupportedMessage);
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: CONTENT_SCRIPT_FILES
    });
  } catch (error) {
    throw new Error(
      unsupportedPageMessage(tab.url) ||
      error?.message ||
      "Could not attach the extension to this page. Refresh the page and try again."
    );
  }
}

async function extractFieldsFromTab(tab) {
  try {
    return await chrome.tabs.sendMessage(tab.id, { action: "extract_fields" });
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw new Error(error?.message || "Could not scan this page.");
    }

    await ensureContentScriptInjected(tab);
    return chrome.tabs.sendMessage(tab.id, { action: "extract_fields" });
  }
}

async function loadMockModeSetting() {
  const key = FamilyOSMockAutofill.MOCK_AUTOFILL_ENABLED_KEY;
  const data = await chrome.storage.local.get(key);
  document.getElementById("mock-mode-toggle").checked = Boolean(data[key]);
}

async function loadConnectionSettings() {
  const data = await chrome.storage.local.get(["api_base", "token", "auth_user_email"]);
  document.getElementById("api-base-input").value = data.api_base || DEFAULT_API_BASE;
  authState = {
    token: data.token || null,
    email: data.auth_user_email || null
  };
  renderAuthState();
}

async function persistMockModeSetting(enabled) {
  const key = FamilyOSMockAutofill.MOCK_AUTOFILL_ENABLED_KEY;
  await chrome.storage.local.set({ [key]: Boolean(enabled) });
}

async function persistConnectionSettings() {
  const apiBaseInput = document.getElementById("api-base-input");
  const apiBase = String(apiBaseInput.value || "").trim();

  if (!apiBase) {
    apiBaseInput.value = DEFAULT_API_BASE;
  }

  if (apiBase && apiBase !== DEFAULT_API_BASE) {
    await chrome.storage.local.set({ api_base: apiBase });
  } else {
    await chrome.storage.local.remove("api_base");
  }
}

function renderAuthState() {
  const signedOut = document.getElementById("auth-signed-out");
  const signedIn = document.getElementById("auth-signed-in");
  const authEmail = document.getElementById("auth-email");
  const passwordInput = document.getElementById("password-input");

  const isAuthenticated = Boolean(authState.token);
  signedOut.hidden = isAuthenticated;
  signedIn.hidden = !isAuthenticated;
  authEmail.textContent = isAuthenticated
    ? `Signed in as ${authState.email || "FamilyOS user"}`
    : "";

  if (isAuthenticated) {
    passwordInput.value = "";
  }
}

async function signIn() {
  const email = String(document.getElementById("email-input").value || "").trim();
  const password = String(document.getElementById("password-input").value || "").trim();
  const apiBase = String(document.getElementById("api-base-input").value || "").trim() || DEFAULT_API_BASE;

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const response = await chrome.runtime.sendMessage({
    action: "auth_login",
    credentials: {
      email,
      password,
      api_base: apiBase
    }
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Login failed.");
  }

  await loadConnectionSettings();
  document.getElementById("password-input").value = "";
  return response.payload;
}

async function signOut() {
  const response = await chrome.runtime.sendMessage({ action: "auth_logout" });
  if (!response?.ok) {
    throw new Error(response?.error || "Sign out failed.");
  }

  authState = {
    token: null,
    email: null
  };
  latestSuggestions = [];
  renderSuggestions([]);
  renderAuthState();
}

function mockModeEnabled() {
  return Boolean(document.getElementById("mock-mode-toggle")?.checked);
}

function suggestionSourceLabel(mockMeta) {
  if (!mockMeta) return null;
  if (mockMeta.mode === "fixture" && mockMeta.fixture_name) {
    return mockMeta.fixture_name;
  }
  if (mockMeta.mode === "demo_profile") {
    return "demo profile";
  }
  return null;
}

async function flushQueuedFeedback() {
  const batch = await FamilyOSFeedbackQueue.peekBatch();
  if (!batch.length) return;

  const apiResponse = await chrome.runtime.sendMessage({
    action: "autofill_feedback",
    feedback: {
      contract_version: FamilyOSAutofillRuntime.CONTRACT_VERSION,
      events: batch
    }
  });

  if (!apiResponse.ok) {
    throw new Error(apiResponse.error || "Failed to submit feedback.");
  }

  await FamilyOSFeedbackQueue.acknowledgeEvents(batch.map((event) => event.event_id));
}

async function syncFeedbackTracking(tab) {
  if (!tab?.id) return;

  await chrome.tabs.sendMessage(tab.id, {
    action: "track_feedback_candidates",
    fields: latestFields,
    suggestions: latestSuggestions
  });
}

async function scanAndFetchSuggestions() {
  if (scanInFlight) return;
  scanInFlight = true;

  if (!mockModeEnabled() && !authState.token) {
    latestSuggestions = [];
    renderSuggestions([]);
    setStatus("Sign in to fetch live suggestions, or enable demo mocks.", true);
    scanInFlight = false;
    return;
  }

  setStatus("Scanning fields...");
  try {
    const tab = await getActiveTab();
    const extractResponse = await extractFieldsFromTab(tab);
    latestFields = extractResponse?.fields || [];
    if (!latestFields.length) {
      latestSuggestions = [];
      renderSuggestions([]);
      setStatus("No fillable fields found on this page.", true);
      return;
    }

    setStatus(`Found ${latestFields.length} fields. Resolving suggestions...`);
    const request = FamilyOSAutofillRuntime.buildAutofillRequest({
      fields: latestFields,
      pageUrl: tab.url || "",
      pageTitle: tab.title || ""
    });
    const apiResponse = await chrome.runtime.sendMessage({
      action: "autofill_suggest",
      request
    });
    if (!apiResponse.ok) {
      const baseMessage = apiResponse.error || "Failed to fetch suggestions.";
      throw new Error(
        mockModeEnabled()
          ? baseMessage
          : `${baseMessage} Enable demo mocks or connect the backend.`
      );
    }

    const mockSource = suggestionSourceLabel(apiResponse.payload?._mock);
    latestUsedMockFixture = mockSource;
    latestSuggestions = FamilyOSAutofillRuntime.normalizeSuggestionsResponse(apiResponse.payload, latestFields);
    renderSuggestions(latestSuggestions);
    await syncFeedbackTracking(tab);
    setStatus(
      latestSuggestions.length
        ? latestUsedMockFixture
          ? `Loaded ${latestSuggestions.length} suggestion(s) from ${latestUsedMockFixture}.`
          : `Loaded ${latestSuggestions.length} suggestion(s).`
        : "No confident suggestions found for this form."
    );
  } finally {
    scanInFlight = false;
  }
}

async function applySelectedSuggestions() {
  const selectedFieldIds = Array.from(
    document.querySelectorAll('#suggestion-list input[type="checkbox"]:checked')
  ).map((el) => el.getAttribute("data-field-id"));
  const selected = latestSuggestions.filter((suggestion) => selectedFieldIds.includes(suggestion.field_id));

  if (!selected.length) {
    setStatus("No suggestions selected.", true);
    return;
  }

  const tab = await getActiveTab();
  const response = await chrome.tabs.sendMessage(tab.id, {
    action: "apply_suggestions",
    suggestions: selected
  });

  const applyResults = Array.isArray(response?.results) ? response.results : [];
  const feedbackEvents = FamilyOSAutofillRuntime.buildApplyFeedbackEvents({
    displayedSuggestions: latestSuggestions,
    selectedFieldIds,
    applyResults
  });

  if (feedbackEvents.length) {
    await FamilyOSFeedbackQueue.enqueueFeedbackEvents(feedbackEvents);
  }

  let feedbackQueued = false;
  try {
    await flushQueuedFeedback();
  } catch (_error) {
    feedbackQueued = true;
  }

  const filledCount = Number(response?.filled || 0);
  setStatus(
    feedbackQueued
      ? `Filled ${filledCount} field(s). Feedback queued for retry.`
      : `Filled ${filledCount} field(s).`
  );
}

document.getElementById("scan-btn").addEventListener("click", async () => {
  try {
    await flushQueuedFeedback().catch(() => {});
    await scanAndFetchSuggestions();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("apply-btn").addEventListener("click", async () => {
  try {
    await applySelectedSuggestions();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("suggestion-list").addEventListener("change", () => {
  updateApplyButtonState();
});

document.getElementById("mock-mode-toggle").addEventListener("change", async (event) => {
  try {
    await persistMockModeSetting(event.target.checked);
    setStatus(
      event.target.checked
        ? "Demo mock mode enabled."
        : "Demo mock mode disabled."
    );
    await scanAndFetchSuggestions();
  } catch (error) {
    event.target.checked = !event.target.checked;
    setStatus(error.message, true);
  }
});

document.getElementById("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const signInButton = document.getElementById("sign-in-btn");
  signInButton.disabled = true;
  signInButton.textContent = "Signing in...";

  try {
    const payload = await signIn();
    setStatus(`Signed in as ${payload.email || authState.email || "FamilyOS user"}.`);
    await scanAndFetchSuggestions();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    signInButton.disabled = false;
    signInButton.textContent = "Sign In";
  }
});

document.getElementById("sign-out-btn").addEventListener("click", async () => {
  try {
    await signOut();
    setStatus("Signed out of the extension.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("save-settings-btn").addEventListener("click", async () => {
  try {
    await persistConnectionSettings();
    setStatus("Connection settings saved.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

Promise.all([
  loadMockModeSetting(),
  loadConnectionSettings(),
  flushQueuedFeedback().catch(() => {})
])
  .then(() => scanAndFetchSuggestions().catch((error) => {
    setStatus(error.message, true);
  }))
  .catch(() => {});
