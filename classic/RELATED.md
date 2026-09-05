# Related work — not this project

These are other people’s trees. We did not write them. They are listed so the trail does not die.

## lulzsun/whirled2 (Jimmy Quach)

- Repo: https://github.com/lulzsun/whirled2
- Demo: https://whirled.jimmyqua.ch/
- License: AGPL-3.0
- Stack: Node 18.14.2+ and Go 1.21+, protobuf, `web/` + `game/` + `api/` + leftover `flash/`
- Dev start they document:

```bash
git clone --recurse-submodules https://github.com/lulzsun/whirled2.git
cd whirled2
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go mod download && npm ci && npm run dev
```

Same *name* as this repo. Different owner, license, and architecture. We do not fork it. Bookmark it so nobody thinks we invented the title in a vacuum.

## pravatbhusal/html5-msoy

- Repo: https://github.com/pravatbhusal/html5-msoy
- Author: Pravat Bhusal (`pravatbhusal`). Same person who filed [greyhavens/msoy#29](https://github.com/greyhavens/msoy/issues/29) after getting a classic parlor stack far enough to hit `BUREAU_ACCESS_PLACE`.
- What it is: an earlier **HTML5 / React + Django** rewrite of the Metasoy / Whirled *idea* (client + server folders, Pixi viewport notes, sprite-sheet avatars, iframe entity popups).
- What it is not: finished, official, or the stack this repo uses. Todos for avatars, VCam, and popups are still in that README. MIT license on their tree.
- What we take: proof someone already tried “Whirled without Flash” in a browser. We do **not** fork it. Whirled 2 stays TypeScript + Pixi in this repo. Classic msoy stays the Java lab.

## Shadowsych — Whirled (msoy) Documentation

- Notes: [archive/README.md](archive/README.md)
- Author: **Shadowsych** (Synced Online community docs). **Not whirledclassic. Not this maintainer.**
- Why it is listed: the copy people still pass around is a Google Drive / loose doc. Easy to lose. Shadowsych wrote that it may be given to anyone.
- Era: Ubuntu 14.04 dedicated box, OVH + Site5, x2go, MediaFire dependency zip. That is a *public host* recipe from years ago. Our lab is a **NAT VirtualBox guest**. Do not follow the “open port 80 on a dedicated server” parts unless you know why that is a bad default in 2026.

## FelixWolf forks

- https://github.com/FelixWolf/msoy
- https://github.com/FelixWolf/whirled-api
- Context from mail is in [SOURCES.md](SOURCES.md). Linux-first. Discord he gave: `felix0536`.
