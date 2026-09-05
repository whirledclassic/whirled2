# Classic Whirled / msoy lab

**Track landing page:** [`../classic/README.md`](../classic/README.md)  
**This is not Whirled 2.** Label: `whirled` / `classic-lab`.  
Source of truth for code: [greyhavens/msoy](https://github.com/greyhavens/msoy) (“What in the Whirled is this?”). Related trees: [whirled-sdk](https://github.com/greyhavens/whirled-sdk), [whirled-api](https://github.com/greyhavens/whirled-api), [whirled-projects](https://github.com/greyhavens/whirled-projects), [thane](https://github.com/greyhavens/thane).

Grey Havens’ own README says the tree was yanked from a crufty home and is a stadium-sized Rube Goldberg machine. They are not wrong. Budget your ego accordingly.

---

## Goal

Boot the original Flash + Java stack on a **local Linux lab** so the 2007–2017 client is not only a screenshot. No home ports. No public hostname.

If you want a room people can join in a normal browser, that is [Whirled 2](../whirled2/README.md) — TypeScript + Pixi — not a patch on msoy.

---

## What actually boots

Confirmed on a Debian-class Linux VM (VirtualBox), 2026-09:

1. **Java 8.** Not 17. Not 21. OpenJDK 21 will start Guice / cglib / MapMaker and then die because the old bytecode pokes internals the new JDK forbids.
2. **Ant** (`ant dist` / project `dist` on narya and friends, then msoy).
3. **Postgres** with a `msoy` role.
4. **Linux.** Raw Windows hits missing Unix tools (`egrep` → `CreateProcess error=2`). That failure is in greyhavens/msoy#4 from 2015 and it is still the same class of bug.
5. After a real dist, look in `bin/` for `msoyserver`. That is the launcher. It is not on the Desktop unless you put it there.

Useful order of suspicion when `ant distall` explodes:

| Symptom | First guess |
| --- | --- |
| Guice / cglib / MapMaker / illegal reflective access | Wrong JDK. Install 8. Check `java -version`. |
| `Cannot run program "egrep"` | You are on Windows without a Unix userland. Use Linux. |
| HTML files sitting in `dist/lib` pretending to be jars | Dead Maven / `ooo-maven.googlecode.com` bootstrap. Incomplete Three Rings deps. |
| `NamedEvent`, `ObserverList`, `PropertySetEvent` | narya / Present / dobj not built or not on the classpath. Build the library stack first (narya, nenya, vilya, whirled-api). |
| Server starts then you cannot find the binary | You are in the wrong tree. `find` for `msoyserver` under the msoy source, not `~/Desktop`. |

Kyler Eastridge’s read (2026-09-01): Windows Ant pain is usually the same as his Docker setup with different paths. He lives on Linux. Believe him.

---

## Sketch of a start (lab only)

Do not copy hostnames from anyone else’s machine. Adjust paths.

```bash
# JDK 8 on the PATH — confirm before Ant
java -version    # must say 1.8

# libraries first, then msoy — names vary by how you cloned greyhavens + threerings
# example shape only:
#   cd narya && ant dist
#   cd msoy && ant dist

ls bin           # expect msoyserver
chmod +x bin/msoyserver
./bin/msoyserver
```

Postgres sketch (names from the lab notes; do not commit passwords):

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'msoy') THEN
    CREATE USER msoy;
  END IF;
END
$$;
```

---

## Flash client: legal options only

See [FLASH-AND-RUFFLE.md](FLASH-AND-RUFFLE.md).

Short version from Harman/Wipro AIR support (Andrew Frost, 2026-09-03):

- Enterprise packaged Flash Player = expensive license for corporate Flex. Not this project.
- Old AIR SDK (≤ ~v19) had a player binary. Vulnerable. Archives pulled. Do not redistribute the SDK.
- New AIR SDK = port AS3 to AIR.
- Ruffle = possible for *some* Flash, unproven for a full social-world client.

Public product does not depend on any of those. Classic client stays in the lab.

---

## Related issues

Upstream (we cannot comment from this GitHub App; paste in the browser if you want it on their tracker):

- [greyhavens/msoy#38](https://github.com/greyhavens/msoy/issues/38) — Error on building whirled (2026)
- [greyhavens/msoy#31](https://github.com/greyhavens/msoy/issues/31) — is whirled.com shutting down (2017, still the search hit)

Here:

- [#5](https://github.com/whirledclassic/whirled2/issues/5) — Java 8 + Linux notes
- [#6](https://github.com/whirledclassic/whirled2/issues/6) — 2026 status: official site gone

Community host that is actually up: https://www.whirled.club  
Wiki: https://wiki.whirled.club/wiki/Whirled

---

## Do not

- Open the lab to the internet.
- Commit player data, shop dumps, or original client binaries to this repo.
- Treat nostalgia as a spec. Hoover’s letter is in [SOURCES.md](SOURCES.md).
