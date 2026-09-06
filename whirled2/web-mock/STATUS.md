# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906z)

- **Classic visual theme polish**: one pale-blue color system (`--paper` `#e8f4fb`, `--ink` `#16324a`, `--accent` `#1e6fa8`, `--muted` `#4a6a80`, `--border` `#b7d3e8`) + one `--ui` type stack across Me / Stuff / Shop / Games / Groups / Help / Legal / gate.
- **Readable long-term**: body ≥14px, inputs ≥16px on mobile, meta/help line-height ~1.45, links accent + underline on hover.
- **Page-switch flash fix**: `#main` stays on `--paper`; `applyBrowserTheme` pins `#app[data-theme=classic]` vars; `clearProfileSkinDom` runs when leaving Profile look so custom BG does not leak onto Rooms/Stuff.
- **Keep intact**: room stage dark chrome, Overlay chat, room music modal/dock from **y**, Profile look custom BG (profile only).
- Prior **?v=20260906y**: Room music background play + YouTube loop + Done CTA + ♪ chip.
- Prior **?v=20260906x**: Room music modal sheet + `canControlRoomMusic` for FB users.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906z
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars
- No fake NPCs / catalog
- No server-side Facebook secrets (Pages is client-only)
