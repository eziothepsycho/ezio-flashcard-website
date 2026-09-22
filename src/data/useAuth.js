import { useCallback, useEffect, useState } from "react";
import * as authBackend from "./authBackend";

// The only place React meets the account logic. Components see
// { user, restoring, register, login, logout } and nothing else — no storage,
// no tokens, no session rules.
//
// Local mode reads localStorage during the first render, so it is ready
// immediately and behaves exactly as it always has. API mode has to ask the
// server, so it starts in a quiet "restoring" state instead: the login screen is
// never shown for a frame, and authenticated content is never rendered before the
// session has been confirmed.
export function useAuth() {
  const [user, setUser] = useState(() => authBackend.currentUser());
  const [restoring, setRestoring] = useState(authBackend.usingApi);

  useEffect(() => {
    if (!authBackend.usingApi) return undefined;

    let cancelled = false;

    // The state update happens in the promise callback rather than synchronously
    // in the effect, so this is a normal async restore, not a cascading render.
    authBackend.restoreSession().then((result) => {
      if (cancelled) return;
      setUser(result.ok ? result.user : null);
      setRestoring(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (username, password) => {
    const result = await authBackend.register(username, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await authBackend.login(username, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    // The API revokes its token and clears it locally; local mode just drops the
    // stored session. Either way the UI returns to the login screen.
    await authBackend.logout();
    setUser(null);
  }, []);

  return { user, restoring, register, login, logout };
}