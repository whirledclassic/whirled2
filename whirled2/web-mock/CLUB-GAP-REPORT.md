# Whirled.club / wiki → web-mock gap report

**Date:** 2026-09-06 (America/New_York)  
**Cache / chrome:** `?v=20260906bn` (`LOGO_V`)  
**Sources:** wiki.whirled.club parse API dumps in `_wiki/` (Avatar, Stuff_tab, Room, Chat, Me*, Profile, Starting_out, Door, Music, Friends→Friend).  
**Rule:** only claim features that exist in this repo’s chrome. Never invent a fake catalog as shipped.

\* `Me` wiki page is **missing** (`missingtitle`). Classic “Me tab” behavior is inferred from Starting_out, Profile, Friend, Stuff_tab, Room.

---

## Executive summary

The web-mock is a **faithful chrome shell** around `#stage-slot` (engine mount), with local/hybrid accounts, Me/Profile look, Stuff sprite Wear, room music embeds, friends, mail, and earn-only coins/Bars. It is **not** a full classic Whirled client: no Flash/Ruffle loft avatars by default, shop economy out of scope; Make Door room graph shipped in `at` chrome, no Groups/Themed Whirled, no parlor/AVR games beyond Coming Soon stubs.

Login hybrid (API → offline localStorage fallback) was fixed in **`al`** and remains in force.

---

## Closed this pass (`?v=20260906bn`)

| Item | Notes |
|------|--------|
| /action /ac live | Prefix match → playAvatarEmote or chrome/Ruffle emote; bare opens Emotes menu |
| /msg /tell /w | Whisper aliases — open PM + optional send; occupant/friend name resolve |
| Club ★ legend | Wiki Room Club Whirled star — Coming Soon swatch (MEMBERSHIP.md) |
| Self Away/Back | Occupant self-menu toggles yellow name (wiki /away /back) |
| Preserve | bl/bm Flash loft interact (`classic-avatar.js` untouched); bg dual Wear; bk–bj club; Whirl; visit-since |

---

## Closed earlier (`?v=20260906bm`)

| Item | Notes |
|------|--------|
| /st alias | Wiki Chat `/state (/st)` |
| Bare mode slash | `/speak` `/think` `/shout` (+ shorts) alone switch Speak button |
| Room Zoom | Local CSS scale slider on `.stage-host` (wiki Zoom; engine camera later) |
| Snapshot modal | Wiki-faithful preview popup; capture still Coming Soon |
| Follow host | Parties board Coming Soon stub (shared presence later) |
| Hangout invite blue | Wiki Friend batch invite → blue notification bar |
| AVR name legend | Wiki Room AVR icon-over-name Coming Soon swatch |
| Preserve | bl Flash loft interact (`classic-avatar.js` untouched); bg dual Wear; bk–bj club; Whirl; visit-since |

---

## Closed earlier (`?v=20260906bk`)


| Item | Notes |
|------|--------|
| Local idle Zzz | ~2 min without pointer/key/chat → gray name + Zzz (wiki Room); /away still yellow |
| /e /em aliases | Wiki Chat /me /emote /em /e |
| /state stub | Coming Soon (AvatarControl / engine) — honest, no fake states |
| Boot… | Occupant + chat name menus Coming Soon (wiki Boot; no fake mod queue) |
| Away auto-reply | Whisper to away player shows their /away note when set |
| Pet legend | White swatch Coming Soon (wiki Room pets) |
| Invite to Join | Friends Invite Them! wiki Friend blurb |
| Preserve | bg dual Wear (`classic-avatar.js` untouched — parallel **bl** owns Flash); bj/bi/bh/bf/bc; Whirl; visit-since |

---

## Closed earlier (`?v=20260906bj`)

| Item | Notes |
|------|--------|
| /dnd | Wiki Chat Do Not Disturb — toggle away (default msg) / clear if already away |
| /bleepall | Session toggle hide-all room decorate items (wiki Bleep) |
| Show/Hide occupants | Chat options checkbox → hide left In this room rail |
| Chat filtering stub | Chat settings Coming Soon (no fake moderation queue) |
| /away default | Empty /away → “I'm away from the keyboard.” |
| Room menu Lock | Section label + beginner lock hint |
| Preserve | bg dual Wear (`classic-avatar.js` untouched); bi/bh/bf/be/bd/bc; Whirl; visit-since |

---

## Closed earlier (`?v=20260906bi`)

| Item | Notes |
|------|--------|
| Go Group halls | Joined groups in Go… → Groups home; browse Groups if none |
| Presence feed | Status changes (grey); mail + friend-request (blue); hint updated |
| View items Bleep | Per-item Bleep/Unbleep (session) + View in shop Coming Soon |
| Peach name legend | Logout-clone peach swatch Coming Soon (wiki Room name colors) |
| Room-avatar invite | Instant “Let's be buddies!” + “successfully mailed” toast (wiki Friend) |
| Room menu / chat-opts | Section labels; Groups reopen beginner blurb |
| Preserve | bg dual Wear (`classic-avatar.js` untouched); bh/bf/be/bd/bc; Whirl; visit-since |

---

## Closed earlier (`?v=20260906bh`)


| Item | Notes |
|------|--------|
| Furniture glow stubs | Orange link + white game chip clicks → Coming Soon toasts; on-stage glow legend |
| Occupant name colors | Blue here / yellow `/away` / gray idle Zzz (wiki Room) |
| Chat commands | `/help`, `/away [msg]`, `/action` stub; shortcuts list |
| Presence feed | Orange party-invite rows + Clear; wiki grey corner fidelity |
| Friends toolbar | Visit home for offline friends |
| View items | Categorized doors/furniture/toys/images + playlist (no avatars/pets) |
| Name menu | Send Mail added; Complain still Coming Soon |
| Preserve | bg dual Wear modes (`classic-avatar.js` untouched); bf Go/Friends/glow; bc Groups/Admin; Whirl; visit-since |

---

## Closed earlier (`?v=20260906bg`)

| Item | Notes |
|------|--------|
| Dual Wear modes | Whirled2 Smooth (`png-hybrid`) vs Classic Flash/Ruffle (`playbackMode` cards) |
| Wear persist | Strip huge SWF data URLs from worn snapshot; loft resolves SWF from IndexedDB |
| Docs / QA | HOW-CLASSIC dual-mode; qa-flash-check bg |

---

## Closed earlier (`?v=20260906bf`)

| Item | Notes |
|------|--------|
| Go menu sections | Wiki Go… — home / recent / friends online / games + beginner hint |
| Friends toolbar | Online-in-loft first + offline grey; Whisper / Profile / Join |
| Clickable furniture glow | Green door / orange link stub / white game stub legend |
| Login/logout corner feed | Friend presence feed (local heuristic) expand/collapse |
| Room comment + volume blurbs | Beginner wiki copy; Snapshot/Zoom Coming Soon tags |
| Chat name-menu | Invite to be your friend wording; Complain Coming Soon; party invite |
| Updates thread | bf ship note + overnightChangelogBody refresh |
| Preserve | be Music/Parties; bd badges; bc Groups/Admin/broadcast; bb Flash (classic-avatar.js untouched); Whirl; visit-since |

---

## Closed earlier (`?v=20260906be`)

| Item | Notes |
|------|--------|
| Music playlist UI | Bold current, added-by hover, owner ▶/✕, Bleep (you-only), info + Report stubs |
| Chat mode polish | Speak/Think/Shout button tints; classic “too chatty” wait copy |
| Parties board | Open/Friends pills, member count, follow-host Coming Soon |
| Stuff themed filter | Coming Soon banner + category how blurbs (no fake catalog) |
| Share/embed | Wiki blurb + LOGO_V on room share links |
| Preserve | bd PNG/Ruffle + decorate/social; bc Groups/Admin/broadcast; bb Flash; Whirl; visit-since |

---

## Closed earlier (`?v=20260906bd`)

| Item | Notes |
|------|--------|
| Playback clarity | Loft + Stuff badges: PNG hybrid / Whirl · PNG vs Ruffle (SWF); `getAvatarPlaybackMode()` |
| Decorate polish | Wired filter/snap/scale/z/dup/nudge/flip; snap persist; backdrop place |
| Friends search | matchWhy + status field; clearer empty/placeholder |
| Room lock | Pretty labels + Room Guardian stamp; preview who-can-enter |
| Groups polish | Accent theme form; manager pin/announce/lock; join stamp |
| Passport | Group medals from joined groups; Group Joiner / Room Guardian |
| Mobile immersion | Room menu Enter immersive |
| classic-avatar.js | Badge copy only — walk/tofu mount logic preserved |

---

## Closed earlier (`?v=20260906bc`)


| Item | Notes |
|------|--------|
| Groups forum | Real list/create/join, home logo/banner ph, threads/replies/search, sticky flags, Group chat |
| Seeded Whirled2 Developers | Updates & notes + Flash/avatars + General; overnight changelog + NaN + Flash-without-plugin posts |
| Admin panel | Me/header Admin; Make/Remove; whirled2.admins + forceAdmin bootstrap |
| /broadcast | Escalating coins (wiki Bars → documented coin model); highlighted bubble |
| Occupant NaN | sanitize/heal; QA AxNaNNaN fixed |
| Friends search | email / real name / interests (local only) |

---

## Closed earlier (`?v=20260906ax`)


| Item | Notes |
|------|--------|
| Room visual overhaul | Pale-blue Now playing dock; no green grass stage; soft presence dots; toast ≤2s; engine hint hidden when worn |
| Whirl starter | Rename Cyan Hair→Whirl; auto-seed + auto-Wear default; FLA Test stub in Stuff |
| Occupant NaN names | sanitizeDisplayName; self prefers session name; pad2 NaN-safe |
| Chat cleared stuck mid-stage | Clear → transient notice (not sticky overlay system bubble) |

---

## Closed earlier (`?v=20260906av`)

| Item | Notes |
|------|--------|
| Visit-scoped room chat + Clear my view | Enter = clean slate; poll uses since=; no cemetery rehydrate |
| Make Door / Drop Door / door travel | Decorate chip `doorTo`; create/link rooms; green glow; per-room layouts |
| Chat name-click menu | Profile / Add friend / Whisper / Block / Complain stub |
| Chat tabs Room vs Private | Clearer labels + colors; mobile touch height kept |
| Passport seals + door stamps | Door Builder / Room Hopper; medal-seal UI |
| Room actions chrome | Emotes / actions… + Decorate from self menu |


---

## A) Profile custom background — bug fixed this pass (`an`)

### Root cause
Quick upload (`#skin-bg-input-quick`) outside Edit look set `window.__skinBgPending`, then when `#skin-form` was missing called `paint("me")` and **returned without** `saveProfileSkin` / `applyProfileSkinDom`. After paint, chrome re-applied the **previously saved** skin from localStorage, so the chosen image preview vanished and never persisted as `bgType:image` + `bgImage`.

### Fix (`?v=20260906an`)
1. **Quick Choose image auto-publishes** via `publishQuickProfileBg` → `saveProfileSkin` (`bgType:image`, `bgImage`, cover/scroll) → `paint` → `applyProfileSkinDom`.
2. **Compress/resize** large non-GIF images (max dim 1600, jpeg quality steps) before save; clear `#skin-msg` / `#skin-msg-quick` + gate toast on reject; GIF still hard-capped ~900KB.
3. **Banner** path compresses + auto-saves (`publishQuickProfileBanner`) so Cancel cannot silently drop it.
4. Edit-look `#skin-bg-input` still live-previews; **Publish look** saves fine-tune fields.
5. Manual logic test: dataURL save/load roundtrip confirmed; old pending-only path leaves `bgImage` empty.

---

## Per-wiki comparison

### Avatar (wiki)
**Classic:** tofu default; Stuff → Wear; room click → Change avatar / states / actions; shop + remixable SWF.

| Area | web-mock | Gap |
|------|----------|-----|
| Default tofu | **Working** — `#avatar-wear-layer` tofu when nothing worn | — |
| Stuff Wear sprite packs | **Working** — PNG/WebP packs, viewer, scale, Wear happy-face | — |
| Room Change avatar… | **Working** — recent 5 + tofu + View full list | — |
| SWF / Ruffle loft | Lab **locked** (`?avatarLab=1` only); not default | **P0** for classic parity (engine) |
| Avatar states / actions | Emotes + room Actions chrome (`aq`/`at`); SWF states Coming Soon | SWF states **P1**/lab |
| Shop purchase avatars | Not shipped (earn-only; no payments) | **P2** (product) |

### Stuff_tab (wiki)
**Classic:** Avatars, Furniture, Backdrops, Toys, Pets, Games, Images, Music, Videos; gift via Mail.

| Area | web-mock | Gap |
|------|----------|-----|
| Avatars inventory + Wear | **Working** (sprite path) | SWF catalog **P0**/lab |
| Furniture / decorate place | Partial — decorate layer / place images | Decorate tools wired `bd` (still not full classic types) **P1** |
| Backdrops / toys / pets / videos | Not a full classic inventory | **P1–P2** |
| Music as Stuff items | Room playlist embeds (YT/Spotify), not MP3 Stuff shop | **P1** vs wiki MP3 upload |
| Send as Gift | Mail/gifts chrome exists in limited form | Full item gift **P2** |
| Themed Whirled inventory filter | Banner **Coming Soon** (`be`) — full filter later | **P2** |

### Room (wiki)
**Classic:** walkable rooms, backdrops, doors, control bar (chat options, volume, Go, friends, parties, share, room edit/lock).

| Area | web-mock | Gap |
|------|----------|-----|
| Enter loft / multi-room catalog | **Working** (local rooms map) | — |
| `#stage-slot` + loft placeholder | **Working** | Pixi engine ownership **P0** |
| Decorate / place | Partial | Full furniture edit **P1** |
| Lock / share / embed | Working chrome + pale-blue dock (ax) | Lock triad + preview blurbs `bd`; share/embed `be`; clickable glow legend `bf` |
| Make Door / door travel | **Working** (`at`) — decorate chip → Make Door → travel | — |
| Parties | **Improved** (`be`/`bm`) board + Follow host Coming Soon stub | Follow-host presence **P1** |
| Go / Friends toolbar | **Improved** (`bi`/`bk`) Go halls + Friends + Invite-to-Join blurb | Server presence **P1** |
| Clickable furniture glow | **Improved** (`bh`) legend + stub clicks; View items Bleep (`bi`) | Full link/game travel later **P2** |
| Click-to-walk chrome | Present until Pixi mounts (`am` notes) | Yield to engine **P0** |

### Door (wiki)
**Classic:** any furniture → door; create new room; Drop Door.

| Area | web-mock | Gap |
|------|----------|-----|
| Doors / Make Door / Drop Door | **Working** (`at`) localStorage rooms + layout doorTo | Engine glow/physics later |

### Chat (wiki)
**Classic:** room group chat, tabs, private, rate limit, name click menu (block, profile, friend, complain), colored modes.

| Area | web-mock | Gap |
|------|----------|-----|
| Bottom chat bar + room messages | **Working** (local / demo API when set) | — |
| Chat tabs (group/private) | **Improved** (`at`) Room vs Private labels/colors; Show/Hide occupants (`bj`); /e /em + /state stub (`bk`) | Group tabs still limited |
| Name click menu | **Improved** (`bh`/`bk`) Invite + Send Mail + party + Boot/Complain Coming Soon | Boot/Complain moderation **P2** |
| Speak/thought/shout + /broadcast | Modes + **broadcast** (`ba`); mode tints (`be`); `/dnd` + `/bleepall` (`bj`); `/e`/`/em` + `/state` stub (`bk`) | — |
| “Too chatty” throttle | **Working** (`be`) classic wiki copy | — |

### Me / Profile (wiki)
**Classic:** My Profile, photo 80×60, status→friend notices, info fields, passport medals, gender/age, home URL.

| Area | web-mock | Gap |
|------|----------|-----|
| Me → Profile + info/status/photo | **Working** | — |
| Profile look (themes, BG image, banner) | **Working** after `an` fix | — |
| Status → notices | **Working** (local) | — |
| Passport stamps / medals | **Improved** (`at`) seal UI + door stamps; earn-only | Local group medals from joined groups `bd`; shared whirled medals later **P2** |
| Permaname / email / age gates | Simplified register | Classic account fields **P2** |
| Wiki `Me` page | Missing upstream | Use Starting_out + Profile |

### Friend (Friends redirects here)
**Classic:** search by permaname/email/name; Add as Friend; pending states; room avatar invite; online list.

| Area | web-mock | Gap |
|------|----------|-----|
| Friend requests / accept / decline | **Working** (local multi-account) | — |
| Friendly People auto-accept | **Working** | — |
| Friends toolbar popup / online approx | **Working** (occupant-diff heuristic) | Server presence **P1** |
| Rich search (email/permaname) | **Improved** (`ba`) name/id/email/realName/interests (local) | Server directory **P1** |
| Friends toolbar popup | **Improved** (`bf`) online + offline rows; Join/Whisper/Profile | Server presence **P1** |
| Login/logout notices | **Improved** (`bi`) presence + status/mail/friend + orange party + Clear | Server presence **P1** |
| Room avatar “Invite to be your friend” | **Improved** (`bi`) instant default mail + wiki toast | Profile customize still available **—** |

### Music (wiki)
**Classic:** MP3 upload/shop; room playlist; owner controls; max 99 tracks.

| Area | web-mock | Gap |
|------|----------|-----|
| Room music panel + YT/Spotify embed | **Working** | — |
| Shared soundtrack when API up | **Working** (demo sync) | — |
| Mute-safe (no fetch when muted) | **Working** | — |
| MP3 Stuff upload / shop listen-before-buy | **Not shipped** | **P1** |
| Classic playlist UI (bold current, bleep) | **Improved** (`be`) bold/hover/▶✕/Bleep/info | Report moderation **P2** |

### Starting_out (wiki)
**Classic:** join, permaname, home room, shop, groups, contribute content.

| Area | web-mock | Gap |
|------|----------|-----|
| Register / login gate | **Working** (hybrid `al`) | — |
| Discord create on Pages+tunnel | **Working** when `WHIRLED_API` set; else Coming Soon | Secrets never in client |
| Home loft + earn coins/Bars | **Working** (earn-only) | Shop economy **out of scope** |
| Groups / discussions | **Working** (`ba`) forum + seeded Dev group; themed Whirled still Coming Soon | Themed Whirled **P2** |
| Creator upload to global Shop | Not shipped | **P2** |

---

## Priority backlog (concrete)

### P0
1. Engine mount in `#stage-slot` (Pixi) owning walk/avatar — chrome already yields.
2. ~~**Doors / Make Door** room linking~~ — **shipped `at`** (chrome localStorage graph).
3. Classic SWF avatar path in loft (Ruffle) when product unlocks lab — today locked on purpose.
4. ~~Profile quick BG upload persistence~~ — **fixed in `an`**.

### P1
1. ~~Richer chat tabs + name menus~~ — **improved `at`**; server-backed presence for friends still open.
2. Full passport / medals; ~~Groups forum~~ **shipped `ba`** (themed Whirled still open).
3. Broader Stuff types (furniture/backdrops/pets) without inventing shop SKUs.
4. MP3 / classic music item model vs embed-only.

### P2
1. ~~Parties board polish~~ **improved `be`**; complain/block; themed Whirled filter still Coming Soon.
2. Shop/remixable economy (conflicts with earn-only unless redesigned).
3. SWF avatar states/actions beyond sprite emotes.

---

## Bugs found while reading code (this pass)

| Bug | Status |
|-----|--------|
| Quick profile BG: pending + paint without `saveProfileSkin` | **Fixed `an`** |
| Large BG hard-reject ~900KB with no compress | **Fixed `an`** (compress + clearer toast) |
| Banner pending lost if leave Edit look without Publish | **Fixed `an`** (auto-save) |
| Login blank / tunnel vs Pages accounts | **Fixed earlier `al`** (hybrid) — do not regress |
| Share URL hardcoded old `?v=` | **Bumped to `at`** |
| SWF lab / fake catalog | Intentionally locked / Coming Soon — not bugs |

---

## Constraints honored

- Never MySpace (say **Profile look**).
- `#stage-slot` contract unchanged; Wear on sibling `#avatar-wear-layer`.
- SWF lab remains locked.
- Coins/Bars **earn-only** (no Buy Bars / payments).

---

## Wiki dump note

Raw JSON from `action=parse&prop=wikitext` lives under `_wiki/` for offline re-diff. `Friends` is a redirect to `Friend`. `Me` does not exist on the wiki.
