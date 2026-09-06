# Developer Information Hub

**Cache:** `?v=20260906bb` (`LOGO_V`)  
**In-site:** Help → **Developers**, header **Developers**, `#dev` / `#docs`, or `?page=dev`.

Pale-blue classic chrome index for newbies and engine hires. Coins/Bars earn-only; never invent shop catalog; say **Profile look**; engine mounts only in `#stage-slot`.

---

## Classic Whirled avatars — without Adobe Flash

> **Currently: Ruffle = YES (optional path). Default smooth room movement = PNG hybrid (Ruffle not required).**

Browsers can’t run Flash Player; we never require it. **Hybrid (smooth)** = PNG/WebP idle+walk for loft click-to-walk. **Ruffle** (WASM, CDN) is optional for real `.swf` preview / SWF-only Wear. Whirl-only users never load Ruffle.

Full note: [HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md](./HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md).

| Doc | What |
|-----|------|
| [HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md](./HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md) | Plain-English: Hybrid + optional Ruffle |
| [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) | Legacy Whirled SWF → Stuff / wardrobe |
| [AVATAR-CREATOR-GUIDE.md](./AVATAR-CREATOR-GUIDE.md) | Flash/Animate → Publish SWF **or** PNG sequences for Wear |
| [FLA-TEST-AVATAR.md](./FLA-TEST-AVATAR.md) | FLA lab notes — `.fla` alone cannot play; publish SWF / export PNGs |
| [QA-FLASH.md](./QA-FLASH.md) | Overnight Flash / loft checklist |

Wear / Ruffle stay on chrome layers — **do not** force Flash into `#stage-slot`. In-site: Developers hub card + Groups → **Dev Updates**.

---

## How the chrome works

One IIFE in `app.js`: gate → `shell()` → `paint(tab)` fills `#main`. State in `localStorage` `whirled2.*`. See [DEV-NOTES.md](./DEV-NOTES.md).

**ENGINE DEV:** Do not rewrite chrome into Pixi. Consume `window.WhirledChrome`.

---

## ENGINE-BRIDGE / mounting Pixi

`host = WhirledChrome.getStageEl()` → `#stage-slot`. `host.replaceChildren(app.canvas)`. Wear / decorate / bubbles are chrome siblings until Pixi owns them.

Full runbook: [ENGINE-BRIDGE.md](./ENGINE-BRIDGE.md).

---

## Avatar packs + upload wizard (PNG path)

Stuff → Avatars → wizard (PNG/WebP, folders, zip, .aseprite). Wear → floor walk / avatar emotes. Whirl is the reference pack.

- [AVATAR-CREATOR-GUIDE.md](./AVATAR-CREATOR-GUIDE.md)
- [STUFF-AVATARS.md](./STUFF-AVATARS.md)
- [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) (also Flash/legacy)

---

## Auth / Discord / hybrid login

Username/password primary (hybrid API → offline). Discord needs `server/server.mjs` secrets — never in the client. [SOCIAL-LOGIN.md](./SOCIAL-LOGIN.md).

---

## Rooms, chat, music

Lobby → preview → Enter. Chat bar + Overlay/Slide. Room music YouTube/Spotify; shared sync needs demo server. Make Door links decorate chips. [ROOMS-FIDELITY.md](./ROOMS-FIDELITY.md).

---

## Cache-bust / STATUS

Bump `LOGO_V` in `app.js` + matching `?v=` on `index.html`. See [STATUS.md](./STATUS.md). **This build:** `?v=20260906bb` — Hybrid Flash loft + pale-blue room chrome (see `QA-FLASH.md`).

---

## FLA / SWF lab

Cross-link: [Using old Whirled / Flash avatars](#using-old-whirled--flash-avatars-first-class). [FLA-TEST-AVATAR.md](./FLA-TEST-AVATAR.md).

---

## Code map

| File | Role |
|------|------|
| `app.js` | boot, gate/auth, paint/routes, loft/stage, avatar wear/walk/emote, Stuff wizard, chat, rooms, Profile look, WhirledChrome |
| `src/api.js` | WhirledApi hybrid login, chat, room music, Discord helpers |
| `src/styles.css` | pale-blue classic; `#stage-slot` / `#avatar-wear-layer` |
| `server/server.mjs` | optional demo API |
| `index.html` | cache-bust + `WHIRLED_API` on Pages |


### Classic Flash module (?v=20260906bb)

`src/classic-avatar.js` — one-flow upload → Analyze → Wear & enter loft; Hybrid PNG walk; optional Ruffle; SWF bob walk. See HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md / QA-FLASH.md.


## Admin bootstrap (?v=20260906ba)

Local admins live in `whirled2.roles` + `whirled2.admins`.

1. **Automatic:** first registered user id (`whirled2.firstUserId`), or display name / id `Test` / `admin`.
2. **Secret once:** in the browser console on Pages/local:
   `localStorage.setItem("whirled2.forceAdmin","1"); location.reload()`
   Then open **Me → Admin** (or header **Admin**) and promote others; you can remove the force flag after.
3. Admins manage the seeded **Whirled2 Developers** group.

## /broadcast (earn-only coins)

Classic wiki used **Bars** (start ~5, inflate; Club Whirled fixed 10k coins). Whirled2 charges **coins**: base **50**, then ×**1.5** per broadcast the same local day (`whirled2.broadcastState`). Usage: `/broadcast hello`.

## Classic avatars without Flash

See `HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md` and Groups → Whirled2 Developers → **Flash / avatars**.
