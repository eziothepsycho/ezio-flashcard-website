// Accounts over the existing API. The names and return shapes mirror the
// website's src/api/authApi.js, so the two clients speak to one contract:
//
//   register(username, password) -> { token, user }
//   login(username, password)    -> { token, user }
//   logout()                     -> null (204, token revoked server-side)
//   getCurrentUser()             -> { user }
//
// Every one of them throws ApiError on failure — including 401 unauthenticated,
// which the session layer turns into "signed out".
import { get, post } from "./client.js";

export const register = (username, password) => post("/register", { username, password });

export const login = (username, password) => post("/login", { username, password });

export const logout = () => post("/logout");

export const getCurrentUser = () => get("/me");
