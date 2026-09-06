# Classic Whirled avatars — without Adobe Flash

**Cache:** `?v=20260906bg`  
**Audience:** beginners + ENGINE DEV. In-site: Help → **Developers** → *Classic Whirled avatars — without Adobe Flash*. Groups → **Dev Updates** thread.

---

## Why dual modes (good idea)

Classic Flash users want the real `.swf`. Modern Whirled2 users want smooth click-to-walk on phones. One path cannot do both well today:

| Mode | What you get | When to use |
|------|----------------|-------------|
| **A — Classic Flash (Ruffle)** | Real `.swf` via Ruffle WASM in the loft (transparent stage, `pointer-events: none` so floor clicks work). Billboard moves + bob/flip. Badge: `Appearance: Ruffle (SWF)` | You have a SWF and want classic appearance now. Full AvatarControl walk = Coming Soon. |
| **B — Whirled2 Smooth (PNG hybrid)** | Idle+walk PNG/WebP chrome walk like Whirl (+ emotes). **No Ruffle** in loft. Badge: `Walking: PNG hybrid (no Ruffle)` | You have (or can attach) PNG frames. Best feel on mobile / HTTPS Pages. |

Persist choice on the Stuff item as `playbackMode: 'png-hybrid' | 'ruffle'`.  
**Default:** Smooth if PNGs exist, else Classic Flash if SWF, else Whirl.

---

## Currently (read this box first)

> **If your avatar is walking/animating and you chose Whirled2 Smooth or only Wear Whirl → that motion is PNG spritesheets in HTML/CSS/JS. Ruffle is NOT involved.**  
> **Ruffle is only the WASM Flash emulator for `.swf` files** (Stuff preview / Classic Flash Wear mode).

> **Ruffle = YES (optional path).**  
> **Default smooth room movement = PNG hybrid (Ruffle not required).**

- Browsers **cannot** run Adobe Flash Player anymore.
- Whirled2 **never** asks you to install Flash.
- If you only use **Whirl** (or other PNG packs) and never upload a `.swf`, **Ruffle never loads**.
- In the loft, look at the **nameplate badge**: `Whirl · PNG` / `Walking: PNG hybrid (no Ruffle)` vs `Appearance: Ruffle (SWF)`.
- Debug: `WhirledChrome.getAvatarPlaybackMode()` → `'png-hybrid' | 'ruffle' | 'tofu' | 'png'`.

---

## Do we use Ruffle?

**Yes — optionally.**

| Situation | What loads | How you walk |
|-----------|------------|--------------|
| **Whirl / PNG pack** | No Ruffle | Click loft floor — PNG idle/walk frames |
| **Whirled2 Smooth** (`playbackMode: png-hybrid`) | Ruffle **not** in loft. Optional Stuff SWF preview may load Ruffle | Click floor — **PNG chrome walk** (same path as Whirl) |
| **Classic Flash (Ruffle)** (`playbackMode: ruffle`) | **Ruffle** shows the avatar (transparent stage) | Click floor moves you; synthesized bob/flip. Full SWF walk anim needs AvatarControl (Coming Soon) |
| **SWF-only, no PNGs** | Classic Flash mode only until you attach frames | Smooth card disabled with CTA: Convert / attach PNG frames |
| **Stuff → Preview in Ruffle** | Ruffle CDN for that preview | Preview only |

Ruffle is an **open-source Flash emulator in WASM** (CDN). Loft mounts use a **transparent** stage and **`pointer-events: none`** so room click-to-walk still works.

---

## One-flow: upload → room

1. Stuff → Avatars → **Classic Flash / Whirled avatars** panel.  
2. Drop your **own** `.swf` (plus optional PNG idle + walk).  
3. **Analyze** → we detect SWF and set a sensible default mode.  
4. Pick a **Wear mode** card: **Whirled2 Smooth** or **Classic Flash (Ruffle)**.  
5. **Save to Stuff**.  
6. Tap **Wear & enter loft** — walk on the floor; click avatar for emotes (or Coming Soon stubs that don’t break walk).

SWF-only is still **Wearable immediately** in Classic Flash mode. Attach PNG idle+walk anytime to unlock Smooth.

---

## Honest limits

- Stock Whirled SWFs speak **AvatarControl** (`controlConnect` / `appearanceChanged_*`). Without a host shim they **idle** inside Ruffle.
- We do **not** copy AGPL host code; Smooth PNG is the delightful playable path today.
- Full host shim = Phase 2 (see `AVATAR-IMPORT.md`, `QA-FLASH.md`).

---

## Preserve

Whirl default starter, chat visit-since, pale-blue chrome, transparent Ruffle, pointer-events none on loft SWF, earn-only, no MySpace nickname, no fake catalog. Groups / badges vocabulary unchanged.

## Related

- [AVATAR-IMPORT.md](./AVATAR-IMPORT.md)  
- [QA-FLASH.md](./QA-FLASH.md)  
- [DEV-HUB.md](./DEV-HUB.md)  
- [AVATAR-CREATOR-GUIDE.md](./AVATAR-CREATOR-GUIDE.md)  
- Module: `src/classic-avatar.js`
