// The local mirror's shape.
//
// Three tables. Reads come from here, writes go here first and are queued in the
// outbox, and the sync engine reconciles against the API — which stays the source
// of truth.
//
// There are deliberately no soft deletes: a queued operation in the outbox is
// what protects an intent that has not reached the server yet, so a local row can
// simply be removed.
//
// Timestamps are ISO-8601 strings, exactly as the API sends them (whole seconds,
// per the Phase A findings) or as the app writes them locally. Nothing here
// compares them at sub-second precision: reconciliation replaces rows instead.
export const SCHEMA_VERSION = 1;

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sets (
     id TEXT PRIMARY KEY NOT NULL,
     user_id TEXT NOT NULL,
     title TEXT NOT NULL,
     description TEXT NOT NULL DEFAULT '',
     cards_count INTEGER NOT NULL DEFAULT 0,
     cards_synced_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sets_user ON sets (user_id)`,
  `CREATE TABLE IF NOT EXISTS cards (
     id TEXT PRIMARY KEY NOT NULL,
     set_id TEXT NOT NULL,
     term TEXT NOT NULL,
     definition TEXT NOT NULL,
     learning_status TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_cards_set ON cards (set_id)`,
  `CREATE TABLE IF NOT EXISTS outbox (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL,
     entity TEXT NOT NULL,
     op TEXT NOT NULL,
     entity_id TEXT NOT NULL,
     set_id TEXT,
     payload TEXT NOT NULL,
     created_at TEXT NOT NULL,
     attempts INTEGER NOT NULL DEFAULT 0,
     last_error TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_user ON outbox (user_id, id)`,
];

/** Creates the tables and stamps the schema version. Safe on every launch. */
export async function migrate(db) {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.exec(statement);
  }

  await db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
