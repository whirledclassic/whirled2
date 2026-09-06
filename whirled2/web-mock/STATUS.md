## ?v=20260906cm
- Chrome-only engineSrc mount; no private engine in repo; Nabir repo untouched.

## What shipped (?v=20260906cm — cover was hiding walk; DemoAvatar DIRECT visible)

- **Root cause:** CSS `companion-cover` forced stand tofu/thumb `z-index:6` over `ruffle-player` — DemoAvatar green walk ran **under** static cover (invisible). Nest lag made it worse.
- **Fix:**
  1. CSS `:has(ruffle-player)` hides stand; player z-index 4; hide on `.is-playing` / billboard `.is-walking`.
  2. `shouldCompanionOnly` → **demo-avatar / flashQa DIRECT** + EI `hostWalk`. Real Body still COMPANION-ONLY.
  3. JS `hideStandCoverForPaint` on chromeWalkTo / notifyLoftWalk / connected / DIRECT remount.
  4. Tofu: `transform-box:fill-box` on `.tofu-leg-l/r`; stand tofu SVG leg groups + bob when walking.
- Preserve ck: AvatarHost soft connect / ConnectBag props; cj tofu CSS + chrome floor-click.
- Docs: `SMOOTH-RUFFLE.md`, `QA-FLASH.md`, `ROOT-CAUSE.md` (“cover was hiding walk”).
- Cache: **`?v=20260906cm`**. Push: `/tmp/push-cl.js` (`WHIRLED_DO_PUSH=1`).

## What shipped (?v=20260906ck — companion hostWalk + DemoAvatar continuous walk)

- **Analysis:** `WHY-FLASH-FAILS.md` — hop-by-hop why Flash walk failed + Grey Havens cite-only replication map (no AGPL).

- **Goal:** Classic Flash floor click plays **real walk animation** for the whole trek (not chrome bob only).
- **DemoAvatar rebuild:** `ConnectBag` public `props` (Ruffle drops dynamic Event props) + ENTER_FRAME leg cycle + EI `hostWalk` for DIRECT fallback.
- **AvatarHost:** soft `connect_soft_fail` (no remount on no-userProps race); stronger `evt.props` read.
- **classic-avatar:** soft bridge errors; status badge `connected` / `DIRECT` / `DIRECT+walk`; DIRECT EI walk without flipping companion flag.
- **Preserve cj:** tofu CSS leg/bob; chrome floor-click always on unless `data-engine-owns-avatar-walk=1`.
- Assets: `demo-avatar.swf` (both paths), `avatar-host.swf` rebuilt.
- Cache: **`?v=20260906ck`**. Docs: `SMOOTH-RUFFLE.md`, `QA-FLASH.md`.

## ?v=20260906cj (preserve)
- Default tofu: floor click + CSS leg/bob (was early-return blocked).
- Chrome Wear walk always binds unless `#stage-slot[data-engine-owns-avatar-walk=1]` (Pixi canvas no longer kills click-walk).

## ?v=20260906cj
- Default tofu: floor click enabled + CSS leg/bob walk (was early-return blocked).
- Full Ruffle smooth walk still cooking in parallel.

## What shipped (?v=20260906cj — tofu+T junk UI; demo-avatar on Pages; stand ≠ letter)

- **Root cause (screenshot):** loft showed classic tofu face + grey rounded **"T"** glyph. Letter came from `classic-swf-placeholder` / `ensureStandFallback` initial (name "Tofu" → T). Companion-cover called ensureStand with non-soft reasons → `is-failed` kept glyph on TOP. `assets/ruffle/demo-avatar.swf` was **404** on Pages (flashQa/docs sometimes pointed there); paint-only path + failed nest → no Classic Flash Wear visible.
- **Fix:**
  1. Ship **`assets/ruffle/demo-avatar.swf`** (mirror of flash-qa Body demo) + keep `assets/avatars/flash-qa/demo-avatar.swf`.
  2. `ensureStandFallback` / `classicRuffleWearHtml` / `classicWearSlotHtml`: **NEVER letter glyph** — stand PNG/thumb or `classic-swf-stand-tofu` SVG. CSS hides legacy `.classic-swf-placeholder`.
  3. Companion-cover / mounting = **soft** (not `is-failed`). Watchdog → DIRECT remount sooner (~3.2s); DIRECT falls through body-demo alt → `demo-qa.swf`.
  4. flashQa wears Body demo with SVG stand thumb + `swfUrlAlt` mirror path.
- Preserve: companion-only nest, hostLoadBytes ready-gate, dual Wear, no `#stage-slot` Ruffle, no AGPL.
- Cache: **`?v=20260906cj`**. Push: `/tmp/push-ci.js` (`WHIRLED_DO_PUSH=1`).

## What shipped (?v=20260906ch — COMPANION-ONLY walk nest; EI ready-gate)

- **Root cause:** cg companion never `"connected"` — EI silent-miss + ready flush could hit DIRECT; `hostLoadBytes` not gated on ready. See `WALK-E2E-ANALYSIS.md` / `ROOT-CAUSE.md`.
- **Fix:** `WEAR_COMPANION_ONLY=true` — mount `avatar-host.swf` into `#avatar-ruffle-host` with stand cover (`companion-cover`) until bridge connected; `hostLoadBytes` after ready; `resolveHostEiPlayer`; undefined EI = miss; fail→DIRECT.
- flashQa wears `demo-avatar.swf` (AvatarControl mimic), not paint-only `demo-qa.swf`.
- Preserve: dual Wear, Smooth PNG, chrome bob, no `#stage-slot` Ruffle, no AGPL.
- Cache: **`?v=20260906ch`**. Push: `/tmp/push-ch.js` (`WHIRLED_DO_PUSH=1`).

## What shipped (?v=20260906cg — SAFE companion Option A; DIRECT preserved)

- **Fix:** Wear stays DIRECT-first. Companion upgrade uses sibling `#avatar-companion-layer` (opacity 0) — never `mountRuffle(host)` into the visible host until bridge `"connected"`. Fail/watchdog ~4s tears companion only; DIRECT stays.
- Flag: `WEAR_SAFE_COMPANION_UPGRADE = true` (legacy `WEAR_AUTO_COMPANION_UPGRADE` stays false). `loftUsesCompanionHost` only on `"connected"`.
- Docs: `ROOT-CAUSE.md`, `RUFFLE-SOURCE-DEEP.md` implementation note, `QA-FLASH.md`.
- Preserve: cf DIRECT paint, by hostLoadBytes, walk-lerp/spoke/sleep, dual Wear, Whirl
- Cache: **`?v=20260906cg`**. Push: `/tmp/push-cg.js` (`WHIRLED_DO_PUSH=1`).

## What shipped (?v=20260906cf — DIRECT-stable Wear; companion auto-upgrade OFF)

- **Regression:** `?v=20260906ce` auto-upgrade (DIRECT → delayed companion nest) wiped visible Wear again — blank loft / companion wipe (worse than before). See `ROOT-CAUSE.md`.
- **Fix:** loft Wear paints avatar **DIRECT** on outer Ruffle and **keeps it** (cd/cb DIRECT-stable). `WEAR_AUTO_COMPANION_UPGRADE = false`. Companion helpers (`startCompanionWithPayload`, companion-pending CSS, watchdog) stay gated off for Wear default.
- Stand thumb stays visible; chrome bob/emotes keep working. Do **not** re-enable companion until Ruffle source research says nested `sharedEvents` / `hostLoadBytes` is safe.
- Preserve: ce companion code (gated), cd Ruffle config, cb blank-loft safety, by hostLoadBytes, dual Wear, Whirl
- Cache: **`?v=20260906cf`**. Push: `/tmp/push-cf.js` (`WHIRLED_DO_PUSH=1`).

## What shipped (?v=20260906ce — DIRECT-first + safe companion upgrade for walk frames)

- **Root cause:** cd Wear skipped companion auto-upgrade → stock SWFs never got `appearanceChanged_v2` walk scenes (chrome bob only). See `ROOT-CAUSE.md`.
- **Fix:** loft Wear still mounts avatar **DIRECT** first (visible). After paint (~450ms), upgrade to companion `hostLoadBytes` nest. `loftUsesCompanionHost` only on bridge `connected`. Watchdog ~3.5s / error → remount DIRECT. Stand stays on TOP during `companion-pending`.
- Preserve: cb blank-loft safety, by hostLoadBytes, walk-lerp/spoke/sleep, dual Wear, Whirl
- Cache: **`?v=20260906ce`**. Push: `/tmp/push-ce.js` (`WHIRLED_DO_PUSH=1`).

## What shipped (?v=20260906cd (config before ruffle.js inject; callExternalInterface first))

- **Ruffle integration (docs-correct):** `publicPath` for self-host wasm; load via `player.ruffle().load`; IDB avatars prefer `{data: ArrayBuffer}` via `resolveSwfBytes`; EI via `callExternalInterface` first; `RUFFLE-INTEGRATION.md`
- Preserve: cb DIRECT-stable Wear (no companion wipe), by self-host pack, Flash opt-in dual modes
- Cache: **`?v=20260906cd`**. Push: `/tmp/push-cc.js` (dry-run default). **Do not push from executor.**

## What shipped (?v=20260906cb)

- **Flash blank loft CRITICAL:** companion-first left transparent empty `host.swf` + faded stand → nothing visible (worse than tofu).
- **DIRECT-stable:** loft Wear mounts avatar SWF via outer Ruffle first and **keeps it** (no auto companion remount that wipes a working paint). Stand thumb/glyph always present; behind player once `data-mount-mode=direct` + `is-playing`.
- CSS: never hide stand during mount/companion-pending; never `classic-png-under-swf` (opacity 0) without connected paint.
- Companion nest + watchdog DIRECT remount remain coded for walk-scene opt-in later; Wear path skips auto-upgrade.
- Preserve: bz flashQa, by self-host Ruffle, hostLoadBytes, walk-lerp/spoke/sleep
- Cache: **`?v=20260906cb`**. Push: `/tmp/push-ca.js` (dry-run default). **Do not push from executor.**

## What shipped (?v=20260906bz)

- **Flash QA cleanup:** removed duplicate `flashQa` guest helpers in `app.js` (one path: ephemeral session → Wear demo → loft)
- Preserve by: self-host Ruffle, hostLoadBytes, walk-lerp/spoke/sleep, Grey Havens host stubs
- Cache: **`?v=20260906bz`**. Push: `/tmp/push-bz.js`.

## What shipped (?v=20260906by)

- **Flash sync (preserve bx hostLoadBytes):** companion `hostLoadBytes(base64)` → `Loader.loadBytes` + **`allowCodeImport`** → `controlConnect` → `gotControl_v1` → `appearanceChanged_v2`
- Host SWF **9407B** (`assets/avatar-host/avatar-host.swf`): `hostWalk` / `hostSleep` / `hostSpoke` / `setLocation_v1` (club idle/speak/usercode-move parity)
- **Walk duration parity (club WalkAnimation):** floor click → `notifyLoftWalk(true)` / `hostWalk(true,orient,locX)` at START; `loftHostState.moving=true` until chrome billboard arrive → `hostWalk(false)`; ~100ms locX tick while moving
- **setLocation_v1:** bridge `setLocation` → `WhirledChrome.chromeWalkTo` (or re-apply `hostWalk(true)`); not store-only
- **hostSpoke:** loft room chat → `callHostSpoke()` → `avatarSpoke_v1`
- **hostSleep:** ~60s idle → `hostSleep(true)` + optional nameplate Zzz; activity / floor click / chat → `hostSleep(false)`
- **Ruffle first-class:** vendored `assets/ruffle/` self-host + jsDelivr/unpkg fallback; `preloadRuffle()`; prefer `callExternalInterface`
- Guest QA: `?flashQa=1` helpers + `assets/ruffle/demo-qa.swf` / `assets/avatars/flash-qa/demo-avatar.swf`
- Docs: `FLASH-SYNC-RESEARCH.md` + `GREY-HAVENS-PROTOCOL.md` (study only — **no AGPL copy**)
- Preserve: bx loadBytes path, bt never-tofu, bg dual Wear, br club, Whirl
- Cache: **`?v=20260906by`**. Push: `/tmp/push-by.js` (dry-run default). **Do not push from executor.**

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

## Research notes toward ?v=20260906by (not pushed)

- Grey Havens / club protocol dump → `GREY-HAVENS-PROTOCOL.md` + append on `FLASH-SYNC-RESEARCH.md`.
- AvatarHost ORIGINAL stubs: `selfDestruct_v1`, `triggerEvent_v1`, `setWalkSpeed_v1`, `datapack` init, `hostSleep`/`hostSpoke`; SWF rebuilt locally.
- Top sync gaps: sleep chrome wire, WalkAnimation loc lerp, setLocation→walk, speak→avatarSpoke, MediaStub/default-avatar.
