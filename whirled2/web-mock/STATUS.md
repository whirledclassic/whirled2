# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906k)

- **Profile skins** (MySpace-like): per-user `whirled2.profileSkin.{userId}` — background color/gradient/image, accent, panel opacity, optional motto. Edit on own profile (Look & background). Visitors see skins on other profiles. **No profile music** (room playlists cover audio). Profile chrome ≠ `#stage-slot`; engine ignores skins.
- **Room lock enforcement** (local mock): `whirled2.roomLock.loft = { mode, ownerId }` — unlocked / friends / locked gate `[data-enter-room]`, Join them!, Go home/recent via `canEnterLoft`. Owner always enters. Legacy string lock values migrate on load.
- Prior: ENGINE-BRIDGE runbook, stage bubbles, passport, mail Reply/Delete, Join them!, Add Friend modal, visit-scoped chat.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906k
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase / live Club checkout
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- No profile music (use room playlist)
- Shared multi-browser room chat / cross-browser lock still needs the Node API (Pages is localStorage-only)
