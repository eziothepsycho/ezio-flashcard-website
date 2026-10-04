// Sets and cards over the existing API — the nine routes in docs/api.md, no
// more and no less. Names and shapes mirror the website's src/api/flashcardApi.js
// so the two clients keep speaking one contract.
//
// Two things worth knowing here (both from the Phase A findings):
//   * `cardsCount` is only present on the list, GET /sets. Single-set responses
//     (create/update) do not carry it, so the model treats it as optional.
//   * Timestamps are whole-second precision, so nothing compares them at
//     sub-second resolution.
//
// Every call throws ApiError (status, code, fields) and any 401 also reaches the
// session through the client's unauthorized handler, so a screen never has to
// handle "the token is gone" itself.
import { del, get, patch, post } from "./client.js";

/**
 * The API refuses more than 500 rows in one bulk call (docs/api.md), so the cap
 * lives here rather than in the screen: one number, next to the route it belongs
 * to, and the import preview can enforce it before sending anything.
 */
export const MAX_BULK_CARDS = 500;

/**
 * Splits parsed import rows into what will be sent and what must wait for a
 * second batch. Pure, so the rule can be checked without a device.
 *
 * @param {Array<{term: string, definition: string}>} rows
 */
export function capImportRows(rows) {
  return {
    send: rows.slice(0, MAX_BULK_CARDS),
    dropped: Math.max(0, rows.length - MAX_BULK_CARDS),
  };
}

export const getSets = () => get("/sets");

export const createSet = ({ title, description = "" }) =>
  post("/sets", { title, description });

export const updateSet = (setId, updates) => patch(`/sets/${setId}`, updates);

export const deleteSet = (setId) => del(`/sets/${setId}`);

export const getCardsBySet = (setId) => get(`/sets/${setId}/cards`);

export const createCard = ({ setId, id, term, definition }) =>
  post(`/sets/${setId}/cards`, id ? { id, term, definition } : { term, definition });

/** The TAB-import path: the client parses the pasted text, the API stores the rows. */
export const createCards = (setId, items) =>
  post(`/sets/${setId}/cards/bulk`, { cards: items });

/** Used for editing a card and grading it (`{learningStatus}`) in Phase H. */
export const updateCard = (cardId, updates) => patch(`/cards/${cardId}`, updates);

export const deleteCard = (cardId) => del(`/cards/${cardId}`);

/**
 * The retry-safe create path, and what the outbox uses for anything it has to
 * create: the server keeps the ids it is given and skips whatever it already
 * has, so replaying a queued create can never duplicate or collide (Phase A
 * findings F1 and F2).
 */
export const importSets = (payload) => post("/import", payload);
