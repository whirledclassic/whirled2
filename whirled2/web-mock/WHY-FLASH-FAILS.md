# WHY-FLASH-FAILS — Deep analysis: Classic Flash click-to-walk under Ruffle

**Date:** 2026-09-06 (America/New_York)  
**Tree:** `/workspace/whirled2-web-mock/`  
**Ship:** `?v=20260906cl` (ck taken) (companion nest + DemoAvatar continuous walk + DIRECT EI fallback; preserves cj tofu/chrome-walk)  
**Rule:** Cite Grey Havens / whirled.club architecture only — **NO AGPL msoy/world-client source copied into this tree.** Local study dumps live under `/tmp/whirled-research/` (read-only). Primary sibling research: **`GREY-HAVENS-RUFFLE-REPLICATE.md`**; also `GREY-HAVENS-PROTOCOL.md`, `RUFFLE-SOURCE-DEEP.md`, `WALK-E2E-ANALYSIS.md`.

---

## 1. What “Flash walk fails” means (user symptom)

| Layer | What user sees when “broken” | What “working” looks like |
|-------|------------------------------|---------------------------|
| Chrome billboard | Floor click **moves** the Wear layer (lerp + CSS bob/flip) | Same — chrome always works |
| In-SWF walk | Avatar stuck in **standing** pose while sliding | Body / DemoAvatar plays **walk frames** for the whole trek, idle on arrive |
| Tofu (default Wear) | Was: no move (early-return) | cj: CSS `.tofu-leg-l/r` + `.is-tofu-walk` bob |
| Blank / “T” loft | Empty host or letter glyph | Stand PNG/tofu-SVG cover; never letter |

**Beginner summary:** Moving the picture ≠ playing the walk animation inside the Flash movie. Chrome bob is a CSS puppet. Real Classic Flash walk needs the **companion host** to call `appearanceChanged_v2(..., moving=true)` into the avatar’s `userProps`.

---

## 2. Club / Grey Havens architecture (cite only — what we replicate)

Sources: `GREY-HAVENS-PROTOCOL.md`; study notes from `/tmp/whirled-research/` (`ActorSprite.as`, `OccupantSprite.as`, `ActorControl.as`, `ControlBackend.as` — **not** vendored); Ruffle nest facts in `RUFFLE-SOURCE-DEEP.md`. Sibling `GREY-HAVENS-RUFFLE-REPLICATE.md` (when written) expands Ruffle↔club hop mapping.

### 2.1 Connect handshake (why JS alone cannot walk a stock Body)

```
Avatar (AvatarControl) ──controlConnect──► sharedEvents (LoaderInfo)
         userProps bag                          │
                                                ▼
Host (ControlBackend) ◄── fills hostProps + initProps on same props bag
         then callUserCode("gotControl_v1")
```

1. Avatar builds `userProps` (includes `appearanceChanged_v2`) and dispatches `"controlConnect"` on **`disp.root.loaderInfo.sharedEvents`**.
2. Host must already listen on the **nested Loader’s** `contentLoaderInfo.sharedEvents` **before** `load` / `loadBytes`.
3. Host stores `userProps`, writes `hostProps` (+ `initProps`), avatar consumes them.
4. Host requests control → `gotControl_v1`.
5. Walk: host `callUserCode("appearanceChanged_v2", loc, orient, isMoving, isSleeping)`.

**Critical:** Plain JavaScript **cannot** answer `controlConnect` or hold `userProps`. Dual outer Ruffle players **do not** share `sharedEvents` (`RUFFLE-SOURCE-DEEP.md` §3 / §6). Only a **nested** `Loader.loadBytes` inside one player bridges parent↔child.

### 2.2 Club walk timing (OccupantSprite / WalkAnimation — cite)

Club pattern (documented in `GREY-HAVENS-PROTOCOL.md` §Walking):

```
moveTo(dest):
  setOrientation → start WalkAnimation → appearanceChanged()  // isMoving()==true
walkCompleted():
  clear walk → appearanceChanged()  // isMoving()==false
```

`ActorSprite.appearanceChanged` → `appearanceChanged_v2(locArray, orient, isMoving(), isIdle())`.

Body / FLA convention: standing `state_<Name>`; walking `state_<Name>_walking` (optional `*_towalking` / `*_fromwalking`).

**Whirled2 replication (ORIGINAL MIT `AvatarHost.hx`):**  
`hostWalk(moving, orient, locX?)` → `callAppearance` → `userProps.appearanceChanged_v2`.  
Chrome floor click → `notifyLoftWalk(true)` at trek **start**, tick locX ~100ms while moving, `notifyLoftWalk(false)` on arrive (`classic-avatar.js` + `app.js` chromeWalkTo). **Not** a dump of club AS.

### 2.3 Nest load path (Ruffle-correct)

| Do | Don’t |
|----|-------|
| Outer Ruffle loads **http** `avatar-host.swf` | Remount companion into a visible DIRECT player until `"connected"` (ce blank loft) |
| `hostLoadBytes(base64)` → `Loader.loadBytes` + `allowCodeImport` + child `ApplicationDomain` | Nested `Loader.load("blob:…")` / `data:` URLs |
| Listen `controlConnect` **before** loadBytes | Assume JS `load()` Promise ≡ avatar connected |
| One player + nested Loader | Dual wasm “host beside Body” for walk |

---

## 3. Hop-by-hop failure map (evidence from this tree)

Floor click path: `app.js` `chromeWalkTo` / `animateWearToFloorClick` → `WhirledClassicAvatar.notifyLoftWalk` → (companion) `hostWalk` → `appearanceChanged_v2`.

| # | Hop | Status historically | Evidence |
|---|-----|---------------------|----------|
| A | Floor click → chrome lerp + CSS bob | **OK** | `app.js` always binds unless `#stage-slot[data-engine-owns-avatar-walk=1]`; cj fixed tofu early-return |
| B | `notifyLoftWalk(true/false)` for whole trek | **OK** after cd | Start sets `loftHostState.moving`; ~100ms locX tick; arrive clears |
| C | `playbackMode: "ruffle"` mounts Wear Ruffle | **OK** when user picks Classic Flash | Smooth PNG path never mounts Ruffle |
| D | Companion nest + `hostLoadBytes` on **host** player after EI `ready` | **BROKEN** on cg/ce/cf | See §4 |
| E | `controlConnect` → `userProps` → `gotControl_v1` → bridge `"connected"` | Depends on D | `AvatarHost.hx` `onControlConnect`; soft `connect_soft_fail` on no-userProps (ck) |
| F | `hostWalk` → `appearanceChanged_v2` walk scenes | Only if E connected | Else chrome bob only |
| G | flashQa asset choice | **Was wrong** (demo-qa paint stub) | ch/ck wear `demo-avatar.swf` (AvatarControl mimic + ENTER_FRAME walk) |
| H | Stand / letter “T” / blank loft | **ci** fixed | Never letter glyph; soft companion-cover; mirror `assets/ruffle/demo-avatar.swf` |

**One-sentence root cause (pre-ch):**  
Classic Flash walk failed at the **companion nest hop** — `hostLoadBytes` did not reliably run on the host Ruffle after EI `ready` (silent `callExternalInterface` miss + dual-layer active-player race), so `controlConnect` never completed, `loftUsesCompanionHost` stayed false, and `hostWalk` never reached Body.  
(See also `WALK-E2E-ANALYSIS.md`, `ROOT-CAUSE.md`.)

---

## 4. Exact broken hops (with code evidence)

### 4.1 Silent EI miss treated as success (cg)

Ruffle `callExternalInterface` returns **`undefined`** when the callback is not registered — **no throw** (`RUFFLE-SOURCE-DEEP.md` §4.2 / TypeDoc).

cg-era logic treated that as `{ ok: true }` → JS believed `hostLoadBytes` ran when it never did.

**Fix (ch+):** `tryCallIntoSwf` — `undefined`/`null` = **miss** (`classic-avatar.js`).

### 4.2 Ready flush / wrong active player (cg Option A)

- Bridge `"ready"` could fire while `loftActivePlayer` still pointed at **DIRECT** Body (no `hostLoadBytes`).
- `startCompanionWithPayload` sometimes called loadBytes in `mountRuffle.then` **before** `addCallback`/`ready`.
- Dual live players: walk needs **one** nest; dual outer players cannot share `sharedEvents`.

**Fix (ch+):** `WEAR_COMPANION_ONLY=true` — single mount of `avatar-host.swf` into `#avatar-ruffle-host` with stand **cover** until `"connected"`; gate `hostLoadBytes` on ready; `resolveHostEiPlayer()` prefers companion.

### 4.3 ce companion remount wiped paint

Auto-upgrade remounted companion into the **same** visible host → empty transparent host + faded stand = **blank loft** (worse than tofu). cf disabled auto-upgrade → DIRECT stable but **no** walk frames.

### 4.4 Ruffle drops dynamic Event `props` (ck)

Plain `Event` dynamic properties can be lost under Ruffle. Club uses a typed connect event bag; DemoAvatar uses **`ConnectBag` subclass with public `props`**. Host reads `evt.props` first, falls back to evt (`AvatarHost.hx` `onControlConnect`). Soft `connect_soft_fail` (not hard `"error"`) avoids remount storms when `userProps` missing.

### 4.5 DIRECT Body cannot walk via EI probes alone

Probing `setBodyState` / `gotoAndPlay` on a stock SDK Body without host nest does **not** replace `appearanceChanged_v2`. Exception: **DemoAvatar** registers EI `hostWalk` itself so DIRECT remount still runs green ENTER_FRAME leg cycle (ck fallback).

---

## 5. What ck ships (best possible under Ruffle)

| Path | Behavior |
|------|----------|
| Companion `"connected"` | Real nest: `hostWalk` → Body / DemoAvatar `appearanceChanged_v2` walk |
| Companion soft-fail / watchdog | Remount **DIRECT**; DemoAvatar still animates via EI `hostWalk` (`DIRECT+walk` badge) |
| Stock Body + nest fail | Chrome bob + stand; document hop; prefer Smooth PNG hybrid when frames exist |
| Default tofu | cj CSS legs — independent of Ruffle |
| flashQa | `demo-avatar.swf` (both `assets/avatars/flash-qa/` and `assets/ruffle/`) |

Hard rules: beginner + ENGINE DEV comments; no MySpace; Ruffle **only** in `#avatar-ruffle-host` (never `#stage-slot`); no AGPL dump.

### Companion connect under Ruffle — remaining hop (honest)

If `WhirledClassicAvatar.getLoftHostDebug()` shows `companionConnected: false` but `directEiWalk: true`:

| Hop | Verdict |
|-----|---------|
| Floor → notifyLoftWalk | OK |
| EI hostWalk on DIRECT DemoAvatar | OK (green walk) |
| Nest controlConnect for **arbitrary** stock Body | May still soft-fail / timeout → DIRECT | Exact miss: either `connect_soft_fail` (no-userProps / props bag) or ready-gate never sees host callback — check `?avatarDebug=1` bridge log |

**Evidence to collect in browser:**  
`getLoftHostDebug()` → `connected`, `directEiWalk`, `mountMode`, last bridge kinds (`ready` / `loading` / `loaded` / `gotControl` / `connected` / `connect_soft_fail` / `error`).

---

## 6. Replication checklist (ORIGINAL code only)

| Club / Grey Havens idea | Whirled2 ORIGINAL file |
|-------------------------|------------------------|
| Room host ControlBackend + nest Loader | `tools/avatar-host/AvatarHost.hx` → `assets/avatar-host/avatar-host.swf` |
| WalkAnimation moving flag for whole trek | `src/classic-avatar.js` `notifyLoftWalk` + locX tick; `app.js` chromeWalkTo |
| AvatarControl connect + appearance | `tools/demo-avatar/DemoAvatar.hx` (QA Body mimic); stock Body via nest |
| Idle / speak | `hostSleep` / `hostSpoke` → `avatarSpoke_v1` |
| Wear chrome | `app.js` dual Wear + cj tofu/engine-owns opt-out |

---

## 7. cl fix — DemoAvatar walk was hidden by companion cover

**Evidence (ck):** COMPANION-ONLY mounted empty `avatar-host.swf` with stand cover until `"connected"`. flashQa DemoAvatar often never reached `"connected"` under Ruffle, so users saw **stand cover only** (no green legs) even though EI `hostWalk` existed on a nested/invisible path.

**Fix (?v=20260906cl)** in `classic-avatar.js` `shouldCompanionOnly(worn, url)`:
- `demo-avatar.swf` / `demo-qa.swf` / flashQa names → **return false** → mount **DIRECT** outer Ruffle.
- Real Body SWFs still use companion nest (`WEAR_COMPANION_ONLY`).
- DIRECT + DemoAvatar EI `hostWalk` → visible green ENTER_FRAME walk for whole chrome trek.

Cite: `GREY-HAVENS-RUFFLE-REPLICATE.md` §3–4 (club nest vs Whirled2 Ruffle invent; prove with demo before stock Body); §8 top finding — failure is connect hop, not missing hostWalk math.

## 8. Live retest

```
https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906cl&flashQa=1&avatarDebug=1
```

1. Loft: no grey “T”, no blank stage.  
2. Floor click: green continuous walk → blue idle.  
3. `getLoftHostDebug()`: `companionConnected` **or** `directEiWalk`.  
4. Default tofu Wear: CSS leg bob.  
5. `node scripts/qa-flash-check.cjs` — all PASS.

---

## 9. Doc / research index (cite, don’t copy)

| Doc | Role |
|-----|------|
| `GREY-HAVENS-PROTOCOL.md` | Protocol tables (connect, hostProps, userProps, walk) |
| `GREY-HAVENS-RUFFLE-REPLICATE.md` | Club architecture → Ruffle nest map (cite-only; no AGPL/msoy dump) |
| `RUFFLE-SOURCE-DEEP.md` | sharedEvents, loadBytes, EI silent miss |
| `WALK-E2E-ANALYSIS.md` | cg hop trace |
| `ROOT-CAUSE.md` | tofu/T + companion wipe history |
| `SMOOTH-RUFFLE.md` / `QA-FLASH.md` | ck ship + checklist |
| `/tmp/whirled-research/*` | Read-only Grey Havens study — **never** copy into repo |
