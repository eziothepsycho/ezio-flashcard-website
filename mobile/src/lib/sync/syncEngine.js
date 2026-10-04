// The sync engine: push what is queued, then pull what changed.
//
//   1. drain the outbox, oldest first — a queued change is removed only once the
//      API has accepted it;
//   2. reconcile from the server: the full sets list (there is no /changes
//      endpoint, by design), then the cards of the sets whose cards are missing
//      or stale — and always those of a set the user is looking at.
//
// Two rules make this safe, both from the Phase A findings:
//   * a record with something queued is never overwritten by a pull: the local
//     change is pushed first;
//   * a 404 or a 422 drops that one queued change (it can never succeed), while a
//     network failure or a 401 stops the drain and keeps everything.
//
// Creation goes through POST /import rather than the plain create routes, because
// /import is transactional and idempotent: replaying a queued create cannot
// duplicate anything or fail on a duplicate id (Phase A, F1/F2).
const CARDS_STALE_MS = 5 * 60 * 1000;

export function createSyncEngine({ mirror, outbox, api, describe = defaultDescribe, now = () => new Date().toISOString() }) {
  const listeners = new Set();

  let status = { state: "idle", pending: 0, lastSyncedAt: null, message: "" };
  let userId = null;
  let timer = null;
  let running = false;
  let retryDelay = 0;

  function emit(next) {
    status = { ...status, ...next };
    for (const listener of listeners) listener(status);
  }

  /**
   * Screens subscribe to this for the "up to date / N waiting / offline" line.
   * The listener is not called here: a screen reads the current status itself, so
   * nothing is set during the render that registers it.
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function pendingCount() {
    return userId ? outbox.countForUser(userId) : 0;
  }

  async function start(nextUserId) {
    userId = nextUserId;
    retryDelay = 0;
    emit({ pending: await pendingCount(), message: "" });
    schedule(0);
  }

  function stop() {
    userId = null;
    clearTimeout(timer);
    timer = null;
    running = false;
  }

  /** Sends one queued change. Creates replay through /import (retry-safe). */
  async function push(op) {
    if (op.entity === "set") {
      if (op.op === "create") {
        await api.importSets({
          sets: [
            {
              id: op.entityId,
              title: op.payload.title,
              description: op.payload.description ?? "",
              createdAt: op.payload.createdAt,
              updatedAt: op.payload.updatedAt,
              cards: [],
            },
          ],
        });
        return;
      }
      if (op.op === "update") {
        await api.updateSet(op.entityId, {
          title: op.payload.title,
          description: op.payload.description,
        });
        return;
      }
      if (op.op === "delete") {
        await api.deleteSet(op.entityId);
        return;
      }
    }

    if (op.entity === "card") {
      if (op.op === "create") {
        // Cards are created one by one through the ordinary route, because
        // POST /import skips a set *and everything inside it* when the set already
        // exists (found in Phase H) — so it cannot add a card to a set that is
        // already on the server.
        for (const card of op.payload.cards ?? []) {
          try {
            await api.createCard({
              setId: op.setId,
              id: card.id,
              term: card.term,
              definition: card.definition,
            });
          } catch (err) {
            // A retry can collide with the copy that already landed: the plain
            // create route answers 500 for an id it already holds (Phase A finding
            // F1), so the server is asked instead of guessed. If the card is
            // there, this queued change is done.
            const onServer = await api.getCardsBySet(op.setId).catch(() => null);
            if (onServer?.some((row) => row.id === card.id)) continue;
            throw err;
          }
        }
        return;
      }
      if (op.op === "update") {
        await api.updateCard(op.entityId, op.payload);
        return;
      }
      if (op.op === "delete") {
        await api.deleteCard(op.entityId);
        return;
      }
    }

    throw new Error(`Unknown queued change: ${op.entity}/${op.op}`);
  }

  /**
   * @returns {Promise<"ok"|"offline"|"unauthorized">} `skipped` collects the
   * changes the server refused for good, so the caller can say so.
   */
  async function drain(skipped) {
    const ops = await outbox.listForUser(userId);

    for (const op of ops) {
      try {
        await push(op);
        await outbox.remove(op.id);
      } catch (err) {
        if (err?.status === 401) return "unauthorized";
        if (err?.code === "network_error") return "offline";

        await outbox.recordFailure(op.id, describe(err));

        if (isPermanent(err)) {
          // The server will never accept this one (gone, invalid, refused), so it
          // is dropped rather than blocking every change behind it.
          await outbox.remove(op.id);
          if (err?.status === 404 || err?.code === "not_found") await dropLocal(op);
          skipped.push(describe(err, op.entity));
          continue;
        }

        // Anything else — a 500, or a bug in a push — keeps its place in the
        // queue and stops this drain, so nothing is silently thrown away.
        return "failed";
      }
    }

    return "ok";
  }

  async function dropLocal(op) {
    if (op.entity === "set") await mirror.removeSets([op.entityId]);
    else await mirror.removeCards([op.entityId]);
  }
  // ---------- reconciliation ----------
  async function reconcileSets() {
    const server = await api.getSets();
    const serverIds = server.map((row) => row.id);
    const pending = await outbox.pendingIds(userId);

    // A record with something queued keeps its local value: it is pushed first.
    const fresh = server.filter((row) => !pending.has(row.id));
    if (fresh.length > 0) await mirror.upsertSets(fresh);

    // Anything the server no longer lists goes — decided by one statement, so a
    // write that landed while this sync was in flight cannot be swept away.
    await mirror.removeSetsAbsentFrom(userId, serverIds);

    return serverIds;
  }

  async function reconcileCards(setIds) {
    const pending = await outbox.pendingIds(userId);

    for (const setId of setIds) {
      if (pending.has(setId)) continue; // a queued create: not on the server yet

      let serverCards;
      try {
        serverCards = await api.getCardsBySet(setId);
      } catch (err) {
        if (err?.status === 404 || err?.code === "not_found") {
          // One more look before believing it: a set created moments ago may
          // simply not have arrived yet.
          const queued = await outbox.pendingIds(userId);
          if (queued.has(setId)) continue;

          // The server does not have this set — deleted elsewhere, or never this
          // account's. It goes locally too, with its cards.
          await mirror.removeSets([setId]);
          continue;
        }
        throw err;
      }

      const serverCardIds = serverCards.map((card) => card.id);
      const freshCards = serverCards.filter((card) => !pending.has(card.id));
      if (freshCards.length > 0) await mirror.upsertCards(freshCards);

      await mirror.removeCardsAbsentFrom(setId, serverCardIds);
      await mirror.markCardsSynced(setId, now());
    }
  }

  async function reconcile({ forceCards = false } = {}) {
    const serverSetIds = await reconcileSets();

    const staleSetIds = forceCards
      ? serverSetIds
      : (await mirror.listSetIdsNeedingCards(userId, new Date(Date.now() - CARDS_STALE_MS).toISOString())).filter(
          (id) => serverSetIds.includes(id)
        );

    await reconcileCards(staleSetIds);
  }

  // ---------- running a sync ----------
  async function runExclusive(work) {
    if (!userId || running) return status;

    running = true;
    emit({ state: "syncing", message: "" });

    try {
      const skipped = [];
      const drained = await drain(skipped);

      if (drained === "unauthorized") {
        // The queue stays: the session handler signs out, and the work resumes
        // when the same account signs in again.
        emit({ state: "error", pending: await pendingCount(), message: SESSION_ENDED });
        return status;
      }

      if (drained === "offline") {
        retry();
        emit({ state: "offline", pending: await pendingCount(), message: skipped.join(" ") });
        return status;
      }

      if (drained === "failed") {
        retry();
        emit({
          state: "error",
          pending: await pendingCount(),
          message: "One queued change could not be sent. It is still saved and will be retried.",
        });
        return status;
      }

      await work();
      retryDelay = 0;
      emit({
        state: "idle",
        pending: await pendingCount(),
        lastSyncedAt: now(),
        message: skipped.join(" "),
      });
    } catch (err) {
      const offline = err?.code === "network_error";
      if (offline) retry();

      emit({
        state: offline ? "offline" : "error",
        pending: await pendingCount(),
        // Offline is a state, not a failure: the label above already says the app
        // is working from this phone, and the client's own "Can't reach the
        // server" would only repeat that in more alarming words.
        message: err?.status === 401 ? SESSION_ENDED : offline ? "" : describe(err),
      });
    } finally {
      running = false;
    }

    return status;
  }

  const syncNow = ({ forceCards = false } = {}) => runExclusive(() => reconcile({ forceCards }));

  /** Refresh one set's cards — what a set screen does when it opens. */
  const syncCards = (setId) => runExclusive(() => reconcileCards([setId]));

  /** Debounced sync, used after local writes so a burst of edits is one run. */
  function schedule(delay = 800) {
    if (!userId) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      syncNow();
    }, delay);
  }

  /** Retries with backoff while something is queued and the server is unreachable. */
  function retry() {
    if (!userId) return;
    retryDelay = retryDelay === 0 ? 5000 : Math.min(retryDelay * 2, 60000);
    clearTimeout(timer);
    timer = setTimeout(() => {
      syncNow();
    }, retryDelay);
  }

  return { getStatus: () => status, schedule, start, stop, subscribe, syncCards, syncNow };
}

const SESSION_ENDED = "Your session ended. Sign in again to sync.";

/**
 * A failure the server will repeat: the record is gone, or the payload is one it
 * refuses. Everything else (a 500, a timeout, a bug) is worth keeping and retrying.
 */
function isPermanent(err) {
  if (err?.code === "not_found") return true;
  const status = err?.status;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429;
}

function defaultDescribe(err, what = "change") {
  if (err?.code === "not_found") return `That ${what} no longer exists on the server.`;
  return err?.message || "Something went wrong while syncing.";
}

