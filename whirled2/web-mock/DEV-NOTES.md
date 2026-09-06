# Whirled2 web-mock — DEV NOTES (hired developer handoff)

Plain-English map of the chrome. Read this before changing chat, notices, themes, or music.

## File map

| File | Role |
|------|------|
| `index.html` | Boot shell. Loads `src/styles.css`, `src/api.js`, `app.js`. **Cache-bust** with `?v=YYYYMMDDx` on every asset + reload links. |
| `app.js` | Almost all UI: gate, tabs, Me/Stuff/Games/Rooms/Groups/Shop, chat, notices, themes, playlist. One big IIFE. |
| `src/api.js` | `WhirledApi` — register/login/chat/presence. If `WHIRLED_API` empty → **offline localStorage** (GitHub Pages default). |
| `src/styles.css` | Classic pale-blue chrome + theme presets (`#app[data-theme]`). |
| `server/server.mjs` | Optional Node API for shared chat when `WHIRLED_API` points at it. Not required for Pages. |
| `CONCEPT.md` / `STATUS.md` | Product notes + what shipped. |

## How to bump cache-bust `?v=`

1. Pick a new token, e.g. `20260906b`.
2. Replace in `index.html` (CSS + JS `href`/`src`, and the “reload fresh” links).
3. Replace in repo root `index.html` redirect (Pages) if present.
4. Mention the token in `STATUS.md` and Help text.
5. Push to `whirledclassic/whirled2` `main` so GitHub Pages picks it up. Hard-refresh or open the new `?v=` URL on phones.

## Chat modes (classic)

- Wiki: https://wiki.whirled.club/wiki/Chat
- Overlay → `#chat-overlay` absolute on left inside `.stage-host`.
- Slide → `#chat-log` dark panel (sibling of `.stage-host`).
- Do **not** `position:fixed` the overlay to the viewport / above the send bar — that broke phones.
- Prefs: `localStorage whirled2.chatUi`.

## How chat submit works (and the radio bug we fixed)

- Bottom bar is `<form id="chat-form">` with `<input id="chat-input">`.
- **Chat Options** (`#chat-opts-menu`) is *inside* that form and injects `<input type="radio">` rows.
- Bug: `ev.target.querySelector("input")` returned the **first radio** (empty value) → early `return` → **Send did nothing** while the menu was open.
- Fix: for `#chat-form`, always read `#chat-input` first, then `pushChat(text)`, then clear. See the `// How this works (chat send + radio pitfall)` comment in `app.js`.
- `pushChat` → `WhirledApi.postChat("loft", text)`. Offline: appends to `localStorage` key `whirled2.chat.loft`.

## How notice-bar works

- `ensureNoticeBar()` appends `<aside id="notice-bar">` to `document.body`.
- `renderNotices()` draws party row + notice list.
- **Empty**: `innerHTML = ""`, `hidden = true`, class `is-empty`. CSS: `.notice-bar.is-empty, .notice-bar[hidden] { display: none !important; }`.
- Never show a permanent “No notifications” placeholder (that left a cream floating panel).

## Themes

- **Browser**: Me → Themes (or Account link). Sets `#app[data-theme]` + `localStorage whirled2.browserTheme`. Presets: `classic`, `night`, `soft`. Premium cards = Coming Soon labels only.
- **Group / themed Whirled**: creators see “Edit Whirled theme” Coming Soon (wiki Whirleds FAQ language). Optional local hex → `whirled2.groupTheme.{groupId}` tints that group page header only.

## Room music / playlist

1. Stuff → Music → Upload… accepts `audio/mpeg|mp3|wav|ogg|webm` (~2MB warn, ~4MB reject). Copyright checkbox **required**. Stored as `dataUrl` on the stuff item in `whirled2.stuff`.
2. Playlist: `whirled2.playlist.loft` = `{ tracks:[{id,stuffId,name,by,at,dataUrl}], currentIndex, ownerOnlyAdd }`. Max 99.
3. Room menu → **View room playlist**. Owner (first user id in `whirled2.firstUserId`) can Play / Remove / Next and toggle owner-only adds. Classic default = anyone may add.
4. Hidden `<audio id="room-audio">` plays current; `ended` advances. Soft autoplay on enter room; if blocked, **Click to play room music**. Volume toolbar toggles mute.

## Legal

- Page: `legalPage()` via Help link, gate footer, Club mention, Me sidebar.
- Rules: no unauthorized copyrighted uploads; not affiliated with whirled.club / Three Rings; no proprietary asset redistribution; prototypes; coins labels only.

## Engine bridge (do not break)

- Empty `#stage-slot` inside `.stage-host`; decorate chips in `#decorate-layer`.
- `window.WhirledChrome.getStageEl()` only. See `ENGINE-BRIDGE.md`.

## LocalStorage keys (common)

`whirled2.session`, `whirled2.users`, `whirled2.chat.loft`, `whirled2.stuff`, `whirled2.playlist.loft`, `whirled2.browserTheme`, `whirled2.groupTheme.*`, `whirled2.notices`, `whirled2.chatUi`, …
