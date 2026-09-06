# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906l)

- **Profile skins (fixed)**: MySpace-like Customize look — presets **publish immediately**; BG fills entire `.page.profile-page` via `applyProfileSkinDom` (CSS vars + `el.style`, not HTML-escaped data-URLs). Schema adds `bgRepeat` / `bgAttachment` / `textColor` / `linkColor` / translucent `panelAlpha` (~0.82). Live preview while form open; Clear keeps an empty option. Visitors see otherProfile skins. **No profile music**. ENGINE DEV: profile chrome ≠ `#stage-slot`.
- Prior: room lock enforcement, ENGINE-BRIDGE runbook, stage bubbles, passport, mail Reply/Delete, Join them!, Add Friend modal, visit-scoped chat.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906l
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase / live Club checkout
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- No profile music (use room playlist)
- Shared multi-browser room chat / cross-browser lock still needs the Node API (Pages is localStorage-only)
