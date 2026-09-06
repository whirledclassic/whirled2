# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906ao)

**Unified Cyan Hair avatar + chrome click-to-walk:**

1. **One Wearable pack** — `assets/avatars/user-pack/cyan-hair/` merges idle / walk / stand / pose from the four Aseprite part packs. `pack.json` exposes `states` for chrome + future Pixi. Stuff **Add Cyan Hair** seeds the unified item (optional “Also add part packs…”).
2. **Click-to-walk** — until Pixi `mountWhirledEngine` owns `#stage-slot`, click the loft floor on `.stage-host` → `#avatar-wear-layer` billboard walks (walk frames) then idles; soft target marker; face flip. Yields when canvas / `[data-whirled-engine]` is present. No canvas in `#stage-slot` for chrome walk.
3. **WhirledChrome** — `getWornAvatar()` includes `states`; `setAvatarState`, `getAvatarWalkTarget`, `isChromeWalkActive`.
4. **Uploader** — Stuff Avatars multi-file idle + walk PNGs (optional .aseprite) → one inventory item with states.
5. Docs: ENGINE-BRIDGE.md + AVATAR-STUFF-FIDELITY.md + STUFF-AVATARS.md updated for unified schema.

SWF lab stays **locked**. `#stage-slot` contract unchanged.

## Prior (?v=20260906ao)

**Hybrid auth + Discord return to Pages + boot resilience** — see prior STATUS / SOCIAL-LOGIN.md.

## Standing rules

- Coins/Bars earn-only; never invent fake catalog.
- Never say MySpace; say Profile look.
- `#stage-slot` = engine mount; Wear / chrome walk on `#avatar-wear-layer` sibling.
- No secrets in client — only `WHIRLED_API` origin.
