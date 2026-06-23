// =========================================================
// RENDER: LIBRARY / TRACKS
// =========================================================
import { runtime, FALLBACK_COVER } from "./Store.js";
import { state, saveState } from "./State.js";
import * as dom from "./Dom.js";
import { isLiked, showToast } from "./Utils.js";
import { loadTrack, playAudio, syncLikeButton } from "./Player.js";
import { renderQueue } from "./Queue.js";
import { renderPlaylists } from "./Playlists.js";

export function getTracksForView() {
  if (runtime.currentView === "liked") {
    return runtime.tracks.filter((t) => isLiked(t.id));
  }
  if (runtime.currentView === "playlist" && runtime.activePlaylist) {
    const ids = state.playlists[runtime.activePlaylist] || [];
    return runtime.tracks.filter((t) => ids.includes(t.id));
  }
  return runtime.tracks;
}

export function applyFilters() {
  const base = getTracksForView();
  const query = dom.searchInput.value.trim().toLowerCase();
  runtime.visibleTracks = query
    ? base.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query),
      )
    : base;
  renderTrackList();
}

export function renderTrackList() {
  dom.libraryCountEl.textContent = runtime.visibleTracks.length
    ? `${runtime.visibleTracks.length} track${runtime.visibleTracks.length > 1 ? "s" : ""}`
    : "";
  dom.emptyStateEl.hidden = runtime.visibleTracks.length !== 0;

  dom.trackListEl.innerHTML = runtime.visibleTracks
    .map((track, index) => {
      const realIndex = runtime.tracks.findIndex((t) => t.id === track.id);
      const playing = realIndex === runtime.currentIndex;
      return `
    <li class="track-list__row ${playing ? "track-list__row--playing" : ""}" data-id="${track.id}" data-real-index="${realIndex}" draggable="true">
    <span class="track-list__index">${playing ? "" : index + 1}</span>
      <img class="track-list__cover" src="${track.cover}" alt="${track.title} cover art" onerror="this.src='${FALLBACK_COVER}'">
      <button class="track-list__play" type="button">
        <span class="track-list__info">
          <p class="track-list__name">${track.title}</p>
          <p class="track-list__artist">${track.artist}</p>
        </span>
      </button>
      <span class="track-list__duration">${isLiked(track.id) ? "♥" : ""}</span>
      <span class="track-list__menu-wrap">
        <button class="track-list__menu-button" type="button" data-menu-for="${track.id}" aria-haspopup="true" aria-expanded="false" aria-label="More options for ${track.title}">⋮</button>
        <div class="context-menu" id="menu-${track.id}" hidden role="menu">
          <button class="context-menu__item" type="button" data-action="queue" data-id="${track.id}" role="menuitem">Add to queue</button>
          <button class="context-menu__item" type="button" data-action="like" data-id="${track.id}" role="menuitem">${isLiked(track.id) ? "Remove from liked" : "Like"}</button>
          ${
            runtime.currentView === "playlist" && runtime.activePlaylist
              ? `<button class="context-menu__item" type="button" data-action="remove-playlist" data-id="${track.id}" role="menuitem">Remove from "${runtime.activePlaylist}"</button>`
              : ""
          }
          <hr class="context-menu__divider">
          ${Object.keys(state.playlists)
            .map(
              (name) => `
            <button class="context-menu__item" type="button" data-action="add-playlist" data-id="${track.id}" data-playlist="${name}" role="menuitem">Add to "${name}"</button>
          `,
            )
            .join("")}
        </div>
      </span>
    </li>
  `;
    })
    .join("");

  dom.trackListEl.querySelectorAll(".track-list__play").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".track-list__row");
      const realIndex = Number(row.dataset.realIndex);
      loadTrack(realIndex);
      playAudio();
    });
  });

  dom.trackListEl
    .querySelectorAll(".track-list__menu-button")
    .forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMenu(button.dataset.menuFor);
      });
    });

  dom.trackListEl.querySelectorAll(".context-menu__item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      handleMenuAction(
        item.dataset.action,
        item.dataset.id,
        item.dataset.playlist,
      );
      closeAllMenus();
    });
  });

  // Drag and drop into playlists
  dom.trackListEl.querySelectorAll(".track-list__row").forEach((row) => {
    row.addEventListener("dragstart", () => {
      row.classList.add("track-list__row--dragging");
      row.setAttribute("aria-grabbed", "true");
    });
    row.addEventListener("dragend", () =>
      row.classList.remove("track-list__row--dragging"),
    );
  });
}

export function toggleMenu(id) {
  const isOpening = runtime.openMenuId !== id;
  closeAllMenus();
  if (isOpening) {
    const menu = document.getElementById(`menu-${id}`);
    const button = document.querySelector(`[data-menu-for="${id}"]`);
    if (menu) {
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
      runtime.openMenuId = id;
    }
  }
}

export function closeAllMenus() {
  document.querySelectorAll(".context-menu").forEach((m) => (m.hidden = true));
  document
    .querySelectorAll(".track-list__menu-button")
    .forEach((b) => b.setAttribute("aria-expanded", "false"));
  runtime.openMenuId = null;
}

document.addEventListener("click", closeAllMenus);

export function handleMenuAction(action, id, playlistName) {
  const track = runtime.tracks.find((t) => t.id === id);
  if (!track) return;

  if (action === "queue") {
    runtime.queue.push(track);
    renderQueue();
    showToast(`"${track.title}" added to queue`);
  }
  if (action === "like") {
    toggleLike(id);
  }
  if (action === "add-playlist") {
    if (!state.playlists[playlistName].includes(id)) {
      state.playlists[playlistName].push(id);
      saveState();
      renderPlaylists();
      showToast(`Added to "${playlistName}"`);
    } else {
      showToast(`Already in "${playlistName}"`);
    }
  }
  if (action === "remove-playlist" && runtime.activePlaylist) {
    state.playlists[runtime.activePlaylist] = state.playlists[
      runtime.activePlaylist
    ].filter((x) => x !== id);
    saveState();
    renderPlaylists();
    applyFilters();
    showToast(`Removed from "${runtime.activePlaylist}"`);
  }
}

export function toggleLike(id) {
  if (isLiked(id)) {
    state.likedIds = state.likedIds.filter((x) => x !== id);
  } else {
    state.likedIds.push(id);
  }
  saveState();
  applyFilters();
  if (
    runtime.tracks[runtime.currentIndex] &&
    runtime.tracks[runtime.currentIndex].id === id
  ) {
    syncLikeButton();
  }
}
