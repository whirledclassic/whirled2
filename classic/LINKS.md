# Links that actually matter

Public URLs only. Last sweep: 2026-09-05.

This page is the **index**. How to stand the stacks up is in [SETUP.md](SETUP.md).

Private mail is not a source. Do not paste or summarize private emails here.

---

## This project (Whirled 2)

- Repo: https://github.com/whirledclassic/whirled2
- Issues (classic lab): https://github.com/whirledclassic/whirled2/issues?q=label%3Awhirled
- Issues (Whirled 2): https://github.com/whirledclassic/whirled2/issues?q=label%3Awhirled2
- Maintainer GitHub: https://github.com/whirledclassic

**Name collision:** [lulzsun/whirled2](https://github.com/lulzsun/whirled2) is a *different* project (Jimmy Quach, AGPL, Go + Node). Not this repo. See [RELATED.md](RELATED.md).

---

## Classic source — Grey Havens (Whirled / msoy)

Official trees Grey Havens published after Three Rings handed Whirled over. BSD on msoy. **Do not commit these trees into this repo.** Clone them in the lab VM.

| Repo | What it is |
| --- | --- |
| https://github.com/greyhavens/msoy | Server + GWT web + Flash world client. |
| https://github.com/greyhavens/whirled-sdk | APIs for avatars, toys, pets, games |
| https://github.com/greyhavens/whirled-api | Whirled API library |
| https://github.com/greyhavens/whirled-projects | Example avatars, toys, games, pets, furniture |
| https://github.com/greyhavens/thane | Modified Tamarin VM used to run game server agents |
| https://github.com/greyhavens | Org index |

Upstream build / status threads:

- https://github.com/greyhavens/msoy/issues/38
- https://github.com/greyhavens/msoy/issues/31
- https://github.com/greyhavens/msoy/issues/23
- https://github.com/greyhavens/msoy/issues/4
- https://github.com/greyhavens/msoy/issues/36
- https://github.com/greyhavens/msoy/issues/29

Grey Havens README for a local instance: copy `etc/*.dist` → `etc/test/*`, then `ant distall` and `./bin/msoyserver`. Documented local URL: `http://localhost:8080/` (lab only).

---

## Classic source — public forks

| Repo | What it is |
| --- | --- |
| https://github.com/FelixWolf/msoy | Public fork of msoy |
| https://github.com/FelixWolf/whirled-api | Public fork of whirled-api |
| https://softhyena.com/about.htm | Public site |

---

## Three Rings libraries

Build **narya → nenya → vilya** (and whirled-api) before blaming msoy.

| Repo | What it is |
| --- | --- |
| https://github.com/threerings | Three Rings org |
| https://github.com/threerings/narya | Distributed objects, RPC, crowd, chat, places |
| https://github.com/threerings/nenya | 2D / iso / 3D game components |
| https://github.com/threerings/vilya | MMO / virtual-world components |
| https://github.com/threerings/clyde | Networked 3D game packages |
| https://github.com/threerings/depot | Relational persistence |
| https://github.com/threerings/ooo-user | User-management code |
| https://github.com/threerings/maven-repo | Public Maven repo |
| https://github.com/threerings/tripleplay | PlayN utilities |

---

## Creator API / game SDK (Flash-era)

Reference only for Whirled 2. Do not ship SWFs in this repo.

- SDK: https://github.com/greyhavens/whirled-sdk
- API: https://github.com/greyhavens/whirled-api
- Examples: https://github.com/greyhavens/whirled-projects
- Wiki SDK page: https://wiki.whirled.club/wiki/Whirled_SDK
- Create games: https://wiki.whirled.club/wiki/Create_games
- Options for games: https://wiki.whirled.club/wiki/Options_for_games
- Upload: https://wiki.whirled.club/wiki/Upload

Old official asdocs at whirled.com are dead. Use the SDK source + wiki.

---

## Other remakes (not this repo)

Full notes: [RELATED.md](RELATED.md)

| Project | URL |
| --- | --- |
| lulzsun/whirled2 | https://github.com/lulzsun/whirled2 |
| pravatbhusal/html5-msoy | https://github.com/pravatbhusal/html5-msoy |
| Shadowsych archive | [archive/shadowsych-whirled-docs.md](archive/shadowsych-whirled-docs.md) |

---

## Community host and wiki

- https://www.whirled.club
- https://wiki.whirled.club/wiki/Whirled
- https://en.wikipedia.org/wiki/Whirled

Official whirled.com is gone (2017).

---

## Museums / preservation (public sites)

- Wikipedia: https://en.wikipedia.org/wiki/Whirled
- Virtual Worlds Museum exhibit: https://virtualworlds.museum/exhibits/whirled
- Virtual Worlds Museum: https://www.virtualworlds.museum/
- NeoHabitat: https://neohabitat.org
- MADE: https://www.themade.org
- XR Guild: https://www.xrguild.org/
- Virtual World Society: https://www.virtualworldsociety.org/

---

## Flash / AIR / Ruffle

- Ruffle: https://github.com/ruffle-rs/ruffle
- AIR runtime discussions: https://github.com/airsdk/Adobe-Runtime-Support/discussions
- See [FLASH-AND-RUFFLE.md](FLASH-AND-RUFFLE.md)

---

## Hosting

- OVH US startup program (public page): https://us.ovhcloud.com/startup-program/

---

## What not to treat as a source

- Private emails, paraphrases of private emails, or personal addresses.
- Localhost URLs mailed to strangers.
- Original whirled.com shop dumps, leaked member DBs, or redistributed Flash Player / AIR SDK binaries.
