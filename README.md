# cards.

A dark-mode flashcard study app — sign in, create sets, study them two different ways, and quiz yourself. Accounts are just a username and a password, and everything lives in your browser's localStorage: no backend, no email, no personal details.

> Your flashcard sets, studied your way.

**Coming soon:** a mobile app for iOS and Android.

## Features

### Accounts
- Register with **a username and a password, nothing else** — no email, phone, name or profile information.
- Passwords are masked as you type, with a **Show / Hide** control on each field if you want to check what you typed.
- Every account has its own sets and flashcards. You only ever see your own.
- Stay signed in between visits; **Log out** clears the session and returns you to the Login screen.
- Sets saved before accounts existed are handed to the first account created on that device — nothing is ever deleted.

### Flashcard sets
- Create, rename, and delete sets (each with an optional description).
- Deleting a set cascades — every flashcard inside it goes with it.
- The dashboard shows all sets as a grid, with an empty state when you're just getting started.

### Flashcards
- Add, edit, and delete individual cards (term + definition).
- Card list shows a learning-status badge once a card has been graded: **I know this** or **Still learning**.
- Bulk import: paste term-and-definition pairs straight out of a spreadsheet (TAB-separated, one per line), preview the parsed rows, and fix any bad lines before saving.

### Study Mode — two sorting styles
- **Browsing** — standard flipping. Click the card to flip it and step through with **Previous** / **Next**. Pressing **Next** on the last card finishes the session (the button takes the primary style there) and goes straight to a summary screen with **Restart Flashcards** and **Back to Home**.
- **Basic sorting** — traditional sorting. Grade each card as **I Know This** or **I Don't Know This**; statuses are saved to the card and persist between visits. When you run out of cards you get a completion summary with **Study Cards I Don't Know** (a focused review session built from your "still learning" cards), **Restart All Cards**, and **Back to Home**. Every round ends on that summary — including each review round — so another round only starts when you ask for one.
- **Options panel** — switch sorting style on the fly and choose whether the **term** or the **definition** sits on the front of the card.
- **Fullscreen** — the **⛶** control in the session header hands the study view to the browser's native Fullscreen API, so the card and its controls fill the screen. Esc (or the button again) returns to the normal layout with the card, session and statuses exactly as they were. Where the browser has no element fullscreen (e.g. iOS Safari), the control isn't shown.

### Quizzes
- Choose the question direction: **Term → Definition** or **Definition → Term** — whichever side is asked, the other side is the answer.
- Choose how many questions you want: any whole number from 1 up to the number of cards in the set (defaults to 10, or the full set when it's smaller).
- Multiple-choice: each question shows the prompt with the correct answer plus three shuffled distractors from the same set, labelled A–D.
- Results screen shows your score, a correct/incorrect breakdown, and a full review of every answer, highlighting the ones you missed.

## Tech stack

| Concern | Choice |
| --- | --- |
| UI | React 19 (function components + hooks) |
| Build | Vite 8 |
| Styling | Plain CSS, one stylesheet per component, CSS custom properties for theming |
| Lint | Oxlint |
| Persistence | `localStorage` — flashcard data in `flashcardApp:data`, accounts in `flashcardApp:auth` |
| Auth | Local accounts: username + salted SHA-256 hash (not production-grade — see limitations) |
| Fonts | Fraunces (display) + Inter (body), via Google Fonts |

## Getting started

```bash
npm install
npm run dev      # start the dev server with HMR
npm run build    # production build into dist/
npm run preview  # preview the production build
npm run lint     # run Oxlint
```

## Project structure

```
src/
├── App.jsx                     # app shell; decides between dashboard and set view
├── App.css / index.css         # global styles, design tokens, shared .btn styles
├── data/
│   ├── storage.js              # thin localStorage wrapper (load/save, corrupt-data recovery)
│   ├── db.js                   # data access layer: user-scoped set/card CRUD lives here
│   ├── auth.js                 # account logic: validation, password hashing, current session
│   └── useAuth.js              # the only React binding for auth.js: { user, register, login, logout }
├── utils/
│   ├── generateQuiz.js         # builds multiple-choice questions + distractors
│   ── parseFlashcardImport.js # parses TAB-separated import text, reports bad rows
└── components/
    ├── AuthScreen.jsx          # Login / Create account
    ├── Dashboard.jsx           # grid of sets, "New set"
    ├── SetCard.jsx             # single set tile
    ├── SetDetail.jsx           # set view; routes between list / study / quiz screens
    ├── FlashcardList.jsx       # card list with edit + delete
    ├── CardFormModal.jsx       # add/edit a flashcard
    ├── SetFormModal.jsx        # add/edit a set
    ├── ImportModal.jsx         # paste → preview → import flow
    ├── StudyMode.jsx           # browsing, basic sorting, options panel, completion screens
    ├── QuizSetup.jsx           # choose number of questions
    ├── QuizTaking.jsx          # question-by-question quiz UI
    └── QuizResults.jsx         # score summary + answer review
```

## How it works

**Navigation.** There's no router. `App.jsx` holds the active set id in state and swaps between the dashboard and the set view; `SetDetail.jsx` uses a `mode` field (`list` → `study` → `quiz-setup` → `quiz` → `quiz-results`) to swap the screen inside a set. `AuthScreen.jsx` works the same way (`login` ⇄ `register`), and while nobody is signed in it is the only screen `App.jsx` renders.

**Data model.** `localStorage` holds two JSON blobs. Flashcard content keeps the shape it has always had, under `flashcardApp:data` — two flat arrays, linked by id:

```js
{
  sets:  [{ id, userId, title, description, createdAt, updatedAt }],
  cards: [{ id, setId, term, definition, learningStatus, createdAt, updatedAt }]
}
```

`userId` is the owner. Sets belong to an account, and a card inherits its owner from the set it sits in (`card.setId → set.userId`), so cards never need an owner field of their own. Accounts and the session live separately under `flashcardApp:auth`:

```js
{
  users: [{ id, username, usernameLower, passwordHash, salt, createdAt }],
  sessionUserId: "…" | null
}
```

Ids are `crypto.randomUUID()`; timestamps are ISO strings. `learningStatus` is `"known"` or `"learning"` (absent means the card hasn't been graded). Writes go through `src/data/db.js` (sets and cards) and `src/data/auth.js` (accounts) only — nothing else touches storage directly. If a blob is corrupt or unreadable, the app logs the problem and falls back to empty instead of crashing.

**Accounts.** Registering needs a username and a password and nothing else. Usernames are unique case-insensitively and limited to 3–20 letters, numbers or underscores; passwords are salted and hashed with SHA-256 before they are stored, and both password fields are `type="password"`. Every `db.js` function takes a `userId` and refuses to read or change anything owned by somebody else, so one account can never see another's sets. That filtering lives in the data layer — the dashboard just renders whatever it is handed. `useAuth()` is the only bridge between React and `auth.js`.

**Sets saved before accounts existed.** Legacy sets have no owner, so on load they are tagged with a `legacy-local-device` sentinel that matches no account: invisible, but never deleted. The first account created on that device adopts them and sees a one-off note saying how many sets were moved; later accounts start empty.

**Design.** A dark, near-monochrome palette with a single lime accent, generous spacing, and visible keyboard focus rings. Colours, spacing, and radii are all CSS variables in `src/index.css`, so re-theming means editing one block. Motion respects `prefers-reduced-motion`.

## Notes and limitations

- All data is local to one browser and one device — clearing site data wipes your sets, and there's no export or sync yet.
- **The account system is not secure authentication.** Accounts, hashes and sets all sit in `localStorage`, readable and editable from the browser's dev tools: anyone who can open them can point `sessionUserId` at another account, and nothing on a server checks anything. It is a friendly username/password experience for a personal project — not a security boundary.
- Client-side SHA-256 keeps passwords out of plain sight, but it is not password security: it is fast, unthrottled and verified locally. Real authentication needs server-side hashing (argon2/bcrypt), TLS and rate limiting.
- There is no password recovery. With no email address on file, a forgotten password means that account's sets can't be opened (they are not deleted).
- Accounts are per browser, so the same username on another device is a different, empty account.
- Quizzes need at least 4 flashcards so there are enough distinct definitions to build distractors (the Quiz button is disabled with an explanatory tooltip below that).
- Distractors fall back to repeat definitions if a set has more than one card sharing the same definition text.
- No test suite yet; correctness is currently verified by running the app and the build.

## Possible next steps

- A backend that owns accounts and data, so the website and a mobile app can share one login (username + password → hashed server-side → user-owned records). `auth.js` and `db.js` were written for exactly that swap: their bodies become `fetch` calls while the UI keeps calling the same functions.
- A mobile app for iOS and Android, signing in with the same accounts as the website

## Planning & docs

The backend and mobile-app plan lives in [`docs/`](./docs):

| Document | Contents |
| --- | --- |
| [`architecture.md`](./docs/architecture.md) | target architecture, the rules that always hold, repo layout, reuse map |
| [`database.md`](./docs/database.md) | MySQL schema, ownership queries, mapping from the current localStorage model |
| [`api.md`](./docs/api.md) | endpoints, payloads, error shapes, website integration notes |
| [`migration.md`](./docs/migration.md) | back up localStorage, then move it to the backend |
| [`roadmap.md`](./docs/roadmap.md) | the phases and where we are |
- Export / import sets as JSON for backup and sharing
- Spaced-repetition scheduling instead of a binary known / still-learning flag
- Search, sorting, and shuffling for large sets
- Light theme toggle
