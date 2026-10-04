// The queue of changes that have not reached the server yet.
//
// Every local write adds an entry; the sync engine drains them oldest-first and
// removes each one only after the API has accepted it. Nothing here talks HTTP —
// that is the engine's job.
export function createOutbox(db) {
  return {
    async enqueue({ userId, entity, op, entityId, setId = null, payload = {} }) {
      await db.run(
        `INSERT INTO outbox (user_id, entity, op, entity_id, set_id, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, entity, op, entityId, setId, JSON.stringify(payload), new Date().toISOString()]
      );
    },

    async listForUser(userId) {
      const rows = await db.all(`SELECT * FROM outbox WHERE user_id = ? ORDER BY id`, [userId]);

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        entity: row.entity,
        op: row.op,
        entityId: row.entity_id,
        setId: row.set_id,
        payload: safeParse(row.payload),
        attempts: row.attempts,
        lastError: row.last_error,
      }));
    },

    async remove(id) {
      await db.run(`DELETE FROM outbox WHERE id = ?`, [id]);
    },

    async recordFailure(id, message) {
      await db.run(`UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`, [
        message,
        id,
      ]);
    },

    async countForUser(userId) {
      const row = await db.get(`SELECT COUNT(*) AS pending FROM outbox WHERE user_id = ?`, [userId]);
      return row?.pending ?? 0;
    },

    /**
     * Every id with something queued — the changed record itself and the set it
     * belongs to. A pull uses this so it can never overwrite work waiting to be
     * pushed.
     */
    async pendingIds(userId) {
      const rows = await db.all(
        `SELECT DISTINCT entity_id, set_id FROM outbox WHERE user_id = ?`,
        [userId]
      );

      const ids = new Set();
      for (const row of rows) {
        ids.add(row.entity_id);
        if (row.set_id) ids.add(row.set_id);
      }

      return ids;
    },
  };
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
