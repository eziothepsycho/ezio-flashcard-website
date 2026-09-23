# Local setup, step by step

This is the long version of the README's setup section, written for someone who has
never run a PHP project before. Nothing here is specific to one computer: you create
your own database, your own `.env`, your own account, and nothing is shared with
anybody.

If you only want the website with browser storage, you need **Node.js and two
commands** — that is [Part 1](#part-1--the-website-on-its-own-5-minutes). The Laravel
API and MySQL are [Part 2](#part-2--add-the-api-and-mysql) and completely optional.

## What you are building

```
                    your computer
   ┌────────────────────────────────────────────────┐
   │                                                │
   │   website (React + Vite)      API (Laravel)    │
   │   localhost:5173      ──────► 127.0.0.1:8001   │
   │        │                            │          │
   │        │ localStorage               │          │
   │        │ (local mode)               ▼          │
   │        └──────────────────────► MySQL          │
   │                                 flashcard_app  │
   └────────────────────────────────────────────────┘
```

You can stop at "website + localStorage" (Part 1) or run the whole picture (Part 2).
Both parts can run at the same time, and switching between them loses nothing.

## 0. What you need

| Need | Version | Check | Where to get it |
| --- | --- | --- | --- |
| Git | any | `git --version` | git-scm.com |
| Node.js | 20.19+ or 22.12+ | `node -v` | nodejs.org (LTS is fine) |
| PHP | 8.2 or newer | `php -v` | XAMPP (Windows), MAMP (macOS), Laragon (Windows), or your distro (Linux) |
| Composer | 2.x | `composer -V` | getcomposer.org |
| MySQL / MariaDB | 5.7+ / 10.4+ | — | comes with XAMPP, MAMP and Laragon |

XAMPP, MAMP and Laragon all bundle PHP **and** MySQL **and** phpMyAdmin, so one
installer covers the last three rows. Only MySQL has to be running: you do not need
Apache unless you want the phpMyAdmin web interface, and you never need to copy the
project into `htdocs` — `php artisan serve` runs its own little web server.

> If `php` or `composer` is "not recognized" on Windows, they are installed but not on
> your PATH. Add `C:\xampp\php` (and, for Composer, the folder you installed it into)
> to your PATH, or run the commands from XAMPP's **Shell** button. Close and reopen
> your terminal after changing PATH.

## Part 1 — the website on its own (5 minutes)

1. **Clone the repository.**
   ```bash
   git clone https://github.com/eziothepsycho/ezio-flashcard-website.git
   cd ezio-flashcard-website
   ```

2. **Install the frontend dependencies** (creates `node_modules/`, one time only).
   ```bash
   npm install
   ```

3. **Start the dev server.**
   ```bash
   npm run dev
   ```
   It prints a URL — open **http://localhost:5173**.

   > Use `localhost`, not `127.0.0.1`: Vite 8 binds the IPv6 `localhost` address, so
   > the IPv4 spelling can refuse to connect on Windows.

4. **Use it.** Nothing else is needed — no database, no server, no signup email:
   1. **Create account** — a username (3–20 letters, numbers or underscores) and a
      password (4+ characters). No email, no name, nothing else.
   2. **New set** — give it a title, and a description if you like.
   3. Open the set and add cards one by one, or use **Import** to paste rows from a
      spreadsheet (TAB between the term and the definition).
   4. **Study** — browse and flip, or grade each card **I Know This** /
      **I Don't Know This**.
   5. **Quiz** — pick a direction and a number of questions (needs 4+ cards).

   Everything you do is stored in that browser's `localStorage`. Clearing your browser
   data deletes it; using a different browser shows a different, empty account.

`Ctrl+C` in the terminal stops the dev server.

## Part 2 — add the API and MySQL

You will need **two terminals**: one for the API, one for the website. This is the
order that works; nothing here touches Part 1's data.

1. **Start MySQL.** In the XAMPP Control Panel press **Start** next to *MySQL*.
   (Start *Apache* too only if you want to use phpMyAdmin in a browser.)

   From a terminal instead, if you prefer:
   ```bat
   C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini
   C:\xampp\mysql\bin\mysqladmin.exe -u root shutdown   :: stop it again
   ```

2. **Create your two databases.** Either in phpMyAdmin (http://localhost/phpmyadmin →
   **SQL** tab) or straight from the terminal — this one-liner needs no Apache:
   ```bat
   C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE flashcard_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE flashcard_app_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```
   On macOS/Linux, `mysql -u root -p` (then paste the same two `CREATE DATABASE`
   statements) works if your MySQL client is on the PATH.

   - `flashcard_app` — the app's own data.
   - `flashcard_app_test` — used only by the test suite. It is a *different* database
     on purpose, so running the tests never touches your real sets.

   Both use `utf8mb4_unicode_ci`, which is what makes usernames unique
   case-insensitively (`Mark` and `mark` are the same account).

3. **Install the API's PHP dependencies.**
   ```bash
   cd backend
   composer install
   ```
   This fills `backend/vendor/` (git-ignored, tens of MB, never committed).

4. **Create the API's `.env`** from the committed template:
   ```bash
   copy .env.example .env     # Windows
   cp .env.example .env       # macOS / Linux
   ```
   Open it and check the database block — it is already filled in for XAMPP
   (`127.0.0.1`, port `3306`, user `root`, empty password, database `flashcard_app`).
   If your MySQL has a root password or a different port, change `DB_PASSWORD` /
   `DB_PORT` here. Do not commit this file: `.env` is git-ignored and holds only your
   own local settings.

   The rest of the file is set up for this project: `SESSION_DRIVER=file`,
   `CACHE_STORE=file` and `QUEUE_CONNECTION=sync`, because only four tables are
   migrated (`users`, `sets`, `cards`, `personal_access_tokens`) — there is no
   `sessions`, `cache` or `jobs` table, and the API is stateless (clients send tokens,
   not cookies), so leave those three lines alone.

5. **Generate the app key** (fills the empty `APP_KEY`):
   ```bash
   php artisan key:generate
   ```

6. **Create the tables.**
   ```bash
   php artisan migrate
   ```
   You should see the four migrations run. `php artisan migrate:status` lists them
   afterwards, and `php artisan migrate:fresh` rebuilds them from scratch (it **deletes
   all data** in `flashcard_app`).

7. **Start the API.**
   ```bash
   php artisan serve --port=8001
   ```
   Leave that terminal running. In a browser, open
   **http://127.0.0.1:8001/api/health** — you want:
   ```json
   {"status":"ok","database":"connected","time":"..."}
   ```
   Any other answer means MySQL is not running or step 4's credentials do not match.

8. **Start the website in API mode** — in the second terminal, in the project root:
   ```bash
   $env:VITE_DATA_MODE="api"; npm run dev     # PowerShell
   VITE_DATA_MODE=api npm run dev             # macOS / Linux / Git Bash
   ```
   Open **http://localhost:5173**. The same site now signs in against your API: the dev
   server proxies `/api` to `127.0.0.1:8001` (`vite.config.js`), so your browser stays on
   one origin and there is no CORS setup to do.

9. **Create your account and use it.** Register at the login screen — there are no
   seeded users, so the first account is yours. Then create a set, add cards, study and
   quiz exactly as in Part 1: the screens do not change, only where the data is kept.

   > Registration is limited to **3 accounts an hour per address**, so a few
   > experiments in a row will get a `429`. Run `php artisan cache:clear` in the
   > backend to reset the counters, or wait an hour.

10. **Optional — bring your existing browser sets across.** If you used the site in
    local mode (Part 1) and log in with **the same username**, the dashboard offers
    once to copy those sets and their grades into your account, keeping the same ids
    and timestamps. Your browser data is not deleted: the local copy stays as it is,
    and the offer never appears again.

## Switching between the two modes

| You want | Start it like this | Your data lives in |
| --- | --- | --- |
| Browser storage (no PHP, no MySQL) | `npm run dev` | `localStorage` |
| Your local API | `php artisan serve --port=8001` + `$env:VITE_DATA_MODE="api"; npm run dev` | MySQL, database `flashcard_app` |

Only the exact value `api` switches modes — unset, `local`, or a typo all keep browser
storage. Nothing is moved or deleted by switching, so you can compare the two freely.
In API mode a reload restores your session from the stored token; signing out revokes
it on the server.

## Tests and checks

```bash
cd backend && php artisan test      # 37 API tests, needs MySQL + flashcard_app_test
php artisan test --filter=AuthTest  # just one file
```
```bash
npm run lint     # frontend linting (Oxlint)
npm run build    # production build into dist/
npm run preview  # serve the built site to check it
```

The API tests cover registration and login (including the case-insensitive duplicate
rule and both rate limits), token expiry and revocation, set and card CRUD, bulk
import, grading, the delete cascade, the ownership matrix between two accounts, and
the one-shot data import. Each test rolls its work back, so your development data in
`flashcard_app` is never touched.

## Everyday maintenance

| Task | Command |
| --- | --- |
| Wipe the app's data and recreate the tables | `php artisan migrate:fresh` |
| Reset the rate-limit counters | `php artisan cache:clear` |
| Re-read `backend/.env` after editing it | `php artisan config:clear` |
| Follow the API log while you click around | `Get-Content backend\storage\logs\laravel.log -Wait` (PowerShell), or `tail -f backend/storage/logs/laravel.log` |
| Read past errors | `backend/storage/logs/laravel.log` |
| Stop MySQL | XAMPP Control Panel → MySQL → Stop, or `C:\xampp\mysql\bin\mysqladmin.exe -u root shutdown` |

## Starting over completely

- **Browser data:** DevTools → **Application → Local Storage** → `http://localhost:5173`,
  and delete the keys `flashcardApp:data`, `flashcardApp:auth`, `flashcardApp:token` and
  `flashcardApp:migratedAt`. That clears the website's accounts and sets; nothing on the
  server changes.
- **API data:** `php artisan migrate:fresh` empties `flashcard_app` (accounts, sets,
  cards, tokens). Dropping both databases and recreating them is the same thing taken
  further.
- **Dependencies:** `node_modules/` and `backend/vendor/` are generated — deleting them
  only means running `npm install` / `composer install` again. `backend/.env` is yours
  alone and is never committed; deleting it means copying `.env.example` again.

## Troubleshooting, in more depth

| Symptom | What it means |
| --- | --- |
| `SQLSTATE[HY000] [2002]` or "Connection refused" | MySQL is not running. Start it, then try again |
| `SQLSTATE[HY000] [1049] Unknown database 'flashcard_app'` | Step 2 of Part 2 was skipped, or the name in `.env` does not match |
| `SQLSTATE[HY000] [1045] Access denied for user 'root'` | `DB_USERNAME` / `DB_PASSWORD` in `backend/.env` do not match your MySQL |
| `SQLSTATE[HY000] [1044] Access denied … to database` | Your MySQL user exists but was not granted rights on that database |
| `/api/health` answers but the site says it cannot reach the server | The site is running on a different API port than `vite.config.js` proxies to |
| The site sits on a loading screen forever in API mode | The API is not running at all — the 401/network path is what the splash waits for |
| `ECONNREFUSED 127.0.0.1:8001` printed by Vite | Same cause: start `php artisan serve --port=8001` |
| `Port 5173 is in use` | Another dev server is running. Stop it, or `npm run dev -- --port 5174` |
| `Port 8001 is in use` | `netstat -ano \| findstr :8001` to find it, or pick another port **and** update `vite.config.js` |
| The log file cannot be opened / permission denied | macOS/Linux: `chmod -R 775 backend/storage backend/bootstrap/cache` |
| `419` or CSRF messages | You are hitting the API with a browser form instead of the app; the API is token-based, so use the website or `curl` with an `Authorization: Bearer` header |
| `422` with a `fields` object | Validation refused the input — the website shows those messages next to the named field |
| Opening an `/api/...` address in a browser shows `{"error":{"code":"unauthenticated","message":"You are not signed in."}}` | That is the API answering correctly, not an error page: it needs a bearer token and it never redirects to a login screen. Sign in through the website, or send an `Authorization: Bearer <token>` header |

Every API error answers in one shape, so a failure is always readable:
`{"error":{"code":"…","message":"…","fields":{…}}}` (see
[`api.md`](./api.md)).

## Words used in this project

| Word | Meaning here |
| --- | --- |
| **account** | A username and a password. No email, phone, name or profile |
| **session** | Who is currently signed in on this browser |
| **token** | The secret string the API hands back at login; the client sends it with every request |
| **migration** | A PHP file in `backend/database/migrations` that creates or changes a table |
| **`.env`** | A local settings file, git-ignored, holding your database credentials |
| **`localStorage`** | The browser's own little database, used by local mode |
| **API** | The Laravel app in `backend/`: it answers JSON over HTTP and stores data in MySQL |
| **data mode** | Which of the two sources of truth the website uses — `local` or `api` |

## Where to go next

- [`../README.md`](../README.md) — the short version and the feature tour.
- [`architecture.md`](./architecture.md) — how the website and API fit together.
- [`api.md`](./api.md) — every endpoint, with request and response examples.
- [`database.md`](./database.md) — the tables, and the ownership rules behind them.
- [`migration.md`](./migration.md) — moving browser data into the API safely.
- [`roadmap.md`](./roadmap.md) — what is finished, what is next, what is out of scope.


