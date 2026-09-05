# Review: this page vs whirled.club vs the engine

Written 2026-09-05. Website work stays in `whirledclassic/whirled2`. Engine stays in private `WhirledClassicGame`.

## whirled.club right now

Live site (www.whirled.club) is the **community Flash revival**, not us.

- 2008 GWT skin: light blue page, logo banner, orange **Sign Up** / **Logon**
- Register wants email, password, birthday, privacy checkbox
- After Flash died they shipped a **Windows / Mac client download** ("We've moved! Browsers no longer support Flash player")
- The actual world is still the old room + shop + groups model
- Accounts, rooms, and shop packs are their database. We do not scrape it.

That is a preservation client around the historic stack. It is the thing people already play.

## This website (`whirled2/web-mock`)

Intentional cousin, not a skin-rip.

| Piece | whirled.club | Whirled 2 page |
|---|---|---|
| How you enter | Download Flash client | Normal browser |
| Auth | Email + birthday + client | Display name + password, in-page |
| Chrome | Blue GWT header | Cream / ink / coral, same tab verbs |
| Tabs | Me Stuff Games Rooms Groups Shop | Same six tabs |
| Room | Flash stage fills the client | HTML stage slot + HTML chat |
| Shop / coins | Live economy | Labels only |
| Data | Their players | Our testers only |

The page is closer to original *in-browser* Whirled than whirled.club is in 2026, because whirled.club had to leave the browser. We should keep that advantage. Do not add a "download the client" wall.

Gaps that still show if you sit them side by side:

- No original art, peas, or lamp mascot (and we should not steal theirs)
- Occupant list is still half-mock
- Shop tiles are dummy cards
- Stage is empty until the engine mounts
- No friends list or mail

Those are fine for a first prototype. Login + chat + a reserved stage is the shippable slice.

## The engine (`WhirledClassicGame`)

Private PixiJS 8 + Vite app. Current truth:

- Full-window canvas (`resizeTo: window`)
- `Scene` / `GameObject` lifecycle
- `DemoScene` loads one `Player`
- Player is the stock Pixi bunny, spinning
- No input, no floor, no other people, no network

It is the right *lab* for walk. It is not a website. If you drop it into the page unchanged it will cover the tabs and steal resize.

See [web-mock/ENGINE-BRIDGE.md](web-mock/ENGINE-BRIDGE.md) for the mount contract.

## First prototype we can put live

1. This page + `node server/server.mjs` on a tiny VPS
2. Two people register and chat in Studio Loft
3. Stage keeps the dashed hole
4. When `mountWhirledEngine(host)` exists, load that bundle into the hole
5. Still do not merge the git trees
