// Which source of truth the app reads and writes.
//
//   "local" — the browser's localStorage (data/storage.js), as the site has
//             always worked
//   "api"   — the backend (src/api/*), shared with the future mobile app
//
// Only the exact value "api" switches the app over; anything else — unset,
// "local", or a typo — keeps the safe default, so the committed site always runs
// on localStorage. To try the API path without changing anything permanent:
//
//   PowerShell:  $env:VITE_DATA_MODE="api"; npm run dev
//   bash:        VITE_DATA_MODE=api npm run dev
export const dataMode =
  import.meta.env?.VITE_DATA_MODE === "api" ? "api" : "local";

