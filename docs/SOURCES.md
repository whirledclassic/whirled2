# Field notes from people who shipped this class of world

Collected 2026-08-31 – 2026-09-03 from direct mail. **Paraphrased.** Not a dump of private inboxes. Names are used because they wrote as themselves. If someone wants a name pulled, open an issue.

These notes are **not official Three Rings documentation.** Treat them as field reports.

---

## Two tracks (do not mix the tickets)

| Label | What | Where |
| --- | --- | --- |
| `whirled` / classic lab | Original Flash + Java / msoy | Local Linux. Source: [greyhavens/msoy](https://github.com/greyhavens/msoy). Not committed here. |
| `whirled2` | New browser room | This repo. TypeScript + PixiJS. |

Classic is the museum piece. Whirled 2 is how people show up without Flash.

---

## David Hoover (msoy / Flash tooling, Three Rings era)

Mail, 2026-09-03. The most useful warning in the pile.

- His one-line description of msoy: they made Roblox, a little too early, on the wrong stack.
- Flash was chosen because it was already on every machine — no client install. That bet aged badly.
- ActionScript was a poor fit for a software project. Artist tools and SWE revision control collided.
- Flash authoring files are giant binary blobs. Save twice, get two different files that are functionally the same. Unzipping the XFL/XML and treating that as source still drifted.
- Simple proofs of concept worked. Anything fancy got painful fast.
- He would not personally recommend digging back into AS3 / old Flash as a *product* path ~15 years later.
- Nostalgia warning: people often miss the *friends and the hours*, not the exact client. Reviving the binary does not revive 2009.

**What we took:** public product is TypeScript + Pixi, not “keep shipping AS3.” Classic msoy stays a locked-down lab so the old client is not only a screenshot.

Tools from that era he was asked about: grodd, flumpdroid, orth — Flash-adjacent Three Rings tooling. Do not assume they still run.

---

## Kyler “Félix” Eastridge (FelixWolf/msoy, whirled-api fork)

Mail, 2026-09-01.

- He still wrestles this stack. Linux-first. Windows only in VMs.
- Ant on Windows is usually the same class of problem as his Docker setup, with different paths.
- Dead Maven bootstrap (`ooo-maven.googlecode.com`) and HTML files pretending to be jars in `dist/lib` are known pain.
- Present / dobj compile fights (`NamedEvent`, `ObserverList`, `PropertySetEvent`) show up when the Three Rings libraries are incomplete.
- Discord he gave for build help: `felix0536`.
- Public work: [FelixWolf/whirled-api](https://github.com/FelixWolf/whirled-api), FelixWolf/msoy, notes on softhyena.

**What we took:** stop fighting Ant on raw Windows. Linux VM + Ant is the path that actually booted the lab.

---

## Andrew Frost (Harman / Wipro — Adobe AIR / Flash Player support)

Mail, 2026-09-03. Legal path only. No pirate player.

- Packaged / enterprise Flash Player is a **hefty license for HR/finance-style Flex apps**. Not meant for a hobby virtual world.
- Three options he named:
  1. Old **AIR SDK ~v19 or earlier** shipped a Flash Player binary. You can wrap a page in an HTML-based AIR app. Those SDKs are old, vulnerable, and Adobe pulled the archives. Redistributing the SDK is likely a license problem. Using a copy you already had is a different question — still lock it down.
  2. **Current AIR SDK**: port the AS3 app to run as AIR, not as browser Flash. Some source changes.
  3. **Ruffle** for Flash-in-browser games. He called it a reasonable option now.
- Forum for AIR runtime questions: https://github.com/airsdk/Adobe-Runtime-Support/discussions

**What we took:** enterprise packaged player is off the table. Public path = Pixi. Classic client = lab. Ruffle is a *question*, not the product plan.

Kongregate support (ticket 613825) bounced a Ruffle-sponsor ask to `marketing@kongregate.com`. Developer support (ticket 613833) will not recruit Flash-era artists through that desk.

---

## Chip Morningstar (Habitat / Lessons of Habitat)

Mail, 2026-09-03.

- Called the revival “worthy” and pointed at **NeoHabitat** as the existence proof: a dead graphical world does not have to stay dead. https://neohabitat.org
- Intro to **Alex Handy**, Museum of Art and Digital Entertainment (MADE), Oakland — the museum that organized / hosts NeoHabitat. alex@themade.org / https://www.themade.org

**What we took:** classic lab = artifact. Whirled 2 = how people arrive in 2026. Same split NeoHabitat already proved.

---

## Alex Handy (MADE)

Mail, 2026-09-03.

- Help lives in the MADE Discord, not a long email thread. Invite he sent: https://discord.gg/UEJZHSJDT
- Expect it to take a while. The people who can help are in there.

---

## Julian Reyes (Virtual Worlds Museum)

Mail, 2026-09-03.

- Museum does **not** fund or grant this project.
- They *will* list the effort on the existing Whirled exhibit page (2007–2017, Three Rings), including an ask-for-funds line that leans on their brand for visibility.
- Volunteer help on that page is welcome. They move slow. **Engage** may be shutting down and is ahead of Whirled in their queue.
- Possible later: share grants research; video meet.
- Site: https://www.virtualworlds.museum/

**What we took:** listing + volunteer exhibit work. Not a grant.

---

## Endel Dreyer (Colyseus / game std)

Mail, 2026-09-02.

- Asked if we were on Discord. Brief he was offered: one Pixi click-to-walk room, websocket presence, Colyseus-shaped rooms.

**What we took:** multiplayer room shape is “Colyseus-like presence,” not a promise that Colyseus is the final server.

---

## Francois Giraud (OVHcloud US Startup Program)

Mail, 2026-09-03.

Eligibility as written:

- US-incorporated, active business
- Cloud-native startup (not NPO / gov / education / marketing / consulting / software house)
- Live domain + live website
- **VPS is not eligible.** Use a public-cloud *instance* with more networking features.

Register: https://us.ovhcloud.com/startup-program/

**What we took:** do not file until there is an entity and a live site. Until then, pay list price for a small public-cloud instance when the room needs HTTPS. No home ports.

---

## Pam Griffith (Metaplace)

Mail, 2026-09-02.

- Cannot contribute time. Thought the project was cool. Localhost links are useless to anyone else — send a public URL.
- Metaplace → Playdom history is a sibling of “browser UGC world that went away.”

---

## Jason Scott (textfiles / Internet Archive)

Mail, 2026-09-02.

- Sent a Discord friend request after the first note. Public handle people know: SketchCow / textfiles.
- Frame is software preservation, not a grant ask to IA.

---

## Lab facts from the machine (maintainer notes, 2026-09-02/03)

These are from the Linux lab, not from a vendor.

- OpenJDK **21** is why the first stack traces happened. Whirled / msoy wants **Java 8**.
- Source lives under the msoy tree (example lab path shape: `~/src/msoy`), not a random Desktop folder. Look for `MsoyClient.as`, GWT UI, room code.
- `ls bin` should show `msoyserver` after a real dist.
- Start path shape: `.../msoy/bin/msoyserver` after `chmod` if needed.
- Postgres is part of the classic stack. Create the `msoy` role if it does not exist.
- Bridged networking + USB Wi-Fi knocked a Windows host offline once. NAT is safer for the VM.
- Do not publish VM hostnames, player dumps, or home ports.

See [CLASSIC-LAB.md](CLASSIC-LAB.md).
