const configuredApiUrl = import.meta.env.VITE_API_BASE_URL
  || import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "");
export const API_BASE_URL = configuredApiUrl.trim().replace(/\/+$/, "");
const apiResultCache = new Map();
const REQUEST_TIMEOUT_MS = 30000;

export class ApiError extends Error {
  constructor(message, { status, url, cause, errors } = {}) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.url = url;
    this.errors = errors;
  }
}

function buildHeaders(headers = {}, body) {
  const token = localStorage.getItem("resqbite_token") || sessionStorage.getItem("resqbite_token");
  const isMultipart = typeof FormData !== "undefined" && body instanceof FormData;
  return {
    ...(!isMultipart ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new ApiError(
      "The Django API URL is not configured. Set VITE_API_BASE_URL to the deployed Django API."
    );
  }
  const url = `${API_BASE_URL}${path}`;
  const cacheable = (!options.method || options.method.toUpperCase() === "GET")
    && !path.startsWith("/auth/");
  if (cacheable && apiResultCache.has(path)) return apiResultCache.get(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const externalSignal = options.signal;
  const abortFromExternalSignal = () => controller.abort(externalSignal.reason);

  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: buildHeaders(options.headers || {}, options.body),
    });

    const responseText = await response.text();
    let responseData = responseText;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json") && responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (error) {
        throw new ApiError("The API returned an invalid JSON response.", {
          status: response.status,
          url,
          cause: error,
        });
      }
    }

    if (!response.ok) {
      const message = responseData?.message || responseData?.error;
      const errors = responseData?.errors ?? (
        typeof responseData === "object" && responseData !== null
          ? responseData
          : undefined
      );
      const fieldMessages = formatFieldErrors(errors);
      throw new ApiError(
        [message, fieldMessages]
          .filter((part, index, parts) => part && parts.indexOf(part) === index)
          .join(" ")
          || `API request failed: ${response.status} ${response.statusText}`,
        { status: response.status, url, errors }
      );
    }

    if (contentType.includes("application/json")) {
      const normalized = responseData?.success === true && Object.hasOwn(responseData, "data")
        ? responseData.data
        : responseData;
      if (cacheable) apiResultCache.set(path, normalized);
      return normalized;
    }

    return responseText;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error.name === "AbortError"
      ? "The request timed out. Please try again."
      : `Unable to reach the API at ${API_BASE_URL}. Check the backend URL, server status, and CORS configuration.`;
    throw new ApiError(message, { url, cause: error });
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}

function formatFieldErrors(errors) {
  if (!errors || typeof errors !== "object") return "";

  return Object.entries(errors)
    .flatMap(([field, value]) => {
      const messages = Array.isArray(value) ? value : [value];
      return messages
        .filter((message) => typeof message === "string")
        .map((message) => `${field}: ${message}`);
    })
    .join(" ");
}

export function formatApiError(error, fallback = "The request could not be completed.") {
  if (error instanceof ApiError && error.message) return error.message;
  if (error?.message) return error.message;
  return fallback;
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
