// The app's database handle.
//
// expo-sqlite is wrapped in the four calls the rest of the local layer uses, so
// the schema, mirror, outbox and sync engine contain no expo-specific code and
// can be driven by any SQLite implementation — which is how the Phase H check
// exercises them from Node.
import * as SQLite from "expo-sqlite";

import { migrate } from "./schema.js";

const DATABASE_NAME = "cards.db";

let opening = null;

/**
 * Opens (once) and migrates the database.
 *
 * @returns {Promise<{exec: Function, run: Function, get: Function, all: Function}>}
 */
export function openDatabase() {
  if (!opening) {
    opening = (async () => {
      const handle = await SQLite.openDatabaseAsync(DATABASE_NAME);

      const db = {
        exec: (sql) => handle.execAsync(sql),
        run: (sql, params = []) => handle.runAsync(sql, params),
        get: (sql, params = []) => handle.getFirstAsync(sql, params),
        all: (sql, params = []) => handle.getAllAsync(sql, params),
      };

      await migrate(db);
      return db;
    })();
  }

  return opening;
}
