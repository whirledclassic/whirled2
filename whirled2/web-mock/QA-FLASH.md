# QA-FLASH — Flash / loft interact checklist (?v=20260906ch)

Dual modes: `playbackMode` png-hybrid|ruffle. **ch** = COMPANION-ONLY host nest + stand cover; hostLoadBytes gated on ready; EI silent-miss fixed. **cg** dual-layer failed connect. **cf** DIRECT-stable.

## Success criteria (?v=20260906ch)

0. Worn Classic Flash never blank loft — stand cover until connected, or DIRECT fallback.
1. Wear **Classic Flash** → loft → floor click moves billboard; when connected, **in-SWF walk** via `hostWalk` → `appearanceChanged_v2`.
2. `?flashQa=1` wears **demo-avatar.swf** (green walk / blue idle) — NOT paint-only `demo-qa.swf`.
3. Debug: `?avatarDebug=1` → `WhirledClassicAvatar.getLoftHostDebug()` — `hostReady`, `companionConnected`, `wearCompanionOnly`.
4. Wear **Whirled2 Smooth** → PNG walk; Ruffle not mounted.
5. Dual Wear radio cards still present.

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
WHIRLED_DO_PUSH=1 node /tmp/push-ch.js
```

Live: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906ch&flashQa=1&avatarDebug=1
