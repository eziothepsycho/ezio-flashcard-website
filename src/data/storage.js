// Thin wrapper around localStorage so the rest of the app
// never touches JSON.parse/stringify directly.

// Flashcard content and accounts are kept in two separate keys on
// purpose: the flashcard data keeps the exact shape it has always
// had, and the local account data can be dropped in one step once a
// real backend takes over authentication.
const DATA_KEY = "flashcardApp:data";
const AUTH_KEY = "flashcardApp:auth";

// Shape of everything we persist. Sets and cards are kept as
// separate flat arrays (like two simple tables), linked by id.
const EMPTY_STATE = {
  sets: [],
  cards: [],
};

// Accounts and the current session. A user is only a username, a
// salted password hash and an id — no email, phone, name or profile.
const EMPTY_AUTH = {
  users: [],
  sessionUserId: null,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...fallback };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...fallback };
    return parsed;
  } catch (err) {
    // Corrupt or unreadable data shouldn't crash the app —
    // start fresh instead.
    console.error(`Failed to load saved data from "${key}", starting empty:`, err);
    return { ...fallback };
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadState() {
  const parsed = read(DATA_KEY, EMPTY_STATE);
  return {
    sets: Array.isArray(parsed.sets) ? parsed.sets : [],
    cards: Array.isArray(parsed.cards) ? parsed.cards : [],
  };
}

export function saveState(state) {
  write(DATA_KEY, { sets: state.sets, cards: state.cards });
}

export function loadAuth() {
  const parsed = read(AUTH_KEY, EMPTY_AUTH);
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessionUserId:
      typeof parsed.sessionUserId === "string" ? parsed.sessionUserId : null,
  };
}

export function saveAuth(state) {
  write(AUTH_KEY, {
    users: state.users,
    sessionUserId: state.sessionUserId ?? null,
  });
}

// The bearer token for the future API (Phase 5+). It lives in its own key so
// switching between local accounts and backend accounts never mixes the two,
// and so token cleanup cannot disturb the local account blob.
const TOKEN_KEY = "flashcardApp:token";

export function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch (err) {
    console.error("Failed to read the saved token:", err);
    return null;
  }
}

export function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error("Failed to save the token:", err);
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error("Failed to clear the token:", err);
  }
}

// When this browser's local data was last copied into a backend account
// (Phase 8). It is only a marker so the one-time offer is not shown again — the
// local data itself is never touched or deleted.
const MIGRATION_KEY = "flashcardApp:migratedAt";

export function loadMigrationMark() {
  try {
    return localStorage.getItem(MIGRATION_KEY) || null;
  } catch (err) {
    console.error("Failed to read the migration mark:", err);
    return null;
  }
}

export function saveMigrationMark(value) {
  try {
    localStorage.setItem(MIGRATION_KEY, value);
  } catch (err) {
    console.error("Failed to save the migration mark:", err);
  }
}