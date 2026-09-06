# ENGINE-BRIDGE — brief for Nabir (Pixi / room engine)

Hi. You own **room + avatars + walk** in the private **WhirledClassicGame** Pixi repo.  
This public **web-mock** folder is only the **website chrome** (login, tabs, Stuff/Wear inventory, chat, pale-blue shell).

One site, classic whirled.club feel: chrome around the middle, **your Pixi stage in the center** (`#stage-slot`). Not an “iframe game product” — just mount into the stage slot.

Cache stamp for this chrome: **`?v=20260906cn`**. Bridge API version: **`0.5`**.

---

## What changed (?v=20260906cn)

- Homemade loft **tofu / PNG click-to-walk is no longer the default playable room engine**.
- Without `engineSrc`, the loft shows a soft placeholder: *Pixi engine mounts here*.
- When `mountWhirledEngine` succeeds (or `#stage-slot` has `data-engine-owns-avatar-walk="1"` / `data-whirled-engine="1"`), chrome **does not** animate loft avatars.
- Classic Flash / Ruffle stays **experimental / opt-in** (`?flashQa=1`, Stuff Classic Flash). Never put Ruffle in `#stage-slot`.
- Legacy chrome loft walk only if someone sets `?chromeWalk=1` (QA) — not the live default.

**You own avatars now.** Chrome keeps Wear inventory data; you draw sprites in Pixi.

---

## Do not

- Do **not** publish / copy the private engine into this public Pages tree.
- Do **not** rebuild login / register / tabs / shop in Pixi.
- Do **not** edit this chrome repo into your engine repo (or the reverse) without asking.
- Do **not** dump AGPL community code — cite / reimplement only (Grey Havens notes elsewhere).

---

## How to mount (checklist)

1. Run chrome (`web-mock/index.html` or a static server).
2. Run your Vite engine with CORS so the chrome page can `import()` it.
3. Open chrome with  
   `?engineSrc=http://127.0.0.1:5173/src/chrome-bridge.js`  
   (or `localStorage.whirled2.engineSrc`, or `window.WHIRLED_ENGINE_SRC`).
4. Export **`mountWhirledEngine(host)`** from that module (your repo already has this shape).
5. Inside mount:
   - `resizeTo: host` (not `window`)
   - `host.replaceChildren(app.canvas)` — canvas **only** in `#stage-slot`
   - set `data-whirled-engine="1"` and `data-engine-owns-avatar-walk="1"` on the host (chrome also marks these after a successful mount)
6. Read session / worn avatar from `window.WhirledChrome` (see below).
7. Prefer **pointer events on your canvas** for walk. Chrome may also fire `whirled:floorClick` / `onFloorClick` as a fallback.

Phone test already proved `engineSrc` mount works — keep that path.

---

## Sketch

```js
export async function mountWhirledEngine(host) {
  const app = new Application()
  await app.init({ background: "#2b333e", resizeTo: host, autoDensity: true })
  host.replaceChildren(app.canvas)
  host.setAttribute("data-whirled-engine", "1")
  host.setAttribute("data-engine-owns-avatar-walk", "1")
  // Build room + avatars + walk here. Use WhirledChrome.getWornAvatar() for Wear appearance.
  return app
}

function boot() {
  const chrome = window.WhirledChrome
  if (chrome && chrome.getStageEl) {
    chrome.tryMountEngine?.() || mountWhirledEngine(chrome.getStageEl())
    return
  }
  document.addEventListener("whirled:ready", (ev) => {
    mountWhirledEngine(ev.detail.getStageEl())
  }, { once: true })
}
boot()
```

Chrome also auto-calls `tryMountEngine()` after `exposeBridge()` when `engineSrc` is set.

---

## `window.WhirledChrome` (v0.5) — what you need

| Member | Role |
|--------|------|
| `version` | `"0.5"` |
| `getStageEl()` | `#stage-slot` — your only draw host |
| `tryMountEngine()` | Chrome loads `engineSrc` and calls `mountWhirledEngine` |
| `isEngineMounted()` | True after successful mount / stage marks |
| `getEngineSrc()` | Resolved engine URL |
| `getSession()` | Logged-in user (`user.id`, `user.name`, …) |
| `getRoom()` | `{ id, name }` for the active room |
| `onChat(fn)` / `sendChat(text)` | Chat already accepted by chrome |
| `onOccupants(fn)` | Occupant list |
| `getChatUi()` | Chat prefs |
| `getWallet()` | Read-only coins/bars (earn-only; no payments) |
| **`getWornAvatar()`** | **Stuff Wear row** — may include `states` (`idle`/`walk`/…), frames, `artFaces`, scale fields |
| **`getWardrobeAppearance()`** | `{ worn, wardrobe, activeId }` for boot |
| `getWardrobe()` / `getActiveAvatarId()` | Lab wardrobe (experimental; not Flash stage) |
| `getAvatarWalkTarget()` | Last floor target `{ xPct, yPct, at }` if chrome forwarded a click |
| **`onFloorClick(fn)`** | Subscribe to chrome-forwarded floor clicks (also event `whirled:floorClick`) |
| `isChromeWalkActive()` | `false` once you own the stage / default mode |
| `engineOwnsAvatarWalk()` | `true` when chrome has yielded loft avatar animation |
| `chromeWalkTo` | Legacy QA only — no-op when you own the stage |

Events:

- `whirled:ready` — bridge object in `detail`
- `whirled:floorClick` — `{ xPct, yPct, clientX, clientY, source }`

---

## Wear → Pixi (your remaining work)

Chrome **does not** turn Wear PNG packs into Pixi sprites for you. Remaining gap in **your** repo:

1. On mount / Wear change, call `getWornAvatar()` (or `getWardrobeAppearance()`).
2. Load `states.idle` / `states.walk` (and emotes) into Pixi textures / AnimatedSprite.
3. Implement click-to-walk on the canvas with stage-local coords.
4. Nametags / speech bubbles can move from chrome `#stage-bubbles` later — optional.

Until that pipeline exists in your repo, mount still shows your current DemoRoom / player — that is fine.

---

## Layout (one site)

```
header tabs (chrome)
left occupants |  #stage-slot  ← YOUR Pixi ONLY  | (profile elsewhere)
               |  chat history (chrome Slide / Overlay)
bottom chat bar (chrome)
```

Siblings of `#stage-slot` (chrome): `#decorate-layer`, `#avatar-wear-layer` (empty/hidden when you own avatars), `#stage-bubbles`, `#chat-overlay`.  
Do not raise your canvas above those. Do not put Ruffle in `#stage-slot`.

Music / embeds use `#room-embed-dock` outside `#main` — keep media out of the stage slot.

---

## Wiring without merging repos

1. **Local:** chrome static server + Vite `?engineSrc=…` (preferred while iterating).
2. **Same origin later:** proxy / carefully shared host — still do not commit private engine sources into public Pages.
3. Never treat a copied `engine.js` on Pages as the long-term home of the private game.

---

## Quick checklist

- [ ] Chrome opens; register / login works (do not rebuild auth).
- [ ] `WhirledChrome.version === "0.5"`.
- [ ] `getStageEl()` is `#stage-slot`.
- [ ] `mountWhirledEngine` exports and mounts with `resizeTo: host`.
- [ ] After mount, chrome loft tofu/PNG walk is gone; stage shows your canvas.
- [ ] `getWornAvatar()` returns Wear data for your sprite pipeline.
- [ ] Floor walk works from **your** canvas (optional: listen to `onFloorClick`).
- [ ] No private engine files in the public tree.

Welcome — chrome is the shell; **you are the room**.
