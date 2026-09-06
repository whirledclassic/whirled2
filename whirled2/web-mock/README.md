# Whirled 2 — page chrome (no engine)

This package is the **website around the room**.

It is not the walker. It is not Pixi. It is not whirled.club.
It is not the private `WhirledClassicGame` repo.

## For the engine developer

You are hiring into / working on the **private Pixi repo**. Start here:

1. Read **[ENGINE-BRIDGE.md](./ENGINE-BRIDGE.md)** — full runbook (two-repo model, local chrome, Vite standalone, `mountWhirledEngine(host)`, `WhirledChrome` API, wiring options, do-nots, checklist, z-index, chat bubbles).
2. Comment conventions in this chrome:
   - `// How this works:` — beginner-friendly notes for anyone reading the mock
   - `// ENGINE DEV:` — bridge contract notes aimed at you (Pixi / stage mount)

Do not merge repos yet. Mount only into `#stage-slot` via `window.WhirledChrome.getStageEl()`.

---

Open `index.html` in a browser for an offline preview (accounts stay in this browser).

For a shared live demo (register / login / chat across machines):

From `whirled2/web-mock`, run `node server/server.mjs` and open `http://127.0.0.1:8787/`.

Needs Node 18+. No package install required for the chrome server.

## What works in this demo

- Register / log in / log out
- Editable profile (name + bio)
- Room chrome: Me, Stuff, Games, Rooms, Groups, Shop
- Studio Loft chat (localStorage offline, JSON file when the server is up)
- Temporary stage speech/thought bubbles (`#stage-bubbles`) until the engine owns nametags
- `#stage-slot` + `window.WhirledChrome` for the engine developer

## What does not live here

- Pixi, click-to-walk, sprites
- whirled.club accounts, rooms, or shop packs
- Anything from the private game repo

## Map to the original client

| 2008 tab | This mock |
|---|---|
| Me | Profile, home room card |
| Stuff | Owned catalog grid |
| Games | Directory of in-room toys |
| Rooms | Occupants + empty stage + chat |
| Groups | Shared whirleds |
| Shop | Catalog tiles, coins as labels only |
| Bottom bar | Chat + Go + Me |

## Files

| File | Job |
|---|---|
| `index.html` | Shell |
| `app.js` | Tabs, gate, chat, profile, stage bubbles |
| `src/api.js` | Client: live server or localStorage fallback |
| `src/styles.css` | Pale blue classic Whirled chrome |
| `server/server.mjs` | Tiny Node demo API |
| `ENGINE-BRIDGE.md` | **Engine developer handoff / runbook** |
| `DEV-NOTES.md` | Chrome map + comment conventions |
| `NETWORKING.md` | Auth, database, host plan for both of you |

Keep edits in **this** public repo (`whirledclassic/whirled2`). Do not copy this folder into `WhirledClassicGame` yet.
