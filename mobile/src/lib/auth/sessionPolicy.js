// How long a session stays good, and when it has run out.
//
// The server is the authority. backend/config/sanctum.php sets
//
//     'expiration' => 60 * 24 * 30,
//
// so Sanctum refuses a bearer token more than 30 days after it was *created* —
// not after its last use, and overriding whatever expires_at the token carries.
// A phone with no cable cannot ask the server, but it must not be locked out too
// early either, so the same number is mirrored here, in one place, and audited
// against the backend by the checks in mobile/tests.
//
// EXPO_PUBLIC_SESSION_TTL_DAYS overrides it for a test build (see .env.example):
// that is how the expiry screen is exercised without waiting a month.
//
// "Nothing to measure" is deliberately *not* expired: a session with no recorded
// sign-in time is left to the server to judge, rather than throwing the user out
// on a guess.
export const DEFAULT_SESSION_TTL_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The configured lifetime in days; anything unusable falls back to 30. */
export function sessionTtlDays(raw = process.env.EXPO_PUBLIC_SESSION_TTL_DAYS) {
  const days = Number(raw);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_SESSION_TTL_DAYS;
}

/**
 * @param {string|null|undefined} issuedAt ISO-8601, the moment this device signed in
 * @returns {string|null} ISO-8601 when the session runs out, or null if unknown
 */
export function expiresAtFor(issuedAt, ttlDays = sessionTtlDays()) {
  const issued = Date.parse(issuedAt ?? "");
  if (!Number.isFinite(issued) || !(ttlDays > 0)) return null;

  return new Date(issued + ttlDays * DAY_MS).toISOString();
}

/**
 * The one rule the app applies offline. The same instant the server would start
 * answering 401, the app stops opening the signed-in stack.
 *
 * @param {{issuedAt?: string|null}} session a stored session record
 */
export function isSessionExpired(session, { atMs = Date.now(), ttlDays = sessionTtlDays() } = {}) {
  const expiresAt = expiresAtFor(session?.issuedAt, ttlDays);
  if (!expiresAt) return false;

  return Date.parse(expiresAt) <= atMs;
}
