// =========================================================
// TRACK CATALOG
// MP3 files live in /audio and covers in /covers.
// To swap a song, change the "src" value to the path of
// your own MP3 (and "cover" to your own artwork).
// =========================================================

let tracks = [];

async function loadTracks() {
  try {
    const response = await fetch("./assets/songs.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    tracks = await response.json();

    visibleTracks = [...tracks];

    renderTrackList();
    loadTrack(0);

    console.log("Músicas carregadas:", tracks);
  } catch (error) {
    console.error("Erro ao carregar músicas:", error);
  }
}

loadTracks();

// Placeholder artwork in case a cover file isn't there yet
const FALLBACK_COVER = "https://picsum.photos/seed/tonal/200";

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

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const state = loadState();

// =========================================================
// DOM REFERENCES (id = JS)
// =========================================================
const audio = document.getElementById("audio-element");
const trackListEl = document.getElementById("track-list");
const playlistListEl = document.getElementById("playlist-list");
const emptyStateEl = document.getElementById("empty-state");
const libraryCountEl = document.getElementById("library-count");
const heroTitleEl = document.getElementById("hero-title");
const heroSubtitleEl = document.getElementById("hero-subtitle");

const playButton = document.getElementById("play-button");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const shuffleButton = document.getElementById("shuffle-button");
const repeatButton = document.getElementById("repeat-button");
const likeButton = document.getElementById("like-button");
const muteButton = document.getElementById("mute-button");
const speedButton = document.getElementById("speed-button");
const themeToggle = document.getElementById("theme-toggle");

const progressBar = document.getElementById("progress-bar");
const volumeBar = document.getElementById("volume-bar");
const timeCurrent = document.getElementById("time-current");
const timeDuration = document.getElementById("time-duration");

const playerCover = document.getElementById("player-cover");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");

const searchInput = document.getElementById("search-input");
const searchForm = document.getElementById("search-form");

const queuePanel = document.getElementById("queue-panel");
const queueListEl = document.getElementById("queue-list");
const queueEmptyStateEl = document.getElementById("queue-empty-state");
const queueToggleButton = document.getElementById("queue-toggle-button");
const clearQueueButton = document.getElementById("clear-queue-button");

const newPlaylistButton = document.getElementById("new-playlist-button");
const toastEl = document.getElementById("toast");

// =========================================================
// RUNTIME STATE
// =========================================================
let currentIndex = -1;
let visibleTracks = [...tracks];
let isShuffle = false;
let isRepeat = false;
let isMuted = false;
let queue = [];
let currentView = "home"; // home | liked | playlist
let activePlaylist = null;
const speeds = [1, 1.25, 1.5, 1.75, 0.75];
let speedPos = 0;
let openMenuId = null;

// =========================================================
// UTILS
// =========================================================
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("toast--visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(
    () => toastEl.classList.remove("toast--visible"),
    2200,
  );
}

function isLiked(id) {
  return state.likedIds.includes(id);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// =========================================================
// RENDER: LIBRARY / TRACKS
// =========================================================
function getTracksForView() {
  if (currentView === "liked") {
    return tracks.filter((t) => isLiked(t.id));
  }
  if (currentView === "playlist" && activePlaylist) {
    const ids = state.playlists[activePlaylist] || [];
    return tracks.filter((t) => ids.includes(t.id));
  }
  return tracks;
}

function applyFilters() {
  const base = getTracksForView();
  const query = searchInput.value.trim().toLowerCase();
  visibleTracks = query
    ? base.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query),
      )
    : base;
  renderTrackList();
}

function renderTrackList() {
  libraryCountEl.textContent = visibleTracks.length
    ? `${visibleTracks.length} track${visibleTracks.length > 1 ? "s" : ""}`
    : "";
  emptyStateEl.hidden = visibleTracks.length !== 0;

  trackListEl.innerHTML = visibleTracks
    .map((track, index) => {
      const realIndex = tracks.findIndex((t) => t.id === track.id);
      const playing = realIndex === currentIndex;
      return `
    <li class="track-list__row ${playing ? "track-list__row--playing" : ""}" data-id="${track.id}" data-real-index="${realIndex}" draggable="true">
      <span class="track-list__index">${playing ? "♪" : index + 1}</span>
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
            currentView === "playlist" && activePlaylist
              ? `<button class="context-menu__item" type="button" data-action="remove-playlist" data-id="${track.id}" role="menuitem">Remove from "${activePlaylist}"</button>`
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

  trackListEl.querySelectorAll(".track-list__play").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".track-list__row");
      const realIndex = Number(row.dataset.realIndex);
      loadTrack(realIndex);
      playAudio();
    });
  });

  trackListEl.querySelectorAll(".track-list__menu-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(button.dataset.menuFor);
    });
  });

  trackListEl.querySelectorAll(".context-menu__item").forEach((item) => {
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
  trackListEl.querySelectorAll(".track-list__row").forEach((row) => {
    row.addEventListener("dragstart", () => {
      row.classList.add("track-list__row--dragging");
      row.setAttribute("aria-grabbed", "true");
    });
    row.addEventListener("dragend", () =>
      row.classList.remove("track-list__row--dragging"),
    );
  });
}

function toggleMenu(id) {
  const isOpening = openMenuId !== id;
  closeAllMenus();
  if (isOpening) {
    const menu = document.getElementById(`menu-${id}`);
    const button = document.querySelector(`[data-menu-for="${id}"]`);
    if (menu) {
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
      openMenuId = id;
    }
  }
}

function closeAllMenus() {
  document.querySelectorAll(".context-menu").forEach((m) => (m.hidden = true));
  document
    .querySelectorAll(".track-list__menu-button")
    .forEach((b) => b.setAttribute("aria-expanded", "false"));
  openMenuId = null;
}

document.addEventListener("click", closeAllMenus);

function handleMenuAction(action, id, playlistName) {
  const track = tracks.find((t) => t.id === id);
  if (!track) return;

  if (action === "queue") {
    queue.push(track);
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
  if (action === "remove-playlist" && activePlaylist) {
    state.playlists[activePlaylist] = state.playlists[activePlaylist].filter(
      (x) => x !== id,
    );
    saveState();
    renderPlaylists();
    applyFilters();
    showToast(`Removed from "${activePlaylist}"`);
  }
}

function toggleLike(id) {
  if (isLiked(id)) {
    state.likedIds = state.likedIds.filter((x) => x !== id);
  } else {
    state.likedIds.push(id);
  }
  saveState();
  applyFilters();
  if (tracks[currentIndex] && tracks[currentIndex].id === id) {
    syncLikeButton();
  }
}

// =========================================================
// RENDER: PLAYLISTS (sidebar)
// =========================================================
function renderPlaylists() {
  playlistListEl.innerHTML = Object.entries(state.playlists)
    .map(
      ([name, ids]) => `
    <li class="playlist-list__item ${currentView === "playlist" && activePlaylist === name ? "playlist-list__item--active" : ""}" data-playlist="${name}">
      <button class="playlist-list__open" type="button" data-open-playlist="${name}">
        <span>${name}</span>
        <span class="playlist-list__count">${ids.length}</span>
      </button>
      <button class="playlist-list__delete" type="button" data-delete-playlist="${name}" aria-label="Delete playlist ${name}">✕</button>
    </li>
  `,
    )
    .join("");

  playlistListEl.querySelectorAll("[data-open-playlist]").forEach((button) => {
    button.addEventListener("click", () => {
      currentView = "playlist";
      activePlaylist = button.dataset.openPlaylist;
      document
        .querySelectorAll(".nav-link")
        .forEach((l) => l.classList.remove("nav-link--active"));
      heroTitleEl.textContent = activePlaylist;
      heroSubtitleEl.textContent = "Tracks in this playlist";
      renderPlaylists();
      applyFilters();
    });
  });

  playlistListEl
    .querySelectorAll("[data-delete-playlist]")
    .forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = button.dataset.deletePlaylist;
        if (!confirm(`Delete the playlist "${name}"?`)) return;
        delete state.playlists[name];
        saveState();
        if (currentView === "playlist" && activePlaylist === name) {
          currentView = "home";
          activePlaylist = null;
          heroTitleEl.textContent = getGreeting();
          heroSubtitleEl.textContent = "Pick up where you left off";
          applyFilters();
        }
        renderPlaylists();
      });
    });

  playlistListEl.querySelectorAll(".playlist-list__item").forEach((item) => {
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
      const draggingRow = document.querySelector(".track-list__row--dragging");
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

newPlaylistButton.addEventListener("click", () => {
  const name = prompt("New playlist name:");
  if (name && !state.playlists[name]) {
    state.playlists[name] = [];
    saveState();
    renderPlaylists();
  }
});

// =========================================================
// RENDER: QUEUE
// =========================================================
function renderQueue() {
  queueEmptyStateEl.hidden = queue.length !== 0;
  queueListEl.innerHTML = queue
    .map(
      (track, i) => `
    <li class="queue-list__item" draggable="true" data-queue-index="${i}">
      <img class="queue-list__cover" src="${track.cover}" alt="" onerror="this.src='${FALLBACK_COVER}'">
      <span class="queue-list__info">
        <p class="queue-list__name">${track.title}</p>
        <p class="queue-list__artist">${track.artist}</p>
      </span>
      <button class="queue-list__remove" type="button" data-remove="${i}" aria-label="Remove ${track.title} from queue">✕</button>
    </li>
  `,
    )
    .join("");

  queueListEl.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      queue.splice(Number(button.dataset.remove), 1);
      renderQueue();
    });
  });

  let dragFromIndex = null;
  queueListEl.querySelectorAll(".queue-list__item").forEach((item) => {
    item.addEventListener("dragstart", () => {
      dragFromIndex = Number(item.dataset.queueIndex);
      item.classList.add("queue-list__item--dragging");
    });
    item.addEventListener("dragend", () =>
      item.classList.remove("queue-list__item--dragging"),
    );
    item.addEventListener("dragover", (e) => e.preventDefault());
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      const dragToIndex = Number(item.dataset.queueIndex);
      if (dragFromIndex === null || dragFromIndex === dragToIndex) return;
      const [moved] = queue.splice(dragFromIndex, 1);
      queue.splice(dragToIndex, 0, moved);
      renderQueue();
    });
  });
}

queueToggleButton.addEventListener("click", () => {
  const willShow = queuePanel.hidden;
  queuePanel.hidden = !willShow;
  queueToggleButton.setAttribute("aria-pressed", String(willShow));
});

clearQueueButton.addEventListener("click", () => {
  queue = [];
  renderQueue();
});

// =========================================================
// NAVIGATION (Home / Liked)
// =========================================================
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    currentView = link.dataset.view;
    activePlaylist = null;
    document
      .querySelectorAll(".nav-link")
      .forEach((l) => l.classList.remove("nav-link--active"));
    link.classList.add("nav-link--active");
    heroTitleEl.textContent =
      currentView === "liked" ? "Your liked tracks" : getGreeting();
    heroSubtitleEl.textContent =
      currentView === "liked"
        ? "Tracks you've marked with ♥"
        : "Pick up where you left off";
    renderPlaylists();
    applyFilters();
  });
});

// =========================================================
// SEARCH
// =========================================================
searchForm.addEventListener("submit", (e) => e.preventDefault());
searchInput.addEventListener("input", applyFilters);

// =========================================================
// PLAYER — core
// =========================================================
function loadTrack(index) {
  currentIndex = index;
  const track = tracks[index];
  audio.src = track.src;
  audio.playbackRate = speeds[speedPos];
  playerCover.src = track.cover;
  playerCover.onerror = () => {
    playerCover.src = FALLBACK_COVER;
  };
  playerCover.alt = `${track.title} cover art`;
  playerTitle.textContent = track.title;
  playerArtist.textContent = `${track.artist} • ${track.album}`;
  syncLikeButton();
  applyFilters();
  document.title = `${track.title} · ${track.artist} — Tonal`;

  state.lastTrackId = track.id;
  state.lastPosition = 0;
  saveState();

  updateMediaSession(track);
}

function updateMediaSession(track) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: [{ src: track.cover, sizes: "200x200", type: "image/jpeg" }],
  });
  navigator.mediaSession.setActionHandler("play", playAudio);
  navigator.mediaSession.setActionHandler("pause", pauseAudio);
  navigator.mediaSession.setActionHandler("previoustrack", playPrev);
  navigator.mediaSession.setActionHandler("nexttrack", playNext);
}

function syncLikeButton() {
  const track = tracks[currentIndex];
  const liked = track ? isLiked(track.id) : false;
  likeButton.setAttribute("aria-pressed", String(liked));
  likeButton.textContent = liked ? "♥" : "♡";
}

function playAudio() {
  audio
    .play()
    .catch(() => showToast("Add the matching MP3 file to /audio to play it."));
  playButton.textContent = "⏸";
  playButton.setAttribute("aria-label", "Pause");
  if ("mediaSession" in navigator)
    navigator.mediaSession.playbackState = "playing";
}

function pauseAudio() {
  audio.pause();
  playButton.textContent = "▶";
  playButton.setAttribute("aria-label", "Play");
  if ("mediaSession" in navigator)
    navigator.mediaSession.playbackState = "paused";
}

function togglePlay() {
  if (currentIndex === -1) loadTrack(0);
  if (audio.paused) playAudio();
  else pauseAudio();
}

function playNext() {
  // Queue takes priority
  if (queue.length > 0) {
    const next = queue.shift();
    renderQueue();
    const idx = tracks.findIndex((t) => t.id === next.id);
    loadTrack(idx);
    playAudio();
    return;
  }
  let nextIndex;
  if (isShuffle) {
    nextIndex = Math.floor(Math.random() * tracks.length);
  } else {
    nextIndex = (currentIndex + 1) % tracks.length;
  }
  loadTrack(nextIndex);
  playAudio();
}

function playPrev() {
  const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
  loadTrack(prevIndex);
  playAudio();
}

// ===== Controls =====
playButton.addEventListener("click", togglePlay);
nextButton.addEventListener("click", playNext);
prevButton.addEventListener("click", playPrev);

shuffleButton.addEventListener("click", () => {
  isShuffle = !isShuffle;
  shuffleButton.setAttribute("aria-pressed", String(isShuffle));
});

repeatButton.addEventListener("click", () => {
  isRepeat = !isRepeat;
  repeatButton.setAttribute("aria-pressed", String(isRepeat));
});

likeButton.addEventListener("click", () => {
  if (currentIndex === -1) return;
  toggleLike(tracks[currentIndex].id);
});

muteButton.addEventListener("click", () => {
  isMuted = !isMuted;
  audio.muted = isMuted;
  muteButton.setAttribute("aria-pressed", String(isMuted));
  muteButton.textContent = isMuted ? "🔇" : "🕪";
});

speedButton.addEventListener("click", () => {
  speedPos = (speedPos + 1) % speeds.length;
  audio.playbackRate = speeds[speedPos];
  speedButton.textContent = `${speeds[speedPos]}x`;
});

volumeBar.addEventListener("input", () => {
  audio.volume = volumeBar.value / 100;
  state.volume = Number(volumeBar.value);
  saveState();
  if (audio.volume === 0) {
    isMuted = true;
    muteButton.textContent = "🔇";
  } else if (isMuted) {
    isMuted = false;
    audio.muted = false;
    muteButton.textContent = "🕪";
    muteButton.setAttribute("aria-pressed", "false");
  }
});

progressBar.addEventListener("input", () => {
  if (audio.duration)
    audio.currentTime = (progressBar.value / 100) * audio.duration;
});

// Keyboard shortcuts: space (play/pause), arrows (seek), M (mute), L (like), N/P (next/prev)
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  }
  if (e.code === "ArrowRight")
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
  if (e.code === "ArrowLeft")
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  if (e.key === "m" || e.key === "M") muteButton.click();
  if (e.key === "l" || e.key === "L") likeButton.click();
  if (e.key === "n" || e.key === "N") playNext();
  if (e.key === "p" || e.key === "P") playPrev();
});

// Persist the position periodically (throttled), not on every timeupdate
setInterval(() => {
  if (currentIndex !== -1 && !audio.paused) saveState();
}, 5000);

// ===== <audio> events =====
let showRemaining = false;

timeDuration.addEventListener("click", () => {
  showRemaining = !showRemaining;
  updateTimeDisplay();
});

timeDuration.addEventListener("keydown", (e) => {
  if (e.code === "Enter" || e.code === "Space") {
    e.preventDefault();
    timeDuration.click();
  }
});

function updateTimeDisplay() {
  if (!audio.duration) return;
  timeCurrent.textContent = formatTime(audio.currentTime);
  timeDuration.textContent = showRemaining
    ? `-${formatTime(audio.duration - audio.currentTime)}`
    : formatTime(audio.duration);
}

audio.addEventListener("timeupdate", () => {
  if (audio.duration) {
    progressBar.value = (audio.currentTime / audio.duration) * 100;
    updateTimeDisplay();
    state.lastPosition = audio.currentTime;
  }
});

audio.addEventListener("loadedmetadata", () => {
  updateTimeDisplay();
  if (state.lastTrackId === tracks[currentIndex]?.id && state.lastPosition) {
    audio.currentTime = state.lastPosition;
  }
});

audio.addEventListener("ended", () => {
  if (isRepeat) {
    audio.currentTime = 0;
    playAudio();
  } else {
    playNext();
  }
});

audio.addEventListener("error", () => {
  if (currentIndex !== -1) {
    showToast(
      `Couldn't find the file for "${tracks[currentIndex].title}" in /audio.`,
    );
  }
});

// =========================================================
// LIGHT / DARK THEME
// =========================================================
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  themeToggle.textContent = state.theme === "light" ? "☀" : "☾";
  themeToggle.setAttribute("aria-pressed", String(state.theme === "light"));
}

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  saveState();
  applyTheme();
});

// =========================================================
// INITIALIZATION
// =========================================================
heroTitleEl.textContent = getGreeting();
volumeBar.value = state.volume;
audio.volume = state.volume / 100;
applyTheme();
renderPlaylists();
renderQueue();
applyFilters();

if (state.lastTrackId) {
  const lastIndex = tracks.findIndex((t) => t.id === state.lastTrackId);
  if (lastIndex !== -1) {
    currentIndex = lastIndex;
    const track = tracks[lastIndex];
    audio.src = track.src;
    playerCover.src = track.cover;
    playerCover.onerror = () => {
      playerCover.src = FALLBACK_COVER;
    };
    playerTitle.textContent = track.title;
    playerArtist.textContent = `${track.artist} • ${track.album}`;
    syncLikeButton();
    applyFilters();
    updateMediaSession(track);
  }
}

window.addEventListener("beforeunload", () => {
  if (currentIndex !== -1) saveState();
});
