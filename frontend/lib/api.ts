// The base URL for all API requests — falls back to localhost if not set in .env
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Reusable fetch wrapper — use this instead of calling fetch() directly anywhere in the app
export async function apiFetch(
  path: string,         // e.g. "/documents" or "/users/me"
  options: RequestInit = {},  // standard fetch options (method, body, etc.)
  token?: string        // optional JWT auth token from Supabase
) {
  // Start with any headers the caller already passed in
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // If a token was provided, attach it as a Bearer token so the backend knows who's calling
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    // For regular JSON requests, tell the server we're sending JSON
    headers["Content-Type"] = "application/json";
  }

  // Make the actual HTTP request to the full URL (base + path)
  const res = await fetch(`${API_URL}${path}`, {
    ...options,   // spread in method, body, etc.
    headers,      // use our merged headers
  });

  // If the server returned an error status (4xx or 5xx), throw so the caller can handle it
  if (!res.ok) {
    // Try to parse the error message from the response body, fall back to a generic message
    const data = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(data.detail || `HTTP ${res.status}`);
  }

  // Return the parsed JSON response body
  return res.json();
}
