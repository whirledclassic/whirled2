# Two projects, one front door

This GitHub account runs **two separate efforts**. They share a name family and a history. They do **not** share a codebase, a renderer, or a deploy target.

| | **Classic Whirled revival** | **Whirled 2** |
| --- | --- | --- |
| Folder | [`classic/`](classic/) | [`whirled2/`](whirled2/) |
| Goal | Keep the **original 2007–2017 world playable** as a museum lab | Build a **new public world people can join in a normal browser** |
| Source of truth | Grey Havens / Three Rings trees (`msoy`, SDK, narya…) cloned **in a Linux VM** | Original TypeScript + PixiJS in this repo |
| Client | Original Flash / AS3 room client (lab only) | New 2D canvas. Not a SWF wrapper |
| Server | Original Java `msoyserver` | New, small, later. Not a patch on msoy |
| Network | Local NAT lab. No home ports | Cheap VPS + HTTPS when the room exists |
| Issue label | `whirled` / `classic` | `whirled2` |

Read this table first. Then pick a folder. If a sentence could apply to both tracks, it belongs here, not in either folder.

Maintainer: Josh (`whirledclassic` / josh.awe99@gmail.com)

**Not official Three Rings software.** Classic source and assets belong to their owners. If a rights holder objects to the name, we rename. The work stays.

---

## Direct answers (so nobody has to guess)

**Is Whirled 2 a UI clone of original Whirled?**  
No. Same *product idea* — your room, walk-around avatars, user-made stuff — not a pixel-for-pixel Flash skin. First ship is an empty click-to-walk room. Layout, chrome, and shop come later and will be original art. See [whirled2/SAME-AND-DIFFERENT.md](whirled2/SAME-AND-DIFFERENT.md).

**Where is the revival of the original project?**  
[`classic/`](classic/). That track boots Grey Havens `msoy` (Java 8 + Linux + Ant + Postgres) so the 2007–2017 client is not only a screenshot. It is a **lab / museum piece**, not a public host. Community play today: [whirled.club](https://www.whirled.club).

**Why are they in the same GitHub repo?**  
One maintainer, one place for developers to land. Code and secrets stay split: Classic binaries never land here. Whirled 2 source will live under `whirled2/` when the first room is committed.

**Name collision:** [lulzsun/whirled2](https://github.com/lulzsun/whirled2) is someone else’s remake (Go + Node, AGPL). Not this tree.

---

## Status (2026-09-04)

- **Classic lab:** booting on a local Debian 13 XFCE VM (VirtualBox, NAT). Java 8. Not JDK 21. Not on the public internet.
- **Whirled 2:** public repo is open. First ship is one click-to-walk room. `npm` scaffold is not committed yet — that is [issue #1](https://github.com/whirledclassic/whirled2/issues/1).
- Money: volunteer now. Credit always. Pay only if a world actually makes money and the maintainer can pay from that. [docs/ARTISTS.md](docs/ARTISTS.md).

---

## Map of this repo

```
.
├─ README.md                 ← you are here (both tracks)
├─ classic/                  ← revival of original Whirled / msoy
│   └─ README.md
├─ whirled2/                 ← new browser product
│   ├─ README.md
│   └─ SAME-AND-DIFFERENT.md
└─ docs/                     ← shared reference (links, setup, archives)
```

Shared reference (do not treat as either product):

1. [docs/SETUP.md](docs/SETUP.md) — two checklists, two machines
2. [docs/LINKS.md](docs/LINKS.md) — Grey Havens, Three Rings, wiki, museums
3. [docs/RELATED.md](docs/RELATED.md) — other people’s remakes
4. [CONTRIBUTING.md](CONTRIBUTING.md)

Classic deep pages (lab only):

- [docs/CLASSIC-LAB.md](docs/CLASSIC-LAB.md)
- [docs/VM-GUIDE.md](docs/VM-GUIDE.md)
- [docs/FIXES.md](docs/FIXES.md)
- [docs/FLASH-AND-RUFFLE.md](docs/FLASH-AND-RUFFLE.md)
- [docs/SOURCES.md](docs/SOURCES.md)

Whirled 2 deep pages:

- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/ARTISTS.md](docs/ARTISTS.md)

---

## How to help without mixing the tracks

| If you are… | Open a ticket labeled | Do not |
| --- | --- | --- |
| Pixi / TypeScript / VPS / room art | `whirled2` | paste msoy build logs |
| Java 8 / Ant / Flash / Ruffle / VM | `whirled` | PR a Flash wrapper into the public room |
| Unsure | comment on this README’s issues and ask | vendor `greyhavens/msoy` into this tree |

Roles that move the needle this month:

1. Commit the ugly Pixi room ([#1](https://github.com/whirledclassic/whirled2/issues/1))
2. One walk-cycle avatar ([#2](https://github.com/whirledclassic/whirled2/issues/2))
3. Room kit ([#3](https://github.com/whirledclassic/whirled2/issues/3))
4. Classic: keep the lab notes honest; do not publish the VM

---

## Legal / tone

- Do not upload original Whirled client binaries, leaked user data, or copyrighted Three Rings shop assets here.
- Do not ship crash-the-client avatars or malware furniture.
- Classic code stays in the VM. This repo documents how, and hosts the new client.

Issues: https://github.com/whirledclassic/whirled2/issues  
Contact: josh.awe99@gmail.com
