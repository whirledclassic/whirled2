# Whirled Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- **Passport** (Me→Passport): classic shell with Mingle / Play / Create / Shop stamp categories (empty “No stamps yet”), disabled Go! (coins labels later), empty Group Medals. Optional `whirled2.passport.{userId}` array.
- **Account** (Me→Account): permaname, display name, member since, email placeholder (disabled / local-only), password managed by register/login, delete disabled (“not available on Pages”).
- **Rooms lobby**: Featured / Active / Hot New / My Rooms tiles (Studio Loft enterable); rating stub “Rating: new”; Whirled Tour cycles local Me/Stuff/Rooms/Mail tips.
- **Toolbar**: Go menu (home, recent loft, friends, games awaiting); Friends → Me→Friends; Room → leave/lobby; volume/party Coming soon.
- Profile: Send Mail; Browse Items → Stuff; Visit Home → enter loft.
- Cache bust `?v=20260905p`. Coins labels only. `window.WhirledChrome` unchanged; engine only in `#stage-slot`.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905p
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase
- No fake NPCs or invented catalog items
- No WhirledClassicGame / private engine edits
- No new framework
