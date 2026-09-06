# QA Flash

Dual modes bg: playbackMode png-hybrid|ruffle. (bj club polish — classic-avatar.js UNTOUCHED)

# QA-FLASH — overnight Flash / loft interact checklist (?v=20260906bj)

**Audience:** beginners verifying Wear + loft; ENGINE DEV confirming chrome vs Ruffle boundaries.

## Currently

> **Ruffle = YES (optional path). Default smooth room movement = PNG hybrid (Ruffle not required).**  
> Whirl-only → Ruffle never loads. See `HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md`.

## Root causes we fixed

1. **Black background** — Ruffle opaque stage. Fixed: `wmode:"transparent"`, `backgroundColor:null`, transparent CSS.
2. **Cannot click / walk** — Ruffle ate pointer events; stock SWFs need AvatarControl. Fixed: Hybrid PNG walk default; loft Ruffle `pointer-events:none`.
3. **Brown/black room bars** — swept to pale-blue (ay/az).
4. **Tofu / wrong sprite on Hybrid walk (?v=20260906bj)** — preview/thumb alone was treated as Hybrid; empty walk frames blanked the billboard → tofu fallback. Fixed: strict PNG idle/walk gate; never wipe frames mid-walk; never tofu when SWF worn; SWF-only gets Ruffle + bob/flip motion.
5. **Huge SWF data URL on worn row** — could blow localStorage Wear. Fixed: prefer `swfSha1` + IDB; strip large data URLs from worn snapshot.

## What to do on Wear

| Item type | What Wear does | How you walk |
|-----------|----------------|--------------|
| **Whirl / PNG pack** | PNG billboard | Click loft floor |
| **Hybrid (SWF + PNG idle/walk)** | **Hybrid (smooth)** — PNG in loft; SWF for Stuff Ruffle preview | Click floor (PNG walk / emotes) |
| **SWF-only** | Transparent Ruffle | Click floor → move + bob; recommend PNG for Hybrid |
| **Force Ruffle** | SWF overlay | Floor still moves |

### Steps (Test profile)

1. Hard-reload `?v=20260906bj`.
2. Stuff → Avatars → Whirl seeded + Worn.
3. Classic upload: Drop SWF → Analyze (auto Experimental/Hybrid) → Save → **Wear & enter loft**.
4. Hybrid with PNG idle+walk → nameplate Hybrid (smooth) → floor walk uses PNG (not tofu).
5. SWF-only → no black box; floor click moves + bob; no tofu.
6. Click avatar → emotes if frames; else Coming Soon stubs (walk still works).
7. Developers hub → callout shows Ruffle optional / PNG default.
8. Groups → Dev Updates → without-Flash thread present.

## Automated smoke

```bash
node scripts/qa-flash-check.cjs
node --check src/classic-avatar.js app.js
```

## Preserve

Whirl auto seed+Wear, pale-blue chrome, av chat visit-since, Dev Hub, classic-avatar.js, earn-only, no MySpace, no fake catalog, transparent Ruffle, PE none on loft SWF.
