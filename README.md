# Whirled 2

A browser remake of the *idea* of [Whirled](https://en.wikipedia.org/wiki/Whirled) (2007–2017, Three Rings): your room, walk-around avatars, user-made stuff. No Flash.

**This is not official Three Rings software.** Classic Whirled / msoy source and assets belong to their owners. This repo is original TypeScript + PixiJS work for a new public world in that spirit.

Maintainer: Josh (`whirledclassic` / josh.awe99@gmail.com)

## Two tracks

| Track | What it is | Where it lives |
| --- | --- | --- |
| **Classic lab** | Original Flash + Java / msoy stack, booting so the 2007–2017 client is not just a screenshot | Local Linux VM. Not in this repo. |
| **Whirled 2** | New product. Click-to-walk room in the browser. TypeScript + PixiJS | This repo |

If you showed up to *play old Whirled*, the lab is the museum piece. If you showed up to *build something people can join in 2026*, you are in the right place.

## Status (2026-09-03)

- Local classic stack: **booting** (lab only).
- Whirled 2: public repo just opened. First ship target is a single click-to-walk room, not a platform.
- Money: volunteer / free now. Pay only if the world actually makes money and the maintainer can pay from that. Credit either way. See [docs/ARTISTS.md](docs/ARTISTS.md).

## Stack (Whirled 2)

- TypeScript
- PixiJS
- 2D rooms first. 3D is a later fork in the road, not the default.

Exact package versions land when the first playable room is committed. Do not PR a framework rewrite.

## How to help

Read [CONTRIBUTING.md](CONTRIBUTING.md). Open issues labeled for the work you want. Do not email a portfolio into the void if you can attach it to an issue.

Roles that actually move the needle this month:

1. Pixi / TS: click-to-walk, camera, room bounds
2. Pixel / room art: floor, walls, a few furniture props, one walk-cycle avatar
3. Someone who has run a small game on a cheap VPS with HTTPS (not home ports)

## Legal / tone

- Do not upload original Whirled client binaries, leaked user data, or copyrighted Three Rings assets here.
- Do not ship crash-the-client avatars, malware furniture, or anything that recreates the worst of the old shop.
- Name is used as a revival title. If Three Rings or a rights holder objects, we rename. The work stays.

## Links

- Issues: https://github.com/thanatosspirit/whirled2/issues
- Contact: josh.awe99@gmail.com
