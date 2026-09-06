# ENGINE-BRIDGE — brief for Nabir (Pixi / room engine)

Hi. You own **room + avatars + walk** in the private **WhirledClassicGame** Pixi repo.  
This public **web-mock** folder is only the **website chrome** (login, tabs, Stuff/Wear inventory, chat, pale-blue shell).

One site, classic whirled.club feel: chrome around the middle, **your Pixi stage in the center** (`#stage-slot`). Not an “iframe game product” — just mount into the stage slot.

Cache stamp for this chrome: **`?v=20260906cp`**. Bridge API version: **`0.7`**.

---

## What changed (?v=20260906cp) — stream rooms into the engine

Chrome no longer flashes the homemade loft (“another room”) before Pixi owns the stage.

1. `paint()` **parks** a live `#stage-slot` canvas off-DOM, rebuilds chrome, then **puts the same canvas back** (`src/room-stream.js`).
2. Door / preview / Visit travel fires **`whirled:roomChanged`** `{ id, name, items }`.
3. Enter curtain is a short stream fade when the engine is already mounted (not a second-room load).
4. Remount only if the canvas is actually gone.

Engine work: handle `whirled:roomChanged` / `window.__whirledEngine.applyRoom` — do not remount per room.

---

## What changed (?v=20260906co) — Wear sync push + pull

Chrome **pushes** Wear into a mounted engine (and you still **pull** on boot):

1. After every successful `saveWornAvatar` (Wear / unequip / clear), chrome dispatches  
   `document` **`whirled:wearChanged`** with `detail` = worn row (**absolute PNG URLs**) or `null`.
2. Same moment chrome calls any registered hook:  
   `WhirledChrome.registerEngineHooks({ applyAppearance, applyRoomItems, onReady })`  
   and/or `window.__whirledEngine.applyAppearance?.(worn)`.
3. Right after a successful `tryMountEngine` / mount, chrome fires **`whirled:wearChanged`** once more so late listeners get the current Wear.
4. **`getWornAvatar()`** returns frame/thumb/preview URLs resolved against the **chrome page** (`location.href`) so tunnel Pixi can `Assets.load` cross-origin Pages PNGs (GitHub Pages sends `Access-Control-Allow-Origin: *`).
5. **Room items:** `getRoomItems()` returns real decorate-chip layout from `whirled2.roomLayout.*` (no invented catalog). Saves fire **`whirled:roomItemsChanged`**. Chrome still draws `#decorate-layer` — Pixi furniture is optional until you port it.

Local tunnel proof (not your GitHub): engine `applyAppearance` loads Wear PNG idle/walk into AnimatedSprite; bunny stays fallback for empty / SWF-only Wear.

---

## What changed earlier (?v=20260906cn)

- Homemade loft **tofu / PNG click-to-walk is no longer the default playable room engine**.
- Without `engineSrc`, the loft shows a soft placeholder: *Pixi engine mounts here*.
- When `mountWhirledEngine` succeeds, chrome **does not** animate loft avatars.
- Classic Flash / Ruffle stays **experimental / opt-in**. Never put Ruffle in `#stage-slot`.

**You own avatars now.** Chrome keeps Wear inventory data; you draw sprites in Pixi.

---

## Do not

- Do **not** publish / copy the private engine into this public Pages tree.
- Do **not** rebuild login / register / tabs / shop in Pixi.
- Do **not** edit this chrome repo into your engine repo (or the reverse) without asking.
- Do **not** dump AGPL community code — cite / reimplement only (Grey Havens notes elsewhere).

---

## How to mount (checklist)

1. Run chrome (`web-mock/index.html` or Pages).
2. Run your Vite engine with CORS so the chrome page can `import()` it.
3. Open chrome with  
   `?engineSrc=https://YOUR-TUNNEL/src/chrome-bridge.js`  
   (or `localStorage.whirled2.engineSrc`, or `window.WHIRLED_ENGINE_SRC`).
4. Export **`mountWhirledEngine(host)`** from that module.
5. Inside mount:
   - `resizeTo: host` (not `window`)
   - `host.replaceChildren(app.canvas)` — canvas **only** in `#stage-slot`
   - set `data-whirled-engine="1"` and `data-engine-owns-avatar-walk="1"`
6. **Wear sync (required for avatar look):**
   - On mount: `const worn = WhirledChrome.getWornAvatar()` → build sprites from `states.idle` / `states.walk` PNG frames.
   - `WhirledChrome.registerEngineHooks({ applyAppearance })` **and/or** listen to `whirled:wearChanged`.
   - Resolve relative `./assets/...` against **chrome** origin (page URL), not the Vite origin.
7. Prefer **pointer events on your canvas** for walk. Optional: `whirled:floorClick` / `onFloorClick`.
8. **Room stream:** listen `whirled:roomChanged` and swap the room in the same Pixi app. Do not remount.

---

## Sketch

```js
export async function mountWhirledEngine(host) {
  const app = new Application()
  await app.init({ background: "#2b333e", resizeTo: host, autoDensity: true })
  host.replaceChildren(app.canvas)
  host.setAttribute("data-whirled-engine", "1")
  host.setAttribute("data-engine-owns-avatar-walk", "1")

  function applyAppearance(worn) {
    // Load worn?.states?.idle?.frames / walk into AnimatedSprite.
    // If no PNG frames (SWF-only / empty), keep your fallback sprite.
  }
  function applyRoom(room) {
    // room = { id, name, items } — same canvas, new room. Do not remount.
  }

  const chrome = window.WhirledChrome
  chrome?.registerEngineHooks?.({ applyAppearance })
  window.__whirledEngine = window.__whirledEngine || {}
  window.__whirledEngine.applyAppearance = applyAppearance
  window.__whirledEngine.applyRoom = applyRoom
  applyAppearance(chrome?.getWornAvatar?.() || null)
  document.addEventListener("whirled:wearChanged", (ev) => applyAppearance(ev.detail))
  document.addEventListener("whirled:roomChanged", (ev) => applyRoom(ev.detail))

  return app
}
```

Chrome also auto-calls `tryMountEngine()` after `exposeBridge()` when `engineSrc` is set.

---

## `window.WhirledChrome` (v0.7) — what you need

| Member | Role |
|--------|------|
| `version` | `"0.7"` |
| `getStageEl()` | `#stage-slot` — your only draw host |
| `tryMountEngine()` | Chrome loads `engineSrc` and calls `mountWhirledEngine` |
| `isEngineMounted()` | True after successful mount / stage marks |
| `getEngineSrc()` | Resolved engine URL |
| `getSession()` | Logged-in user |
| `getRoom()` | `{ id, name }` |
| `onChat(fn)` / `sendChat(text)` | Chat |
| `onOccupants(fn)` | Occupant list |
| `getWallet()` | Read-only coins/bars |
| **`getWornAvatar()`** | **Stuff Wear row** with **absolute** `states` frame URLs |
| **`getWardrobeAppearance()`** | `{ worn, wardrobe, activeId }` |
| **`registerEngineHooks({ applyAppearance, applyRoomItems, onReady })`** | Push sync from chrome |
| **`getRoomItems(roomId?)`** | `{ roomId, items }` real decorate chips — no fake catalog |
| `getAvatarWalkTarget()` | Last floor target `{ xPct, yPct, at }` |
| **`onFloorClick(fn)`** | Chrome-forwarded floor clicks (also `whirled:floorClick`) |
| `engineOwnsAvatarWalk()` | `true` when chrome yielded loft avatar animation |

Events:

- `whirled:ready` — bridge object in `detail`
- **`whirled:wearChanged`** — worn row or `null`
- **`whirled:roomItemsChanged`** — `{ roomId, items }`
- **`whirled:roomChanged`** — `{ id, name, items }` (same canvas, new room)
- `whirled:floorClick` — `{ xPct, yPct, clientX, clientY, source }`

---

## Wear → Pixi (your remaining work in the real repo)

Local tunnel proof already demos `applyAppearance`. **Port it into WhirledClassicGame yourself** — we never push to your GitHub.

1. On mount / `whirled:wearChanged`, call `getWornAvatar()` or use event `detail`.
2. `Assets.load` each PNG in `states.idle` / `states.walk` (chrome-absolute URLs).
3. Click-to-walk on the canvas (stage-local coords). Optional: `onFloorClick`.
4. SWF-only Wear: keep fallback sprite (no Ruffle in `#stage-slot`).
5. Furniture: optional — chrome chips remain until you mirror `getRoomItems()`.
6. Room travel: `whirled:roomChanged` — swap room in place, never remount.

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

---

## Quick checklist

- [ ] `WhirledChrome.version === "0.7"`.
- [ ] Room travel does **not** remount; listen `whirled:roomChanged`.
- [ ] `getWornAvatar()` returns https absolute frame URLs on Pages.
- [ ] Listen `whirled:wearChanged` **or** `registerEngineHooks({ applyAppearance })`.
- [ ] Re-Wear updates sprite without full remount.
- [ ] Bunny/fallback when no PNG Wear.
- [ ] No private engine files in the public tree.

Welcome — chrome is the shell; **you are the room**.
