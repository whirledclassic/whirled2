# What broke for other people — and what we do

**Track: classic Whirled / msoy.** Not the Pixi room.

Grey Havens does not hold anyone’s hand on [greyhavens/msoy#4](https://github.com/greyhavens/msoy/issues/4). Fair. This page is the cheat sheet we wish had existed: every public issue that actually blocked a build or a boot, plus what worked here in 2026.

Credit: people who filed the pain (FlowShift, VoxRatio, smellon, BAM5, Pravat, Radek2025921, Kyler Eastridge, and the rest). We did not invent these failures.

Full lab recipe: [CLASSIC-LAB.md](CLASSIC-LAB.md).

---

## What is running here (2026-09)

| Piece | Status |
| --- | --- |
| Linux VM (Debian-class, VirtualBox, NAT) | Works |
| JDK **8** on `PATH` | Required. 21 dies. |
| Ant + Postgres (`msoy` role) | Works |
| `bin/msoyserver` after a real dist | Boots |
| Home ports / public hostname | **Off.** Lab only. |
| Whirled 2 (this repo, Pixi) | Separate track. Does not need Ant. |

Official build targets from the msoy README: `ant distall` (whole system), `asclient`, `flashapps`, `gclients`, `thane-client`, `compile`. Run `ant -p` in the msoy tree to see them.

---

## Build failures

### `Cannot run program "egrep"` / `CreateProcess error=2`

- Upstream: [greyhavens/msoy#4](https://github.com/greyhavens/msoy/issues/4) (2015, Windows path `L:\\WHIRLED SOURCE CODE\\...`)
- What it is: `build.xml` shells out to Unix tools. Windows Ant has no `egrep`.
- **Fix we use:** do not build on raw Windows. Debian/Ubuntu VM. Same class of problem Kyler called “Docker setup, different paths.”
- Still open in spirit: [greyhavens/msoy#38](https://github.com/greyhavens/msoy/issues/38) (2026 `ant distall` with no log). First question: `java -version` and OS.

### Guice / cglib / MapMaker / illegal reflective access

- Not an old GitHub issue. Hit on this lab when `java -version` was **21**.
- **Fix we use:** JDK 8 only. Confirm before Ant. OpenJDK 21 will start pieces of the server and then explode.

### Missing Maven artifacts (`ooo-parent`, `com.threerings:*` jars and swcs)

- Upstream:
  - [greyhavens/msoy#5](https://github.com/greyhavens/msoy/issues/5) — `ooo-parent` gone from the public Maven repo
  - [greyhavens/msoy#7](https://github.com/greyhavens/msoy/issues/7) — six Three Rings jars missing (`orth`, `whirled-code`, `threerings`, `database-utils`, `toybox`, `underwire`)
  - [greyhavens/msoy#11](https://github.com/greyhavens/msoy/issues/11) — more `.swc` / `.pom` (`signals`, `toyboxlib`, `whirledthanelib`, `thane`, `naryalib`, `vilyalib`, `orthlib`)
  - [greyhavens/msoy#33](https://github.com/greyhavens/msoy/issues/33) — still open: GWT bits (`narya-gwt`, `nenya-gwt`, `underwire-gwt`, `orth-gwt`) and thane SNAPSHOTs
- What it is: `ooo-maven.googlecode.com` is dead. HTML files pretending to be jars in `dist/lib` is the same hole.
- **Fix we use:** build the library stack **locally** first (narya / nenya / vilya / whirled-api / thane), then msoy. Do not wait for a public Maven mirror that is not coming back. FelixWolf/msoy is the fork still touching build scripts.

### `NamedEvent` / `ObserverList` / `PropertySetEvent` compile errors

- From this lab + mail with Kyler, not a numbered GH issue.
- **Fix we use:** Present / dobj / narya are not on the classpath yet. Dist those libraries before msoy.

### Folder names with spaces

- Upstream: [greyhavens/msoy#36](https://github.com/greyhavens/msoy/issues/36) — `Unable to read msoy-server.conf` / `unexpected operator` on Ubuntu. Reporter closed it: path had a space.
- **Fix we use:** no spaces in the source path. `~/src/msoy`, not `~/Desktop/Whirled Source`.

---

## Server boots but the page is wrong

### “We’re not in Kansas any more Toto!” / Oh Noez

- Upstream: [greyhavens/msoy#23](https://github.com/greyhavens/msoy/issues/23) (VoxRatio, 2016). `msoyserver` logged healthy on `0.0.0.0:8080`, JVM 1.6, cluster node `msoy1`, policy port 47623, game port 47624 — and the browser still got the Toto page.
- What it is: Java server up, **GWT / Flash clients not built or not where Jetty expects them.** `distall` is more than `compile`.
- **Fix we use:** after Java dist, you still need the client targets: `asclient`, `flashapps`, `gclients` (see `ant -p`). Whirled 2 does not wait on those pages. Classic lab does.

### Jetty hangs / SIGBUS in `libzip.so`

- Upstream: [greyhavens/msoy#32](https://github.com/greyhavens/msoy/issues/32) — OpenJDK 6 on Ubuntu 14.04, crash inside `ZipFile.getEntry` while Velocity served a template.
- **Fix we use:** JDK 8 (not 6, not 21). Do not run the lab on a rotting OpenJDK 6. If Jetty wedges, restart the process; do not expose it.

### Binds every interface (`0.0.0.0`)

- Upstream: [greyhavens/msoy#37](https://github.com/greyhavens/msoy/issues/37)
- **Fix we use:** leave it on localhost / NAT VM. We are not binding a public IP. No home ports. That is the whole security model for the lab.

---

## Games and names (classic only)

### Parlor games die with `NoSuchFieldError: BUREAU_ACCESS_PLACE`

- Upstream: [greyhavens/msoy#29](https://github.com/greyhavens/msoy/issues/29) (Pravat). AVRGs worked; parlor “Create” did not. Thane bureau / whirled-game manager out of date vs the server.
- **Fix we use:** out of scope for the 2026 lab goal (boot the world, keep the client as a museum piece). Whirled 2 games will not go through that bureau. If you are rebuilding classic parlor, rebuild thane against the same tree.

### `$'` in pet names crashes Flash

- Upstream: [greyhavens/msoy#6](https://github.com/greyhavens/msoy/issues/6). Same class of bug as MemberName; patch landed on pets in that thread.
- **Fix we use:** do not recreate crash-the-client names, pets, or shop items. That drama is why the README bans it. Whirled 2 will not parse those strings as ActionScript.

---

## “Is whirled.com dead?”

- Upstream: [greyhavens/msoy#31](https://github.com/greyhavens/msoy/issues/31) (still the search hit).
- **Answer we publish:** official site is gone. Community host: https://www.whirled.club . This repo is a new browser room, not a claim on whirled.com. See [#6](https://github.com/whirledclassic/whirled2/issues/6).

---

## Quick map

| You see | You do |
| --- | --- |
| `egrep` / Windows Ant | Linux VM |
| JDK 17/21 stack traces | Install 8 |
| Missing `com.threerings.*` | Build narya/nenya/vilya/api locally |
| HTML in `dist/lib` | Dead Maven. Same as above. |
| Spaces in path / conf unreadable | Rename the folder |
| Server up, Toto / Oh Noez page | Build Flash + GWT clients |
| Need a public URL | That is Whirled 2 + a VPS later. Not this lab. |

Open a `whirled` issue here if you hit something that is **not** on this list. Do not file “ant failed” with no `java -version` and no first `BUILD FAILED` block.
