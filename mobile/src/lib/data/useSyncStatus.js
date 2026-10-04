import { useCallback, useEffect, useState } from "react";

import { useLocal } from "../local/useLocal.js";

const INITIAL = { state: "idle", pending: 0, lastSyncedAt: null, message: "" };

/**
 * The sync engine's status, for the "up to date / N waiting / offline" line — plus
 * `syncNow`, which is what the button next to that line calls.
 *
 * The listener is registered without being called, and the engine's current value
 * is applied on a microtask, so nothing is set during the render that mounts this.
 */
export function useSyncStatus() {
  const local = useLocal();
  const [status, setStatus] = useState(INITIAL);

  useEffect(() => {
    if (!local) return undefined;

    const unsubscribe = local.engine.subscribe(setStatus);
    Promise.resolve().then(() => setStatus(local.engine.getStatus()));

    return unsubscribe;
  }, [local]);

  // The engine already knows which account to push for; this only asks it to try.
  const syncNow = useCallback(() => {
    if (!local) return Promise.resolve();

    return local.engine.syncNow();
  }, [local]);

  return { ...status, syncNow };
}
