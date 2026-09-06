## What shipped (?v=20260906bf)

- **Go menu wiki sections:** Go home / Recently visited / Friends online / Games awaiting players + beginner hint
- **Friends toolbar:** online-in-loft first + offline grey rows; Whisper / Profile / Join them
- **Clickable furniture glow legend:** green=door travel, orange=link stub, white=game stub (wiki Room)
- **Friend login/logout corner feed:** local presence feed (wiki Chat grey notices); expand/collapse
- **UI polish:** room menu Snapshot/Zoom Coming Soon tags; volume + room-comment beginner blurbs; chat name-menu Invite/Complain clarity
- **Updates thread:** Whirled2 Developers ship note + refreshed sticky OP (`overnightChangelogBody`)
- Built on **be** Music/Parties — **did not regress** bd badges, bc Groups/Admin/broadcast, bb Flash (`classic-avatar.js` untouched this letter), Whirl, visit-since
- Cache: **`?v=20260906bf`**. Push: `/tmp/push-bf.js` (dry-run default).

## What shipped (?v=20260906be)

- **Club Music playlist fidelity (wiki Music):** bold Now playing, hover “Added by…”, owner ▶ (blue) / ✕ (red), **Bleep** (session mute/skip for you), info toast + Report stub
- **Chat modes polish:** Speak / Think / Shout button tints + input accents; classic throttle copy: “You're being too chatty. Wait a moment and try again.”
- **Parties! board:** clearer Open/Friends pills, member count, follow-host Coming Soon, beginner create/invite copy
- **Stuff:** themed Whirled inventory filter Coming Soon banner + per-category how blurb (no fake catalog)
- **Share/embed:** wiki Room blurb + `LOGO_V` on share links
- Built on **bd** PNG/Ruffle badges + decorate/friends/lock/groups/passport — **did not regress** bc Groups/Admin/broadcast, bb Flash hybrid, Whirl, chat visit-since
- Cache: **`?v=20260906be`**. Push: `/tmp/push-be.js` (dry-run default).

## What shipped (?v=20260906bd)

- **Playback clarity (user confusion fix):** loft nameplate + Stuff Wear cards show crystal-clear badges:
  - `Walking: PNG hybrid (no Ruffle)` / `Whirl · PNG` when PNG spritesheets drive motion
  - `Appearance: Ruffle (SWF)` only when `#avatar-ruffle-host` is actually mounted
  - Debug: `WhirledChrome.getAvatarPlaybackMode()` → `png-hybrid` | `ruffle` | `tofu` | `png`
  - HOW-CLASSIC opening strengthened: walking Whirl/Hybrid PNGs ≠ Ruffle
- **Decorate polish:** wired missing filter/snap/scale/z/dup + nudge/flip; snap persists; backdrops place larger
- **Friends search:** email / real name / interests / status + matchWhy badge
- **Room lock:** clearer labels + Room Guardian stamp; preview who-can-enter blurb
- **Groups:** accent theme form (managers); pin/announce/lock thread tools; join → Group Joiner stamp
- **Passport:** group medals from joined groups; Room Guardian / Group Joiner seals
- **Mobile immersion:** Room menu Enter immersive (not only landscape auto)
- Built on **bc** Groups/Admin/broadcast/NaN + **bb** Flash hybrid — **did not regress** `classic-avatar.js` walk/tofu
- Preserve: Whirl starter, chat visit-since, pale-blue chrome, earn-only, no MySpace, no fake catalog
- Cache: **`?v=20260906bd`**. Push: `/tmp/push-bd.js` (dry-run default).

## What shipped (?v=20260906bc)

- Groups forum + seeded Whirled2 Developers; Admin; /broadcast; NaN heal; friends search fields.

## What shipped (?v=20260906bb)

- Flash walk/tofu polish + HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md

# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Standing rules

- Coins/Bars earn-only; never invent fake catalog.
- Never say MySpace; say Profile look.
- `#stage-slot` = engine mount; Wear / chrome walk / emotes on `#avatar-wear-layer` sibling.
- No secrets in client — only `WHIRLED_API` origin.
- **Whirl** is the starter avatar (slug `cyan-hair`).
- **Walking animation with Whirl/Hybrid PNGs is not Ruffle** — Ruffle is SWF-only.
