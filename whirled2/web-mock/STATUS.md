# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906f)

- **Mobile chat readable**: `#chat-overlay` moved out of scrolling `#main` / stage onto `#app` (sibling of the send bar). iOS was clipping fixed bubbles into a thin black line under the stage. Soft glass hood above send; under-stage `#chat-log` stays hidden on phones; empty stays hidden.
- Prior: 20260906e hood attempt, 20260906a–d (chat-send, notice bar, themes, playlist, Legal, logo, beginner comments).

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906f
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase / live Club checkout
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- No shared multi-browser playlist sync yet (localStorage only on Pages)
