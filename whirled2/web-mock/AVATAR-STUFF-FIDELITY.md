# Avatar Stuff fidelity (classic whirled.club → Whirled2 mock)

**Audience:** beginners + ENGINE DEV  
**Cache:** `?v=20260906aw`  
**Refs:** `_qa/wiki-refs/Stuff-My_Avatars.png`, `Stuff-My_Avatars-Avatar_viewer.png`

## Wiki / classic findings (research)

Classic **Stuff → Avatars** (whirled.club / wiki Avatar pages):

1. **My Avatars** grid — card with thumb, name link, **Wear avatar** (happy-face) / **Remove avatar** when worn.
2. Open an item → **Avatar viewer** — large stage with room-style backdrop, nameplate, utility icons (sound, speech/states, sleep/idle, **scale** diagonal arrow).
3. **Wear** puts the avatar on your body in rooms (Flash SWF + states/actions in classic).
4. From a room, click yourself → **Change avatar…** → recent few + default **tofu** + **View full list** → Stuff.
5. **Click floor → walk** to a point (classic room feel).
6. Ratings / Favorite / Send as Gift / listing links on the detail pane.

Whirled2 mock cannot run classic SWF wardrobe in rooms yet (lab locked: `?avatarLab=1` only). Modern path = **PNG/WebP sprite packs** (Aseprite → frames) with **states**.

## What shipped (?v=20260906ao)

| Classic | Shipped |
|---------|---------|
| Soft loft / room backdrop behind avatar | **Yes** — CSS `.loft-backdrop` inside `#stage-slot` |
| Stuff Avatar viewer (big preview) | **Yes** — loft mini-stage + nameplate + frame flip |
| Scale slider | **Yes** — persist `whirled2.avatarScale.{id}` |
| Wear / Take off | **Yes** — happy-face + Worn badge |
| Default tofu | **Yes** |
| Change avatar… (recent 5 + full list) | **Yes** |
| **One avatar with idle + walk** | **Yes** — unified **Whirl** pack (`states`) |
| **Click floor → walk** | **Yes** — chrome overlay on `#avatar-wear-layer` until Pixi mounts |
| States / custom actions (SWF) | Partial — sprite `idle/walk/stand/pose`; SWF Coming Soon |
| Sound / sleep icons in viewer | **Coming Soon** |
| Ruffle / SWF in loft | **Experimental** — user upload + opt-in (`#avatar-ruffle-host`); full SDK host shim Coming Soon |

## Unified pack schema (chrome + Pixi)

See `assets/avatars/user-pack/cyan-hair/pack.json`. Shape:

- `states.idle|walk|stand|pose`: `{ frames: string[], frameDurationsMs: number[] }`
- `thumb` / `preview` / `source: "aseprite-unified"`

**ENGINE DEV:** When implementing walk in WhirledClassicGame, reuse this JSON. Chrome exposes the worn row via `WhirledChrome.getWornAvatar()` (includes `states`). Recommend `mountWhirledEngine(host)` with `resizeTo: host` (not `window`). When the engine owns the stage, chrome click-to-walk disables (`isChromeWalkActive()` → false).

## ENGINE DEV notes

- `#stage-slot` = engine mount only. Wear billboard + chrome walk are sibling `#avatar-wear-layer`.
- Placeholder loft HTML is chrome-only; do not rely on it after Pixi mounts.
- `WhirledChrome.getWornAvatar()` / `setAvatarState` / `getAvatarWalkTarget`.
- Avatar SWF lab stays behind `?avatarLab=1`.

## Do not

- Do not unlock the *legacy* avatar lab for normal users; classic user upload uses Experimental opt-in.
- Do not invent shop catalog avatars.
- Do not say MySpace — say Profile look.
