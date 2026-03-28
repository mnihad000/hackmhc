/**
 * FamilyOS Content Script
 * Injected into all pages to detect form fields and fill them.
 */

// Extract form fields from the current page
function extractFormFields() {
  const fields = [];
  const seen = new Set();

  document.querySelectorAll("input, select, textarea").forEach((el) => {
    // Skip hidden, submit, button, and file inputs
    if (["hidden", "submit", "button", "reset", "file", "image"].includes(el.type)) {
      return;
    }

    const name = el.name || el.id;
    if (!name || seen.has(name)) return;
    seen.add(name);

    // Try to find a label
    let label = "";
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) label = labelEl.textContent.trim();
    }
    if (!label && el.closest("label")) {
      label = el.closest("label").textContent.trim();
    }
    if (!label) {
      label = el.placeholder || el.getAttribute("aria-label") || "";
    }

    fields.push({
      field_name: name,
      label: label.substring(0, 100), // cap label length
      type: el.type || el.tagName.toLowerCase(),
    });
  });

  return fields;
}

// Fill form fields with values from the backend
function fillFormFields(fills, fields) {
  // Build a map of field_name -> DOM element for quick lookup
  const fieldMap = {};
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    const name = el.name || el.id;
    if (name) fieldMap[name] = el;
  });

  let filledCount = 0;

  for (const [fieldName, value] of Object.entries(fills)) {
    const el = fieldMap[fieldName];
    if (!el || !value) continue;

    if (el.tagName === "SELECT") {
      // For select elements, find the matching option
      const options = Array.from(el.options);
      const match = options.find(
        (opt) =>
          opt.value.toLowerCase() === value.toLowerCase() ||
          opt.textContent.trim().toLowerCase() === value.toLowerCase()
      );
      if (match) {
        el.value = match.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        filledCount++;
      }
    } else {
      // For input/textarea, use the native setter to work with React
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(el, value);
      } else {
        el.value = value;
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      filledCount++;
    }

    // Visual feedback — brief green highlight
    el.style.transition = "background-color 0.3s";
    el.style.backgroundColor = "#dcfce7";
    setTimeout(() => {
      el.style.backgroundColor = "";
    }, 1500);
  }

  return filledCount;
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extract") {
    sendResponse(extractFormFields());
  }

  if (msg.action === "fill") {
    const count = fillFormFields(msg.fills, msg.fields);
    sendResponse({ filled: count });
  }

  return true; // Keep message channel open for async response
});
