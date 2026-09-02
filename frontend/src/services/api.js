const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "");

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
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: buildHeaders(options.headers || {}),
    });
  } catch (error) {
    throw new ApiError(
      `Unable to reach the API at ${API_BASE_URL}. Check the backend URL, server status, and CORS configuration.`,
      { url, cause: error }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      errorText || `API request failed: ${response.status} ${response.statusText}`,
      { status: response.status, url }
    );
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
