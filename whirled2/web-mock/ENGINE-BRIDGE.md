# How the engine goes into this page

Two repos stay separate until we decide to merge:

| Repo | Job |
|---|---|
| `whirledclassic/whirled2` to `whirled2/web-mock/` | Website chrome: tabs, login, profile, chat |
| `whirledclassic/WhirledClassicGame` (private) | PixiJS room: scene, player sprite, later walk |

Do **not** vendor the engine into this folder yet. Do **not** copy this website into the private repo yet.

## What the engine looks like today (2026-09-05)

Private repo is a Vite + PixiJS 8 scaffold:

- `src/main.js` creates `Application`, `resizeTo: window`, appends canvas to `#pixi-container`
- `src/engine/scene.js` + `src/engine/object.js` load / render / unload hooks
- `src/game/scenes/demo_scene.js` adds a `Player`
- `src/game/objects/player.js` loads `/assets/bunny.png` and spins it

That is a **full-page Pixi demo**, not a room inside a website. Fine for engine work. Wrong shape for the live page.

## Target shape

The website owns the window. The engine owns one rectangle.

```
header tabs
left occupants |  #stage-slot  <- Pixi canvas only here  | profile + feed
               |  chat log
bottom chat bar
```

## Contract the page already exposes

After login the page fires `whirled:ready` and sets:

```js
window.WhirledChrome = {
  version: "0.3",
  getStageEl(),
  getSession(),
  getRoom(),
  onChat(fn),
  sendChat(text),
  onOccupants(fn)
}
```

Engine code should not draw outside `getStageEl()`.

## What to change in WhirledClassicGame (later, in that repo)

Keep working in the private repo. When you are ready to sit inside the page, change `src/main.js` to something like:

```js
import { Application } from "pixi.js"
import { DemoScene } from "./game/scenes/demo_scene.js"

export async function mountWhirledEngine(host) {
  const app = new Application()
  await app.init({
    background: "#2b333e",
    resizeTo: host,
    autoDensity: true
  })
  host.replaceChildren(app.canvas)
  new DemoScene(app)
  return app
}

const ready = window.WhirledChrome || null
if (ready && ready.getStageEl) {
  mountWhirledEngine(ready.getStageEl())
} else {
  document.addEventListener("whirled:ready", (ev) => {
    mountWhirledEngine(ev.detail.getStageEl())
  })
}
```

Also:

1. Stop assuming `#pixi-container` is the whole page.
2. Do not `resizeTo: window` once you are inside chrome.
3. Click-to-walk should use stage local coordinates.
4. When a walker is ready, read `WhirledChrome.getSession().user.name` for the nametag.
5. Do not implement login inside Pixi. The page already does it.

## How we will wire them without merging repos

1. Local two-dev-servers. Website on :8787, engine Vite on :5173.
2. Iframe. Page puts an iframe inside `#stage-slot`.
3. Published engine bundle. Engine `vite build` writes engine.js. Website copies the built files on demo day.

Pick 1 while he iterates. Pick 3 for the first public prototype.

## First live demo

Ship the website with login + chat even if the stage still says Engine mounts here.
Walking avatars land when the engine exports `mountWhirledEngine`.
