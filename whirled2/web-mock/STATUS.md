# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906j)

- **ENGINE-BRIDGE.md** expanded into a full hired-engine-developer runbook (two-repo model, local chrome, Vite standalone, `mountWhirledEngine`, API table, `whirled:ready`, wiring options, do-nots, checklist, z-index, chat vs stage bubbles).
- **DEV-NOTES.md** + **README.md** top “For the engine developer” sections; comment conventions (`How this works` / `ENGINE DEV`).
- **Stage avatar bubbles** (`#stage-bubbles`): temporary speech / thought (`/think`) / emote (`/me`) over the stage; duration in Chat Options → Chat settings (`whirled2.chatUi.bubbleDuration`); cleared on leave/clear.
- **WhirledChrome v0.4** — `exposeBridge` ENGINE DEV contract comments + `getChatUi()`.
- Prior: passport stamps, mail Reply/Delete, Join them!, Add Friend modal, visit-scoped chat.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906j
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase / live Club checkout
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- Shared multi-browser room chat still needs the Node API (Pages is localStorage-only)
