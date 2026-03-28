(function () {
  const INLINE_LAUNCHER_ROOT_ID = "familyos-inline-launcher";
  const INLINE_LAUNCHER_STYLE_ID = "familyos-inline-launcher-style";
  const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "file", "image"]);
  let launcherRoot = null;
  let detectionTimeout = null;
  let observer = null;
  let lastReportedFieldCount = -1;

  function escapeSelector(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function getElementType(el) {
    if (!el) return "text";
    if (el.tagName === "SELECT") return "select";
    if (el.tagName === "TEXTAREA") return "textarea";
    return (el.type || "text").toLowerCase();
  }

  function findElementsByFieldName(fieldName) {
    if (!fieldName) return [];

    const byName = document.querySelectorAll(`[name="${escapeSelector(fieldName)}"]`);
    if (byName.length) {
      return Array.from(byName);
    }

    const byId = document.getElementById(fieldName);
    return byId ? [byId] : [];
  }

  function fieldOptionsForElement(el, fieldName, type) {
    if (type === "select") {
      return Array.from(el.options || []).map((option) => ({
        label: String(option.textContent || "").trim(),
        value: String(option.value || "").trim()
      }));
    }

    if (type === "radio" || type === "checkbox") {
      return findElementsByFieldName(fieldName)
        .filter((candidate) => getElementType(candidate) === type)
        .map((candidate) => ({
          label: FamilyOSFieldNormalization.findLabelForElement(candidate),
          value: String(candidate.value || "").trim()
        }));
    }

    return undefined;
  }

  function extractFormFields() {
    const fields = [];
    const seen = new Set();
    const nodes = document.querySelectorAll("input, select, textarea");

    nodes.forEach((el) => {
      const type = getElementType(el);
      if (SKIP_TYPES.has(type)) return;
      if (el.disabled || el.readOnly) return;

      const fieldName = el.name || el.id;
      if (!fieldName || seen.has(fieldName)) return;
      seen.add(fieldName);

      const label = FamilyOSFieldNormalization.findLabelForElement(el);
      const section = FamilyOSFieldNormalization.deriveSection(el);
      const descriptor = FamilyOSFieldNormalization.normalizeFieldDescriptor({
        field_id: `${fieldName}|${fields.length}`,
        field_name: fieldName,
        label,
        type,
        section,
        placeholder: el.placeholder || "",
        required: Boolean(el.required),
        autocomplete: el.autocomplete || "",
        options: fieldOptionsForElement(el, fieldName, type)
      });

      fields.push(descriptor);
    });

    return fields;
  }

  function launcherBadgeText(fieldCount) {
    if (fieldCount > 99) return "99+";
    return String(fieldCount || 0);
  }

  function launcherSummaryText(fieldCount) {
    return fieldCount === 1 ? "1 field detected" : `${fieldCount} fields detected`;
  }

  function topLevelPage() {
    return window.top === window;
  }

  function ensureLauncherStyles() {
    if (!document.head || document.getElementById(INLINE_LAUNCHER_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = INLINE_LAUNCHER_STYLE_ID;
    style.textContent = `
      #${INLINE_LAUNCHER_ROOT_ID} {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        font-family: Arial, sans-serif;
        color: #0f172a;
      }

      #${INLINE_LAUNCHER_ROOT_ID}[hidden] {
        display: none !important;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-shell {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-toggle {
        width: 54px;
        height: 54px;
        border: none;
        border-radius: 999px;
        background: linear-gradient(135deg, #0f766e, #1d4ed8);
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-toggle:hover {
        transform: translateY(-1px);
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 999px;
        background: #f97316;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-toggle-wrap {
        position: relative;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-panel {
        width: 220px;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(255, 255, 255, 0.97);
        box-shadow: 0 16px 44px rgba(15, 23, 42, 0.2);
        padding: 14px;
      }

      #${INLINE_LAUNCHER_ROOT_ID}:not([data-open="true"]) .familyos-launcher-panel {
        display: none;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-title {
        font-size: 13px;
        font-weight: 700;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-copy {
        margin-top: 4px;
        font-size: 12px;
        color: #475569;
        line-height: 1.4;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-open,
      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-close {
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12px;
        cursor: pointer;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-open {
        border: none;
        background: #0f172a;
        color: #ffffff;
        flex: 1;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-close {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
      }

      #${INLINE_LAUNCHER_ROOT_ID} .familyos-launcher-status {
        min-height: 16px;
        margin-top: 10px;
        font-size: 11px;
        color: #64748b;
      }
    `;
    document.head.appendChild(style);
  }

  function setLauncherStatus(text, isError = false) {
    if (!launcherRoot) return;
    const status = launcherRoot.querySelector(".familyos-launcher-status");
    if (!status) return;
    status.textContent = text;
    status.style.color = isError ? "#b91c1c" : "#64748b";
  }

  function setLauncherOpen(isOpen) {
    if (!launcherRoot) return;
    launcherRoot.dataset.open = isOpen ? "true" : "false";
  }

  async function openAutofillPopupFromLauncher() {
    setLauncherStatus("Opening autofill…");

    try {
      const response = await chrome.runtime.sendMessage({ action: "open_autofill_popup" });
      if (response?.ok) {
        setLauncherStatus("Popup opened.");
        setLauncherOpen(false);
        return;
      }

      const fallbackMessage = response?.fallback === "toolbar_click"
        ? "Chrome blocked auto-open. Click the FamilyOS toolbar icon."
        : response?.error || "Unable to open the extension popup.";
      setLauncherStatus(fallbackMessage, true);
    } catch (error) {
      setLauncherStatus(error.message || "Unable to open the extension popup.", true);
    }
  }

  function ensureLauncher() {
    if (!topLevelPage() || !document.body) return null;
    if (launcherRoot?.isConnected) return launcherRoot;

    ensureLauncherStyles();

    launcherRoot = document.createElement("div");
    launcherRoot.id = INLINE_LAUNCHER_ROOT_ID;
    launcherRoot.dataset.open = "false";
    launcherRoot.hidden = true;
    launcherRoot.innerHTML = `
      <div class="familyos-launcher-shell">
        <div class="familyos-launcher-panel">
          <div class="familyos-launcher-title">FamilyOS Autofill</div>
          <div class="familyos-launcher-copy">Fill options are ready for this form.</div>
          <div class="familyos-launcher-actions">
            <button type="button" class="familyos-launcher-open">Autofill</button>
            <button type="button" class="familyos-launcher-close">Close</button>
          </div>
          <div class="familyos-launcher-status"></div>
        </div>
        <div class="familyos-launcher-toggle-wrap">
          <button type="button" class="familyos-launcher-toggle" aria-label="Open FamilyOS Autofill">FOS</button>
          <div class="familyos-launcher-badge">0</div>
        </div>
      </div>
    `;

    launcherRoot.querySelector(".familyos-launcher-toggle")?.addEventListener("click", () => {
      setLauncherOpen(launcherRoot.dataset.open !== "true");
      setLauncherStatus("");
    });

    launcherRoot.querySelector(".familyos-launcher-close")?.addEventListener("click", () => {
      setLauncherOpen(false);
      setLauncherStatus("");
    });

    launcherRoot.querySelector(".familyos-launcher-open")?.addEventListener("click", () => {
      openAutofillPopupFromLauncher();
    });

    document.body.appendChild(launcherRoot);
    return launcherRoot;
  }

  function removeLauncherIfPresent() {
    if (launcherRoot?.isConnected) {
      launcherRoot.remove();
    }
    launcherRoot = null;
  }

  function syncLauncher(fields) {
    if (!topLevelPage()) return;

    const fieldCount = Array.isArray(fields) ? fields.length : 0;
    if (!fieldCount) {
      removeLauncherIfPresent();
      reportFormPresence(fieldCount);
      return;
    }

    const root = ensureLauncher();
    if (!root) return;

    root.hidden = false;
    const badge = root.querySelector(".familyos-launcher-badge");
    const copy = root.querySelector(".familyos-launcher-copy");

    if (badge) badge.textContent = launcherBadgeText(fieldCount);
    if (copy) copy.textContent = `${launcherSummaryText(fieldCount)}. Click to open FamilyOS Autofill.`;

    reportFormPresence(fieldCount);
  }

  function reportFormPresence(fieldCount) {
    if (fieldCount === lastReportedFieldCount) return;
    lastReportedFieldCount = fieldCount;

    chrome.runtime.sendMessage({
      action: "form_presence_changed",
      fieldCount
    }).catch(() => {});
  }

  function detectAndSyncFormPresence() {
    const fields = extractFormFields();
    syncLauncher(fields);
  }

  function schedulePresenceSync() {
    if (!topLevelPage()) return;

    window.clearTimeout(detectionTimeout);
    detectionTimeout = window.setTimeout(() => {
      detectAndSyncFormPresence();
    }, 250);
  }

  function startPresenceObserver() {
    if (!topLevelPage()) return;
    if (observer || !document.documentElement) return;

    observer = new MutationObserver(() => {
      schedulePresenceSync();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["type", "name", "id", "placeholder", "required", "disabled", "readonly"]
    });
  }

  function initInlineLauncher() {
    if (!topLevelPage()) return;
    if (!document.body) return;

    detectAndSyncFormPresence();
    startPresenceObserver();
  }

  function setNativeValue(el, value) {
    if (el.tagName === "TEXTAREA") {
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
      if (descriptor?.set) {
        descriptor.set.call(el, value);
        return;
      }
    }

    if (el.tagName === "INPUT") {
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      if (descriptor?.set) {
        descriptor.set.call(el, value);
        return;
      }
    }

    el.value = value;
  }

  function setNativeChecked(el, checked) {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked");
    if (descriptor?.set) {
      descriptor.set.call(el, checked);
      return;
    }
    el.checked = checked;
  }

  function dispatchInputEvents(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function matchOption(options, value, useLabel = false) {
    const target = String(value || "").trim().toLowerCase();
    return options.find((option) => {
      const optionValue = String(option.value || "").trim().toLowerCase();
      const optionLabel = String(option.textContent || "").trim().toLowerCase();
      return useLabel ? optionLabel === target : optionValue === target;
    });
  }

  function applyTextSuggestion(el, value) {
    setNativeValue(el, String(value ?? ""));
    dispatchInputEvents(el);
    return { status: "filled", final_value: String(el.value ?? "") };
  }

  function applySelectSuggestion(el, value, useLabel = false) {
    const options = Array.from(el.options || []);
    const match = matchOption(options, value, useLabel);
    if (!match) return { status: "no_match" };

    el.value = match.value;
    dispatchInputEvents(el);
    return { status: "filled", final_value: String(el.value ?? "") };
  }

  function choiceLabel(el) {
    return FamilyOSFieldNormalization.findLabelForElement(el).toLowerCase();
  }

  function applyBooleanSuggestion(elements, suggestion, checked) {
    if (!elements.length) return { status: "missing" };

    const type = getElementType(elements[0]);
    const target = String(suggestion.value || "").trim().toLowerCase();

    if (type === "radio") {
      if (!checked) return { status: "incompatible" };
      const match = elements.find((el) => {
        return (
          String(el.value || "").trim().toLowerCase() === target ||
          choiceLabel(el) === target
        );
      });
      if (!match) return { status: "no_match" };
      setNativeChecked(match, true);
      dispatchInputEvents(match);
      return { status: "filled", final_value: String(match.value || "") };
    }

    if (elements.length > 1) {
      const match = elements.find((el) => {
        return (
          String(el.value || "").trim().toLowerCase() === target ||
          choiceLabel(el) === target
        );
      });
      if (!match) return { status: "no_match" };
      setNativeChecked(match, checked);
      dispatchInputEvents(match);
      return { status: "filled", final_value: checked ? String(match.value || "") : "" };
    }

    const [el] = elements;
    if (type !== "checkbox") return { status: "incompatible" };
    setNativeChecked(el, checked);
    dispatchInputEvents(el);
    return { status: "filled", final_value: checked ? String(el.value || "true") : "" };
  }

  function applySuggestion(item) {
    const elements = findElementsByFieldName(item.field_name);
    if (!elements.length) {
      return { field_id: item.field_id, field_name: item.field_name, status: "missing" };
    }

    const strategy = String(item.fill_strategy || "").toLowerCase();
    let result = { status: "incompatible" };

    if (strategy === "text") {
      const [el] = elements;
      if (el.tagName === "SELECT" || getElementType(el) === "checkbox" || getElementType(el) === "radio") {
        result = { status: "incompatible" };
      } else {
        result = applyTextSuggestion(el, item.value);
      }
    } else if (strategy === "select_by_value") {
      const [el] = elements;
      result = el?.tagName === "SELECT" ? applySelectSuggestion(el, item.value, false) : { status: "incompatible" };
    } else if (strategy === "select_by_label") {
      const [el] = elements;
      result = el?.tagName === "SELECT" ? applySelectSuggestion(el, item.value, true) : { status: "incompatible" };
    } else if (strategy === "check") {
      result = applyBooleanSuggestion(elements, item, true);
    } else if (strategy === "uncheck") {
      result = applyBooleanSuggestion(elements, item, false);
    } else if (strategy === "skip") {
      result = { status: "skipped" };
    }

    return {
      field_id: item.field_id,
      field_name: item.field_name,
      ...result
    };
  }

  function applySuggestions(suggestions) {
    const results = (suggestions || []).map((item) => applySuggestion(item));
    return {
      filled: results.filter((result) => result.status === "filled").length,
      results
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "extract_fields") {
      sendResponse({ fields: extractFormFields() });
      return true;
    }

    if (msg.action === "apply_suggestions") {
      const response = applySuggestions(msg.suggestions || []);
      sendResponse(response);
      return true;
    }

    return false;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInlineLauncher, { once: true });
  } else {
    initInlineLauncher();
  }

  window.addEventListener("pageshow", () => {
    schedulePresenceSync();
  });
})();
