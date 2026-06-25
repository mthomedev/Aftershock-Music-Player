// =========================================================
// RENDER: LIBRARY / TRACKS
// =========================================================
import { runtime, FALLBACK_COVER } from "./Store.js";
import { state, saveState, likedSet } from "./State.js";
import * as dom from "./Dom.js";
import { isLiked, showToast, escapeHtml } from "./Utils.js";
import { loadTrack, playAudio, syncLikeButton } from "./Player.js";
import { renderQueue } from "./Queue.js";
import { renderPlaylists } from "./Playlists.js";
import { fetchTracks, fetchLyrics } from "./Data.js";

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

function renderContextMenuHtml(track) {
  return `
    <button class="context-menu__item" type="button" data-action="queue" data-id="${track.id}" role="menuitem">Add to queue</button>
    <button class="context-menu__item" type="button" data-action="like" data-id="${track.id}" role="menuitem">${isLiked(track.id) ? "Remove from liked" : "Like"}</button>
    ${
      runtime.currentView === "playlist" && runtime.activePlaylist
        ? `<button class="context-menu__item" type="button" data-action="remove-playlist" data-id="${track.id}" role="menuitem">Remove from "${escapeHtml(runtime.activePlaylist)}"</button>`
        : ""
    }
    <hr class="context-menu__divider">
    ${Object.keys(state.playlists)
      .map(
        (name) => `
      <button class="context-menu__item" type="button" data-action="add-playlist" data-id="${track.id}" data-playlist="${escapeHtml(name)}" role="menuitem">Add to "${escapeHtml(name)}"</button>
    `,
      )
      .join("")}
  `;
}

function renderTrackRowHtml(track, index, realIndex, playing) {
  return `
    <li class="track-list__row ${playing ? "track-list__row--playing" : ""}" data-id="${track.id}" data-real-index="${realIndex}" draggable="true">
      <span class="track-list__index">${playing ? "" : index + 1}</span>
      <img class="track-list__cover" src="${escapeHtml(track.cover)}" alt="${escapeHtml(track.title)} cover art" loading="lazy" onerror="this.src='${FALLBACK_COVER}'">
      <button class="track-list__play" type="button">
        <span class="track-list__info">
          <p class="track-list__name">${escapeHtml(track.title)}</p>
          <p class="track-list__artist">${escapeHtml(track.artist)}</p>
        </span>
      </button>
      <span class="track-list__duration">${isLiked(track.id) ? "♥" : ""}</span>
      <span class="track-list__menu-wrap">
        <button class="track-list__menu-button" type="button" data-menu-for="${track.id}" aria-haspopup="true" aria-expanded="false" aria-label="More options for ${escapeHtml(track.title)}">⋮</button>
        <div class="context-menu" id="menu-${track.id}" hidden role="menu">
          ${renderContextMenuHtml(track)}
        </div>
      </span>
    </li>
  `;
}

function updateTrackRow(row, track, index, realIndex, playing) {
  row.dataset.realIndex = realIndex;
  row.classList.toggle("track-list__row--playing", playing);

  row.querySelector(".track-list__index").textContent = playing
    ? ""
    : index + 1;

  row.querySelector(".track-list__duration").textContent = isLiked(track.id)
    ? "♥"
    : "";

  const menu = row.querySelector(".context-menu");
  if (menu) {
    menu.innerHTML = renderContextMenuHtml(track);
  }
}

export function renderTrackList() {
  dom.libraryCountEl.textContent = runtime.visibleTracks.length
    ? `${runtime.visibleTracks.length} track${runtime.visibleTracks.length > 1 ? "s" : ""}`
    : "";
  dom.emptyStateEl.hidden = runtime.visibleTracks.length !== 0;

  const existingRows = new Map();
  dom.trackListEl.querySelectorAll(".track-list__row").forEach((row) => {
    existingRows.set(row.dataset.id, row);
  });

  const fragment = document.createDocumentFragment();

  runtime.visibleTracks.forEach((track, index) => {
    const realIndex = runtime.tracks.findIndex((t) => t.id === track.id);
    const playing = realIndex === runtime.currentIndex;
    const key = String(track.id);
    const cached = existingRows.get(key);

    if (cached) {
      updateTrackRow(cached, track, index, realIndex, playing);
      fragment.appendChild(cached);
      existingRows.delete(key);
    } else {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = renderTrackRowHtml(
        track,
        index,
        realIndex,
        playing,
      ).trim();
      fragment.appendChild(wrapper.firstElementChild);
    }
  });

  existingRows.forEach((row) => row.remove());

  dom.trackListEl.appendChild(fragment);
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

export function handleMenuAction(action, id, playlistName) {
  const track = runtime.tracks.find((t) => t.id === id);
  if (!track) return;

  if (action === "queue") {
    runtime.queue.push(track);
    renderQueue();
    showToast(`"${track.title}" added to queue`);
    fetchLyrics(track.artist, track.title);
  } else if (action === "like") {
    toggleLike(id);
  } else if (action === "add-playlist") {
    if (!state.playlists[playlistName].includes(id)) {
      state.playlists[playlistName].push(id);
      saveState();
      renderPlaylists();
      showToast(`Added to "${playlistName}"`);
    } else {
      showToast(`Already in "${playlistName}"`);
    }
  } else if (action === "remove-playlist" && runtime.activePlaylist) {
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
  if (likedSet.has(id)) {
    likedSet.delete(id);
    state.likedIds = state.likedIds.filter((x) => x !== id);
  } else {
    likedSet.add(id);
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

// =========================================================
// EVENT DELEGATION — registrado uma única vez
// =========================================================
dom.trackListEl.addEventListener("click", (e) => {
  const playBtn = e.target.closest(".track-list__play");
  const menuBtn = e.target.closest(".track-list__menu-button");
  const menuItem = e.target.closest(".context-menu__item");

  if (playBtn) {
    const row = playBtn.closest(".track-list__row");
    loadTrack(Number(row.dataset.realIndex));
    playAudio();
  } else if (menuBtn) {
    e.stopPropagation();
    toggleMenu(menuBtn.dataset.menuFor);
  } else if (menuItem) {
    e.stopPropagation();
    handleMenuAction(
      menuItem.dataset.action,
      menuItem.dataset.id,
      menuItem.dataset.playlist,
    );
    closeAllMenus();
  }
});

dom.trackListEl.addEventListener("dragstart", (e) => {
  const row = e.target.closest(".track-list__row");
  if (row) row.classList.add("track-list__row--dragging");
});

dom.trackListEl.addEventListener("dragend", (e) => {
  const row = e.target.closest(".track-list__row");
  if (row) row.classList.remove("track-list__row--dragging");
});

document.addEventListener("click", closeAllMenus);
