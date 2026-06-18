# Aftershock — Music Player

A fully functional music player clone, built with semantic HTML, `id` reserved for JavaScript, and `class` for styling.

Five tracks are already wired up and working: _If You Can't Hang_ (Sleeping With Sirens), _Circles_ (Pierce The Veil), _Good Things Go_ (Linkin Park), _Rollin'_ (Limp Bizkit), and _See U in Hell_ (Papa Roach).

## Adding more songs

1. Drop the MP3 file into the `audio/` folder (rename it to something without spaces, accents, or quotes, e.g. `06-track-name.mp3`).
2. Drop the cover art (optional) into `covers/`.
3. Add a new object to the `tracks` array at the top of `script.js`:

```js
{ id: "t6", title: "Track name", artist: "Artist", album: "Album", cover: "covers/your-cover.jpg", src: "audio/06-track-name.mp3" },
```

The `id` must be unique among tracks (t1, t2, t3...).

## Why run a local server (recommended)

Some browsers block audio loaded from `file://` URLs. If a song won't load when you open `index.html` directly, run a local server from the project folder:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

## Features

**Playback**

- Play / pause / next / previous / shuffle / repeat
- Draggable progress and volume bars
- Playback speed control (1x, 1.25x, 1.5x, 1.75x, 0.75x)
- Click the total time to toggle between duration and time remaining
- Resumes where you left off: reloading the page restores the last track and position
- Integrates with the OS / lock-screen media controls (Media Session API)

**Organization**

- Likes (♡ → ♥), with a "Liked" tab in the navigation
- Playback queue: add tracks via the "⋮" menu, drag to reorder, remove individually
- Playlists: create, delete, click to open and view only that playlist's tracks; drag tracks from the list onto a playlist in the sidebar; remove tracks from within a playlist via its own "⋮" menu
- Real-time search by title or artist (filters within the current view: all tracks, liked, or a playlist)

**Interface**

- Light/dark theme with persistence
- State saved to `localStorage`: likes, playlists, theme, volume, last track and position
- Keyboard shortcuts: `Space` play/pause · `←`/`→` seek 5s · `M` mute · `L` like · `N`/`P` next/previous
- Toast warning when an expected MP3 hasn't been added to the `audio/` folder yet
- Fully responsive
- Accessible: labels, `aria-pressed`/`aria-expanded`, visible focus, skip link, keyboard-navigable menus

## File structure

```
Tonal/
├── index.html
├── style.css
├── script.js
├── audio/      ← your MP3 files
└── covers/     ← your cover art (optional)
```

## Improvements Applied

- Added SVG favicon
- Improved SEO metadata (title and description)
- Better project branding (Aftershock)
