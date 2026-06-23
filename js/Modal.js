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

function showLyrics(lyrics) {
  dom.modalLyricsLoading.hidden = true;

  if (!lyrics) {
    dom.modalLyricsEmpty.hidden = false;
    dom.modalLyrics.hidden = true;
    return;
  }

  dom.modalLyricsEmpty.hidden = true;
  dom.modalLyrics.hidden = false;
  dom.modalLyrics.textContent = lyrics;
}

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
