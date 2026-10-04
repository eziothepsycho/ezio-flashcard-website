// Local-first card operations — the same shape as localSets.
//
// A queued create carries its card in a `cards` array so a bulk import is one
// queued change (and one /import call), while an edit sends only the fields that
// changed: grading a card must never rewrite its text.
export function createCardsRepository({
  mirror,
  outbox,
  engine,
  newId,
  now = () => new Date().toISOString(),
}) {
  function blankCard(setId, row, timestamp) {
    return {
      id: newId(),
      setId,
      term: row.term,
      definition: row.definition,
      learningStatus: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async function enqueueCreate(userId, setId, cards) {
    await outbox.enqueue({
      userId,
      entity: "card",
      op: "create",
      entityId: cards[0].id,
      setId,
      payload: { cards },
    });
    engine.schedule();
  }

  async function patch(userId, cardId, updates) {
    const current = await mirror.getCard(cardId);
    if (!current) throw new Error("That flashcard is no longer on this device.");

    await mirror.upsertCards([{ ...current, ...updates, updatedAt: now() }]);
    await outbox.enqueue({
      userId,
      entity: "card",
      op: "update",
      entityId: cardId,
      setId: current.setId,
      payload: updates,
    });
    engine.schedule();
  }

  return {
    list: (setId) => mirror.listCards(setId),

    async create(userId, setId, { term, definition }) {
      const card = blankCard(setId, { term, definition }, now());
      await mirror.upsertCards([card]);
      await enqueueCreate(userId, setId, [card]);
      return card;
    },

    /** The TAB-import path: the parsed rows become one queued change. */
    async createMany(userId, setId, rows) {
      const timestamp = now();
      const cards = rows.map((row) => blankCard(setId, row, timestamp));
      if (cards.length === 0) return [];

      await mirror.upsertCards(cards);
      await enqueueCreate(userId, setId, cards);
      return cards;
    },

    update: (userId, cardId, updates) => patch(userId, cardId, updates),

    /** Study Mode's grading, saved through the same PATCH. */
    grade: (userId, cardId, learningStatus) => patch(userId, cardId, { learningStatus }),

    async remove(userId, cardId) {
      const current = await mirror.getCard(cardId);
      if (!current) return;

      await mirror.removeCards([cardId]);
      await outbox.enqueue({
        userId,
        entity: "card",
        op: "delete",
        entityId: cardId,
        setId: current.setId,
        payload: {},
      });
      engine.schedule();
    },
  };
}
