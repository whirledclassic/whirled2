# QA-FLASH — Flash / loft interact checklist (?v=20260906cd)

Dual modes: `playbackMode` png-hybrid|ruffle. **cc** = official Ruffle mount (`publicPath` + `ruffle().load` + DataLoadOptions); **cb** DIRECT-stable; **by** hostLoadBytes; **bu** nest; **bt** never-tofu; **bs** Hybrid gate.

## Success criteria (?v=20260906cd)

0. Worn Classic Flash SWF never shows tofu bean **or blank loft** — DIRECT outer Ruffle + stand thumb / glyph immediately.
1. Wear **Classic Flash (Ruffle)** → loft → **floor click** moves billboard (chrome bob); avatar click → emotes. Companion auto-upgrade **skipped** so loft never remounts empty `host.swf`.
2. Mount matches wiki: `publicPath` absolute; `player.ruffle().load`; IDB → `{data: ArrayBuffer, swfFileName}`; EI via `callExternalInterface`.
3. If companion path used later: `hostLoadBytes(base64)` for blob/IDB; watchdog ~2s → remount **DIRECT**.
4. Wear **Whirled2 Smooth** → PNG walk; Ruffle **not** mounted.
5. Dual Wear radio cards still present.
6. Debug: `?avatarDebug=1` → host shows `data-mount-mode="direct"` + stand/SWF visible.

## Architecture

- Loft Wear default: outer Ruffle loads **avatar SWF DIRECT** (prefer DataLoadOptions bytes; blob URL fallback)
- Stand thumb / glyph always in `#avatar-ruffle-host` (CSS: on top while mounting; behind once DIRECT playing)
- Companion nest coded but not auto-upgraded after DIRECT (blank-loft risk)
- Bridge (when used): `window.WhirledAvatarHostBridge(kind, payload)`
- Source: `tools/avatar-host/AvatarHost.hx` (ORIGINAL MIT; study protocol only — no AGPL copy)
- Docs: `RUFFLE-INTEGRATION.md`

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
node /tmp/push-cc.js   # dry-run (executor does NOT push)
```
