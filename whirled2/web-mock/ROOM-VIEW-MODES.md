# Room view modes (?v=20260907a)

Chrome-only. Pixi stays mounted in `#stage-slot`.

## Controls

Top-right of `.room-strip` — **outside** the engine box:

| Control | What it does |
| --- | --- |
| Shrink to fit | Contain the designed room aspect (2.4:1 loft strip) inside the box. Bars match chrome. |
| Letterbox | Same contain math, dark bars so the room never stretches. |
| Full height | Lock to box height. Width may crop on the sides. |
| Fullscreen / F | Fullscreen the room host. Always available. Esc exits. |

Mode is stored in `localStorage.whirled2.viewMode`.

## Mobile

Rotate a phone sideways while the Rooms tab is open:

- Topbar, occupant rail, slide chat, and embed dock hide.
- Stage fills the screen.
- Chat collapses to a **chat** handle. Tap to expand the input pill.

Rotate back to portrait and chrome returns. Do not remount the engine.

## Engine contract

- Listen for `whirled:viewFit` after a fit change.
- `resizeTo: host` still works because `#stage-slot` is the sized host.
- Do not wrap or replace the canvas from this module.
