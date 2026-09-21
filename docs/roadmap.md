# Roadmap

Where we are and what comes next. One phase per sitting, and the website keeps
working the whole way through.

**Current status:** Phase 4 complete — the API handles accounts, sets and cards
with per-account ownership enforced on every route, and a permanent PHPUnit suite
(30 tests, 257 assertions) plus a live two-account run back it up. The one
outstanding Phase 0 action is still the browser backup dump
([`migration.md`](./migration.md) Step 0).

| # | Phase | Status | Done when |
| --- | --- | --- | --- |
| 0 | Baseline & safety net | ✅ | account work committed; localStorage backup snippet + restore path documented; nothing else touched |
| 1 | API contract + database schema | ✅ | `docs/api.md`, `docs/database.md`, `docs/architecture.md` agreed |
| 2 | Backend skeleton + migrations | ✅ | Laravel 12 under `backend/`, `users`/`sets`/`cards` migrated into MySQL, `GET /api/health` → `200 {"status":"ok","database":"connected"}`, unique + cascade constraints verified |
| 3 | Backend authentication | ✅ | `register` / `login` / `logout` / `me` with Sanctum tokens (30-day expiry, revoked on logout), bcrypt hashes, 5-per-minute login and 3-per-hour register limits — 23/23 HTTP checks passed |
| 4 | Backend sets + cards (+ bulk) | ✅ | set/card CRUD, bulk import and `learningStatus` grading with ownership enforced on every route; another account's ids all answer `404`; delete cascades — 30 tests / 257 assertions plus a 22-check live run |
| 5 | Website API layer (dark launch) | ⬜ next | `api/client.js`, `api/authApi.js`, `api/flashcardApi.js` exist; `dataMode` still `"local"`; site unchanged |
| 6 | Website auth → backend | ⬜ | login/register/logout use the API; local mode still available; UX identical |
| 7 | Website CRUD → backend | ⬜ | `App.jsx` + `SetDetail.jsx` call sites async, with loading/error states; all features re-verified per account |
| 8 | Migrate existing data | ⬜ | `/api/import` + one-time UI; counts match; old blob retained |
| 9 | Harden + deploy the website | ⬜ | HTTPS, CORS, rate limits, DB backups, README updated; two-account isolation re-tested |
| 10 | Mobile skeleton | ⬜ | Expo app builds; navigation; theme from the design tokens; shared utils; API client + token in SecureStore; offline screen |
| 11 | Mobile auth | ⬜ | login / create account / logout via the shared validators; session restored with `/me` |
| 12 | Mobile dashboard + sets | ⬜ | list, create, edit, delete, open |
| 13 | Mobile flashcards + import | ⬜ | add / edit / delete / list; paste-based TAB import using the shared parser |
| 14 | Mobile Study Mode | ⬜ | flipping, term/definition first, browsing, basic sorting, I Don't Know, Previous/Next, completion, "Study Cards I Don't Know", restart, back home — **no auto-loop** |
| 15 | Mobile quiz | ⬜ | setup, both directions, custom count, A–D multiple choice, results + review |
| 16 | Cross-device verification + ship | ⬜ | web → phone and phone → web both verified; EAS build installed; backups on |

## Why this order

- **Phase 0 before anything else** — the account work was uncommitted and the
  browser data had no backup. A clean commit plus a JSON dump makes every later
  phase reversible.
- **Phase 1 before code** — the contract fixes field casing (so no UI component
  is ever renamed), the id strategy (so migration needs no id mapping), and the
  404-not-403 ownership rule. Changing these later is expensive; agreeing now is a
  page of notes.
- **Migration (8) after the website is fully on the API (7)** — when data moves,
  there is exactly one write path, so nothing can land in two places.
- **Mobile last (10+)** — it consumes the same API the website has already proven,
  and it reuses the pure logic extracted in Phase 10.

## Local environment (this machine)

| Piece | Value |
| --- | --- |
| PHP | 8.2.12 (XAMPP, on PATH) |
| Composer | installed, on PATH |
| Database | XAMPP MariaDB 10.4 on `127.0.0.1:3306`, user `root`, no password |
| Database name | `flashcard_app` |
| API dev server | `php artisan serve --port=8001` → `http://127.0.0.1:8001` |
| Website dev server | `npm run dev` (Vite, port 5173) |

MySQL has to be running for the API to work: start it from the XAMPP Control
Panel (**MySQL → Start**). Phase 2 was verified with a `mysqld` process started
in the background, which can be stopped with
`C:\xampp\mysql\bin\mysqladmin.exe -u root shutdown`.

## Not in scope (deliberately)

Real-time/websocket sync, offline mutation queues, sharing sets between accounts,
per-user progress on shared sets, password reset (there is no email by design),
push notifications.
