# QA-FLASH — Flash / loft interact checklist (?v=20260906ce)

Dual modes: `playbackMode` png-hybrid|ruffle. **ce** = DIRECT-first + safe companion upgrade (walk frames); **cd** Ruffle config; **cb** DIRECT-stable; **by** hostLoadBytes; **bu** nest; **bt** never-tofu; **bs** Hybrid gate.

## Success criteria (?v=20260906ce)

0. Worn Classic Flash SWF never shows tofu bean **or blank loft** — DIRECT outer Ruffle + stand thumb / glyph immediately.
1. Wear **Classic Flash (Ruffle)** → loft → **floor click** moves billboard **and** plays in-SWF walk frames once companion connects (`hostWalk` → `appearanceChanged_v2`). Avatar click → emotes.
2. Mount: DIRECT first → settle → companion upgrade (`hostLoadBytes` for blob/IDB). Watchdog ~3.5s → remount **DIRECT** if not connected.
3. Stand thumb on TOP while `data-mount-mode=companion-pending`; behind once `is-companion-connected` / `data-mount-mode=companion`.
4. Wear **Whirled2 Smooth** → PNG walk; Ruffle **not** mounted.
5. Dual Wear radio cards still present.
6. Debug: `?avatarDebug=1` → `WhirledClassicAvatar.getLoftHostDebug()` shows `companionConnected: true` after upgrade (or DIRECT fallback).

## Architecture

- Loft Wear: outer Ruffle loads **avatar SWF DIRECT** first → then companion host nest for walk scenes
- Bridge: `window.WhirledAvatarHostBridge(kind, payload)` — `connected` flips `loftUsesCompanionHost`
- Source: `tools/avatar-host/AvatarHost.hx` (ORIGINAL MIT; study protocol only — no AGPL copy)
- Docs: `ROOT-CAUSE.md`, `RUFFLE-INTEGRATION.md`, `GREY-HAVENS-PROTOCOL.md`

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
WHIRLED_DO_PUSH=1 node /tmp/push-ce.js
```
