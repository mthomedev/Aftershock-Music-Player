import * as dom from "./Dom.js";
import { fetchLyrics } from "./Data.js";
import { runtime } from "./Store.js";

function extractAccentFromImage(imgEl, callback) {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  try {
    ctx.drawImage(imgEl, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;
    let r = 0,
      g = 0,
      b = 0,
      count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    callback(
      Math.round(r / count),
      Math.round(g / count),
      Math.round(b / count),
    );
  } catch {
    callback(165, 28, 48);
  }
}

function applyModalGlow(r, g, b) {
  document
    .querySelector(".modal")
    ?.style.setProperty(
      "--modal-glow",
      `radial-gradient(ellipse at 30% 0%, rgba(${r},${g},${b},0.4) 0%, transparent 65%)`,
    );
}

function parseLRC(lrc) {
  return lrc
    .split("\n")
    .map((line) => {
      const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
      if (!match) return null;
      const minutes = parseFloat(match[1]);
      const seconds = parseFloat(match[2]);
      const ms = parseFloat(match[3].padEnd(3, "0"));
      const time = minutes * 60 + seconds + ms / 1000;
      return { time, text: match[4].trim() };
    })
    .filter((line) => line !== null && line.text !== "");
}

let syncedLines = [];
let activeLine = -1;

function showLyrics(result) {
  dom.modalLyricsLoading.hidden = true;
  syncedLines = [];
  activeLine = -1;
  dom.modalSyncIndicator.hidden = true;

  if (!result || (!result.synced && !result.plain)) {
    dom.modalLyricsEmpty.hidden = false;
    dom.modalLyrics.hidden = true;
    return;
  }

  dom.modalLyricsEmpty.hidden = true;
  dom.modalLyrics.hidden = false;

  if (result.synced) {
    syncedLines = parseLRC(result.synced);
    dom.modalSyncIndicator.hidden = false;
    dom.modalLyrics.innerHTML = syncedLines
      .map(
        (line, i) =>
          `<span class="lyric-line" data-index="${i}">${line.text}</span>`,
      )
      .join("\n");
  } else {
    dom.modalLyrics.textContent = result.plain;
  }
}

function syncLyrics(currentTime) {
  if (!syncedLines.length) return;

  let current = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (currentTime >= syncedLines[i].time) current = i;
    else break;
  }

  if (current === activeLine) return;
  activeLine = current;

  dom.modalLyrics.querySelectorAll(".lyric-line").forEach((el, i) => {
    el.classList.toggle("lyric-line--active", i === current);
    el.classList.toggle("lyric-line--past", i < current);
  });

  if (current >= 0) {
    const activeEl = dom.modalLyrics.querySelector(`[data-index="${current}"]`);
    activeEl?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

window.addEventListener("timeupdate-sync", (e) => {
  if (!dom.nowPlayingModal.hidden) syncLyrics(e.detail.currentTime);
});

export async function openModal() {
  const track = runtime.tracks[runtime.currentIndex];
  if (!track) return;

  dom.modalCover.src = track.cover;
  dom.modalCover.onload = () => {
    extractAccentFromImage(dom.modalCover, (r, g, b) =>
      applyModalGlow(r, g, b),
    );
  };
  dom.modalCover.alt = track.title;
  dom.modalTrackTitle.textContent = track.title;
  dom.modalTrackArtist.textContent = track.artist;
  dom.modalTrackAlbum.textContent = track.album;

  dom.modalLyricsLoading.hidden = false;
  dom.modalLyricsEmpty.hidden = true;
  dom.modalLyrics.hidden = true;

  dom.nowPlayingModal.hidden = false;
  document.body.style.overflow = "hidden";

  const lyrics = await fetchLyrics(track.artist, track.title);
  showLyrics(lyrics);
}

export function closeModal() {
  dom.nowPlayingModal.hidden = true;
  document.body.style.overflow = "";
}

dom.openModalButton.addEventListener("click", openModal);
dom.modalClose.addEventListener("click", closeModal);

dom.nowPlayingModal.addEventListener("click", (e) => {
  if (e.target === dom.nowPlayingModal) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !dom.nowPlayingModal.hidden) closeModal();
});

export function refreshModal() {
  if (!dom.nowPlayingModal.hidden) openModal();
}

window.addEventListener("trackchanged", () => {
  if (!dom.nowPlayingModal.hidden) openModal();
});

dom.modalQueueButton.addEventListener("click", () => {
  const willShow = dom.queuePanel.hidden;
  dom.queuePanel.hidden = !willShow;
  dom.queueToggleButton.setAttribute("aria-pressed", String(willShow));
  dom.modalQueueButton.setAttribute("aria-pressed", String(willShow));
});
