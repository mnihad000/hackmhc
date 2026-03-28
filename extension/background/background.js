/**
 * FamilyOS Background Service Worker
 * Handles API communication and token management.
 */

const API_URL = "http://localhost:8000";

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "api_request") {
    handleApiRequest(msg)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true; // Keep channel open for async
  }
});

async function handleApiRequest({ endpoint, method = "GET", body }) {
  const { token } = await chrome.storage.local.get("token");

  if (!token) {
    throw new Error("Not authenticated");
  }

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${endpoint}`, options);

  if (res.status === 401) {
    await chrome.storage.local.remove(["token", "email"]);
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed (${res.status})`);
  }

  return res.json();
}
