# ROOT-CAUSE — Classic Flash Wear visibility (?v=20260906cf)

## Short note (cf)

**ce auto-upgrade regressed visibility; cf restores DIRECT-stable while Ruffle source research runs.**

`?v=20260906ce` scheduled a delayed companion nest after DIRECT paint (`startCompanionWithPayload` ~450ms, `companion-pending`, watchdog). In practice that wiped the working outer-avatar SWF again (blank loft / companion wipe — same class of failure as companion-first). **`?v=20260906cf`** keeps Wear on **DIRECT-stable** (paint outer avatar SWF, keep it). Companion code stays in tree but `WEAR_AUTO_COMPANION_UPGRADE = false`. Do **not** re-enable until Ruffle nested `sharedEvents` / `hostLoadBytes` research says safe. Stand thumb + chrome bob/emotes remain.

---

# Historical — click-to-walk no animation (?v=20260906ce)

## Symptom

Worn Classic Flash (Ruffle) avatars **move** on loft floor click (chrome billboard lerp + CSS bob/flip) but the **SWF walk frames never play** — Body stays on idle/`state_Default`.

## Why (evidence)

1. **Stock Whirled SWFs do not walk via ExternalInterface.** Grey Havens / whirled.club drive walk with `userProps.appearanceChanged_v2(loc, orient, moving, sleeping)` after a `controlConnect` handshake on nested `loaderInfo.sharedEvents` (`GREY-HAVENS-PROTOCOL.md`, `AvatarHost.hx` `callAppearance` / `hostWalk`). Plain JS cannot inject `sharedEvents`; only the companion host SWF can.

2. **Walk chrome already calls the right API — but only when companion is connected.** `app.js` `chromeWalkTo` → `WhirledClassicAvatar.notifyLoftWalk(true, face)` → `callHostWalk` → EI `hostWalk` → `appearanceChanged_v2`. Gate in `notifyLoftWalk` / `callHostWalk`: needs `loftUsesCompanionHost` or `loftHostState.hostMode` (set **only** on bridge kind `"connected"`).

3. **`?v=20260906cd` Wear path skipped companion upgrade.** After blank-loft regression (companion-first = transparent empty `host.swf` + faded stand), `mountWearIfNeeded` mounted the avatar **DIRECT** and only precomputed companion payload for debug — comment: *"skipped auto-upgrade"*. Result: DIRECT paint OK, `loftUsesCompanionHost` forever false → floor click = chrome bob only.

## Attempted fix (?v=20260906ce) — REVERTED visibility path in cf

- Kept **DIRECT-first** then **scheduled companion upgrade** (~450ms) for in-SWF walk frames.
- That upgrade path **regressed loft visibility** again (blank loft / companion wipe) → cf gates it off.

## Non-goals

- No AGPL msoy/world-client copy.
- Ruffle stays in `#avatar-ruffle-host` only (never `#stage-slot`).
- PNG / Whirled2 Smooth path unchanged (chrome PNG walk).
