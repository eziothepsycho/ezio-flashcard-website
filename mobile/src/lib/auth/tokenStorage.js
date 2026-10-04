// Where the session lives on the device.
//
// expo-secure-store keeps it in the iOS Keychain / Android Keystore, encrypted
// at rest and readable only by this app — deliberately not AsyncStorage, which
// is plain JSON on disk and would be the mobile equivalent of the website's
// localStorage.
//
// Three fields, and no more:
//   token      the bearer token — the only credential that exists on the phone
//   user       { id, username, createdAt }, cached at sign-in
//   issuedAt   when this device signed in, which is what the 30-day rule counts
//              from (see sessionPolicy.js)
//
// The cached profile is what lets the app open offline: without it, knowing who
// is signed in would mean asking /me, and a phone in a pocket has no server. It
// is not a credential — it only names the account whose rows are already in the
// local database.
//
// The password is never written anywhere: it is sent once to the API and then
// forgotten.
import * as SecureStore from "expo-secure-store";

// SecureStore keys are limited to letters, numbers, ".", "-" and "_".
const SESSION_KEY = "cards.session";

// The key the app used before it cached the profile: a bare token string. It is
// still read (so an upgrade is not a surprise sign-out) and is removed as soon as
// anything is written or cleared.
const LEGACY_TOKEN_KEY = "cards.authToken";

/**
 * @returns {Promise<{token: string, user: object|null, issuedAt: string|null}|null>}
 *   the stored session, or null when there is none.
 */
export async function loadSession() {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.token === "string" && parsed.token) {
        return {
          token: parsed.token,
          user: parsed.user ?? null,
          issuedAt: parsed.issuedAt ?? null,
        };
      }
    } catch {
      // Not JSON: handled below as a bare token.
    }

    return { token: raw, user: null, issuedAt: null };
  }

  const legacy = await SecureStore.getItemAsync(LEGACY_TOKEN_KEY);
  return legacy ? { token: legacy, user: null, issuedAt: null } : null;
}

/** @param {{token: string, user: object|null, issuedAt: string|null}} session */
export async function saveSession({ token, user, issuedAt }) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token, user, issuedAt }));
  await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
}

/** Signing out, or a token the server rejected: nothing of the session is left. */
export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
}
