# ROOT-CAUSE — Classic Flash click-to-walk no animation (?v=20260906ce)

## Symptom

Worn Classic Flash (Ruffle) avatars **move** on loft floor click (chrome billboard lerp + CSS bob/flip) but the **SWF walk frames never play** — Body stays on idle/`state_Default`.

## Why (evidence)

1. **Stock Whirled SWFs do not walk via ExternalInterface.** Grey Havens / whirled.club drive walk with `userProps.appearanceChanged_v2(loc, orient, moving, sleeping)` after a `controlConnect` handshake on nested `loaderInfo.sharedEvents` (`GREY-HAVENS-PROTOCOL.md`, `AvatarHost.hx` `callAppearance` / `hostWalk`). Plain JS cannot inject `sharedEvents`; only the companion host SWF can.

2. **Walk chrome already calls the right API — but only when companion is connected.** `app.js` `chromeWalkTo` → `WhirledClassicAvatar.notifyLoftWalk(true, face)` → `callHostWalk` → EI `hostWalk` → `appearanceChanged_v2`. Gate in `notifyLoftWalk` / `callHostWalk`: needs `loftUsesCompanionHost` or `loftHostState.hostMode` (set **only** on bridge kind `"connected"`).

3. **`?v=20260906cd` Wear path skipped companion upgrade.** After blank-loft regression (companion-first = transparent empty `host.swf` + faded stand), `mountWearIfNeeded` mounted the avatar **DIRECT** and only precomputed companion payload for debug — comment: *"skipped auto-upgrade"*. Result: DIRECT paint OK, `loftUsesCompanionHost` forever false → floor click = chrome bob only.

## Fix (?v=20260906ce)

- Keep **DIRECT-first** (avatar visible immediately; stand thumb never blank).
- After DIRECT `mountRuffle` resolves, **schedule companion upgrade** (~450ms): `prepareCompanionStrategy` → `startCompanionWithPayload` (`hostLoadBytes` / `hostLoadUrl`).
- Flip `loftUsesCompanionHost` **only** on bridge `"connected"`; `data-mount-mode=companion-pending` keeps stand on TOP while empty host loads.
- Watchdog ~3.5s / bridge error → `remountDirectAvatarImmediate` (DIRECT-stable fallback).

## Non-goals

- No AGPL msoy/world-client copy.
- Ruffle stays in `#avatar-ruffle-host` only (never `#stage-slot`).
- PNG / Whirled2 Smooth path unchanged (chrome PNG walk).
