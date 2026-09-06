# QA-FLASH — Flash / loft interact checklist (?v=20260906ci)

Dual modes: `playbackMode` png-hybrid|ruffle. **ci** = no letter-glyph stand; `demo-avatar.swf` on Pages (flash-qa + ruffle); companion-only fail→DIRECT. **ch** companion-only nest.

## Success criteria (?v=20260906ci)

0. Loft NEVER shows grey letter "T" (or any initial glyph) as the avatar.
1. Worn Classic Flash never blank loft — stand PNG/tofu-SVG cover until connected, or DIRECT outer SWF.
2. `?flashQa=1` wears **demo-avatar.swf** (green walk / blue idle) — curl both paths **200**.
3. Debug: `?avatarDebug=1` → `WhirledClassicAvatar.getLoftHostDebug()` — `hostReady`, `companionConnected`, `wearCompanionOnly`.
4. Wear **Whirled2 Smooth** → PNG walk; Ruffle not mounted.
5. Dual Wear radio cards still present.

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
curl -sI https://whirledclassic.github.io/whirled2/whirled2/web-mock/assets/ruffle/demo-avatar.swf | head -5
curl -sI https://whirledclassic.github.io/whirled2/whirled2/web-mock/assets/avatars/flash-qa/demo-avatar.swf | head -5
WHIRLED_DO_PUSH=1 node /tmp/push-ci.js
```

Live: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906ci&flashQa=1&avatarDebug=1
