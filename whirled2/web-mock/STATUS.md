# Whirled2 Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- **Mobile bugfix (?v=20260905z)**: no self-poke UI/handler on own profile; `addPoke` rejects same-user; poke notices are transient + dismissible (× / Clear all); strip stuck `/poked you/` leftovers on boot. Empty `#chat-overlay` hidden (`.is-empty` / `hidden`) so overlay mode no longer leaves a tall black panel over the stage; softer overlay chrome only when messages exist.
- Prior: beginner comments; Whirled2 logo/branding, Club/Membership Coming Soon, roles/badges (`test`=admin), chat Slide/Overlay, profile Edit collapse UX.
- Cache bust `?v=20260905z`. Coins labels only. No gold/purple. No fake NPCs/catalog. Keep `WhirledChrome` + `#stage-slot` + `#decorate-layer`. No private engine.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905z
- Prior: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905y
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase
- No fake NPCs or invented catalog / game titles
- No WhirledClassicGame / private engine edits
- No TinyMCE / no new framework
