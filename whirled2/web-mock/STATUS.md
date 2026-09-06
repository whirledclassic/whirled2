## What shipped (?v=20260906ay) — visual bar kill (merged into ay styles)

- **Room chrome stacking:** killed full-width brown `#5c4030`/`#8b6914` bands on `.stage-wrap` / `.workspace`; pale loft-blue chrome only.
- **IN THIS ROOM rail:** no near-black `#1b2833`/`#121920` strip — pale-blue occupant rail (desktop + mobile chip strip).
- **Black bars removed:** workspace `#000` void, mobile rail `#000` borders, slide chat `#0b1014`/`#121a22` slabs, bottom `.bar` night black on rooms, collapsed music iframe letterbox as chrome bar.
- **Floor:** subtle warm wood + grid stays **inside** `.loft-floor` / `#stage-slot` only — not a full-width brown bar under the stage eating UI.
- Music mini-bar stays pale-blue (ax); expanded player hole deep-blue not pure black chrome.
- Preserves **av** chat visit-since / Clear, **Whirl** default, **classic-avatar** / Hybrid ay path. No JS touched (CSS-only).
- Cache stays **`?v=20260906ay`** (Flash owns ay). **No az bump** — merged into ay styles. No `/tmp/push-az.js`.

## What shipped (?v=20260906ay)

- **Flash interact (P0):** transparent Ruffle stage (`wmode:transparent` + `backgroundColor:null` + CSS) — no black box; loft `#avatar-ruffle-host` `pointer-events:none` so floor click-to-walk works.
- **Hybrid (smooth) default:** when SWF + PNG idle/walk exist, loft uses PNG chrome walk/emotes; Stuff keeps Ruffle preview. Label **Hybrid (smooth)**. Experimental **Force Ruffle in loft** toggle for SWF overlay.
- **SWF-only:** transparent Ruffle appearance; chrome moves billboard on floor click; walk *anim* still needs AvatarControl host (documented, no AGPL copy).
- **Room chrome:** killed brown/black bars (stage-wrap / workspace / loft-floor / occ-rail / chat toolbar) → pale-blue classic only.
- Preserves Whirl auto seed+Wear, ax room overhaul intent, av chat visit-since, au Dev Hub, earn-only, no MySpace / fake catalog.
- Cache: **`?v=20260906ay`**. Push: `/tmp/push-ay.js` (dry-run default). QA: `QA-FLASH.md` + `node scripts/qa-flash-check.cjs`.

## What shipped (?v=20260906ax)

- Room visual overhaul (pale-blue music dock; kill green grass); Whirl starter auto-Wear; FLA Test stub; NaN/toast fixes; Flash hybrid path kept (aw).

## What shipped (?v=20260906aw)

- Classic Flash panel (`src/classic-avatar.js`); hybrid SWF+PNG; Experimental Wear; Ruffle loft host.

# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Standing rules

- Coins/Bars earn-only; never invent fake catalog.
- Never say MySpace; say Profile look.
- `#stage-slot` = engine mount; Wear / chrome walk / emotes on `#avatar-wear-layer` sibling.
- No secrets in client — only `WHIRLED_API` origin.
- **Whirl** is the starter avatar (slug `cyan-hair`).
