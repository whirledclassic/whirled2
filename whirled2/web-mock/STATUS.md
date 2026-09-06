# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906o)

- **Coins + Bars** (classic names): play currency in `whirled2.wallet.{userId}` — Coins from play/social; Bars earn-only (streak milestones / weekly). **No Buy Bars, no PayPal, no live payments.** Bling cash-out = Coming Soon on Transactions.
- **Daily / weekly streaks**: once per calendar day on session paint — base +50 coins, streak bonus +10×min(streak,30); Bars at streak 7/14/21/30; weekLogins=7 → +100 coins + 1 Bar. Daily reward modal on first claim.
- **Header chrome**: Coins + Bars chips (pale blue + soft gold bars) next to mail/notices → Me → Transactions.
- **Transactions**: filter All / Coins / Bars; banner “play currency — no real-money purchases”; ledger rows `{ at, kind, coins, bars, note }`.
- **Earn hooks**: passport stamp +25 coins; status +5 once/day; friend accept +15 each side.
- **Shop**: Buy still disabled; optional “or N bars” label (10,000 coins ≈ 1 bar display math).
- **WhirledChrome.getWallet()** read-only `{ coins, bars, streakDays }` for engine (optional).
- Prior: Profile look presets, chat name menu, Notices, group chat tabs, hash routes, hangout invites, friend requests, Ctrl+K, passport.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906o
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars / live Club checkout / Bling cash-out
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- No profile music (use room playlist)
- Shared multi-browser room chat / cross-browser lock still needs the Node API (Pages is localStorage-only)
