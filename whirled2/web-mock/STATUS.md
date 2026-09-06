## What shipped (?v=20260906bw)

- **Flash Wear RELIABILITY:** IDB `blob:` avatars skip broken companion nest → **DIRECT outer Ruffle** (always visible) + chrome bob walk. Nested `Loader.load(blob|data)` rejected by Ruffle research.
- Watchdog / bridge-error remount DIRECT kept for http companion attempts.
- **Next:** `hostLoadBytes(base64)` in AvatarHost for real walk scenes via sharedEvents.
- Preserve: bu host SWF, bt never-tofu, bs Hybrid gate, bg dual Wear, Whirl
- Cache: **`?v=20260906bw`**. Push: `/tmp/push-bw.js`.

## What shipped (?v=20260906bu)

- **Flash/Ruffle CRITICAL:** nested **companion host SWF** (`assets/avatar-host/avatar-host.swf`, ORIGINAL MIT from `tools/avatar-host/AvatarHost.hx` via Haxe `--swf`)
- Loft Classic Flash: Ruffle loads host → `hostLoadUrl(avatar blob/url)` → `controlConnect` sharedEvents → `appearanceChanged_v2` walk scenes
- Floor click → `hostWalk(true,orient)` + chrome bob; arrive → `hostWalk(false)`; avatar click → `hostEmote` / action menu
- Fallback: direct avatar Ruffle + stand thumb (bt never-tofu) if host missing
- Preserve: bs Hybrid walk-gate, br club polish, bg dual Wear, Whirl, visit-since
- Cache: **`?v=20260906bu`**. Push: `/tmp/push-bu.js` (dry-run default). **Do not push from executor.**

## What shipped (?v=20260906bt)

- **Flash/Ruffle Wear→loft CRITICAL fix:** never blank/tofu when SWF worn — `mountRuffle` no longer wipes stand thumb; sha1-only Wear resolves IDB (no silent fail); placeholder glyph; face-flip bob; SWF markers beat stale `isTofu`
- **Protocol research:** Grey Havens `controlConnect` / `appearanceChanged_v2` documented; JS EI cannot inject sharedEvents — Phase-2 host SWF deferred (no AGPL copy / no compiler tonight); chrome puppet rock-solid
- **Preserve:** bs Hybrid walk-gate, br club polish, bg dual Wear, Whirl, visit-since
- Cache: **`?v=20260906bt`**. Push: `/tmp/push-bt.js` (dry-run default).

## What shipped (?v=20260906bs)

- **Flash/Ruffle playability (CRITICAL):** Wear Classic Flash SWF → loft shows SWF (or last thumb), **never tofu**; floor click moves billboard (bob/flip); nameplate/hitbox emotes (bubble + EI try); second SWF one-flow (Analyze → Classic Flash → Save → Wear & enter loft)
- **Root causes:** false Hybrid from thumb-as-idle; Wear persist dataURL blowup; playbackMode PNG path with empty walk; Ruffle PE/hitbox; setAvatarState blank frames (already guarded)
- **Research:** Ruffle EI/allowScriptAccess; Grey Havens AvatarControl sharedEvents (Phase-2 host SWF — no AGPL copy); chrome puppet best-effort now
- **Preserve:** br club (/clearall /myrooms /share /groups …), bl loft interact APIs, bg dual Wear cards, Whirl, visit-since
- Cache: **`?v=20260906bs`**. Push: `/tmp/push-bs.js` (dry-run default).

## What shipped (?v=20260906br)

- **Club gaps + polish (after bq):** wiki **/clearall** Clear all chat (Room+PM+group); **/myrooms** Me → My Rooms; **/share** Share/embed popup; **/groups** Chat options → Groups (loft) or Groups tab; **Friends toolbar double-click** → Whisper (parity); My Rooms Make Door blurb fix (doors already shipped); `/help clearall|myrooms|share|groups`
- **Preserve:** bl/bm Flash loft interact (`classic-avatar.js` UNTOUCHED — Flash playability **bs** parallel); bq /go /party /rooms /join + occ dbl-Whisper; bp /friends /who /home + Complain; bo Block; bn action/whisper; bg dual Wear; Whirl; visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906br`**. Push: `/tmp/push-br.js` (dry-run default).

## What shipped (?v=20260906bq)

- **Club gaps + polish (after bp):** wiki **/go** opens Go… toolbar; **/party|/parties** opens Parties! board; **/rooms** Back to Rooms lobby; **/join [name]** Join them in Studio Loft; **occupant double-click** → Whisper (parity with chat name; respects blocklist); `/help go|party|rooms|join`
- **Preserve:** bl/bm Flash loft interact (`classic-avatar.js` UNTOUCHED), bp /friends /who /home + Complain modal, bo Block/Unblock, bn /action whisper Club★, bg dual Wear, bk–bj club, Whirl, visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906bq`**. Push: `/tmp/push-bq.js` (dry-run default).

## What shipped (?v=20260906bp)

- **Club gaps + polish (after bo):** wiki **/friends** opens Friends Online toolbar (or Me→Friends); **/who** lists In this room occupants (away/zzz); **/home** Go home; **Complain…** Coming Soon modal (Report reason stubs + Block instead); **double-click** chat name → Whisper (respects blocklist); `/help friends|who|home|complain`
- **Preserve:** bl/bm Flash loft interact (`classic-avatar.js` UNTOUCHED), bo Block/Unblock + chat hide, bn /action whisper Club★, bg dual Wear, bk–bj club, Whirl, visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906bp`**. Push: `/tmp/push-bp.js` (dry-run default).

## What shipped (?v=20260906bo)

- **Club gaps + polish (after bn):** wiki **Block** hides room/group chat lines + stage bubbles for blocked players; **Block/Unblock** toggle on chat name + occupant menus; whisper + `/msg|/tell|/w` refuse when blocked; `/help clear` `/help back` `/help block` topics; blocklist copy + Go **Games awaiting** Soon tag
- **Preserve:** bl/bm Flash loft interact (`classic-avatar.js` UNTOUCHED), bg dual Wear cards, bn /action whisper Club★ Away/Back, bk–bj club, Whirl, visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906bo`**. Push: `/tmp/push-bo.js` (dry-run default).

## What shipped (?v=20260906bn)

- **Club gaps + polish (after bm):** wiki **/action|/ac** plays PNG or chrome/Ruffle emotes (prefix match; bare opens Emotes menu); **/msg|/tell|/w** whisper aliases; **Club ★** name-color legend stub; self occ-menu **Away/Back**; shortcuts/help refreshed
- **Preserve:** bl/bm Flash loft interact (`classic-avatar.js` UNTOUCHED), bg dual Wear cards, bk idle Zzz /e /em /state Boot, bj /dnd /bleepall /occupants, bi/bh/bf/bc, Whirl, visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906bn`**. Push: `/tmp/push-bn.js` (dry-run default).

## What shipped (?v=20260906bm)

- **Club gaps + polish (after bl):** wiki **/st** alias for /state; bare **/speak|/think|/shout** (and /sp /th /sh) switch compose mode; **Room Zoom** local CSS slider on `.stage-host`; **Snapshot** Coming Soon preview modal; Parties **Follow host** Coming Soon; hangout batch invite → **blue** notice; **AVR** name-color legend stub
- **Preserve:** bl Flash loft interact (`classic-avatar.js` UNTOUCHED), bg dual Wear cards, bk idle Zzz /e /em /state Boot, bj /dnd /bleepall /occupants, bi/bh/bf/bc, Whirl, visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906bm`**. Push: `/tmp/push-bm.js` (dry-run default).

## What shipped (?v=20260906bl)

- **Combined ship (bk club + Flash loft interactivity):**
  - **Club (from bk):** local idle **Zzz** (~2 min); wiki **/e /em**; **/state** stub; **Boot…** Coming Soon; away whisper auto-reply; pet **white** legend; Invite-to-Join blurb
  - **Flash/Ruffle:** Classic Flash Wear → loft floor click-to-walk (billboard move + bob); nameplate/hitbox emotes (chrome bubble + EI try); minimal `WhirledAvatarHost` shim (`allowScriptAccess` loft; `?avatarDebug=1`); Ruffle canvas PE-none; **Smooth PNG dual Wear intact**
- **Preserve:** bg dual Wear cards, bj /dnd /bleepall / Show-Hide occupants, bi/bh/bf/bc, Whirl, visit-since
- Docs: HOW-CLASSIC + QA-FLASH honest Ruffle what-works
- Cache: **`?v=20260906bl`**. Push: `/tmp/push-bl.js` (dry-run default; parent pushes combined).

## What shipped (?v=20260906bk)

- **Club gaps + polish (after bj):** local idle **Zzz** (~2 min activity clock → gray name); wiki **/e /em** aliases for /me; **/state** Coming Soon stub; **Boot…** Coming Soon on occupant + chat name menus; away whisper auto-reply uses /away note; pet **white** name legend; Invite friends to Join Whirled2 blurb
- **Preserve:** bg Flash dual Wear modes (`classic-avatar.js` UNTOUCHED — Flash/Ruffle interactivity owned by parallel **bl**), bj /dnd /bleepall / Show-Hide occupants, bi halls/presence/Bleep, bh glow/name colors, bf Go/Friends, be Music/Parties, bd badges, bc Groups/Admin, Whirl, visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906bk`**. Push: `/tmp/push-bk.js` (dry-run default).

## What shipped (?v=20260906bj)

- **Club gaps + polish (after bi):** `/dnd` toggle (wiki default away message); `/bleepall` session hide-all room items; Chat options **Show/Hide occupants**; chat filtering Coming Soon stub; `/away` empty → classic default copy; Room menu **Lock** section label
- **Preserve:** bg Flash dual Wear modes (`classic-avatar.js` playbackMode UNTOUCHED — still VERSION bg), bi halls/presence/Bleep, bh glow/name colors, bf Go/Friends, be Music/Parties, bd badges, bc Groups/Admin, Whirl, visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906bj`**. Push: `/tmp/push-bj.js` (dry-run default).

## What shipped (?v=20260906bi)

- **Club gaps + polish (after bh):** Go menu **Group halls** (joined groups); presence feed status/mail/friend (blue) notices; View items **Bleep**/Unbleep + View in shop Coming Soon; peach logout-clone name legend; room-avatar Invite → wiki “successfully mailed” toast; Room menu section labels; chat-opts Groups reopen beginner blurb
- **Preserve:** bg Flash dual Wear modes (`classic-avatar.js` playbackMode UNTOUCHED — still VERSION bg), bh furniture glow/name colors/help, bf Go/Friends/glow, be Music/Parties, bd badges, bc Groups/Admin, Whirl, visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906bi`**. Push: `/tmp/push-bi.js` (dry-run default).

## What shipped (?v=20260906bh)

- **Club gaps + polish (after bg):** furniture orange/white stub clicks + on-stage glow legend; occupant name colors (blue/yellow/gray Zzz); `/help` + `/away <msg>` + `/action` stub; presence feed orange party invites + Clear; Friends toolbar Visit home (offline); Room View items categories; chat name-menu Send Mail; hangout batch invite copy
- **Preserve:** bg Flash dual Wear modes (`classic-avatar.js` playbackMode cards UNTOUCHED), bf club Go/Friends/glow/presence, be Music/Parties, bd badges, bc Groups/Admin/broadcast, Whirl, visit-since
- Updates thread sticky OP + ship note refreshed
- Cache: **`?v=20260906bh`**. Push: `/tmp/push-bh.js` (dry-run default).

## What shipped (?v=20260906bg)

- **Dual Wear modes (Flash):** clear radio/cards before Wear — **Whirled2 Smooth** (`playbackMode: png-hybrid`) vs **Classic Flash (Ruffle)** (`playbackMode: ruffle`)
- Default: Smooth if PNG idle/walk exist, else Ruffle if SWF, else Whirl; SWF-only gets CTA to attach PNGs for Smooth
- Reliable Wear/persist: strip huge SWF data URLs from worn snapshot (no tofu / blown localStorage); loft mount still resolves SWF from IndexedDB
- Badges unchanged vocabulary: `Walking: PNG hybrid (no Ruffle)` / `Appearance: Ruffle (SWF)`
- Docs: HOW-CLASSIC dual-mode why/when; Dev Hub + Dev Updates thread; prefer `src/classic-avatar.js` + minimal app.js hooks
- Built beside **bf** club Go/Friends/glow/presence — did not regress club work; Whirl, chat visit-since, Groups, badges preserved
- Cache: **`?v=20260906bg`**. Push: `/tmp/push-bg.js` (dry-run default).

## What shipped (?v=20260906bf)

- **Go menu wiki sections:** Go home / Recently visited / Friends online / Games awaiting players + beginner hint
- **Friends toolbar:** online-in-loft first + offline grey rows; Whisper / Profile / Join them
- **Clickable furniture glow legend:** green=door travel, orange=link stub, white=game stub (wiki Room)
- **Friend login/logout corner feed:** local presence feed (wiki Chat grey notices); expand/collapse
- **UI polish:** room menu Snapshot/Zoom Coming Soon tags; volume + room-comment beginner blurbs; chat name-menu Invite/Complain clarity
- **Updates thread:** Whirled2 Developers ship note + refreshed sticky OP (`overnightChangelogBody`)
- Built on **be** Music/Parties — **did not regress** bd badges, bc Groups/Admin/broadcast, bb Flash (`classic-avatar.js` untouched this letter), Whirl, visit-since
- Cache: **`?v=20260906bf`**. Push: `/tmp/push-bf.js` (dry-run default).

## What shipped (?v=20260906be)

- **Club Music playlist fidelity (wiki Music):** bold Now playing, hover “Added by…”, owner ▶ (blue) / ✕ (red), **Bleep** (session mute/skip for you), info toast + Report stub
- **Chat modes polish:** Speak / Think / Shout button tints + input accents; classic throttle copy: “You're being too chatty. Wait a moment and try again.”
- **Parties! board:** clearer Open/Friends pills, member count, follow-host Coming Soon, beginner create/invite copy
- **Stuff:** themed Whirled inventory filter Coming Soon banner + per-category how blurb (no fake catalog)
- **Share/embed:** wiki Room blurb + `LOGO_V` on share links
- Built on **bd** PNG/Ruffle badges + decorate/friends/lock/groups/passport — **did not regress** bc Groups/Admin/broadcast, bb Flash hybrid, Whirl, chat visit-since
- Cache: **`?v=20260906be`**. Push: `/tmp/push-be.js` (dry-run default).

## What shipped (?v=20260906bd)

- **Playback clarity (user confusion fix):** loft nameplate + Stuff Wear cards show crystal-clear badges:
  - `Walking: PNG hybrid (no Ruffle)` / `Whirl · PNG` when PNG spritesheets drive motion
  - `Appearance: Ruffle (SWF)` only when `#avatar-ruffle-host` is actually mounted
  - Debug: `WhirledChrome.getAvatarPlaybackMode()` → `png-hybrid` | `ruffle` | `tofu` | `png`
  - HOW-CLASSIC opening strengthened: walking Whirl/Hybrid PNGs ≠ Ruffle
- **Decorate polish:** wired missing filter/snap/scale/z/dup + nudge/flip; snap persists; backdrops place larger
- **Friends search:** email / real name / interests / status + matchWhy badge
- **Room lock:** clearer labels + Room Guardian stamp; preview who-can-enter blurb
- **Groups:** accent theme form (managers); pin/announce/lock thread tools; join → Group Joiner stamp
- **Passport:** group medals from joined groups; Room Guardian / Group Joiner seals
- **Mobile immersion:** Room menu Enter immersive (not only landscape auto)
- Built on **bc** Groups/Admin/broadcast/NaN + **bb** Flash hybrid — **did not regress** `classic-avatar.js` walk/tofu
- Preserve: Whirl starter, chat visit-since, pale-blue chrome, earn-only, no MySpace, no fake catalog
- Cache: **`?v=20260906bd`**. Push: `/tmp/push-bd.js` (dry-run default).

## What shipped (?v=20260906bc)

- Groups forum + seeded Whirled2 Developers; Admin; /broadcast; NaN heal; friends search fields.

## What shipped (?v=20260906bb)

- Flash walk/tofu polish + HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md

# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Standing rules

- Coins/Bars earn-only; never invent fake catalog.
- Never say MySpace; say Profile look.
- `#stage-slot` = engine mount; Wear / chrome walk / emotes on `#avatar-wear-layer` sibling.
- No secrets in client — only `WHIRLED_API` origin.
- **Whirl** is the starter avatar (slug `cyan-hair`).
- **Walking animation with Whirl/Hybrid PNGs is not Ruffle** — Ruffle is SWF-only.
