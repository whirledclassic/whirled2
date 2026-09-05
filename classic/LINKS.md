# Links that actually matter

Public URLs only. Last sweep: 2026-09-04.

This page is the **index**. How to stand the stacks up is in [SETUP.md](SETUP.md).

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
| https://github.com/greyhavens/msoy | Server + GWT web + Flash world client. “What in the Whirled is this?” |
| https://github.com/greyhavens/whirled-sdk | APIs for avatars, toys, pets, games (the creator SDK) |
| https://github.com/greyhavens/whirled-api | Whirled API library (ActionScript + Java side) |
| https://github.com/greyhavens/whirled-projects | Example avatars, toys, games, pets, furniture |
| https://github.com/greyhavens/thane | Modified Tamarin VM used to run game server agents |
| https://github.com/greyhavens | Org index (also Bang! Howdy, greyweb, etc.) |

Upstream build / status threads:

- https://github.com/greyhavens/msoy/issues/38 — Error on building whirled (2026)
- https://github.com/greyhavens/msoy/issues/31 — is whirled.com shutting down (2017)
- https://github.com/greyhavens/msoy/issues/23 — “We’re not in Kansas…” (clients not built)
- https://github.com/greyhavens/msoy/issues/4 — Windows `egrep` / CreateProcess
- https://github.com/greyhavens/msoy/issues/36 — spaces in paths break conf files
- https://github.com/greyhavens/msoy/issues/29 — parlor / bureau notes (pravatbhusal)

Grey Havens README for running a local instance: copy `etc/*.dist` → `etc/test/*`, then `ant distall` and `./bin/msoyserver`. Local URL they documented: `http://localhost:8080/` (lab only).

---

## Classic source — forks still touching the stack

| Repo | What it is |
| --- | --- |
| https://github.com/FelixWolf/msoy | Kyler “Félix” Eastridge fork of msoy (build scripts still get love) |
| https://github.com/FelixWolf/whirled-api | Fork of greyhavens/whirled-api |
| https://softhyena.com/about.htm | Félix’s site / contact |

---

## Three Rings libraries the classic stack sits on

msoy does not build in a vacuum. These are the distributed-object / crowd / 2D / world libraries. Build **narya → nenya → vilya** (and whirled-api) before blaming msoy.

| Repo | What it is |
| --- | --- |
| https://github.com/threerings | Three Rings org (59+ repos) |
| https://github.com/threerings/narya | Distributed objects, RPC, crowd, chat, places |
| https://github.com/threerings/nenya | 2D / iso / 3D game components |
| https://github.com/threerings/vilya | MMO / virtual-world components |
| https://github.com/threerings/clyde | Networked 3D game packages |
| https://github.com/threerings/depot | Relational persistence |
| https://github.com/threerings/ooo-user | OOO / Grey Havens user-management code |
| https://github.com/threerings/maven-repo | Public Maven repo for OOO artifacts |
| https://github.com/threerings/tripleplay | PlayN utilities (sibling games, not required for msoy) |

Maven coordinates people still hit: `com.threerings:narya` on Central (old 1.15 from 2015; newer 1.17–1.19 exist — **classic msoy wants the era it was built against**, not “latest”).

---

## Creator API / game SDK (Flash-era)

These are how parlor games, AVRGs, avatars, and furniture talked to the world. Reference only for Whirled 2. Do not ship SWFs in this repo.

### Source

- SDK tree: https://github.com/greyhavens/whirled-sdk
- API tree: https://github.com/greyhavens/whirled-api
- Example games / furni / avatars: https://github.com/greyhavens/whirled-projects
- Example games folder: https://github.com/greyhavens/whirled-projects/tree/master/games

### Wiki (still the best written API docs)

- Whirled SDK page + 0.67 zip: https://wiki.whirled.club/wiki/Whirled_SDK
- Historical SDK zip (MediaFire, community-hosted): https://www.mediafire.com/file/pjpp7j659ap3brc/whirled_sdk_0.67.zip
- Create games: https://wiki.whirled.club/wiki/Create_games
- Options for games (SWF client, ABC server agent, splash, launchers): https://wiki.whirled.club/wiki/Options_for_games
- Upload flow: https://wiki.whirled.club/wiki/Upload
- GameControl / `isConnected()` is the first check every parlor SWF made

Key ActionScript surface (names only — read the wiki / asdocs, do not copy binaries here):

- `com.whirled.game.GameControl` — parlor / table games
- Furni / avatar / pet / toy controls in the SDK `libraries/whirled` tree
- Server agents: ActionScript compiled to `.abc`, run inside **thane**

Old official asdocs lived at `http://www.whirled.com/code/asdocs/` — that host is dead. Use the SDK source + wiki.

---

## Other remakes (not this repo)

Full notes: [RELATED.md](RELATED.md)

| Project | URL | Stack |
| --- | --- | --- |
| lulzsun/whirled2 | https://github.com/lulzsun/whirled2 | Go + Node + proto + Flash leftovers. Demo: https://whirled.jimmyqua.ch/ |
| pravatbhusal/html5-msoy | https://github.com/pravatbhusal/html5-msoy | React + Django / Pixi notes. MIT |
| Shadowsych msoy / Synced docs | [archive/shadowsych-whirled-docs.md](archive/shadowsych-whirled-docs.md) | Ubuntu 14.04 dedicated-box recipe |

---

## Community host and wiki (live world, not our code)

- https://www.whirled.club — community mirror / client after Flash died
- https://wiki.whirled.club/wiki/Whirled
- https://wiki.whirled.club/wiki/Frequently_asked_questions
- https://wiki.whirled.club/wiki/Starting_out
- https://wiki.whirled.club/wiki/Create_Whirleds
- In-world mail (not email): https://www.whirled.club/go/mail

Official whirled.com is gone (site dissolved 2017).

History / mirrors (Synced Online, Glowbe, UnWhirled): https://en.wikipedia.org/wiki/Whirled

---

## Museums / preservation

- Wikipedia: https://en.wikipedia.org/wiki/Whirled
- Virtual Worlds Museum exhibit: https://virtualworlds.museum/exhibits/whirled
- Virtual Worlds Museum home: https://www.virtualworlds.museum/
- NeoHabitat (Chip Morningstar pointed here): https://neohabitat.org
- MADE — Museum of Art and Digital Entertainment: https://www.themade.org
- MADE Discord (Alex Handy, 2026-09-03): https://discord.gg/UEJZHSJDT
- XR Guild: https://www.xrguild.org/
- Virtual World Society: https://www.virtualworldsociety.org/

---

## Flash / AIR / Ruffle (lab questions, not the product)

- Ruffle: https://github.com/ruffle-rs/ruffle
- AIR runtime discussions: https://github.com/airsdk/Adobe-Runtime-Support/discussions
- See [FLASH-AND-RUFFLE.md](FLASH-AND-RUFFLE.md)

---

## Hosting

- OVH US startup program (VPS **not** eligible; need a public-cloud instance + US entity + live site): https://us.ovhcloud.com/startup-program/

---

## Sibling worlds / context

- Overte (self-hosted UGC worlds, different stack): https://overte.org

---

## What not to treat as a source

- Localhost URLs (`127.0.0.1:8080`) mailed to strangers. They only load on the lab box.
- Job-board and merch inboxes. Bounces are not feedback.
- Original whirled.com shop dumps, leaked member DBs, or redistributed Flash Player / AIR SDK binaries.
