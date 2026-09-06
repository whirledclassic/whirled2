# ROOT-CAUSE — Classic Flash Wear visibility (?v=20260906cg)

## Short note (cg)

**ce wiped loft by remounting companion into the same host; cg uses SAFE Option A sibling layer.**

`?v=20260906ce` scheduled a delayed companion nest after DIRECT paint (`startCompanionWithPayload` ~450ms). That called `mountRuffle(#avatar-ruffle-host, host.swf)` which **clears the container** → blank loft / companion wipe. **`?v=20260906cf`** gated Wear to DIRECT-only (`WEAR_AUTO_COMPANION_UPGRADE=false`).

**`?v=20260906cg`** re-enables walk upgrade safely:

1. Wear stays **DIRECT-first** — outer avatar SWF mounts and stays visible in `#avatar-ruffle-host`.
2. `WEAR_SAFE_COMPANION_UPGRADE = true` mounts companion `avatar-host.swf` in sibling `#avatar-companion-layer` at **opacity 0**.
3. **Never** destroy DIRECT until bridge `"connected"` (+ nest success). Then promote companion and remove DIRECT players only.
4. Fail / watchdog ~4s / bridge error → **tear companion layer**, keep DIRECT.
5. `loftUsesCompanionHost = true` **only** on bridge `"connected"`. Reject nested `blob:`/`data:` — `hostLoadBytes` / http(s) only.
6. Stand thumb opacity 1 until DIRECT or companion has `.is-playing`. Floor click → chrome bob always; `hostWalk` once connected.

## Historical — click-to-walk no animation (?v=20260906ce / cf)

### Symptom

Worn Classic Flash (Ruffle) avatars **move** on loft floor click (chrome billboard lerp + CSS bob/flip) but the **SWF walk frames** need companion nest (`appearanceChanged_v2`).

### Why

1. Stock Whirled SWFs do not walk via ExternalInterface alone — need nested host + `sharedEvents` (`GREY-HAVENS-PROTOCOL.md`, `RUFFLE-SOURCE-DEEP.md`).
2. `notifyLoftWalk` → `hostWalk` only when `loftUsesCompanionHost` (set on bridge `"connected"`).
3. ce tried upgrade by remounting into the same host → wiped paint. cf turned upgrade OFF. cg = Option A dual-layer.

### Non-goals

- No AGPL msoy/world-client copy.
- Ruffle stays in `#avatar-ruffle-host` only (never `#stage-slot`).
- PNG / Whirled2 Smooth path unchanged.
