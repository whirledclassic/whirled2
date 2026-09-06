# Whirled2 web-mock — DEV NOTES (hired developer handoff)

Plain-English map of the chrome. Read this before changing chat, notices, themes, or music.

## For the engine developer

You work on private **WhirledClassicGame** (Pixi). This folder is only the website chrome.

1. Read **[ENGINE-BRIDGE.md](./ENGINE-BRIDGE.md)** end-to-end before mounting.
2. Comment conventions in `app.js` / CSS:
   - `// How this works:` — beginner notes for chrome maintainers
   - `// ENGINE DEV:` — bridge contract (stage mount, API, bubbles you may later own)
3. Do not break `#stage-slot`, `exposeBridge()`, or `whirled:ready`.

---

## File map

| File | Role |
|------|------|
| `index.html` | Boot shell. Loads `src/styles.css`, `src/api.js`, `app.js`. **Cache-bust** with `?v=YYYYMMDDx` on every asset + reload links. |
| `app.js` | Almost all UI: gate, tabs, Me/Stuff/Games/Rooms/Groups/Shop, chat, notices, themes, playlist, stage bubbles. One big IIFE. |
| `src/api.js` | `WhirledApi` — register/login/chat/presence. If `WHIRLED_API` empty → **offline localStorage** (GitHub Pages default). |
| `src/styles.css` | Classic pale-blue chrome + theme presets (`#app[data-theme]`). |
| `server/server.mjs` | Optional Node API for shared chat when `WHIRLED_API` points at it. Not required for Pages. |
| `ENGINE-BRIDGE.md` | Full Pixi engineer runbook. |
| `CONCEPT.md` / `STATUS.md` | Product notes + what shipped. |

## How to bump cache-bust `?v=`

1. Pick a new token, e.g. `20260906n`.
2. Replace in `index.html` (CSS + JS `href`/`src`, and the “reload fresh” links).
3. Replace `LOGO_V` in `app.js`.
4. Replace in repo root `index.html` redirect (Pages) if present.
5. Mention the token in `STATUS.md` and Help text.
6. Push to `whirledclassic/whirled2` `main` so GitHub Pages picks it up. Hard-refresh or open the new `?v=` URL on phones.

## Room chat lifetime (visit-scoped)

- Leaving the room, logoff, or a fresh page load calls `clearRoomChatDisplay(true)` and removes `whirled2.chat.loft`.
- Entering a room starts with an empty chat. Old sessions do not reappear.
- Chat Options → **Clear all chat** (or `/clear`) wipes the same way (also clears `#stage-bubbles`).

## Chat modes (classic)

- Wiki: https://wiki.whirled.club/wiki/Chat
- Overlay → `#chat-overlay` absolute on left inside `.stage-host`.
- Slide → `#chat-log` dark panel (sibling of `.stage-host`).
- Do **not** `position:fixed` the overlay to the viewport / above the send bar — that broke phones.
- Prefs: `localStorage whirled2.chatUi` (`mode`, `hideHistory`, `textSize`, `bubbleDuration`).
- Stage bubbles (`#stage-bubbles`): separate from Slide/Overlay history; duration short/medium/long under Chat Options → Chat settings.
- `/think text` → thought bubble; `/me` → emote; normal → speech. System lines skip bubbles.

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

- Empty `#stage-slot` inside `.stage-host`; decorate chips in `#decorate-layer` (z-index above canvas).
- Temporary `#stage-bubbles` for avatar speech/thought until Pixi owns nametags.
- `window.WhirledChrome` v0.4: `getStageEl`, `getSession`, `getRoom`, `onChat`, `sendChat`, `onOccupants`, `getChatUi`. See `ENGINE-BRIDGE.md`.

## Profile look (Whirled profile themes)

- Key: `whirled2.profileSkin.{userId}` JSON — `{ bgType, bgColor, bgColor2, bgImage, bgRepeat, bgAttachment, accent, textColor, linkColor, panelAlpha, motto }`.
- Apply: `applyProfileSkinDom(userId)` sets CSS vars + **full `background` shorthand** on `.page.profile-page` and `.profile-skin` (class `has-profile-skin`). `.page` uses `background-color` only so shorthand wins. Double rAF re-apply after paint.
- Night preset: text `#e8f0f8`, link/accent `#7ec8f0`, panelAlpha ~0.60. Default panelAlpha ~0.72.
- UI: Me → My Profile → **Customize look** — presets **always visible** (no Edit look required). Edit look opens fine-tune form (“Profile look”). Preset publish keeps panel open → “Look published.”
- Clear = `bgType:none`. **No profile music.** Room playlist covers audio.
- ENGINE DEV: profile page chrome only; not `#stage-slot`.

## Room lock (local)

- Key: `whirled2.roomLock.loft` = `{ mode: "unlocked"|"friends"|"locked", ownerId }`.
- `canEnterLoft(viewerId)` gates enter / Join them / Go home. Owner always enters. Legacy bare-string values migrate on load.

## Friend requests (20260906n)

- Key: `whirled2.friendRequests` — `{id, fromId, fromName, toId, toName, message, status, at}`.
- Status: `pending|accepted|declined|retracted`. Invite does **not** call `addFriend` until Accept.
- Per-user friends: `whirled2.friends.{userId}` (+ legacy `whirled2.friends` synced for current session).
- Test Accept: register a second local account → login → Me→Friends → Requests.

## Chat tabs / PMs

- `whirled2.chatTabs` — `{ activeTabId, openPMs, unread }`.
- PM history: `whirled2.pm.{a}:{b}` sorted pair key.
- Friends toolbar (`data-tb=friends`) opens popup, not Me→Friends.

## LocalStorage keys (common)

`whirled2.session`, `whirled2.users`, `whirled2.chat.loft`, `whirled2.chatTabs`, `whirled2.pm.*`, `whirled2.groupChat.*`, `whirled2.friendRequests`, `whirled2.friends.*`, `whirled2.recentRooms`, `whirled2.chatReactions`, `whirled2.stuff`, `whirled2.playlist.loft`, `whirled2.browserTheme`, `whirled2.groupTheme.*`, `whirled2.profileSkin.*`, `whirled2.roomLock.loft`, `whirled2.notices`, `whirled2.chatUi`, …


## Modern shortcuts (20260906n)

- Ctrl/Cmd+K → command palette (`ensureModernOverlays`).
- `?` (when not in an input) → shortcuts overlay.
- `/` in room focuses chat input. Esc closes palette/popups.
- Gift mail: Stuff → Send as Gift removes item; open mail claims once (`giftClaimed`).


## Hash routes / Notices / Group chat (20260906n)

- Hash: `#me/profile`, `#me/mail`, `#me/notices`, `#rooms`, `#rooms/loft`, `#stuff`, … — `applyHashRoute` on boot; `syncHashRoute` on paint.
- Notices: Me → Notices + header bell; `read` flag on `whirled2.notices`.
- Group tabs: Chat Options → Groups; `whirled2.groupChat.{groupId}`; bluish-gray `.chat-tab-group`.
- Leave loft hangout invite: real `loftVisitOccupants` only.
