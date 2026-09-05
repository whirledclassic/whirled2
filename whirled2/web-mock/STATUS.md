# Whirled Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- Mobile chrome: stacked header, horizontal scroll tabs, capped logo (fixes iPhone full-bleed logo), room-first layout, chat bar only on Rooms, touch-sized controls.

- Header + login gate use `assets/whirled-classic-logo.png` (user mark). `assets/logo.svg` remains onerror fallback only.
- Classic pale-blue chrome kept/confirmed: pale header, tabs Me / Stuff / Games / Rooms / Groups / Shop, dark occupant rail, full-bleed `#stage-slot`, black bottom send bar. Gold coin-pill tint removed (coins stay labels, blue text).
- Login + loft chat survive browser tab switches via `visibilitychange` / `pageshow` (bfcache) restore and `storage` cross-tab sync. Session and offline chat remain in `localStorage` (`whirled2.session`, `whirled2.chat.loft`).
- Broken `esc()` HTML entity map repaired.
- Fixed `app.js` template string quoting (`id="stage-slot"` / `class="grid"` inside double-quoted JS) that left the live page stuck on “Loading chrome…”.
- Logo compressed (~166KB). Pages root `index.html` redirects to web-mock.
- `window.WhirledChrome` unchanged in role (`getStageEl`, `getSession`, `getRoom`, chat hooks). Engine still draws only in `#stage-slot`.

## Live URL

GitHub Pages enabled from `main` `/` (same repo).

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/
- Site root (redirects to mock): https://whirledclassic.github.io/whirled2/
- Logo asset compressed (~166KB PNG, transparent black keyed)

Shared auth/chat across browsers still needs `node server/server.mjs` (or a host). Static Pages alone = localStorage-per-browser offline mode.

## Nabir — next step (Pixi in `#stage-slot`)

In private `WhirledClassicGame`, stop `resizeTo: window` / `#pixi-container` full page. Export `mountWhirledEngine(host)` that `resizeTo: host` and appends the canvas into `host`. Then:

```js
const chrome = window.WhirledChrome
if (chrome && chrome.getStageEl) mountWhirledEngine(chrome.getStageEl())
else document.addEventListener("whirled:ready", (ev) => {
  mountWhirledEngine(ev.detail.getStageEl())
})
```

Do not implement login in Pixi. Read `WhirledChrome.getSession().user.name` for nametags when walkers land. Full contract: `ENGINE-BRIDGE.md`.

## Out of scope (stopped)

- No payments
- No WhirledClassicGame edits
- No whirled.club player data
- No new framework
- No host purchase / Pages toggle without ask
