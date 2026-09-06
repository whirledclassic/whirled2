# Whirled2 — concept notes (wiki.whirled.club)

Whirled = social network + virtual world. Chrome tabs: **Me, Stuff, Games, Rooms, Groups, Shop**.

- **Stuff** left rail (wiki Stuff tab): Avatars, Furniture, Backdrops, Toys, Pets, Games (+ Level Packs / Item Packs), Launchers (shop “Games” aka launchers), Images, Music, Videos. Per category: “How do I get stuff?” + **Upload…** stub (local `whirled2.stuff`, images only for now; SWF later). Detail: gift / edit / delete / **List Item → Shop** / Delist — never invent demo items.
- **Shop** (wiki Shop): main page = Popular selections per major category; category browse + sort by rating / price / popularity / date; item comments & ratings; listings come from creator **List Item** into `whirled2.shop`. **Coins & Bars** are play currency — purchases disabled (no payments / no Buy Bars). Shop may show optional “or N bars” (10k coins ≈ 1 bar display math). Never invent catalog listings.
- **Mail**: header count; Me→Mail inbox/compose; unread blue highlight; **Select All** + **Delete Selected**; **Reply** + **Delete**; Send Mail from profiles/friends; Stuff **Send as Gift** attaches item (removed from sender; claim once on open).
- **Friends**: search by name/permaname (occupants + friends + known profiles + other local `whirled2.users`); online first (alpha), then recent; actions Invite / Send Mail / Whisper / Visit Home / Remove / **Join them!**. **Invite** opens Let’s be buddies! → creates **pending** `whirled2.friendRequests` (Accept/Decline/Retract; badge on Me→Friends). Multi-local-user: second account on this browser can Accept. **Invite Them!** share link + mailto. Occupant buddy invite = same modal path.
- **Profile look** (Whirled profile themes): own profile → Customize look — **presets always visible** (Classic / Night / Sunset / Paper / Tile Soft / Ocean / Forest / Candy / Mono / Clear) publish instantly; Edit look for fine-tune (BG, panel opacity, text/link colors, **fontScale**, **radius**, **moduleStyle**, **headerStyle**, optional **bannerImage** + **tagline**). Stored as `whirled2.profileSkin.{userId}`; applied on full `.page.profile-page` via `applyProfileSkinDom`. Visitors see skins on other profiles. **No profile music** — room music covers audio. ENGINE DEV: profile page chrome only; not `#stage-slot`.
- **Me**: My News (Comments / Friendings / Status + empty Announcements / Trophies / Updated Rooms), People Online Now, My Friends Online; **Passport** (earnable stamps in Mingle/Play/Create/Shop via local actions + Group Medals shell; Go! jumps to tab); **Account** (permaname / display / member since; **Facebook Connect** link/unlink + App ID setup; Discord/Google Coming Soon); sidebar classics — **My Blocklist** (`whirled2.blocklist`), **My Galleries** (`whirled2.galleries`), **My Transactions** (Coins/Bars ledger `whirled2.transactions` + wallet `whirled2.wallet.{userId}`), **Contests** (none running), **Share Whirled** (copy Pages URL). Coins & Bars play currency — daily/weekly streaks; Bars earn-only; no payments / no “Buy Bars” / no Bling cash-out yet (Coming Soon label on Transactions).
- **Rooms**: Featured / Active / Hot New / My Rooms tiles; Comment or rate + **room lock enforced locally** (`whirled2.roomLock.loft` `{ mode, ownerId }` — unlocked / friends / locked via `canEnterLoft`); **Decorate Room** shell places Stuff chips on a decorate layer (sibling of `#stage-slot`); layout in `whirled2.roomLayout.loft`. Take the Whirled Tour = local tips, not fake players.
- **Groups** (wiki Group): local clubs with discussion forum + Enter hall (lobby/loft meta); create/join/leave; no fake default groups.
- **Parties** (wiki Party): toolbar party board from `whirled2.parties`; create open/friends; join/leave local; notice-bar party name; follow-leader meta only (shared server later).
- **Help**: header Help — Starting Out tips + CONCEPT/STATUS spirit in-page.
- **Toolbar**: Go menu, Friends, Parties, Room menu (comment/rate, decorate, lock, lobby); volume later.
- **Games**: genre filters; Featured / favorites empty; list from `whirled2.games` only; detail + multiplayer lobby shell (local tables) — never invent players or catalog titles. Coins labels only.
- **Occupants**: modernized left rail — “In this room (N)”, you-first, presence dots (here / away / in-game stub), friend highlight, loft-owner crown; click opens menu (Profile / Whisper / Invite / Block / …). Optional filter when >5. Real session occupants only — no fake NPCs.
- **Stage**: empty `#stage-slot` shows “Your room — engine mounts here”; decorate chips live in sibling `#decorate-layer` inside `.stage-host`. Engine only via `window.WhirledChrome.getStageEl()`.
- Visual: pale blue classic chrome, dark teal stuff rail with pale selected state, logo `assets/whirled-classic-logo.png`. No gold/purple chrome. Engine mounts only in `#stage-slot` via `window.WhirledChrome`.

## Provenance (not a Flash / msoy port)

The original Whirled server/client lived in **[greyhavens/msoy](https://github.com/greyhavens/msoy)** (BSD-licensed Java / GWT / Flash / ActionScript; build with `ant distall`, run `./bin/msoyserver`). Related libraries were extracted under **[threerings/orth](https://github.com/threerings/orth)**. Those repos are **reference only**.

**Whirled2** (this web-mock) is a same-game revival: classic chrome + a new engine bridge (`window.WhirledChrome` / `#stage-slot`). It is **intentionally not a port** of msoy, not a Flash SWF rehost, and not a private-engine dump.

## Chat tabs (Room + Private)

Classic wiki Chat tabs vibe:
- **Room** tab (blue) = loft room chat.
- **Private** tabs (orange) = whispers; stored as `whirled2.pm.{sortedPair}`; state in `whirled2.chatTabs`.
- Friends toolbar popup → Whisper / Profile / Join them. Tab glimmer on unread. `/clear` clears active tab; Clear all clears all. Orange tint on input when PM active.

## Chat UI (Slide vs Overlay)

Classic (wiki.whirled.club/wiki/Chat):
- **Input**: bottom-left chrome — “Type here to chat!” + send (always when in a room).
- **Slide chat**: own dark panel beside (desktop) or under (phone) the room stage — black background window with full history scroll.
- **Overlay chat**: history on the **left side of the room window** (`#chat-overlay` inside `.stage-host`), not a dock above the send bar.
- **Hide chat history (F9)**: overlay only.
- Prefs in `whirled2.chatUi` (`mode`, `hideHistory`, `textSize`). Empty overlay stays hidden (no blank slab).


## Pokes

Pokes are **other-player only**. Own profile never offers Poke; handlers abort when the target id matches the session user. Poke toasts are transient (~3s) or dismissible via × / Clear all on the notice bar.

## Roles

Staff vibe without purple/gold chrome: **Admin** (deeper blue + optional Agent label) and **Mod** (teal) via `whirled2.roles`. Local-only promote/demote on Account for admins. The `test` profile is always treated as admin.

## Club / Membership

**Coming Soon.** Inspired by classic Club Whirled (extra rooms, cosmetics, supporter perks) — listed as *may / subject to change*. **Coins & Bars** are play currency (Bars earn-only via streaks); **no live payments**. Whirled2 is not affiliated with Three Rings or whirled.club; same-game-spirit revival on a new engine (greyhavens/msoy is reference only).

## Beginner comments

Source files carry short `// Information` / `// How this works` notes so new contributors can follow tabs, localStorage keys, chat modes, and the engine bridge without reverse-engineering every line.

## Themes (browser + themed Whirleds)

- **Browser themes** (Me → Themes): CSS variable presets on `#app[data-theme]` stored as `whirled2.browserTheme` (Classic Blue / Night Loft / Soft Sky). Extra “premium” cards are Coming Soon labels only — no payments.
- **Group world themes** (wiki [Whirleds FAQ](https://wiki.whirled.club/wiki/Whirleds_FAQ) / Create Whirleds): classic managers reskin the top bar (hex + images), mark allowed items, and mark rooms. Whirled2 ships an **Edit Whirled theme** Coming Soon shell on group detail for creators/managers, plus an optional local header hex draft in `whirled2.groupTheme.{groupId}` (prototype tint only).

## Room music / playlist

Stuff → Music accepts audio (MP3/WAV/OGG/WebM) as data URLs in `whirled2.stuff` (copyright checkbox required). Room menu → **View room music** uses `whirled2.playlist.loft` with `source: local | youtube | spotify`. Local queue uses HTML5 `#room-audio`; YouTube/Spotify use normalized embed iframes in `#room-embed-dock` (chrome sibling under stage — **not** inside `#stage-slot`). Soft autoplay for local only; embeds require user play (browser policy). **Owner controls music**: only loft owner switches source / pastes embeds / locks; guests listen; optional guest local-track adds when `ownerOnlyAdd` is false — never guest yt/spotify edits. Max 99 local tracks. Offline Pages-safe.

## Facebook Connect (20260906s)

Classic Whirled had Facebook Connect on Me → Account. Whirled2 gate offers **Continue with Facebook** (classic blue). Pure client-side Facebook JS SDK (GitHub Pages has no server secrets).

1. Deploy owner sets **Facebook App ID** (digits) in Account or gate mini-form → `localStorage whirled2.facebookAppId` (optional `window.WHIRLED2_FB_APP_ID` stub in `index.html`).
2. SDK: `connect.facebook.net/en_US/sdk.js` → `FB.init` `v21.0` → `FB.login` scopes `public_profile,email` → `FB.api('/me')`.
3. Map to local user `fb_` + Facebook id; store name (+ optional email) in `whirled2.users` with `authProvider:'facebook'`; session via same path as login success. Link existing session user with `facebookId` on the row; Unlink clears it.
4. Never invent FB users without SDK success. Discord / Google = Coming Soon labels only.

## Legal

Help / gate / Club point to **Legal / Disclaimer**: no unauthorized copyrighted uploads; Whirled2 is inspired by public research / open-source references — not a redistribution of whirled.club / Three Rings proprietary assets; logos/UI are Whirled2 originals or user-supplied; prototypes subject to change; Coins & Bars play currency — no payments.


## Modern chrome (20260906o)

- **Ctrl/Cmd+K** command palette — jump Me/Mail/Notices/Transactions/Friends/Stuff/Rooms/…, Enter loft, Clear chat, Themes.
- **?** shortcuts overlay — F9, /, Esc, Ctrl+K, `/think` `/me` `/speak` `/away` `/back`.
- Hash deep links: `#me/profile`, `#rooms`, `#mail`, `#stuff`, …
- Chat name context menu; group chat tabs; Me → Notices.
- Chat **reactions** (👍😂❤️🎉) on message id in `whirled2.chatReactions`.
- Copy invite link (room + profile). Recently visited strip on Rooms lobby. Presence pulse on online dots.


## Coins + Bars (classic dual currency, 20260906o)

Classic Whirled names kept: **Coins** (earned play/social) + **Bars** (premium-feel). Project rule: **no live payments** — Bars are **earned** via daily/weekly streaks and rare rewards, never “Buy Bars”. No PayPal / no Bling cash-out yet (Coming Soon on Transactions).

- Storage: `whirled2.wallet.{userId}` — `{ coins, bars, lastLoginDay, streakDays, weekKey, weekLogins, totalLogins }`.
- Daily claim (once per browser calendar day): +50 coins + streak bonus; Bars at streak 7/14/21/30; weekly 7 distinct days → +100 coins + 1 Bar.
- Shop prices stay in coins; optional “or N bars” label uses 10,000 coins ≈ 1 bar (display only).
- Header shows balances; click → Me → Transactions (All / Coins / Bars filters).
