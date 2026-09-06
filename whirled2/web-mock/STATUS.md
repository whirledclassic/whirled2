# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906q)

- **Mobile visual overhaul (iPhone)**: green stage no longer overlaps Me/Stuff/Games/Rooms tabs; `#app` column keeps topbar/bar above `#main`.
- **No giant black chat slab**: on `max-width: 900px`, Slide auto-switches to Overlay (saved via `saveChatUi`); empty `#chat-log` gets `is-empty` / `:empty` → hidden. Desktop Slide side panel unchanged.
- **Occupants**: mobile rail is a thin horizontal chip strip above the stage (~56px); legend/filter hidden.
- **Chat tabs**: compact full-width strip under stage (not floating mid-void); invite row compact.
- **Header**: smaller wallet pills; Help|Legal hidden on narrow; Club kept until very narrow.
- Prior (p): Profile look extras, owner-only room music embeds, occupant rail polish, daily reward dismiss, Coins+Bars earn-only.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906q
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars / Bling cash-out
- No fake NPCs or invented catalog
- No private engine edits
- No GitHub push this pass
