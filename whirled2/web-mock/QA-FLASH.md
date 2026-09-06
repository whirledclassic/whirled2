# QA-FLASH — Flash / loft interact checklist (?v=20260906cf)

Dual modes: `playbackMode` png-hybrid|ruffle. **cf** = DIRECT-stable Wear (companion auto-upgrade OFF); **ce** attempted upgrade (regressed); **cd** Ruffle config; **cb** DIRECT-stable; **by** hostLoadBytes; **bu** nest; **bt** never-tofu; **bs** Hybrid gate.

## Success criteria (?v=20260906cf)

0. Worn Classic Flash SWF never shows tofu bean **or blank loft** — DIRECT outer Ruffle + stand thumb / glyph immediately and **kept**.
1. Wear **Classic Flash (Ruffle)** → loft → **floor click** moves billboard (chrome bob/flip). Emotes via nameplate/hitbox. In-SWF walk frames deferred until companion research is safe.
2. Mount: **DIRECT only** for Wear default (`WEAR_AUTO_COMPANION_UPGRADE = false`). Companion helpers remain gated; watchdog → remount **DIRECT** if ever used.
3. Stand thumb visible (on TOP while mounting; behind once `data-mount-mode=direct` + `is-playing`).
4. Wear **Whirled2 Smooth** → PNG walk; Ruffle **not** mounted.
5. Dual Wear radio cards still present.
6. Debug: `?avatarDebug=1` → `WhirledClassicAvatar.getLoftHostDebug()` shows `companionConnected: false` / DIRECT mount (auto-upgrade OFF).

## Architecture

- Loft Wear: outer Ruffle loads **avatar SWF DIRECT** and keeps it (companion auto-upgrade OFF)
- Bridge / nest / watchdog kept in code for future opt-in after Ruffle research
- Source: `tools/avatar-host/AvatarHost.hx` (ORIGINAL MIT; study protocol only — no AGPL copy)
- Docs: `ROOT-CAUSE.md`, `RUFFLE-INTEGRATION.md`, `GREY-HAVENS-PROTOCOL.md`

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
WHIRLED_DO_PUSH=1 node /tmp/push-cf.js
```
