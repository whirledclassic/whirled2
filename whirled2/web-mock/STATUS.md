# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Avatar research (same wave)

- Deep dive of Grey Havens GitHub (`msoy`, `whirled-sdk`, `whirled-projects`) + community `lulzsun/whirled2` SWF/Ruffle path.
- Plan doc: [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) — deep Grey Havens research (SWF + remix ZIP + ~80×60 thumb, SHA-1 HashMediaDesc, Ruffle host shim, ENGINE-BRIDGE policy bump for Phase 2).
- Avatar lab stays **locked** (Stuff → Avatars On hold unless `?avatarLab=1`). No Ruffle/SWF in rooms.

## What shipped (?v=20260906ad)

Chrome fidelity (SITE-FIXES top 5) + owner lock polish:

1. **Me → Friendly People strip** — under Friends Online; honest empty state; Account toggle; Friendly auto-accept friend requests.
2. **Profile wall Delete** — profile owner deletes any wall post; authors delete their own.
3. **Shop grid ♥ Favorite** — heart on listing cards (same `whirled2.favorites` as detail).
4. **Toolbar Volume + mute-safe music** — mute + slider (persisted); muted skips loading local/embed tracks.
5. **Share / embed room popup** — share URL + optional iframe snippet (no social APIs).
6. **Room lock triad** — Unlocked / Friends / Locked (owner-only; guests view-only).

Prior folded: **ac** chat polish + Games expand; **ab** Club tiers; **aa** room preview / soundtrack / no Facebook Connect.

## Live URL

- Local / Pages cache: `?v=20260906ad` (`LOGO_V` in `app.js` / `index.html`)
- Live mock (when pushed): https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906ad
- Site root: https://whirledclassic.github.io/whirled2/

## PLAN (not shipped)

- Mobile **landscape** fullscreen stage + corner Overlay chat drawer (comment only in `app.js` near `ensureMobileChatOverlay`).

## Out of scope

- No payments / Buy Bars / live membership checkout
- No fake NPCs / invented live game catalog titles
- No zero-setup social OAuth on static Pages
- Avatar SWF / Ruffle in rooms (**ON HOLD**)
- Do not push unless instructed
