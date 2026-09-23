# Roadmap

Where we are and what comes next. One phase per sitting, and the website keeps
working the whole way through.

**Current status:** Phases 0–9 complete. The website runs on `localStorage` by default
and on the Laravel API when asked, the one-time import of existing browser data is in,
and the repository is documented for a stranger: clone it, install the frontend (and
optionally the API's) dependencies, create your own databases, and run it locally.

**There is deliberately no deployment phase.** The project is meant to be cloned and run
on your own machine, not hosted: no hosting, Docker, CI or production configuration
belongs in this repository. The mobile app stays planned-but-not-started.

The one outstanding Phase 0 action is still the browser backup dump
([`migration.md`](./migration.md) Step 0).

| # | Phase | Status | Done when |
| --- | --- | --- | --- |
| 0 | Baseline & safety net | ✅ | account work committed; localStorage backup snippet + restore path documented; nothing else touched |
| 1 | API contract + database schema | ✅ | `docs/api.md`, `docs/database.md`, `docs/architecture.md` agreed |
| 2 | Backend skeleton + migrations | ✅ | Laravel 12 under `backend/`, `users`/`sets`/`cards` migrated into MySQL, `GET /api/health` → `200 {"status":"ok","database":"connected"}`, unique + cascade constraints verified |
| 3 | Backend authentication | ✅ | `register` / `login` / `logout` / `me` with Sanctum tokens (30-day expiry, revoked on logout), bcrypt hashes, 5-per-minute login and 3-per-hour register limits — 23/23 HTTP checks passed |
| 4 | Backend sets + cards (+ bulk) | ✅ | set/card CRUD, bulk import and `learningStatus` grading with ownership enforced on every route; another account's ids all answer `404`; delete cascades — 30 tests / 257 assertions plus a 22-check live run |
| 5 | Website API layer (dark launch) | ✅ | `src/api/{client,authApi,flashcardApi}.js` + `data/config.js`, token helpers in `storage.js`, Vite `/api` proxy; `dataMode` still `"local"` and the built bundle is byte-identical — 22/22 live checks through the client layer |
| 6 | Website auth → backend | ✅ | accounts switch with `VITE_DATA_MODE=api` via `data/authBackend.js`; async session restore behind a quiet splash; per-field API errors reused; `local` remains the default and all 24 live API checks passed |
| 7 | Website CRUD → backend | ✅ | `data/flashcardBackend.js` makes sets/cards async in both modes; `App.jsx` + `SetDetail.jsx` await, with loading, error banners, a stale-response guard, sign-out on 401 and background grading — 22/22 local checks and 24/24 live API checks |
| 8 | Migrate existing data | ✅ | `POST /api/import` + `data/localImport.js` + a one-time notice in the dashboard; ids, timestamps and grades preserved, repeats skipped, local blob untouched — 7 backend tests and 26 live checks |
| 9 | Local polish: clone-and-run docs | ✅ | `README.md` rewritten around "clone it and run your own copy" (two run modes, prerequisites, numbered setup, troubleshooting), `docs/local-setup.md` added, `backend/.env.example` ships MySQL + file-store settings instead of Laravel's SQLite defaults, roadmap and backend README updated — verified by `php artisan test`, `npm run lint`, `npm run build` |
| 9b | Flip the committed default to `api` | ✖ dropped | Not planned while there is no server to point at: `npm install && npm run dev` must keep giving a complete app with no backend. `api` stays opt-in through `VITE_DATA_MODE`, and the migration offer stays narrow — it appears only for someone who really has local data to move |
| 9c | Strip unused framework scaffolding | ✅ | `backend/` is API-only now: the default `resources/{css,js,views}`, `package.json`, `vite.config.js` and the `/` welcome route plus its test are gone, and the `composer.json` scripts that called `npm` were trimmed (`composer run dev` serves the API on 8001). Nothing in `app/`, `database/` or `routes/api.php` changed — 36 tests / 312 assertions, clean-copy `composer install` verified. (Called "Phase 10" in conversation; the roadmap number collides with the mobile track below, which has not started) |
| 11 | Mobile auth | ⏸ later | login / create account / logout via the shared validators; session restored with `/me` |
| 12 | Mobile dashboard + sets | ⏸ later | list, create, edit, delete, open |
| 13 | Mobile flashcards + import | ⏸ later | add / edit / delete / list; paste-based TAB import using the shared parser |
| 14 | Mobile Study Mode | ⏸ later | flipping, term/definition first, browsing, basic sorting, I Don't Know, Previous/Next, completion, "Study Cards I Don't Know", restart, back home — **no auto-loop** |
| 15 | Mobile quiz | ⏸ later | setup, both directions, custom count, A–D multiple choice, results + review |
| 16 | Cross-device verification | ⏸ later | web → phone and phone → web both verified on the developer's own network; nothing published |

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
- **Mobile last (10+)** — it consumes the same API the website has already proven, and it
  reuses the pure helpers (`generateQuiz.js`, `parseFlashcardImport.js`) that already have
  no browser dependencies.
- **Docs before publishing (9)** — a repository nobody can run is not finished. The last
  phase is making a stranger's first ten minutes work: prerequisites, a two-command quick
  start, a local-setup walkthrough, and honest notes about what each mode does and does
  not protect.
- **No deployment phase** — deliberately absent. Everything here is designed to be
  cloned and run locally; there is no server to harden, no domain, no production
  database, and no credentials in the repository.

## Example local environment (the machine this was built on)

Another machine will differ — a MySQL root password, a different port, no XAMPP at all.
`backend/.env.example` documents every setting a cloner may need to change, and
[`local-setup.md`](./local-setup.md) walks through it step by step.

| Piece | Value |
| --- | --- |
| PHP | 8.2.12 (XAMPP, on PATH) |
| Composer | installed, on PATH |
| Database | XAMPP MariaDB 10.4 on `127.0.0.1:3306`, user `root`, no password |
| Database name | `flashcard_app` |
| API dev server | `php artisan serve --port=8001` → `http://127.0.0.1:8001` |
| Website dev server | `npm run dev` (Vite, port 5173) — proxies `/api` to `127.0.0.1:8001` |
| API URL override | `VITE_API_URL` (another port or another machine); defaults to `/api` |
| Data mode | `VITE_DATA_MODE=api` runs accounts against the API; unset or `local` keeps localStorage (the committed default) |

MySQL has to be running for the API to work: start it from the XAMPP Control
Panel (**MySQL → Start**). Phase 2 was verified with a `mysqld` process started
in the background, which can be stopped with
`C:\xampp\mysql\bin\mysqladmin.exe -u root shutdown`.

## Not in scope (deliberately)

Deployment of any kind (hosting, Docker, CI, production configuration, custom domains),
real-time/websocket sync, offline mutation queues, sharing sets between accounts,
per-user progress on shared sets, password reset (there is no email by design), push
notifications.
