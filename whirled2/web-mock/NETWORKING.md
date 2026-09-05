# Networking, database, hosting — simple version

For Josh (website) and the engine developer. First demo is accounts + chat. Walking avatars come after.

Nothing here is copied into the private game repo.

## The split

Browser HTML chrome talks HTTP JSON to demo server (`server/server.mjs`).
The engine does not talk to the database directly. It asks the page (`window.WhirledChrome`). The page talks to `/api`.

## What the demo server already does

File: `server/server.mjs`
Data file: `server/data.json` (created on first register)

| Method | Path | Job |
|---|---|---|
| POST | `/api/register` | `{ name, password }` to `{ token, user }` |
| POST | `/api/login` | same |
| GET | `/api/me` | current profile (`Authorization: Bearer TOKEN`) |
| PATCH | `/api/me` | `{ name?, bio? }` |
| GET | `/api/rooms/:id/chat` | last messages |
| POST | `/api/rooms/:id/chat` | `{ text }` |

Passwords are scrypt + salt. Tokens are random hex. No cookies yet.

Run it:

```bash
cd whirled2/web-mock
node server/server.mjs
```

Open http://127.0.0.1:8787/ . Two browsers, two accounts, same chat.

Opening index.html as a file still works. That mode stores users in localStorage.

## Database now vs next

Now (demo): one JSON file. Fine for a handful of testers.

Next (first public prototype): SQLite with tables users, sessions, messages.

SQLite is one file, one process. When you outgrow it, move the same schema to Postgres.
Do not stand up Redis / Kafka / sockets clusters for the first demo.

## Chat networking

Today: the page polls `/api/rooms/loft/chat` every 2.5 seconds.

Next, when two people in a room need to feel instant:

1. Keep the JSON API for history.
2. Add a WebSocket at `/ws`.
3. Messages: `{ type: "chat", room, text }` and `{ type: "join", room }`.
4. Server writes the row, then broadcasts to everyone in that room.

Engine later adds `{ type: "move", x, y }` on the same socket. Same room id. Same token. Do not invent a second login.

## Hosting the first live demo

1. Tiny VPS (Hetzner, DigitalOcean, Fly.io, Render).
2. Install Node 18+.
3. Clone only whirledclassic/whirled2.
4. `node whirled2/web-mock/server/server.mjs` behind Caddy or nginx.
5. Point a domain at it.

Example Caddyfile:

```
demo.example.com {
  reverse_proxy 127.0.0.1:8787
}
```

GitHub Pages cannot run this server.

## What we will not host yet

- whirled.club Java / Flash stack
- Grey Havens msoy
- Payment / bars / bling
- The private Pixi repo as a public site

## Security baseline

- HTTPS only
- scrypt (already)
- rate-limit register and login
- never log raw passwords
- do not commit server/data.json
- keep engine and website tokens the same Bearer token

## Division of labor

| Person | Owns |
|---|---|
| Josh / website track | this folder, demo server, domain, login + chat UX |
| Engine track | Pixi scene, player, walk, later mount into `#stage-slot` |
| Both | room id loft, session shape, chat events |
