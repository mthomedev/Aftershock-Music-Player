// =========================================================
// KEYBOARD SHORTCUTS
// space (play/pause), arrows (seek), M (mute), L (like), N/P (next/prev)
// =========================================================
import * as dom from "./Dom.js";
import { togglePlay, playNext, playPrev } from "./Player.js";

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  }
  if (e.code === "ArrowRight")
    dom.audio.currentTime = Math.min(
      dom.audio.duration || 0,
      dom.audio.currentTime + 5,
    );
  if (e.code === "ArrowLeft")
    dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 5);
  if (e.key === "m" || e.key === "M") dom.muteButton.click();
  if (e.key === "l" || e.key === "L") dom.likeButton.click();
  if (e.key === "n" || e.key === "N") playNext();
  if (e.key === "p" || e.key === "P") playPrev();
});
