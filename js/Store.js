// =========================================================
// RUNTIME STATE (não persistido — vive só durante a sessão)
// =========================================================
// Exportamos um único objeto mutável em vez de variáveis soltas
// porque módulos ES não permitem reatribuir um valor importado
// (import { x } from "./Store.js"; x = 1 // erro).
// Mutar uma propriedade do objeto (runtime.currentIndex = 1)
// funciona normalmente e mantém o estado sincronizado entre módulos.
export const runtime = {
  tracks: [],
  visibleTracks: [],
  currentIndex: -1,
  isShuffle: false,
  isRepeat: false,
  isMuted: false,
  queue: [],
  currentView: "home", // home | liked | playlist
  activePlaylist: null,
  speedPos: 0,
  openMenuId: null,
  showRemaining: false,
};

// Velocidades de reprodução disponíveis, na ordem em que o botão alterna
export const speeds = [1, 1.25, 1.5, 1.75, 0.75];

// Capa usada quando o arquivo de capa da faixa não é encontrado
export const FALLBACK_COVER = "https://picsum.photos/seed/tonal/200";
