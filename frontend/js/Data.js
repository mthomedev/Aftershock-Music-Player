// =========================================================
// TRACK CATALOG
// MP3 files live in /audio and covers in /covers.
// To swap a song, change the "src" value to the path of
// your own MP3 (and "cover" to your own artwork).
// =========================================================

// Apenas busca e devolve os dados — quem decide o que fazer
// com eles (preencher o runtime, renderizar a lista, carregar a
// primeira faixa) é o Main.js, para não duplicar a lógica.
export async function fetchTracks() {
  const response = await fetch("/api/tracks");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const LYRICS_CACHE_MAX = 50;
const lyricsCache = new Map();

function lyricsSet(key, value) {
  if (lyricsCache.size >= LYRICS_CACHE_MAX) {
    lyricsCache.delete(lyricsCache.keys().next().value);
  }
  lyricsCache.set(key, value);
}

export function fetchLyrics(artist, title) {
  const key = `${artist}__${title}`;

  if (lyricsCache.has(key)) return lyricsCache.get(key);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const promise = fetch(
    `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
    { signal: controller.signal },
  )
    .then(async (res) => {
      clearTimeout(timeout);

      // Se /get não encontrou, tenta /search como fallback
      if (!res.ok) {
        const fallback = await fetch(
          `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
        );
        if (!fallback.ok) return null;
        const data = await fallback.json();
        const match = data[0];
        if (!match) return null;
        return {
          synced: match.syncedLyrics ?? null,
          plain: match.plainLyrics ?? null,
        };
      }

      const match = await res.json();
      if (!match) return null;
      return {
        synced: match.syncedLyrics ?? null,
        plain: match.plainLyrics ?? null,
      };
    })
    .catch(() => null);

  lyricsSet(key, promise);
  return promise;
}
