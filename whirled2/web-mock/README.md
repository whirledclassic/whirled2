# Whirled 2 — page chrome (no engine)

This package is the **website around the room**.

It is not the walker. It is not Pixi. It is not whirled.club.

Open `index.html` in a browser. Tabs: Me, Stuff, Games, Rooms, Groups, Shop.
The dark dashed rectangle (`#stage-slot`) is where the engine developer mounts Pixi. Do not draw chrome there.

TypeScript source is in `src/`. `app.js` is the no-build preview of that source.

## Map to the original client

| 2008 tab | This mock |
|---|---|
| Me | Profile, home room card, friends |
| Stuff | Owned catalog grid |
| Games | Directory of in-room toys |
| Rooms | Occupants + empty stage + feed |
| Groups | Shared whirleds |
| Shop | Catalog tiles, coins as labels only |
| Bottom bar | Chat + Go + Me |

## Files

| File | Job |
|---|---|
| `src/main.ts` | Tabs, chat, filters |
| `src/views.ts` | One function per tab |
| `src/data.ts` | Fake people / rooms / items |
| `src/styles.css` | Cream / ink / coral, original layout modernized |
| `app.js` | Browser preview of the TS |
