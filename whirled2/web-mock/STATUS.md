# Whirled Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- **Stuff upload stub** (wiki Upload / Create furniture): per-category “How do I get stuff?” + Upload… form (name, description, type=category, optional png/jpg/gif/webp thumbnail as data URL in `whirled2.stuff`, ~200KB warn, copyright checkbox). Detail: Send as Gift (mail note to friend), Edit name/desc, Delete. No invented demo items.
- **Invite Them** (wiki Friend): Me→Friends button opens share panel (copy live Pages / `location.href` link + optional mailto). No Hotmail-style email import. Occupant “Invite to be your friend” → optional message popup (default “Let’s be buddies!”) as mail note.
- **Occupant menu**: click occupant row → View Profile / Invite / Send Mail / Visit Home; self → View Profile / Edit profile. Tiny glow legend (Green door / White game / Blue player) — text meta only.
- Light mobile CSS for new panels/menus (overflow, stuff rail chips, modals).
- Cache bust `?v=20260905s`. Coins labels only. No gold/purple. No private engine. Keep `WhirledChrome` + `#stage-slot`.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905s
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase
- No fake NPCs or invented catalog / game titles
- No WhirledClassicGame / private engine edits
- No TinyMCE / no new framework
