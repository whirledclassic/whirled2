# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906n)

- **Profile look fix**: presets (Classic / Night / Sunset / Paper / Tile Soft / Clear) always visible on My Profile — instant publish without opening Edit look. Night uses light text/links on dark gradient; Clear restores plain paper. `.page` uses `background-color` so skin shorthand wins; double `requestAnimationFrame` re-apply after paint. Profile look naming only (no third-party skin branding).
- **Chat name menu**: click underlined speaker → Profile / Whisper / Invite friend / Block.
- **Notices page**: Me → Notices (+ header bell count); mark-read / mark-all; friend login, mail, friend request kinds.
- **Group chat tabs**: Chat Options → Groups opens bluish-gray group tab (`whirled2.groupChat.{groupId}`); unread glimmer.
- **Hangout invites**: leaving loft (when others visited) → optional "Invite people you hung out with?" (real occupants only).
- **Room View items**: decorate chips + playlist track names from local data.
- **Hash routes**: `#me/profile`, `#rooms`, `#mail`, etc. on boot + tab change.
- **Mail Follow up** compose prefill; My News friend-accepted rows.
- Prior: friend requests, Room/PM tabs, Ctrl+K, gift mail, room lock, passport.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906n
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase / live Club checkout
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- No profile music (use room playlist)
- Shared multi-browser room chat / cross-browser lock still needs the Node API (Pages is localStorage-only)
