# Aftershock — Music Player

A fully functional music player clone, built with semantic HTML, `id` reserved for JavaScript, and `class` for styling.

Seven tracks are already wired up and working: _If You Can't Hang_ (Sleeping With Sirens), _Circles_ (Pierce The Veil), _Good Things Go_ (Linkin Park), _Rollin'_ (Limp Bizkit), _See U in Hell_ (Papa Roach), _Afterlife_ (Evanescence), and _Vermilion Pt. 2_ (Slipknot).

The project is split into two independent services:

- **`frontend/`** — static client (HTML/CSS/JS) served by nginx. Knows nothing about MP3 files; it only talks to the API.
- **`backend/`** — Express API that owns the audio files and streams them on demand (with HTTP Range support, so seeking works without re-downloading the whole track).

## Running with Docker (recommended)

\`\`\`bash
docker compose up --build
\`\`\`

Then open `http://localhost:8080`. The frontend container proxies every `/api/*` request to the backend container internally, so no extra configuration is needed.

## Running without Docker

**Backend:**

\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

API available at `http://localhost:3001`.

**Frontend:** since the frontend now depends on the API (not on local files), serve it through a tool that can proxy `/api/*` to the backend, or simply use Docker Compose as above to avoid CORS/proxy setup by hand.

## Adding more songs

1. Drop the MP3 file into `backend/data/audio/` (rename it to something without spaces, accents, or quotes, e.g. `08-track-name.mp3`).
2. Drop the cover art (optional) into `frontend/assets/covers/`.
3. Add a new object to `backend/data/songs.json`:

\`\`\`json
{
  "id": "t8",
  "title": "Track name",
  "artist": "Artist",
  "album": "Album",
  "cover": "./assets/covers/your-cover.jpg",
  "file": "08-track-name.mp3"
}
\`\`\`

The `id` must be unique among tracks (t1, t2, t3...). Note the `file` field — it's just the filename inside `backend/data/audio/`; the API builds the actual streaming URL (`/api/tracks/:id/stream`) automatically.

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
- Toast warning when the requested track's audio file can't be streamed from the API
- Fully responsive
- Accessible: labels, `aria-pressed`/`aria-expanded`, visible focus, skip link, keyboard-navigable menus

## File structure

\`\`\`
Aftershock-Music-Player/
├── compose.yaml
├── README.md
├── frontend/
│   ├── index.html
│   ├── Dockerfile
│   ├── nginx.conf        ← proxies /api/* to the backend container
│   ├── assets/
│   │   ├── covers/       ← album artwork
│   │   └── images/       ← favicon and icons
│   ├── css/
│   │   ├── Tokens.css    ← design variables (colors, fonts, radii)
│   │   ├── Base.css      ← reset and global styles
│   │   ├── Layout.css    ← main grid
│   │   ├── Main.css      ← central area (topbar, hero, library)
│   │   ├── Sidebar.css   ← side navigation and playlists
│   │   ├── Player.css    ← bottom control bar
│   │   ├── TrackList.css ← track list
│   │   ├── Queue.css     ← queue panel
│   │   ├── Modal.css     ← "Now Playing" modal with lyrics
│   │   ├── Components.css← toast, context menu, buttons
│   │   └── Responsive.css← mobile breakpoints
│   └── js/
│       ├── Main.js       ← entry point and initialization
│       ├── Store.js      ← runtime state (not persisted)
│       ├── State.js      ← persisted state (localStorage)
│       ├── Data.js       ← fetches tracks from the API and lyrics
│       ├── Player.js     ← playback logic
│       ├── TrackList.js  ← track list rendering and interactions
│       ├── Queue.js      ← queue rendering and interactions
│       ├── Playlists.js  ← playlist rendering and interactions
│       ├── Modal.js      ← Now Playing modal and lyrics sync
│       ├── Navigation.js ← view switching (home, liked, playlist)
│       ├── Keyboard.js   ← keyboard shortcuts
│       ├── Theme.js      ← light/dark toggle
│       ├── Dom.js        ← centralized DOM references
│       └── Utils.js      ← formatTime, showToast, isLiked, getGreeting
└── backend/
    ├── index.js          ← Express app entry point
    ├── Dockerfile
    ├── package.json
    ├── routes/
    │   └── tracks.js     ← GET /api/tracks and GET /api/tracks/:id/stream
    └── data/
        ├── songs.json    ← track catalog
        └── audio/        ← MP3 files (never exposed directly to the client)
\`\`\`

## API

The backend exposes two endpoints:

| Method | Endpoint                  | Description                                              |
|--------|----------------------------|------------------------------------------------------------|
| GET    | `/api/tracks`              | Returns the full track catalog, with `src` pointing to the streaming endpoint |
| GET    | `/api/tracks/:id/stream`   | Streams the MP3 file for the given track id. Supports HTTP `Range` requests (`206 Partial Content`), so seeking works without downloading the whole file |

The frontend never accesses MP3 files directly — it only reads URLs returned by the API.

## Improvements Applied

- Added SVG favicon
- Improved SEO metadata (title and description)
- Better project branding (Aftershock)
- Decoupled the frontend from MP3 files: audio is now served through a dedicated Express API instead of static files
- Added HTTP Range support for proper seeking during streaming
- Split the project into independent `frontend/` and `backend/` services, each with its own Dockerfile
