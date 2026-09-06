# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906o1)

- **Hotfix**: Daily reward modal dismiss — modal was on `document.body` while clicks only listened on `#app`, and the card `stopPropagation` blocked Nice!. Now: own click handler + backdrop click + Esc; shared `dismissDailyRewardModal()`.
- Prior **?v=20260906o**: Coins + Bars wallet, daily/weekly streaks, header balances, Transactions filters, earn hooks, `WhirledChrome.getWallet()`; no Buy Bars / payments.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906o1
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars / live Club checkout / Bling cash-out
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- No profile music (use room playlist)
