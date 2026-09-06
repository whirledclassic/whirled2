# Whirled Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- **Roles / badges**: localStorage `whirled2.roles` (`admin` | `mod` | `player`). Helpers `getRole` / `setRole` / `roleBadgeHtml`. Admin = deeper blue pill (+ tiny Agent label); Mod = teal. Name/id `test` / `admin` always admin. First registered account (`whirled2.firstUserId` from api.js offline register) bootstrapped admin when roles empty. Badges on occupants, chat, classic-profile, friends. Account page shows Role + local promote/demote for admins. Admin/mod chat bubbles get a subtle blue/teal border accent.
- **Room chat polish** (wiki Slide vs Overlay): `whirled2.chatUi` default **overlay**. Chat options menu (slide/overlay, hide history + F9, clear, text size S/M/L). Overlay floats `#chat-overlay` over left of `.stage-host`; slide keeps dark `#chat-log` beside stage. Clickable chat names → View profile / Add friend / Send mail / Block. `/me` `/emote` italic; `/clear` clears display; soft rate-limit. Bar + bubble CSS pass.
- Cache bust `?v=20260905w`. Coins labels only. No gold/purple. No fake NPCs/catalog. Keep `WhirledChrome` + `#stage-slot` + `#decorate-layer`. No private engine.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905w
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase
- No fake NPCs or invented catalog / game titles
- No WhirledClassicGame / private engine edits
- No TinyMCE / no new framework
