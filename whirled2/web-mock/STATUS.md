# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906y)

- **Room music background play**: Closing the Room music modal (Close / backdrop / Done) only removes the sheet — never `removeRoomEmbedDock()` / never clears the live iframe. Compact dock “now playing” mini bar (title + Open player / Room music / Mute) stays mounted under the shell.
- **YouTube loop**: `roomEmbedSrcForIframe` appends `playsinline=1`; single videos get `loop=1&playlist=VIDEO_ID`; playlists get `loop=1`. Spotify note: loops via its own player. Local single-track `audio.loop = true`; queue still wraps via `playlistNext`.
- **Simpler mobile setup**: paste URL (auto-detect) OR pick tab → full-width Set embed → big **Done — keep playing** (closes modal only). No competing preview iframe in the modal.
- **♪ icon polish**: `.tb.tb-music` circular pale-blue chip with inline SVG note; `.is-playing` pulse when dock/local audio is live. Dock + modal CTAs cleaned up.
- Prior **?v=20260906x**: Room music modal sheet + `canControlRoomMusic` for FB users.
- Prior **?v=20260906w**: paste-URL / dirty-gate / focus-safe remount.
- Prior **?v=20260906v**: room music dock outside `#main`.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906y
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars
- No fake NPCs / catalog
- No server-side Facebook secrets (Pages is client-only)
