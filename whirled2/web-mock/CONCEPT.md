# Whirled Classic — concept notes (wiki.whirled.club)

Whirled = social network + virtual world. Chrome tabs: **Me, Stuff, Games, Rooms, Groups, Shop**.

- **Stuff** left rail (wiki Stuff tab): Avatars, Furniture, Backdrops, Toys, Pets, Games (+ Level Packs / Item Packs), Launchers (shop “Games” aka launchers), Images, Music, Videos. Per category: “How do I get stuff?” + **Upload…** stub (local `whirled2.stuff`, images only for now; SWF later). Detail: gift / edit / delete / **List Item → Shop** / Delist — never invent demo items.
- **Shop** (wiki Shop): main page = Popular selections per major category; category browse + sort by rating / price / popularity / date; item comments & ratings; listings come from creator **List Item** into `whirled2.shop`. Coins are **labels only** — purchases disabled (“Coins are labels only — no payments”). Never invent catalog listings.
- **Mail**: header count; Me→Mail inbox/compose; Send Mail from profiles/friends.
- **Friends**: search by name/permaname (occupants + friends + known profiles only); online first (alpha), then recent; actions Add Friend / Send Mail / Visit Home / Remove. **Invite Them!** share link + mailto (no email-import). Occupant buddy invite = mail note (default “Let’s be buddies!”).
- **Me**: My News (Comments / Friendings / Status + empty Announcements / Trophies / Updated Rooms), People Online Now, My Friends Online; **Passport** (stamps in Mingle/Play/Create/Shop + Group Medals); **Account** (permaname / display / member since). Coins labels only — no payments / no “Get Bars”.
- **Rooms**: Featured / Active / Hot New / My Rooms tiles; Comment or rate + lock (visual); **Decorate Room** shell places Stuff chips on a decorate layer (sibling of `#stage-slot`); layout in `whirled2.roomLayout.loft`. Take the Whirled Tour = local tips, not fake players.
- **Groups** (wiki Group): local clubs with discussion forum + Enter hall (lobby/loft meta); create/join/leave; no fake default groups.
- **Parties** (wiki Party): toolbar party board from `whirled2.parties`; create open/friends; join/leave local; notice-bar party name; follow-leader meta only (shared server later).
- **Help**: header Help — Starting Out tips + CONCEPT/STATUS spirit in-page.
- **Toolbar**: Go menu, Friends, Parties, Room menu (comment/rate, decorate, lock, lobby); volume later.
- **Games**: genre filters; Featured / favorites empty; list from `whirled2.games` only; detail + multiplayer lobby shell (local tables) — never invent players or catalog titles. Coins labels only.
- **Occupants**: row menu (View Profile / Invite / Send Mail / Visit Home; self = View / Edit profile). Glow color legend text-only (Green door / White game / Blue player).
- **Stage**: empty `#stage-slot` shows “Your room — engine mounts here”; decorate chips live in sibling `#decorate-layer` inside `.stage-host`. Engine only via `window.WhirledChrome.getStageEl()`.
- Visual: pale blue classic chrome, dark teal stuff rail with pale selected state, logo `assets/whirled-classic-logo.png`. No gold/purple chrome. Engine mounts only in `#stage-slot` via `window.WhirledChrome`.
