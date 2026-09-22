// The one place that decides where accounts come from:
//
//   local -> data/auth.js    localStorage, salted SHA-256, synchronous session
//   api   -> api/authApi.js  the Laravel backend, bearer token, async session
//
// Both provide register / login / logout with the same result shape
// ({ ok, user } / { ok: false, error, fields }), which is why no screen has to
// know which one is in use. Session reads differ by nature, so they stay
// separate: localStorage can answer during the first render, the backend cannot.

import * as apiAuth from "../api/authApi";
import * as localAuth from "./auth";
import { dataMode } from "./config";

export const usingApi = dataMode === "api";

export const register = usingApi ? apiAuth.register : localAuth.register;

export const login = usingApi ? apiAuth.login : localAuth.login;

export const logout = usingApi ? apiAuth.logout : localAuth.logout;

/**
 * The signed-in account right now, or null. Only localStorage can do this
 * synchronously; in API mode there is nothing to read yet, so use
 * restoreSession() instead.
 */
export const currentUser = () => (usingApi ? null : localAuth.getCurrentUser());

/**
 * Asks the API who is signed in, using the stored token. Returns the same
 * { ok, user } shape as a login, so the caller can treat a rejected or expired
 * token as "signed out".
 */
export const restoreSession = () => apiAuth.getCurrentUser();
