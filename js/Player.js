// =========================================================
// PLAYER — core
// =========================================================
import { runtime, speeds, FALLBACK_COVER } from "./Store.js";
import { state, saveState } from "./State.js";
import * as dom from "./Dom.js";
import { formatTime, showToast } from "./Utils.js";
import { applyFilters, toggleLike } from "./TrackList.js";
import { renderQueue } from "./Queue.js";

export function loadTrack(index) {
  runtime.currentIndex = index;
  const track = runtime.tracks[index];
  dom.audio.src = `${track.src}?_=${Date.now()}`;
  dom.audio.playbackRate = speeds[runtime.speedPos];
  dom.playerCover.src = track.cover;
  dom.playerCover.onerror = () => {
    dom.playerCover.src = FALLBACK_COVER;
  };
  dom.playerCover.alt = `${track.title} cover art`;
  dom.playerTitle.textContent = track.title;
  dom.playerArtist.textContent = `${track.artist} • ${track.album}`;
  syncLikeButton();
  applyFilters();
  document.title = `${track.title} · ${track.artist} — Tonal`;

  state.lastTrackId = track.id;
  state.lastPosition = 0;
  saveState();

  updateMediaSession(track);
  window.dispatchEvent(new CustomEvent("trackchanged"));
}

export function updateMediaSession(track) {
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

export function syncLikeButton() {
  const track = runtime.tracks[runtime.currentIndex];
  const liked = track ? state.likedIds.includes(track.id) : false;
  dom.likeButton.setAttribute("aria-pressed", String(liked));
  dom.likeButton.textContent = liked ? "♥" : "♡";
}

export function playAudio() {
  dom.audio
    .play()
    .catch(() => showToast("Add the matching MP3 file to /audio to play it."));
  dom.playButton.textContent = "⏸";
  dom.playButton.setAttribute("aria-label", "Pause");
  if ("mediaSession" in navigator)
    navigator.mediaSession.playbackState = "playing";
}

export function pauseAudio() {
  dom.audio.pause();
  dom.playButton.textContent = "▶";
  dom.playButton.setAttribute("aria-label", "Play");
  if ("mediaSession" in navigator)
    navigator.mediaSession.playbackState = "paused";
}

export function togglePlay() {
  if (runtime.currentIndex === -1) loadTrack(0);
  if (dom.audio.paused) playAudio();
  else pauseAudio();
}

export function playNext() {
  // Queue takes priority
  if (runtime.queue.length > 0) {
    const next = runtime.queue.shift();
    renderQueue();
    const idx = runtime.tracks.findIndex((t) => t.id === next.id);
    loadTrack(idx);
    playAudio();
    return;
  }
  let nextIndex;
  if (runtime.isShuffle) {
    nextIndex = Math.floor(Math.random() * runtime.tracks.length);
  } else {
    nextIndex = (runtime.currentIndex + 1) % runtime.tracks.length;
  }
  loadTrack(nextIndex);
  playAudio();
}

export function playPrev() {
  const prevIndex =
    (runtime.currentIndex - 1 + runtime.tracks.length) % runtime.tracks.length;
  loadTrack(prevIndex);
  playAudio();
}

// ===== Controls =====
dom.playButton.addEventListener("click", togglePlay);
dom.nextButton.addEventListener("click", playNext);
dom.prevButton.addEventListener("click", playPrev);

dom.shuffleButton.addEventListener("click", () => {
  runtime.isShuffle = !runtime.isShuffle;
  dom.shuffleButton.setAttribute("aria-pressed", String(runtime.isShuffle));
});

dom.repeatButton.addEventListener("click", () => {
  runtime.isRepeat = !runtime.isRepeat;
  dom.repeatButton.setAttribute("aria-pressed", String(runtime.isRepeat));
});

dom.likeButton.addEventListener("click", () => {
  if (runtime.currentIndex === -1) return;
  toggleLike(runtime.tracks[runtime.currentIndex].id);
});

dom.muteButton.addEventListener("click", () => {
  runtime.isMuted = !runtime.isMuted;
  dom.audio.muted = runtime.isMuted;
  dom.muteButton.setAttribute("aria-pressed", String(runtime.isMuted));
  dom.muteButton.textContent = runtime.isMuted ? "🔇" : "🕪";
});

dom.speedButton.addEventListener("click", () => {
  runtime.speedPos = (runtime.speedPos + 1) % speeds.length;
  dom.audio.playbackRate = speeds[runtime.speedPos];
  dom.speedButton.textContent = `${speeds[runtime.speedPos]}x`;
});

dom.volumeBar.addEventListener("input", () => {
  dom.audio.volume = dom.volumeBar.value / 100;
  dom.volumeBar.style.setProperty("--fill", dom.volumeBar.value + "%");
  state.volume = Number(dom.volumeBar.value);
  saveState();
  if (dom.audio.volume === 0) {
    runtime.isMuted = true;
    dom.muteButton.textContent = "🔇";
  } else if (runtime.isMuted) {
    runtime.isMuted = false;
    dom.audio.muted = false;
    dom.muteButton.textContent = "🕪";
    dom.muteButton.setAttribute("aria-pressed", "false");
  }
});

dom.progressBar.addEventListener("input", () => {
  if (dom.audio.duration)
    dom.audio.currentTime = (dom.progressBar.value / 100) * dom.audio.duration;
});

// ===== <audio> events =====
dom.timeDuration.addEventListener("click", () => {
  runtime.showRemaining = !runtime.showRemaining;
  updateTimeDisplay();
});

dom.timeDuration.addEventListener("keydown", (e) => {
  if (e.code === "Enter" || e.code === "Space") {
    e.preventDefault();
    dom.timeDuration.click();
  }
});

function updateTimeDisplay() {
  if (!dom.audio.duration) return;
  dom.timeCurrent.textContent = formatTime(dom.audio.currentTime);
  dom.timeDuration.textContent = runtime.showRemaining
    ? `-${formatTime(dom.audio.duration - dom.audio.currentTime)}`
    : formatTime(dom.audio.duration);
}

dom.audio.addEventListener("timeupdate", () => {
  if (dom.audio.duration) {
    dom.progressBar.value = (dom.audio.currentTime / dom.audio.duration) * 100;
    dom.progressBar.style.setProperty("--fill", dom.progressBar.value + "%");
    updateTimeDisplay();
    state.lastPosition = dom.audio.currentTime;
    window.dispatchEvent(
      new CustomEvent("timeupdate-sync", {
        detail: { currentTime: dom.audio.currentTime },
      }),
    );
  }
});

dom.audio.addEventListener("loadedmetadata", () => {
  updateTimeDisplay();
  if (
    state.lastTrackId === runtime.tracks[runtime.currentIndex]?.id &&
    state.lastPosition
  ) {
    dom.audio.currentTime = state.lastPosition;
  }
});

dom.audio.addEventListener("ended", () => {
  if (runtime.isRepeat) {
    dom.audio.currentTime = 0;
    playAudio();
  } else {
    playNext();
  }
});

dom.audio.addEventListener("error", () => {
  if (runtime.currentIndex !== -1) {
    showToast(
      `Couldn't find the file for "${runtime.tracks[runtime.currentIndex].title}" in /audio.`,
    );
  }
});
