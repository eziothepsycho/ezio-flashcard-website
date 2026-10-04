// Where the local stack is assembled for the app: expo-sqlite for the database,
// expo-crypto for collision-free ids, and the existing API client for pushing.
//
// Everything below this file takes its dependencies as arguments, which is how the
// Phase H check drives the same schema, mirror, outbox, engine and repositories
// through Node's own SQLite — no device needed to prove the rules.
import * as Crypto from "expo-crypto";

import * as flashcardApi from "../api/flashcardApi.js";
import { describeError } from "../api/client.js";
import { openDatabase } from "../db/database.js";
import { createMirror } from "../db/mirror.js";
import { createOutbox } from "../db/outbox.js";
import { createCardsRepository } from "../data/localCards.js";
import { createSetsRepository } from "../data/localSets.js";
import { createSyncEngine } from "../sync/syncEngine.js";

let stack = null;

/** The one local stack for the app, opened on first use. */
export function localStack() {
  if (!stack) {
    stack = (async () => {
      const db = await openDatabase();
      const mirror = createMirror(db);
      const outbox = createOutbox(db);
      const engine = createSyncEngine({
        mirror,
        outbox,
        api: flashcardApi,
        describe: (err, what) => describeError(err, what ?? "change"),
      });
      const newId = () => Crypto.randomUUID();

      return {
        db,
        engine,
        mirror,
        outbox,
        sets: createSetsRepository({ mirror, outbox, engine, newId }),
        cards: createCardsRepository({ mirror, outbox, engine, newId }),
      };
    })();
  }

  return stack;
}
