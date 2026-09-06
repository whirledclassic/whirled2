# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906h)

- **Room chat is visit-scoped**: leaving Studio Loft / lobby / logoff / fresh page load wipes loft chat (no leftover messages from earlier sessions). Entering starts empty.
- **Clear all chat** in Chat Options (wiki wording) + `/clear` — one confirm, clears display + saved history.
- Light visual polish: soft bubble fade-in, smoother shadows/radii, chat options open animation.
- Classic Slide / Overlay layout from ?v=20260906g kept.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906h
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase / live Club checkout
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- Shared multi-browser room chat still needs the Node API (Pages is localStorage-only)
