# Phase A findings — decisions & API pre-flight

**Status:** Phase A complete. No application was created, no backend code was changed and no
website behaviour was touched. This document is the only file added to the repository.

**Date:** 2026-09-24 · **Base commit:** `2a44c9e` (working tree also holds the earlier
`src/components/QuizResults.{jsx,css}` review-split change — untouched by Phase A).

Phase A answers four questions, experimentally, against the live API:

1. What does normal set/card creation do when a client supplies an id that already exists?
2. Is `/api/import` genuinely retry-safe/idempotent for queued offline creates?
3. Does the existing contract cover everything the mobile client needs?
4. Is there any blocker that would stop the app using the existing backend?

## 1. Method

- Started the local stack by hand: XAMPP MariaDB (`mysqld --standalone`) and
  `php artisan serve --host=0.0.0.0 --port=8001` (Laravel 12.69.2, PHP 8.2.12).
- Ran a temporary HTTP probe (Node, outside the repository) against the live API on **two
  bases**: `http://127.0.0.1:8001/api` (loopback) and `http://192.168.254.105:8001/api` (the
  PC's LAN address — the path the phone will use).
- The probe used two throwaway accounts per base, created sets/cards with **client-supplied
  UUID ids**, deliberately repeated requests, attempted cross-account access, and deleted
  everything it created.
- A second, focused probe measured id/timestamp handling precisely (old, unmistakable dates).
- Both services were then stopped and the database was re-checked against its "before"
  snapshot.

**Result: 34 checks per base, all passing (68 total), plus 5 focused timestamp checks. Zero
blockers found.**

## 2. Environment used, and restored

| Item | Before Phase A | After Phase A |
| --- | --- | --- |
| MySQL | not running | not running (stopped with `mysqladmin shutdown`) |
| API on :8001 | not running | not running (processes stopped) |
| Database `flashcard_app` | 1 user (`test1`, id `a18f960e-…`), 0 sets, 0 cards, 0 tokens | **identical**: 1 user (`test1`, same id and `created_at`), 0 sets, 0 cards, 0 tokens |
| Probe data | — | probe users and their tokens deleted; 0 leftover `Phase A%` sets, 0 leftover probe cards |
| Repo working tree | 2 modified files (QuizResults) | the same 2 modified files, **plus this new document** (`docs/phase-a-findings.md`, untracked); nothing else added, changed or deleted |

## 3. Findings

### F1 — Duplicate client id on normal creation is an unhandled database error (500)

Verified twice each way:

```
POST /api/sets            {id: <already used>}  → 500
  {"message":"SQLSTATE[23000]: Integrity constraint violation: 1062
   Duplicate entry '2a0a7fad-…' for key 'PRIMARY' (Connection: mysql …)"}

POST /api/sets/{id}/cards {id: <already used>}  → 500  (same 1062 on `cards`)
```

- It is **not** part of the documented error envelope (no `error.code`), because nothing in
  `bootstrap/app.php` maps a `QueryException`. With `APP_DEBUG=true` the body carries a
  SQLSTATE message; in a non-debug environment it would be a generic 500.
- The failed request **changes nothing**: after the duplicate attempt `GET /sets` still showed
  exactly one set with the original title, and the set's card list still held exactly one card
  with the original text.
- `POST /sets` with **no** id still works normally (server-generated UUID), and a malformed id
  is rejected with `422` rather than trusted.

**Decision (already agreed): do not change `POST /sets` or `POST /sets/{id}/cards` in v1.**
The outbox must therefore never blind-retry a create, and queued offline creates go through
`POST /api/import` (F2). The client also treats "unknown outcome" as a reconcile
(`GET /sets`) rather than a re-POST.

### F2 — `/api/import` is retry-safe and idempotent, and cannot take anything over

| Check | Result |
| --- | --- |
| First send of a payload with a new set id + 2 card ids | `200 {importedSets: 1, importedCards: 2, skipped: 0}` |
| Byte-identical payload sent again | `200 {importedSets: 0, importedCards: 0, skipped: 3}` |
| After both sends | exactly one such set exists; no duplicate set or card |
| Payload whose **set id already exists**, with a different title/description | `200 {… skipped: 2}` — the stored set kept its original title and description |
| Payload trying to move an **existing card** into another set | skipped; the card kept its own `setId` and text |
| Payload carrying a `userId` for someone else | ignored — the set was created owned by the token's user |
| A **second account** importing an id it does not own | `200 {importedSets: 0, skipped: 1}`; the owner's data was unaffected |
| Supplied `createdAt`/`updatedAt`/`learningStatus` | kept (see F3) |

This is the retry-safe create path the offline outbox needs, and it is already transactional
(`ImportController` wraps everything in `DB::transaction`). No new endpoint is required.

### F3 — Timestamp behaviour (the one finding that changes a design detail)

| Route | Client-supplied `createdAt`/`updatedAt` | Observed |
| --- | --- | --- |
| `POST /sets` | accepted and **kept**, but **only to the second** | sent `2020-01-02T03:04:05.678Z` → returned `2020-01-02T03:04:05.000000Z` |
| `POST /sets/{id}/cards` | **ignored** (accepted silently, no `422`) | sent 2020 dates → returned the server's current time |
| `POST /import` (sets **and** cards) | accepted and **kept to the second** | 2020 set and card dates came back exactly, `learningStatus` included |
| `PATCH /cards/{id}` (grading) | `createdAt` unchanged, `updatedAt` refreshed server-side | confirmed |
| Any server-written timestamp | whole seconds, `.000000Z` | server-generated set/card/`updatedAt` values all came back with zero milliseconds |

Cause: the models use Laravel's default date format (`Y-m-d H:i:s`), so the `DATETIME(3)`
columns are always fed whole seconds — despite the column supporting milliseconds.

**Consequences for the sync manager (Phase J):**

- **Never compare `updatedAt` at sub-second precision.** Two changes in the same second are
  indistinguishable, so the rule is "the cached value differs from the server value →
  refresh", not "server is newer by > 0".
- A set's `updatedAt` is not a reliable trigger for "its cards changed"; the app should also
  refresh a set's cards when the set is opened and on pull-to-refresh.
### F4 — The existing contract covers the whole mobile client (nothing missing)

`php artisan route:list` matches `docs/api.md` exactly — 16 routes, no extras:

| Method | Path | Middleware | Confirmed behaviour (live) |
| --- | --- | --- | --- |
| GET | `/api/health` | api | `200 {"status":"ok","database":"connected"}` |
| POST | `/api/register` | `throttle:register` | `201 {token, user:{id, username, createdAt}}` — no hash |
| POST | `/api/login` | `throttle:login` | `200 {token, user}` (used by the probe on its second run) |
| POST | `/api/logout` | `auth:sanctum` | not exercised in Phase A (covered by `AuthTest`) |
| GET | `/api/me` | `auth:sanctum` | `200 {user}`; no token **and** a bogus token both → `401 unauthenticated` |
| GET | `/api/sets` | `auth:sanctum` | array, oldest first, keys `id,userId,title,description,createdAt,updatedAt`, ISO-8601 `…Z` |
| POST | `/api/sets` | `auth:sanctum` | `201` set; accepts client `id`/`createdAt`/`updatedAt`; blank title → `422` + `fields.title` |
| GET | `/api/sets/{id}` | `auth:sanctum` | `200` set; unknown **and** malformed ids → `404 not_found`, never `500` |
| PATCH | `/api/sets/{id}` | `auth:sanctum` | `updatedAt` refreshed server-side |
| DELETE | `/api/sets/{id}` | `auth:sanctum` | `204`, then the set's card list answers `404` (cascade) |
| GET | `/api/sets/{id}/cards` | `auth:sanctum` | array of cards, `learningStatus` `null` until graded |
| POST | `/api/sets/{id}/cards` | `auth:sanctum` | `201` card; accepts a client `id`; ignores client timestamps |
| POST | `/api/sets/{id}/cards/bulk` | `auth:sanctum` | not probed — the app defers bulk import (Phase G/later) |
| PATCH | `/api/cards/{id}` | `auth:sanctum` | `{learningStatus}` only → `200`, `term`/`definition` untouched |
| DELETE | `/api/cards/{id}` | `auth:sanctum` | `204`, and a repeat → `404 not_found` (a queued delete can treat 404 as done) |
| POST | `/api/import` | `auth:sanctum` | retry-safe creates (F2) |

Confirmed absences (all as designed for v1): **no** quiz/attempt endpoints, **no**
`/sync`, `/changes` or delta endpoint, **no** `cardsCount` in `GET /sets` (`updatedSince`,
`page` and `limit` query parameters are accepted and ignored — no cursor, no pagination).

Ownership isolation, re-verified live with a second account — every attempt answers
`404 not_found` and the owner's data is untouched afterwards:

| Attempt by account B on account A's data | Result |
| --- | --- |
| `GET /sets` | `200 []` — A's sets are not listed |
| `GET` / `PATCH` / `DELETE /sets/{A's id}` | `404` / `404` / `404` |
| `GET /sets/{A's id}/cards`, `POST` a card into it | `404` / `404` |
| `PATCH` / `DELETE /cards/{A's card id}` | `404` / `404` |
| `POST /import` with A's set id | `200`, `skipped: 1`, no takeover |

### F5 — The API is reachable over the LAN (the phone's path)

The full probe also passed against `http://192.168.254.105:8001/api` — the PC's LAN address —
which required starting the server as:

```powershell
php artisan serve --host=0.0.0.0 --port=8001
```

`0.0.0.0:8001` was confirmed listening. The site's Vite proxy (`/api` → `127.0.0.1:8001`) is
irrelevant to the app; the app talks to the API host directly.

### F6 — Windows Firewall will block the phone until a rule is added

Verified state on this machine:

| Check | Observed |
| --- | --- |
| Firewall profiles | **Domain, Private and Public all enabled** |
| Default inbound action | `NotConfigured` (i.e. inbound is blocked unless a rule allows it) |
| Existing inbound allow rules matching php/laravel/vite/node | only `node.exe` (Public profile) — **none for `php.exe` or port 8001** |

So a phone on the same Wi-Fi will most likely time out until an inbound rule exists for the
Laravel dev server. This is a documented prerequisite, not an API problem — Phase D/K will
record it, including the check:

```powershell
Get-NetFirewallRule -Direction Inbound -Action Allow -Enabled True |
  Where-Object { $_.DisplayName -match 'php|8001' }
```

and (run as administrator, once) an allow rule for TCP 8001 on the Private profile.

### F7 — Rate limits behave as documented (and were worked around, not changed)

- `register`: 3 per hour **per IP**. Note that the PC's LAN address and loopback are separate
  buckets, so probing over both stayed inside the limit.
- `login`: 5 per minute per username+IP.
- Resetting the counters during development is `php artisan cache:clear`, exactly as
  `README.md` says; that was used once.
- Consequence for the app: registration failures must surface the `429` envelope and back off;
  nothing else needs rate-limit handling.

### F8 — Blockers: none

| Question | Answer |
| --- | --- |
| Can the app authenticate with the same account? | Yes — `register`/`login`/`logout`/`me`, bcrypt server-side, per-device tokens, `401` envelope for bad/expired tokens. |
| Can it read and write sets and cards as the owner? | Yes — CRUD + bulk + grading all verified, user-scoped, `404` for anything foreign. |
| Can it detect deletions? | Yes, with full reconciliation: a set absent from `GET /sets` is deleted locally. No tombstones needed. |
| Can it sync safely after an offline create? | Yes — `/api/import` is transactional and idempotent (F2). |
| Are there blockers? | **None.** The three constraints to design around are: never blind-retry a create (F1), compare timestamps at second precision (F3), and open the firewall for LAN testing (F6). |

## 4. Decisions recorded (from the agreed list, with Phase A evidence)

| # | Decision | Phase A evidence / consequence |
| --- | --- | --- |
| 1 | Offline writes: **yes**, via an outbox; the app's store is a mirror, never the source of truth | `/api/import` is the retry-safe create path (F2); `DELETE` is idempotent in effect (204 → 404) (F4) |
| 2 | Quiz history: **no** for v1 — quizzes stay ephemeral | Confirmed no quiz tables/endpoints exist, and none will be added |
| 3 | Conflicts: **server-authoritative last-write-wins**, push dirty records before pulling; no `409`, no versions | `PATCH` overwrites the fields it is given and always refreshes `updatedAt` server-side; server time is the ordering authority |
| 4 | `learningStatus` stays card-level and shared; last writer wins; documented, not redesigned | `PATCH {learningStatus}` verified; no schema change |
| 5 | Deletion detection: **full reconciliation**, no tombstones/`/sync`/cursors | `GET /sets` returns the complete list (`updatedSince`/`page`/`limit` ignored) — absence is the deletion signal |
| 6 | **`cardsCount` on `GET /sets`** in Phase B, backwards compatible | Confirmed absent today; the website ignores unknown fields, so adding it cannot break the website |
| 7 | Retry-safe creates via **`/api/import`**; leave `POST /sets` / `POST /sets/{id}/cards` duplicate-id behaviour alone | F1 (500, unhandled) and F2 (import is idempotent, no takeover) |
| 8 | **No** general API throttling; keep login/register limits; fix the `/api/import` throttling sentence in the docs later | Only `throttle:login` and `throttle:register` exist (route list); data routes are unthrottled |
| 9 | Vitest for pure sync/outbox logic; no RN UI test framework | Not applicable yet (no app exists) |
| 10 | Extract pure logic into `shared/`; preserve website behaviour with thin re-exports | Not started (Phase C) |
| 11 | Real Android phone + Expo Go on the same LAN; emulator documented as an alternative | LAN base verified (`192.168.254.105`) and the firewall gap identified (F5, F6) |
| 12 | **No** background sync in v1 | Not applicable yet |
| 13 | React Native + Expo, JavaScript, `expo-secure-store`, `expo-sqlite`, React Navigation, `mobile/` + `shared/` | Not started (Phases C/D) |
| 14 | Backend is the single source of truth; both clients talk only to it | Probes confirmed the app needs nothing but the API |
| 15 | Website keeps `local` default, `api` opt-in; nothing deleted or migrated | Phase A changed no website file and no localStorage key |
| 16 | No deployment of any kind | Nothing hosted, nothing published |

## 5. Phase B preview (for approval — not started)

Per the safety rule, each intended change is listed with its file, reason, content and whether
it is required or optional.

| File | Why it must change | What will change | Required? |
| --- | --- | --- | --- |
| `backend/app/Http/Resources/SetResource.php` | Decision #6: the app's dashboard needs a card count without N+1 requests | **Add** one line: `'cardsCount' => $this->whenCounted('cards')` — additive key, omitted when counts are not loaded | **Required** |
| `backend/app/Http/Controllers/Api/SetController.php` | The resource can only report a count that was loaded | **Add** `->withCount('cards')` to `index()`. Optionally the same for `show()`, `store()`, `update()` so every set response has one shape (one extra query each, recommended for a consistent client model) | **Required** for `index`; the other three are *optional* |
| `backend/tests/Feature/FlashcardApiTest.php` | A new contract field must be covered like every other field | **Add** one test (0 for a new set, N after adding cards) plus one assertion in the existing shape test. No other test is touched | **Required** |
| `docs/api.md` | The contract document must state `cardsCount` | **Add** the field to the documented set shape and a short Phase B note | **Required** |
| `docs/migration.md` | Decision #8: the sentence saying `/api/import` "is throttled like everything else" is factually wrong (Phase A: the route carries no throttle) | **Change that one sentence** to state the truth: only `login` and `register` are throttled | **Optional** (docs-only correction; recommended here, since this is the documentation phase) |

Explicitly **not** in Phase B: no `throttleApi()`, no change to `POST /sets` or
`POST /sets/{id}/cards` id behaviour, no bulk-id support, no migrations or schema changes, no new
endpoints, no quiz tables, no website changes, no `mobile/`, no `shared/`.

Phase B verification: `php artisan test` (the existing 36 tests must stay green), re-run the
Phase A probe extended with a `cardsCount` expectation, and `npm run lint` + `npm run build` on
the website to prove the extra field changes nothing there.

## 6. Reproducing the probe

The probe lives **outside the repository**, so there is nothing to clean up in the project:

| File | Purpose |
| --- | --- |
| `%TEMP%\phase-a-probe.mjs` | the contract / isolation / idempotency probe (34 checks) |
| `%TEMP%\phase-a-timestamps.mjs` | the focused id/timestamp probe (5 checks) |

```powershell
# prerequisites: MySQL running, then
cd backend; php artisan serve --host=0.0.0.0 --port=8001

# run it (creates pa_probe_a / pa_probe_a_b, then deletes everything it created)
$env:BASE='http://127.0.0.1:8001/api'; $env:RUN_TAG='a'
node "$env:TEMP\phase-a-probe.mjs"      # expect: "All probe checks passed."

# remove the probe accounts afterwards
mysql -u root -D flashcard_app -e "DELETE FROM personal_access_tokens WHERE tokenable_id IN (SELECT id FROM users WHERE username LIKE 'pa\_probe%'); DELETE FROM users WHERE username LIKE 'pa\_probe%';"
```

Whenever the probe is re-run, those two throwaway accounts have to be deleted again with the
command above (local dev database only).

## 7. Safety ledger

**Changed in the repository:** `docs/phase-a-findings.md` (new file — this record).

**Not changed:** every existing file — no backend source, no tests, no website source, no
`docs/api.md`, no `docs/roadmap.md`, no schema or migration, no localStorage key or value, no
`dataMode` default, no configuration, no deployment. No `mobile/` or `shared/` directory exists.

**Machine state:** MySQL and the API dev server were started for the probe and stopped
afterwards — ports 3306 and 8001 are closed, exactly as found. The database is back to its
starting contents (`test1` only; 0 sets, 0 cards, 0 tokens). The only lasting side effect is
`php artisan cache:clear`, which resets rate-limit counters in the cache store.

**Phase A is complete. Phase B has not been started, and will not be until you approve it.**




