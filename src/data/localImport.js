// Bringing the sets a browser already holds into a backend account
// (docs/migration.md). Nothing here deletes anything: the local data stays
// exactly as it is, so local mode keeps working and the migration can be undone
// by clearing one marker.

import { LEGACY_USER_ID } from "./db";
import {
  loadAuth,
  loadMigrationMark,
  loadState,
  saveMigrationMark,
} from "./storage";

/**
 * What could come across for the account that is signed in:
 *
 *   mine      sets owned by the local account with this username
 *   unclaimed sets with no owner at all (saved before accounts existed)
 *   others    sets belonging to a different local account on this device
 *
 * Only `mine` and `unclaimed` are offered, which mirrors the rule the browser
 * has always used for claiming pre-account sets.
 */
export function planImport(username) {
  const { sets, cards } = loadState();
  const { users } = loadAuth();

  const lowered = String(username ?? "").trim().toLowerCase();
  const localUser =
    users.find((user) => user.usernameLower === lowered) ?? null;

  const mine = [];
  const unclaimed = [];
  const others = [];

  for (const set of sets) {
    if (!set.userId || set.userId === LEGACY_USER_ID) {
      unclaimed.push(set);
    } else if (localUser && set.userId === localUser.id) {
      mine.push(set);
    } else {
      others.push(set);
    }
  }

  const importable = [...mine, ...unclaimed];

  return {
    localUser,
    mine,
    unclaimed,
    others,
    importable: importable.length,
    cardCount: cards.filter((card) =>
      importable.some((set) => set.id === card.setId)
    ).length,
    alreadyImportedAt: loadMigrationMark(),
  };
}

/**
 * The request body for POST /api/import: ids and timestamps are kept exactly as
 * the browser saved them, so nothing looks different after the move.
 *
 * @param {ReturnType<typeof planImport>} plan
 */
export function buildImportPayload(plan) {
  const { cards } = loadState();
  const sets = [...plan.mine, ...plan.unclaimed];

  return {
    sets: sets.map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description ?? "",
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
      cards: cards
        .filter((card) => card.setId === set.id)
        .map((card) => ({
          id: card.id,
          term: card.term,
          definition: card.definition,
          // Absent locally means "not graded yet" — send nothing, not null.
          ...(card.learningStatus ? { learningStatus: card.learningStatus } : {}),
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        })),
    })),
  };
}

/** Remember that the offer has been taken, so it is not shown again. */
export function markImported() {
  saveMigrationMark(new Date().toISOString());
}