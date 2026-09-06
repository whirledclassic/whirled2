# Whirled Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- **List Item → Shop** (creator loop): Stuff detail “List Item” form (coins label price, tags, copyright) copies listing into `whirled2.shop` with seller id/name, type, thumb. **Delist** when already listed. Shop category + popular panels show real user listings only — no invented demos. Buy disabled: “Coins are labels only — no payments”.
- **Decorate Room** shell (wiki Room/Furniture): Room menu enables decorate mode (not Pixi). Side panel lists owned furniture/backdrops/toys/images; Add to room places absolute chips on `#decorate-layer` (sibling of `#stage-slot` inside `.stage-host`). Drag to move; Save → `whirled2.roomLayout.loft`; Take from room removes. `getStageEl()` still returns `#stage-slot`. View items lists layout.
- **Help** (header): Starting Out tips (Me, Rooms, Stuff upload, Mail, Groups, Games lobby, coins labels) + in-page CONCEPT/STATUS spirit. No external secrets.
- **Parties** stub (wiki Party): `tb-party` opens party board from `whirled2.parties`; Create (name, open/friends); Join/Leave local; party name in notice bar; follow-leader meta only.
- Cache bust `?v=20260905t`. Coins labels only. No gold/purple. No private engine. Keep `WhirledChrome` + `#stage-slot`.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905t
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase
- No fake NPCs or invented catalog / game titles
- No WhirledClassicGame / private engine edits
- No TinyMCE / no new framework
