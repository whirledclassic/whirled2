# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Avatar research (same wave)

- Deep dive of Grey Havens GitHub (`msoy`, `whirled-sdk`, `whirled-projects`) + community `lulzsun/whirled2` SWF/Ruffle path.
- Plan doc: [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) — deep Grey Havens research (SWF + remix ZIP + ~80×60 thumb, SHA-1 HashMediaDesc, Ruffle host shim, ENGINE-BRIDGE policy bump for Phase 2).
- Avatar lab stays **locked** (Stuff → Avatars On hold unless `?avatarLab=1`). No Ruffle/SWF in rooms.

## What shipped (?v=20260906af)

**Local Discord OAuth** on the demo Node server (chrome-only; never touches `#stage-slot`):

1. Env: `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET` (process.env and/or `/home/box/.config/whirled2/discord.env` / `server/.env.local`).
2. Routes: `/api/auth/discord/status`, `/api/auth/discord`, `/api/auth/discord/callback` → `/?discord_token=…`.
3. Gate: **Continue with Discord** when demo API + OAuth enabled; else Coming Soon.
4. Account: shows Discord **Linked** when `discordId` / `discord: true` on `/api/me`.
5. Helper: `server/start-local.sh`. See `SOCIAL-LOGIN.md`.

Prior **ae**: Rooms create fidelity + mobile landscape immersion (My Rooms, Create Room, multi-room persist, landscape immersion).

Prior **ad**: Friendly People, wall Delete, Shop ♥, Volume + mute-safe, Share/embed, lock triad.

## Live URL

- Local / Pages cache: `?v=20260906af` (`LOGO_V` in `app.js` / `index.html`)
- Live mock (when pushed): https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906af
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars / live membership checkout
- No fake NPCs / invented live game catalog titles
- No zero-setup social OAuth on static Pages (Discord needs local demo server + env)
- Avatar SWF / Ruffle in rooms (**ON HOLD**)
- Doors graph / snapshot rasterize / glow hold (Coming Soon)
- Do not push unless instructed
