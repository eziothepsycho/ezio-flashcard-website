// The sets list, local-first.
//
// Reads come from the SQLite mirror, so they are instant and work with no
// connection at all. Writes go to the mirror first, are queued in the outbox and
// are pushed by the sync engine — so creating, renaming or deleting a set never
// waits on the network.
//
// A refresh therefore has two steps: show what is local, then let the engine push
// and pull and show whatever changed.
import { useCallback, useEffect, useRef, useState } from "react";

import { useLocal } from "../local/useLocal.js";

export function useSets(userId) {
  const local = useLocal();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // A slow answer must never overwrite a newer one.
  const ticket = useRef(0);

  const readLocal = useCallback(async () => {
    if (!local || !userId) return [];

    const rows = await local.sets.list(userId);
    setSets(rows);
    setLoading(false);
    return rows;
  }, [local, userId]);

  const refresh = useCallback(async () => {
    if (!local || !userId) return;

    const current = (ticket.current += 1);

    await readLocal();
    if (current !== ticket.current) return;

    const status = await local.engine.syncNow();
    if (current !== ticket.current) return;

    await readLocal();
    if (current !== ticket.current) return;

    // A rejected token is the session's business (it signs out); anything else is
    // worth showing.
    setError(status.state === "error" ? status.message : "");
  }, [local, userId, readLocal]);

  // A sync that runs in the background — the one the engine starts on launch, on
  // resume, or from "Sync Now" — can bring rows this screen has never read. The
  // list follows the engine instead of waiting for a focus event, so a set made
  // on the website appears as soon as the pull that fetched it finishes.
  useEffect(() => {
    if (!local || !userId) return undefined;

    let lastSyncedAt = local.engine.getStatus().lastSyncedAt;

    return local.engine.subscribe((status) => {
      if (status.lastSyncedAt === lastSyncedAt) return;
      lastSyncedAt = status.lastSyncedAt;
      readLocal();
    });
  }, [local, userId, readLocal]);

  const createSet = useCallback(
    async (values) => {
      await local.sets.create(userId, values);
      await readLocal();
    },
    [local, userId, readLocal]
  );

  const updateSet = useCallback(
    async (setId, updates) => {
      await local.sets.update(userId, setId, updates);
      await readLocal();
    },
    [local, userId, readLocal]
  );

  const deleteSet = useCallback(
    async (setId) => {
      await local.sets.remove(userId, setId);
      await readLocal();
    },
    [local, userId, readLocal]
  );

  return { sets, loading, error, setError, refresh, createSet, updateSet, deleteSet };
}
