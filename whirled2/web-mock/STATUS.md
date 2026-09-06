# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Avatar research (same wave)

- Deep dive of Grey Havens GitHub (`msoy`, `whirled-sdk`, `whirled-projects`) + community `lulzsun/whirled2` SWF/Ruffle path.
- Plan doc: [AVATAR-IMPORT.md](./AVATAR-IMPORT.md) — deep Grey Havens research (SWF + remix ZIP + ~80×60 thumb, SHA-1 HashMediaDesc, Ruffle host shim, ENGINE-BRIDGE policy bump for Phase 2).
- Upload UI + demo media API still next (not in this chrome-only ship).

## What shipped (?v=20260906ac)

- **Chat visual polish**: Overlay bubbles (cyan names, contrast, soft fade), readable Slide panel, clearer tabs/unread, polished Send + 16px mobile input, tidy chat options, stage bubbles readability. Mobile still Overlay-only (no black hood).
- **Games expand**: home nav Browse / Tables / AVR Coming Soon / My scores; Parlor vs AVR explainers; empty-state + How games work; labeled Coming Soon placeholder cards (not fake catalog); detail Play / Watch / Tables; local `whirled2.gameScores` stub.
- Prior **?v=20260906ab** (folded): Club tier cards (Free / Supporter / Creator / Studio Coming Soon).
- Prior **?v=20260906aa** (folded): shared loft soundtrack; Facebook Connect removed; room preview before enter.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906ac
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / Buy Bars / live membership checkout
- No fake NPCs / invented live game catalog titles
- No zero-setup social OAuth on static Pages
- Do not push unless instructed
