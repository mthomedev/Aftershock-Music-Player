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
  const response = await fetch("./assets/songs.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const lyricsCache = new Map();

export async function fetchLyrics(artist, title) {
  const key = `${artist}__${title}`;

  if (lyricsCache.has(key)) return lyricsCache.get(key);

  try {
    const res = await fetch(
      `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
    );
    if (!res.ok) return null;

    const data = await res.json();
    const match = data[0];
    if (!match) return null;

    const raw = match.plainLyrics ?? match.syncedLyrics ?? null;
    const lyrics = raw ? raw.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/g, "") : null;
    lyricsCache.set(key, lyrics);
    return lyrics;
  } catch {
    return null;
  }
}
