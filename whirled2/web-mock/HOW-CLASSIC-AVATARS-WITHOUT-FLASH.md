# Classic Whirled avatars — without Adobe Flash

**Cache:** `?v=20260906bs`  
**Audience:** beginners + ENGINE DEV. In-site: Help → **Developers** → *Classic Whirled avatars — without Adobe Flash*. Groups → **Dev Updates** thread.

---

## Why dual modes (good idea)

Classic Flash users want the real `.swf`. Modern Whirled2 users want smooth click-to-walk on phones. One path cannot do both well today:

| Mode | What you get | When to use |
|------|----------------|-------------|
| **A — Classic Flash (Ruffle)** | Real `.swf` via Ruffle WASM (transparent stage; canvas `pointer-events: none`). Chrome moves billboard + bob/flip. Nameplate/hitbox opens emotes (chrome bubble + EI try). Badge: `Appearance: Ruffle (SWF)` | You have a SWF and want classic appearance now. |
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
- Ruffle EI debug: `?avatarDebug=1` then `WhirledClassicAvatar.getLoftHostDebug()`.

---


## Root causes fixed (?v=20260906bs)

| Bug | Fix |
|-----|-----|
| Thumb/preview treated as Hybrid PNG walk | `itemHasPngWalk` requires **walk** frames only |
| Default Smooth radio on SWF-only Save | Default **Classic Flash**; Analyze picks Smooth only if walk PNGs attached |
| Wear → tofu / empty loft | Never invent idle-from-thumb for SWF; strip huge dataURLs; loft always mounts Ruffle (or last thumb) when SWF worn |
| Dead floor / emotes | Billboard bob/flip walk; hitbox+nameplate PE auto; chrome bubble + EI try |
| Stock SWF no AvatarControl | Honest: sharedEvents `controlConnect` needs Phase-2 host SWF — chrome puppet now |

Research (architecture only, no AGPL copy): Ruffle `allowScriptAccess` + EI callbacks on player element; Grey Havens `AvatarControl` / `ActorControl` use `appearanceChanged` + `setLogicalLocation` / states+actions via **sharedEvents**, not raw JS clicks.

## Do we use Ruffle?

**Yes — optionally.**

| Situation | What loads | How you walk / emote |
|-----------|------------|----------------------|
| **Whirl / PNG pack** | No Ruffle | Click loft floor — PNG idle/walk; click avatar — PNG emotes |
| **Whirled2 Smooth** (`playbackMode: png-hybrid`) | Ruffle **not** in loft | Click floor — **PNG chrome walk** |
| **Classic Flash (Ruffle)** (`playbackMode: ruffle`) | **Ruffle** shows the avatar | Click floor **moves** you (bob/flip). Click **nameplate/hitbox** → emotes (bubble + EI try). Canvas does **not** eat floor clicks. |
| **SWF-only, no PNGs** | Classic Flash only until you attach frames | Smooth card disabled with CTA |
| **Stuff → Preview in Ruffle** | Ruffle CDN preview | Preview only |

---

## One-flow: upload → room

1. Stuff → Avatars → **Classic Flash / Whirled avatars** panel.  
2. Drop your **own** `.swf` (plus optional PNG idle + walk).  
3. **Analyze** → pick **Wear mode** → **Save** → **Wear & enter loft**.  
4. Walk on the floor; click nameplate/hitbox for emotes.

---

## What works in Classic Flash (Ruffle) after `?v=20260906bs`

| Action | Works? | How |
|--------|--------|-----|
| Floor click-to-walk | **Yes** | Chrome moves billboard + CSS bob/flip |
| In-SWF walk animation | **Maybe** | `WhirledAvatarHost` EI tries `appearanceChanged_*` / `setBodyState` — only if SWF registered EI callbacks |
| Click avatar → emote menu | **Yes** | Hitbox + nameplate (`pointer-events: auto`); Ruffle canvas PE-none |
| Emote visible feedback | **Yes** | Chrome bubble + brief bob; EI `triggerAction` / `setBodyState` tried |
| Smooth PNG dual Wear | **Yes** | Unchanged |

### Honest limits (AvatarControl)

- Stock Whirled SWFs speak **`controlConnect` on `loaderInfo.sharedEvents`** (not ExternalInterface).
- Without a Flash-side **host SWF**, those avatars stay on idle timeline inside Ruffle — chrome still moves them across the loft.
- We do **not** copy AGPL Grey Havens / community host code; JS EI shim + chrome interactivity only.
- Full sharedEvents host = Phase 2 (`AVATAR-IMPORT.md`).

---

## Preserve

Whirl starter, chat visit-since, pale-blue chrome, transparent Ruffle, PE-none loft canvas, dual Wear cards, earn-only, no MySpace nickname, no fake catalog.

## Related

- [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) · [QA-FLASH.md](./QA-FLASH.md) · [DEV-HUB.md](./DEV-HUB.md) · `src/classic-avatar.js`
