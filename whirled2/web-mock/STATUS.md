# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906t)

- **Room music embeds (mobile)**: hardened YouTube/Spotify URL parse; dock under stage with **Open player** bottom-sheet, **Tap play in embed**, and **Open on YouTube/Spotify** (native tab). Mobile iframe height ~200px (YT) / ~152px (Spotify) — no more 96px squash. `pointer-events` / z-index so chat chrome does not steal taps.
- **Profile look — custom background**: prominent **Upload custom background** (image behind everything); auto Image/cover/scroll; thumbnail + Clear image; translucent modules.
- **Facebook Connect**: gate **Continue with Facebook** + Me → Account link/unlink + Facebook App ID (`whirled2.facebookAppId` / `WHIRLED2_FB_APP_ID`). SDK `v21.0`; users `fb_` + id. Discord / Google Coming Soon only.
- Prior **?v=20260906s**: Facebook Connect first land.
- Prior **?v=20260906r**: mobile Room **♪ Music** + Room menu again.
- Prior **?v=20260906q**: mobile visual overhaul.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906t
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars
- No fake NPCs / catalog
- No server-side Facebook secrets (Pages is client-only)
