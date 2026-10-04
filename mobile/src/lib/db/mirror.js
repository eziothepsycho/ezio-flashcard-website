// The local mirror: reads and writes that never touch the network.
//
// Rows are kept in the same shape the API uses (camelCase, ISO timestamps), so a
// server response and a locally-created row are indistinguishable to the rest of
// the app. `cardsCount` is the local count once a set's cards have been fetched at
// least once (so an offline addition shows up immediately), and the number the
// server last reported until then.
export function createMirror(db) {
  const marks = (count) => Array.from({ length: count }, () => "?").join(", ");

  return {
    // ---------- sets ----------
    async listSets(userId) {
      const rows = await db.all(
        `SELECT s.id, s.user_id, s.title, s.description, s.created_at, s.updated_at,
                CASE WHEN s.cards_synced_at IS NOT NULL
                     THEN (SELECT COUNT(*) FROM cards c WHERE c.set_id = s.id)
                     ELSE s.cards_count END AS cards_count
           FROM sets s
          WHERE s.user_id = ?
          ORDER BY s.created_at, s.id`,
        [userId]
      );

      return rows.map(toSet);
    },

    async getSet(setId) {
      const row = await db.get(
        `SELECT id, user_id, title, description, cards_count, created_at, updated_at
           FROM sets WHERE id = ?`,
        [setId]
      );

      return row ? toSet(row) : null;
    },

    /** @param {Array<object>} rows sets in the API's shape (or a local one). */
    async upsertSets(rows) {
      for (const row of rows) {
        await db.run(
          `INSERT INTO sets (id, user_id, title, description, cards_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             user_id = excluded.user_id,
             title = excluded.title,
             description = excluded.description,
             cards_count = excluded.cards_count,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at`,
          [
            row.id,
            row.userId,
            row.title,
            row.description ?? "",
            typeof row.cardsCount === "number" ? row.cardsCount : 0,
            row.createdAt,
            row.updatedAt,
          ]
        );
      }
    },

    /** Removes sets and, with them, their cards. */
    async removeSets(ids) {
      if (ids.length === 0) return;
      await db.run(`DELETE FROM cards WHERE set_id IN (${marks(ids.length)})`, ids);
      await db.run(`DELETE FROM sets WHERE id IN (${marks(ids.length)})`, ids);
    },

    /**
     * Removes this account's sets that the server no longer lists — unless the
     * outbox has something queued for them.
     *
     * The decision is made by one statement, not by a snapshot read earlier: a
     * write that lands while a sync is in flight must never be swept away (this
     * was a real race, caught by the Phase H check).
     */
    async removeSetsAbsentFrom(userId, serverIds) {
      const notOnServer = serverIds.length ? `AND id NOT IN (${marks(serverIds.length)})` : "";
      const protectedIds = `AND id NOT IN (SELECT entity_id FROM outbox WHERE user_id = ?)
                            AND id NOT IN (SELECT set_id FROM outbox WHERE user_id = ? AND set_id IS NOT NULL)`;

      const rows = await db.all(
        `SELECT id FROM sets WHERE user_id = ? ${notOnServer} ${protectedIds}`,
        [userId, ...serverIds, userId, userId]
      );

      const ids = rows.map((row) => row.id);
      if (ids.length > 0) await this.removeSets(ids);
      return ids;
    },

    /** Records that this set's cards are up to date, so local counts take over. */
    async markCardsSynced(setId, at) {
      await db.run(`UPDATE sets SET cards_synced_at = ? WHERE id = ?`, [at, setId]);
    },

    /** Sets whose cards have never been fetched, or were fetched before `cutoff`. */
    async listSetIdsNeedingCards(userId, cutoff) {
      const rows = await db.all(
        `SELECT id FROM sets
          WHERE user_id = ? AND (cards_synced_at IS NULL OR cards_synced_at < ?)
          ORDER BY created_at, id`,
        [userId, cutoff]
      );

      return rows.map((row) => row.id);
    },

    // ---------- cards ----------
    async listCards(setId) {
      const rows = await db.all(
        `SELECT id, set_id, term, definition, learning_status, created_at, updated_at
           FROM cards WHERE set_id = ? ORDER BY created_at, id`,
        [setId]
      );

      return rows.map(toCard);
    },

    async getCard(cardId) {
      const row = await db.get(
        `SELECT id, set_id, term, definition, learning_status, created_at, updated_at
           FROM cards WHERE id = ?`,
        [cardId]
      );

      return row ? toCard(row) : null;
    },

    async upsertCards(rows) {
      for (const row of rows) {
        await db.run(
          `INSERT INTO cards (id, set_id, term, definition, learning_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             set_id = excluded.set_id,
             term = excluded.term,
             definition = excluded.definition,
             learning_status = excluded.learning_status,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at`,
          [
            row.id,
            row.setId,
            row.term,
            row.definition,
            row.learningStatus ?? null,
            row.createdAt,
            row.updatedAt,
          ]
        );
      }
    },

    async removeCards(ids) {
      if (ids.length === 0) return;
      await db.run(`DELETE FROM cards WHERE id IN (${marks(ids.length)})`, ids);
    },

    /**
     * The card equivalent of removeSetsAbsentFrom: one statement, so a card
     * written while the sync was in flight is never removed by it. The outbox is
     * matched by the set's owner; if the set row is not there, nothing matches
     * and nothing is removed.
     */
    async removeCardsAbsentFrom(setId, serverCardIds) {
      const notOnServer = serverCardIds.length ? `AND id NOT IN (${marks(serverCardIds.length)})` : "";

      const rows = await db.all(
        `SELECT id FROM cards WHERE set_id = ? ${notOnServer}
          AND id NOT IN (SELECT entity_id FROM outbox WHERE user_id = (SELECT user_id FROM sets WHERE id = ?))`,
        [setId, ...serverCardIds, setId]
      );

      const ids = rows.map((row) => row.id);
      if (ids.length > 0) await this.removeCards(ids);
      return ids;
    },

    async removeCardsForSet(setId) {
      await db.run(`DELETE FROM cards WHERE set_id = ?`, [setId]);
    },
  };
}

function toSet(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    cardsCount: row.cards_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCard(row) {
  return {
    id: row.id,
    setId: row.set_id,
    term: row.term,
    definition: row.definition,
    learningStatus: row.learning_status ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
