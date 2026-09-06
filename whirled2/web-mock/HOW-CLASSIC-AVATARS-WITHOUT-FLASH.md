# Classic Whirled avatars — without Adobe Flash

**Cache:** `?v=20260906bb`  
**Audience:** beginners + ENGINE DEV. In-site: Help → **Developers** → *Classic Whirled avatars — without Adobe Flash*. Groups → **Dev Updates** thread.

---

## Currently (read this box first)

> **Ruffle = YES (optional path).**  
> **Default smooth room movement = PNG hybrid (Ruffle not required).**

- Browsers **cannot** run Adobe Flash Player anymore.
- Whirled2 **never** asks you to install Flash.
- If you only use **Whirl** (or other PNG packs) and never upload a `.swf`, **Ruffle never loads**.

---

## Do we use Ruffle?

**Yes — optionally.**

| Situation | What loads | How you walk |
|-----------|------------|--------------|
| **Whirl / PNG pack** | No Ruffle | Click loft floor — PNG idle/walk frames |
| **Hybrid (SWF + PNG idle/walk)** | Ruffle **not** needed in loft (default). Optional Stuff SWF preview may load Ruffle | Click floor — **PNG chrome walk** (same path as Whirl). Emotes if frames exist |
| **SWF-only Wear** (Classic Flash opt-in) | **Ruffle** shows the avatar (transparent stage) | Click floor moves you; synthesized bob/flip. Full SWF walk anim needs AvatarControl (Coming Soon) |
| **Force Ruffle in loft** | Ruffle overlay even if PNGs exist | Floor still moves; prefer Hybrid for feel |
| **Stuff → Preview in Ruffle** | Ruffle CDN for that preview | Preview only |

Ruffle is an **open-source Flash emulator in WASM** (CDN). It plays real `.swf` files without Adobe Flash Player. Loft mounts use a **transparent** stage and **`pointer-events: none`** so room click-to-walk still works.

---

## The beauty of Hybrid (smooth)

Classic feel + modern stack:

1. **Stuff → Wear** your avatar (Experimental badge for Flash path).
2. **Loft click-to-walk** uses **PNG/WebP idle + walk** (+ emotes) in chrome — fast and mobile-friendly.
3. Keep the old **`.swf`** on file for archive / Stuff Ruffle preview when you want it.
4. Later, Pixi mounts in `#stage-slot`; Wear / Ruffle stay on chrome siblings (`#avatar-wear-layer`, `#avatar-ruffle-host`).

You get classic Whirled vibes **without** a plugin, on HTTPS Pages.

---

## One-flow: upload → room

1. Stuff → Avatars → **Classic Flash / Whirled avatars** panel.  
2. Drop your **own** `.swf` (plus optional PNG idle + walk).  
3. **Analyze** → we auto-check **Experimental** + **Prefer Hybrid**.  
4. **Save to Stuff**.  
5. Tap **Wear & enter loft** — walk on the floor; click avatar for emotes (or Coming Soon stubs that don’t break walk).

SWF-only is still **Wearable immediately** (transparent Ruffle + bob walk). UI copy recommends PNG idle+walk for the smoothest Hybrid feel.

---

## Honest limits

- Stock Whirled SWFs speak **AvatarControl** (`controlConnect` / `appearanceChanged_*`). Without a host shim they **idle** inside Ruffle.
- We do **not** copy AGPL host code; Hybrid PNG is the delightful playable path today.
- Full host shim = Phase 2 (see `AVATAR-IMPORT.md`, `QA-FLASH.md`).

---

## Preserve

Whirl default starter, chat visit-since, pale-blue chrome, transparent Ruffle, pointer-events none on loft SWF, earn-only, no MySpace nickname, no fake catalog.

## Related

- [AVATAR-IMPORT.md](./AVATAR-IMPORT.md)  
- [QA-FLASH.md](./QA-FLASH.md)  
- [DEV-HUB.md](./DEV-HUB.md)  
- [AVATAR-CREATOR-GUIDE.md](./AVATAR-CREATOR-GUIDE.md)  
- Module: `src/classic-avatar.js`
