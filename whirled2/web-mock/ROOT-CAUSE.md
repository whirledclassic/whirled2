# ROOT-CAUSE — Classic Flash click-to-walk (?v=20260906ch)

## Short note (ch)

**Broken hop (cg):** `hostLoadBytes` / bridge `"ready"` did not reliably run on the **host** Ruffle (`tryCallIntoSwf` treated Ruffle EI `undefined` as `{ok:true}`; dual-layer ready-flush could hit DIRECT). Nest never `"connected"` → `loftUsesCompanionHost` stayed false → floor click = chrome bob only.

**Fix (ch):** COMPANION-ONLY mount of `avatar-host.swf` into `#avatar-ruffle-host` with **stand cover** until bridge `"connected"`. Gate `hostLoadBytes` on `"ready"`. Prefer `loftCompanionPlayer` for host EI. Fail/watchdog → remount DIRECT. See `WALK-E2E-ANALYSIS.md`.

## Historical — cg Option A / ce wipe / cf OFF

- **ce:** remount companion into same host → wiped paint (blank loft).
- **cf:** `WEAR_AUTO_COMPANION_UPGRADE=false` — DIRECT stable, no walk frames.
- **cg:** Option A sibling layer — paint preserved, but connect hop still failed (EI silent-miss + race).

### Non-goals

- No AGPL msoy/world-client copy.
- Ruffle stays in `#avatar-ruffle-host` only (never `#stage-slot`).
- PNG / Whirled2 Smooth path unchanged.
- `demo-qa.swf` = paint smoke only; walk QA = `demo-avatar.swf` (AvatarControl mimic).
