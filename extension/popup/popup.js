const API_URL = "http://localhost:8000";

// Check if already logged in on popup open
document.addEventListener("DOMContentLoaded", async () => {
  const { token, email } = await chrome.storage.local.get(["token", "email"]);
  if (token) {
    showAutofillSection(email);
  }
});

// Login handler
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("login-error");
  const btn = document.getElementById("login-btn");

  if (!email || !password) {
    errorEl.textContent = "Please enter email and password";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Signing in...";
  errorEl.textContent = "";

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Login failed");
    }

    const data = await res.json();
    await chrome.storage.local.set({
      token: data.access_token,
      email: email,
    });

    showAutofillSection(email);
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
});

// Autofill handler
document.getElementById("autofill-btn").addEventListener("click", async () => {
  const statusEl = document.getElementById("status");
  const btn = document.getElementById("autofill-btn");

  btn.disabled = true;
  statusEl.className = "status loading";
  statusEl.textContent = "Scanning form fields...";

  try {
    // 1. Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. Ask content script to extract form fields
    const fields = await chrome.tabs.sendMessage(tab.id, { action: "extract" });

    if (!fields || fields.length === 0) {
      statusEl.className = "status error";
      statusEl.textContent = "No form fields found on this page";
      return;
    }

    statusEl.textContent = `Found ${fields.length} fields. Fetching data...`;

    // 3. Send fields to backend for autofill
    const { token } = await chrome.storage.local.get("token");
    const res = await fetch(`${API_URL}/api/autofill`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        await chrome.storage.local.remove(["token", "email"]);
        showLoginSection();
        throw new Error("Session expired. Please sign in again.");
      }
      throw new Error("Autofill request failed");
    }

    const data = await res.json();
    const fillCount = Object.keys(data.fills).length;

    if (fillCount === 0) {
      statusEl.className = "status error";
      statusEl.textContent = "No matching data found in your documents";
      return;
    }

    // 4. Send fill values to content script
    await chrome.tabs.sendMessage(tab.id, {
      action: "fill",
      fills: data.fills,
      fields: fields,
    });

    statusEl.className = "status success";
    statusEl.textContent = `Filled ${fillCount} fields from ${data.sources.length} document(s)`;
  } catch (err) {
    statusEl.className = "status error";
    statusEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// Logout handler
document.getElementById("logout-btn").addEventListener("click", async () => {
  await chrome.storage.local.remove(["token", "email"]);
  showLoginSection();
});

function showAutofillSection(email) {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("autofill-section").style.display = "block";
  document.getElementById("user-email").textContent = email;
  document.getElementById("status").textContent = "";
}

function showLoginSection() {
  document.getElementById("login-section").style.display = "block";
  document.getElementById("autofill-section").style.display = "none";
}
