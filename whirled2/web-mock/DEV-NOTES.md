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
| `src/api.js` | `WhirledApi` — register/login/chat/presence + `loginWithFacebookProfile` / link/unlink Facebook. If `WHIRLED_API` empty → **offline localStorage** (GitHub Pages default). |
| `src/styles.css` | Classic pale-blue chrome + theme presets (`#app[data-theme]`). |
| `server/server.mjs` | Optional Node API for shared chat when `WHIRLED_API` points at it. Not required for Pages. |
| `ENGINE-BRIDGE.md` | Full Pixi engineer runbook. |
| `CONCEPT.md` / `STATUS.md` | Product notes + what shipped. |

## How to bump cache-bust `?v=`

1. Pick a new token, e.g. `20260906o`.
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
2. Playlist: `whirled2.playlist.loft` = `{ source, tracks, current, ownerOnlyAdd, ownerControlsMusic, embedUrl, embedSrc, embedTitle }`. Legacy `currentIndex` migrates to `current`. Max 99 local tracks.
3. Room menu → **View room music**. Sources: **My uploads** | **YouTube** | **Spotify**. YouTube → `youtube-nocookie.com/embed/…`; Spotify → `open.spotify.com/embed/{type}/{id}`. Hosts validated (https only).
4. **Owner hard rule**: only loft owner switches source / pastes embeds / ownerOnlyAdd / remove-next. Guests listen; may add local tracks only when `ownerOnlyAdd === false`. Never guest yt/spotify URL changes. Defaults `ownerOnlyAdd: true`, `ownerControlsMusic: true`.
5. Local: hidden `<audio id="room-audio">`; soft autoplay + Click-to-play. Embed: `#room-embed-dock` iframe under stage (not `#stage-slot`); user presses play. Leaving room clears/hides dock, keeps storage.

## Legal

- Page: `legalPage()` via Help link, gate footer, Club mention, Me sidebar.
- Rules: no unauthorized copyrighted uploads; not affiliated with whirled.club / Three Rings; no proprietary asset redistribution; prototypes; coins labels only.

## Engine bridge (do not break)

- Empty `#stage-slot` inside `.stage-host`; decorate chips in `#decorate-layer` (z-index above canvas).
- Temporary `#stage-bubbles` for avatar speech/thought until Pixi owns nametags.
- `window.WhirledChrome` v0.4: `getStageEl`, `getSession`, `getRoom`, `onChat`, `sendChat`, `onOccupants`, `getChatUi`, `getWallet` (read-only `{coins,bars,streakDays}`). See `ENGINE-BRIDGE.md`.

## Profile look (Whirled profile themes)

- Key: `whirled2.profileSkin.{userId}` JSON — `{ bgType, bgColor, bgColor2, bgImage, bgRepeat, bgAttachment, accent, textColor, linkColor, panelAlpha, motto, tagline, fontScale, radius, moduleStyle, headerStyle, bannerImage }`.
- Apply: `applyProfileSkinDom(userId)` sets CSS vars (`--profile-font-scale`, `--profile-radius`, …) + **full `background` shorthand** on `.page.profile-page` / `.profile-skin`. Classes: `profile-mod-*`, `profile-header-*`, `profile-radius-*`. Optional `#profile-banner` under me-subnav.
- Presets always visible: Classic / Night / Sunset / Paper / Tile Soft / **Ocean / Forest / Candy / Mono** / Clear. Edit look: font 0.9|1|1.1, radius sharp|soft|round, module frosted|solid|outline, header band|minimal|accent-bar, banner (same size caps as BG).
- Clear = `bgType:none`. **No profile music.** Room music covers audio.
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

`whirled2.session`, `whirled2.users`, `whirled2.chat.loft`, `whirled2.chatTabs`, `whirled2.pm.*`, `whirled2.groupChat.*`, `whirled2.friendRequests`, `whirled2.friends.*`, `whirled2.recentRooms`, `whirled2.chatReactions`, `whirled2.stuff`, `whirled2.playlist.loft`, `whirled2.browserTheme`, `whirled2.groupTheme.*`, `whirled2.profileSkin.*`, `whirled2.roomLock.loft`, `whirled2.notices`, `whirled2.chatUi`, `whirled2.wallet.{userId}`, `whirled2.transactions`, …


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


## Coins + Bars / streaks (20260906o)

- Key: `whirled2.wallet.{userId}` — `{ coins, bars, lastLoginDay, streakDays, weekKey, weekLogins, totalLogins, statusCoinDay }`.
- Ledger: `whirled2.transactions` rows `{ at, kind, coins, bars, note }` — filter All / Coins / Bars on Me → Transactions.
- Daily claim on session `paint` via `claimDailyLogin()` (once per local calendar day). Modal `#daily-reward-modal`.
- Earn: passport stamp +25c; status +5c once/day; friend accept +15c each side.
- Bars earn-only (streak 7/14/21/30 + weekly). Never Buy Bars / payments UI.
- Shop: Buy disabled; `formatShopPrice` adds optional “or N bars” (10000 coins = 1 bar display).
- ENGINE DEV: wallet is chrome localStorage; optional `WhirledChrome.getWallet()`.
- Cache-bust: `?v=20260906p` (local ship; do not push unless asked).


## Occupant rail (20260906p)

- `occupantRailHtml` / `personRow`: you-first sort, presence dots (green here / yellow away / orange in-game stub), friend highlight, loft-owner ♛, optional filter when >5.
- Real `liveOccupants` only — no fake NPCs. Click opens existing occ menu.

## Facebook Connect (20260906s → combined prefer **20260906t**)

- **Keys**: `whirled2.facebookAppId` (digits); user rows may have `facebookId`, `facebookName`, `authProvider:'facebook'`, id `fb_{facebookId}`.
- **Optional stub**: `window.WHIRLED2_FB_APP_ID` in `index.html` comment/script.
- **Flow**: load SDK once App ID known → `FB.init({ version:'v21.0' })` → `FB.login` → `FB.api('/me', {fields:'id,name,email'})` → `WhirledApi.loginWithFacebookProfile` (or `linkFacebook` when already signed in).
- **Meta app setup**: developers.facebook.com → Facebook Login for Web → App Domains / Valid OAuth Redirect URIs include `https://whirledclassic.github.io/`.
- **Safety**: never invent FB users without SDK success; no payments; Discord/Google Coming Soon only.
- **Engine**: auth is chrome; session only — do not break `#stage-slot` / `syncRoomAudio` / ♪ Music.
- **Cache-bust**: leave `LOGO_V` / `index.html` alone mid-parallel-edit; combined music+profile+Facebook ship prefers `?v=20260906y`.

## Room music embeds + Profile BG (20260906t)

- **Mobile touch**: `#room-embed-dock` z-index 12, `pointer-events:auto`, iframe ≥200px (YT). Expanded sheet (`is-expanded`, fixed, z-index 100, stays under `#app`) for finger-sized player. External buttons do not rely on iframe chrome alone.
- **Parse**: music.youtube.com, Shorts/Live/embed/youtu.be/watch+list; Spotify intl- + parseable spotify.link only.
- **Profile BG**: Upload custom background card; `applyProfileSkinDom` full-bleed on `.page.profile-page`; never call it MySpace — Profile look / Customize look only.

## Room embed dock outside #main (20260906v)

- **Bug**: dock under `#main` was wiped by every `paint("rooms")`; park-to-`document.body` fixed the wipe but broke `#app` click delegation (Open/Close/Room music died after expand on phone).
- **Fix**: `#room-embed-dock` persistent in `shell()` after `#main` / before `.bar`. `ensureRoomEmbedDock` always uses that host — never `.stage-body`, never `document.body`. `applyRoomEmbedExpanded` only toggles `is-expanded` + Close visibility (CSS fixed sheet z-index 100). Document capture listener backup for embed controls. `ensurePlaylistPanel()` mounts `#room-playlist-panel` on `#app`. Prefer `classList` (never wipe `is-expanded` via `className=`).
- **Panel**: closes only via Close / leave room / `clearStrayUI` — keep open across source tabs.
- **Cache**: `LOGO_V` / `?v=20260906w` (superseded by x).

## Room music paste-URL (20260906w)

- **Bug**: `ensurePlaylistPanel()` always `replaceChild`ed on every `paint()` → destroyed `#playlist-embed-form` / `#playlist-smart-embed-form` mid-tap/paste; `type="url"` harsh on mobile; expanded dock (z=100) could cover panel (z=50/5).
- **Fix**: `playlistPanelDirty` gate; never rebuild while panel form control focused; `type="text"` `inputmode="url"` + 44px/16px; open paths `collapseRoomEmbedSheet()` + `focusPlaylistEmbedUrl()`; panel `#app > #room-playlist-panel` z-index 110; owner paste steps 1–2–3.
- **Cache**: superseded by `?v=20260906y`.

## Room music modal sheet (20260906x)

- **Bug A**: narrow fixed side panel (`min(320px,92vw)`) — most of the phone is outside; taps look like "close"; focus blur + deferred `playlistPanelDirty` remount wiped paste; `data-tab==="rooms"` strictness could unmount.
- **Bug B**: Set embed unreliable — blur/keyboard → miss button / hit stage; `isLoftOwner()` false for FB users ≠ `FIRST_USER_KEY` → orange "Owner controls" only; submit-only path flaky on mobile.
- **Fix**: `#room-playlist-panel.room-music-modal` full-screen dim (z=120) + `.room-music-card` (z=121); backdrop/Close/leave/`clearStrayUI` only; `ensurePlaylistPanel` keeps modal while `inRoom && playlistPanelOpen` (ignore flaky tab attr); clear dirty without remount when focused; `canControlRoomMusic()` + `playlist.ownerId` claim; `data-playlist-set-embed` type=button + `applyPlaylistEmbedFromUi` (querySelector URL) + `#playlist-embed-msg`; document capture once.
- **Cache**: `LOGO_V` / `?v=20260906y`. Do not push unless instructed.


## Room music background + loop (20260906y)

- **Hard rule**: modal Close / backdrop / Done ≠ stop audio. Only leave-room / local-source switch / `removeRoomEmbedDock` tears down the iframe.
- **Loop**: `roomEmbedSrcForIframe(pl)` — YT single `loop=1&playlist=VIDEO_ID`; playlist `loop=1`; `playsinline=1`. Spotify: UI note only.
- **Local**: `audio.loop = true` when one track; multi uses `playlistNext` wrap.
- **UI**: SVG ♪ chip + dock now-playing mini bar; Set embed → Done. Cache `?v=20260906y`. Do not push unless instructed.
