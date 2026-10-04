# cards. — mobile app

The React Native / Expo client that shares this repository's Laravel API with the website.
**Through Phase H it has:** the Expo shell, navigation, theme tokens, the shared pure logic,
an API client, authentication with the bearer token in `expo-secure-store`, the flashcard
experience (sets, cards, paste-import), the study experience (Study Mode with grading, and a
quiz with the website's score and two-section review) — and a **local SQLite mirror with an
outbox**, so reading, creating, editing, grading and deleting all work with no connection and
sync to the API when it returns.

The API in `../backend` is the only source of truth. This app never talks to the website,
and the website never talks to the app.

## What runs today

- **Expo shell** — `index.js` → `App.js`, with React Navigation's native stack and
  `expo-status-bar`.
- **Authentication** — `LoginScreen`, `RegisterScreen` and an authenticated `HomeScreen`, with
  `LoadingScreen` covering the moment the stored session is read off the device (no request
  involved). The rules and the wording come from `../shared/validation.js`, so the website and
  the app reject the same input with the same messages.
- **API client** — `src/lib/api/client.js` is the only file that calls `fetch`; it resolves
  `EXPO_PUBLIC_API_URL`, adds the bearer token and turns the API's error envelope into an
  `ApiError` with `status`, `code` and per-field `fields`.
- **Session** — `src/lib/auth/{session,authSession,tokenStorage,sessionPolicy}.js`. The token,
  the account's profile and the sign-in time live in the iOS Keychain / Android Keystore and
  nowhere else; the password is never stored at all. Signing in therefore survives closing the
  app, force-stopping it and rebooting the phone — and an **offline launch signs in with no
  request at all**. A token the server rejects signs the app out; an unreachable server does
  not. Thirty days after signing in — the same rule `backend/config/sanctum.php` enforces — the
  session is over, and the login screen says so.
- **Theme tokens** — `src/theme/tokens.js` mirrors the website's `src/index.css` values
  (colors, spacing, radius, font sizes), so the two clients look like one product.
- **Sets and cards** — `HomeScreen` lists the account's sets (with `cardsCount`), and
  `SetDetailScreen` shows one set's cards with add / edit / delete for both, plus
  `ImportModal` for pasting TAB-separated rows (capped at the API's 500 per call).
- **Study Mode** — `StudyScreen`: tap to flip, step through with Previous/Next, or switch to
  basic sorting and grade each card (*I know this* / *I don't know this*), which saves through
  `PATCH /cards/{id}` and updates the badge immediately. A session ends on a summary with
  "Study cards I don't know", restart, or back — there is no auto-loop. The one website feature
  left out is fullscreen, which React Native has no equivalent of.
- **Quiz** — `QuizScreen`: pick the direction and how many questions (checked against
  `shared/validation.js`), answer A–D questions built by `shared/generateQuiz.js`, then read the
  score and the review split into **Incorrect** (question, your answer, correct answer) and
  **Correct** (question, your answer) — never one mixed list.
- **Data layer** — `src/lib/data/useSets.js`, `useCards.js` and `quizResults.js`. Reads come
  from the local database; writes go there first and are queued, so nothing waits on the
  network. One screen owns one list, and a screen re-reads it when it comes back into focus.
- **Local database and sync** — `src/lib/db/` (schema, mirror, outbox) and `src/lib/sync/`
  (the engine). Sets and cards are mirrored in SQLite; every change is written locally, queued in
  the outbox and pushed oldest-first when there is a connection. A sync status line on the home
  and set screens says "Up to date", "N changes waiting" or "Offline — N changes saved on this
  phone" without blocking anything.
- **Shared logic, used for real** — `shared/validation.js` checks the forms and the quiz
  question count, `shared/parseFlashcardImport.js` parses the pasted rows, and
  `shared/generateQuiz.js` builds the quiz. Imported, never copied.
- **401 handling in one place** — the client runs the session's `forget()` whenever an
  authenticated request comes back 401 (but never for a failed sign-in), so a screen shows
  "signed out" instead of a flashcard error.

## Prerequisites

| Need | Version | Check with |
| --- | --- | --- |
| Node.js | **20.19+ or 22.12+** (same as the website) | `node -v` |
| Expo Go on your phone | latest from the app store | — |

The phone and this PC must be on the **same Wi-Fi**. Nothing is installed on the phone: Expo
Go is a viewer, and the JavaScript is served from this machine.

## Run it

The app signs in against the API, so the API must be running and the app must be told where
it is. Three steps:

```powershell
# 1. the API, on every interface so a phone can reach it
cd backend; php artisan serve --host=0.0.0.0 --port=8001

# 2. tell the app where that is (once) — the PC's LAN address, never "localhost"
cd ..\mobile
Copy-Item .env.example .env      # then edit EXPO_PUBLIC_API_URL

# 3. start the app
npm install                      # once
npm start                        # Expo dev server on port 8081
```

Without `mobile/.env` the login screen says the address is missing instead of failing in a
confusing way. Then scan the QR code in the terminal:

- **Android** — open Expo Go and use its *Scan QR code* button.
- **iPhone** — point the Camera app at the code.

If the phone cannot reach the PC, use the tunnel: `npm start -- --tunnel`.

To bundle without a device (this is how each phase is checked):

```bash
npm run export     # runs `expo export`, which writes dist/
```

## Where the shared code lives

`../shared/` — imported directly (`../../../shared/validation.js` from a screen, since a
screen sits three folders deep), **never copied into this package**, so the app and the
website cannot drift apart. Metro only needs to be told the folder exists:

```js
// mobile/metro.config.js
config.watchFolders = [path.resolve(__dirname, "..", "shared")];
```

That file deliberately keeps the website's `node_modules` off the resolver path, so the app
can never pull a web dependency by accident.

| Shared module | Used by the website | Used by the app |
| --- | --- | --- |
| `shared/generateQuiz.js` | quiz questions | quiz (Phases G–H) |
| `shared/parseFlashcardImport.js` | paste-to-import | paste-to-import (Phases F–H) |
| `shared/validation.js` | login / register / quiz count | login / register / quiz count |

## How the local database and sync behave

Reads never touch the network; writes are local first and queued. The engine pushes the queue
oldest-first, then reconciles from the API — which stays the source of truth.

| Moment | What happens |
| --- | --- |
| Any local write | The mirror is updated, the change is queued, and a sync is scheduled (debounced, so a burst of edits is one run) |
| A set screen opens | That set's cards are re-read from the API |
| App start, sign-in, pull-to-refresh | Push the queue, then the full sets list, then the cards of any set whose cards are older than five minutes |
| No connection | Everything keeps working from the mirror; the queue is kept and retried with backoff (5 s, doubling to a minute); the token is never cleared |
| A 401 | The sync stops, the session signs out, and **the queue is kept** for the next sign-in |
| The server no longer has a record | That one queued change is dropped, the local row goes with it, and the status line says so — the rest of the queue still drains |
| The same record changed in two places | The phone's queued change is pushed **before** the pull, so it wins; otherwise the server decides |

Two limits, stated plainly. A queued **create** for a *set* goes through `POST /import`, which
is retry-safe; `/import` however skips a set *and everything inside it* when the set already
exists, so queued **cards** are created one at a time through the regular card route, with an
existence check after a failed attempt (a retry can collide with the copy that already landed,
which the API answers with a 500). And a background sync refreshes a set's cards only when they
are older than five minutes, so a card changed on another device shows up within that window for
sets you have not opened; opening the set or pulling to refresh always fetches it.

## What the app needs, and what it does not

The API is needed for exactly two things: **signing in for the first time** and
**synchronizing**. Everything else — opening the app, staying signed in, reading sets and cards,
studying, quizzing, and creating, editing or deleting anything — runs from SQLite with no
network at all.

| Situation | What happens |
| --- | --- |
| First ever launch on this phone | Nothing is stored, so the login screen is the only screen. Signing in needs the API: there is no account to load locally yet. |
| Launch with a stored session, API unreachable | Home, from SQLite. No spinner waiting on a request, no "Can't reach the server", no login screen. The status line reads *Offline — N changes saved on this phone*. |
| Launch with a stored session, API reachable | Home from SQLite immediately, then a sync in the background. |
| Offline, then the connection returns | The engine retries with backoff (5 s, doubling to a minute), and syncs whenever the app returns to the foreground, whenever a screen takes focus, and whenever **Sync Now** is pressed. |
| 30 days after signing in | The session is over: the login screen with *"Session expired. Please connect to the server and log in again."* The local sets and cards stay on the phone. |
| Any request answered 401 | The same ending, decided by the server: signed out, *"Session expired. Please log in again."* The queue is kept. |

### The 30-day rule, without a fake timer

`backend/config/sanctum.php` sets `'expiration' => 60 * 24 * 30`, and Sanctum refuses a bearer
token more than 30 days after it was **created** — not after its last use. The app mirrors that
one number in `src/lib/auth/sessionPolicy.js` and records `issuedAt` when it signs in, so an
offline phone reaches the same verdict the server would. `npm test` reads
`backend/config/sanctum.php` and fails if those two ever drift apart.

Two deliberate details: a session with **no** recorded sign-in time is never expired locally —
the server is left to judge rather than the app guessing — and the clock is never reset by using
the app, because Sanctum does not reset it either. Being offline is never a reason to sign
somebody out.

To watch the expiry path without waiting a month, either set
`EXPO_PUBLIC_SESSION_TTL_DAYS` for a test build (see `.env.example`), or age the token row on the
server — `UPDATE personal_access_tokens SET created_at = NOW() - INTERVAL 31 DAY` — and press
*Sync Now*: that is the real Sanctum rule answering 401, which is the honest half of the test.

### How a conflict is settled

Push first, then pull, with one rule: **a record with something queued keeps its local value.**
The queue drains oldest-first before anything is read back, and reconciliation skips any record
that still has a queued change; the mirror's own SQL also refuses to remove a row the outbox
still points at, so a write that lands mid-sync cannot be swept away either. Everything else
takes the server's copy. In practice:

* **both sides created a set** → both survive: the phone's create is pushed, the server's arrives;
* **both sides edited the same card** → the phone's queued edit is pushed first, so it lands last
  and wins; a later pull still brings back whatever the server then holds;
* **the server deleted it** → that one queued change is dropped with a note on the status line,
  and the local row goes with it — the rest of the queue keeps draining.

Nothing is discarded silently: a queued change is removed only once the server has accepted it,
or once the server has said it can never succeed (a 404 or a 422, which the status line reports).

### Checking the rules without a phone

```powershell
cd mobile
npm test        # node --test tests/*.test.mjs — 15 checks, no device, no API
```

`tests/session.test.mjs` covers the launch rules — offline restore with **zero** requests, the
day-29/day-31 boundary, a first-ever launch, a rejected token, the upgrade from the old
token-only store, and signing out with no server. `tests/sync.test.mjs` covers the sync promises
above, driving the real engine against an in-memory mirror, outbox and server. This is possible
because the modules take their storage and API as arguments: `authSession` and `syncEngine` need
neither React nor Expo.

## Layout, and where each later phase lands

```text
mobile/
├── App.js                  shell: providers, auth stack vs app stack      (Phases D–E)
├── index.js                Expo entry point                               (Phase D)
├── app.json                Expo app config                                (Phase D)
├── metro.config.js         watches ../shared                               (Phase D)
├── src/
│   ├── theme/tokens.js     design tokens as plain values                   (Phase D)
│   ├── lib/api/            client.js (fetch, envelope, 401 hook), authApi.js,
│   │                       flashcardApi.js (+ the 500-row cap)             (Phases E–H)
│   ├── lib/auth/           session.js (React, resume-sync), authSession.js
│   │                       (offline rules), tokenStorage.js (SecureStore),
│   │                       sessionPolicy.js (the 30 days)              (Phases E, I)
│   ├── lib/db/             schema.js, database.js, mirror.js, outbox.js     (Phase H)
│   ├── lib/sync/           syncEngine.js — push the queue, then reconcile   (Phase H)
│   ├── lib/local/          setup.js + useLocal.js — the stack, wired once   (Phase H)
│   ├── lib/data/           useSets.js, useCards.js, localSets.js,
│   │                       localCards.js, quizResults.js, useSyncStatus.js  (Phases F–H)
│   ├── components/         Screen, Field, Button, Notice, FormSheet,
│   │                       RadioOption, SetCard, CardRow, SetFormModal,
│   │                       CardFormModal, ImportModal, StudyCard,
│   │                       StudySettingsModal, QuizSetup, QuizTakingView,
│   │                       QuizResultsView, SyncStatus                     (Phases E–H)
│   ├── screens/            Loading, Login, Register, Home, SetDetail,
│   │                       Study, Quiz                                    (Phases D–G)
├── tests/                  session.test.mjs, sync.test.mjs — the offline
│                           and conflict rules, runnable with `npm test`     (Phase I)
└── .env.example            EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SESSION_TTL_DAYS (Phase D)
```

| Phase | Adds |
| --- | --- |
| D ✅ | Expo shell, navigation, theme tokens, `../shared` wired up |
| E ✅ | API client + authentication: login / create account / logout / session restore, token in `expo-secure-store` |
| F ✅ | Sets and cards: list, open, create, edit, delete, TAB import |
| G ✅ | Study Mode (flip, navigation, grading through `PATCH /cards/{id}`) and Quiz (setup, A–D questions, score, two-section review), the 500-row import cap, and fresh titles/counts when returning from a set |
| H ✅ | The local database and offline mode: an `expo-sqlite` mirror, an outbox, the sync/reconciliation engine, the on-screen sync status, and the read-path split (local reads, queued writes) |
| I ✅ | Offline-first sessions and sync triggers: a launch that never needs the API, the cached profile + 30-day rule mirroring Sanctum, "Session expired" handling, sync on resume and a manual **Sync Now**, the documented conflict rule, and `npm test` for the offline rules |
| next | To be decided — candidates: the `/import` card-create gap on the API, background/periodic sync, or release documentation |

## Running against the API (from Phase E)

```powershell
# 1. the API, on every interface so the phone can reach it
cd backend; php artisan serve --host=0.0.0.0 --port=8001

# 2. your PC's LAN address, e.g. 192.168.254.105
ipconfig

# 3. point the app at it
Copy-Item mobile\.env.example mobile\.env            # then edit EXPO_PUBLIC_API_URL
```

**Windows Firewall blocks this by default.** Inbound traffic on TCP 8001 has no allow rule
after a fresh install, so the phone will time out until one exists. Run in an elevated
PowerShell once:

```powershell
New-NetFirewallRule -DisplayName "cards API (dev, TCP 8001)" `
  -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow -Profile Private
```

Android emulator instead of a phone: use `http://10.0.2.2:8001/api` as `EXPO_PUBLIC_API_URL`
(`10.0.2.2` is the emulator's name for the host PC). The emulator is a fallback; the real
phone is the primary workflow.

### Over USB instead of Wi-Fi (`adb reverse`)

When the phone's Wi-Fi cannot reach this PC, run everything over the cable instead. Plug the
phone in with USB debugging on, make sure `adb devices` lists it as `device` (on Windows that
can need a driver — see the troubleshooting table), then:

```powershell
adb reverse tcp:8001 tcp:8001     # the phone's 127.0.0.1:8001 -> this PC's API
adb reverse tcp:8081 tcp:8081     # the phone's 127.0.0.1:8081 -> this PC's Metro
adb reverse --list
```

With that in place the phone's own `127.0.0.1` *is* this PC, so point `mobile/.env` at
`http://127.0.0.1:8001/api`, and start Metro in localhost mode — with the IPv4 loopback
forced, so the tunnel can actually reach it:

```powershell
cd mobile
$env:NODE_OPTIONS='--dns-result-order=ipv4first'
npx expo start --localhost -c
```

The QR code then reads `exp://127.0.0.1:8081`, which Expo Go opens over the cable. No Wi-Fi,
no firewall rule, and the app cannot tell the difference from a LAN setup. The QR can be
skipped entirely:

```powershell
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081"
```

The two mappings live only as long as the phone stays connected: re-run them after a re-plug
or an `adb kill-server`.

## Building an installable APK (local, no EAS)

`npx expo prebuild` + Gradle produces a standalone APK — no Expo Go, no Metro, no Expo
account, nothing uploaded anywhere. `mobile\build-release-apk.bat` runs the whole thing:

```powershell
cd mobile
.\build-release-apk.bat
```

Under the hood that is:

```powershell
$env:JAVA_HOME = 'C:\Users\daryl\jdk21\jdk-21.0.12.1+1'   # JDK 21 — see the troubleshooting table
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npx expo prebuild -p android                              # only when native config changes
cd android
.\gradlew.bat assembleRelease
```

The result is `mobile\android\app\build\outputs\apk\release\app-release.apk` (about 81 MB, all
four ABIs), signed with the debug keystore the template ships. That is fine for installing on
your own phone and is *not* publishable — that would need a real keystore and the release
build type pointed at it.

Install it over the cable:

```powershell
adb devices                      # must list the phone as `device`
adb install -r "mobile\android\app\build\outputs\apk\release\app-release.apk"
```

The JS bundle is built into the APK, so the installed app needs **no Metro and no `tcp:8081`
tunnel** — only the API:

```powershell
cd backend; php artisan serve --host=0.0.0.0 --port=8001      # terminal 1
adb reverse tcp:8001 tcp:8001                                 # terminal 2, once per plug-in
adb shell am start -n com.eziothepsycho.cards/.MainActivity    # or just tap the icon
```

With no tunnel the app still works: reads come from the SQLite mirror and changes queue in the
outbox until the cable (and the API) are back.

Three build facts worth knowing, each enforced by a file in this folder:

- `app.json` sets `android.package` (`com.eziothepsycho.cards`) and switches on
  `usesCleartextTraffic` through `expo-build-properties`. Without that second part Android 9+
  would refuse plain-HTTP `http://127.0.0.1:8001` in a **release** build — the template only
  allows cleartext in *debug*.
- `plugins/withGradleSafeProjectName.js` gives Gradle a project name it accepts, because this
  app is branded "cards." and Gradle 9 rejects names that end with a dot.
- The build runs on **JDK 21**: AGP's Prefab step treats the "restricted method" warning that
  JDK 24+ prints as a failure, so Android Studio's bundled JBR (25) cannot build it.

Re-running `npx expo prebuild` re-applies the app.json plugins, so the build stays reproducible.

## Troubleshooting (development)

Three things bit me while building this, all of them environment rather than app:

| Symptom | Cause | Fix |
| --- | --- | --- |
| `assembleRelease` fails on `:app:configureCMakeRelWithDebInfo[…]` with `A restricted method in java.lang.System has been called` | AGP runs the Prefab step in a JVM and treats any stderr from it as an error; JDK 24+ prints that warning, and Android Studio's bundled JBR is 25 | Build with JDK 21 (what `build-release-apk.bat` pins) |
| Gradle fails with `The project name 'cards.' must not start or end with a '.'` | Gradle 9 rejects the project name `expo prebuild` derives from the "cards." brand | `plugins/withGradleSafeProjectName.js` rewrites `rootProject.name` to `cards-mobile` during prebuild |
| `adb devices` hangs, or lists nothing although the phone is plugged in | A wedged adb server keeps stale USB handles (running two adb commands at once is a reliable way to cause it) | `taskkill /F /IM adb.exe`, wait ~8 s, `adb start-server`, then `adb devices`; replug the phone if it is still empty |
| A change to `mobile/.env` does not appear in the APK | Gradle's bundle task does not treat `.env` as an input, and the transform that inlines `EXPO_PUBLIC_*` stays in Metro's cache — so nothing re-runs and the old value is shipped | Delete `android/app/build/generated/assets/react/release/index.android.bundle` and `%TEMP%\metro-cache`, then rebuild; confirm with `android/app/build/outputs/apk/release/app-release.apk` (a fresh bundle is ~1.7 MB and its mtime changes) |
| `adb devices` is empty even though Device Manager shows the phone | The phone's ADB interface (`…&MI_01`) advertises `USB\MS_COMP_WINUSB`, which outranks the generic ADB class ID, so Windows keeps its own WinUSB driver and never publishes the ADB interface GUID `adb` looks for | Bind Google's driver to that interface by hand — *Update driver → Let me pick from a list → Have Disk* → `Sdk\extras\google\usb_driver\android_winusb.inf`, untick *Show compatible hardware*, pick **Android ADB Interface**, *Yes* on the warning — or add `DeviceInterfaceGUIDs = {F72FE0D4-CBCB-407d-8814-9ED673D0DD6B}` under the interface's `Device Parameters` registry key and restart the device |
| Expo Go says "Something went wrong", and *View error log* shows `java.io.IOException: Failed to download remote update` | Metro bound to the **IPv6** loopback `::1` (Node ≥ 17 resolves `localhost` that way) while `adb reverse` forwards to the **IPv4** loopback | Start Metro with `$env:NODE_OPTIONS='--dns-result-order=ipv4first'`, then check `Get-NetTCPConnection -LocalPort 8081 -State Listen` reads `127.0.0.1` |
| The app worked, then stopped reaching Metro or the API after unplugging the phone | `adb reverse` mappings are dropped whenever the phone reconnects or the adb server restarts | Re-run `adb reverse tcp:8001 tcp:8001` and `adb reverse tcp:8081 tcp:8081`, then `adb reverse --list` |
| The app shows "Can't reach the server" | The API is not running, is bound to loopback only, or `mobile/.env` points at `localhost` | Start it with `--host=0.0.0.0`, point `EXPO_PUBLIC_API_URL` at the PC's LAN address, and allow TCP 8001 through the firewall |
| Every request hangs, even from `curl` | `php artisan serve` is **single-threaded**: one aborted request (a phone that slept, a Ctrl+C) can leave it stuck on that connection | Restart the API server |
| Laravel hangs on the first request and nothing is logged | MariaDB accepts TCP *before* it has finished starting, so the handshake never completes (`ERROR 2013 ... Lost connection ... at 'handshake'`) | Check with `mysql -u root -e "SELECT 1"` before starting the API, and make sure only one `mysqld` is running — a stale instance holding the data directory stops the next one starting cleanly |

The app itself reports these distinctly: a missing address is "No API address is
configured…", an unreachable server is "Can't reach the server. Check your connection and try
again.", and a rejected token quietly returns to the login screen.

## Not here on purpose

No deployment or hosting configuration of any kind, no app-store publishing, no CI, and no
second backend or database. This repository is meant to be cloned and run locally.
