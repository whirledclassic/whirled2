# Avatar Stuff fidelity (classic whirled.club → Whirled2 mock)

**Audience:** beginners + ENGINE DEV  
**Cache:** `?v=20260906al`  
**Refs:** `_qa/wiki-refs/Stuff-My_Avatars.png`, `Stuff-My_Avatars-Avatar_viewer.png`

## Wiki / classic findings (research)

Classic **Stuff → Avatars** (whirled.club / wiki Avatar pages):

1. **My Avatars** grid — card with thumb, name link, **Wear avatar** (happy-face) / **Remove avatar** when worn.
2. Open an item → **Avatar viewer** — large stage with room-style backdrop, nameplate, utility icons (sound, speech/states, sleep/idle, **scale** diagonal arrow).
3. **Wear** puts the avatar on your body in rooms (Flash SWF + states/actions in classic).
4. From a room, click yourself → **Change avatar…** → recent few + default **tofu** + **View full list** → Stuff.
5. Ratings / Favorite / Send as Gift / listing links on the detail pane.

Whirled2 mock cannot run classic SWF wardrobe in rooms yet (lab locked: `?avatarLab=1` only). Modern path = **PNG/WebP sprite packs** (Aseprite → frames).

## What shipped (?v=20260906al)

| Classic | Shipped |
|---------|---------|
| Soft loft / room backdrop behind avatar | **Yes** — CSS `.loft-backdrop` inside `#stage-slot` (walls + grid floor + sky). Engine `replaceChildren` clears it later. |
| Stuff Avatar viewer (big preview) | **Yes** — Stuff detail for avatars: loft mini-stage + nameplate + frame flip (“preview play”). |
| Scale slider (diagonal arrow) | **Yes** — range control; persist `whirled2.avatarScale.{id}`; sizes preview + loft `#avatar-wear-layer` billboard. |
| Wear / Take off (happy face) | **Yes** — SVG happy-face on viewer + list chips; Worn badge on cards. |
| Default tofu | **Yes** — CSS/SVG tofu; loft shows tofu when nothing worn; **Wear default tofu** button. |
| Change avatar… (recent 5 + full list) | **Yes** — self occupant menu → recent + tofu + View full list → Stuff Avatars. |
| States / custom actions (SWF) | **Coming Soon** — stub button; sprite packs already flip frames in the viewer. |
| Sound / sleep icons in viewer | **Coming Soon** |
| Ratings / Favorite on Stuff detail | Partial (Shop has ratings; Stuff detail focuses Wear + gift + list). |
| Ruffle / SWF in loft | **Not shipped** — lab locked. See `AVATAR-IMPORT.md`. |

## ENGINE DEV notes

- `#stage-slot` = engine mount only. Wear billboard is sibling `#avatar-wear-layer`.
- Placeholder loft HTML is chrome-only; do not rely on it after Pixi mounts.
- `WhirledChrome.getWornAvatar()` returns the worn pack row (or null before tofu fallback paint).
- Avatar SWF lab stays behind `?avatarLab=1`.

## Do not

- Do not unlock the avatar lab for normal users.
- Do not invent shop catalog avatars.
- Do not say MySpace — say Profile look.
