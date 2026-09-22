// Which source of truth the app reads and writes.
//
//   "local" — the browser's localStorage (data/storage.js), as the site has
//             always worked
//   "api"   — the backend (src/api/*), shared with the future mobile app
//
// Phase 5 ships with "local": the API layer exists and is verified, but nothing
// in the UI uses it yet, so the live website behaves exactly as before. Phases 6
// and 7 flip this, one screen at a time.
export const dataMode = "local";
