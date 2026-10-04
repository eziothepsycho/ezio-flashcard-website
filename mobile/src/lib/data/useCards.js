// One set's cards, local-first — the same shape as useSets.
//
// `gone` means the set is not in the mirror any more: the server answered 404 for
// it (deleted on another device, or never this account's) and reconciliation
// removed it locally, cards and all.
import { useCallback, useEffect, useRef, useState } from "react";

import { useLocal } from "../local/useLocal.js";

export function useCards(setId, userId) {
  const local = useLocal();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [gone, setGone] = useState(false);

  // A slow answer must never overwrite a newer one.
  const ticket = useRef(0);

  const readLocal = useCallback(async () => {
    if (!local || !userId) return;

    const rows = await local.cards.list(setId);
    setCards(rows);

    const set = await local.mirror.getSet(setId);
    setGone(!set);
    setLoading(false);
  }, [local, userId, setId]);

  const refresh = useCallback(async () => {
    if (!local || !userId) return;

    const current = (ticket.current += 1);

    await readLocal();
    if (current !== ticket.current) return;

    const status = await local.engine.syncCards(setId);
    if (current !== ticket.current) return;

    await readLocal();
    if (current !== ticket.current) return;

    setError(status.state === "error" ? status.message : "");
  }, [local, userId, setId, readLocal]);

  // Same as the sets list: a background sync can bring cards this screen has
  // never seen, so it re-reads the mirror when one finishes rather than waiting
  // for the next focus event.
  useEffect(() => {
    if (!local || !userId) return undefined;

    let lastSyncedAt = local.engine.getStatus().lastSyncedAt;

    return local.engine.subscribe((status) => {
      if (status.lastSyncedAt === lastSyncedAt) return;
      lastSyncedAt = status.lastSyncedAt;
      readLocal();
    });
  }, [local, userId, readLocal]);

  const createCard = useCallback(
    async (values) => {
      await local.cards.create(userId, setId, values);
      await readLocal();
    },
    [local, userId, setId, readLocal]
  );

  const createCards = useCallback(
    async (rows) => {
      await local.cards.createMany(userId, setId, rows);
      await readLocal();
    },
    [local, userId, setId, readLocal]
  );

  const updateCard = useCallback(
    async (cardId, updates) => {
      await local.cards.update(userId, cardId, updates);
      await readLocal();
    },
    [local, userId, readLocal]
  );

  const deleteCard = useCallback(
    async (cardId) => {
      await local.cards.remove(userId, cardId);
      await readLocal();
    },
    [local, userId, readLocal]
  );

  /**
   * Study Mode's grading. The badge changes because the mirror changed, and the
   * queue carries the write — no waiting on the network.
   */
  const gradeCard = useCallback(
    async (cardId, learningStatus) => {
      setNotice("");
      try {
        await local.cards.grade(userId, cardId, learningStatus);
        await readLocal();
      } catch (err) {
        setNotice(err?.message ?? "Could not save that grade on this device.");
      }
    },
    [local, userId, readLocal]
  );

  return {
    cards,
    loading,
    error,
    gone,
    notice,
    setNotice,
    setError,
    refresh,
    createCard,
    createCards,
    updateCard,
    gradeCard,
    deleteCard,
  };
}
