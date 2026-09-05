# Whirled 2 vs original Whirled

Question we kept getting: *“w2 is inspired by the original, but what is the same and what is different? Is it a UI clone?”*

Short answer: **inspired product, not a UI clone, not a source port.**

---

## Same (the idea we are keeping)

These are the verbs. They are why the name is related.

- You have a **room** that is yours.
- You **walk around** in that room (click-to-walk first).
- Other people can **visit** (multiplayer comes after a single playable room).
- People can **make things** that live in rooms (furniture, avatars, later games).
- It should feel like a toybox social space, not a feed and not a battle royale.

That is the contract with anyone who remembers Whirled.

---

## Different (on purpose)

| Piece | Original Whirled (2007–2017) | Whirled 2 |
| --- | --- | --- |
| Room client | Flash / AS3 SWF | TypeScript + PixiJS canvas |
| Site chrome | GWT / Java web | Ordinary web app, later |
| Server | Java `msoy` + thane + crowd | New, small. Not a fork of msoy |
| Creator pipeline | Flash CS + whirled-sdk `.swf` / `.abc` | Browser-native assets we own |
| Shop / avatars | Original catalog + user SWFs | Original art only. No ripped shop |
| Public network | whirled.com (gone) | VPS + HTTPS when ready |
| UI pixels | 2007–2010 Three Rings chrome | Not a skin of that UI |
| 3D | Not the product | Off the table until 2D is fun |
| Crash-the-client avatars | Happened. Do not repeat | Banned |

---

## Is it a UI clone?

**No.**

A UI clone would mean we redraw the old header, shop drawer, coin meter, and room chrome and call it done. That is not the first milestone and it is not the design brief.

First milestone is spatial: floor, click, camera follows. Chrome is invented after walk works. Art direction (when it exists) is high-contrast editorial toybox — not a recreation of the 2010 skin.

If someone later wants a *museum skin* that *looks* like 2010, that is a theme pack on top of this client, not the default, and it still cannot ship Three Rings assets.

---

## Is it a revival of the original project?

**No. That is the other folder.**

Revival of original Whirled / msoy = [`../classic/`](../classic/). Same maintainer. Different machine, different compiler, different risk.

Whirled 2 does not wait for Flash, Ruffle, AIR, or a clean `ant distall` to become a public product. Those questions belong to Classic.

---

## Why both exist

- Classic answers: *can the artifact still boot?*
- Whirled 2 answers: *can a stranger join a room in 2026 without a plugin?*

NeoHabitat already proved a dead graphical world does not have to stay dead. Classic is our artifact track. Whirled 2 is how people actually show up.
