# Field notes from people who shipped this class of world

Collected 2026-08-31 – 2026-09-03 from direct mail. **Paraphrased.** Not a dump of private inboxes. Names are used because they wrote as themselves. If someone wants a name pulled, open an issue.

These notes are **not official Three Rings documentation.** Treat them as field reports.

---

## Two tracks (do not mix the tickets)

| Label | What | Where |
| --- | --- | --- |
| `whirled` / classic | Original Flash + Java / msoy as a **private server** | Published source: [greyhavens/msoy](https://github.com/greyhavens/msoy). Not committed here. Guide: [SETUP.md](SETUP.md). |
| `whirled2` | New browser room | This repo. TypeScript + PixiJS. |

---

## David Hoover (msoy / Flash tooling, Three Rings era)

Mail, 2026-09-03. Useful caution. Not a veto.

- His one-line description of msoy: they made Roblox, a little too early, on the wrong stack.
- Flash was chosen because it was already on every machine — no client install. That bet aged badly.
- ActionScript was a poor fit for a software project. Artist tools and SWE revision control collided.
- Flash authoring files are giant binary blobs. Save twice, get two different files that are functionally the same.
- Simple proofs of concept worked. Anything fancy got painful fast.
- He would not personally recommend digging back into AS3 / old Flash as a *product* path ~15 years later.
- Nostalgia warning: people often miss the *friends and the hours*, not the exact client. Reviving the binary does not revive 2009.

**How to read that here:** you *can* run a private original-Whirled server from the published source. We do. SETUP.md is the path. Hoover’s view is that it is probably a bad idea as a *product* — painful stack, and the feeling you miss is not in the JAR. Take that as a heads-up, not a rule that you must not run it.

**What we still took for Whirled 2:** the public 2026 room is TypeScript + Pixi, not “keep shipping AS3 to strangers.”

Tools from that era he was asked about: grodd, flumpdroid, orth. Do not assume they still run.

---

## Kyler “Félix” Eastridge (FelixWolf/msoy, whirled-api fork)

Mail, 2026-09-01.

- He still wrestles this stack. Linux-first. Windows only in VMs.
- Ant on Windows is usually the same class of problem as his Docker setup, with different paths.
- Dead Maven bootstrap (`ooo-maven.googlecode.com`) and HTML files pretending to be jars in `dist/lib` are known pain.
- Present / dobj compile fights (`NamedEvent`, `ObserverList`, `PropertySetEvent`) show up when the Three Rings libraries are incomplete.
- Discord he gave for build help: `felix0536`.
- Public work: [FelixWolf/whirled-api](https://github.com/FelixWolf/whirled-api), FelixWolf/msoy, notes on softhyena.

**What we took:** stop fighting Ant on raw Windows. Linux VM + Ant is the path that actually booted.

---

## Andrew Frost (Harman / Wipro — Adobe AIR / Flash Player support)

Mail, 2026-09-03. Legal path only. No pirate player.

- Packaged / enterprise Flash Player is a **hefty license for HR/finance-style Flex apps**. Not meant for a hobby virtual world.
- Three options he named:
  1. Old **AIR SDK ~v19 or earlier** shipped a Flash Player binary. Those SDKs are old, vulnerable, and Adobe pulled the archives. Redistributing the SDK is likely a license problem.
  2. **Current AIR SDK**: port the AS3 app to run as AIR, not as browser Flash.
  3. **Ruffle** for Flash-in-browser games. He called it a reasonable option now.
- Forum: https://github.com/airsdk/Adobe-Runtime-Support/discussions

**What we took:** enterprise packaged player is off the table. Whirled 2 = Pixi. Classic client = the original stack on a private server. Ruffle is a question, not the W2 plan.

---

## Chip Morningstar (Habitat / Lessons of Habitat)

Mail, 2026-09-03.

- Called the revival “worthy” and pointed at **NeoHabitat**: a dead graphical world does not have to stay dead. https://neohabitat.org
- Intro to **Alex Handy**, MADE. alex@themade.org / https://www.themade.org

---

## Alex Handy (MADE)

Mail, 2026-09-03.

- Help lives in the MADE Discord. Invite: https://discord.gg/UEJZHSJDT
- Expect it to take a while.

---

## Julian Reyes (Virtual Worlds Museum)

Mail, 2026-09-03.

- Museum does **not** fund this project.
- They *will* list the effort on the existing Whirled exhibit page, including an ask-for-funds line.
- Volunteer help on that page is welcome. They move slow. Engage may be shutting down and is ahead of Whirled in their queue.
- Site: https://www.virtualworlds.museum/

---

## Endel Dreyer (Colyseus / game std)

Mail, 2026-09-02.

- Asked if we were on Discord. Brief offered: one Pixi click-to-walk room, websocket presence, Colyseus-shaped rooms.

---

## Francois Giraud (OVHcloud US Startup Program)

Mail, 2026-09-03.

- US-incorporated, active business; cloud-native startup; live domain + site.
- **VPS is not eligible.** Use a public-cloud instance with more networking features.
- Register: https://us.ovhcloud.com/startup-program/

---

## Notes from the machine (2026-09-02/03)

- OpenJDK **21** is why the first stack traces happened. msoy wants **Java 8**.
- Source lives under the msoy tree. Look for `MsoyClient.as`, GWT UI, room code.
- `ls bin` should show `msoyserver` after a real dist.
- Postgres: create the `msoy` role if it does not exist.
- Bridged + USB Wi-Fi knocked a Windows host offline once. NAT is safer for the VM.
- Do not publish VM hostnames, player dumps, or home-router ports on GitHub.

See [CLASSIC-LAB.md](CLASSIC-LAB.md) and [SETUP.md](SETUP.md).
