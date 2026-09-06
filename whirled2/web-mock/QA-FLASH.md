# QA-FLASH — Flash / loft interact checklist (?v=20260906by)

Dual modes: `playbackMode` png-hybrid|ruffle. **bx** = companion `hostLoadBytes`→`loadBytes` walk sync; **bu** nest; **bt** never-tofu; **bs** Hybrid gate.

## Success criteria (?v=20260906by)

0. Worn Classic Flash SWF never shows tofu bean **or blank loft** — companion (or DIRECT fallback) + stand thumb / glyph.
1. Wear **Classic Flash (Ruffle)** → loft → **floor click** moves billboard (chrome bob) **and** plays **in-SWF walk** via `hostWalk` → `appearanceChanged_v2` when companion connected.
2. **blob/IDB Wear** uses `hostLoadBytes(base64)` (NOT nested blob:/data: into Loader).
3. Watchdog ~2s / bridge error → remount **DIRECT** outer Ruffle (blob OK).
4. Wear **Whirled2 Smooth** → PNG walk; Ruffle **not** mounted.
5. Dual Wear radio cards still present.
6. Debug: `?avatarDebug=1` → `WhirledClassicAvatar.getLoftHostDebug()` shows `companionHost: true` + bridge `connected` + `hostLoadBytesLen`.

## Architecture

- Outer Ruffle: `./assets/avatar-host/avatar-host.swf?v=20260906by`
- EI: `hostLoadBytes` / `hostLoadBytesBegin|Chunk|Commit` / `hostLoadUrl` (http only) / `hostWalk` / `hostEmote`
- Bridge: `window.WhirledAvatarHostBridge(kind, payload)`
- Source: `tools/avatar-host/AvatarHost.hx` (ORIGINAL MIT; study protocol only — no AGPL copy)

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
node /tmp/push-bx.js   # dry-run (executor does NOT push)
```
