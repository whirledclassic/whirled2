# Classic Whirled avatars — without Adobe Flash

**Cache:** `?v=20260906bt`  
**Audience:** beginners + ENGINE DEV. In-site: Help → **Developers** → *Classic Whirled avatars — without Adobe Flash*. Groups → **Dev Updates** thread.

---

## Why dual modes (good idea)

Classic Flash users want the real `.swf`. Modern Whirled2 users want smooth click-to-walk on phones. One path cannot do both well today:

| Mode | What you get | When to use |
|------|----------------|-------------|
| **A — Classic Flash (Ruffle)** | Real `.swf` via Ruffle WASM (transparent stage; canvas `pointer-events: none`). Chrome moves billboard + bob/flip. Stand thumb / glyph always visible (never blank loft). Nameplate/hitbox opens emotes (chrome bubble + EI try). Badge: `Appearance: Ruffle (SWF)` | You have a SWF and want classic appearance now. |
| **B — Whirled2 Smooth (PNG hybrid)** | Idle+walk PNG/WebP chrome walk like Whirl (+ emotes). **No Ruffle** in loft. Badge: `Walking: PNG hybrid (no Ruffle)` | You have (or can attach) PNG frames. Best feel on mobile / HTTPS Pages. |

Persist choice on the Stuff item as `playbackMode: 'png-hybrid' | 'ruffle'`.  
**Default:** Smooth if **walk** PNGs exist, else Classic Flash if SWF, else Whirl.

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

## Root causes fixed (?v=20260906bt)

| Bug | Fix |
|-----|-----|
| `mountRuffle` did `innerHTML=""` wiping stand thumb | Preserve/restore stand thumb + placeholder glyph across mount |
| sha1-only Wear + silent `if (!url) return` | Resolve IDB; on miss mark `is-failed` + show thumb/glyph (never blank) |
| Thumb/preview treated as Hybrid walk | `itemHasPngWalk` requires **walk** frames only (bs, kept) |
| Wear persist dataURL blowup | Strip huge dataURLs; keep `swfSha1` + IDB; `data-swf-sha1` on host |
| Stale `isTofu` skipped Ruffle mount | SWF markers beat tofu in mount gates |
| Face flip missing on SWF | `--wear-face` on host + bob keyframes |
| Stock SWF no in-timeline walk | Honest: needs sharedEvents host (Phase 2) — chrome puppet is what you *see* |

### Grey Havens protocol (study only — do not copy AGPL)

From `greyhavens/whirled-api` `AbstractControl.as` / `ActorControl.as` / `AvatarControl.as`:

1. Avatar constructs `AvatarControl(this)` → `AbstractControl` builds `userProps` (`appearanceChanged_v2`, `stateSet_v1`, …).
2. Dispatches **`ConnectEvent` type `"controlConnect"`** (bubbles) on **`disp.root.loaderInfo.sharedEvents`**.
3. Host listener sets `event.props.hostProps = { setLocation_v1, setMoveSpeed_v1, setState_v1, getState_v1, … }`.
4. Avatar `gotHostProps` → `_funcs = hostProps`; `isConnected()` true.
5. **Walk animation inside SWF** = host calling **`userProps.appearanceChanged_v2(location, orient, moving, sleeping)`**.
6. Actions = host fires `ACTION_TRIGGERED` via userProps callbacks (`messageReceived_v1` path).

**Ruffle cannot inject `sharedEvents` from plain JS.** `window.WhirledAvatarHost` EI shim only helps SWFs that call `ExternalInterface`. Phase-2 = tiny companion host SWF (Loader + EI bridge) **only if** we can compile without copying AGPL — not feasible overnight without a toolchain; chrome puppet is the ship.

---

## Do we use Ruffle?

**Yes — optionally.**

| Situation | What loads | How you walk / emote |
|-----------|------------|----------------------|
| **Whirl / PNG pack** | No Ruffle | Click loft floor — PNG idle/walk; click avatar — PNG emotes |
| **Whirled2 Smooth** (`playbackMode: png-hybrid`) | Ruffle **not** in loft | Click floor — **PNG chrome walk** |
| **Classic Flash (Ruffle)** (`playbackMode: ruffle`) | **Ruffle** + stand thumb backup | Click floor **moves** you (bob/flip). Click **nameplate/hitbox** → emotes. Canvas PE-none. |
| **SWF-only, no PNGs** | Classic Flash; stand thumb/glyph if Ruffle slow | Smooth card disabled with CTA |
| **Stuff → Preview in Ruffle** | Ruffle CDN preview | Preview only |

---

## One-flow: upload → room

1. Stuff → Avatars → **Classic Flash / Whirled avatars** panel.  
2. Drop your **own** `.swf` (plus optional PNG idle + walk).  
3. **Analyze** → pick **Wear mode** → **Save** → **Wear & enter loft**.  
4. Walk on the floor; click nameplate/hitbox for emotes. Hard-refresh `?v=20260906bt`.

---

## What works in Classic Flash (Ruffle) after `?v=20260906bt`

| Action | Works? | How |
|--------|--------|-----|
| Floor click-to-walk | **Yes** | Chrome moves billboard + CSS bob/flip |
| Visible avatar (never blank/tofu) | **Yes** | Ruffle and/or stand thumb / initial glyph |
| In-SWF walk animation | **Maybe** | Only if SWF registered EI callbacks — stock SDK needs Phase-2 sharedEvents host |
| Click avatar → emote menu | **Yes** | Hitbox + nameplate (`pointer-events: auto`) |
| Emote visible feedback | **Yes** | Chrome bubble + brief bob; EI `triggerAction` tried |
| Smooth PNG dual Wear | **Yes** | Unchanged |
| Second SWF one-flow | **Yes** | Analyze → Classic Flash → Save → Wear & enter loft |

### Honest limits (AvatarControl)

- Stock Whirled SWFs speak **`controlConnect` on `loaderInfo.sharedEvents`** (not ExternalInterface).
- Without a Flash-side **host SWF**, those avatars often stay on idle timeline inside Ruffle — chrome still moves them + shows thumb.
- We do **not** copy AGPL Grey Havens / community host code.
- Full sharedEvents host = Phase 2.

---

## Preserve

Whirl starter, chat visit-since, pale-blue chrome, transparent Ruffle, PE-none loft canvas, dual Wear cards, earn-only, no MySpace nickname, no fake catalog.

## Related

- [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) · [QA-FLASH.md](./QA-FLASH.md) · [DEV-HUB.md](./DEV-HUB.md) · `src/classic-avatar.js`
