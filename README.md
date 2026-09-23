# cards.

A dark-mode flashcard study app: sign in, build sets of flashcards, study them two
different ways, and quiz yourself. Accounts are a username and a password —
**no email, no phone, no name, no profile details** anywhere in the project.

> Your flashcard sets, studied your way.

It runs in two ways from the same codebase, and you choose by setting one
environment variable:

| Mode | What runs | What you need installed | Where your data lives |
| --- | --- | --- | --- |
| **Local mode** — the default | the website only | Node.js | your browser's `localStorage` |
| **Full stack** — `VITE_DATA_MODE=api` | website + Laravel 12 API + MySQL | Node.js, PHP 8.2+, Composer, MySQL or MariaDB | your own local MySQL database |

Local mode needs **no backend at all**: `npm install`, `npm run dev`, and you have a
working app with accounts, sets, flashcards, study mode and quizzes — everything
except the shared backend. The Laravel API in `backend/` is the same API a mobile
app will use later; it is opt-in, and both modes can be used side by side.

There is **no hosted version of this project and nothing to deploy**. You clone the
repository and run your own copy on your own machine, with your own database.

## Features

### Accounts

- Register with **a username and a password, nothing else**. Usernames are 3–20
  letters, numbers or underscores, are unique case-insensitively, and passwords
  need at least 4 characters.
- Passwords are masked as you type, with a **Show / Hide** control on each field.
- Every account has its own sets and flashcards. You only ever see your own.
- Stay signed in between visits; **Log out** returns you to the Login screen.
- In full-stack mode passwords are hashed on the server with **bcrypt**, tokens
  expire after 30 days, and login/registration are rate limited.
- Sets saved before accounts existed are handed to the first account created on
  that device — nothing is ever deleted.
- When the site runs against the API, the sets this browser already holds can be
  brought into your account in one click, and your local copy is left exactly as
  it is.

### Flashcard sets

- Create, rename and delete sets (each with an optional description).
- Deleting a set cascades — every flashcard inside it goes with it.
- The dashboard shows all sets as a grid, with an empty state when you are just
  getting started.

### Flashcards

- Add, edit and delete individual cards (term + definition).
- The card list shows a learning-status badge once a card has been graded:
  **I know this** or **Still learning**.
- Bulk import: paste term-and-definition pairs straight out of a spreadsheet
  (TAB-separated, one per line), preview the parsed rows, and fix any bad lines
  before saving.

### Study Mode — two sorting styles

- **Browsing** — standard flipping. Click the card to flip it and step through
  with **Previous** / **Next**. Pressing **Next** on the last card finishes the
  session and goes straight to a summary screen with **Restart Flashcards** and
  **Back to Home**.
- **Basic sorting** — grade each card as **I Know This** or **I Don't Know This**.
  Statuses are saved to the card and persist between visits. When you run out of
  cards you get a completion summary with **Study Cards I Don't Know** (a focused
  review session built from your "still learning" cards), **Restart All Cards** and
  **Back to Home**. Every round ends on that summary, so another round only starts
  when you ask for one.
- **Options panel** — switch sorting style on the fly and choose whether the
  **term** or the **definition** sits on the front of the card.
- **Fullscreen** — the **⛶** control hands the study view to the browser's native
  Fullscreen API. Esc (or the button again) returns to the normal layout with the
  card, session and statuses exactly as they were. Where the browser has no element
  fullscreen (e.g. iOS Safari) the control is not shown.

### Quizzes

- Choose the question direction: **Term → Definition** or **Definition → Term** —
  whichever side is asked, the other side is the answer.
- Choose how many questions you want: any whole number from 1 up to the number of
  cards in the set (defaults to 10, or the full set when it is smaller).
- Multiple-choice: each question shows the prompt with the correct answer plus
  three shuffled distractors from the same set, labelled A–D.
- The results screen shows your score, a correct/incorrect breakdown, and a full
  review of every answer, highlighting the ones you missed.

## Prerequisites

Local mode needs one thing. The full stack needs all four.

| Need | Version | Check with | Notes |
| --- | --- | --- | --- |
| Node.js | **20.19+ or 22.12+** | `node -v` | Vite 8 requires it; Node 18 fails with an `engines` error |
| PHP | **8.2 or newer** | `php -v` | With `pdo_mysql` and `mbstring` — XAMPP, MAMP and Laragon enable them by default |
| Composer | 2.x | `composer -V` | Installs the API's PHP dependencies |
| MySQL / MariaDB | 5.7+ / 10.4+ | — | XAMPP ships MariaDB; MAMP, Laragon and Homebrew work too |

You also need **Git** to clone the project, and a terminal. On Windows the XAMPP
Control Panel is the easiest way to start MySQL.

## Option A — Quick start (no backend)

```bash
git clone https://github.com/eziothepsycho/ezio-flashcard-website.git
cd ezio-flashcard-website
npm install
npm run dev
```

Open the URL it prints — **http://localhost:5173** — create an account, and start
building sets. Everything is stored in that browser's `localStorage`; nothing
leaves your machine and no database is involved.

> **Windows note:** use `localhost:5173`, not `127.0.0.1:5173`. Vite 8 binds the
> IPv6 `localhost` address, so the IPv4 spelling can refuse to connect.

## Option B — Full stack (website + Laravel API + MySQL)

Run these in order. Steps 1–4 are the frontend, steps 5–10 are the API. You will
end up with two terminals running at once: the API and the website.

1. **Get the code and install the frontend** (same as Option A).
   ```bash
   git clone https://github.com/eziothepsycho/ezio-flashcard-website.git
   cd ezio-flashcard-website
   npm install
   ```

2. **Start MySQL.** XAMPP Control Panel → **MySQL → Start**. Nothing else in
   XAMPP (Apache, FTP, Mercury) is needed.

3. **Create your two databases** — in phpMyAdmin (`http://localhost/phpmyadmin`) or
   in a MySQL console:
   ```sql
   CREATE DATABASE flashcard_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE DATABASE flashcard_app_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
   The first is the app's data, the second is used by the test suite. Each
   developer has their own; there is no shared database anywhere.

4. **Install the API's dependencies.**
   ```bash
   cd backend
   composer install
   ```

5. **Create the API's `.env`** from the committed template and fill in your
   database details:
   ```bash
   copy .env.example .env     # Windows
   cp .env.example .env       # macOS / Linux
   ```
   The defaults are the XAMPP ones (localhost:3306, user `root`, empty password,
   database `flashcard_app`). Edit `DB_USERNAME` / `DB_PASSWORD` if yours differ.
   `.env` is git-ignored and must never be committed.

6. **Generate the app key.**
   ```bash
   php artisan key:generate
   ```

7. **Create the tables.**
   ```bash
   php artisan migrate
   ```

8. **Start the API** (leave it running).
   ```bash
   php artisan serve --port=8001
   ```
   Check it: open **http://127.0.0.1:8001/api/health** — you should see
   `{"status":"ok","database":"connected",...}`. If it says the database is not
   connected, MySQL is not running or step 5's credentials are wrong.

9. **Start the website in API mode** — a second terminal, back in the project root:
   ```bash
   $env:VITE_DATA_MODE="api"; npm run dev     # PowerShell
   VITE_DATA_MODE=api npm run dev             # macOS / Linux / Git Bash
   ```
   The Vite dev server proxies `/api` to `127.0.0.1:8001` (see `vite.config.js`), so
   the browser talks to one origin and CORS never comes up. If you serve the API on
   a different port, change it there.

10. **Register and use it.** At **http://localhost:5173** create your own account —
    you are the only person with credentials for it, because there are no seeded
    users. Then create a set, add cards (or bulk-paste them), study them, and take a
    quiz.

Switching back and forth is just the environment variable: leave it unset (or set
it to `local`) for browser storage, set `api` for the backend. Both can coexist —
switching modes never deletes anything.

A slower, more detailed version of all of this — with the XAMPP screens, how to
reset the database, and what to do when something goes wrong — is in
**[docs/local-setup.md](./docs/local-setup.md)**.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the website with hot reload on `localhost:5173` |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the build in `dist/` to check it |
| `npm run lint` | Lint the frontend (Oxlint) |
| `cd backend && php artisan test` | Run the API test suite (37 tests) |
| `cd backend && php artisan migrate:fresh` | Drop and recreate the app's tables — **deletes your data** |
| `cd backend && php artisan cache:clear` | Reset the rate-limit counters (handy while testing) |
| `cd backend && php artisan serve --port=8001` | Start the API |

The test suite needs `flashcard_app_test` (step 3) and MySQL running; it refreshes
its own schema and rolls each test back, so your development data is never touched.
It deliberately runs on MySQL rather than SQLite, because case-insensitive usernames
come from the MySQL collation.

## Project structure

```
flashcard-app/
├── index.html                   # Vite entry point
├── vite.config.js               # dev server + /api → 127.0.0.1:8001 proxy
├── package.json                 # frontend scripts and dependencies
├── .env.example                 # VITE_DATA_MODE / VITE_API_URL (copy to .env)
├── src/                         # the website (React 19 + Vite 8)
│   ├── App.jsx                  # app shell: auth screen, dashboard or set view
│   ├── App.css / index.css      # component styles + design tokens (CSS variables)
│   ├── api/                     # the backend client — the only place HTTP happens
│   │   ├── client.js            #   fetch + bearer token + one error shape
│   │   ├── authApi.js           #   register / login / logout / me
│   │   └── flashcardApi.js      #   sets and cards, named like data/db.js
│   ├── data/                    # the data layer, and the mode switch
│   │   ├── storage.js           #   localStorage wrapper (load/save, recovery)
│   │   ├── db.js                #   user-scoped set/card CRUD (local mode)
│   │   ├── auth.js              #   accounts and the session (local mode)
│   │   ├── authBackend.js       #   picks auth.js or api/authApi.js
│   │   ├── flashcardBackend.js  #   picks db.js or api/flashcardApi.js
│   │   ├── localImport.js       #   one-time move of browser data into the API
│   │   ├── useAuth.js           #   the only React binding for accounts
│   │   └── config.js            #   dataMode: "local" or "api"
│   ├── utils/                   # pure helpers, reusable by a mobile app later
│   │   ├── generateQuiz.js      #   questions + distractors
│   │   └── parseFlashcardImport.js  #  TAB-separated paste → rows + bad lines
│   └── components/              # AuthScreen, Dashboard, SetCard, SetDetail,
│                                # FlashcardList, Card/SetFormModal, ImportModal,
│                                # ImportDataNotice, StudyMode, QuizSetup/Taking/Results
├── backend/                     # the Laravel 12 API (API-only; no views in use)
│   ├── app/Http/Controllers/Api/  # AuthController, SetController, CardController,
│   │                              # ImportController
│   ├── app/Models/                # User, Set, Card (+ Concerns/HasUuidKey)
│   ├── app/Http/Resources/        # SetResource, CardResource
│   ├── app/Providers/AppServiceProvider.php  # rate limits, JSON resources
│   ├── routes/api.php             # every endpoint
│   ├── database/migrations/       # users, sets, cards, personal_access_tokens
│   ├── database/seeders/DatabaseSeeder.php   # deliberately seeds nothing
│   ├── tests/Feature/             # AuthTest, FlashcardApiTest, ImportTest
│   └── .env.example               # MySQL settings template (copy to .env)
└── docs/                        # architecture, database, api, migration, roadmap,
                                 # local-setup
```

## How it works

**Navigation.** There is no router. `App.jsx` holds the active set id in state and
swaps between the dashboard and the set view; `SetDetail.jsx` uses a `mode` field
(`list` → `study` → `quiz-setup` → `quiz` → `quiz-results`) to swap the screen inside
a set. `AuthScreen.jsx` does the same for `login` ⇄ `register`.

**One data layer, two implementations.** Nothing in the UI imports `api/*` or touches
`localStorage`. Components call `data/db.js` and `data/auth.js` through the façades
`data/flashcardBackend.js` and `data/authBackend.js`, which are async in both modes and
pick their implementation from `dataMode` in `data/config.js`. That is what lets the
whole site flip between browser storage and the API with one environment variable —
and what will let a mobile client reuse `api/*` unchanged. `userId` stays in those
signatures on purpose: local mode needs it to scope data, API mode ignores it because
the token decides who you are.

**Data model.** Both modes store the same three things: accounts, sets, cards. In the
browser they are two JSON blobs — `flashcardApp:data` (`{sets, cards}`) and
`flashcardApp:auth` (`{users, sessionUserId}`) — holding two flat arrays linked by id:

```js
sets:  [{ id, userId, title, description, createdAt, updatedAt }]
cards: [{ id, setId, term, definition, learningStatus, createdAt, updatedAt }]
```

A set has an owner; a card **inherits** its owner from the set it sits in
(`card.setId → set.userId`), which is why a card carries no `userId`. MySQL mirrors
this exactly — `users`, `sets`, `cards`, all with UUID primary keys, described in
[docs/database.md](./docs/database.md). Ids are generated by the client
(`crypto.randomUUID()`), so the same row keeps the same id in both modes and moving
data across needs no id mapping.

**Ownership.** In local mode every `db.js` function takes a `userId` and refuses to
read or change anything owned by someone else. In API mode the server derives the
owner from the token and answers **404** (never 403) for anything that is not yours,
so a client cannot even confirm that another account's set exists. Both paths were
tested with two accounts side by side: neither can see or touch the other's data.

**Accounts.** Register needs a username and a password and nothing else. In local
mode the password is salted and SHA-256 hashed in the browser (fast and unthrottled —
see *Security*); in API mode it is bcrypt-hashed on the server, login and registration
are rate limited, and the client keeps a 30-day Sanctum bearer token instead of a
cookie session.

**Sets saved before accounts existed.** They have no owner, so they are tagged with a
`legacy-local-device` sentinel that matches no account: invisible, but never deleted.
The first account created on that device adopts them and sees a one-off note saying
how many sets were moved. In API mode the dashboard instead offers to copy this
browser's data into the account you signed in with — once, keeping ids and timestamps,
and deleting nothing locally.

**Design.** A dark, near-monochrome palette with a single lime accent, generous
spacing, and visible keyboard focus rings. Colours, spacing and radii are CSS variables
in `src/index.css`, so re-theming means editing one block. Motion respects
`prefers-reduced-motion`.

## Security, honestly

This is a learning project. What is true depends on which mode you run.

**Local mode is not a security boundary.** Accounts, hashes and sets all sit in
`localStorage`, readable and editable from the browser's dev tools: anyone who can open
them can point `sessionUserId` at another account, and nothing on a server checks
anything. The SHA-256 hashing keeps passwords out of plain sight, but it is fast,
unthrottled and verified locally. Treat local mode as a friendly username/password
experience for a personal study tool — and **do not reuse a password you care about**.

**Full-stack mode adds the real measures**, and each one is enforced in the API rather
than the browser:

- passwords are hashed with **bcrypt** on the server and never leave it;
- login is limited to **5 attempts a minute** per username + address, and registration
  to **3 an hour** per address (a `429` with a plain-English message);
- clients carry a **Sanctum bearer token**, valid for 30 days, revoked on logout;
- every read and write is scoped to the authenticated user, and anything that belongs
  to somebody else answers **404**;
- no email address, phone number or profile data is collected anywhere, so a stolen or
  lost database leaks usernames, password hashes and flashcards — and nothing else;
- `.env` (database credentials, app key) is git-ignored, and the committed
  `.env.example` contains no secrets;
- database tables use `utf8mb4_unicode_ci`, which is also what makes usernames unique
  case-insensitively.

**Both modes:** there is no password reset, because there is no email address on file —
a forgotten password means that account's flashcards can't be opened (they are not
deleted). Tokens and local data live in `localStorage`, so anything that can run script
on the page can read them; that is fine for `localhost`, and it is why nothing here is
meant to be exposed to the internet as-is.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `npm run dev` fails complaining about the Node engine | Node is too old. Install 20.19+ or 22.12+ (`nvm install 22`) |
| `127.0.0.1:5173` won't connect, but the terminal says it is running | Use **`localhost:5173`** — Vite 8 binds the IPv6 address |
| "Can't reach the server. Check your connection and try again." | The API isn't running, or is on another port. Start `php artisan serve --port=8001`, or match the port in `vite.config.js` |
| `/api/health` reports the database is not connected | MySQL isn't running (XAMPP Control Panel → MySQL → Start), or `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD` in `backend/.env` are wrong |
| `SQLSTATE[HY000] [1049] Unknown database 'flashcard_app'` | The database doesn't exist yet — see Option B step 3 |
| `php artisan test` fails with unknown database `flashcard_app_test` | Create the test database (Option B step 3) |
| `No application encryption key has been specified` | `php artisan key:generate` (Option B step 6) |
| `429 Too many accounts created from here` | The 3-per-hour registration limit. `php artisan cache:clear`, or wait |
| `429 Too many login attempts` | The 5-a-minute login limit — wait a minute and try again |
| `php artisan serve` says the port is in use | Use another port **and** update the proxy target in `vite.config.js`, or find the process with `netstat -ano \| findstr :8001` |
| Changes to `backend/.env` seem to be ignored | `php artisan config:clear` |
| My sets seem to be missing after switching to API mode | You are looking at the database, not the browser. Your browser sets are still there; the dashboard offers to import them once |
| Bulk import rejects a row | The row needs a TAB between the term and the definition; the preview marks the bad lines before anything is saved |

More detail, including how to reset everything, is in
[docs/local-setup.md](./docs/local-setup.md).

## Planned, not built

- **A mobile app** for iOS and Android, signing in to the same accounts through this
  same API. Nothing mobile exists in this repository yet.
- **No deployment of any kind.** There is no hosting, Docker, CI or production
  configuration here — the project is meant to be cloned and run locally.
- Export/import sets as JSON, spaced-repetition scheduling, search and sorting for
  large sets, and a light theme are ideas, not features.

## Docs

| Document | Contents |
| --- | --- |
| [`docs/local-setup.md`](./docs/local-setup.md) | the long, step-by-step local setup and reset guide |
| [`docs/architecture.md`](./docs/architecture.md) | target architecture, the rules that always hold, repo layout |
| [`docs/database.md`](./docs/database.md) | MySQL schema, ownership queries, mapping from the localStorage model |
| [`docs/api.md`](./docs/api.md) | every endpoint, payloads, error shapes, website integration |
| [`docs/migration.md`](./docs/migration.md) | backing up browser data and moving it into the API |
| [`docs/roadmap.md`](./docs/roadmap.md) | what is done, what is next, what is deliberately out of scope |




