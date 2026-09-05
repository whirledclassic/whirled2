# Whirled Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- Header + login gate use `assets/whirled-classic-logo.png` (user mark). `assets/logo.svg` remains onerror fallback only.
- Classic pale-blue chrome kept/confirmed: pale header, tabs Me / Stuff / Games / Rooms / Groups / Shop, dark occupant rail, full-bleed `#stage-slot`, black bottom send bar. Gold coin-pill tint removed (coins stay labels, blue text).
- Login + loft chat survive browser tab switches via `visibilitychange` / `pageshow` (bfcache) restore and `storage` cross-tab sync. Session and offline chat remain in `localStorage` (`whirled2.session`, `whirled2.chat.loft`).
- Broken `esc()` HTML entity map repaired.
- `window.WhirledChrome` unchanged in role (`getStageEl`, `getSession`, `getRoom`, chat hooks). Engine still draws only in `#stage-slot`.

## Live URL

**Not published yet.** Ask before enabling GitHub Pages if any setting is locked.

Intended public path once Pages is on (same repo):

- Source dir: `/whirled2/web-mock` (or copy/build that folder to `/docs` / `gh-pages`)
- Candidate URL: `https://whirledclassic.github.io/whirled2/whirled2/web-mock/`

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
