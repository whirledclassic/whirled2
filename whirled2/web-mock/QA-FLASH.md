# QA Flash

Dual modes: `playbackMode` png-hybrid|ruffle. **bl** = Ruffle loft interactivity (walk/emote/hitbox/EI shim) + bk club in same ship.

# QA-FLASH — overnight Flash / loft interact checklist (?v=20260906bs)

## Success criteria (?v=20260906bs)

0. Worn Classic Flash SWF never shows tofu bean — Ruffle or last thumb.


1. Wear **Classic Flash (Ruffle)** → enter loft → **click floor** moves character (bob/flip).
2. **Click nameplate / hitbox** → emote menu → Wave/Sit/… → **bubble + bob** (EI try if SWF exposes callbacks).
3. Wear **Whirled2 Smooth** → PNG walk + emotes still fine; Ruffle **not** mounted in loft.
4. Dual Wear radio cards still present.

## Pointer events

- Loft `ruffle-player` / canvas: `pointer-events: none`.
- `.avatar-hitbox` + nameplate: `pointer-events: auto`.
- Floor: `.stage-host` chrome click-to-walk.

## AvatarControl / EI

- Stock SDK SWFs use **sharedEvents `controlConnect`** (Phase-2 host SWF — not AGPL copy).
- JS shim: `WhirledAvatarHost`; loft `allowScriptAccess: true` for user uploads.
- Debug: `?avatarDebug=1` → `WhirledClassicAvatar.getLoftHostDebug()`.

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
node /tmp/push-bl.js   # dry-run
```
