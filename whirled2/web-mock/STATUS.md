# Whirled2 Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- **Whirled2 branding**: logo prefers `assets/whirled2-logo.png` (fallback whirled-classic-logo.png → logo.svg). Gate/header/docs say **Whirled2**. Not affiliated with whirled.club / Three Rings.
- **Club / Membership Coming Soon**: Me → Club + header Club. May-include list (extra rooms, cosmetics, supporter mark, early access, events) marked subject to change. Disclaimer (new engine, greyhavens/msoy reference, prototypes). Local “Notify me” stub — **no payments**.
- **Roles / badges** (prior): `whirled2.roles`, Admin/Mod pills, `test`=admin, Account promote/demote.
- **Room chat** (prior): Slide vs Overlay (`whirled2.chatUi`), chat opts, name menu, `/me` `/emote` `/clear`, rate-limit.
- **Profile edit UX**: own profile is read-only by default; classic Edit status / photo / information links expand one panel at a time (Done/Cancel collapses). Others never see edit forms.
- Cache bust `?v=20260905x`. Coins labels only. No gold/purple. No fake NPCs/catalog. Keep `WhirledChrome` + `#stage-slot` + `#decorate-layer`. No private engine.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905x
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase
- No fake NPCs or invented catalog / game titles
- No WhirledClassicGame / private engine edits
- No TinyMCE / no new framework
