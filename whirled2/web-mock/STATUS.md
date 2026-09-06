# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906v)

- **Room music dock outside `#main`**: `#room-embed-dock` is a persistent shell host after `#main` / before `.bar`. `paint("rooms")` no longer races or collapses the Open player sheet. Expanded sheet uses CSS `position:fixed; z-index:100` while the node stays inside `#app` (never `document.body`) so Open/Close/Room music clicks keep working on phones. Document capture backup for embed controls. `#room-playlist-panel` mounts on `#app` via `ensurePlaylistPanel()` so it does not flash-unmount on every control tap.
- Prior **?v=20260906u**: park/reattach attempt (superseded — body reparent broke clicks).
- Prior **?v=20260906t**: room music embeds (mobile) + Profile look custom BG + Facebook Connect.
- Prior **?v=20260906s**: Facebook Connect first land.
- Prior **?v=20260906r**: mobile Room **♪ Music** + Room menu again.
- Prior **?v=20260906q**: mobile visual overhaul.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906v
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars
- No fake NPCs / catalog
- No server-side Facebook secrets (Pages is client-only)
