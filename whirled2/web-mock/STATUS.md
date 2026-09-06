# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906m)

- **Friend requests lifecycle**: `whirled2.friendRequests` pending → Accept (mutual friends via per-user `whirled2.friends.{id}`) / Decline / Retract. Profile + Me→Friends Requests section + badge. Multi-local-user: register a second account on this browser to Accept. Still mails “Let’s be buddies!” — does **not** auto-add until Accept.
- **Chat tabs**: Room (blue) + Private (orange) PM tabs; unread glimmer; Friends toolbar popup → Whisper / Profile / Join; `/clear` per tab; orange PM input tint; `whirled2.chatTabs` + `whirled2.pm.{a}:{b}`.
- **Notices**: login/logout / friend presence approx / blue mail & friend-accepted.
- **Go menu**: recent rooms (`whirled2.recentRooms`, max 8) + Home + Friends online shortcuts.
- **Mail**: unread blue highlight; Select All + Delete Selected; Stuff **Send as Gift** moves item once (`giftItem` / `giftClaimed`).
- **Modern**: Ctrl/Cmd+K command palette; `?` shortcuts overlay; chat reactions; copy invite link; recently visited strip; presence pulse; tab fade (reduced-motion safe); `/away` `/back` stubs.
- Room menu: View items / snapshot stub / zoom stub.
- Prior: profile skins (no music), room lock, stage bubbles, passport.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906m
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase / live Club checkout
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- No profile music (use room playlist)
- Shared multi-browser room chat / cross-browser lock still needs the Node API (Pages is localStorage-only)
