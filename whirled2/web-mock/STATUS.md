# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906o1)

- **Hotfix**: Daily reward modal — Nice!, backdrop click, and Esc all dismiss. Root cause: modal on `document.body` while clicks only on `#app`, plus card `stopPropagation` ate the button click.
- Prior **?v=20260906o**: Coins + Bars, daily/weekly streaks, header wallet, Transactions filters, `WhirledChrome.getWallet()`; no Buy Bars / payments.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906o1
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars / Bling cash-out
- No fake NPCs or invented catalog
- No private engine edits
