# GREY-HAVENS-RUFFLE-REPLICATE — Club architecture → Whirled2 Ruffle nest

**Date:** 2026-09-06 (America/New_York)  
**Tree:** `/workspace/whirled2-web-mock/` (`classic-avatar.js` `?v=20260906cl`)  
**Study clones (read-only, outside tree):** `/tmp/whirled-research/` + `/tmp/whirled-research/clones/{msoy,whirled-api}/`  
**Rule:** cite symbols/files/flows; **reimplement ORIGINAL Haxe/JS only**. Never copy Grey Havens / msoy / world-client sources into the Whirled2 tree. No verbatim dumps beyond short cited snippets for protocol clarity.

---

## Executive summary (read first)

| Question | Answer |
|----------|--------|
| Does **whirled.club** use **Ruffle** for the live world client? | **No.** Club historically embeds **Adobe Flash** (`swfobject` + `world-client.swf`). After Flash EOL (2021), club moved to a **downloadable standalone Flash projector client**. Homepage still bootstraps GWT `frame.nocache.js` + `swfobject.js`; observed string hit for `swfobject` on live HTML. **Ruffle is Whirled2’s browser path**, not club’s production runtime. |
| How does club load avatars? | Outer **`world-client.swf`** → `MemberSprite` / `ActorSprite` → media `Loader` (often via **MediaStub** on media host) → nested avatar SWF → `sharedEvents` **`controlConnect`** ↔ **`AvatarBackend`**. |
| What fires `state_*_walking`? | Host calls `userProps.appearanceChanged_v2(loc, orient, moving, sleeping)` → AvatarControl stores `_isMoving` → `ControlEvent.APPEARANCE_CHANGED` → Body / MovieClipBody picks mode `"walking"` → scene/clip `state_<Name>_walking`. |
| Why Whirled2 still fails in-SWF walk? | Chrome bob works; **nest handshake** (`hostLoadBytes` → `controlConnect` → `loftUsesCompanionHost`) often never completes for stock Body. Without that flag, `hostWalk` never drives Body. See hop map §3. |
| Can we replicate? | **Yes in principle** under Ruffle: companion `avatar-host.swf` + nested `Loader.loadBytes` + `sharedEvents` is architecturally sound (`RUFFLE-SOURCE-DEEP.md`). Ops must prove bridge `"connected"` before routing walk. |

---

## 1. Grey Havens repos (study inventory)

| Repo | URL | License (actual) | Role |
|------|-----|------------------|------|
| **msoy** | https://github.com/greyhavens/msoy | **BSD-style** 3-clause (Grey Havens name restriction) — *not* AGPL despite folklore | Full platform; Flash world client AS sources under `src/as/…` |
| **whirled-api** | https://github.com/greyhavens/whirled-api | **LGPL 2.1** | Avatar/game **API** (`AvatarControl`, `ActorControl`, `AbstractControl`) |
| **whirled-sdk** | https://github.com/greyhavens/whirled-sdk | SDK packaging | Templates / examples (Body / MovieClipBody patterns) |
| **whirled-projects** | https://github.com/greyhavens/whirled-projects | misc | Toys / avatars samples |
| **thane** | https://github.com/greyhavens/thane | Tamarin fork | Server-side AS VM — **not** browser avatar path |

**Mandate vs license:** User mandate still wins — **do not copy** msoy/world-client sources into Whirled2 even though msoy’s LICENSE is BSD-like. Protocol reimplementation in ORIGINAL MIT Haxe/JS only. whirled-api LGPL still means: cite API symbols; do not vendor the library into the mock as a dump.

**Local study paths:**

```
/tmp/whirled-research/                 # extracted .as + world-client.swf + ruffle_loader.rs
/tmp/whirled-research/clones/msoy/     # full shallow clone 2026-09-06
/tmp/whirled-research/clones/whirled-api/
/tmp/whirled-research/sdk-body/        # Body.as / MovieClipBody.as from whirled_sdk.zip (examples)
/tmp/ruffle-src/                       # Ruffle master sparse clone (Loader / sharedEvents)
```

---

## 2. Club / Grey Havens architecture (with citations)

### 2.1 Live club shell (observed + prior passes)

```
Browser / standalone projector
  └─ GWT frame (frame.nocache.js) + swfobject.js
       └─ world-client.swf  (versioned /clients/<build>/ ~1.6MB CWS)
            └─ RoomView → MemberSprite / ActorSprite / OccupantSprite
                 └─ MediaContainer → Loader (avatar media)
                      optional MediaStub.swf (media.whirled.club/media/MediaStub.swf)
                      fallback default-avatar.swf
                      sharedEvents "controlConnect" ↔ AvatarBackend
```

**Ruffle:** not part of this stack. Club = **Adobe Flash Player** (browser plugin historically, **standalone projector** today).

### 2.2 Nested media load + backend attach

**EntitySprite.loaderReady** (msoy `EntitySprite.as` ~530–538):

1. Media Loader fires ready with `LoaderInfo`.
2. `createBackend()` — MemberSprite returns **`new AvatarBackend()`** (`MemberSprite.as` ~197–200).
3. `_backend.init(_ctx, info)` → **ControlBackend.init** registers:
   - `_sharedEvents = contentLoaderInfo.sharedEvents`
   - `addEventListener("controlConnect", handleUserCodeConnect)` **before** avatar code runs.

**MediaStub** (msoy `applets/MediaStub.as` ~67–78) — double-nest bridge used when media is served cross-domain:

```
loader.contentLoaderInfo.sharedEvents.addEventListener(
  "controlConnect", this.root.loaderInfo.sharedEvents.dispatchEvent);
```

So `controlConnect` from the **inner** avatar Loader is **re-dispatched** onto the stub’s root `sharedEvents`, which world-client’s backend already listens to. Whirled2’s thin host skips MediaStub and listens **directly** on the nested Loader’s `contentLoaderInfo.sharedEvents` (same end semantics for same-sandbox nest).

**DataPack / loadBytes** (msoy `DataPackMediaContainer.as` ~321–322):

```
Loader(_media).loadBytes(ba, new LoaderContext(false, new ApplicationDomain(null)));
```

Child (or null-parent) **ApplicationDomain** — avoid class collision with host. Whirled2 AvatarHost uses `new ApplicationDomain(ApplicationDomain.currentDomain)` + `allowCodeImport = true` (FP 10.1+ / Ruffle parity).

### 2.3 controlConnect handshake (API + backend)

| # | Who | Symbol | What |
|---|-----|--------|------|
| 1 | Avatar | `AbstractControl` ctor (`whirled-api`) | Requires `disp.root` on stage; `setUserProps`; `new ConnectEvent()` type **`"controlConnect"`** |
| 2 | Avatar | `disp.root.loaderInfo.sharedEvents.dispatchEvent(event)` | `event.props.userProps = userProps` |
| 3 | Host | `ControlBackend.handleUserCodeConnect` | Save userProps; build hostProps + initProps; `props.hostProps = hostProps` |
| 4 | Avatar | `gotHostProps` → `_funcs = hostProps` | `isConnected()` true |
| 5 | Host | EntityBackend / EntitySprite | `gotControl()` → `callUserCode("gotControl_v1")` |
| 6 | Dup | | `props.alreadyConnected = true` |

**userProps (host → avatar)** critical for walk/emote:

- `appearanceChanged_v2(loc[], orient, moving, sleeping)` — ActorControl (+ Avatar sleeping)
- `appearanceChanged_v1` — legacy
- `gotControl_v1`, `messageReceived_v1(name, arg, isAction)`, `avatarSpoke_v1`, `stateSet_v1`
- `getActions_v1` / `getStates_v1`

**hostProps (avatar → host)** critical:

- `setLocation_v1`, `setMoveSpeed_v1`, `setWalkSpeed_v1` (legacy ×1000), `setOrientation_v1`, `setState_v1` / `getState_v1`
- `setPreferredY_v1` (AvatarBackend)
- Entity bag: hotspot, messages, room bounds, memories, …
- `startTransaction` / `commitTransaction`
- `initProps`: `location`, `orient`, `isMoving`, `env`, `isSleeping`, `datapack`

### 2.4 Walk: WalkAnimation → isMoving → appearanceChanged_v2 → Body

**OccupantSprite.moveTo** (msoy `OccupantSprite.as` ~350–368):

```
stop prior WalkAnimation
setOrientation(dest.orient, report=false)   // no appearance yet
_walk = new WalkAnimation(...); start
appearanceChanged()                         // isMoving() == (_walk != null) → true
```

**isMoving** = `_walk != null` (`OccupantSprite.as` ~232–234).

**WalkAnimation** (msoy `WalkAnimation.as`):

- Duration = `1000 * distance_px / getMoveSpeed(actorScale)` (DEFAULT_MOVE_SPEED **500** px/s, MIN **50**).
- Each tick: linear lerp of logical `[x,y,z]` via `moveFunction` (no orient lerp).
- On complete: `setLocation(dest)` → `walkCompleted(orient)` → `_walk = null` → **`appearanceChanged()`** again (moving=false).

**ActorSprite.appearanceChanged** (override ~168–175):

```
callUserCode("appearanceChanged_v2", [x,y,z], orient, isMoving(), isIdle())
// else appearanceChanged_v1 without sleeping
```

**AvatarControl.appearanceChanged_v2** stores sleeping then super → `_isMoving` + `ControlEvent.APPEARANCE_CHANGED`.

**Body / MovieClipBody** (Whirled SDK examples — `uravatar/src/{Body,MovieClipBody}.as`):

- Listen `APPEARANCE_CHANGED`.
- If `_ctrl.isMoving()` → mode `"walking"`; else if sleeping → `"sleeping"`.
- Play `state_<Name>_walking` (fallback `state_Default_walking`); optional `*_towalking` / `*_fromwalking`.

**That is the entire club walk visual path.** Screen position lerp is host-side (WalkAnimation); Body only needs **moving flag** + orient.

### 2.5 Emote / speak / sleep

| Chrome / room | Host call | userProps | Avatar event |
|---------------|-----------|-----------|--------------|
| Action menu | `messageReceived_v1(name, null, true)` | Entity | `ACTION_TRIGGERED` |
| Chat | `avatarSpoke_v1()` | Avatar | `AVATAR_SPOKE` |
| AFK / idle | appearance with `sleeping=true` | Actor/Avatar | Body `state_*_sleeping` |
| State menu | later `stateSet_v1` | Actor | `STATE_CHANGED` |

---

## 3. Why Whirled2 still fails (hop-by-hop vs club)

Club always has **one Flash player** with outer world-client + nested avatar. Whirled2 must synthesize that with Ruffle + ORIGINAL companion.

| Hop | Club | Whirled2 today (`?v=20260906ck`) | Status |
|-----|------|----------------------------------|--------|
| Outer runtime | Adobe FP / projector | Ruffle WASM (`assets/ruffle/`) | OK (different VM) |
| Outer SWF | `world-client.swf` | `avatar-host.swf` (ORIGINAL thin) | Partial by design |
| Nested media | Loader / MediaStub + URL or loadBytes | `hostLoadBytes` / `hostLoadUrl` (reject blob/data nest) | Designed OK |
| Listen before load | ControlBackend on LoaderInfo | `AvatarHost.prepareNestedLoader` | OK in Haxe |
| `allowCodeImport` + child AD | DataPack / FP 10.1+ | AvatarHost `loaderContext()` | Set; Ruffle may not enforce yet |
| `controlConnect` | sharedEvents same LoaderInfo | Same model under Ruffle | **Fragile** — ConnectEvent `props` / timing |
| `gotControl_v1` | EntitySprite.requestControl | Host calls sync after connect | OK when connect works |
| Floor click → moving | `moveTo` → WalkAnimation → appearance | chrome `notifyLoftWalk` → EI `hostWalk` | Chrome OK; SWF needs connected |
| Location lerp | WalkAnimation ticks | chrome CSS/billboard + optional locX pulses | OK for Body (Body keys on moving) |
| Gate walk EI | always connected in room | `loftUsesCompanionHost` **only** on bridge `"connected"` | **Often false** → bob only |
| Dual players | never | cg Option A dual-layer (**OFF**); ch COMPANION-ONLY **ON** | Correct direction |
| EI silent miss | n/a | ch treats `undefined` as miss | Fixed in JS; still needs ready |
| QA asset | real AvatarControl Body | Prefer `demo-avatar.swf` not `demo-qa.swf` | Documented; Pages must 200 |
| MediaStub / default-avatar | club fallbacks | none | Gap (non-blocking for happy path) |

**Root cause (one sentence):** In-SWF walk dies when the **companion nest handshake never reaches bridge `"connected"`**, so `hostWalk` never becomes `appearanceChanged_v2` on a live `userProps` bag — chrome bob is not Body.

**Secondary causes (historical):**

1. Nested `Loader.load(blob:)` (bx) — blank stage.  
2. Setting companion flag before connect.  
3. Dual Ruffle players (cg) + EI targeting DIRECT.  
4. `callExternalInterface` undefined treated as ok (cg).  
5. Empty host wipe (ce).  
6. Companion auto-upgrade OFF (cf) → permanent DIRECT.

---

## 4. Exact replication plan for Whirled2 (ORIGINAL code only)

### 4.1 Architecture target (club parity, loft-scale)

```
#avatar-ruffle-host  (never #stage-slot)
  └─ ONE Ruffle player
       └─ avatar-host.swf  (http(s), ORIGINAL Haxe)
            └─ Loader.loadBytes(avatar BA, LoaderContext{
                 applicationDomain: child of current,
                 allowCodeImport: true,
                 allowLoadBytesCodeExecution: true
               })
                 └─ avatar root
                      AvatarControl → controlConnect on sharedEvents
                      Body listens APPEARANCE_CHANGED → state_*_walking
```

JS owns: chrome trek, EI `hostWalk`/`hostSleep`/`hostSpoke`/`hostEmote`, IDB→base64 feed, stand cover until `"connected"`, DIRECT fallback.

### 4.2 Concrete steps (ordered)

1. **Keep COMPANION-ONLY** (`WEAR_COMPANION_ONLY=true`). Do **not** re-enable dual-layer Option A for Body walk.  
2. **Gate all `host*` on bridge `ready` then prove `connected`.** Queue `hostLoadBytes` until ready; never treat EI `undefined` as success.  
3. **`resolveHostEiPlayer()` = companion only** while nesting.  
4. **Stand cover** (`data-mount-mode=companion-cover`) until `"connected"`; fail/watchdog → DIRECT remount (paint preserved).  
5. **Walk:** for whole chrome trek `hostWalk(true, orient, locX)`; on arrive `hostWalk(false, …)`. Match club: appearance at start **and** end; Body does not need mid-lerp appearance spam (optional loc pulses OK).  
6. **Sleep / speak / emote:** already mapped in AvatarHost — keep loft idle timer → `hostSleep`; chat → `hostSpoke`; action → `hostEmote`.  
7. **Prove with `demo-avatar.swf`** (AvatarControl mimic) before stock SDK Bodies.  
8. **Stock Body:** if connect fails, capture Ruffle logs (`?avatarDebug=1`) — check ConnectEvent props path (`ConnectBag` vs plain Event), loadBytes complete vs connect order.  
9. **Optional later:** MediaStub-like same-sandbox rebroadcast only if double-nest needed; default-avatar fallback when bytes missing.  
10. **Never** ship `world-client.swf` or msoy AS into the tree.

### 4.3 Next patches for sibling executor (clear backlog)

| Priority | File | Patch |
|----------|------|-------|
| P0 | `src/classic-avatar.js` | Instrument bridge: log `ready`→`loading`→`loaded`→`gotControl`→`connected` timings; surface badge `sync: connected|pending|direct|failed`. |
| P0 | `tools/avatar-host/AvatarHost.hx` | If stock Body still soft-fails: ensure ConnectEvent-compatible props bag (already prefers `evt.props`); add bridge `connect_diag` with keys present on evt. Rebuild SWF. |
| P1 | `classic-avatar.js` | On `"connected"`, immediately re-apply current chrome walk state (`hostWalk(true)` if mid-trek) — AvatarHost already notes idle appearance can race floor click. |
| P1 | Pages assets | Guarantee `assets/avatar-host/avatar-host.swf` + `assets/ruffle/demo-avatar.swf` + `assets/avatars/flash-qa/demo-avatar.swf` all HTTP 200. |
| P2 | AvatarHost | Implement non-null `datapack` only if remix/config avatars needed; else leave null. |
| P2 | classic-avatar | MediaStub / default-avatar **ORIGINAL** stubs if loadBytes fails (optional). |
| — | Do **not** | Copy msoy WalkAnimation/OccupantSprite; chrome lerp is enough. Do **not** dual-mount host+Body. Do **not** nest blob URLs. |

**This pass:** no code patch applied — AvatarHost + companion-only JS already encode the club protocol; remaining work is prove-connect / diagnose stock Body under Ruffle.

---

## 5. What can / cannot be included (license)

| Artifact | Include in Whirled2? | Notes |
|----------|----------------------|-------|
| Protocol symbol names (`controlConnect`, `appearanceChanged_v2`, …) | **Yes** | Document + reimplement |
| ORIGINAL `AvatarHost.hx` / `classic-avatar.js` / `DemoAvatar.hx` | **Yes** | MIT / project-owned |
| Short cited snippets in docs for clarity | **Yes** | Attribution; no wholesale dumps |
| greyhavens/msoy AS sources / world-client.swf | **No** | Study under `/tmp` only — even though LICENSE is BSD-style, **user mandate forbids tree copy** |
| whirled-api full library | **No vendor dump** | LGPL — link/cite; do not paste into mock as AGPL-adjacent risk |
| Club MediaStub.swf binary | **No** | Reimplement ORIGINAL stub if needed |
| Ruffle (`@ruffle-rs/ruffle`) | **Yes** | Apache/MIT — already vendored under `assets/ruffle/` |
| WalkAnimation class from msoy | **No copy** | Replicate behavior in JS chrome + hostWalk flags |

---

## 6. Ruffle-specific notes (Grey Havens / club do not fork Ruffle)

- Club has **no Ruffle fork** and no club-maintained Ruffle JS wrapper for world-client.  
- Whirled2 uses stock **Ruffle nightly** (`0.6.0-nightly.2026.8.26` per `RUFFLE-SOURCE-DEEP.md`) + ORIGINAL companion.  
- Ruffle **does** implement `LoaderInfo.sharedEvents` and nest `loadBytes` with shared LoaderInfo (see `/tmp/ruffle-src` / `RUFFLE-SOURCE-DEEP.md`).  
- Hard fails under Ruffle: nested `blob:`/`data:` URLs; EI cannot pass ByteArray (use base64); `allowScriptAccess: true` required on loft `load()`.  
- Dual outer players **cannot** share sharedEvents — wrong model for Body walk.

---

## 7. Cross-links in this repo

- `GREY-HAVENS-PROTOCOL.md` — wire tables + opt-in Classic Flash policy  
- `RUFFLE-SOURCE-DEEP.md` — Ruffle Loader / sharedEvents / EI  
- `WALK-E2E-ANALYSIS.md` — hop trace for cg/ch walk failure  
- `WHY-FLASH-FAILS.md` — deep failure analysis + cl DemoAvatar DIRECT hop  
- `FLASH-SYNC-RESEARCH.md` — blob→loadBytes root break  
- `ROOT-CAUSE.md` — tofu / stand glyph / demo 404  
- `HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md` — beginner dual-mode  
- `tools/avatar-host/AvatarHost.hx` — ORIGINAL host  
- `src/classic-avatar.js` — loft mount / EI / companion-only  

---

## 8. Top findings (for parent report)

1. **Club does not use Ruffle** — Adobe Flash (browser historically; **standalone projector** post-2021). Whirled2 invents the Ruffle nest.  
2. **Avatar integration = nested Loader + sharedEvents `controlConnect` + AvatarBackend**, not page-level SWF EI.  
3. **Walk = `appearanceChanged_v2(..., moving=true)` for whole WalkAnimation**; Body switches to `state_*_walking` on APPEARANCE_CHANGED.  
4. **Whirled2 AvatarHost already mirrors the protocol**; failure is the **connect hop** (ready/EI/nest), not missing hostWalk math.  
5. **Replication path:** COMPANION-ONLY + loadBytes + prove `"connected"` + hostWalk for trek; ORIGINAL code only; study clones stay in `/tmp`.
