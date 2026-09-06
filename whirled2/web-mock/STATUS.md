# Whirled Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- **Mail**: `whirled2.mail` localStorage inbox/compose; header ✉ unread count; Me→Mail; Send Mail from profile/friends; friend-add system notes (same browser).
- **Stuff / Shop**: left category rail (Avatars…Videos + Launchers, Level Packs, Item Packs). Dark teal rail, pale-blue/white selected (no gold/orange). Empty authentic copy per category. Inventory from `loadStuff()` / `loadShop()` only — no demo catalog.
- **Friends**: online (alpha) then recent; photo, status, location, Send Mail, Visit Home, Remove.
- **Games / Groups**: classic empty shells (featured + empty lists, no fake players).
- **Me home**: People Online Now from `liveOccupants`; My Friends Online prefers friended occupants; invite banner (no Get Bars).
- **Rooms lobby**: Featured/Active Studio Loft tile with thumb, rating stub, player count; My Rooms link; Whirled Tour placeholder meta.
- Cache bust `?v=20260905o`. Logo `assets/whirled-classic-logo.png`. Coins labels only. `window.WhirledChrome` unchanged; engine only in `#stage-slot`.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905o
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase
- No fake NPCs or invented catalog items
- No WhirledClassicGame / private engine edits
- No new framework
