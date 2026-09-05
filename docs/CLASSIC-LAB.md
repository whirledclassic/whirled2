# Classic Whirled / msoy

**Track landing page:** [`../classic/README.md`](../classic/README.md)  
**Self-host guide:** [SETUP.md](SETUP.md)  
**This is not Whirled 2.** Label: `whirled` / `classic`.  
Source: [greyhavens/msoy](https://github.com/greyhavens/msoy). Related: [whirled-sdk](https://github.com/greyhavens/whirled-sdk), [whirled-api](https://github.com/greyhavens/whirled-api), [whirled-projects](https://github.com/greyhavens/whirled-projects), [thane](https://github.com/greyhavens/thane).

Grey Havens’ own README says the tree is a stadium-sized Rube Goldberg machine. Budget your ego accordingly.

---

## Goal

Run the original Flash + Java stack as a **private server** — historic world, playable, source already public.

You can do this. [SETUP.md](SETUP.md) is the checklist. [VM-GUIDE.md](VM-GUIDE.md) is one machine that worked.

David Hoover (who lived in this stack) thinks digging AS3 / old Flash back up as a *product* is probably a bad idea, and that nostalgia is about the people, not the JAR. Fair warning. Not a ban. Full note: [SOURCES.md](SOURCES.md).

If you want a room people can join in a normal browser with no Flash, that is [Whirled 2](../whirled2/README.md).

---

## What actually boots

Confirmed on a Debian-class Linux VM (VirtualBox), 2026-09:

1. **Java 8.** Not 17. Not 21. OpenJDK 21 will start Guice / cglib / MapMaker and then die.
2. **Ant** (`ant dist` on narya and friends, then msoy).
3. **Postgres** with a `msoy` role.
4. **Linux.** Raw Windows hits missing `egrep` ([msoy#4](https://github.com/greyhavens/msoy/issues/4)).
5. After a real dist, look in `bin/` for `msoyserver`.

| Symptom | First guess |
| --- | --- |
| Guice / cglib / MapMaker / illegal reflective access | Wrong JDK. Install 8. |
| `Cannot run program "egrep"` | Windows without a Unix userland. Use Linux. |
| HTML files in `dist/lib` pretending to be jars | Dead Maven bootstrap. Incomplete Three Rings deps. |
| `NamedEvent`, `ObserverList`, `PropertySetEvent` | narya stack not built first. |
| Server starts, no binary | You are in the wrong tree. Find `msoyserver` under msoy. |

Kyler Eastridge (2026-09-01): Windows Ant pain is usually his Docker setup with different paths. He lives on Linux.

---

## Sketch of a start

Do not copy hostnames from anyone else’s machine. Adjust paths.

```bash
java -version    # must say 1.8

# libraries first, then msoy — names vary by how you cloned
#   cd narya && ant dist
#   cd msoy && ant dist

ls bin
chmod +x bin/msoyserver
./bin/msoyserver
```

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

## Flash client

See [FLASH-AND-RUFFLE.md](FLASH-AND-RUFFLE.md).

Andrew Frost, Harman/Wipro AIR support, 2026-09-03: enterprise packaged Flash Player is an expensive Flex license; old AIR SDK ≤ ~v19 is vulnerable and should not be redistributed; Ruffle is possible for some Flash, unproven for a full social world.

Whirled 2 does not wrap a SWF. Classic keeps the original client on the private server.

---

## Related issues

- [greyhavens/msoy#38](https://github.com/greyhavens/msoy/issues/38)
- [greyhavens/msoy#31](https://github.com/greyhavens/msoy/issues/31)
- [#5](https://github.com/whirledclassic/whirled2/issues/5), [#6](https://github.com/whirledclassic/whirled2/issues/6)

Community host already up (not us): https://www.whirled.club

---

## Keep off this GitHub

- Player data, shop dumps, original client binaries
- VM hostnames and home-router port maps
