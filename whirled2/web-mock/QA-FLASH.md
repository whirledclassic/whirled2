# QA-FLASH — Flash / loft interact checklist (?v=20260906cl)

**cl:** cover was hiding walk — demo DIRECT; stand opacity 0 when player/walking.\n\nDual modes: `playbackMode` png-hybrid|ruffle. **ck** = companion hostWalk + DemoAvatar continuous walk + DIRECT EI fallback. **cj** = tofu CSS walk + chrome floor-click with Pixi canvas. Deep analysis: `WHY-FLASH-FAILS.md`.

## Success criteria (?v=20260906cl)

0. Loft NEVER shows grey letter "T" (or any initial glyph) as the avatar.
1. Worn Classic Flash never blank loft — stand PNG/tofu-SVG cover until connected, or DIRECT outer SWF.
2. `?flashQa=1` wears **demo-avatar.swf** — floor click → **green continuous walk** → blue idle on arrive.
3. Debug: `?avatarDebug=1` → `WhirledClassicAvatar.getLoftHostDebug()` — `companionConnected` **or** `directEiWalk`.
4. Default tofu Wear → CSS legs bob on floor click (cj).
5. Wear **Whirled2 Smooth** → PNG walk; Ruffle not mounted.
6. Status badge honest: connected / DIRECT / DIRECT+walk / failed.

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
curl -sI https://whirledclassic.github.io/whirled2/whirled2/web-mock/assets/ruffle/demo-avatar.swf | head -5
curl -sI https://whirledclassic.github.io/whirled2/whirled2/web-mock/assets/avatars/flash-qa/demo-avatar.swf | head -5
curl -sI https://whirledclassic.github.io/whirled2/whirled2/web-mock/assets/avatar-host/avatar-host.swf | head -5
WHIRLED_DO_PUSH=1 node /tmp/push-ck.js
```

Live: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906cl&flashQa=1&avatarDebug=1
