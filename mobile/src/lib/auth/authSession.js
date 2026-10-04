// The authentication rules, with no React and no device dependency: the storage
// and the API are passed in.
//
// That is not ceremony — it is what lets the exact same code be exercised
// outside the app (see mobile/tests), and it keeps expo-secure-store out of the
// rules themselves.
//
// The rule that makes the app offline-first: **a session is restored from what is
// on the phone, never from a request.** The API is asked only when there is
// nothing local to go on — the first sign-in on this device, or a record written
// by a build that did not cache the profile yet.
//
//   restore()  — the stored session decides:
//                  * nothing stored            -> signed out (the login screen)
//                  * stored, past 30 days      -> cleared; the session expired
//                  * stored with a profile     -> signed in, API never called
//                  * stored without a profile  -> /me once (the only way to learn
//                    who it is); offline, the token is kept and the app falls back
//                    to the login screen rather than guessing
//                  * /me answers 401           -> cleared (revoked or expired)
//   register() — creates the account; the API signs you in by returning a token,
//                which is stored with the profile and the sign-in time.
//   login()    — the same, for an existing account.
//   logout()   — revokes the token server-side, and clears it locally whether or
//                not the server answered (a phone with no signal must still be
//                able to sign out).
//   forget()   — drops the session without calling the API, for a 401 seen later.
import { isSessionExpired, sessionTtlDays } from "./sessionPolicy.js";

export function createAuthSession({
  storage,
  api,
  now = () => Date.now(),
  ttlDays = sessionTtlDays(),
}) {
  async function remember(token, user) {
    await storage.saveSession({ token, user, issuedAt: new Date(now()).toISOString() });
    return user;
  }

  /**
   * @returns {Promise<{user: object|null, reason: string}>} `reason` is one of
   *   "signed_out", "expired", "local", "verified", "rejected", "unverified" —
   *   what the caller needs to say to the user, if anything.
   */
  async function restore() {
    const stored = await storage.loadSession();
    if (!stored?.token) return { user: null, reason: "signed_out" };

    // Offline-safe and server-faithful: the same instant Sanctum would start
    // answering 401, this device stops opening the signed-in stack.
    if (isSessionExpired(stored, { atMs: now(), ttlDays })) {
      await storage.clearSession();
      return { user: null, reason: "expired" };
    }

    // The normal case, and the whole point: identity is already here.
    if (stored.user) return { user: stored.user, reason: "local" };

    // A record from before the profile was cached. /me is the only way to find
    // out who it belongs to — but note what happens when that fails: the token
    // stays, because an unreachable server is not a sign-out.
    try {
      const { user } = await api.getCurrentUser();
      await storage.saveSession({ ...stored, user, issuedAt: stored.issuedAt ?? new Date(now()).toISOString() });
      return { user, reason: "verified" };
    } catch (err) {
      if (err?.status === 401) {
        await storage.clearSession();
        return { user: null, reason: "rejected" };
      }

      return { user: null, reason: "unverified" };
    }
  }

  async function register(username, password) {
    const { token, user } = await api.register(username, password);
    return remember(token, user);
  }

  async function login(username, password) {
    const { token, user } = await api.login(username, password);
    return remember(token, user);
  }

  async function logout() {
    let failure = null;

    try {
      await api.logout();
    } catch (err) {
      failure = err;
    }

    // The session is gone either way: a failed call must not trap somebody in a
    // signed-in state.
    await storage.clearSession();

    // Only a real rejection is worth reporting; being offline is not a failure to
    // sign out.
    if (failure && failure.code !== "network_error") throw failure;
  }

  return { restore, register, login, logout, forget: () => storage.clearSession() };
}

