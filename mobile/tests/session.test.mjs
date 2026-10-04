// The offline rules, exercised without a device.
//
// These are the rules that decide whether the app opens when there is no server,
// so they are worth checking on the PC: `npm test` in mobile/ runs this file.
// Nothing here imports React or Expo — authSession and sessionPolicy take their
// storage and API as arguments, which is exactly why the app's offline behaviour
// can be tested at all.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createAuthSession } from "../src/lib/auth/authSession.js";
import {
  DEFAULT_SESSION_TTL_DAYS,
  expiresAtFor,
  isSessionExpired,
  sessionTtlDays,
} from "../src/lib/auth/sessionPolicy.js";

const DAY = 24 * 60 * 60 * 1000;

// A fixed clock, so nothing here waits a month.
const NOW = Date.parse("2026-10-04T12:00:00.000Z");
const at = (ms) => new Date(ms).toISOString();
const user = { id: "u-1", username: "testapp1", createdAt: "2026-01-01T00:00:00.000Z" };

function fakeStorage(initial = null) {
  const state = { record: initial };
  return {
    state,
    loadSession: async () => state.record,
    saveSession: async (record) => {
      state.record = record;
    },
    clearSession: async () => {
      state.record = null;
    },
  };
}

/**
 * Stands in for authApi: it counts every call, so "offline" can mean "would have
 * thrown" *and* "was never even asked".
 */
function fakeApi({ reachable = false, meStatus = 200 } = {}) {
  const state = { calls: [] };
  const offline = () => {
    throw Object.assign(new Error("Can't reach the server."), {
      code: "network_error",
      status: 0,
    });
  };

  return {
    state,
    async getCurrentUser() {
      state.calls.push("getCurrentUser");
      if (!reachable) offline();
      if (meStatus === 401) {
        throw Object.assign(new Error("Unauthenticated."), { status: 401, code: "unauthenticated" });
      }
      return { user };
    },
    async login() {
      state.calls.push("login");
      if (!reachable) offline();
      return { token: "token-fresh", user };
    },
    async register() {
      state.calls.push("register");
      if (!reachable) offline();
      return { token: "token-fresh", user };
    },
    async logout() {
      state.calls.push("logout");
      if (!reachable) offline();
      return null;
    },
  };
}

// ---------------------------------------------------------------- the policy --
test("the mirrored lifetime matches what the backend actually enforces", () => {
  const sanctum = readFileSync(new URL("../../backend/config/sanctum.php", import.meta.url), "utf8");
  const configured = sanctum.match(/'expiration'\s*=>\s*([0-9\s*]+),/);

  assert.ok(configured, "backend/config/sanctum.php no longer sets an expiration");
  const minutes = configured[1]
    .split("*")
    .reduce((total, part) => total * Number(part.trim()), 1);

  assert.equal(
    minutes / (60 * 24),
    DEFAULT_SESSION_TTL_DAYS,
    "sessionPolicy and Sanctum have drifted apart"
  );
});

test("the lifetime can be overridden for a test build, and a bad value falls back", () => {
  assert.equal(sessionTtlDays("1"), 1);
  assert.equal(sessionTtlDays(undefined), 30);
  assert.equal(sessionTtlDays("nonsense"), 30);
  assert.equal(sessionTtlDays("-5"), 30);
});

test("expiry is counted from the sign-in, not from the last use", () => {
  const issuedAt = at(NOW);
  assert.equal(expiresAtFor(issuedAt), at(NOW + 30 * DAY));
  // A session with no recorded sign-in time is not expired: the server judges it.
  assert.equal(isSessionExpired({ issuedAt: null }, { atMs: NOW }), false);
  assert.equal(isSessionExpired(null, { atMs: NOW }), false);
});

// ------------------------------------------------------- restoring a session --
test("a signed-in user opens offline, and the API is never asked", async () => {
  const storage = fakeStorage({ token: "token-1", user, issuedAt: at(NOW - 10 * DAY) });
  const api = fakeApi({ reachable: false });
  const session = createAuthSession({ storage, api, now: () => NOW });

  const result = await session.restore();

  assert.deepEqual(result, { user, reason: "local" });
  assert.deepEqual(api.state.calls, [], "a cached profile means no request at all");
});

test("offline restore still works on day 29, and stops on day 31", async () => {
  const api = fakeApi({ reachable: false });

  const fresh = fakeStorage({ token: "t", user, issuedAt: at(NOW - 29 * DAY) });
  assert.equal((await createAuthSession({ storage: fresh, api, now: () => NOW }).restore()).user, user);

  const stale = fakeStorage({ token: "t", user, issuedAt: at(NOW - 31 * DAY) });
  const result = await createAuthSession({ storage: stale, api, now: () => NOW }).restore();

  assert.deepEqual(result, { user: null, reason: "expired" });
  assert.equal(stale.state.record, null, "an expired session is cleared from the device");
});

test("a first-ever launch never touches the network", async () => {
  const api = fakeApi({ reachable: true });
  const result = await createAuthSession({ storage: fakeStorage(null), api, now: () => NOW }).restore();

  assert.deepEqual(result, { user: null, reason: "signed_out" });
  assert.deepEqual(api.state.calls, []);
});

test("a session stored before profiles were cached is upgraded once, online", async () => {
  const storage = fakeStorage({ token: "token-legacy", user: null, issuedAt: null });
  const api = fakeApi({ reachable: true });
  const result = await createAuthSession({ storage, api, now: () => NOW }).restore();

  assert.equal(result.reason, "verified");
  assert.equal(storage.state.record.user.username, "testapp1");
  assert.equal(storage.state.record.issuedAt, at(NOW), "the 30 days start when it is confirmed");
});

test("...and offline it keeps the token instead of throwing the user out", async () => {
  const storage = fakeStorage({ token: "token-legacy", user: null, issuedAt: null });
  const api = fakeApi({ reachable: false });
  const result = await createAuthSession({ storage, api, now: () => NOW }).restore();

  assert.equal(result.user, null);
  assert.equal(result.reason, "unverified");
  assert.equal(storage.state.record.token, "token-legacy", "an unreachable server is not a sign-out");
});

test("a token the server rejects is dropped", async () => {
  const storage = fakeStorage({ token: "token-1", user: null, issuedAt: null });
  const api = fakeApi({ reachable: true, meStatus: 401 });
  const result = await createAuthSession({ storage, api, now: () => NOW }).restore();

  assert.deepEqual(result, { user: null, reason: "rejected" });
  assert.equal(storage.state.record, null);
});

test("signing in records the profile and the sign-in time the 30 days count from", async () => {
  const storage = fakeStorage(null);
  const api = fakeApi({ reachable: true });
  const session = createAuthSession({ storage, api, now: () => NOW });

  assert.equal((await session.login("testapp1", "secret")).username, "testapp1");
  assert.deepEqual(storage.state.record, { token: "token-fresh", user, issuedAt: at(NOW) });
});

test("signing out works with no server, and still clears the device", async () => {
  const storage = fakeStorage({ token: "token-1", user, issuedAt: at(NOW) });
  const api = fakeApi({ reachable: false });
  const session = createAuthSession({ storage, api, now: () => NOW });

  await session.logout(); // must not throw

  assert.equal(storage.state.record, null);
  assert.deepEqual(api.state.calls, ["logout"]);
});
