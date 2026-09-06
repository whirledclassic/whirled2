# Stuff avatars (Aseprite / PNG packs)

**Audience:** beginners + ENGINE DEV  
**Cache:** `?v=20260906ar` (`LOGO_V`)  
**Status:** Unified **Cyan Hair** Wearable (idle+walk+pose) + chrome **click-to-walk**. Classic **SWF / Ruffle** wardrobe stays **On hold** (`AVATAR-IMPORT.md`, unlock only with `?avatarLab=1`).  
**Fidelity notes:** [AVATAR-STUFF-FIDELITY.md](./AVATAR-STUFF-FIDELITY.md)

## Beginner — upload, Wear & walk

Classic whirled.club avatars were mostly **Flash SWF**. Whirled2’s modern path (until engine Ruffle) is a **sprite pack with states**:

1. Open **Stuff → Avatars**.
2. Either:
   - **Add Cyan Hair to Stuff** (imports the unified pack from `assets/avatars/user-pack/cyan-hair/`), or
   - **Upload avatar wizard…** (PNG sequences / folders / zip / .aseprite). Map idle+walk+emotes; Remap later. See `AVATAR-CREATOR-GUIDE.md`.
3. Open the inventory card → **Avatar viewer** → **Wear avatar** (happy face).
4. Go to **Rooms → Enter** your loft. Soft loft backdrop + your sprite on `#avatar-wear-layer`.
5. **Click the loft floor** → avatar walks there (walk frames), then returns to idle. Face flips left/right.
6. **Take off** / **Wear default tofu** as needed.

Copyright checkbox is required on upload. Only upload art you created or have rights to use.

### Change avatar from the room

Click **yourself** in the occupant rail → **Change avatar…** → recent 5 packs + Default tofu + **View full list…** (Stuff Avatars).

## What shows in the room

| Layer | Role |
|-------|------|
| `#stage-slot` | Soft loft **placeholder** until Pixi mounts. **Not** changed by Wear media. |
| `#decorate-layer` | Furniture / images you place via Decorate. |
| **`#avatar-wear-layer`** | **Worn Stuff avatar** — PNG states / multi-frame flip / tofu. Chrome click-to-walk until engine mounts. |
| `#stage-bubbles` | Temporary speech/thought chrome. |

No Ruffle, no SWF in the loft for this path. Lab “Wear (lab only)” still only sets wardrobe `activeId` and does **not** change the room.

## Unified pack format (`pack.json`)

```json
{
  "name": "Cyan Hair",
  "slug": "cyan-hair",
  "states": {
    "idle": { "frames": ["frames/idle/frame_00.png", "frames/idle/frame_01.png"], "frameDurationsMs": [200, 200] },
    "walk": { "frames": ["frames/walk/frame_00.png", "..."], "frameDurationsMs": [200, 200, 200, 200] },
    "stand": { "frames": ["frames/stand/frame_00.png"], "frameDurationsMs": [833] },
    "pose": { "frames": ["frames/pose/frame_00.png", "frames/pose/frame_01.png"], "frameDurationsMs": [833, 833] }
  },
  "thumb": "thumb.png",
  "preview": "preview.png",
  "source": "aseprite-unified"
}
```

Legacy single-state packs still work (treated as `idle` only).

**Beginner:** Wear Cyan Hair, then click the floor to walk.  
**ENGINE DEV:** `WhirledChrome.getWornAvatar()` exposes `states`; `setAvatarState` / `getAvatarWalkTarget` for chrome walk. When `mountWhirledEngine(host)` owns `#stage-slot`, chrome walk disables. Pixi Player can later consume the same JSON. Prefer `resizeTo: host`.

## Scale persistence

`localStorage` key `whirled2.avatarScale.{stuffId}` — value `0.5`–`2` (UI shows 50%–200%). Applies to Stuff viewer and loft billboard.

## Converted user packs

|Slug|Notes|
|----|-----|
|**`cyan-hair`**|**Preferred unified Wearable** — idle + walk + stand + pose|
|`char-a-dress-idle`|Part (idle) — optional|
|`char-b-dress-walk`|Part (walk) — optional|
|`char-c-dress-stand`|Part (stand) — optional|
|`char-d-dress-pose`|Part (pose) — optional|

Output: `assets/avatars/user-pack/<slug>/…` + `index.json`. Re-export parts: `scripts/export_aseprite_avatars.py`.

## Coming Soon

- SWF states / custom actions / Ruffle in loft (lab locked).
- Viewer sound + idle/sleep icons (classic chrome).
- Pixi-owned walk inside `#stage-slot` (replaces chrome click-to-walk).

## Do not

- Do not unlock avatar lab for normal users.
- Do not scrape whirled.club shop media.
- Do not put engine canvas outside `#stage-slot`.
