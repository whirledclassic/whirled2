# Flash, AIR, Ruffle — what is actually allowed

Classic Whirled’s room client is Flash / AS3. The public 2026 product in this repo is **not**. This page exists so nobody “solves” Whirled 2 by smuggling a player.

---

## Decision

| Path | Status |
| --- | --- |
| Enterprise packaged Flash Player (Adobe/Harman) | No. License is for corporate Flex/HR/finance. Hefty fee. |
| Old AIR SDK (≤ ~v19) with bundled player | Lab curiosity only. Vulnerable. Adobe pulled archives. Do not redistribute the SDK. |
| Current AIR SDK, port AS3 to AIR | Possible later for a *packaged museum client*. Not the public site. |
| Ruffle | Open question for *classic* SWFs. Not the Whirled 2 renderer. |
| TypeScript + Pixi (this repo) | Public path. |

Source for the first three rows: Andrew Frost, Harman/Wipro Adobe Runtime support, 2026-09-03. Forum: https://github.com/airsdk/Adobe-Runtime-Support/discussions

---

## Why not “just run the SWF”

David Hoover (msoy tooling, 2026-09-03):

- AS3 + Flash authoring was a bad software-engineering stack even when Flash was everywhere.
- FLA/XFL output is hostile to git. Binary blobs that change when you breathe on Save.
- Artist tools and SWE process never really met in the middle.

That is why Whirled 2 redraws the room instead of wrapping the old client.

---

## Ruffle

Ruffle is the honest browser path for *a lot* of old Flash games. A full UGC social world (avatars, rooms, shop, sockets) is a harder test than a single SWF on Kongregate.

Ask that is still open: can a Whirled-class room client live on Ruffle, or is that a dead product path?

- https://github.com/ruffle-rs/ruffle
- Kongregate is listed as a Ruffle sponsor. Their *support* desk will not review that question. Ticket 613825 was bounced to marketing@kongregate.com.

Do not treat a silent marketing inbox as a yes.

Flashpoint (BlueMaxima) splits the world the other way: Ruffle in the browser, offline plugin path kept. If you write them, ask for that split in writing — not “please ingest this catalog.”

---

## What this repo will not host

- Leaked or redistributed Flash Player / AIR SDK bits
- Original Three Rings shop SWFs, avatar packs, or user content dumps
- Crash-the-client avatars (the old drama). History is in the wiki and in people’s heads. Do not recreate it.
