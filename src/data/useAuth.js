import { useCallback, useState } from "react";
import * as authApi from "./auth";

// The only place React meets the account logic. Components see
// { user, register, login, logout } and nothing else — no storage,
// no hashing, no session rules.
export function useAuth() {
  // Read the stored session synchronously so a page refresh doesn't
  // flash the login screen first.
  const [user, setUser] = useState(() => authApi.getCurrentUser());

  const register = useCallback(async (username, password) => {
    const result = await authApi.register(username, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await authApi.login(username, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  return { user, register, login, logout };
}