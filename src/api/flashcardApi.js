// Sets and cards over HTTP. The names and the shapes deliberately mirror
// data/db.js — including "learningStatus" and camelCase fields — so switching
// dataMode swaps the source of truth without any component changing.

import { del, get, patch, post } from "./client";

export const getSets = () => get("/sets");

export const getSet = (setId) => get(`/sets/${setId}`);

export const createSet = ({ title, description = "" }) =>
  post("/sets", { title, description });

export const updateSet = (setId, updates) => patch(`/sets/${setId}`, updates);

export const deleteSet = (setId) => del(`/sets/${setId}`);

export const getCardsBySet = (setId) => get(`/sets/${setId}/cards`);

export const createCard = ({ setId, term, definition }) =>
  post(`/sets/${setId}/cards`, { term, definition });

export const createCards = (setId, items) =>
  post(`/sets/${setId}/cards/bulk`, { cards: items });

export const updateCard = (cardId, updates) => patch(`/cards/${cardId}`, updates);

export const setCardLearningStatus = (cardId, learningStatus) =>
  patch(`/cards/${cardId}`, { learningStatus });

export const deleteCard = (cardId) => del(`/cards/${cardId}`);