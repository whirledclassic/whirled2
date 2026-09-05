# Classic Whirled revival

**This folder is the original-project track.**  
Not Whirled 2. Not a browser remake.

Issue label: `whirled` / `classic`.

## Run the original server yourself

→ **[Self-host guide: docs/SETUP.md](../docs/SETUP.md)** (Track B — clone, Java 8, Ant, Postgres, `msoyserver`)  
→ **[Machine we actually used: docs/VM-GUIDE.md](../docs/VM-GUIDE.md)**  
→ **[What boots / what dies: docs/CLASSIC-LAB.md](../docs/CLASSIC-LAB.md)**

Those three pages are the whole path. Start at SETUP.

---

## What this track is

A **revival of original Whirled**: take the published Grey Havens `msoy` stack and run it as a **private server** so the 2007–2017 world is playable again — not only a screenshot.

Two jobs at once, on purpose:

1. **Host** — a private original-Whirled server for people we invite.
2. **Preserve** — keep that stack close to historic state (Java 8, original client, original protocols). We document the build so someone else can stand up *their* private server from the same public source.

Whirled was a Flash UGC social world (Three Rings). Grey Havens published the Java server. That tree is the artifact. Using published source to run a private instance is the point of this folder.

What success looks like:

1. `msoyserver` starts (Jetty, policy, game listen).
2. The original client can talk to that server.
3. We can run it as a **private world** (known players), not only on localhost.
4. Notes stay public so others can repeat the build. Binaries, player dumps, and shop packs stay off this GitHub.

What success is *not*:

- Claiming whirled.com
- Pretending this is official Three Rings ops
- Wrapping the old SWF and calling it Whirled 2

If you want a room strangers can open in Chrome with no Flash, that is [`../whirled2/`](../whirled2/).

Already-up community host (not this project): https://www.whirled.club

---

## What we use (cloned on the server box, not vendored here)

| Repo | Role |
| --- | --- |
| [greyhavens/msoy](https://github.com/greyhavens/msoy) | Server + clients |
| [greyhavens/whirled-sdk](https://github.com/greyhavens/whirled-sdk) | Creator APIs |
| [greyhavens/whirled-api](https://github.com/greyhavens/whirled-api) | API library |
| [greyhavens/whirled-projects](https://github.com/greyhavens/whirled-projects) | Example games / furni / avatars |
| [greyhavens/thane](https://github.com/greyhavens/thane) | Game server-agent VM |
| [threerings/narya](https://github.com/threerings/narya) | Distributed objects / crowd |
| [threerings/nenya](https://github.com/threerings/nenya) | 2D / iso |
| [threerings/vilya](https://github.com/threerings/vilya) | Virtual-world components |
| [FelixWolf/msoy](https://github.com/FelixWolf/msoy) | Fork still touching build scripts |

Wiki: https://wiki.whirled.club/wiki/Whirled

---

## Status (2026-09)

Debian 13 XFCE in VirtualBox (~3 GB RAM, NAT):

- **Java 8.** Not 17. Not 21.
- **Ant + Postgres + Linux.** Raw Windows dies on missing `egrep`.
- After `ant dist`, launcher is `bin/msoyserver` in the msoy tree.
- This box is the seed of the private server. SETUP + VM-GUIDE is how you copy it.

---

## Read in this order

1. [../docs/SETUP.md](../docs/SETUP.md) — **start here to run a server**
2. [../docs/VM-GUIDE.md](../docs/VM-GUIDE.md)
3. [../docs/CLASSIC-LAB.md](../docs/CLASSIC-LAB.md)
4. [../docs/FIXES.md](../docs/FIXES.md)
5. [../docs/FLASH-AND-RUFFLE.md](../docs/FLASH-AND-RUFFLE.md)
6. [../docs/SOURCES.md](../docs/SOURCES.md)

Issues: [#5](https://github.com/whirledclassic/whirled2/issues/5)–[#9](https://github.com/whirledclassic/whirled2/issues/9).

---

## Do not

- Commit player data, shop dumps, or original client binaries to this repo.
- File Pixi / avatar / VPS-for-Whirled-2 work on classic issues.
- Treat nostalgia as a spec. Hoover’s letter is in SOURCES.md.
