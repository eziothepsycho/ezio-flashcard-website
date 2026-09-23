# API

The contract both clients (website and mobile) will speak. Written before any
code, so the backend and the two apps can be built against one spec.

Base URL: `/api`. All requests and responses are JSON. The website's Vite dev
server proxies `/api` to the backend, so there is no CORS juggling in dev.

## Conventions

- **Field names are camelCase**, matching today's browser objects exactly
  (`userId`, `learningStatus`, `createdAt`, `updatedAt`). This is deliberate: no
  UI component ever needs a field rename.
- **Ids** are UUID v4 strings. The server generates them; if a client supplies
  one (needed for migration), the server keeps it.
- **Timestamps** are ISO-8601 UTC with milliseconds and `Z`
  (`2026-01-31T12:00:00.000Z`) — the same format `new Date().toISOString()`
  produces today, so `new Date(value)` keeps working everywhere.
- **Auth** is `Authorization: Bearer <token>` on every route except
  `POST /register` and `POST /login`.
- **Ownership**: a set or card belonging to somebody else returns **404**, never
  403 — identical to today, where the data layer simply cannot see it.
- **Errors** always look like:
  ```json
  { "error": { "code": "invalid_credentials", "message": "Invalid username or password." } }
  ```
  Validation failures add per-field messages the forms can render next to the
  input, reusing the existing `AuthScreen` field-error UI:
  ```json
  { "error": { "code": "validation_failed", "message": "Please check the highlighted fields.",
               "fields": { "username": "That username is already taken." } } }
  ```
- Status codes: `200`/`201`/`204` success, `401` not signed in, `404` missing or
  not yours, `409` stale write, `422` validation, `429` throttled.

## Accounts

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/api/register` | `{username, password}` | `201 {token, user:{id, username, createdAt}}` |
| POST | `/api/login` | `{username, password}` | `200 {token, user:{…}}` |
| POST | `/api/logout` | — | `204` (token revoked) |
| GET | `/api/me` | — | `200 {user:{…}}` or `401` |

Rules carried over unchanged: username 3–20 chars of `[A-Za-z0-9_]`, unique
case-insensitively, stored trimmed as typed; password at least 4 characters and
never trimmed; **one identical message for unknown-user and wrong-password**;
`register` signs you in by returning a token, exactly like today.

Throttling: login `5/min` per username+IP, register `3/hour` per IP — both answer
`429` in the standard error envelope **with** a `Retry-After` header.

### Implemented in Phase 3 — and verified

All four routes are live under `backend/`: Sanctum personal access tokens,
bcrypt hashing, `auth:sanctum` on the protected routes. Tokens expire after
**30 days** (`config/sanctum.php`), and logging out deletes only the token that
made the request, so another device stays signed in. Checked over real HTTP:

| Check | Result |
| --- | --- |
| `register` | `201` + token; user shape is exactly `{id, username, createdAt}`; no hash in the response |
| duplicate username | `422` with `fields.username` = "That username is already taken." (case-insensitive) |
| username/password rules | `422` with the same wording the website uses, for empty, too short and illegal characters |
| wrong password vs unknown user | **byte-identical** `401` `invalid_credentials` bodies — no account enumeration |
| `login` | case-insensitive; `200` + token |
| `GET /me` | `200` with the right account; `401` with no token or a made-up one |
| `logout` | `204`, and the same token afterwards returns `401` (revocation proven through the database) |
| login throttling | five attempts pass, the sixth within a minute → `429` + `Retry-After` |
| register throttling | three registrations pass, the fourth within an hour → `429` |
| UUID keys | tokens carry a `char(36)` `tokenable_id` — Sanctum's stock numeric morph column was switched to `uuidMorphs()` |

If a limit gets in the way while developing, `php artisan cache:clear` resets the
counters (they live in the cache, not the database).

## Sets

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/sets` | — | `200 [set]` — only mine, `ORDER BY created_at, id` (oldest first, matching today's array order) |
| POST | `/api/sets` | `{title, description?, id?, createdAt?, updatedAt?}` | `201 set` |
| GET | `/api/sets/{id}` | — | `200 set` or `404` |
| PATCH | `/api/sets/{id}` | `{title?, description?}` | `200 set` (`updatedAt` refreshed server-side) |
| DELETE | `/api/sets/{id}` | — | `204` — cards removed by the FK cascade |

```json
// set
{ "id": "6f1c…", "userId": "89be…", "title": "JavaScript", "description": "notes",
  "createdAt": "2026-01-31T12:00:00.000Z", "updatedAt": "2026-01-31T12:00:00.000Z" }
```

## Cards

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/sets/{id}/cards` | — | `200 [card]` or `404` if the set isn't mine |
| POST | `/api/sets/{id}/cards` | `{term, definition, id?}` | `201 card` |
| POST | `/api/sets/{id}/cards/bulk` | `{cards:[{term, definition}]}` | `201 [card]` — the TAB-import path; the client keeps using `parseFlashcardImport` and posts the parsed rows |
| PATCH | `/api/cards/{id}` | `{term?, definition?, learningStatus?}` | `200 card` |
| DELETE | `/api/cards/{id}` | — | `204` |

```json
// card — learningStatus is absent/null until the card has been graded
{ "id": "b2a7…", "setId": "6f1c…", "term": "let", "definition": "block scope",
  "learningStatus": "known",
  "createdAt": "2026-01-31T12:00:00.000Z", "updatedAt": "2026-01-31T12:00:00.000Z" }
```

`PATCH /api/cards/{id}` with `{learningStatus: "known" | "learning"}` is what
Study Mode's grading uses, replacing `setCardLearningStatus`.

## Migration

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/api/import` | `{sets:[{id,title,description,createdAt,updatedAt,cards:[…]}]}` | `200 {importedSets, importedCards, skipped}` |

One transactional call. `user_id` always comes from the token, never the
payload; ids and timestamps are preserved. Steps and safety rails are in
[`migration.md`](./migration.md).

**Implemented in Phase 8.** The endpoint is live and idempotent:

- ids are checked across the whole table, so an import can never take over a set
  that already exists (whether it is another account's or the same account's) —
  those items are counted in `skipped` (a set counts 1 plus its cards);
- `createdAt` / `updatedAt` are kept when supplied, so nothing looks different
  after the move, and a card with no `learningStatus` stays ungraded;
- validation answers `422` with the field map (`sets.0.id`, `sets.0.title`, …),
  and the route needs a token like every other account route;
- verified by `backend/tests/Feature/ImportTest.php` (7 tests) and a live run
  that migrated a browser's sets, cards and grades, then proved the local copy
  was byte-for-byte unchanged.

### Implemented in Phase 4 — and verified

Every set and card route is live, scoped to the token's user through the model
relations (`$request->user()->sets()->findOrFail($id)`,
`$request->user()->cards()->findOrFail($id)`), so another account's id is a plain
`404`. Responses go through `SetResource` / `CardResource`, which define the
camelCase shapes above; `JsonResource::withoutWrapping()` keeps them unwrapped.

Checked by the permanent test suite (`backend/tests/Feature/FlashcardApiTest.php`)
and by a live run against the dev server and database:

| Check | Result |
| --- | --- |
| set shape | `{id, userId, title, description, createdAt, updatedAt}`, UUID id, ISO-8601 `Z` timestamps |
| ordering | oldest first; ties are broken by id, so records created in the same millisecond can fall back to id order |
| set CRUD | `201` create, `200` read, `200` update with a refreshed `updatedAt`, `204` delete |
| trim rules | blank title → `422` "Give the set a title."; `"  Biology  "` is stored as `Biology` |
| card CRUD | `201` create, list, `200` patch, `204` delete; `learningStatus` starts `null`, accepts `known`/`learning`, and `null` clears it again |
| bulk import | `201` with the created cards; a row missing a side → `422`; an empty import → `422` "No flashcards to import." |
| cascade | deleting a set removes its cards (proven through the API and by counting rows) |
| ownership matrix | nine cross-account attempts — read, patch, delete, list cards, add card, bulk import, edit card, grade card, delete card — all `404 not_found`, with the owner's set, cards and grade provably unchanged |
| unknown/malformed ids | `404` (never a `500`), for a random UUID and for a non-UUID string alike |
| import fields | a client-supplied `id`, `createdAt` and `updatedAt` are kept, so the Phase 8 migration can preserve what the browser already has |
| unauthenticated | every set and card route answers `401 unauthenticated` without a token |

## Client integration (website)

```text
components/                      (no import changes at any point)
    ↓
data/db.js  ·  data/auth.js       façade: dataMode "local" | "api"
    ↓
api/client.js                     base URL, bearer token, JSON, timeouts, 401 handling
api/authApi.js  api/flashcardApi.js
    ↓
Backend API
```

| Today (`data/db.js` / `data/auth.js`) | Becomes |
| --- | --- |
| `getSets(userId)` | `GET /sets` |
| `createSet({userId, title, description})` | `POST /sets` |
| `updateSet(setId, userId, updates)` | `PATCH /sets/{id}` |
| `deleteSet(setId, userId)` | `DELETE /sets/{id}` |
| `getCardsBySet(setId, userId)` | `GET /sets/{id}/cards` |
| `createCard({setId, userId, term, definition})` | `POST /sets/{id}/cards` |
| `createCards(setId, userId, items)` | `POST /sets/{id}/cards/bulk` |
| `updateCard(cardId, userId, updates)` | `PATCH /cards/{id}` |
| `setCardLearningStatus(cardId, userId, status)` | `PATCH /cards/{id}` with `{learningStatus}` |
| `deleteCard(cardId, userId)` | `DELETE /cards/{id}` |
| `register(username, password)` | `POST /register` |
| `login(username, password)` | `POST /login` |
| `logout()` | `POST /logout` |
| `getCurrentUser()` | `GET /me` |

Notes for Phases 5–7:

- The `userId` argument disappears — the token decides. Everything else about the
  return shape stays the same, except that **all of these become async**.
- `result.ok === false` keeps carrying `result.error`, so the existing error UI
  (form-level and per-field) keeps working unchanged.
- `getCurrentUser()` becomes a request, so `App.jsx` needs a short "restoring
  session" state instead of today's synchronous read — otherwise a refresh would
  flash the login screen.
- The `dataMode` switch lets the website keep running on `localStorage` until the
  API path is verified, screen by screen.

The layer itself exists as of Phase 5 — `src/api/client.js`, `api/authApi.js`,
`api/flashcardApi.js` — with `dataMode` still `"local"`, so the live site is
unaffected. In development `vite.config.js` proxies `/api` to the Laravel server on
`127.0.0.1:8001`; `VITE_API_URL` points the client at a deployed API instead. Every
failure reaches the UI as `{ ok: false, error, code, fields }`, where `code` and
`fields` come straight from the envelope above, so screens keep the error handling
they already have.

Website **accounts** use that layer as of Phase 6: `data/authBackend.js` chooses
between `data/auth.js` and `api/authApi.js` from `dataMode`, so sign-in, sign-out
and session restore all hit these same routes with `VITE_DATA_MODE=api` — the exact
requests the mobile app will make.

Phase 7 moved **sets and cards** across the same way, through
`data/flashcardBackend.js`. Those calls are now promises in both modes, so a screen
awaits them and then renders; failures arrive as thrown `ApiError`s carrying
`status`, `code` and `fields` from the envelope above, which the screens show either
in their error banner or under the matching input. Local mode still answers during
the first render, so it never shows a loading step.

## Open questions to settle in Phase 2

- Laravel Sanctum tokens vs Express JWT — the contract above is identical either way.
- Token lifetime (suggest 30 days for a fun app, revoked on logout).
- Whether `GET /sets` should support `?updatedSince=` from day one (cheap for
  incremental mobile refresh; can be added later without breaking anything).
- Web token storage: `localStorage` (matches today) vs an httpOnly cookie (safer,
  more setup). Mobile always uses `expo-secure-store`.
