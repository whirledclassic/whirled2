# Related work — not this project

These are other people's public trees and docs. We did not write them. They are listed so the trail does not die.

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
- Author: Pravat Bhusal (`pravatbhusal`). Same person who filed [greyhavens/msoy#29](https://github.com/greyhavens/msoy/issues/29).
- What it is: an earlier **HTML5 / React + Django** rewrite of the Metasoy / Whirled *idea*.
- What it is not: finished, official, or the stack this repo uses. MIT license on their tree.
- What we take: proof someone already tried “Whirled without Flash” in a browser. We do **not** fork it.

## Shadowsych — Whirled (msoy) Documentation

- Notes: [archive/README.md](archive/README.md)
- Author: **Shadowsych** (Synced Online community docs). **Not whirledclassic. Not this maintainer.**
- Why it is listed: the copy people still pass around is a Google Drive / loose doc. Easy to lose. That write-up was published as community documentation.
- Era: Ubuntu 14.04 dedicated box, OVH + Site5, x2go. That is a *public host* recipe from years ago. Our lab is a **NAT VirtualBox guest**. Do not follow the “open port 80 on a dedicated server” parts unless you know why that is a bad default in 2026.

## FelixWolf forks

Public GitHub work only:

- https://github.com/FelixWolf/msoy
- https://github.com/FelixWolf/whirled-api
- https://softhyena.com/about.htm
