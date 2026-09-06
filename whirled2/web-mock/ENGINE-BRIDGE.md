# ENGINE-BRIDGE — handoff for you (the Pixi / engine developer)

Hi. You own the private **WhirledClassicGame** Pixi repo. This file is your runbook for plugging that engine into the public **web-mock chrome** without merging the two repos.

Read it top to bottom once. Then use the checklist at the end on integration day.

---

## 1) Two-repo model (keep them separate)

| Repo | What it is | Your job |
|------|------------|----------|
| `whirledclassic/whirled2` → `whirled2/web-mock/` (this folder) | Website chrome: login, tabs, Me/Stuff/Games/Rooms/Groups/Shop, chat history, decorate chips, notices | Do **not** rewrite this into Pixi. Consume the bridge. |
| `whirledclassic/WhirledClassicGame` (private) | PixiJS room: scene, avatar, walk, later nametags / stage bubbles | Build and mount **only** into `#stage-slot`. |

Do **not** vendor the engine into web-mock yet. Do **not** copy this website into the private repo yet. Ask before touching files across the boundary.

---

## 2) How to run the chrome locally (this repo)

You only need static files. Pick one:

**A — Open the file**

1. Clone / pull `whirledclassic/whirled2`.
2. Open `whirled2/web-mock/index.html` in a browser (Chrome/Firefox/Safari).
3. Register a throwaway account (stays in this browser localStorage).

**B — Tiny static server (preferred if you iframe or proxy later)**

From `whirled2/web-mock` run any static server, for example:

- `python3 -m http.server 8788`
- or `npx --yes serve -l 8788`
- or `node server/server.mjs` (also starts the optional JSON chat API on port 8787)

Then open `http://127.0.0.1:8788/` (or port 8787 if using server.mjs).

Cache-bust: assets use `?v=…` (see `LOGO_V` in `app.js` / `index.html`). Hard-refresh if the page looks stale.

---

## 3) How to run your Vite Pixi engine standalone (today)

While you iterate on scenes / walk / sprites, keep the full-page demo. That is fine.

Typical private-repo shape today:

- `src/main.js` creates `Application`, `resizeTo: window`, canvas appended to `#pixi-container`
- scene / object hooks + a demo `Player`

`#pixi-container` + `resizeTo: window` is **OK while iterating**. Wrong shape for the live site, but do not block yourself on chrome mount until the scene feels good.

In your private repo:

1. Install deps with your package manager
2. Start the Vite dev server (usually `http://127.0.0.1:5173`)

---

## 4) Target mount (when you sit inside the chrome)

The website owns the window. You own **one rectangle**: `#stage-slot`.

```
header tabs
left occupants |  #stage-slot  <- your Pixi canvas ONLY here  | (profile elsewhere)
               |  chat history (Slide panel or Overlay log)
bottom chat bar (chrome)
```

Export a single entry the chrome (or an iframe loader) can call. Sketch:

```
import { Application } from "pixi.js"
import { DemoScene } from "./game/scenes/demo_scene.js"

// ENGINE DEV: mount into the chrome stage host element.
// host === window.WhirledChrome.getStageEl() === #stage-slot
// Always resizeTo: host — never window once you are inside chrome.
export async function mountWhirledEngine(host) {
  const app = new Application()
  await app.init({
    background: "#2b333e",
    resizeTo: host,
    autoDensity: true
  })
  host.replaceChildren(app.canvas) // canvas ONLY inside #stage-slot
  new DemoScene(app)
  return app
}

function boot() {
  const chrome = window.WhirledChrome
  if (chrome && chrome.getStageEl) {
    mountWhirledEngine(chrome.getStageEl())
    return
  }
  document.addEventListener("whirled:ready", (ev) => {
    mountWhirledEngine(ev.detail.getStageEl())
  }, { once: true })
}
boot()
```

Rules of thumb:

1. Stop assuming `#pixi-container` is the whole page once mounted.
2. Do **not** `resizeTo: window` inside chrome.
3. Click-to-walk uses **stage-local** coordinates (relative to the host / canvas).
4. Nametag: `WhirledChrome.getSession().user.name` when ready.
5. Do **not** rebuild login inside Pixi — chrome already has the gate.

---

## 5) Full `window.WhirledChrome` API (v0.4)

Chrome sets this after paint / login and fires `whirled:ready` with the same object as `detail`.

| Member | Type | What it does |
|--------|------|----------------|
| `version` | string | Bridge contract version. Currently `"0.4"`. |
| `getStageEl()` | fn → HTMLElement or null | Returns `#stage-slot`. Put your canvas **only** here. |
| `getSession()` | fn → session or null | Current login (`user.id`, `user.name`, …). |
| `getRoom()` | fn → `{ id, name }` | Active room stub. Mock loft: `{ id: "loft", name: "Studio Loft" }`. |
| `onChat(fn)` | subscribe | Chat messages chrome already accepted. |
| `sendChat(text)` | Promise | Send through chrome API (same path as the bottom bar). |
| `onOccupants(fn)` | subscribe | Occupant list; called immediately with current list. |
| `getChatUi()` | fn → prefs | Read `whirled2.chatUi` (`mode`, `hideHistory`, `textSize`, `bubbleDuration`). |
| `getWallet()` | fn → `{ coins, bars, streakDays }` | **Optional read-only** wallet snapshot from chrome `localStorage` (`whirled2.wallet.{userId}`). Coins & Bars are play currency (Bars earn-only); no payments. |

Message shape on `onChat` (approx.):

```
{
  id: "...",
  who: "DisplayName",
  userId: "...",
  text: "hello",
  at: "2026-09-06T...",
  system: false,
  emote: true,
  thought: true
}
```

Source of truth: `exposeBridge()` in `app.js` (big `ENGINE DEV` comment block).

---

## 6) Event `whirled:ready`

If your script loads before chrome finishes paint, `window.WhirledChrome` may be missing. Listen:

```
document.addEventListener("whirled:ready", (ev) => {
  const api = ev.detail
  mountWhirledEngine(api.getStageEl())
}, { once: true })
```

If the bridge is already there, call `mountWhirledEngine` immediately (see boot sketch above). Chrome re-dispatches on paint.

---

## 7) Wiring options (no repo merge)

### (1) Two local servers + iframe in `#stage-slot` (fastest while you iterate)

- Chrome static server on e.g. port 8788
- Engine Vite on port 5173
- Put an iframe pointing at the Vite URL **inside** `#stage-slot` (full width/height, no border)
- Inside the iframe app, still prefer `resizeTo` the iframe body / a full-size host div
- Cross-origin: use `postMessage` later if you need chat events; day one visual mount is enough

### (2) Vite proxy

- Proxy chrome assets or `/engine` so everything is same-origin
- Easier to read `window.WhirledChrome` from a non-iframe script
- Good when you want one origin without copying build output

### (3) Built `engine.js` copied into `web-mock/assets` (Pages demo)

1. In WhirledClassicGame: production build → library / IIFE bundle (e.g. `dist/engine.js`)
2. Copy into `whirled2/web-mock/assets/engine.js` (and any assets)
3. Chrome loads it after `app.js`, or you inject after `whirled:ready`
4. Call `mountWhirledEngine(WhirledChrome.getStageEl())`

Use (1) while iterating. Use (3) for the first public GitHub Pages prototype.

---

## 8) Do-not list

- **Do not** draw outside `#stage-slot` (no full-page canvas, no overlays on the tab bar).
- **Do not** rebuild login / register / profile / shop in Pixi.
- **Do not** edit the private engine from this public repo (or copy private sources here) without asking.
- **Do not** treat coins as real money — labels only.
- **Do not** bring Flash / SWF / Ruffle into this stack.
- **Do not** assume `#decorate-layer` is yours — that is chrome furniture chips (sibling overlay).
- **Do not** replace Slide/Overlay chat history — that stays chrome. Stage speech/thought bubbles near avatars may move to Pixi later (see section 11).

---

## 9) Checklist — first integration day

- [ ] Chrome opens locally; you can register and enter Studio Loft.
- [ ] `console.log(window.WhirledChrome)` after login shows `version: "0.4"`.
- [ ] `WhirledChrome.getStageEl()` returns the empty `#stage-slot` node.
- [ ] Your engine exports `mountWhirledEngine(host)`.
- [ ] Canvas appears **only** inside `#stage-slot`; tabs/chat still work.
- [ ] Resize the window — canvas tracks the host, not the whole viewport.
- [ ] `getSession().user.name` prints your logged-in name.
- [ ] Optional: `onChat` logs when you send from the bottom bar.
- [ ] Decorate chips / chat overlay still sit correctly above the canvas (see section 10).
- [ ] No login UI in Pixi.

---

## 10) Where `#decorate-layer` sits (z-index)

Inside `.stage-host` (all siblings):

| Layer | Element | Typical z-index | Notes |
|-------|---------|-----------------|--------|
| Bottom | `#stage-slot` | 1 | **Your canvas lives here.** |
| Mid | `#decorate-layer` | 2 | Chrome furniture chips; pointer-events none unless decorate mode. |
| Mid-high | `#stage-bubbles` | 4 | Temporary chrome avatar speech/thought bubbles (pointer-events none). |
| High | `#chat-overlay` | 5 | Overlay **history** (left side), not avatar nametags. |

Engine canvas stays **under** chrome overlays. Do not raise your canvas above these siblings. If you need Pixi UI later, draw it inside the canvas or coordinate a new chrome slot — do not fight these z-indexes ad hoc.

---

## 11) Chat: history vs stage bubbles

Two different systems:

1. **History (chrome, stays)** — wiki Chat modes:
   - **Slide** → dark `#chat-log` panel (sibling of `.stage-host`)
   - **Overlay** → `#chat-overlay` on the left inside `.stage-host`
   - Bottom `#chat-form` send bar is always chrome.

2. **Stage speech / thought bubbles (temporary chrome)** — `#stage-bubbles`:
   - Spawned near the bottom-center "avatar area" when someone chats.
   - Styles: speech (white + pointer), thought (cloud / `/think`), emote (italic `/me`).
   - Duration from Chat Options → Chat settings (`whirled2.chatUi.bubbleDuration`: short / medium / long).
   - Cleared when leaving the room or clearing chat.

**ENGINE DEV:** You may later replace `#stage-bubbles` with Pixi nametag bubbles above sprites. Until then, chrome owns `#stage-bubbles`. Prefer listening to `onChat` / `getChatUi().bubbleDuration` when you take over. Do not delete the chrome history system.

---

## Quick pointer map

| Need | Where |
|------|--------|
| Bridge implementation | `app.js` → `exposeBridge()` |
| Stage markup | `roomView()` in `app.js` (`.stage-host` / `#stage-slot`) |
| Styles / z-index | `src/styles.css` (`.stage-host`, `#decorate-layer`, `#stage-bubbles`) |
| Product / chrome map | `DEV-NOTES.md`, `README.md`, `STATUS.md` |
| Auth / hosting notes | `NETWORKING.md` |

Welcome aboard. Baby steps: standalone Pixi first → `mountWhirledEngine(host)` → iframe or bundle → walk + nametags.
