# Developer Information Hub

**Cache:** `?v=20260906au` (`LOGO_V`)  
**In-site:** Help → **Developers**, header **Developers**, `#dev` / `#docs`, or `?page=dev`.

Pale-blue classic chrome index for newbies and engine hires. Coins/Bars earn-only; never invent shop catalog; say **Profile look**; engine mounts only in `#stage-slot`.

---

## Using old Whirled / Flash avatars (first-class)

Classic Flash/SWF avatars stay a **first-class path** alongside modern PNG packs.

| Doc | What |
|-----|------|
| [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) | Legacy Whirled SWF → Stuff / wardrobe |
| [AVATAR-CREATOR-GUIDE.md](./AVATAR-CREATOR-GUIDE.md) | Flash/Animate → Publish SWF **or** PNG sequences for Wear |
| [FLA-TEST-AVATAR.md](./FLA-TEST-AVATAR.md) | FLA lab notes — `.fla` alone cannot play; publish SWF / export PNGs |

**Stub / in progress:** SWF upload → analyze → Ruffle preview (chrome lab, `?avatarLab=1`). Lab Wear / Ruffle stay on chrome layers — **do not** force Flash into `#stage-slot`. Pixi owns the stage mount; SWF path is parallel.

In-site: open the hub card **Using old Whirled / Flash avatars**, or Stuff → **How to make an avatar**.

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

Stuff → Avatars → wizard (PNG/WebP, folders, zip, .aseprite). Wear → floor walk / avatar emotes. Cyan Hair is the reference pack.

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

Bump `LOGO_V` in `app.js` + matching `?v=` on `index.html`. See [STATUS.md](./STATUS.md). **This build:** `?v=20260906au`.

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


### Classic Flash module (?v=20260906aw)

`src/classic-avatar.js` — Stuff upload/analyze/Ruffle Experimental. See AVATAR-IMPORT.md Phase 1.5.
