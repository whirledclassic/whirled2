# QA-FLASH — overnight Flash / loft interact checklist (?v=20260906ay)

**Audience:** beginners verifying Wear + loft; ENGINE DEV confirming chrome vs Ruffle boundaries.

## Root causes we fixed

1. **Black background** — Ruffle default opaque stage / missing `wmode:"transparent"` + CSS. Fixed: `backgroundColor: null`, `wmode: "transparent"`, transparent CSS on `#avatar-ruffle-host` / player / canvas.
2. **Cannot click / walk** — (a) Ruffle layer ate pointer events; (b) stock Whirled SWFs need **AvatarControl** host (`controlConnect` / `appearanceChanged_*`) — without it the SWF idles forever. Fixed practically: **Hybrid (smooth)** PNG chrome walk by default; loft Ruffle uses `pointer-events: none` so floor clicks reach `.stage-host`.
3. **Brown/black room bars** — `.stage-wrap` / mobile `.workspace` used brown band gradients (`#5c4030` / `#8b6914`) and `#000` voids. Swept to pale-blue classic chrome + cool blue loft floor.

## What to do on Wear

| Item type | What Wear does | How you walk |
|-----------|----------------|--------------|
| **Whirl / PNG pack** | PNG billboard | Click loft floor |
| **Hybrid (SWF + PNG idle/walk)** | **Hybrid (smooth)** — PNG in loft; SWF for Stuff Ruffle preview | Click floor (PNG walk frames / emotes) |
| **SWF-only (Classic Flash opt-in)** | Transparent Ruffle on loft | Click floor to **move billboard**; SWF anim stays idle until AvatarControl host |
| **Force Ruffle in loft** (toggle on item) | SWF overlay even if PNGs exist | Floor still moves; prefer Hybrid for feel |

### Steps (Test profile)

1. Hard-reload `?v=20260906ay` (or clear cache).
2. Stuff → Avatars → confirm **Whirl** seeded + Worn (starter).
3. If you have a classic upload: open item → see **Loft mode** pill (Hybrid / Ruffle).
4. Wear hybrid item → loft nameplate shows **Hybrid (smooth)** → click floor → walks.
5. Wear SWF-only → no black box (loft shows through) → click floor → avatar position moves.
6. Rooms: no brown/black stripes on stage frame, occupant strip, music dock chrome, Clear chat / Share row.
7. Optional: enable **Force Ruffle in loft** → SWF appears; floor still clickable around it.

## Automated smoke (no browser)

```bash
node scripts/qa-flash-check.cjs
node --check src/classic-avatar.js app.js
```

## AvatarControl next steps (honest)

- Host must answer `controlConnect` and drive `appearanceChanged_v1/v2`.
- Do **not** copy AGPL `whirled-host` code; study Grey Havens / whirled.club ASdocs only.
- Until then: Hybrid PNG is the playable path.

## Preserve

Whirl auto seed+Wear, room visual overhaul, av chat visit-since, Dev Hub, classic-avatar.js module, earn-only, no MySpace, no fake catalog.
