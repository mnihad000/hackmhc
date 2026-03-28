let latestFields = [];
let latestSuggestions = [];
let latestUsedMockFixture = null;
let scanInFlight = false;

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

async function loadMockModeSetting() {
  const key = FamilyOSMockAutofill.MOCK_AUTOFILL_ENABLED_KEY;
  const data = await chrome.storage.local.get(key);
  document.getElementById("mock-mode-toggle").checked = Boolean(data[key]);
}

async function persistMockModeSetting(enabled) {
  const key = FamilyOSMockAutofill.MOCK_AUTOFILL_ENABLED_KEY;
  await chrome.storage.local.set({ [key]: Boolean(enabled) });
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

async function scanAndFetchSuggestions() {
  if (scanInFlight) return;
  scanInFlight = true;

  setStatus("Scanning fields...");
  try {
    const tab = await getActiveTab();
    const extractResponse = await chrome.tabs.sendMessage(tab.id, { action: "extract_fields" });
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

Promise.all([
  loadMockModeSetting(),
  flushQueuedFeedback().catch(() => {})
])
  .then(() => scanAndFetchSuggestions().catch((error) => {
    setStatus(error.message, true);
  }))
  .catch(() => {});
