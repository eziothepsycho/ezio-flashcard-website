# cards API (backend)

Laravel 12 API for the cards. flashcard app. The website and the future mobile app
both talk to this, so it is the single source of truth for accounts, sets and
cards.

- API contract: [`../docs/api.md`](../docs/api.md)
- Database schema: [`../docs/database.md`](../docs/database.md)
- Phases and status: [`../docs/roadmap.md`](../docs/roadmap.md)

## What exists so far (Phases 2-8)

| Piece | Detail |
| --- | --- |
| Routes | `GET /api/health`; `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`; sets (`GET/POST /api/sets`, `GET/PATCH/DELETE /api/sets/{id}`); cards (`GET/POST /api/sets/{id}/cards`, `POST …/cards/bulk`, `PATCH/DELETE /api/cards/{id}`); `POST /api/import` |
| Migrations | `users`, `sets`, `cards`, `personal_access_tokens` |
| Models | `User`, `Set`, `Card` — UUID keys via the `HasUuidKey` trait |
| Auth | Sanctum bearer tokens (30 days, revoked on logout), bcrypt hashes, throttled endpoints |
| Migration | `POST /api/import` brings a browser's sets, cards and grades into the account, keeping ids and timestamps; anything already stored is skipped |

Everything the website needs is here; the mobile app will consume the same API.

## Running it locally

MySQL must be running first — XAMPP Control Panel → **MySQL → Start**, or from a
terminal:

```bat
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini
```

Stop it again with `C:\xampp\mysql\bin\mysqladmin.exe -u root shutdown`.

```bash
php artisan migrate            # first time only
php artisan serve --port=8001  # http://127.0.0.1:8001
```

Check it is alive:

```bash
curl http://127.0.0.1:8001/api/health
# {"status":"ok","database":"connected","time":"..."}
```

Local settings: database `flashcard_app` on `127.0.0.1:3306`, user `root`, empty
password. They live in `.env`, which is never committed.

## Tests

```bash
php artisan test
```

- `tests/Feature/AuthTest.php` — registration (including the validation wording and
  case-insensitive duplicates), login, invalid credentials, `/me`, logout
  revocation, token expiry, both throttles, and tokens belonging to their account.
- `tests/Feature/FlashcardApiTest.php` — set and card CRUD, bulk import, grading,
  the delete cascade, ordering, and the **ownership matrix** between two accounts.
- `tests/Feature/ImportTest.php` — the one-shot migration: ids, timestamps and
  grades preserved, repeats skipped, and another account unable to take over ids.

They run against a **separate MySQL database** — `flashcard_app_test`, set in
`phpunit.xml` — rather than SQLite, because case-insensitive usernames depend on
the real column collation. Create it once if it is missing:

```sql
CREATE DATABASE flashcard_app_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Each test refreshes the schema and runs inside a transaction, so your development
data is never touched. `tests/TestCase.php` overrides `withToken()` to forget the
resolved guards first: Laravel reuses one application instance across requests
inside a single test, and without that a second request would keep the first
token's user — making expiry and revocation look like they do not work.

## Development tips

- The rate limiters live in the cache, so `php artisan cache:clear` resets them —
  handy because 3 registrations an hour per address is easy to hit while testing.
- `APP_DEBUG=true` locally means errors come back with full stack traces. Set it
  to `false` in production so failures stay opaque.
- A quick manual smoke test once the server is running:
  `curl -X POST http://127.0.0.1:8001/api/register -H "Content-Type: application/json" -H "Accept: application/json" -d "{\"username\":\"mark\",\"password\":\"hunter2x\"}"`

## Things worth knowing

- **Ids are UUIDs**, so the models use `$keyType = 'string'` with
  `$incrementing = false` — there are no auto-increment columns.
- **An account is a username and a `password_hash`**: no email, phone or profile
  columns, and the hash is hidden from JSON.
- **Usernames are unique case-insensitively** thanks to the `utf8mb4_unicode_ci`
  collation, not a duplicated lowercase column.
- **Ownership is derived**: a card has no `user_id`, it inherits its owner from its
  set. Every query must be scoped to the authenticated user — the query patterns
  are in `docs/database.md`.
- **Deleting a set cascades to its cards** through `ON DELETE CASCADE`.
- `learning_status` is `null`, `"known"` or `"learning"` — null means the card has
  not been graded yet.
- **Passwords are hashed on the server only** (bcrypt). Clients send the plaintext
  over HTTPS and never store a hash.
- `database/seeders/DatabaseSeeder.php` deliberately seeds nothing: accounts are
  created through `POST /api/register`, so a fresh database has no known
  credentials.
