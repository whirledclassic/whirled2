# Whirled2 — concept notes (wiki.whirled.club)

Whirled = social network + virtual world. Chrome tabs: **Me, Stuff, Games, Rooms, Groups, Shop**.

- **Stuff** left rail (wiki Stuff tab): Avatars, Furniture, Backdrops, Toys, Pets, Games (+ Level Packs / Item Packs), Launchers (shop “Games” aka launchers), Images, Music, Videos. Per category: “How do I get stuff?” + **Upload…** stub (local `whirled2.stuff`, images only for now; SWF later). Detail: gift / edit / delete / **List Item → Shop** / Delist — never invent demo items.
- **Shop** (wiki Shop): main page = Popular selections per major category; category browse + sort by rating / price / popularity / date; item comments & ratings; listings come from creator **List Item** into `whirled2.shop`. Coins are **labels only** — purchases disabled (“Coins are labels only — no payments”). Never invent catalog listings.
- **Mail**: header count; Me→Mail inbox/compose; Send Mail from profiles/friends.
- **Friends**: search by name/permaname (occupants + friends + known profiles only); online first (alpha), then recent; actions Add Friend / Send Mail / Visit Home / Remove. **Invite Them!** share link + mailto (no email-import). Occupant buddy invite = mail note (default “Let’s be buddies!”).
- **Me**: My News (Comments / Friendings / Status + empty Announcements / Trophies / Updated Rooms), People Online Now, My Friends Online; **Passport** (stamps in Mingle/Play/Create/Shop + Group Medals); **Account** (permaname / display / member since); sidebar classics — **My Blocklist** (`whirled2.blocklist`), **My Galleries** (`whirled2.galleries`), **My Transactions** (label-only ledger `whirled2.transactions`), **Contests** (none running), **Share Whirled** (copy Pages URL). Coins labels only — no payments / no “Get Bars”.
- **Rooms**: Featured / Active / Hot New / My Rooms tiles; Comment or rate + lock (visual); **Decorate Room** shell places Stuff chips on a decorate layer (sibling of `#stage-slot`); layout in `whirled2.roomLayout.loft`. Take the Whirled Tour = local tips, not fake players.
- **Groups** (wiki Group): local clubs with discussion forum + Enter hall (lobby/loft meta); create/join/leave; no fake default groups.
- **Parties** (wiki Party): toolbar party board from `whirled2.parties`; create open/friends; join/leave local; notice-bar party name; follow-leader meta only (shared server later).
- **Help**: header Help — Starting Out tips + CONCEPT/STATUS spirit in-page.
- **Toolbar**: Go menu, Friends, Parties, Room menu (comment/rate, decorate, lock, lobby); volume later.
- **Games**: genre filters; Featured / favorites empty; list from `whirled2.games` only; detail + multiplayer lobby shell (local tables) — never invent players or catalog titles. Coins labels only.
- **Occupants**: row menu (View Profile / Invite / Send Mail / Visit Home; self = View / Edit profile). Glow color legend text-only (Green door / White game / Blue player).
- **Stage**: empty `#stage-slot` shows “Your room — engine mounts here”; decorate chips live in sibling `#decorate-layer` inside `.stage-host`. Engine only via `window.WhirledChrome.getStageEl()`.
- Visual: pale blue classic chrome, dark teal stuff rail with pale selected state, logo `assets/whirled-classic-logo.png`. No gold/purple chrome. Engine mounts only in `#stage-slot` via `window.WhirledChrome`.

## Provenance (not a Flash / msoy port)

The original Whirled server/client lived in **[greyhavens/msoy](https://github.com/greyhavens/msoy)** (BSD-licensed Java / GWT / Flash / ActionScript; build with `ant distall`, run `./bin/msoyserver`). Related libraries were extracted under **[threerings/orth](https://github.com/threerings/orth)**. Those repos are **reference only**.

**Whirled2** (this web-mock) is a same-game revival: classic chrome + a new engine bridge (`window.WhirledChrome` / `#stage-slot`). It is **intentionally not a port** of msoy, not a Flash SWF rehost, and not a private-engine dump.

## Chat UI (Slide vs Overlay)

Classic Chat Options (wiki Chat): **Slide chat** = own dark panel beside the room stage; **Overlay chat** = message bubbles over the room only (classic Whirled never showed an empty chrome slab). Prefer hide-when-empty: `#chat-overlay` stays `hidden` / `.is-empty` until there are messages; soft semi-transparent background only when bubbles exist. Preference in `whirled2.chatUi` (`mode`, `hideHistory`, `textSize`). Hide history is overlay-only (F9). Bottom input bar stays in both modes when you are in a room.

## Pokes

Pokes are **other-player only**. Own profile never offers Poke; handlers abort when the target id matches the session user. Poke toasts are transient (~3s) or dismissible via × / Clear all on the notice bar.

## Roles

Staff vibe without purple/gold chrome: **Admin** (deeper blue + optional Agent label) and **Mod** (teal) via `whirled2.roles`. Local-only promote/demote on Account for admins. The `test` profile is always treated as admin.

## Club / Membership

**Coming Soon.** Inspired by classic Club Whirled (extra rooms, cosmetics, supporter perks) — listed as *may / subject to change*. Coins/bars stay labels; **no live payments**. Whirled2 is not affiliated with Three Rings or whirled.club; same-game-spirit revival on a new engine (greyhavens/msoy is reference only).

## Beginner comments

Source files carry short `// Information` / `// How this works` notes so new contributors can follow tabs, localStorage keys, chat modes, and the engine bridge without reverse-engineering every line.

## Themes (browser + themed Whirleds)

- **Browser themes** (Me → Themes): CSS variable presets on `#app[data-theme]` stored as `whirled2.browserTheme` (Classic Blue / Night Loft / Soft Sky). Extra “premium” cards are Coming Soon labels only — no payments.
- **Group world themes** (wiki [Whirleds FAQ](https://wiki.whirled.club/wiki/Whirleds_FAQ) / Create Whirleds): classic managers reskin the top bar (hex + images), mark allowed items, and mark rooms. Whirled2 ships an **Edit Whirled theme** Coming Soon shell on group detail for creators/managers, plus an optional local header hex draft in `whirled2.groupTheme.{groupId}` (prototype tint only).

## Room music / playlist

Stuff → Music accepts audio (MP3/WAV/OGG/WebM) as data URLs in `whirled2.stuff` (copyright checkbox required). Room menu → View room playlist uses `whirled2.playlist.loft`. HTML5 `#room-audio` plays the queue; soft autoplay with Click-to-play if blocked. Owner (first user on this browser) can remove/next and toggle “Only owner may add”. Max 99 tracks. Offline Pages-safe.

## Legal

Help / gate / Club point to **Legal / Disclaimer**: no unauthorized copyrighted uploads; Whirled2 is inspired by public research / open-source references — not a redistribution of whirled.club / Three Rings proprietary assets; logos/UI are Whirled2 originals or user-supplied; prototypes subject to change; coins labels only.
