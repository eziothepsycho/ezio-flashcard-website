# cards API (backend)

Laravel 12 API for the cards. flashcard app. The website and the future mobile app
both talk to this, so it is the single source of truth for accounts, sets and
cards.

- API contract: [`../docs/api.md`](../docs/api.md)
- Database schema: [`../docs/database.md`](../docs/database.md)
- Phases and status: [`../docs/roadmap.md`](../docs/roadmap.md)

## What exists so far (Phases 2-3)

| Piece | Detail |
| --- | --- |
| Routes | `GET /api/health`, `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me` |
| Migrations | `users`, `sets`, `cards`, `personal_access_tokens` |
| Models | `User`, `Set`, `Card` — UUID keys via the `HasUuidKey` trait |
| Auth | Sanctum bearer tokens (30 days, revoked on logout), bcrypt hashes, throttled endpoints |

Sets and cards arrive in Phase 4.

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
