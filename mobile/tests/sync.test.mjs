// The synchronization rules, exercised without a device.
//
// The sync engine takes its mirror, outbox and API as arguments, so the promises
// that matter can be checked on the PC:
//
//   * a phone with no server keeps every change it made, and deletes nothing;
//   * when the server comes back, neither side's work is lost.
//
// `npm test` in mobile/ runs this file.
import assert from "node:assert/strict";
import test from "node:test";

import { createSyncEngine } from "../src/lib/sync/syncEngine.js";

const USER = "u-1";
const NOW = "2026-10-04T12:00:00.000Z";

const setRow = (id, title) => ({
  id,
  userId: USER,
  title,
  description: "",
  cardsCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
});

/** Removes every set the server did not list; returns the ids it took out. */
function removeIds(state, serverIds) {
  const keep = new Set(serverIds);
  const gone = [...state.sets.values()].filter((row) => !keep.has(row.id)).map((row) => row.id);

  for (const id of gone) {
    state.sets.delete(id);
    state.removed.push(id);
  }

  return gone;
}

function fakeMirror({ sets = [], needingCards = [] } = {}) {
  const state = { sets: new Map(sets.map((row) => [row.id, row])), upserted: [], removed: [] };

  return {
    state,
    listSets: async () => [...state.sets.values()],
    upsertSets: async (rows) => {
      for (const row of rows) {
        state.sets.set(row.id, row);
        state.upserted.push(row.id);
      }
    },
    removeSets: async (ids) => {
      for (const id of ids) {
        state.sets.delete(id);
        state.removed.push(id);
      }
    },
    // The real one decides this in a single SQL statement, so a write that lands
    // mid-sync cannot be swept away; what this check needs is the outcome.
    removeSetsAbsentFrom: async (_userId, serverIds) => removeIds(state, serverIds),
    listSetIdsNeedingCards: async () => needingCards,
    listCards: async () => [],
    upsertCards: async () => {},
    removeCards: async () => {},
    removeCardsAbsentFrom: async () => [],
    removeCardsForSet: async () => {},
    markCardsSynced: async () => {},
  };
}

function fakeOutbox(rows = []) {
  const state = { rows: [] };
  let nextId = 1;

  for (const row of rows) state.rows.push({ id: nextId++, attempts: 0, ...row });

  return {
    state,
    listForUser: async (userId) => state.rows.filter((row) => row.userId === userId),
    remove: async (id) => {
      state.rows = state.rows.filter((row) => row.id !== id);
    },
    recordFailure: async (id, message) => {
      const row = state.rows.find((item) => item.id === id);
      if (row) {
        row.attempts += 1;
        row.lastError = message;
      }
    },
    countForUser: async (userId) => state.rows.filter((row) => row.userId === userId).length,
    pendingIds: async (userId) => {
      const ids = new Set();
      for (const row of state.rows.filter((item) => item.userId === userId)) {
        ids.add(row.entityId);
        if (row.setId) ids.add(row.setId);
      }
      return ids;
    },
  };
}

/**
 * A server that can be switched off mid-test, keeps what it is sent, and records
 * every route that was called.
 */
function fakeApi({ sets = [] } = {}) {
  const state = { sets: sets.map((row) => ({ ...row })), offline: false, calls: [] };
  const guard = (name) => {
    state.calls.push(name);
    if (state.offline) {
      throw Object.assign(new Error("Can't reach the server."), {
        code: "network_error",
        status: 0,
      });
    }
  };

  return {
    state,
    getSets: async () => {
      guard("getSets");
      return state.sets;
    },
    getCardsBySet: async () => {
      guard("getCardsBySet");
      return [];
    },
    importSets: async (payload) => {
      guard("importSets");
      for (const row of payload.sets) {
        if (!state.sets.some((existing) => existing.id === row.id)) {
          state.sets.push(setRow(row.id, row.title));
        }
      }
      return { importedSets: payload.sets.length, importedCards: 0, skipped: 0 };
    },
    createCard: async () => guard("createCard"),
    updateSet: async (id, updates) => {
      guard("updateSet");
      const row = state.sets.find((item) => item.id === id);
      if (row) Object.assign(row, updates);
      return row;
    },
    deleteSet: async () => guard("deleteSet"),
    updateCard: async () => guard("updateCard"),
    deleteCard: async () => guard("deleteCard"),
  };
}

function engineFor({ sets = [], outboxRows = [], serverSets = [], needingCards = [] }) {
  const mirror = fakeMirror({ sets, needingCards });
  const outbox = fakeOutbox(outboxRows);
  const api = fakeApi({ sets: serverSets });
  const engine = createSyncEngine({ mirror, outbox, api, now: () => NOW });

  return { api, engine, mirror, outbox };
}

const queuedUpdate = (id, title) => ({
  userId: USER,
  entity: "set",
  op: "update",
  entityId: id,
  setId: null,
  payload: { title, description: "" },
});

const queuedCreate = (id, title) => ({
  userId: USER,
  entity: "set",
  op: "create",
  entityId: id,
  setId: null,
  payload: setRow(id, title),
});

// ------------------------------------------------------------------ offline --
test("offline: every change is kept, nothing is deleted, and the status says so", async () => {
  const { api, engine, mirror, outbox } = engineFor({
    sets: [setRow("A", "Local title"), setRow("B", "Laravel Reviewer")],
    serverSets: [setRow("A", "Server title")],
    outboxRows: [queuedUpdate("A", "Local title"), queuedCreate("B", "Laravel Reviewer")],
  });

  api.state.offline = true;
  await engine.start(USER);
  const status = await engine.syncNow();

  assert.equal(status.state, "offline");
  assert.equal(status.pending, 2, "both changes are still queued");
  assert.equal(outbox.state.rows.length, 2, "the queue itself still holds both changes");
  assert.equal(mirror.state.sets.get("A").title, "Local title", "the local edit survived");
  assert.equal(mirror.state.sets.get("B").title, "Laravel Reviewer", "the offline set survived");
  assert.equal(mirror.state.removed.length, 0, "an offline sync deletes nothing");
  assert.equal(api.state.calls.includes("getSets"), false, "the pull never even started");
  assert.equal(status.message, "", "offline is a state, not an error banner");

  engine.stop();
});

// ----------------------------------------------------------- both directions --
test("online: the phone's work is pushed, and the server's work arrives", async () => {
  const { api, engine, mirror, outbox } = engineFor({
    sets: [setRow("A", "Local title"), setRow("B", "Laravel Reviewer")],
    serverSets: [setRow("A", "Server title"), setRow("C", "JavaScript Reviewer")],
    outboxRows: [queuedUpdate("A", "Local title"), queuedCreate("B", "Laravel Reviewer")],
  });

  await engine.start(USER);
  const status = await engine.syncNow();

  assert.equal(status.state, "idle");
  assert.equal(status.lastSyncedAt, NOW);

  // Drained oldest-first, so the local edit reached the server before anything
  // was read back — which is why the pull could not overwrite it.
  assert.deepEqual(api.state.calls.slice(0, 2), ["updateSet", "importSets"]);
  assert.equal(api.state.sets.find((row) => row.id === "A").title, "Local title");
  assert.ok(api.state.sets.some((row) => row.id === "B"), "the offline set reached the server");
  assert.equal(outbox.state.rows.length, 0, "the queue empties once the server has everything");

  // ...and the other direction: the set made on the website is here now, and
  // nothing that was here has gone anywhere.
  assert.deepEqual([...mirror.state.sets.keys()].sort(), ["A", "B", "C"]);
  assert.equal(mirror.state.sets.get("C").title, "JavaScript Reviewer");
  assert.equal(mirror.state.removed.length, 0);

  engine.stop();
});

test("online with nothing queued: the server wins — the documented conflict rule", async () => {
  const { engine, mirror } = engineFor({
    sets: [setRow("A", "Edited on the phone, and already pushed")],
    serverSets: [setRow("A", "Edited on the website")],
  });

  await engine.start(USER);
  await engine.syncNow();

  // Nothing is pending for A, so the server's copy replaces the local one: last
  // write to arrive wins, and a phone with nothing queued has nothing to defend.
  assert.equal(mirror.state.sets.get("A").title, "Edited on the website");

  engine.stop();
});

test("a queued change the server refuses for good is dropped, never retried forever", async () => {
  const { api, engine, mirror, outbox } = engineFor({
    sets: [setRow("A", "Ghost")],
    outboxRows: [
      { userId: USER, entity: "set", op: "delete", entityId: "A", setId: null, payload: {} },
    ],
  });

  api.deleteSet = async () => {
    throw Object.assign(new Error("That set no longer exists."), {
      status: 404,
      code: "not_found",
    });
  };

  await engine.start(USER);
  const status = await engine.syncNow();

  assert.equal(outbox.state.rows.length, 0, "a 404 can never succeed, so it must not block the queue");
  assert.equal(mirror.state.sets.has("A"), false);
  assert.match(status.message, /no longer exists/);

  engine.stop();
});
