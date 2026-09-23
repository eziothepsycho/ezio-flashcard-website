# Migration

Moving the data that already exists in browsers (yours and your friends') into
the backend — without losing anything and without breaking the website while it
happens.

**Nothing here runs until Phase 8.** Phase 0 only takes the backup.

## Step 0 — back up first (do this now)

The data lives in the browser, so the shell cannot read it: run this in the
browser console on the site (or use DevTools → **Application** → **Local
Storage** → `http://localhost:5173` and copy the two values by hand).

Counts first, so you know what "correct" looks like:

```js
const data = JSON.parse(localStorage.getItem("flashcardApp:data") ?? "null");
const auth = JSON.parse(localStorage.getItem("flashcardApp:auth") ?? "null");
console.table([{
  sets:  data?.sets?.length  ?? 0,
  cards: data?.cards?.length ?? 0,
  users: auth?.users?.length ?? 0,
}]);
```

Then save a full JSON dump (it downloads a file — move it into `backups/`, which
is git-ignored because it contains real accounts and password hashes):

```js
(() => {
  const dump = {
    exportedAt: new Date().toISOString(),
    origin: location.origin,
    data: JSON.parse(localStorage.getItem("flashcardApp:data") ?? "null"),
    auth: JSON.parse(localStorage.getItem("flashcardApp:auth") ?? "null"),
  };
  const counts = {
    sets: dump.data?.sets?.length ?? 0,
    cards: dump.data?.cards?.length ?? 0,
    users: dump.auth?.users?.length ?? 0,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `cards-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  console.log("Backed up:", counts);
})();
```

Putting it back, if anything ever goes wrong:

```js
(async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  const file = await new Promise((resolve) => {
    input.onchange = () => resolve(input.files[0]);
    input.click();
  });
  const dump = JSON.parse(await file.text());
  localStorage.setItem("flashcardApp:data", JSON.stringify(dump.data));
  localStorage.setItem("flashcardApp:auth", JSON.stringify(dump.auth));
  location.reload();
})();
```

## What can and cannot move

| Data | Moves? | Notes |
| --- | --- | --- |
| Sets (`sets[]`) | ✅ | ids and timestamps preserved |
| Cards (`cards[]`) | ✅ | including `learningStatus` (grading history) |
| Usernames | ✅ | same username on the backend |
| **Passwords** | ❌ | the local hash is `SHA-256(localSalt + ":" + password)` with a salt that never leaves the browser, so it cannot be verified or converted server-side |

So each person **re-enters their password once** when their account is created
(or first logs in) on the backend. That is a one-time, expected step — not data
loss. The sets and cards attached to that account move across intact.

## The runbook (implemented in Phase 8)

Steps 3–5 are now handled by the app itself; the rest is still worth doing by hand.

1. **Backend ready** — ✅ `/api/import` exists, is throttled like everything else, and is covered by `backend/tests/Feature/ImportTest.php`.
2. **Website switched** — ✅ accounts and flashcard CRUD both go through the API when `VITE_DATA_MODE=api`.
3. **Each person, on their own browser:**
   1. Log in on the website against the backend, using the same username as the
      local account (creating it the first time — the password is re-entered
      because the local hash cannot be reused).
   2. The dashboard shows a one-time notice:
      **"3 sets in this browser can be added to your account (12 flashcards)"**
      with an **Import 3 sets** button. Only sets owned by the local account with
      that username, plus any saved before accounts existed, are offered; sets
      belonging to a *different* local account on the device are named but left
      alone.
   3. Confirm → the client posts:
      ```json
      { "sets": [ { "id": "…", "title": "JavaScript", "description": "",
                    "createdAt": "…", "updatedAt": "…",
                    "cards": [ { "id": "…", "term": "let", "definition": "block scope",
                                 "learningStatus": "known",
                                 "createdAt": "…", "updatedAt": "…" } ] } ] }
      ```
      to `POST /api/import`.
   4. The server assigns `user_id` from the token, inserts everything in one
      transaction, keeps ids and timestamps, and answers
      `{ "importedSets": 3, "importedCards": 12, "skipped": 0 }`. Anything whose id
      is already stored is counted under `skipped` instead of taken over — so the
      same import can be run again safely.
4. **Verify** — the notice is replaced by a summary ("3 sets and 12 flashcards
   added to your account"), and the dashboard lists them.
5. **Record it** — the browser writes `flashcardApp:migratedAt`, so the offer is
   never made twice.
6. **Keep the old blob.** Untouched by design: it is the rollback path, local mode
   still works, and nothing was deleted.

### Implemented in Phase 8 — and verified

Checked against the live API with a browser's worth of local data (two local
accounts, a pre-account set, a graded card, an ungraded card):

| Check | Result |
| --- | --- |
| Plan | the local account is matched by username; its 2 sets plus the 1 pre-account set are offered; the other account's set is named and left behind; a different username offers only the pre-account set |
| Payload | ids, titles, descriptions and both timestamps sent as they were; grades included; an ungraded card sends **no** `learningStatus` key at all |
| Import | `{importedSets: 3, importedCards: 3, skipped: 0}`; the account then lists them oldest-first with the same ids and timestamps; grades intact; the pre-account set brought its card |
| Idempotent | a second run of the same payload → `{0, 0, skipped: 6}` and the account still lists exactly 3 sets |
| Isolation | the other local account's set never appears in the account, and a different backend account importing the same ids gets `skipped` rather than a takeover (covered by PHPUnit too) |
| Safety | the local `flashcardApp:data` and `flashcardApp:auth` blobs are **byte-for-byte unchanged** afterwards, and the failure cases (no auth, bad payloads) leave zero rows behind |

### Record of the migration

| Date | Sets | Cards | Users | Notes |
| --- | --- | --- | --- | --- |
| _pending_ | | | | fill in after the Step 0 backup |

## Rollback

- Flip `dataMode` back to `"local"` in `data/config.js` — the website instantly
  returns to the untouched localStorage data.
- Or paste a dump back with the restore snippet above.
- Server-side data created after the migration can be exported per account; the
  old blob stays valid either way.

## Edge cases to handle

- **Sets with no cards** — import the set, skip nothing, report 0 cards.
- **Duplicate titles** — allowed (they are allowed today); no unique constraint.
- **Two local accounts in one browser** — import per account, after each logs in.
- **`legacy-local-device` sets** (created before accounts existed) — the first
  account that runs the import claims them, exactly like today's `adoptUnclaimedSets`,
  and the import summary says how many were claimed.
- **Cards whose `setId` is missing** — skip and count them under `skipped`; never
  invent a set.
- **Very large accounts** — `/api/import` accepts everything in one body today;
  if a payload ever gets unwieldy, chunk by set and keep the same shape.