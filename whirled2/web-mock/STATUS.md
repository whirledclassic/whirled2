# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906w)

- **Room music paste-URL fix**: `ensurePlaylistPanel()` no longer `replaceChild`s the panel on every `paint()` — only when `playlistPanelDirty` (source/embed/mute/queue) or first open. Never rebuilds while an input/textarea/select inside the panel is focused (keyboard + paste survive). Embed fields are `type="text"` + `inputmode="url"` (large touch target). Opening Room music collapses the Open player sheet and focuses the paste field. Panel z-index ~110 above expanded dock (z=100). Clearer owner paste steps.
- Prior **?v=20260906v**: room music dock outside `#main` (Open/Close survive paint).
- Prior **?v=20260906u**: park/reattach attempt (superseded — body reparent broke clicks).
- Prior **?v=20260906t**: room music embeds (mobile) + Profile look custom BG + Facebook Connect.
- Prior **?v=20260906s**: Facebook Connect first land.
- Prior **?v=20260906r**: mobile Room **♪ Music** + Room menu again.
- Prior **?v=20260906q**: mobile visual overhaul.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906w
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars
- No fake NPCs / catalog
- No server-side Facebook secrets (Pages is client-only)
