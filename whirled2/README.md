# Whirled 2

**This folder is the new product.**  
Not a revival of the Flash client. Not a patch on `msoy`.

Issue label: `whirled2`.

Same-vs-different vs original Whirled: [SAME-AND-DIFFERENT.md](SAME-AND-DIFFERENT.md).

Public note — original cost, why community matters, crowdfunding rules, networking: [PUBLIC.md](PUBLIC.md).

---

## What this track is

A **new** browser world in the *spirit* of Whirled (2007–2017): your room, walk-around avatars, user-made stuff. No Flash.

Stack:

- TypeScript
- PixiJS
- 2D rooms first. 3D is a later fork, not the default.

First ship (issue [#1](https://github.com/whirledclassic/whirled2/issues/1)): one click-to-walk room on a canvas. Rectangles are allowed. Art comes after walk.

Public deploy: cheap VPS + HTTPS. Not a home router. Issue [#4](https://github.com/whirledclassic/whirled2/issues/4).

---

## What it is not

| Guess | Reality |
| --- | --- |
| UI clone of 2010-era Whirled | No. Same verbs, new chrome and art |
| Ruffle wrapper around the old room SWF | No. Classic SWFs stay in the lab |
| Fork of [lulzsun/whirled2](https://github.com/lulzsun/whirled2) | No. Different owner, stack, license |
| The Java server with a new skin | No. New client. New server later |

If you showed up to boot original msoy, go to [`../classic/`](../classic/).

---

## Status (2026-09-04)

Public repo is open. The local Pixi room is not in git yet. That gap is the whole of issue #1.

When the scaffold lands, expected loop:

```bash
git clone https://github.com/whirledclassic/whirled2.git
cd whirled2/whirled2
npm install
npm run dev
```

Exact scripts will match whatever `package.json` we commit. Do not PR a framework rewrite before that file exists.

---

## Help that matters this month

1. [#1](https://github.com/whirledclassic/whirled2/issues/1) — commit the ugly room
2. [#2](https://github.com/whirledclassic/whirled2/issues/2) — one avatar + walk cycle
3. [#3](https://github.com/whirledclassic/whirled2/issues/3) — floor, walls, a few props
4. [#4](https://github.com/whirledclassic/whirled2/issues/4) — VPS + HTTPS notes

Art terms: [ARTISTS.md](ARTISTS.md). Volunteer now, credit always.

Roadmap: [ROADMAP.md](ROADMAP.md).

Money / community / crowdfunding: [PUBLIC.md](PUBLIC.md).

---

## Code that will live here

When #1 lands, this directory is where the TypeScript / Pixi tree goes (`src/`, `package.json`, public assets we own). Classic Java / SWF never shares this folder.
