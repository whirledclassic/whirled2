# WALK-E2E-ANALYSIS — Classic Flash click-to-walk (?v=20260906ch)

Date: 2026-09-06 (America/New_York). Tree: `/workspace/whirled2-web-mock/`.

## Symptom

Worn Classic Flash (Ruffle) avatars **move** on loft floor click (chrome billboard lerp + CSS bob/flip) but **SWF walk frames never play** — same stuck standing pose. User: "cg still nothing working."

## Hop-by-hop trace

### 1) Floor click → notifyLoftWalk — **OK (not the bug)**

Evidence (`app.js` `chromeWalkTo` / `animateWearToFloorClick`):

- Floor click → `chromeWalkTo(xPct, yPct)`
- Always calls `WhirledClassicAvatar.notifyLoftWalk(true, face)` at trek start
- On arrive → `notifyLoftWalk(false, face)`
- Also `noteLoftActivity()` for hostSleep wake

**Verdict:** Wiring is correct. Chrome bob always runs. In-SWF walk depends on hops below.

### 2) playbackMode ruffle vs png-hybrid — **OK when user picks Classic Flash**

- Wear cards set `playbackMode: "ruffle"` | `"png-hybrid"`
- `shouldMountRuffleInLoft` mounts Ruffle only for ruffle / forceRuffle
- Smooth path never mounts Ruffle (PNG walk) — separate, working

**Verdict:** Classic Flash Wear is in ruffle mode when chosen. Not stuck on hybrid unless user picked Smooth.

### 3) WEAR_SAFE_COMPANION_UPGRADE (cg Option A) — **BROKEN hop**

cg mounts DIRECT avatar first, then sibling `#avatar-companion-layer` (opacity 0) with `avatar-host.swf`.

**Broken hop (exact):** `hostLoadBytes` / bridge `"ready"` often targets the **wrong Ruffle instance** or reports **false success**:

| Evidence | Detail |
|----------|--------|
| `tryCallIntoSwf` | `callExternalInterface` returns `undefined` when callback missing — code treated that as `{ ok: true }` (Ruffle silent miss; see `RUFFLE-SOURCE-DEEP.md` §4.2) |
| Race | Bridge `"ready"` can fire while `loftActivePlayer` still = **DIRECT** Body player (no `hostLoadBytes`) — `tryFlushPendingAvatarLoad` EI-misses with false ok |
| Immediate load | `startCompanionWithPayload` called `callHostLoadBytes` in `mountRuffle.then` **before** guaranteed `addCallback` (should wait `"ready"` / loadedmetadata) |
| Dual wasm | Two live players; walk needs **one** nest with Loader (`RUFFLE-SOURCE-DEEP.md` §6 — dual players wrong model for Body walk) |
| Watchdog | ~4s no `"connected"` → tear companion → stay DIRECT forever → chrome bob only |

`loftUsesCompanionHost` becomes true **only** on bridge `"connected"`. That flag stayed false in practice → `notifyLoftWalk` never drove real `hostWalk` → `appearanceChanged_v2`.

**cg did set `loftActivePlayer = companion` on companion mount / promote** — necessary but not sufficient given silent-miss + ready race.

### 4) AvatarHost.hx hostWalk → appearanceChanged_v2 — **host OK; JS never reaches connected**

Host SWF (`assets/avatar-host/avatar-host.swf`, 9407B) is correct ORIGINAL MIT:

- Listens `controlConnect` **before** `loadBytes`
- `allowCodeImport` + child `ApplicationDomain`
- `hostWalk` → `appearanceChanged_v2(loc, orient, moving, sleeping)`
- Bridge kinds: `ready` → `loading` → `loaded` → `gotControl` → `connected`

EI **is** registered on the **host** player after ctor. Problem was JS calling the wrong player / believing a miss was ok.

### 5) DIRECT player: can Body walk without nest? — **NO**

From `GREY-HAVENS-PROTOCOL.md` + `RUFFLE-SOURCE-DEEP.md`:

- Stock Whirled Body walk = `userProps.appearanceChanged_v2` after `controlConnect` on **`loaderInfo.sharedEvents`**
- Plain JS **cannot** answer `controlConnect` / hold `userProps`
- DIRECT outer Ruffle = paint + idle only; chrome bob ≠ `state_*_walking`

### 6) Is loftUsesCompanionHost ever true in practice (cg)? — **Usually NO**

Only set on bridge `"connected"`. Without successful nest + handshake, stays false. Floor click → `notifyLoftAppearance` EI probes on Body → silent miss → bob only.

### 7) flashQa=1 guest path — **was painting stub, not walk-capable Body**

| Asset | Role |
|-------|------|
| `assets/ruffle/demo-qa.swf` | Ruffle **paint** smoke only — **NOT** AvatarControl / no `controlConnect` |
| `assets/avatars/flash-qa/demo-avatar.swf` | ORIGINAL MIT stub from `DemoAvatar.hx` — **does** `controlConnect` + `appearanceChanged_v2` (green walk / blue idle) |

cg `wearFlashQaDemoAvatar` preferred `getDemoQaSwfUrl()` → **demo-qa.swf** → can never prove walk. **ch** seeds **demo-avatar.swf** for walk QA.

## Live Pages assets (checked 2026-09-06)

| URL | Status |
|-----|--------|
| `.../assets/avatar-host/avatar-host.swf` | HTTP 200, `application/x-shockwave-flash` |
| `.../assets/ruffle/ruffle.js` (+ wasm siblings) | HTTP 200 |
| Deployed classic-avatar `?v=20260906cg` | Present; has Option A + silent-miss bug |

## Root cause (one sentence)

**Classic Flash walk failed at the companion nest hop:** JS `hostLoadBytes` did not reliably run on the host Ruffle after EI `ready` (silent `callExternalInterface` miss + dual-layer active-player race), so `controlConnect` never completed, `loftUsesCompanionHost` stayed false, and `hostWalk` never reached Body.

## Fix (?v=20260906ch)

1. **Companion-ONLY mount** into `#avatar-ruffle-host` with **stand thumb cover** (`data-mount-mode=companion-cover`, opacity 1) until bridge `"connected"` — avoids dual-wasm and empty-host wipe (ce). Fail/watchdog → remount DIRECT.
2. **Gate `hostLoadBytes` on bridge `ready`** (queue until ready; also flush on ready).
3. **`tryCallIntoSwf`:** `undefined` from `callExternalInterface` = **miss** (not ok).
4. **`resolveHostEiPlayer()`:** prefer `loftCompanionPlayer` for all `host*` EI.
5. **flashQa** wears `demo-avatar.swf` (AvatarControl mimic), not `demo-qa.swf`.
6. Floor click still always `notifyLoftWalk(true/false)` for whole trek.

Hard rules preserved: beginner+ENGINE DEV comments; no MySpace; no `#stage-slot` Ruffle; no AGPL copy; no blank loft.
