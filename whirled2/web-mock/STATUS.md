## What shipped (?v=20260906aw)

- **Classic Flash / Whirled avatars (CRITICAL path):** Stuff → Avatars → **Classic Flash / Whirled avatars** panel (`src/classic-avatar.js`).
  - Accept `.swf`, `.fla` (archive + explain), zip with swf+thumb, optional PNG idle/walk.
  - **Analyze** — size, magic header (FWS/CWS/ZWS), honest “no Flash internals in JS” + paths: Ruffle play-as-is / PNG attach / hybrid.
  - **Hybrid pack** — one Stuff item can hold `swfSha1`/`swfDataUrl`/`swfUrl` + PNG `states`.
  - **Wear** without obscure `?avatarLab=1` when user opts into Classic Flash (Experimental badge).
  - **Loft:** Ruffle on `#avatar-ruffle-host` when opted in; else PNG states; else tofu. Cyan Hair unchanged.
  - Legacy IndexedDB wardrobe lab remains On hold (`?avatarLab=1`).
- **Docs:** in-site “Using old Whirled / Flash avatars” + AVATAR-IMPORT / STUFF-AVATARS / creator guide updates.
- **Merge notes:** additive module + minimal app.js hooks — does **not** regress chat visit-since / Clear chat from **av**. Dev Hub from **au** kept.
- Cache: **`?v=20260906aw`**. Parent push script: `/tmp/push-aw.js`.

## What shipped (?v=20260906av)

- **Chat visit-scope (P0 pain fix):** Entering a room starts a **clean slate**. Demo API / localStorage cemetery (old names like qjeczg) no longer dumps into every visit.
  - Root cause: `startPoll` / `loadHistory` fetched full `/api/rooms/loft/chat` and **replaced** the log every ~2.5s.
  - Fix: `roomChatVisitSince` + `beginRoomChatVisit` on Enter/door; `pollChat(room, since)` + merge-by-id only; boot/visibility no longer rehydrate the cemetery.
  - **Clear chat** / Chat options → **Clear my view** bumps visit since so poll cannot refill. **Clear all chat** still wipes PMs too. Optional **Load earlier messages…**. Clear on leave + logout.
  - `src/api.js` `history(room, since)` + per-room offline keys.
- **Make Door / room graph:** Decorate → Make Door (create/link) → green door travel; Drop Door; per-room layouts (from at wave, merged).
- **Chat name-click menu + Room vs Private tabs** (at wave, kept).
- **SWF coexistence:** `swfUrl` / `#avatar-ruffle-host` hooks left for parallel au Ruffle lab — PNG Wear unchanged.
- Builds on **au** Dev Hub (not fought) — cache tag advanced to **`?v=20260906av`**.

## Prior (?v=20260906au)

- Developer Information Hub + Flash/SWF docs comments; avatar lab notes.

## Prior (?v=20260906ar / aq)

- Avatar upload wizard; Cyan Hair idle≠wave; click-avatar emotes; mobile chat dock.

# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Standing rules

- Coins/Bars earn-only; never invent fake catalog.
- Never say MySpace; say Profile look.
- `#stage-slot` = engine mount; Wear / chrome walk / emotes on `#avatar-wear-layer` sibling.
- No secrets in client — only `WHIRLED_API` origin.
