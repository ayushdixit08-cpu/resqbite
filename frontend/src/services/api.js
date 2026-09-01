export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function buildHeaders(headers = {}) {
  const token = localStorage.getItem("resqbite_token") || sessionStorage.getItem("resqbite_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers || {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export function saveAuthToken(token) {
  localStorage.setItem("resqbite_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("resqbite_token");
  sessionStorage.removeItem("resqbite_token");
}

export function getAuthToken() {
  return localStorage.getItem("resqbite_token") || sessionStorage.getItem("resqbite_token");
}
