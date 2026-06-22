// =========================================================
// LIGHT / DARK THEME
// =========================================================
import { state, saveState } from "./State.js";
import * as dom from "./Dom.js";

export function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  dom.themeToggle.textContent = state.theme === "light" ? "☀" : "☾";
  dom.themeToggle.setAttribute(
    "aria-pressed",
    String(state.theme === "light"),
  );
}

dom.themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  saveState();
  applyTheme();
});
