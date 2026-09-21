# cards.

A dark-mode flashcard study app — create sets, study them two different ways, and quiz yourself. No accounts, no backend: everything lives in your browser's localStorage.

> Your flashcard sets, studied your way.

**Coming soon:** a mobile app for iOS and Android.

## Features

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
| Persistence | `localStorage` (no server, no database, no auth) |
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
│   └── db.js                   # data access layer: all set/card CRUD lives here
├── utils/
│   ├── generateQuiz.js         # builds multiple-choice questions + distractors
│   ── parseFlashcardImport.js # parses TAB-separated import text, reports bad rows
└── components/
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

**Navigation.** There's no router. `App.jsx` holds the active set id in state and swaps between the dashboard and the set view; `SetDetail.jsx` uses a `mode` field (`list` → `study` → `quiz-setup` → `quiz` → `quiz-results`) to swap the screen inside a set.

**Data model.** `localStorage` holds one JSON blob under the key `flashcardApp:data` with two flat arrays, linked by id:

```js
{
  sets:  [{ id, title, description, createdAt, updatedAt }],
  cards: [{ id, setId, term, definition, learningStatus, createdAt, updatedAt }]
}
```

Ids are `crypto.randomUUID()`; timestamps are ISO strings. `learningStatus` is `"known"` or `"learning"` (absent means the card hasn't been graded). Reads and writes go through `src/data/db.js` only — nothing else touches storage directly. If the saved data is corrupt or unreadable, the app logs the problem and starts fresh instead of crashing.

**Design.** A dark, near-monochrome palette with a single lime accent, generous spacing, and visible keyboard focus rings. Colours, spacing, and radii are all CSS variables in `src/index.css`, so re-theming means editing one block. Motion respects `prefers-reduced-motion`.

## Notes and limitations

- All data is local to one browser and one device — clearing site data wipes your sets, and there's no export or sync yet.
- Quizzes need at least 4 flashcards so there are enough distinct definitions to build distractors (the Quiz button is disabled with an explanatory tooltip below that).
- Distractors fall back to repeat definitions if a set has more than one card sharing the same definition text.
- No test suite yet; correctness is currently verified by running the app and the build.

## Possible next steps

- A mobile app for iOS and Android
- Export / import sets as JSON for backup and sharing
- Spaced-repetition scheduling instead of a binary known / still-learning flag
- Search, sorting, and shuffling for large sets
- Light theme toggle
