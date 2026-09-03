const configuredApiUrl = import.meta.env.VITE_API_BASE_URL
  || import.meta.env.VITE_API_URL
  || "http://localhost:5000/api";
export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "");
const apiResultCache = new Map();
const REQUEST_TIMEOUT_MS = 30000;

export class ApiError extends Error {
  constructor(message, { status, url, cause } = {}) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

function buildHeaders(headers = {}) {
  const token = localStorage.getItem("resqbite_token") || sessionStorage.getItem("resqbite_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
}

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const cacheable = (!options.method || options.method.toUpperCase() === "GET")
    && !path.startsWith("/auth/");
  if (cacheable && apiResultCache.has(path)) return apiResultCache.get(path);
  let response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      headers: buildHeaders(options.headers || {}),
    });
  } catch (error) {
    const message = error.name === "AbortError"
      ? "The request timed out. Please try again."
      : `Unable to reach the API at ${API_BASE_URL}. Check the backend URL, server status, and CORS configuration.`;
    throw new ApiError(
      message,
      { url, cause: error }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.error || parsed.message || errorText;
    } catch {
      // Keep plain-text error responses unchanged.
    }
    throw new ApiError(
      message || `API request failed: ${response.status} ${response.statusText}`,
      { status: response.status, url }
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (cacheable) apiResultCache.set(path, data);
    return data;
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
