# Architecture

How the website, the future backend and the future mobile app fit together — and
the rules that hold no matter which phase we're in.

## Today (after Phase 0)

```text
components/  (UI only)
   ├── App.jsx ─────► data/useAuth.js ──► data/auth.js ─┐
   │                    (React binding)   (rules, hash,  │
   │                                       session)      │
   └── SetDetail.jsx ─► data/db.js (sync, userId-scoped) ┤
                                                          ▼
                                              data/storage.js  (only localStorage access)
                                                          │
                                    flashcardApp:data { sets, cards }
                                    flashcardApp:auth { users, sessionUserId }
```

Only **two component files** touch data (`App.jsx` for sets, `SetDetail.jsx` for
cards); everything else is presentational. That small seam is what makes the
move to an API tractable.

`db.js` is **synchronous** today, and `auth.js` is already async (hashing). Only
`App.handleRegister` and `AuthScreen.handleSubmit` are async in the UI.

## Target

```text
       WEBSITE (React + Vite)                 MOBILE APP (React Native + Expo)
  components → data/{auth,db} façade      screens → lib/api client
                    │                                     │
                    ▼                                     │
              api/client.js  (fetch + bearer token)        │
                    │                                     │
                    └───────────────┬─────────────────────┘
                                    │  HTTPS + Bearer token
                                    ▼
                          BACKEND API (Laravel or Express)
                     register / login / logout / me
                     bcrypt | argon2id hashing
                     token → user_id, ownership per route
                                    │
                                    ▼
                     DATABASE (MySQL): users / sets / cards
                            single source of truth
```

`localStorage` becomes a **legacy read + migration source only**. It is never
deleted, so it doubles as the rollback path.

## Rules that must always hold

1. **The database is the only source of truth.** No client-to-client sharing, no
   separate mobile database.
2. **Ownership is checked server-side on every request.** The server derives the
   user from the token and never trusts a client-supplied owner.
3. **Foreign ids look non-existent, not forbidden** — `404`, never `403`. This
   mirrors today's `db.js`, which returns `null` / `false` / `[]` for another
   user's data.
4. **Passwords are only ever hashed on the server** (bcrypt/argon2id). Clients
   send the plaintext password over HTTPS and never store a hash. The current
   client-side `SHA-256(salt + password)` is retired with the backend, which is
   why existing passwords must be re-entered once (see `migration.md`).
5. **One stable client seam.** Components keep calling `data/db.js` and
   `data/auth.js`; those become thin façades over `api/*`. UI imports don't change.
6. **Pure logic lives in `shared/`** so the website and the mobile app cannot
   drift apart (`generateQuiz`, `parseFlashcardImport`, the validation rules).

## The client seam and the `dataMode` switch

`data/db.js` and `data/auth.js` keep their exported function names
(`getSets`, `createSet`, `updateCard`, `setCardLearningStatus`, `register`,
`login`, `logout`, `getCurrentUser`, validators …) so no component import
changes. Inside, a single switch decides where data comes from:

```js
// src/data/config.js — added in Phase 5, still switched off
export const dataMode = "local";        // "local" | "api"
```

Phase 5 landed this layer and left it off. `src/api/client.js` centralises the
HTTP concerns (fetch, bearer token, one error shape), and `api/authApi.js` /
`api/flashcardApi.js` mirror `data/auth.js` and `data/db.js` name for name, so
flipping the switch is a one-line change per screen rather than a rewrite.
`data/storage.js` gained `loadToken` / `saveToken` / `clearToken` for the bearer
token, kept in its own `flashcardApp:token` key so it can never be confused with
the local account blob.

Because nothing imports `src/api/*` yet, the built website bundle is byte-for-byte
what it was before — verified by comparing the build's asset hashes. In development
the Vite server proxies `/api` to the Laravel server on `127.0.0.1:8001`, and
`VITE_API_URL` can point at a deployed API instead.

Two deliberate signature changes when `dataMode === "api"`:

- **`userId` arguments are dropped.** The token identifies the user; an owner
  parameter that is silently ignored would be a trap for future bugs. Phase 7
  updates the ~10 call sites in `App.jsx` / `SetDetail.jsx`.
- **`register()` no longer reports `adoptedSets`.** Local-set adoption becomes
  the explicit, one-time migration in Phase 8, so `App.jsx`'s adoption notice
  moves to the importer.

Also note: once `db.js` talks HTTP it becomes async, so `App.jsx` and
`SetDetail.jsx` need `await` plus loading/error states and a stale-response
guard. That is the largest single change in the migration, and it happens once,
in Phase 7.

## Repository layout

```text
flashcard-app/                 ← current repo; the website stays at the root
├── index.html, vite.config.js, package.json, src/     (website — unchanged tooling)
├── docs/                       ← this folder (plan of record)
├── backend/                    Phase 2+  Laravel or Express API (own deps)
├── mobile/                     Phase 10+ Expo app (own deps, own node_modules)
├── shared/                     Phase 10+ pure logic used by both clients
│   ├── generateQuiz.js
│   ├── parseFlashcardImport.js
│   └── validation.js           username/password/login rules lifted from data/auth.js
└── backups/                    local JSON dumps of browser data (git-ignored)
```

Each app keeps its own `package.json`; no npm workspaces at first. The website
reaches `shared/` through a Vite alias, the Expo app through
`metro.config.js` `watchFolders` — and if Metro objects, copy the two tiny
util files into `mobile/lib/` instead of adding a monorepo tool.

## Reuse map

| Asset | Web | Mobile | Notes |
| --- | --- | --- | --- |
| `utils/generateQuiz.js` | ✅ | ✅ **verbatim** | pure: `Math.random`, arrays, object lookups |
| `utils/parseFlashcardImport.js` | ✅ | ✅ **verbatim** | pure string parsing; an RN multiline `TextInput` gives the same input |
| `validateUsername/Password/Login/Registration` | ✅ | ✅ | pure; lifts into `shared/validation.js` |
| `db.js` function set | ✅ | ✅ | becomes the API contract 1:1 |
| ownership model (sets own cards) | ✅ | ✅ | same tables, same rules |
| design tokens (`index.css`) | ✅ | ⚠️ re-expressed | becomes one JS theme object; the CSS itself is not portable |
| JSX + CSS components | ✅ | ❌ | rewritten with RN primitives |
| `useFullscreen` / Fullscreen API | ✅ | ❌ | no mobile equivalent — no ⛶ on mobile |
| `window.confirm` | ✅ | ❌ | `Alert.alert` on RN |
| `crypto.*` hashing + UUIDs | ⚠️ retired | ❌ | moves to the server |

## Related documents

- [`database.md`](./database.md) — tables, indexes and ownership queries
- [`api.md`](./api.md) — endpoints, payloads, error shapes
- [`migration.md`](./migration.md) — back up localStorage, then move it to the backend
- [`roadmap.md`](./roadmap.md) — the phases and where we are
