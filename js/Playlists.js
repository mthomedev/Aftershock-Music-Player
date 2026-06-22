// =========================================================
// RENDER: PLAYLISTS (sidebar)
// =========================================================
import { runtime } from "./Store.js";
import { state, saveState } from "./State.js";
import * as dom from "./Dom.js";
import { getGreeting, showToast } from "./Utils.js";
import { applyFilters } from "./TrackList.js";

export function renderPlaylists() {
  dom.playlistListEl.innerHTML = Object.entries(state.playlists)
    .map(
      ([name, ids]) => `
    <li class="playlist-list__item ${runtime.currentView === "playlist" && runtime.activePlaylist === name ? "playlist-list__item--active" : ""}" data-playlist="${name}">
      <button class="playlist-list__open" type="button" data-open-playlist="${name}">
        <span>${name}</span>
        <span class="playlist-list__count">${ids.length}</span>
      </button>
      <button class="playlist-list__delete" type="button" data-delete-playlist="${name}" aria-label="Delete playlist ${name}">✕</button>
    </li>
  `,
    )
    .join("");

  dom.playlistListEl
    .querySelectorAll("[data-open-playlist]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        runtime.currentView = "playlist";
        runtime.activePlaylist = button.dataset.openPlaylist;
        document
          .querySelectorAll(".nav-link")
          .forEach((l) => l.classList.remove("nav-link--active"));
        dom.heroTitleEl.textContent = runtime.activePlaylist;
        dom.heroSubtitleEl.textContent = "Tracks in this playlist";
        renderPlaylists();
        applyFilters();
      });
    });

  dom.playlistListEl
    .querySelectorAll("[data-delete-playlist]")
    .forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = button.dataset.deletePlaylist;
        if (!confirm(`Delete the playlist "${name}"?`)) return;
        delete state.playlists[name];
        saveState();
        if (runtime.currentView === "playlist" && runtime.activePlaylist === name) {
          runtime.currentView = "home";
          runtime.activePlaylist = null;
          dom.heroTitleEl.textContent = getGreeting();
          dom.heroSubtitleEl.textContent = "Pick up where you left off";
          applyFilters();
        }
        renderPlaylists();
      });
    });

  dom.playlistListEl
    .querySelectorAll(".playlist-list__item")
    .forEach((item) => {
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        item.classList.add("drag-over");
      });
      item.addEventListener("dragleave", () =>
        item.classList.remove("drag-over"),
      );
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        item.classList.remove("drag-over");
        const draggingRow = document.querySelector(
          ".track-list__row--dragging",
        );
        if (!draggingRow) return;
        const id = draggingRow.dataset.id;
        const name = item.dataset.playlist;
        if (!state.playlists[name].includes(id)) {
          state.playlists[name].push(id);
          saveState();
          renderPlaylists();
          showToast(`Added to "${name}"`);
        }
      });
    });
}

dom.newPlaylistButton.addEventListener("click", () => {
  const name = prompt("New playlist name:");
  if (name && !state.playlists[name]) {
    state.playlists[name] = [];
    saveState();
    renderPlaylists();
  }
});
