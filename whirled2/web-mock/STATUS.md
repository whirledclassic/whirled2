# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906x)

- **Room music modal deep fix**: `#room-playlist-panel` is a full-screen modal sheet (dim backdrop z=120 + card z=121), not a 320px side panel. Backdrop / Close / leave / `clearStrayUI` only dismiss — never focus-loss or paint remount. `canControlRoomMusic()` lets loft owner OR claimed `playlist.ownerId` OR empty ownerId (claim on first save) Set embed — fixes FB/`fb_` users blocked by `isLoftOwner()`/`FIRST_USER_KEY`. `data-playlist-set-embed` type=button + shared `applyPlaylistEmbedFromUi` (reads input value); errors in `#playlist-embed-msg`. Document capture for Set embed / Close / backdrop. Collapses Open player; modal above dock.
- Prior **?v=20260906w**: paste-URL / dirty-gate / focus-safe remount.
- Prior **?v=20260906v**: room music dock outside `#main` (Open/Close survive paint).
- Prior **?v=20260906u**: park/reattach attempt (superseded — body reparent broke clicks).
- Prior **?v=20260906t**: room music embeds (mobile) + Profile look custom BG + Facebook Connect.
- Prior **?v=20260906s**: Facebook Connect first land.
- Prior **?v=20260906r**: mobile Room **♪ Music** + Room menu again.
- Prior **?v=20260906q**: mobile visual overhaul.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906x
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars
- No fake NPCs / catalog
- No server-side Facebook secrets (Pages is client-only)
