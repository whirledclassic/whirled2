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
