# Classic Whirled revival

**This folder is the original-project track.**  
Not Whirled 2. Not a browser remake.

Issue label: `whirled` / `classic`.

## Run the original server yourself

→ **[Self-host guide: SETUP.md](SETUP.md)** (Track B — clone, Java 8, Ant, Postgres, `msoyserver`)  
→ **[Machine we actually used: VM-GUIDE.md](VM-GUIDE.md)**  
→ **[What boots / what dies: CLASSIC-LAB.md](CLASSIC-LAB.md)**

Those three pages are the whole path. Start at SETUP. You can run a private server. We are.

Also in this folder:

- [FIXES.md](FIXES.md) — mapped greyhavens/msoy issues
- [FLASH-AND-RUFFLE.md](FLASH-AND-RUFFLE.md)
- [LINKS.md](LINKS.md)
- [RELATED.md](RELATED.md)
- [SOURCES.md](SOURCES.md) — public sources only
- [archive/README.md](archive/README.md)

---

## What this track is

A **revival of original Whirled**: published Grey Havens `msoy`, run as a **private server**, historic stack kept intact.

1. **Host** — private original-Whirled for people we invite.
2. **Preserve** — Java 8, original client, original protocols. Document the build so someone else can stand one up too.

What success looks like:

1. `msoyserver` starts.
2. The original client can talk to that server.
3. It can be a **private world**, not only localhost.
4. Notes stay public. Player dumps, shop packs, and private mail stay off this GitHub.

What success is *not*: claiming whirled.com, pretending this is official Three Rings, wrapping the SWF and calling it Whirled 2.

Browser / no-Flash product: [`../whirled2/`](../whirled2/).  
Community host already up (not us): https://www.whirled.club

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

---

## Status (2026-09)

Debian 13 XFCE in VirtualBox (~3 GB RAM, NAT): Java 8, Ant, Postgres. Launcher is `bin/msoyserver`. SETUP + VM-GUIDE is how you copy it.

---

## Keep off this GitHub

Player data, shop dumps, original client binaries, and private correspondence. File Pixi / W2 VPS work on `whirled2` issues, not here.
