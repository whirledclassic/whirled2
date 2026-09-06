## What shipped (?v=20260906ar)

- **Avatar upload wizard:** Stuff → Avatars → multi-step pale-blue wizard (PNG/WebP sequences, folders, zip packs, .aseprite attach, optional SWF note). Map frames to idle/walk/emotes, FPS, art facing, preview, Save. **Remap states…** from item detail. In-site **How to make an avatar** + `AVATAR-CREATOR-GUIDE.md`.
- Builds on aq: Cyan Hair walk/idle/emotes + mobile chat cleanup remain.

## Prior (?v=20260906aq)

- **Cyan Hair loft fix:** Root cause — `frames/idle/*` were actually **wave** art (Aseprite part mislabeled), so “idle” looped a constant wave. Remapped pack: idle/stand ← pose; wave ← old idle; sit ← stand folder. `artFaces:"left"` + inverted walk flip so walking right no longer moonwalks. Repair runs on older Wear rows in localStorage.
- **Click avatar → emotes:** Tap worn billboard (not floor) → pale-blue menu (Wave / Sit / Pose / Happy…). Plays once/short loop → idle. Floor click still walks. `WhirledChrome.playAvatarEmote` / `listAvatarEmotes`.
- **Mobile room chat cleanup:** Hide always-on reaction picker on coarse pointers (long-press to react); compact overlay dock; hide Share row on phones (use Room menu); composer safe-area + 44px targets; tuck Go/Friends/Party on narrow screens.
- **FLA lab:** OLE FLA inspected; 4 sketch JPEGs extracted to `assets/avatars/fla-lab/extracted/` — not sprite-ready. Docs updated with Animate → SWF / PNG steps. No Wearable stub from sketches (Cyan Hair untouched).

## Prior (?v=20260906ap)

- **Hotfix:** Cyan Hair invisible in loft — Wear stored relative `frames/…` URLs that 404. `absolutizeMediaUrl` / `normalizeWornAvatar` on load+Wear; loft always shows sprite or tofu fallback.

# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Prior (?v=20260906ao)

**Unified Cyan Hair avatar + chrome click-to-walk** — see prior STATUS / ENGINE-BRIDGE §12.

## Standing rules

- Coins/Bars earn-only; never invent fake catalog.
- Never say MySpace; say Profile look.
- `#stage-slot` = engine mount; Wear / chrome walk / emotes on `#avatar-wear-layer` sibling.
- No secrets in client — only `WHIRLED_API` origin.
