# Stuff avatars (Aseprite / PNG packs)

**Audience:** beginners + ENGINE DEV  
**Cache:** `?v=20260906al` (`LOGO_V`)  
**Status:** Sprite-pack Wear + Stuff **Avatar viewer** (preview + scale). Classic **SWF / Ruffle** wardrobe stays **On hold** (`AVATAR-IMPORT.md`, unlock only with `?avatarLab=1`).  
**Fidelity notes:** [AVATAR-STUFF-FIDELITY.md](./AVATAR-STUFF-FIDELITY.md)

## Beginner — upload, preview & Wear

Classic whirled.club avatars were mostly **Flash SWF**. Whirled2’s modern path (until engine Ruffle) is a **sprite pack**:

1. Open **Stuff → Avatars**.
2. Either:
   - **Add user packs to Stuff** (imports converted packs from `assets/avatars/user-pack/`), or
   - **Upload…** a **PNG/WebP** preview (classic thumb size ~**80×60** is fine). Optionally attach the source **`.aseprite`** file (stored as a pack attachment; not played in the room).
3. Open the inventory card → **Avatar viewer** (big loft-style preview). Drag **Scale**. Tap **Wear avatar** (happy face).
4. Or use **Wear avatar** on the list card without opening detail.
5. Go to **Rooms → Enter** your loft. Soft **placeholder loft** backdrop + your sprite on `#avatar-wear-layer`. If nothing is worn, you see default **tofu**.
6. **Take off** / **Remove avatar** clears the pack (loft falls back to tofu). **Wear default tofu** forces the blank avatar.

Copyright checkbox is required on upload. Only upload art you created or have rights to use.

### Change avatar from the room

Click **yourself** in the occupant rail → **Change avatar…** → recent 5 packs + Default tofu + **View full list…** (Stuff Avatars).

## What shows in the room

| Layer | Role |
|-------|------|
| `#stage-slot` | Soft loft **placeholder** until Pixi mounts. **Not** changed by Wear media. |
| `#decorate-layer` | Furniture / images you place via Decorate. |
| **`#avatar-wear-layer`** | **Worn Stuff avatar** — PNG preview / multi-frame flip / tofu. Scale from Stuff. |
| `#stage-bubbles` | Temporary speech/thought chrome. |

No Ruffle, no SWF in the loft for this path. Lab “Wear (lab only)” still only sets wardrobe `activeId` and does **not** change the room.

## Pack format (`pack.json`)

```json
{
  "name": "Cyan Hair Idle",
  "frames": ["frames/frame_00.png", "frames/frame_01.png"],
  "thumb": "thumb.png",
  "source": "aseprite"
}
```

Extra fields used by this mock: `preview`, `displayFrames`, `frameDurationsMs`, `sourceFile`, `sourceSha1`, `layers`.

**Beginner:** `thumb` ≈ classic Stuff thumbnail; `preview` / `displayFrames` are what Wear + the viewer show.  
**ENGINE DEV:** chrome reads Wear state via `WhirledChrome.getWornAvatar()`. Do not mount `.aseprite` or SWF into `#stage-slot`. Pixi may later own the avatar sprite inside the stage.

## Scale persistence

`localStorage` key `whirled2.avatarScale.{stuffId}` — value `0.5`–`2` (UI shows 50%–200%). Applies to Stuff viewer and loft billboard.

## Converted user packs

|Slug|Frames|Notes|
|----|------|-----|
|`char-a-dress-idle`|2|Idle|
|`char-b-dress-walk`|4|Walk cycle|
|`char-c-dress-stand`|1|Stand|
|`char-d-dress-pose`|2|Pose|

Output: `assets/avatars/user-pack/<slug>/…` + `index.json`. Re-export: `scripts/export_aseprite_avatars.py`.

## Coming Soon

- SWF states / custom actions / Ruffle in loft (lab locked).
- Viewer sound + idle/sleep icons (classic chrome).

## Do not

- Do not push unless instructed.
- Do not unlock avatar lab for normal users.
- Do not scrape whirled.club shop media.
