# Two projects, one front door

This GitHub account runs **two separate efforts**. They share a name family and a history. They do **not** share a codebase, a renderer, or a deploy target.

| | **Classic Whirled revival** | **Whirled 2** |
| --- | --- | --- |
| Folder | [`classic/`](classic/) | [`whirled2/`](whirled2/) |
| Goal | **Private server of the original 2007–2017 world** — playable, historic stack kept intact | Build a **new public world people can join in a normal browser** |
| Source of truth | Grey Havens / Three Rings trees (`msoy`, SDK, narya…). Source is already public. | Original TypeScript + PixiJS in this repo |
| Client | Original Flash / AS3 room client | New 2D canvas. Not a SWF wrapper |
| Server | Original Java `msoyserver` on a box we control | New, small, later. Not a patch on msoy |
| Network | Private server (invite / known players). Not whirled.com | Cheap VPS + HTTPS when the room exists |
| Issue label | `whirled` / `classic` | `whirled2` |
| Run it yourself | **[docs/SETUP.md](docs/SETUP.md)** (Track B) + **[docs/VM-GUIDE.md](docs/VM-GUIDE.md)** | This repo, `whirled2/` when the room is committed |

Read this table first. Then pick a folder.

Maintainer: Josh (`whirledclassic` / josh.awe99@gmail.com)

**Not official Three Rings software.** Classic source was published by Grey Havens. Assets still belong to their owners. If a rights holder objects to the name, we rename. The work stays.

---

## Want to run original Whirled yourself?

Start here, in order:

1. **[docs/SETUP.md](docs/SETUP.md)** — clone list, Java 8, Ant, Postgres, build order (`msoyserver`)
2. **[docs/VM-GUIDE.md](docs/VM-GUIDE.md)** — one working machine (VirtualBox + Debian) so you are not guessing hardware
3. **[docs/CLASSIC-LAB.md](docs/CLASSIC-LAB.md)** — what actually boots and what fails
4. **[docs/FIXES.md](docs/FIXES.md)** — mapped greyhavens/msoy issues

That is the self-host path for a **private original server**. Folder overview: [`classic/`](classic/).

Already-running community world (not us): [whirled.club](https://www.whirled.club).

---

## Direct answers

**Is Whirled 2 a UI clone of original Whirled?**  
No. Same *product idea* — your room, walk-around avatars, user-made stuff — not a pixel-for-pixel Flash skin. See [whirled2/SAME-AND-DIFFERENT.md](whirled2/SAME-AND-DIFFERENT.md).

**Where is the revival of the original project?**  
[`classic/`](classic/). We boot Grey Havens `msoy` and intend to **host a private server** of that historic stack — same Java + Flash world, kept as close to the 2007–2017 state as we can. It is a revival *and* a preservation project. It is not a claim on whirled.com and it is not Whirled 2.

**Why two tracks?**  
Classic = the artifact, privately hosted. Whirled 2 = a 2026 browser room that does not need Flash. Different compilers, different risk, same maintainer.

**Name collision:** [lulzsun/whirled2](https://github.com/lulzsun/whirled2) is someone else’s remake. Not this tree.

---

## Status (2026-09-04)

- **Classic:** stack is booting on a Debian 13 XFCE VM (VirtualBox, NAT, Java 8). Next step on this track is treating that box as a **private server**, not a screenshot museum. Guide for repeating the build: [docs/SETUP.md](docs/SETUP.md).
- **Whirled 2:** public repo is open. First ship is one click-to-walk room. That is [issue #1](https://github.com/whirledclassic/whirled2/issues/1).
- Money: volunteer now. Credit always. Pay only if a world actually makes money and the maintainer can pay from that. [docs/ARTISTS.md](docs/ARTISTS.md).

---

## Map of this repo

```
.
├─ README.md                 ← you are here (both tracks)
├─ classic/                  ← original Whirled private-server revival
│   └─ README.md
├─ whirled2/                 ← new browser product
│   ├─ README.md
│   └─ SAME-AND-DIFFERENT.md
└─ docs/                     ← shared reference + self-host guide
```

Shared:

1. [docs/SETUP.md](docs/SETUP.md) — **self-host original Whirled** + Whirled 2 checklist
2. [docs/LINKS.md](docs/LINKS.md)
3. [docs/RELATED.md](docs/RELATED.md)
4. [CONTRIBUTING.md](CONTRIBUTING.md)

Classic:

- [docs/VM-GUIDE.md](docs/VM-GUIDE.md)
- [docs/CLASSIC-LAB.md](docs/CLASSIC-LAB.md)
- [docs/FIXES.md](docs/FIXES.md)
- [docs/FLASH-AND-RUFFLE.md](docs/FLASH-AND-RUFFLE.md)
- [docs/SOURCES.md](docs/SOURCES.md)

Whirled 2:

- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/ARTISTS.md](docs/ARTISTS.md)

---

## How to help without mixing the tracks

| If you are… | Open a ticket labeled | Do not |
| --- | --- | --- |
| Pixi / TypeScript / VPS / room art | `whirled2` | paste msoy build logs |
| Java 8 / Ant / Flash / private-server ops | `whirled` | PR a Flash wrapper into the public room |
| Unsure | ask | vendor `greyhavens/msoy` into this tree |

---

## Legal / tone

- Grey Havens published the server source. We use that. We do not upload leaked player databases, ripped shop packs, or copyrighted Three Rings art to this GitHub.
- Do not ship crash-the-client avatars.
- Private server ≠ claiming the old domain. We are not whirled.com.

Issues: https://github.com/whirledclassic/whirled2/issues  
Contact: josh.awe99@gmail.com
