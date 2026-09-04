# Whirled 2

A browser remake of the *idea* of [Whirled](https://en.wikipedia.org/wiki/Whirled) (2007–2017, Three Rings): your room, walk-around avatars, user-made stuff. No Flash.

**This is not official Three Rings software.** Classic Whirled / msoy source and assets belong to their owners. This repo is original TypeScript + PixiJS work for a new public world in that spirit.

Maintainer: Josh (`whirledclassic` / josh.awe99@gmail.com)

## Start here

1. **[docs/SETUP.md](docs/SETUP.md)** — help / setup guide for the website and the game (both tracks)
2. **[docs/LINKS.md](docs/LINKS.md)** — every Grey Havens GitHub, Three Rings lib, creator API, wiki, remake, and museum URL we use as reference

## Two tracks

| Track | What it is | Where it lives |
| --- | --- | --- |
| **Classic lab** | Original Flash + Java / msoy stack, booting so the 2007–2017 client is not just a screenshot | Local Linux VM. How we stood it up: [docs/VM-GUIDE.md](docs/VM-GUIDE.md) |
| **Whirled 2** | New product. Click-to-walk room in the browser. TypeScript + PixiJS | This repo |

If you showed up to *play old Whirled*, the lab is the museum piece. If you showed up to *build something people can join in 2026*, you are in the right place.

Issue labels: `whirled` = classic lab. `whirled2` = this repo.

**Name collision:** [lulzsun/whirled2](https://github.com/lulzsun/whirled2) is someone else’s remake (Go + Node, AGPL). Not this tree.

## Status (2026-09-04)

- Local classic stack: **booting** (lab only). Windows 7 host + VirtualBox + Debian 13 XFCE guest. Java 8 + Linux + Ant + Postgres. Not JDK 21. Not home ports.
- Whirled 2: public repo just opened. First ship target is a single click-to-walk room, not a platform.
- Reference catalog of upstream GitHubs / APIs is in [docs/LINKS.md](docs/LINKS.md).
- Money: volunteer / free now. Pay only if the world actually makes money and the maintainer can pay from that. Credit either way. See [docs/ARTISTS.md](docs/ARTISTS.md).

## How to make things work

Read these before opening a “how do I build Whirled” issue:

1. [docs/SETUP.md](docs/SETUP.md) — clone lists, build order, game-upload path
2. [docs/LINKS.md](docs/LINKS.md) — source trees, APIs, wiki, museums, Ruffle, OVH rules
3. [docs/VM-GUIDE.md](docs/VM-GUIDE.md) — how we started: Win7 host, VirtualBox, Debian 13 guest
4. [docs/CLASSIC-LAB.md](docs/CLASSIC-LAB.md) — original stack
5. [docs/FIXES.md](docs/FIXES.md) — every public msoy issue we mapped, and what actually works
6. [docs/FLASH-AND-RUFFLE.md](docs/FLASH-AND-RUFFLE.md) — why the public room is not a SWF wrapper
7. [docs/SOURCES.md](docs/SOURCES.md) — field notes from people who shipped this class of world
8. [docs/RELATED.md](docs/RELATED.md) — other people’s work (lulzsun/whirled2, html5-msoy, Shadowsych docs). Not ours.
9. [docs/ROADMAP.md](docs/ROADMAP.md) — Whirled 2 order of work

## Reference GitHubs (classic)

Do not vendor these here. Clone in the lab. Details and build order in [docs/SETUP.md](docs/SETUP.md).

- https://github.com/greyhavens/msoy — server + clients
- https://github.com/greyhavens/whirled-sdk — creator APIs (avatars, toys, pets, games)
- https://github.com/greyhavens/whirled-api — API library
- https://github.com/greyhavens/whirled-projects — example games / furni / avatars
- https://github.com/greyhavens/thane — game server-agent VM
- https://github.com/threerings/narya — distributed objects / crowd
- https://github.com/threerings/nenya — 2D / iso components
- https://github.com/threerings/vilya — virtual-world components
- https://github.com/FelixWolf/msoy — fork still touching build scripts

Live community host (not our code): https://www.whirled.club  
Game API wiki: https://wiki.whirled.club/wiki/Create_games

## Stack (Whirled 2)

- TypeScript
- PixiJS
- 2D rooms first. 3D is a later fork in the road, not the default.

Exact package versions land when the first playable room is committed. Do not PR a framework rewrite.

## How to help

Read [CONTRIBUTING.md](CONTRIBUTING.md). Open issues labeled for the work you want.

Roles that actually move the needle this month:

1. Pixi / TS: click-to-walk, camera, room bounds
2. Pixel / room art: floor, walls, a few furniture props, one walk-cycle avatar
3. Someone who has run a small game on a cheap VPS with HTTPS (not home ports)

## Legal / tone

- Do not upload original Whirled client binaries, leaked user data, or copyrighted Three Rings assets here.
- Do not ship crash-the-client avatars, malware furniture, or anything that recreates the worst of the old shop.
- Name is used as a revival title. If Three Rings or a rights holder objects, we rename. The work stays.

## Links

- Issues: https://github.com/whirledclassic/whirled2/issues
- Contact: josh.awe99@gmail.com
