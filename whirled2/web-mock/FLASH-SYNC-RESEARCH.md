# FLASH-SYNC-RESEARCH — Whirled2 Classic Flash walk sync

**Goal:** loft Classic Flash Wear walks like whirled.club (in-SWF `state_*_walking`), not chrome bob alone.  
**Cache:** `?v=20260906by`  
**Rule:** study Grey Havens / club docs — **do NOT copy AGPL** msoy/world-client code.

## Root break (bu/bv)

1. `resolveSwfUrl()` returns `blob:` from IndexedDB.
2. Loft mounted companion `avatar-host.swf`, then `hostLoadUrl(blob:…)`.
3. Nested AS3 `Loader.load(URLRequest)` **cannot** load `blob:` (or reliable `data:`) under Ruffle → IO error → **blank stage**.
4. `loftUsesCompanionHost=true` was set on host mount success **before** avatar connected → silent blank forever (no fallback).

## Fix (bx)

| Layer | What |
| --- | --- |
| Outer Ruffle | Load **host.swf** via real http(s) URL (works) |
| Avatar bytes | IDB → `ArrayBuffer` → **base64** (chunk EI if huge) |
| Host EI | `hostLoadBytes(b64)` / Begin+Chunk+Commit |
| Host AS3 | Base64 → `ByteArray` → **`Loader.loadBytes`** |
| Handshake | Listen `controlConnect` on `contentLoaderInfo.sharedEvents` **BEFORE** `loadBytes` |
| Host fills | `hostProps` (+ `initProps`, `gotControl_v1`) |
| Walk | JS `hostWalk(moving,orient,locX)` → `appearanceChanged_v2(loc,orient,moving,sleeping)` |
| Fallback | No b64 / mount fail / ~2s watchdog / bridge `error` → **DIRECT** outer `player.load({url: blob})` |

## Protocol notes (public SDK / club asdocs — study only)

### AbstractControl connect (greyhavens/whirled-api)

- Avatar constructs `AvatarControl(this)` while on stage.
- Control builds `userProps`, dispatches **`ConnectEvent` type `"controlConnect"`** on `disp.root.loaderInfo.sharedEvents`.
- Host must already be listening; sets `event.props.hostProps` (function bag).
- Control calls `gotHostProps(hostProps)` → `_funcs = hostProps`.
- Duplicate connect → `alreadyConnected`.

### Appearance / walk (club AvatarControl / ActorControl asdocs + wiki)

- Public event: `ControlEvent.APPEARANCE_CHANGED` — avatar re-queries `getOrientation()` / `isMoving()` / `isSleeping()`.
- Orient: **0 faces front, clockwise** (wiki Avatar rotation tutorial).
- Stock Body scenes: `state_<state>_walking` / towalking / fromwalking (live club world-client behavior; reimplement thin — no AGPL copy).
- Our host calls **`userProps.appearanceChanged_v2(location, orient, moving, sleeping)`** (backend wire name).

### Emotes / actions

- `registerActions` / `registerStates` on AvatarControl.
- Trigger path: `messageReceived_v1` / ACTION_TRIGGERED; our `hostEmote` calls `messageReceived_v1(name, null, true)`.

## Ruffle / EI constraints

- Outer Ruffle **can** load `blob:` SWFs.
- Nested Loader **cannot** reliably load `blob:` / `data:`.
- EI **cannot** pass raw `ByteArray` — base64 string only; chunk ~240KB.
- `allowScriptAccess` + transparent wmode required for loft EI + chrome overlay.

## Mount policy (bx)

1. Preserve stand thumb / glyph (`ensureStandFallback`).
2. `prepareCompanionStrategy` → bytes preferred, else http `hostLoadUrl`.
3. Mount host → `callHostLoadBytes(b64)` (or `hostLoadUrl` for http).
4. Do **not** set `loftUsesCompanionHost=true` until bridge **`connected`**.
5. Watchdog 2000ms / bridge error → `remountDirectAvatar`.

## Sources (read-only study)

- https://github.com/greyhavens/whirled-api `AbstractControl.as` (ConnectEvent / controlConnect)
- https://www.whirled.club/code/asdocs/com/whirled/AvatarControl.html
- https://wiki.whirled.club/wiki/Avatar_rotation_(ActionScript_tutorial)
- https://wiki.whirled.club/wiki/Whirled_SDK/archive
- Local: `tools/avatar-host/AvatarHost.hx`, `src/classic-avatar.js`

## Residual risks

- Very large SWFs: EI chunking / Ruffle `loadBytes` memory limits.
- Non-SDK / hand-rolled avatars without `controlConnect` → stay DIRECT + chrome bob.
- Companion upgrade remount can flash once; thumb mitigates blank.
- Ruffle EI callback timing — retries at 120/200/700ms + watchdog.

---

## ALL-NIGHT Grey Havens protocol pass (?v=20260906by notes)

**Date:** 2026-09-06 ~05:17 America/New_York  
**Sources (study only, no AGPL copy into tree):** `/tmp/whirled-research/*`, wiki.whirled.club, whirled.club asdocs + homepage bootstrap, local `AvatarHost.hx`.

### 1) Full pipeline: controlConnect → hostProps → appearanceChanged_v2 → Body walk

```
Avatar SWF on stage
  └─ new AvatarControl(this)  [AbstractControl ctor]
       ├─ setUserProps(userProps)   // Entity+Actor+Avatar callbacks
       ├─ sharedEvents.dispatchEvent(ConnectEvent "controlConnect")
       │     props.userProps = userProps
       └─ host (AvatarBackend chain) handleUserCodeConnect:
             ├─ setUserProperties(userProps)
             ├─ populateControlProperties(hostProps)  // function bag
             ├─ populateControlInitProperties(initProps)
             ├─ hostProps.initProps = initProps
             └─ props.hostProps = hostProps
       └─ gotHostProps(hostProps) → _funcs = hostProps; gotInitProps(initProps)
       └─ EntityBackend then requestControl → callUserCode("gotControl_v1")

Floor click / server move (club OccupantSprite.moveTo):
  ├─ setOrientation(dest.orient, report=false)
  ├─ _walk = new WalkAnimation(...); start
  └─ appearanceChanged()
        ActorSprite:
          callUserCode("appearanceChanged_v2", [x,y,z], orient, isMoving(), isIdle())
            └─ ActorControl.appearanceChanged_v2 → _location/_orient/_isMoving
            └─ AvatarControl also sets _isSleeping
            └─ dispatch ControlEvent.APPEARANCE_CHANGED
                  └─ stock Body / MovieClipBody:
                       isMoving()? → scene/clip state_<State>_walking
                       else        → state_<State>
                       (transitions: *_towalking / *_fromwalking when present)

Walk end (walkCompleted):
  _walk = null; appearanceChanged() again → standing scene
```

**Orient note:** ActorControl asdocs say 0 front, counter-clockwise; wiki Avatar rotation tutorial says clockwise. Creators follow wiki (`rotationY = 360 - orient`). Host should pass the same number club would.

### 2) world-client.swf string extract (CWS decompress)

| Marker | Present |
| --- | --- |
| `ActorSprite`, `appearanceChanged`, `appearanceChanged_v1`, `appearanceChanged_v2` | yes |
| `setLocation` / `setLocation_v1` / `setLocationFromUser` | yes |
| `controlConnect`, `hostProps`, `userProps`, `gotControl` / `gotControl_v1` | yes |
| `isSleeping`, `WalkAnimation`, `isMoving`, `WALKING_ID` | yes |
| `MediaStub` → `stubURL-http://media.whirled.club/media/MediaStub.swf` | yes |
| `default-avatar.swf` (avatarPath fallback) | yes |
| `selfDestruct_v1`, `triggerEvent_v1`, `setMoveSpeed_v1`, `setPreferredY_v1` | yes |
| `datapack` / `getAndClearDataPack` / `DataPack` | yes |
| Scene names `state_*_walking` / `towalking` | **not** in client SWF (live in avatar Body SDK / FLA scenes) |

### 3) Wiki / asdocs (fetched)

- **Create avatars** hub: templates, AvatarControl ASdocs, Body / MovieClipBody.
- **Simple avatar (Flash):** scenes `state_Default` + `state_Default_walking` (duplicate scene = walk cycle).
- **Configurable avatar:** MovieClipBody — library clips named `state_Default` etc. (not timeline scenes).
- **Avatar rotation:** listen `APPEARANCE_CHANGED`; check orientation on startup; 0 = front.
- **AvatarControl / ActorControl asdocs:** `isMoving`, `isSleeping`, `setLogicalLocation` → host `setLocation_v1`; events `appearanceChanged`, `actionTriggered`, `avatarSpoke`, `stateChanged`.

### 4) whirled.club bootstrap (nested SWF load)

Homepage loads:

1. `/gwt/frame/frame.nocache.js` — GWT bootstrap; selects permutation `D55C2180…cache.html` into hidden iframe `id=frame`.
2. `/js/swfobject.js` — SWFObject 2.0 (`embedSWF` / ActiveX object + params).
3. `/js/md5.js`

Room chrome (GWT) then embeds **world-client.swf** via swfobject. Avatars are **nested** `Loader` children inside that client (same pattern as our companion host): listen `controlConnect` on nested `contentLoaderInfo.sharedEvents` **before** media complete. Media fallbacks: `MediaStub.swf`, `default-avatar.swf`.

### 5) hostProps Actor/Avatar need for walk + emote + sleep

| hostProps key | Role | AvatarHost (by) |
| --- | --- | --- |
| `startTransaction` / `commitTransaction` | doBatch | stub ✓ |
| `setLocation_v1` | avatar requests move | ✓ bridges JS |
| `setMoveSpeed_v1` / `setWalkSpeed_v1` | local speed | ✓ / **added** |
| `setOrientation_v1` | orient (club TODO server-side) | ✓ now re-fires appearance |
| `setState_v1` / `getState_v1` | persistent state | ✓ |
| `setPreferredY_v1` | float height | ✓ |
| `setHotSpot_v1` | feet/name label | ✓ |
| `sendMessage_v1` | actions/messages | ✓ |
| `getRoomBounds_v1` | pixel loc math | ✓ |
| entity/memory/popup/cam/mic/music ids | EntityControl | mostly ✓ |
| `selfDestruct_v1` | unload item | **added** no-op |
| `triggerEvent_v1` | deprecated → action msg | **added** |
| initProps: `orient`, `isMoving`, `location`, `env`, `isSleeping`, `datapack` | startup | datapack **added** |

**Host → userProps calls (not hostProps):**

| Call | Need |
| --- | --- |
| `appearanceChanged_v2(loc,orient,moving,sleeping)` | walk + sleep |
| `gotControl_v1()` | hasControl / ticks / registerActions |
| `messageReceived_v1(name,arg,true)` | emotes/actions |
| `stateSet_v1(state)` | state menu |
| `avatarSpoke_v1()` | speak anim | **hostSpoke added** |
| `getActions_v1` / `getStates_v1` | chrome menus | ✓ |

### 6) MISSING / weak stubs vs club (sync risk)

Prior bag was already close. Remaining gaps that break **club-like** sync:

1. **Sleeping** — ✅ chrome ~60s idle → `hostSleep` (?v=20260906by).
2. **No WalkAnimation parity** — we toggle moving bool; club interpolates `_loc` every frame while `_walk != null`.
3. **`setLocation_v1`** — ✅ bridge → chromeWalkTo / hostWalk(true) (?v=20260906by).
4. **`avatarSpoke_v1`** — ✅ loft chat → `hostSpoke` (?v=20260906by).
5. **MediaStub / default-avatar** path absent — failed media stays blank (club substitutes stub/default).
6. **`datapack` always null** — config/DataPack avatars may no-op colors/parts.
7. Deprecated-but-called: covered (`setWalkSpeed_v1`, `triggerEvent_v1`).

### 7) Patch this pass (ORIGINAL stubs only)

`tools/avatar-host/AvatarHost.hx` + rebuilt `assets/avatar-host/avatar-host.swf` (~9407 B):

- `selfDestruct_v1`, `triggerEvent_v1`, `setWalkSpeed_v1`
- `initProps.datapack = null`
- `hostSleep` / `hostSpoke` EI + sleeping threaded into `appearanceChanged_v2`
- `setOrientation_v1` re-fires appearance
- `updateMemory_v1` returns `true` (legacy Boolean)

**Do not push.** Notes bump toward **by**.

---

## Deep protocol dig (by) — Grey Havens + live club

**License reminder:** cite `file` + `symbol` only. Do **not** copy AGPL `msoy` / `world-client` sources into the Whirled2 tree.

### Handshake sequence (correct order)

1. Host creates nested `Loader`, listens on `contentLoaderInfo.sharedEvents` for `"controlConnect"` **before** `load` / `loadBytes`.
2. Avatar SWF runs; `AbstractControl` ctor (whirled-api) requires `disp.root` on stage, builds `userProps`, dispatches `ConnectEvent("controlConnect")` on `loaderInfo.sharedEvents` with `event.props.userProps`.
3. Host `ControlBackend.handleUserCodeConnect` (msoy) / our `AvatarHost.onControlConnect` reads `userProps`, fills `hostProps` via `populateControlProperties` + `initProps` via `populateControlInitProperties`, assigns `props.hostProps`.
4. Avatar `gotHostProps(hostProps)` stores `_funcs`; EntityControl also reads `initProps` (`location`, `orient`, `isMoving`, `env`, `isSleeping` for avatars).
5. **gotControl timing (club):** `EntityBackend.handleUserCodeConnect` → `_sprite.requestControl()` → (server/room assigns control) → `EntitySprite.gotControl()` → `callUserCode("gotControl_v1")` → EntityControl sets `_hasControl`, dispatches `CONTROL_ACQUIRED`, starts ticks.
6. **Our loft host:** there is no room server — we call `userProps.gotControl_v1()` **synchronously after** setting `hostProps`, then idle `appearanceChanged_v2`, then bridge `"connected"`. JS may re-apply `hostWalk` on connected so a floor-click in flight is not overwritten by idle.

### Wire names (backend ↔ usercode)

| Direction | Symbol | Role |
| --- | --- | --- |
| user→host | `setLocation_v1(x,y,z,orient)` | ActorBackend → ActorSprite.setLocationFromUser |
| user→host | `setOrientation_v1`, `setState_v1`, `setMoveSpeed_v1` | ActorBackend |
| user→host | `setPreferredY_v1` | AvatarBackend |
| host→user | `appearanceChanged_v2(loc[], orient, moving, sleeping)` | ActorSprite.appearanceChanged |
| host→user | `appearanceChanged_v1(loc[], orient, moving)` | legacy |
| host→user | `gotControl_v1()` | EntitySprite.gotControl |
| host→user | `stateSet_v1`, `messageReceived_v1` | actions / states |
| initProps | `orient`, `isMoving`, `location`, `env`, `isSleeping`, `datapack` | Entity/Actor/AvatarBackend |

Cited: `greyhavens/whirled-api` `AbstractControl.as`, `EntityControl.as` (`gotControl_v1`, `setUserProps`); `greyhavens/msoy` `ControlBackend.as`, `EntityBackend.as`, `ActorBackend.as`, `AvatarBackend.as`, `ActorSprite.as`, `EntitySprite.as`.

### Why club avatars “synchronize” on floor click

1. Room chrome / `OccupantSprite` updates logical location and marks moving.
2. `ActorSprite.appearanceChanged()` calls usercode `appearanceChanged_v2(loc, orient, isMoving(), isIdle())`.
3. `AvatarControl.appearanceChanged_v2` stores sleeping + calls super → dispatches `ControlEvent.APPEARANCE_CHANGED`.
4. Stock **Body** / **MovieClipBody** (community uravatar — cite only) listens for `APPEARANCE_CHANGED`, re-queries `getOrientation()` / `isMoving()` / `isSleeping()`, picks scene keys:
   - `state_<Name>` (standing)
   - `state_<Name>_walking` / `_sleeping`
   - transitions: `state_<Name>_towalking`, `_fromwalking`, `_tosleeping`, `_fromsleeping`
   - weighted variants `…_N:W`
   - MovieClipBody fallback: missing walk → `state_Default_walking`
5. Orient **&lt; 180** → face left (`scaleX = -1`) — uravatar Body; SDK docs say 0 = facing camera, increasing **counter-clockwise** (wiki rotation tutorial sometimes says clockwise — prefer SDK).

Live `world-client.swf` strings confirm: `controlConnect`, `hostProps`, `userProps`, `appearanceChanged_v2`, `gotControl_v1`, `setLocation_v1`, `isMoving`, `isSleeping`, `ActorSprite`, `loadBytes`, `ApplicationDomain`.

### ApplicationDomain + loadBytes sandbox

- Club / aspirin `MultiLoader`: `new LoaderContext(false, appDom)` with default **child of current** ApplicationDomain (or explicit domain for class loading).
- Our host: `new LoaderContext(false, new ApplicationDomain(ApplicationDomain.currentDomain))` — child AD so avatar classes do not collide with host.
- **FP 10.1+:** `LoaderContext.allowCodeImport = true` (alias `allowLoadBytesCodeExecution`) required for **executable** SWF via `loadBytes`. Without it, frames may decode but **AvatarControl never runs** → no `controlConnect`. **by host sets both.**
- Do **not** set `SecurityDomain` on `loadBytes` (always caller sandbox).
- Ruffle PR #24107 (2026-07): `loadBytes` child inherits **loader** sandbox type (not child header) — matches Flash security intent. Nested `blob:` / `data:` URL loads remain unreliable; **bytes path is correct**.

### Live whirled.club nesting (observed)

- Shell: `/gwt/frame/frame.nocache.js` + `/js/swfobject.js` (GWT frame embeds Flash client).
- Client: `https://www.whirled.club/clients/world-client.swf` (~1.6MB CWS).
- Nest: world-client hosts entity media via Loader / `loadBytes` paths (`RoomStudioView/loadBytes`, `MultiLoader`); avatar SWF is **child** of room client, not a top-level page embed.
- Whirled2 parallel: page → Ruffle → **avatar-host.swf** (http) → `loadBytes(avatar)` → same `sharedEvents` bridge mentally, without shipping AGPL world-client.

### Ruffle first-class integration (by)

| Gap | Fix |
| --- | --- |
| CDN-only `unpkg` | Vendored `assets/ruffle/` (web-selfhosted nightly) + CDN fallback |
| No preload | `preloadRuffle()` on classic boot / afterPaint |
| Invisible status | `#whirled-ruffle-status` chip (loading/ready/playing/error) |
| Guest QA blocked by login gate | `?flashQa=1` / `?avatarDebug=1` guest loft + demo SWF |
| EI API | Prefer `ruffle().callExternalInterface` then `.call` then `player[name]` |

### Residual gaps / blockers (honest)

1. **gotControl without server:** we synthesize `gotControl_v1` immediately — fine for single-player loft; multi-occupant control election not implemented.
2. **Demo avatar ConnectEvent:** Haxe `Event` + dynamic `props` may be weaker than AS3 `ConnectEvent`; verify with `?avatarDebug=1` bridge `connected`.
3. **Ruffle wasm size:** self-host ~28MB — Pages must serve `application/wasm`; optional CDN fallback if wasm MIME wrong locally.
4. **Non-SDK avatars:** no `controlConnect` → stay DIRECT + chrome bob (expected).
5. **Orient convention docs conflict:** implement uravatar `&lt;180` flip; document SDK counter-clockwise.
6. **Large SWF EI:** chunk Begin/Chunk/Commit; watch Ruffle string limits / main-thread hitch.
7. **allowCodeImport on older Ruffle:** if a build ignores the flag, watch for `loaded` without `connected` → watchdog DIRECT.

### Sources

- https://github.com/greyhavens/whirled-api (AbstractControl, ActorControl, AvatarControl, EntityControl, ControlEvent)
- https://github.com/greyhavens/msoy (ControlBackend, EntityBackend, ActorBackend, AvatarBackend, ActorSprite, EntitySprite, OccupantSprite) — **study only**
- https://github.com/greyhavens/whirled-projects `avatars/uravatar/src/Body.as`, `MovieClipBody.as` — scene naming cite
- https://www.whirled.club/code/asdocs/com/whirled/ActorControl.html
- https://wiki.whirled.club/wiki/Avatar_rotation_(ActionScript_tutorial)
- https://www.whirled.club/clients/world-client.swf (string audit)
- https://www.whirled.club/gwt/frame/frame.nocache.js + `/js/swfobject.js`
- Ruffle: LoaderContext allowCodeImport docs; PR #24107 sandbox inheritance
- Local: `tools/avatar-host/AvatarHost.hx`, `src/classic-avatar.js`, `assets/ruffle/`

### by ship checklist

- [x] `hostLoadBytes` path (bx)
- [x] `allowCodeImport` on host LoaderContext
- [x] Self-host Ruffle + status chip + preload in JS
- [x] Guest `?flashQa=1` auto loft
- [ ] Cache `?v=20260906by` + `/tmp/push-by.js` dry-run (no push)

---

## Sibling handshake gaps wired in by (Grey Havens top gaps)

These close club parity holes that were still open after bx `hostLoadBytes`:

### 1) Walk while moving (appearance pulse / lerp)

Club `ActorSprite` keeps calling `appearanceChanged` as the occupant **lerps** across the floor (not only start/stop). Body stays on `state_*_walking` because `isMoving()` remains true and orient/location update.

**Whirled2:** chrome `notifyLoftWalk(true, orient, locX)` → `hostWalk` → `appearanceChanged_v2` with fresh `location[0]=locX` while bobbing. Arrive → `hostWalk(false)`. If Body only keys off moving boolean, start/stop is enough; location updates still help SDK avatars that read `getLogicalLocation()`.

### 2) `setLocation_v1` → walk (usercode-driven move)

Cited: `ActorBackend.setLocation_v1` → `ActorSprite.setLocationFromUser` → room move → later `appearanceChanged_v2` when moving starts/stops.

**Whirled2 host:** `setLocation_v1` updates host `location`/`orient` and bridges `"setLocation"` to JS. Chrome should treat that as a walk request (move billboard + `hostWalk(true)`), matching club when an avatar script calls `setLogicalLocation` / `setPixelLocation`.

### 3) `hostSpoke` / chat lipsync

Cited: AvatarControl listens for speak; backend path uses `avatarSpoke_v1` on usercode (ControlEvent.AVATAR_SPOKE). Club fires this when the wearer chats.

**Whirled2:** `hostSpoke()` → `userProps.avatarSpoke_v1()`. Wire from loft chat send when companion connected.

### 4) `hostSleep` / idle Zzz

Cited: `AvatarBackend.populateControlInitProperties` sets `isSleeping` from `MemberSprite.isIdle()`; `ActorSprite.appearanceChanged` passes `isIdle()` as sleeping into `appearanceChanged_v2`. Body uses `state_*_sleeping` / tosleeping / fromsleeping.

**Whirled2:** `hostSleep(true|false)` sets host sleeping flag and re-calls `appearanceChanged_v2(..., moving, sleeping)`. Chrome idle Zzz (~2 min) should call `hostSleep(true)`; activity → `hostSleep(false)`.

### 5) Verified host SWF (by)

- Path: `assets/avatar-host/avatar-host.swf`
- Size target: **9407 bytes** (rebuild with Haxe `tools/avatar-host`)
- Symbols present: `hostLoadBytes`, `allowCodeImport`, `appearanceChanged_v2`, `gotControl_v1`, `hostWalk`, `hostSleep`, `hostSpoke`, `setLocation_v1`
- **Do not regress** `hostLoadBytes` / blob→base64 path when adding lerp/spoke/sleep.

### Updated by checklist

- [x] `hostLoadBytes` path (bx) preserved
- [x] `allowCodeImport` on host LoaderContext
- [x] Host 9407B with spoke/sleep/walk
- [x] Self-host Ruffle `assets/ruffle/` + CDN fallback + `preloadRuffle`
- [x] `callExternalInterface` preference
- [x] Guest `?flashQa=1` helpers + app.js guest session/loft boot
- [x] `/tmp/push-by.js` dry-run (executor must **not** push)
