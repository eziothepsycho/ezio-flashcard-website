// The one place that decides where sets and cards come from:
//
//   local -> data/db.js             localStorage, synchronous
//   api   -> api/flashcardApi.js    the Laravel backend, async
//
// Both are exposed here as promises, so every screen has a single shape to deal
// with: await the call, then handle the value or a thrown ApiError. Nothing in
// the UI knows which one answered.
//
// `userId` is still passed in: in local mode it is what scopes reads and writes to
// the signed-in account (there is no server to do it), while in API mode the token
// decides and the argument is simply ignored.

import * as api from "../api/flashcardApi";
import * as local from "./db";
import { dataMode } from "./config";

export const usingApi = dataMode === "api";

// Local mode can read during the first render, so a reload shows existing sets
// straight away with no loading step; the API cannot, so it starts empty.
export const getSetsNow = (userId) => (usingApi ? [] : local.getSets(userId));

export const getCardsBySetNow = (setId, userId) =>
  usingApi ? [] : local.getCardsBySet(setId, userId);

export const getSets = (userId) =>
  usingApi ? api.getSets() : Promise.resolve(local.getSets(userId));

export const createSet = ({ userId, title, description = "" }) =>
  usingApi
    ? api.createSet({ title, description })
    : Promise.resolve(local.createSet({ userId, title, description }));

export const updateSet = (setId, userId, updates) =>
  usingApi
    ? api.updateSet(setId, updates)
    : Promise.resolve(local.updateSet(setId, userId, updates));

export const deleteSet = (setId, userId) =>
  usingApi ? api.deleteSet(setId) : Promise.resolve(local.deleteSet(setId, userId));

export const getCardsBySet = (setId, userId) =>
  usingApi
    ? api.getCardsBySet(setId)
    : Promise.resolve(local.getCardsBySet(setId, userId));

export const createCard = ({ setId, userId, term, definition }) =>
  usingApi
    ? api.createCard({ setId, term, definition })
    : Promise.resolve(local.createCard({ setId, userId, term, definition }));

export const createCards = (setId, userId, items) =>
  usingApi
    ? api.createCards(setId, items)
    : Promise.resolve(local.createCards(setId, userId, items));

export const updateCard = (cardId, userId, updates) =>
  usingApi
    ? api.updateCard(cardId, updates)
    : Promise.resolve(local.updateCard(cardId, userId, updates));

export const setCardLearningStatus = (cardId, userId, learningStatus) =>
  usingApi
    ? api.setCardLearningStatus(cardId, learningStatus)
    : Promise.resolve(local.setCardLearningStatus(cardId, userId, learningStatus));

export const deleteCard = (cardId, userId) =>
  usingApi
    ? api.deleteCard(cardId)
    : Promise.resolve(local.deleteCard(cardId, userId));

/**
 * The one-shot migration (docs/migration.md) only makes sense in API mode: when
 * the data already lives in localStorage there is nothing to move.
 *
 * @param {{sets: Array<object>}} payload
 */
export const importSets = (payload) => {
  if (!usingApi) {
    throw new Error('Importing local data only applies when dataMode is "api".');
  }

  return api.importSets(payload);
};
