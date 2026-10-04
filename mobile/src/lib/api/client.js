// The one place that talks HTTP.
//
// Screens never call fetch directly: they go through authApi (and, in later
// phases, the set/card modules), which come here. A failure arrives as an
// ApiError carrying the API's own envelope — { error: { code, message, fields } }
// — so a screen can show err.message and put err.fields next to the matching
// input.
//
// Nothing in this file holds a token: the session installs a provider (see
// src/lib/auth/session.js) that reads it from the device's secure store, so no
// credential can end up in a log, a screen or this module's state.

const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = "unexpected_error", fields = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// EXPO_PUBLIC_API_URL comes from mobile/.env (documented in .env.example). It is
// read on every call rather than cached, so a reload picks up a changed value.
// A physical phone cannot reach "localhost", so an unset value is a config
// problem worth its own message.
function baseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL;

  if (!configured) {
    throw new ApiError(
      "No API address is configured. Copy mobile/.env.example to mobile/.env and set EXPO_PUBLIC_API_URL to this computer's LAN address.",
      { code: "api_url_missing" }
    );
  }

  return configured.replace(/\/+$/, "");
}

let tokenProvider = async () => null;
let unauthorizedHandler = null;

/** Called once by the session layer; resolves to the stored token or null. */
export function setTokenProvider(provider) {
  tokenProvider = provider;
}

/**
 * Called once by the session layer: every 401 response that is not part of a
 * sign-in attempt runs this, which drops the session's token and returns the app
 * to the login screen. Keeping it here means no screen has to remember to.
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

/** A message a screen can show, with the two cases worth translating. */
export function describeError(err, what = "item") {
  if (err?.code === "not_found") {
    return `That ${what} no longer exists. It may have been deleted on another device.`;
  }

  return err?.message || "Something went wrong. Please try again.";
}

async function request(method, path, body) {
  const url = `${baseUrl()}${path}`;
  const token = await tokenProvider();

  // A 401 from a sign-in attempt means "wrong credentials", never "your token is
  // void", so those two routes never trigger the session handler below.
  const isSignIn = path === "/login" || path === "/register";

  // A hung request must not leave a screen spinning forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
  } catch {
    // Offline, wrong address, or the API is not running: one message for the UI.
    throw new ApiError(
      "Can't reach the server. Check your connection and try again.",
      { code: "network_error" }
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null; // a proxy error page rather than the API's JSON
  }

  if (!response.ok) {
    const error = payload?.error;

    // A token the server rejects means the session is over: the handler drops it
    // and the app returns to the login screen. Only requests that carried a token
    // can get here, and never a sign-in attempt — its 401 is a typo, not a
    // session that ended.
    if (response.status === 401 && token && !isSignIn) {
      try {
        unauthorizedHandler?.();
      } catch {
        // A handler that throws must not hide the API's own error.
      }
    }

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
