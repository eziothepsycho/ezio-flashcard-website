// Thin wrapper around localStorage so the rest of the app
// never touches JSON.parse/stringify directly.

const STORAGE_KEY = "flashcardApp:data";

// Shape of everything we persist. Sets and cards are kept as
// separate flat arrays (like two simple tables), linked by id.
const EMPTY_STATE = {
  sets: [],
  cards: [],
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw);
    return {
      sets: Array.isArray(parsed.sets) ? parsed.sets : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
    };
  } catch (err) {
    // Corrupt or unreadable data shouldn't crash the app —
    // start fresh instead.
    console.error("Failed to load saved data, starting empty:", err);
    return { ...EMPTY_STATE };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}