// =========================================================
// PERSISTED STATE (localStorage)
// =========================================================
const STORAGE_KEY = "tonal-state-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no state");
    return JSON.parse(raw);
  } catch {
    return {
      likedIds: [],
      playlists: { Favorites: [], Focus: [] },
      theme: "dark",
      volume: 80,
      lastTrackId: null,
      lastPosition: 0,
    };
  }
}

export const state = loadState();
export const likedSet = new Set(state.likedIds);

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
