# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906i)

- **Passport stamps** (wiki Passport): earnable catalog (Mingle/Play/Create/Shop) via `awardAction`; progress in `whirled2.passportProg.{userId}`, stamps in `whirled2.passport.{userId}`. Go! navigates to the relevant tab. Coins stay labels only.
- **Mail Reply + Delete** on inbox rows; Reply prefills compose via `window.__mailCompose`.
- **Join them!** on Friends online + Me home friends online → enters Studio Loft.
- **Add Friend** opens Let’s be buddies! customize-message modal (same as invite-buddy), not instant add.
- Room chat visit-scoped wipe + Slide/Overlay from prior builds kept.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906i
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase / live Club checkout
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- Shared multi-browser room chat still needs the Node API (Pages is localStorage-only)
