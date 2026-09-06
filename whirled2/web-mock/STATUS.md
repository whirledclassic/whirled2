# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906u)

- **Room music player stickiness**: `paint("rooms")` no longer destroys the expanded Open player sheet. Live `#room-embed-dock` is parked/reattached (iframe preserved); `roomEmbedExpanded` re-applies `is-expanded` + Close player after every paint/sync. Expanded sheet z-index 100 (above chat bar). Room music side panel stays open except Close / leave / clearStrayUI.
- Prior **?v=20260906t**: room music embeds (mobile) + Profile look custom BG + Facebook Connect.
- Prior **?v=20260906s**: Facebook Connect first land.
- Prior **?v=20260906r**: mobile Room **♪ Music** + Room menu again.
- Prior **?v=20260906q**: mobile visual overhaul.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906u
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars
- No fake NPCs / catalog
- No server-side Facebook secrets (Pages is client-only)
