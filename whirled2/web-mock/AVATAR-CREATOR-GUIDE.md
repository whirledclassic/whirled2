# How to make an avatar (Whirled2)

**Audience:** creators + beginners  
**Cache:** `?v=20260906ar`  
**In-site:** Stuff → **How to make an avatar** (or Help)

## What frames you need

| State | Purpose | Suggested frames |
|-------|---------|------------------|
| **idle** | Calm standing loop (required) | 1–4 |
| **walk** | Click-to-walk cycle | 4–8 |
| **wave / sit / pose / happy / dance** | Click-avatar emotes | 1–6 each |

- Transparent **PNG** or **WebP** preferred (JPEG OK).
- Classic loft size ~**64–128px** wide; keep each frame under ~**200KB**.
- Draw facing **left or right**, then set **Art faces** in the wizard so walk flip is correct.

## Tool presets (any path works)

1. **Aseprite** — tags per state → Export PNG sequence. Optionally attach `.aseprite` in the wizard (stored; loft still needs PNGs).
2. **Photoshop / Pixelora / Piskel** — export frame PNGs into folders `idle/`, `walk/`, `wave/`.
3. **Flash / Animate** — Publish **SWF** for experimental lab (`?avatarLab=1`), **or** export PNG sequences for modern Wear (recommended). Raw `.fla` cannot play in the browser (see `FLA-TEST-AVATAR.md`).
4. **Zip pack** — zip those folders and upload the zip in the wizard.

## Wizard (Stuff → Avatars → Upload avatar wizard)

1. Add files (multi-select, folder, or zip). Names like `walk/frame_00.png` auto-suggest states.
2. Name + pick thumb + art facing.
3. Map frames to states (dropdown), reorder ↑↓, set FPS; emotes can “play once”.
4. Preview idle / walk / emote → copyright checkbox → **Save to Stuff**.
5. Open card → **Wear** → Rooms: **floor click = walk**, **avatar click = emotes**.
6. **Remap states…** anytime from the item detail (not trapped in one workflow).

## Pack schema (ENGINE DEV)

Same as Cyan Hair — Pixi can consume later:

```json
{
  "name": "My avatar",
  "artFaces": "left",
  "states": {
    "idle": { "frames": ["…"], "frameDurationsMs": [200, 200] },
    "walk": { "frames": ["…"], "frameDurationsMs": [160, 160, 160, 160] },
    "wave": { "frames": ["…"], "frameDurationsMs": [220, 220] }
  }
}
```

Chrome: `WhirledChrome.getWornAvatar()`, `setAvatarState`, `playAvatarEmote`, `artFaces`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Invisible in loft | Bad/relative paths — wizard uses data URLs; Cyan Hair uses absolutized `./assets/…`. Re-Wear. |
| Constant waving | Idle mapped to wave art — Remap idle to calm frames. |
| Walking backwards | Wrong Art faces — toggle left/right. |
| Save failed | Too many/large frames for localStorage — shrink PNGs. |
| Only have .fla | Publish SWF and/or export PNGs — FLA alone is not playable. |

## Do not

- Invent shop catalog avatars.
- Unlock SWF lab for all users (`?avatarLab=1` only).
- Say MySpace — say **Profile look**.
