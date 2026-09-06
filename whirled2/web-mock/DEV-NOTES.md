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
| `src/api.js` | `WhirledApi` — register/login/chat/presence + `getRoomMusic` / `setRoomMusic` / `resyncRoomMusic`. If `WHIRLED_API` empty → **offline localStorage** (GitHub Pages default). |
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
2. Playlist: `whirled2.playlist.loft` = `{ source, tracks, current, ownerOnlyAdd, ownerControlsMusic, ownerId, embedUrl, embedSrc, embedTitle, startedAt, loop }`. Shared mirror: `whirled2.roomMusic.loft` (Pages) / server `roomMusic`. Legacy `currentIndex` migrates to `current`. Max 99 local tracks.
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

## Facebook Connect (removed in 20260906aa)

- Historical: client SDK + App ID lived in `?v=20260906s`–`y`. Removed — Meta App ID steps were required for Pages.
- See “Facebook Connect removed (20260906aa)” below.

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
- **Cache**: superseded by `?v=20260906z`.


## Room music background + loop (20260906y)

- **Hard rule**: modal Close / backdrop / Done ≠ stop audio. Only leave-room / local-source switch / `removeRoomEmbedDock` tears down the iframe.
- **Loop**: `roomEmbedSrcForIframe(pl)` — YT single `loop=1&playlist=VIDEO_ID`; playlist `loop=1`; `playsinline=1`. Spotify: UI note only.
- **Local**: `audio.loop = true` when one track; multi uses `playlistNext` wrap.
- **UI**: SVG ♪ chip + dock now-playing mini bar; Set embed → Done. Cache superseded by `?v=20260906z`.

## Classic visual theme polish (20260906z)

- **Colors**: `:root` `--paper` `#e8f4fb`, `--paper-2` `#cfe6f5`, `--ink` `#16324a`, `--accent` `#1e6fa8`, `--muted` `#4a6a80`, `--border` `#b7d3e8`, `--card` white.
- **Type**: `--ui` system/Trebuchet stack; body 14px; mobile inputs 16px; long text `line-height: 1.45`.
- **Flash fix**: `#main`/`#app` background `--paper`; `applyBrowserTheme` pins `#app[data-theme=classic|night|soft]`; `clearProfileSkinDom()` when leaving profile.
- **Fidelity crumbs**: Stuff “Your Stuff” blurb; status-panel link vs wallet colors; tab 76×32 selected wash; busy-friend orange class; dotted list rules.
- **Keep**: room stage dark, Overlay chat, music y dock/modal, Profile look on profile only.
- **Cache**: superseded by `?v=20260906ab`.


## Shared loft soundtrack (20260906aa)

- **Reality**: GitHub Pages cannot sync two phones alone. Demo server = shared sync; Pages = local-only (same browser / multi-tab via `storage` on `whirled2.roomMusic.loft`).
- **Server**: `GET/PUT /api/rooms/:id/music` → `{ source, embedUrl, embedSrc, embedTitle, startedAt, loop, ownerId, updatedAt }`. URL change resets `startedAt`. Optional `POST .../music/resync`.
- **Client**: owner Set embed → `publishRoomMusicFromPlaylist` → poll `pollSharedRoomMusic` ~2.5s with chat. Guests auto-apply `embedSrc`. YouTube: IFrame API `seekTo((now-startedAt)%duration)` when possible; else iframe `start=` on rebuild only.
- **UI meta**: “Shared soundtrack syncs when the demo server is running; Pages alone is local-only.” Copy: “Everyone in this loft hears the same loop (synced).”
- **ENGINE DEV**: chrome HTTP + `#room-embed-dock` only — never `#stage-slot`.

## Facebook Connect removed (20260906aa)

- Gate Continue with Facebook, Account link/unlink/App ID UI, and FB SDK load paths removed (Meta App ID was required for Pages).
- Username/password remains primary. Discord / Google stay Coming Soon labels.
- Legacy `fb_*` local users may still exist in `whirled2.users` — no SDK path to create new ones.

## Room preview before enter (20260906aa)

- Lobby tiles / recent chips use `data-room-preview` → `openRoomPreview` (modal `#room-preview-panel`). **Does not** set `inRoom`.
- Preview shows name, owner, lock, rating, occupant name chips (real `liveOccupants` only), optional now-playing, Enter / Cancel.
- Enter → soft `#room-enter-curtain` → `tryEnterLoft` → `paint` / `loadOccupants` / music poll.
- Visit Home / some Go paths may still `data-enter-room` direct.
- **ENGINE DEV**: preview is chrome on `#app`; Pixi mounts only after enter when `#stage-slot` exists.
- **Cache**: `LOGO_V` / `?v=20260906ab`. Do not push unless instructed.


## Club membership tiers (20260906ab)

- UI: `meClub()` — Free / Supporter / Creator / Studio cards; Coming Soon CTAs disabled.
- Design: `MEMBERSHIP.md` (Three Rings / Club Whirled lessons + creator platform cut).
- Keys: `whirled2.clubInterested.{userId}`, `whirled2.clubNotify.{userId}` (notify stub only).
- **No payments.** Coins/Bars stay play labels.
- ENGINE DEV: chrome only — do not gate `#stage-slot` on tier.
- **Cache**: `LOGO_V` / `?v=20260906ab`. Do not push unless instructed.

## Chat polish + Games expand (20260906ac)

- **Chat**: CSS deep-fix Overlay/Slide/tabs/bar/opts/`#stage-bubbles`; mobile Overlay-only unchanged.
- **Games**: `gamesHomeNavHtml`, parlor/AVR explainers, Coming Soon placeholders (not `whirled2.games` rows), `whirled2.gameScores` display stub, detail Play/Watch/Tables.
- **Cache**: `LOGO_V` / `?v=20260906ac`. Do not push unless instructed.

## Avatar lab deferred (?v=20260906ad)

- Classic SWF wardrobe is a **side project** — locked off for normal users.
- Unlock: `?avatarLab=1` (sets `localStorage whirled2.avatarLab=1`) or set that key to `"1"`.
- Default Stuff → Avatars: stub thumb upload + **“Classic SWF wardrobe — On hold”** (link/path to `AVATAR-IMPORT.md`).
- Lab on: wardrobe JSON (`whirled2.wardrobe`) + SWF blobs in IndexedDB `whirled2-media`; Wear sets `activeId` only — **room / `#stage-slot` unchanged**.
- Do **not** mount Ruffle or bump ENGINE-BRIDGE Flash ban yet (Phase 2 deferred).
- Cache: `LOGO_V` / `?v=20260906ad`. Do not push unless instructed.
