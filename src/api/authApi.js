// Backend accounts. Same function names, same { ok, user, error } result shape
// as data/auth.js, so data/useAuth.js can switch between them without the
// screens changing at all.

import { clearToken, loadToken, saveToken } from "../data/storage";
import { asResult, get, post } from "./client";

export function register(username, password) {
  return asResult(async () => {
    const data = await post("/register", { username, password });
    saveToken(data.token);
    return { user: data.user };
  });
}

export function login(username, password) {
  return asResult(async () => {
    const data = await post("/login", { username, password });
    saveToken(data.token);
    return { user: data.user };
  });
}

export function logout() {
  return asResult(async () => {
    try {
      // Revoke the token server-side; a failure there must not trap the user in
      // a signed-in state, so the local token is dropped either way.
      if (loadToken()) await post("/logout");
    } finally {
      clearToken();
    }

    return {};
  });
}

/**
 * The signed-in account, or null. A token the server no longer accepts is
 * treated as signed out and discarded.
 */
export function getCurrentUser() {
  return asResult(async () => {
    if (!loadToken()) return { user: null };

    try {
      const data = await get("/me");
      return { user: data.user };
    } catch (err) {
      if (err.code === "unauthenticated") {
        clearToken();
        return { user: null };
      }
      throw err;
    }
  });
}