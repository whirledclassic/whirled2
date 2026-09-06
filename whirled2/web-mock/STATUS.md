# Whirled Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- **Games** (wiki Game): genre rail/chips (Action/Arcade … Word); Featured / My favorites empty shells; list from `whirled2.games` only (starts empty — no invented titles); game detail (Play → multiplayer lobby shell, fav heart, trophies empty, comments local); lobby tables from `whirled2.gameTables` (Create/Join/Leave/Start local; “Waiting for other players” when alone); Go menu “View games awaiting players” → lobby. Banner: parlor games mount later; coins labels only.
- **Friend search** (Starting out): Me→Friends search by Whirled name / permaname against liveOccupants + friends + `whirled2.knownProfiles` only; Add Friend / Send Mail / Visit — no invented people.
- **My News**: classic subsections Comments / Friendings / Status when events exist; empty placeholders Announcements / Trophies / Updated Rooms; derived from wall, friend adds, status + `pushNotice` kinds.
- **Stage**: empty-room hint “Your room — engine mounts here” (+ decorate later) when `#stage-slot` has no engine canvas; `WhirledChrome.getStageEl()` unchanged.
- Cache bust `?v=20260905r`. Coins labels only. No gold/purple. No private engine. No fake catalog game titles.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905r
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase
- No fake NPCs or invented catalog / game titles
- No WhirledClassicGame / private engine edits
- No TinyMCE / no new framework
