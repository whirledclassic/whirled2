# Help / setup guide

Two products, two machines, two checklists. Read this once before opening a “how do I build Whirled” issue.

| You want | Do this |
| --- | --- |
| A 2026 browser room people can join | **Whirled 2** — this repo. TypeScript + PixiJS. No Flash. |
| The 2007–2017 Flash + Java world on a box you control | **Classic lab** — clone Grey Havens trees in a Linux VM. |
| To play *today* without building anything | https://www.whirled.club |

Full URL index: [LINKS.md](LINKS.md).

---

## 0. What you are *not* cloning into this repo

`whirledclassic/whirled2` is original TS/Pixi work. It does **not** vendor:

- `greyhavens/msoy`
- `greyhavens/whirled-sdk` / `whirled-api` / `whirled-projects` / `thane`
- `threerings/narya` / `nenya` / `vilya`
- Anyone’s SWF, shop dump, or player database

Those stay in the lab (or as bookmarks). Linking them here is the point of this file.

---

## Track A — Whirled 2 (this website / game)

**Status:** public repo is open; first ship is one click-to-walk room. Package.json lands with that room. Until then there is nothing to `npm install` that is *ours*.

### Prerequisites (when the scaffold is in)

- Node LTS (18+ is fine; we will pin in package.json)
- Git
- A normal browser

### Clone

```bash
git clone https://github.com/whirledclassic/whirled2.git
cd whirled2
```

### When the room code exists

Expected shape (do not invent a framework in a PR):

```bash
npm install
npm run dev          # local room
```

Deploy notes for a cheap VPS + HTTPS: issue [#4](https://github.com/whirledclassic/whirled2/issues/4). No home ports.

### How to help before the scaffold is fat

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md) and [ROADMAP.md](ROADMAP.md)
2. Pick a `whirled2` issue: click-to-walk, camera, one avatar walk-cycle, three furniture props
3. Artists: [ARTISTS.md](ARTISTS.md)

### Nearby remakes you can *run* for reference (not forks of us)

Jimmy Quach’s **other** whirled2 (Go + Node). Different license (AGPL). Different owner.

```bash
# requires Node 18.14.2+ and Go 1.21+
git clone --recurse-submodules https://github.com/lulzsun/whirled2.git
cd whirled2
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go mod download && npm ci && npm run dev
```

Live demo he published: https://whirled.jimmyqua.ch/

Pravat’s HTML5 msoy sketch:

```bash
git clone https://github.com/pravatbhusal/html5-msoy.git
# client: yarn install && yarn start
# server: pip install -r requirements
```

We do not fork either. We read them so we do not repeat dead ends.

---

## Track B — Classic website + game (msoy lab)

This is the original Whirled stack: Java server, GWT HTML chrome, Flash room/game clients, Postgres or MySQL, thane for game server agents.

Grey Havens’ own warning still applies: stadium-sized Rube Goldberg machine. Budget a weekend, not an afternoon.

Step-by-step for *this* lab’s hardware: [VM-GUIDE.md](VM-GUIDE.md).  
What actually boots: [CLASSIC-LAB.md](CLASSIC-LAB.md).  
Every public build failure we mapped: [FIXES.md](FIXES.md).

### B1. Machine

- Linux guest (Debian-class). **Java 8**, Ant, Git, Postgres.
- Not JDK 17/21. Not raw Windows (missing `egrep` → [msoy#4](https://github.com/greyhavens/msoy/issues/4)).
- NAT network. No forwarded 8080/80/4010/47623 to the public internet.

```bash
sudo apt update
sudo apt install -y openjdk-8-jdk ant git postgresql postgresql-contrib curl unzip
java -version    # must print 1.8
```

### B2. Clone the official trees (paths with no spaces)

```bash
mkdir -p ~/src && cd ~/src

# platform
git clone https://github.com/greyhavens/msoy.git
git clone https://github.com/greyhavens/whirled-api.git
git clone https://github.com/greyhavens/whirled-sdk.git
git clone https://github.com/greyhavens/whirled-projects.git
git clone https://github.com/greyhavens/thane.git

# libraries the Java build expects (order matters)
git clone https://github.com/threerings/narya.git
git clone https://github.com/threerings/nenya.git
git clone https://github.com/threerings/vilya.git

# optional: fork that still touches build scripts
git clone https://github.com/FelixWolf/msoy.git FelixWolf-msoy
git clone https://github.com/FelixWolf/whirled-api.git FelixWolf-whirled-api
```

### B3. Database role

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'msoy') THEN
    CREATE USER msoy;
  END IF;
END
$$;
```

Create the databases the `etc/*.dist` comments name. Do not commit passwords.

### B4. Config files (from Grey Havens README)

Copy and edit. Hostnames stay local.

```text
etc/build_settings.properties.dist  →  etc/test/build_settings.properties
etc/burl-server.conf.dist           →  etc/test/burl-server.conf
etc/burl-server.properties.dist     →  etc/test/burl-server.properties
etc/msoy-server.conf.dist           →  etc/test/msoy-server.conf
etc/msoy-server.properties.dist     →  etc/test/msoy-server.properties
```

### B5. Build order

```bash
java -version          # 1.8 or stop

# libraries first if they are separate checkouts
#   cd ~/src/narya && ant dist
#   cd ~/src/nenya && ant dist
#   cd ~/src/vilya && ant dist
#   cd ~/src/whirled-api && ant dist   # or the path your build.xml expects

cd ~/src/msoy
ant -p                 # lists distall, asclient, flashapps, gclients, thane-client, viewer, …
ant distall            # or start with compile / dist if distall explodes
ls bin                 # expect msoyserver
chmod +x bin/msoyserver
./bin/msoyserver
```

Healthy log (Grey Havens sample): Jetty on `0.0.0.0:8080`, policy server on `47623`, game listen on `4010`, line `Msoy server initialized`.

Then, **on the same machine**, http://localhost:8080/

If the page says *“We’re not in Kansas any more Toto!”*, Java is up and the Flash/GWT clients were not built. Run `asclient`, `flashapps`, `gclients`. That is [msoy#23](https://github.com/greyhavens/msoy/issues/23).

### B6. Games and the creator API (classic)

Parlor games and AVRGs are **not** uploaded to this GitHub. On a live classic instance:

1. Build or obtain a `.swf` against [whirled-sdk](https://github.com/greyhavens/whirled-sdk)
2. Optional server agent: compile AS to `.abc` (thane)
3. Upload via the game editor (wiki: [Create games](https://wiki.whirled.club/wiki/Create_games), [Options for games](https://wiki.whirled.club/wiki/Options_for_games))
4. First line of every client: `GameControl.isConnected()` — if false, show splash, do not start the match

Example game source to read (do not dump into this repo):

- https://github.com/greyhavens/whirled-projects/tree/master/games

Community SDK zip (Flash CS3-era, 0.67): see [Whirled SDK wiki](https://wiki.whirled.club/wiki/Whirled_SDK).

Flash Player in a 2026 browser is a separate problem. Public Whirled 2 does not wrap SWFs. Lab options: [FLASH-AND-RUFFLE.md](FLASH-AND-RUFFLE.md).

---

## Quick “where is X?”

| Thing | Link |
| --- | --- |
| This repo | https://github.com/whirledclassic/whirled2 |
| Classic server source | https://github.com/greyhavens/msoy |
| Creator SDK | https://github.com/greyhavens/whirled-sdk |
| Creator API lib | https://github.com/greyhavens/whirled-api |
| Example games / avatars / furni | https://github.com/greyhavens/whirled-projects |
| Game server VM (thane) | https://github.com/greyhavens/thane |
| Distributed-object libs | https://github.com/threerings/narya |
| Live community world | https://www.whirled.club |
| API / upload wiki | https://wiki.whirled.club/wiki/Create_games |
| Other modern remake | https://github.com/lulzsun/whirled2 |
| Other HTML5 sketch | https://github.com/pravatbhusal/html5-msoy |
| Wikipedia | https://en.wikipedia.org/wiki/Whirled |

---

## Asking for help

Open an issue on **this** repo with the right label (`whirled` vs `whirled2`). Paste:

```text
track:          whirled2 / classic-lab
host OS:
java -version:  (classic only; must be 8)
ant -version:   (classic only)
node -v:        (whirled2)
first error block:
network:        NAT / other
```

Do not paste `msoy-server.properties`, player dumps, or guest IPs.
