# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906p)

- **Profile look extras**: Ocean / Forest / Candy / Mono presets (+ Classic/Night/Sunset/Paper/Tile Soft/Clear). Font scale, corner radius, module style (frosted/solid/outline), header style, optional banner + tagline. Live preview + Publish. No profile music.
- **Room music sources**: `whirled2.playlist.loft` supports `local` | `youtube` | `spotify` with embed URL → normalized iframe. Compact `#room-embed-dock` under stage (not `#stage-slot`). Legal meta line on embeds.
- **Owner controls music (hard)**: only loft owner switches source / pastes embeds / lock settings / remove-next. Guests listen; optional guest local-track adds when `ownerOnlyAdd` is false. Never guest yt/spotify edits. Defaults: `ownerOnlyAdd: true`, `ownerControlsMusic: true`.
- **Occupant rail**: “In this room (N)”, you-first sort, presence dots (here/away/in-game), friend highlight, owner crown, optional filter when >5, smoother mobile height — real session occupants only.
- Prior: Daily reward dismiss fix (`dismissDailyRewardModal` + backdrop/Esc). Coins + Bars earn-only; no Buy Bars / payments.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906p
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars / Bling cash-out
- No fake NPCs or invented catalog
- No private engine edits
