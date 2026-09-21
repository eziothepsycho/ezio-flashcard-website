// Account logic: users, validation, password hashing and the current
// session. Deliberately free of React and of the DOM — the UI only
// calls these functions, so the rules live in one place.
//
// The account functions are async and return a small result object
// ({ ok: true, ... } / { ok: false, error }) because that is the shape
// an HTTP API will have. When authentication moves to a backend, only
// the bodies in this file need to change.

import { loadAuth, saveAuth } from "./storage";
import { adoptUnclaimedSets } from "./db";

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const MIN_PASSWORD_LENGTH = 4;

// The same message whether the account is missing or the password is
// wrong, so the login form can't be used to list who has an account.
const LOGIN_ERROR = "Invalid username or password.";
// Web Crypto (crypto.subtle) only exists in a secure context
// (https or localhost), so hashing can be unavailable.
const UNAVAILABLE_ERROR = "Accounts aren't available in this browser.";

function newId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// A random per-user salt, so two people who pick the same password
// still end up with different hashes.
function makeSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

// Salting + SHA-256 keeps passwords out of plain sight, but this is
// NOT production-grade: SHA-256 is fast (cheap to brute-force offline)
// and the check happens on the client. A real backend must hash with
// argon2 or bcrypt instead.
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

async function safeHash(password, salt) {
  try {
    return await hashPassword(password, salt);
  } catch (err) {
    console.error("Password hashing failed:", err);
    return null;
  }
}

// Public shape of a user — the hash and salt never leave this module.
function toPublicUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

function findByUsername(users, username) {
  const wanted = username.toLowerCase();
  return users.find((u) => u.usernameLower === wanted) || null;
}

// ---------- Validation (used by the forms and by register below) ----------

export function validateUsername(username) {
  const trimmed = username.trim();
  if (!trimmed) return "Enter a username.";
  if (
    trimmed.length < MIN_USERNAME_LENGTH ||
    trimmed.length > MAX_USERNAME_LENGTH
  ) {
    return `Usernames need to be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Usernames can only use letters, numbers and underscores.";
  }
  return "";
}

export function validatePassword(password) {
  if (!password) return "Enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords need to be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return "";
}

export function validateRegistration({ username, password, confirmPassword }) {
  const usernameError = validateUsername(username);
  if (usernameError) return usernameError;
  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;
  if (password !== confirmPassword) return "Passwords don't match.";
  return "";
}

// Login only asks that both fields are filled in. The register rules
// (length, allowed characters) deliberately don't apply here — they would
// lock out an account created under older rules — and anything more
// specific would hint at which half of the credentials was wrong.
//
// Returns one message per field so an empty form can flag both at once.
export function validateLogin({ username, password }) {
  return {
    username: username.trim() ? "" : "Username is required.",
    // Passwords are never trimmed: leading or trailing spaces are part of
    // the password, so only emptiness is checked.
    password: password ? "" : "Password is required.",
  };
}

// ---------- Account lifecycle ----------

export async function register(username, password) {
  const trimmed = username.trim();
  const usernameError = validateUsername(trimmed);
  if (usernameError) return { ok: false, error: usernameError };
  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };

  const auth = loadAuth();
  if (findByUsername(auth.users, trimmed)) {
    return { ok: false, error: "That username is already taken." };
  }

  const salt = makeSalt();
  const passwordHash = await safeHash(password, salt);
  if (!passwordHash) return { ok: false, error: UNAVAILABLE_ERROR };

  const user = {
    id: newId(),
    username: trimmed,
    usernameLower: trimmed.toLowerCase(),
    passwordHash,
    salt,
    createdAt: now(),
  };

  const isFirstAccount = auth.users.length === 0;
  // Creating an account signs you in.
  saveAuth({ users: [...auth.users, user], sessionUserId: user.id });

  // The first account on this device inherits whatever was saved
  // before accounts existed (see LEGACY_USER_ID in db.js).
  const adoptedSets = isFirstAccount ? adoptUnclaimedSets(user.id) : 0;

  return { ok: true, user: toPublicUser(user), adoptedSets };
}

export async function login(username, password) {
  const trimmed = username.trim();
  if (!trimmed || !password) return { ok: false, error: LOGIN_ERROR };

  const auth = loadAuth();
  const user = findByUsername(auth.users, trimmed);
  if (!user) return { ok: false, error: LOGIN_ERROR };

  const passwordHash = await safeHash(password, user.salt);
  if (!passwordHash) return { ok: false, error: UNAVAILABLE_ERROR };
  if (passwordHash !== user.passwordHash) {
    return { ok: false, error: LOGIN_ERROR };
  }

  saveAuth({ ...auth, sessionUserId: user.id });
  return { ok: true, user: toPublicUser(user), adoptedSets: 0 };
}

// Calling this on a backend will also drop the session token.
export function logout() {
  const auth = loadAuth();
  saveAuth({ ...auth, sessionUserId: null });
}

// Read synchronously so a refresh can restore the session before the
// first render. (With a backend this becomes a /auth/me request plus a
// brief loading state in useAuth.)
export function getCurrentUser() {
  const auth = loadAuth();
  if (!auth.sessionUserId) return null;
  const user = auth.users.find((u) => u.id === auth.sessionUserId);
  if (!user) {
    // The session points at an account that no longer exists.
    saveAuth({ ...auth, sessionUserId: null });
    return null;
  }
  return toPublicUser(user);
}