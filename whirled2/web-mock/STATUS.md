# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906a)

- **Chat send fix**: `#chat-form` submit now reads `#chat-input` only. Chat Options radios inside the form no longer steal `querySelector("input")` and block Send. Offline `WhirledApi.postChat` unchanged.
- **Notice bar**: empty state clears + hides (`is-empty` / `hidden`) — no permanent “No notifications” cream panel.
- **Themes shells**: Me → Themes (Classic Blue / Night Loft / Soft Sky + Coming Soon premium cards); group managers get Edit Whirled theme Coming Soon + local hex draft.
- **Room music / playlist**: Stuff → Music audio upload (copyright required); Room menu → View room playlist; `#room-audio`; soft autoplay / Click-to-play; mute via volume toolbar.
- **Legal / Disclaimer** page (Help, gate footer, Club, Me sidebar).
- **Logo**: near-black background removed from `assets/whirled2-logo.png` (transparent PNG); classic logo remains fallback. Candidate agent asset was gray-bg not transparent.
- Beginner `// How this works:` comments + **DEV-NOTES.md** for hired web developer handoff.
- Soft panel polish; consistent blue chrome. Coins labels only. No payments.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906a
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase / live Club checkout
- No fake NPCs or invented catalog
- No WhirledClassicGame / private engine edits
- No shared multi-browser playlist sync yet (localStorage only on Pages)
