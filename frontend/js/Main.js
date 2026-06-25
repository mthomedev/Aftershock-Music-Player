// =========================================================
// ENTRY POINT
// Importar os módulos abaixo já registra os event listeners de
// cada um (efeito colateral do import). Aqui só fazemos a carga
// inicial dos dados e a inicialização da UI.
// =========================================================
import { runtime, FALLBACK_COVER } from "./Store.js";
import { state, saveState } from "./State.js";
import * as dom from "./Dom.js";
import { fetchTracks, fetchLyrics } from "./Data.js";
import { getGreeting, showToast } from "./Utils.js";
import { renderTrackList, applyFilters } from "./TrackList.js";
import { renderPlaylists } from "./Playlists.js";
import { renderQueue } from "./Queue.js";
import { applyTheme } from "./Theme.js";
import { loadTrack, syncLikeButton, updateMediaSession } from "./Player.js";
import "./Modal.js";

// Estes módulos só precisam ser importados pelo efeito colateral:
// eles registram seus próprios event listeners ao serem carregados.
import "./Navigation.js";
import "./Keyboard.js";

// =========================================================
// CARGA DO CATÁLOGO DE MÚSICAS
// =========================================================
async function loadTracks() {
  try {
    runtime.tracks = await fetchTracks();
    runtime.visibleTracks = [...runtime.tracks];

    renderTrackList();

    if (state.lastTrackId) {
      const lastIndex = runtime.tracks.findIndex(
        (t) => t.id === state.lastTrackId,
      );
      if (lastIndex !== -1) {
        loadTrack(lastIndex);
      } else {
        loadTrack(0);
      }
    } else {
      loadTrack(0);
    }

    console.log("Músicas carregadas:", runtime.tracks);
  } catch (error) {
    console.error(error);
    showToast("Failed to load your library. Please refresh the page.");
  }
}

loadTracks();

// =========================================================
// INICIALIZAÇÃO
// =========================================================
function init() {
  dom.heroTitleEl.textContent = getGreeting();
  dom.volumeBar.value = state.volume;
  dom.volumeBar.style.setProperty("--fill", state.volume + "%");
  dom.audio.volume = state.volume / 100;

  applyTheme();
  renderPlaylists();
  renderQueue();
  applyFilters();

  window.addEventListener("beforeunload", () => {
    if (runtime.currentIndex !== -1) saveState();
  });
}

init();

setInterval(() => {
  if (runtime.currentIndex !== -1 && !dom.audio.paused) saveState();
}, 5000);
