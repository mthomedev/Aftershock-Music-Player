// =========================================================
// UTILS
// =========================================================
import { toastEl } from "./Dom.js";
import { state } from "./State.js";

export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("toast--visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(
    () => toastEl.classList.remove("toast--visible"),
    2200,
  );
}

export function isLiked(id) {
  return state.likedIds.includes(id);
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
