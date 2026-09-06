# QA-FLASH — Flash / loft interact checklist (?v=20260906bu)

Dual modes: `playbackMode` png-hybrid|ruffle. **bu** = nested companion host (sharedEvents walk); **bt** never-tofu; **bs** Hybrid gate; **bl** interactivity baseline.

## Success criteria (?v=20260906bu)

0. Worn Classic Flash SWF never shows tofu bean **or blank loft** — host Ruffle and/or last thumb / glyph.

1. Wear **Classic Flash (Ruffle)** → enter loft → **click floor** moves character (chrome bob) **and** plays **in-SWF walk** via `hostWalk` → `appearanceChanged_v2`.
2. **Click nameplate / hitbox** → emote menu → Wave/Sit/… → **hostEmote** + chrome bubble.
3. Wear **Whirled2 Smooth** → PNG walk + emotes still fine; Ruffle **not** mounted in loft.
4. Dual Wear radio cards still present.
5. Second SWF: Analyze → Classic Flash → Save → Wear & enter loft.
6. Debug: `?avatarDebug=1` → `WhirledClassicAvatar.getLoftHostDebug()` shows `companionHost: true` + bridge `connected`.

## Architecture

- Outer Ruffle loads `./assets/avatar-host/avatar-host.swf?v=20260906bu`
- EI: `hostLoadUrl` / `hostWalk` / `hostEmote` / `hostSetState` / `hostIsConnected` / `hostGetDebug`
- Bridge: `window.WhirledAvatarHostBridge(kind, payload)`
- Source: `tools/avatar-host/AvatarHost.hx` (ORIGINAL MIT; study protocol only — no AGPL copy)

## Pointer events

- Loft `ruffle-player` / canvas: `pointer-events: none`.
- `.avatar-hitbox` + nameplate: `pointer-events: auto`.
- Floor: `.stage-host` chrome click-to-walk → `notifyLoftWalk` → `hostWalk`.

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
node /tmp/push-bu.js   # dry-run (executor does NOT push)
```
