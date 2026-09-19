// Data access layer: every read/write to flashcard sets and
// flashcards goes through these functions. Nothing outside this
// file should call loadState/saveState directly.

import { loadState, saveState } from "./storage";

function newId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

// ---------- Flashcard Sets ----------

export function getSets() {
  const { sets } = loadState();
  return sets;
}

export function getSet(setId) {
  const { sets } = loadState();
  return sets.find((s) => s.id === setId) || null;
}

export function createSet({ title, description = "" }) {
  const state = loadState();
  const timestamp = now();
  const set = {
    id: newId(),
    title,
    description,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.sets.push(set);
  saveState(state);
  return set;
}

export function updateSet(setId, updates) {
  const state = loadState();
  const index = state.sets.findIndex((s) => s.id === setId);
  if (index === -1) return null;

  state.sets[index] = {
    ...state.sets[index],
    ...updates,
    updatedAt: now(),
  };
  saveState(state);
  return state.sets[index];
}

export function deleteSet(setId) {
  const state = loadState();
  state.sets = state.sets.filter((s) => s.id !== setId);
  // Cascade: remove every card that belonged to this set.
  state.cards = state.cards.filter((c) => c.setId !== setId);
  saveState(state);
}

// ---------- Flashcards ----------

export function getCardsBySet(setId) {
  const { cards } = loadState();
  return cards.filter((c) => c.setId === setId);
}

export function getCard(cardId) {
  const { cards } = loadState();
  return cards.find((c) => c.id === cardId) || null;
}

export function createCard({ setId, term, definition }) {
  const state = loadState();
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

export function updateCard(cardId, updates) {
  const state = loadState();
  const index = state.cards.findIndex((c) => c.id === cardId);
  if (index === -1) return null;

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
export function setCardLearningStatus(cardId, learningStatus) {
  return updateCard(cardId, { learningStatus });
}

export function deleteCard(cardId) {
  const state = loadState();
  state.cards = state.cards.filter((c) => c.id !== cardId);
  saveState(state);
}

// Bulk insert, used by the TAB-import feature in Part 5.
export function createCards(setId, items) {
  const state = loadState();
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
