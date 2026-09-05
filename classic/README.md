# Classic Whirled revival

**This folder is the original-project track.**  
Not Whirled 2. Not a browser remake. Not a public host.

Issue label: `whirled` / `classic`.

---

## What this track is

Revive **the actual 2007–2017 Whirled** as a private lab so the world is more than a Wikipedia page.

Whirled was a Flash UGC social world (Three Rings). Grey Havens published the Java `msoy` server as BSD-ish source. That tree is the artifact.

Goal, in one sentence: **boot the original Flash + Java stack on a local Linux machine.**

What success looks like:

1. `msoyserver` starts (Jetty, policy, game listen).
2. The original client can talk to that server **on the same machine**.
3. Notes stay public. Binaries, player data, and shop dumps stay off GitHub.

What success is *not*:

- Putting the lab on the public internet
- Claiming whirled.com
- Wrapping the old SWF and calling it Whirled 2

If you want a room strangers can open in Chrome in 2026, leave this folder and go to [`../whirled2/`](../whirled2/).

---

## What we use (cloned in the VM, not vendored here)

| Repo | Role |
| --- | --- |
| [greyhavens/msoy](https://github.com/greyhavens/msoy) | Server + clients (“What in the Whirled is this?”) |
| [greyhavens/whirled-sdk](https://github.com/greyhavens/whirled-sdk) | Creator APIs (avatars, toys, pets, games) |
| [greyhavens/whirled-api](https://github.com/greyhavens/whirled-api) | API library |
| [greyhavens/whirled-projects](https://github.com/greyhavens/whirled-projects) | Example games / furni / avatars |
| [greyhavens/thane](https://github.com/greyhavens/thane) | Game server-agent VM |
| [threerings/narya](https://github.com/threerings/narya) | Distributed objects / crowd |
| [threerings/nenya](https://github.com/threerings/nenya) | 2D / iso |
| [threerings/vilya](https://github.com/threerings/vilya) | Virtual-world components |
| [FelixWolf/msoy](https://github.com/FelixWolf/msoy) | Fork still touching build scripts |

Play today without building: https://www.whirled.club  
Wiki: https://wiki.whirled.club/wiki/Whirled

---

## Status (lab, 2026-09)

Confirmed on Debian 13 XFCE in VirtualBox (NAT, ~3 GB RAM):

- **Java 8.** Not 17. Not 21.
- **Ant + Postgres + Linux.** Raw Windows dies on missing `egrep`.
- After a real `ant dist`, launcher is `bin/msoyserver` inside the msoy tree.
- Host OS in *this* lab happened to be Windows 7. Any host that can run VirtualBox is fine. Bridged + USB Wi-Fi once knocked the host offline; stay on NAT.

---

## Read in this order

1. [../docs/SETUP.md](../docs/SETUP.md) — Track B checklist, clone list, build order
2. [../docs/VM-GUIDE.md](../docs/VM-GUIDE.md) — how this lab was stood up
3. [../docs/CLASSIC-LAB.md](../docs/CLASSIC-LAB.md) — what actually boots
4. [../docs/FIXES.md](../docs/FIXES.md) — mapped greyhavens/msoy issues
5. [../docs/FLASH-AND-RUFFLE.md](../docs/FLASH-AND-RUFFLE.md) — why the public site is not a player
6. [../docs/SOURCES.md](../docs/SOURCES.md) — notes from people who shipped this class of world

Related issues on this repo: [#5](https://github.com/whirledclassic/whirled2/issues/5) – [#9](https://github.com/whirledclassic/whirled2/issues/9).

---

## Do not

- Open the lab to the internet.
- Commit player data, shop dumps, or original client binaries.
- Treat nostalgia as a spec. Hoover’s letter is in SOURCES.md.
- File Pixi / avatar / VPS work in this folder’s issues.
