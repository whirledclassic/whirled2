# QA-FLASH — Flash / loft interact checklist (?v=20260906cg)

Dual modes: `playbackMode` png-hybrid|ruffle. **cg** = DIRECT-first + SAFE Option A companion sibling layer; **cf** DIRECT-stable (upgrade OFF); **ce** dangerous remount (regressed); **cd** Ruffle config; **by** hostLoadBytes.

## Success criteria (?v=20260906cg)

0. Worn Classic Flash SWF never shows tofu bean **or blank loft** — DIRECT outer Ruffle paints immediately and **stays** during companion attempt.
1. Wear **Classic Flash (Ruffle)** → loft → **floor click** moves billboard (chrome bob/flip). When companion connects, in-SWF walk frames via `hostWalk` → `appearanceChanged_v2`.
2. Mount: DIRECT first; `WEAR_SAFE_COMPANION_UPGRADE` mounts host in `#avatar-companion-layer` (opacity 0). Promote only on bridge `"connected"`. Watchdog ~4s → tear companion, keep DIRECT.
3. Stand thumb visible (opacity 1) until DIRECT or companion has `.is-playing`.
4. Wear **Whirled2 Smooth** → PNG walk; Ruffle **not** mounted.
5. Dual Wear radio cards still present.
6. Debug: `?avatarDebug=1` → `WhirledClassicAvatar.getLoftHostDebug()` — `safeUpgradeActive` / `companionConnected` / `hasDirectPlayer`.

## Architecture

- Loft Wear: outer Ruffle loads **avatar SWF DIRECT**; companion nest is progressive enhancement in a sibling layer
- Bridge `"connected"` gates `loftUsesCompanionHost`; reject nested blob/data URLs
- Source: `tools/avatar-host/AvatarHost.hx` (ORIGINAL MIT; study protocol only — no AGPL copy)
- Docs: `ROOT-CAUSE.md`, `RUFFLE-SOURCE-DEEP.md`, `GREY-HAVENS-PROTOCOL.md`

## Commands

```bash
node --check src/classic-avatar.js && node --check app.js
node scripts/qa-flash-check.cjs
WHIRLED_DO_PUSH=1 node /tmp/push-cg.js
```
