# Classic Whirled avatars — without Adobe Flash

**Cache:** `?v=20260906cd`  
**Audience:** beginners + ENGINE DEV. In-site: Help → **Developers** → *Classic Whirled avatars — without Adobe Flash*. Groups → **Dev Updates** thread.

---

## Why dual modes (good idea)

Classic Flash users want the real `.swf`. Modern Whirled2 users want smooth click-to-walk on phones. One path cannot do both well today:

| Mode | What you get | When to use |
|------|----------------|-------------|
| **A — Classic Flash (Ruffle)** | Nested **companion host SWF** + your avatar via `hostLoadUrl`. Floor click → `hostWalk` → in-SWF `appearanceChanged_v2` walk scenes (plus chrome bob). Click avatar → `hostEmote`. Stand thumb backup. Badge: `Appearance: Ruffle (SWF)` | You have a SWF and want classic walk/emote feel. |
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

## Root causes fixed (?v=20260906by / bt)

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

**Ruffle cannot inject `sharedEvents` from plain JS.** That is why we ship a tiny **companion host SWF** (Haxe→SWF) that Loader-loads the avatar and completes `controlConnect`. `window.WhirledAvatarHost` remains as EI fallback; chrome puppet still bobs the billboard.

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
4. Walk on the floor; click nameplate/hitbox for emotes. Hard-refresh `?v=20260906cd`.

---

## What works in Classic Flash (Ruffle) after `?v=20260906by`

| Action | Works? | How |
|--------|--------|-----|
| Floor click-to-walk | **Yes** | Chrome bob **+** companion `hostWalk` → `appearanceChanged_v2` |
| Visible avatar (never blank/tofu) | **Yes** | Host Ruffle and/or stand thumb / glyph |
| In-SWF walk animation | **Yes (stock SDK)** | Nested host sharedEvents bridge (`avatar-host.swf`) |
| Click avatar → emote menu | **Yes** | Hitbox + nameplate; `hostEmote` / ACTION_TRIGGERED |
| Emote visible feedback | **Yes** | Chrome bubble + hostEmote + brief bob |
| Smooth PNG dual Wear | **Yes** | Unchanged |
| Second SWF one-flow | **Yes** | Analyze → Classic Flash → Save → Wear & enter loft |

### Architecture (?v=20260906by)

- Stock Whirled SWFs speak **`controlConnect` on `loaderInfo.sharedEvents`** (not ExternalInterface).
- **Companion host** (`tools/avatar-host/AvatarHost.hx` → `assets/avatar-host/avatar-host.swf`) is ORIGINAL MIT — protocol studied from Grey Havens, **not** AGPL copy-paste.
- Nested: outer Ruffle = host; `hostLoadUrl(avatar)`; JS `hostWalk` / `hostEmote`.
- Fallback if host fails: direct avatar Ruffle + chrome puppet (bt).

---

## Preserve

Whirl starter, chat visit-since, pale-blue chrome, transparent Ruffle, PE-none loft canvas, dual Wear cards, earn-only, no MySpace nickname, no fake catalog.

## Related

- [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) · [QA-FLASH.md](./QA-FLASH.md) · [DEV-HUB.md](./DEV-HUB.md) · `src/classic-avatar.js`


## bx note — nested loadBytes

Stock Wear from IDB uses companion `hostLoadBytes(base64)` → `Loader.loadBytes` (not nested blob URLs). See `FLASH-SYNC-RESEARCH.md`.


## How Ruffle is integrated (?v=20260906cd)

See **[RUFFLE-INTEGRATION.md](./RUFFLE-INTEGRATION.md)** for the full research summary (Using-Ruffle wiki + js-docs).

| Step | What Whirled2 does |
|------|--------------------|
| Self-host | `assets/ruffle/` (ruffle.js + `.wasm`) same-origin on Pages |
| `publicPath` | Absolute directory URL from `location` (`getRufflePublicPath`) so wasm resolves |
| Config | `polyfills: false`, transparent stage, autoplay on, no splash |
| Create | `RufflePlayer.newest().createPlayer()` → append to chrome host |
| Load | **`player.ruffle().load(...)`** (fallback `player.load`) |
| IDB SWF | `resolveSwfBytes` → `{ data: ArrayBuffer, swfFileName: "avatar.swf" }` |
| EI | `player.ruffle().callExternalInterface` for host callbacks |
| Opt-in | `playbackMode: "ruffle"` + `classicFlashOptIn` — Smooth stays PNG hybrid |
| Loft | **DIRECT-stable** Wear (no companion auto remount blank loft) |

Opt-in Classic Flash Wear mounts in `#avatar-ruffle-host` only — never `#stage-slot` (Pixi owns the room). Never MySpace. Never AGPL copy.
