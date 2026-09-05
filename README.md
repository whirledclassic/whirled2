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
| Run it yourself | **[classic/SETUP.md](classic/SETUP.md)** + **[classic/VM-GUIDE.md](classic/VM-GUIDE.md)** | This repo, `whirled2/` when the room is committed |

Read this table first. Then pick a folder.

Maintainer: Josh (`whirledclassic` / josh.awe99@gmail.com)

**Not official Three Rings software.** Classic source was published by Grey Havens. Assets still belong to their owners. If a rights holder objects to the name, we rename. The work stays.

---

## Want to run original Whirled yourself?

Start here, in order:

1. **[classic/SETUP.md](classic/SETUP.md)** — clone list, Java 8, Ant, Postgres, build order (`msoyserver`)
2. **[classic/VM-GUIDE.md](classic/VM-GUIDE.md)** — one working machine (VirtualBox + Debian) so you are not guessing hardware
3. **[classic/CLASSIC-LAB.md](classic/CLASSIC-LAB.md)** — what actually boots and what fails
4. **[classic/FIXES.md](classic/FIXES.md)** — mapped greyhavens/msoy issues

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

**What did the original cost, and how would this even get funded?**  
[whirled2/PUBLIC.md](whirled2/PUBLIC.md) — published 2010 numbers (~$5M in / ~$300K out), why the community is the actual asset, crowdfunding rules, networking notes.

**Name collision:** [lulzsun/whirled2](https://github.com/lulzsun/whirled2) is someone else’s remake. Not this tree.

---

## Status (2026-09-04)

- **Classic:** stack is booting on a Debian 13 XFCE VM (VirtualBox, NAT, Java 8). Next step on this track is treating that box as a **private server**, not a screenshot museum. Guide for repeating the build: [classic/SETUP.md](classic/SETUP.md).
- **Whirled 2:** public repo is open. First ship is one click-to-walk room. That is [issue #1](https://github.com/whirledclassic/whirled2/issues/1).
- Money: volunteer now. Credit always. Pay only if a world actually makes money and the maintainer can pay from that. [whirled2/ARTISTS.md](whirled2/ARTISTS.md). Longer public note: [whirled2/PUBLIC.md](whirled2/PUBLIC.md).

---

## Map of this repo

```
.
├─ README.md                 ← you are here (both tracks)
├─ classic/                  ← original Whirled private-server revival + its guides
│   ├─ README.md
│   ├─ SETUP.md
│   ├─ VM-GUIDE.md
│   ├─ CLASSIC-LAB.md
│   ├─ FIXES.md
│   ├─ FLASH-AND-RUFFLE.md
│   ├─ SOURCES.md
│   ├─ LINKS.md
│   ├─ RELATED.md
│   └─ archive/
└─ whirled2/                 ← new browser product + its guides
    ├─ README.md
    ├─ SAME-AND-DIFFERENT.md
    ├─ ROADMAP.md
    ├─ ARTISTS.md
    └─ PUBLIC.md               ← money, community, crowdfunding, networking
```

There is no leftover `docs/` dump. Classic notes live under [`classic/`](classic/). Whirled 2 notes live under [`whirled2/`](whirled2/).

Root:

- [CONTRIBUTING.md](CONTRIBUTING.md)

Classic:

- [classic/SETUP.md](classic/SETUP.md) — self-host original Whirled (also has a short Whirled 2 checklist)
- [classic/VM-GUIDE.md](classic/VM-GUIDE.md)
- [classic/CLASSIC-LAB.md](classic/CLASSIC-LAB.md)
- [classic/FIXES.md](classic/FIXES.md)
- [classic/FLASH-AND-RUFFLE.md](classic/FLASH-AND-RUFFLE.md)
- [classic/SOURCES.md](classic/SOURCES.md)
- [classic/LINKS.md](classic/LINKS.md)
- [classic/RELATED.md](classic/RELATED.md)

Whirled 2:

- [whirled2/PUBLIC.md](whirled2/PUBLIC.md) — public: original cost, community, funding rules
- [whirled2/ROADMAP.md](whirled2/ROADMAP.md)
- [whirled2/ARTISTS.md](whirled2/ARTISTS.md)
- [whirled2/SAME-AND-DIFFERENT.md](whirled2/SAME-AND-DIFFERENT.md)

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
