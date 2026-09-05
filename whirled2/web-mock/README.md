# Whirled 2 — web + room mockup (for a developer)

This folder is a **hand-off mock**, not a production app.

Live files:

- [index.html](./index.html)
- Repo folder: https://github.com/whirledclassic/whirled2/tree/main/whirled2/web-mock

Open `index.html` in a browser. No build step. Pixi loads from a CDN.
If the CDN is blocked, a CSS fallback avatar still moves.

It exists so a web person (or you, six weeks from now) can see:

1. What the **product chrome** is (tabs, profile, status feed, chat bar).
2. Where the **PixiJS room** lives inside that chrome.
3. How the original **Whirled / whirled.club** layout maps onto this remake without copying their art, logo, or Flash client.

---

## What we studied

### whirled.club (the 2018 revival, live today)

- Sky-blue splash, cartoon header, **Lampy** mascot, orange Sign Up / Logon.
- After Flash died they ship a **downloadable client** (Windows / Mac).
- That site is a *mirror of the original stack*, not this project.
- We do **not** clone their banner art or claim their name.

### Original Three Rings client (2008–2017)

The thing people actually lived in looked like this:

```
[ Whirled logo ]  Me   Stuff   Games   Rooms   Groups   Shop     coins  bars  mail
+--------------------------------------------------------------------------+
| occupants |                                              | room owner    |
| list      |           ROOM CANVAS (Flash applet)         |               |
|           |           avatars walk on a backdrop         |               |
+--------------------------------------------------------------------------+
[ chat input          send ]  volume  go  friends  share  comments  snap
```

Important product fact from the wiki / Wikipedia:

- **Your room IS your profile.** Friends walk into it.
- The HTML/GWT *sidebar* handled friends + browsing. Flash drew the room.
- Bottom bar: chat, go-home, friends online, room comments, snapshot, playlist.
- Me tab: your rooms, friends, passport / stamps.

### What THIS remake is (from the repo, not from whirled.club)

- New TypeScript + PixiJS room. Not a SWF wrapper.
- Palette Josh already locked: **cream / ink / coral**. Editorial. No purple-gold casino.
- First ship: one click-to-walk room + a page people can open.
- Shop / bars / bling are later or never. Do not build a store in this mock.

---

## File map

| File | Why it exists |
|---|---|
| `index.html` | Page structure. Landing strip + app shell. |
| `css/shell.css` | Layout and tokens. No framework. |
| `js/mock-app.js` | Tabs, feed, chat, Pixi room, click-to-walk. |
| `README.md` | You are here. |

Every non-obvious line in HTML/CSS/JS has a comment that says **what it is for**, not just what the syntax does.

---

## How a real TypeScript app should eat this

```
index.html          →  later: index.html from Vite
#room-stage         →  later: <canvas> owned by Pixi.Application
js/mock-app.js      →  later: src/shell.ts + src/room/RoomApp.ts
css/shell.css       →  later: keep as CSS, or tokens in a tiny theme file
```

Do **not** put Pixi in charge of the tabs, the feed, or the chat bar.
Those stay HTML. Pixi only draws the room. That split is how original Whirled worked (GWT chrome + Flash room) and it is still the right split.

---

## What is fake in this mock

- No server. Occupants and feed items are hardcoded.
- Avatar is a coral capsule, not a sprite sheet.
- Chat does not broadcast.
- Shop / Stuff / Games / Groups tabs are labeled but empty on purpose.
- Coins are flavor text, not a currency system.

What is **real enough to implement from**:

- Click-to-walk on the canvas.
- Profile panel that belongs to the room owner.
- Status feed next to the room.
- Bottom control bar.
- Responsive stack on a phone (room first, feed under it).
