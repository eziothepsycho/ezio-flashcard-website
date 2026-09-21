// Data access layer: every read/write to flashcard sets and
// flashcards goes through these functions. Nothing outside this
// file should call loadState/saveState directly.
//
// Every function that touches user data takes a userId and refuses
// to return or change anything owned by someone else. That mirrors
// what a backend does (WHERE user_id = ?), so this whole layer can
// later be swapped for API calls without touching the UI.

import { loadState, saveState } from "./storage";

// Sets that were saved before the app had accounts carry this
// sentinel owner. No real account matches it, so they stay invisible
// until the first account on this device claims them.
export const LEGACY_USER_ID = "legacy-local-device";

function newId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

// Older saved data predates accounts, so any set without an owner is
// tagged here. Additive, idempotent, and safe to run on every read.
function loadOwnedState() {
  const state = loadState();
  let changed = false;
  const sets = state.sets.map((set) => {
    if (set.userId) return set;
    changed = true;
    return { ...set, userId: LEGACY_USER_ID };
  });
  if (!changed) return state;
  const owned = { sets, cards: state.cards };
  saveState(owned);
  return owned;
}

// Ownership check shared by every read and write below.
function ownsSet(state, setId, userId) {
  return state.sets.some((s) => s.id === setId && s.userId === userId);
}

// ---------- Flashcard Sets ----------

export function getSets(userId) {
  const { sets } = loadOwnedState();
  return sets.filter((s) => s.userId === userId);
}

export function getSet(setId, userId) {
  const { sets } = loadOwnedState();
  return sets.find((s) => s.id === setId && s.userId === userId) || null;
}

export function createSet({ userId, title, description = "" }) {
  const state = loadOwnedState();
  const timestamp = now();
  const set = {
    id: newId(),
    userId,
    title,
    description,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.sets.push(set);
  saveState(state);
  return set;
}

export function updateSet(setId, userId, updates) {
  const state = loadOwnedState();
  const index = state.sets.findIndex(
    (s) => s.id === setId && s.userId === userId
  );
  if (index === -1) return null;

  state.sets[index] = {
    ...state.sets[index],
    ...updates,
    updatedAt: now(),
  };
  saveState(state);
  return state.sets[index];
}

export function deleteSet(setId, userId) {
  const state = loadOwnedState();
  if (!ownsSet(state, setId, userId)) return false;
  state.sets = state.sets.filter((s) => s.id !== setId);
  // Cascade: remove every card that belonged to this set.
  state.cards = state.cards.filter((c) => c.setId !== setId);
  saveState(state);
  return true;
}

// ---------- Flashcards ----------

export function getCardsBySet(setId, userId) {
  const state = loadOwnedState();
  if (!ownsSet(state, setId, userId)) return [];
  return state.cards.filter((c) => c.setId === setId);
}

export function getCard(cardId, userId) {
  const state = loadOwnedState();
  const card = state.cards.find((c) => c.id === cardId);
  if (!card || !ownsSet(state, card.setId, userId)) return null;
  return card;
}

export function createCard({ setId, userId, term, definition }) {
  const state = loadOwnedState();
  if (!ownsSet(state, setId, userId)) return null;
  const timestamp = now();
  const card = {
    id: newId(),
    setId,
    term,
    definition,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.cards.push(card);
  saveState(state);
  return card;
}

export function updateCard(cardId, userId, updates) {
  const state = loadOwnedState();
  const index = state.cards.findIndex((c) => c.id === cardId);
  if (index === -1) return null;
  // A card belongs to whoever owns the set it sits in.
  if (!ownsSet(state, state.cards[index].setId, userId)) return null;

  state.cards[index] = {
    ...state.cards[index],
    ...updates,
    updatedAt: now(),
  };
  saveState(state);
  return state.cards[index];
}

// Study Mode stores a deliberately simple, persistent learning state.
// A missing value means the card has not been assessed yet.
export function setCardLearningStatus(cardId, userId, learningStatus) {
  return updateCard(cardId, userId, { learningStatus });
}

export function deleteCard(cardId, userId) {
  const state = loadOwnedState();
  const card = state.cards.find((c) => c.id === cardId);
  if (!card || !ownsSet(state, card.setId, userId)) return false;
  state.cards = state.cards.filter((c) => c.id !== cardId);
  saveState(state);
  return true;
}

// Bulk insert, used by the TAB-import feature in Part 5.
export function createCards(setId, userId, items) {
  const state = loadOwnedState();
  if (!ownsSet(state, setId, userId)) return [];
  const timestamp = now();
  const created = items.map(({ term, definition }) => ({
    id: newId(),
    setId,
    term,
    definition,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  state.cards.push(...created);
  saveState(state);
  return created;
}

// ---------- Data saved before accounts existed ----------

// Called when the first account on this device is created: sets that
// were saved before accounts existed become that account's sets.
// Nothing is deleted, and there is no owner to hand them to until
// that first account exists.
export function adoptUnclaimedSets(userId) {
  const state = loadOwnedState();
  let adopted = 0;
  state.sets = state.sets.map((set) => {
    if (set.userId !== LEGACY_USER_ID) return set;
    adopted += 1;
    return { ...set, userId };
  });
  if (adopted > 0) saveState(state);
  return adopted;
}
