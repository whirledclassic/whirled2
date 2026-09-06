# Whirled Chrome — STATUS

Date: 2026-09-05

## What shipped (this pass)

- **Shop** (wiki Shop): Popular selections empty panels (Avatars, Furniture, Backdrops, Toys, Pets, Games, Images, Music, Videos); category rail + sort stubs (rating / price / popularity / date) over real `whirled2.shop` only — never invent listings; item detail for saved items (favorite → `whirled2.favorites`, stars → `whirled2.shopRatings`, Post Comment local); Buy disabled (“labels only, no payments”); banner: “Coins are labels only — no payments on Whirled Classic yet.”
- **Groups** (wiki Group): list from `whirled2.groups` (starts empty) + Create group; detail with discussion (`whirled2.groupThreads.{groupId}`), members, Join/Leave, Enter hall → Rooms lobby / loft meta; plain-text threads/replies. Empty: “No groups yet. Create one to start a discussion.”
- **Room** (wiki Comment): Room toolbar menu — Comment or rate, Decorate Room (coming soon), lock Unlocked/Friends/Locked (`whirled2.roomLock.loft`, visual on Pages); comments `whirled2.roomComments.loft`; rate 1–5 `whirled2.roomRating.loft` shown on lobby tile.
- Cache bust `?v=20260905q`. Coins labels only. `window.WhirledChrome` unchanged; engine only in `#stage-slot`. No fake NPCs/catalog. No gold/purple.

## Live URL

- Live mock: https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905q
- Site root: https://whirledclassic.github.io/whirled2/

## Out of scope

- No payments / bars purchase
- No fake NPCs or invented catalog items
- No WhirledClassicGame / private engine edits
- No TinyMCE / no new framework
