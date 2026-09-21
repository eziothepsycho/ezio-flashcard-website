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

## The runbook (Phase 8)

1. **Backend ready** — Phase 3–4 done; `/api/import` exists and is tested with curl.
2. **Website switched** — Phase 6–7 done, so login and CRUD already go through the API.
3. **Each person, on their own browser:**
   1. Log in on the website against the backend with the same username (creating
      the account with the same password the first time).
   2. The site detects local data for that account and offers
      **"Import my local sets (N)"** — shown only when the local blob still has
      sets for that user (or `legacy-local-device` sets).
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
      transaction, and returns `{ importedSets, importedCards, skipped }`.
4. **Verify** — compare the counts from Step 0 with the site's set/card counts and
   spot-check one set with graded cards.
5. **Record it** — write `flashcardApp:migratedAt` so the importer is never
   offered twice, and note the counts in this file (below).
6. **Keep the old blob.** It is the rollback path and costs a few kilobytes.

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