# Flash, AIR, Ruffle — what is actually allowed

Classic Whirled's room client is Flash / AS3. The public 2026 product in this repo is **not**. This page exists so nobody “solves” Whirled 2 by smuggling a player.

---

## Decision

| Path | Status |
| --- | --- |
| Enterprise packaged Flash Player (Adobe/Harman) | No. That product line is licensed for corporate Flex / enterprise apps, not a hobby virtual world. |
| Old AIR SDK (≤ ~v19) with bundled player | Lab curiosity only. Vulnerable. Adobe pulled archives. Do not redistribute the SDK. |
| Current AIR SDK, port AS3 to AIR | Possible later for a *packaged museum client*. Not the public site. |
| Ruffle | Open question for *classic* SWFs. Not the Whirled 2 renderer. |
| TypeScript + Pixi (this repo) | Public path. |

Public discussion of current AIR / runtime support: https://github.com/airsdk/Adobe-Runtime-Support/discussions

---

## Why not “just run the SWF”

The public product path is a new TypeScript + Pixi room because:

- Flash Player is gone from browsers.
- FLA/XFL authoring files are hostile to git.
- Wrapping the old client is a different project from shipping a URL anyone can open.

That is why Whirled 2 redraws the room instead of wrapping the old client.

---

## Ruffle

Ruffle is the honest browser path for *a lot* of old Flash games. A full UGC social world (avatars, rooms, shop, sockets) is a harder test than a single SWF on Kongregate.

Ask that is still open: can a Whirled-class room client live on Ruffle, or is that a dead product path?

- https://github.com/ruffle-rs/ruffle

Do not treat a silent inbox as a yes.

---

## What this repo will not host

- Leaked or redistributed Flash Player / AIR SDK bits
- Original Three Rings shop SWFs, avatar packs, or user content dumps
- Private emails or paraphrases of private emails
- Crash-the-client avatars (the old drama). History is in the wiki and in people's heads. Do not recreate it.
