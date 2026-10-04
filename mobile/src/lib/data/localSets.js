// Local-first set operations.
//
// Every call writes the mirror first and queues the change, then asks the sync
// engine to push it. Nothing here waits on the network, which is what makes
// creating, renaming and deleting sets work with no connection at all.
export function createSetsRepository({
  mirror,
  outbox,
  engine,
  newId,
  now = () => new Date().toISOString(),
}) {
  async function enqueue(userId, op, entityId, payload) {
    await outbox.enqueue({ userId, entity: "set", op, entityId, payload });
    engine.schedule();
  }

  return {
    /** Reads only the mirror: instant, and available offline. */
    list: (userId) => mirror.listSets(userId),

    async create(userId, { title, description = "" }) {
      const timestamp = now();
      const set = {
        id: newId(),
        userId,
        title,
        description,
        cardsCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await mirror.upsertSets([set]);
      // Its cards are known exactly — there are none yet — so listings use the
      // local count from the outset instead of the server's cards_count.
      await mirror.markCardsSynced(set.id, timestamp);
      // The queued create goes through POST /import, which is idempotent, so
      // replaying it can never duplicate or collide (Phase A finding F2).
      await enqueue(userId, "create", set.id, set);
      return set;
    },

    async update(userId, setId, updates) {
      const current = await mirror.getSet(setId);
      if (!current) throw new Error("That set is no longer on this device.");

      const next = { ...current, ...updates, updatedAt: now() };
      await mirror.upsertSets([next]);
      await enqueue(userId, "update", setId, {
        title: next.title,
        description: next.description,
      });
      return next;
    },

    async remove(userId, setId) {
      // With the rows goes every card inside: deleting a set cascades, exactly
      // like the API's own foreign key.
      await mirror.removeSets([setId]);
      await enqueue(userId, "delete", setId, {});
    },
  };
}
