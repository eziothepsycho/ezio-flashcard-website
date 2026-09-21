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

Throttling: login `5/min` per username+IP, register `3/hour` per IP — tune later.

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

## Open questions to settle in Phase 2

- Laravel Sanctum tokens vs Express JWT — the contract above is identical either way.
- Token lifetime (suggest 30 days for a fun app, revoked on logout).
- Whether `GET /sets` should support `?updatedSince=` from day one (cheap for
  incremental mobile refresh; can be added later without breaking anything).
- Web token storage: `localStorage` (matches today) vs an httpOnly cookie (safer,
  more setup). Mobile always uses `expo-secure-store`.
