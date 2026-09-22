// The one place that knows how to talk HTTP. Everything else in the app calls
// data/db.js or data/auth.js, which delegate here when dataMode is "api", so no
// component ever deals with URLs, headers or status codes.

import { loadToken } from "../data/storage";

// In development the Vite server proxies /api to the Laravel API (see
// vite.config.js), so the browser stays on one origin and CORS never comes up.
// A VITE_API_URL can point at a deployed API instead.
const BASE_URL = import.meta.env?.VITE_API_URL || "/api";

/**
 * A failed request. `code` and `fields` come from the API's error envelope
 * (docs/api.md), so validation messages can be shown next to the right input.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = "", fields = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request(method, path, body) {
  const token = loadToken();

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (err) {
    // Offline, or the API is not running: one predictable message for the UI.
    console.error("API request failed:", err);
    throw new ApiError(
      "Can't reach the server. Check your connection and try again.",
      { code: "network_error" }
    );
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (err) {
    console.error("API returned something that is not JSON:", err);
  }

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(error?.message || "Something went wrong. Please try again.", {
      status: response.status,
      code: error?.code || "unexpected_error",
      fields: error?.fields || {},
    });
  }

  return payload;
}

export const get = (path) => request("GET", path);
export const post = (path, body) => request("POST", path, body ?? {});
export const patch = (path, body) => request("PATCH", path, body ?? {});
export const del = (path) => request("DELETE", path);

/**
 * Runs a call and returns the shape the screens already handle:
 * { ok: true, ...data } or { ok: false, error, code, fields }. Nothing in the UI
 * needs try/catch once it goes through here.
 */
export async function asResult(work) {
  try {
    return { ok: true, ...(await work()) };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: err.message, code: err.code, fields: err.fields };
    }

    console.error("Unexpected API failure:", err);
    return {
      ok: false,
      error: "Something went wrong. Please try again.",
      code: "unexpected_error",
      fields: {},
    };
  }
}