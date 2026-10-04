import { useEffect, useState } from "react";

import { localStack } from "./setup.js";

/**
 * The local stack (database, mirror, outbox, engine and the two repositories),
 * opened once per app run. Screens render their loading state until it is ready —
 * which is immediate on a warm start and a few milliseconds on a cold one.
 */
export function useLocal() {
  const [stack, setStack] = useState(null);

  useEffect(() => {
    let cancelled = false;

    localStack().then((value) => {
      if (!cancelled) setStack(value);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return stack;
}
