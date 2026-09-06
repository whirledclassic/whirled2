# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Avatar research (same wave)

- Deep dive of Grey Havens GitHub (`msoy`, `whirled-sdk`, `whirled-projects`) + community `lulzsun/whirled2` SWF/Ruffle path.
- Plan doc: [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) — deep Grey Havens research (SWF + remix ZIP + ~80×60 thumb, SHA-1 HashMediaDesc, Ruffle host shim, ENGINE-BRIDGE policy bump for Phase 2).
- Avatar lab stays **locked** (Stuff → Avatars On hold unless `?avatarLab=1`). No Ruffle/SWF in rooms.

## What shipped (?v=20260906ae)

Rooms create fidelity + mobile landscape immersion:

1. **My Rooms** — Me → My Rooms + Rooms lobby My Rooms list owned rooms from `whirled2.rooms` (Studio Loft seed kept).
2. **Create Room** — name + optional Unlocked/Friends/Locked; pay **10,000 coins** OR **1 bar** (earn-only); **first owned room free**.
3. **Multi-room persist** — catalog in localStorage; new rooms appear in lobby My Rooms + preview/enter by id.
4. **Mobile landscape immersion** — `inRoom` + phone landscape hides top chrome; stage fills viewport; Overlay chat bottom-corner + thin input; Exit / portrait restores. Optional Fullscreen API.
5. Doors / glows / snapshot thumbs — **Coming Soon** stubs (not fake catalog).

Prior **ad**: Friendly People, wall Delete, Shop ♥, Volume + mute-safe, Share/embed, lock triad.

## Live URL

- Local / Pages cache: `?v=20260906ae` (`LOGO_V` in `app.js` / `index.html`)
- Live mock (when pushed): https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906ae
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars / live membership checkout
- No fake NPCs / invented live game catalog titles
- No zero-setup social OAuth on static Pages
- Avatar SWF / Ruffle in rooms (**ON HOLD**)
- Doors graph / snapshot rasterize / glow hold (Coming Soon)
- Do not push unless instructed
