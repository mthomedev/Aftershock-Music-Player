// =========================================================
// NAVIGATION (Home / Liked)
// =========================================================
import { runtime } from "./Store.js";
import * as dom from "./Dom.js";
import { getGreeting } from "./Utils.js";
import { renderPlaylists } from "./Playlists.js";
import { applyFilters } from "./TrackList.js";

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    runtime.currentView = link.dataset.view;
    runtime.activePlaylist = null;
    document
      .querySelectorAll(".nav-link")
      .forEach((l) => l.classList.remove("nav-link--active"));
    link.classList.add("nav-link--active");
    dom.heroTitleEl.textContent =
      runtime.currentView === "liked" ? "Your liked tracks" : getGreeting();
    dom.heroSubtitleEl.textContent =
      runtime.currentView === "liked"
        ? "Tracks you've marked with ♥"
        : "Pick up where you left off";
    renderPlaylists();
    applyFilters();
  });
});

// =========================================================
// SEARCH
// =========================================================
dom.searchForm.addEventListener("submit", (e) => e.preventDefault());
dom.searchInput.addEventListener("input", applyFilters);
