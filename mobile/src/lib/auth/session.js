// The React side of authentication: one session for the whole app.
//
// Screens see { user, restoring, notice, register, login, logout, forget } and
// nothing else — no tokens, no storage, no HTTP. The client is given a token
// provider here, so every request it makes carries the bearer token without any
// screen ever touching one.
//
// Offline-first, and this is the file where that is decided: a launch reads the
// stored session off the device and signs in from that alone. No request gates
// the app opening, so a phone with no cable lands on Home with its local data.
// The API keeps two powers, and both need the server to actually answer — a 401
// ends the session, and the sync engine needs it to push and pull.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";

import * as authApi from "../api/authApi.js";
import { setTokenProvider, setUnauthorizedHandler } from "../api/client.js";
import { localStack } from "../local/setup.js";
import { createAuthSession } from "./authSession.js";
import * as tokenStorage from "./tokenStorage.js";

// SecureStore is the only copy of the session: the client reads its token
// through this provider on each request rather than keeping one in memory.
setTokenProvider(async () => (await tokenStorage.loadSession())?.token ?? null);

const authSession = createAuthSession({ storage: tokenStorage, api: authApi });

/**
 * The sync engine follows the session: it starts for the signed-in account and
 * stops when that account signs out.
 *
 * The outbox is deliberately left alone — including on a 401 — so queued work is
 * never lost; it resumes when the same account signs in again.
 */
async function followSession(nextUser) {
  const local = await localStack();
  if (nextUser) await local.engine.start(nextUser.id);
  else local.engine.stop();
}

/**
 * The only two ways a stored session really ends, and what the login screen says
 * about them. An offline launch never lands here: that is the whole point of the
 * local restore.
 */
const NOTICES = {
  expired: "Session expired. Please connect to the server and log in again.",
  rejected: "Session expired. Please log in again.",
  // Only reachable from a session stored before this build cached the profile.
  unverified:
    "Could not check the saved session while offline. Connect to the server and log in once.",
};

const noNotice = (reason) => NOTICES[reason] ?? "";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [notice, setNotice] = useState("");

  // On launch: what is stored on this device decides who is signed in — no
  // request, so this settles immediately whether or not a server is anywhere
  // near. Nothing renders until it has, so the login screen never flashes for
  // somebody who is already signed in.
  useEffect(() => {
    let cancelled = false;

    authSession
      .restore()
      .then(({ user: restored, reason }) => {
        if (cancelled) return;
        setUser(restored);
        setNotice(noNotice(reason));
        // Signed in from the device: start pushing and pulling, and let the
        // mirror answer every read from here on. Offline this only reports
        // itself as offline — it never blocks a screen.
        followSession(restored);
      })
      .catch((err) => {
        // Storage failing is the only thing that can still land here: the token
        // was never sent anywhere and the password was never stored.
        console.error("Could not restore the session:", err?.message);
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Coming back to the foreground is the cheapest reliable signal that the cable
  // or the network may be back, so it is when the engine tries again.
  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;

      localStack()
        .then((local) => {
          if (!cancelled) local.engine.syncNow();
        })
        .catch((err) => console.error("Could not sync after resuming:", err?.message));
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [user]);

  // Any request that answers 401 — a token that expired or was revoked — clears
  // the session here, so a screen showing a flashcard error never has to notice.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      authSession.forget().catch((err) => {
        console.error("Could not clear the rejected session:", err?.message);
      });
      // The server has spoken: the session is over, and the login screen says so.
      setNotice(NOTICES.rejected);
      setUser(null);
      // Stops the engine but keeps the outbox: the queued changes belong to that
      // account and are pushed when it signs in again.
      followSession(null);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const register = useCallback(async (username, password) => {
    const nextUser = await authSession.register(username, password);
    setNotice("");
    setUser(nextUser);
    followSession(nextUser);
  }, []);

  const login = useCallback(async (username, password) => {
    const nextUser = await authSession.login(username, password);
    setNotice("");
    setUser(nextUser);
    followSession(nextUser);
  }, []);

  const logout = useCallback(async () => {
    await authSession.logout();
    setNotice("");
    setUser(null);
    followSession(null);
  }, []);

  // For a 401 seen by a later phase: drop the token without calling the API.
  const forget = useCallback(async () => {
    await authSession.forget();
    setUser(null);
    followSession(null);
  }, []);

  const value = useMemo(
    () => ({ user, restoring, notice, register, login, logout, forget }),
    [user, restoring, notice, register, login, logout, forget]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error("useSession must be used inside a SessionProvider");
  }

  return value;
}
