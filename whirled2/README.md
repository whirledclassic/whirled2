# Whirled 2

**This folder is the new product.**
Not a revival of the Flash client. Not a patch on `msoy`.

Issue label: `whirled2`.

Same-vs-different vs original Whirled: [SAME-AND-DIFFERENT.md](SAME-AND-DIFFERENT.md).

Public note — original cost, why community matters, crowdfunding rules, networking: [PUBLIC.md](PUBLIC.md).

Side-by-side with whirled.club and the private engine: [COMPARE.md](COMPARE.md).

---

## What this track is

A **new** browser world in the *spirit* of Whirled (2007–2017): your room, walk-around avatars, user-made stuff. No Flash.

Two pieces, still separate git trees:

- **Website chrome** — [`web-mock/`](web-mock/) in *this* repo. Tabs, register, login, profile, chat.
- **Room engine** — private `WhirledClassicGame`. PixiJS. Not copied here.

First public slice: people can register, log in, and talk in Studio Loft. The dashed stage is reserved for the engine.

---

## Run the website demo

```bash
git clone https://github.com/whirledclassic/whirled2.git
cd whirled2/whirled2/web-mock
node server/server.mjs
# http://127.0.0.1:8787/
```

Node 18+. No `npm install` for the demo server.

Offline art-only preview: open `web-mock/index.html` directly.

How the engine will sit in the page later: [web-mock/ENGINE-BRIDGE.md](web-mock/ENGINE-BRIDGE.md).
Hosting / database / sockets: [web-mock/NETWORKING.md](web-mock/NETWORKING.md).

---

## What it is not

| Guess | Reality |
| --- | --- |
| UI clone of 2010-era Whirled | No. Same verbs, new chrome and art |
| Ruffle wrapper around the old room SWF | No. Classic SWFs stay in the lab |
| Fork of [lulzsun/whirled2](https://github.com/lulzsun/whirled2) | No. Different owner, stack, license |
| The Java server with a new skin | No. New client. New tiny demo API |
| whirled.club | No. Different operators, different stack |

If you showed up to boot original msoy, go to [`../classic/`](../classic/).

---

## Status (2026-09-05)

- Website demo: register / login / profile / loft chat is in `web-mock/`.
- Engine: lives in the private game repo. Bunny-on-a-stage. Not merged.
- Next on this track: put `web-mock/server` on a small HTTPS box so friends can log in.
- Next on the engine track: `mountWhirledEngine(host)` into `#stage-slot`.

Art terms: [ARTISTS.md](ARTISTS.md). Volunteer now, credit always.

Roadmap: [ROADMAP.md](ROADMAP.md).

Money / community / crowdfunding: [PUBLIC.md](PUBLIC.md).
