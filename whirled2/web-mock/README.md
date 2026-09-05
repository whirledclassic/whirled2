# Whirled 2 — page chrome (no engine)

This package is the **website around the room**.

It is not the walker. It is not Pixi. It is not whirled.club.
It is not the private `WhirledClassicGame` repo.

Open `index.html` in a browser for an offline preview (accounts stay in this browser).

For a shared live demo (register / login / chat across machines):

```bash
cd whirled2/web-mock
node server/server.mjs
# http://127.0.0.1:8787/
```

Needs Node 18+. No `npm install`.

## What works in this demo

- Register / log in / log out
- Editable profile (name + bio)
- Room chrome: Me, Stuff, Games, Rooms, Groups, Shop
- Studio Loft chat (localStorage offline, JSON file when the server is up)
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
| `app.js` | Tabs, gate, chat, profile |
| `src/api.js` | Client: live server or localStorage fallback |
| `src/styles.css` | Pale blue classic Whirled chrome |
| `server/server.mjs` | Tiny Node demo API |
| `ENGINE-BRIDGE.md` | How the Pixi repo mounts later |
| `NETWORKING.md` | Auth, database, host plan for both of you |

Keep edits in **this** public repo (`whirledclassic/whirled2`). Do not copy this folder into `WhirledClassicGame` yet.
