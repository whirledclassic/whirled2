# ROOT-CAUSE — Classic Flash loft tofu + grey "T" (?v=20260906ci)

## Short note (ci)

**Broken UX (ch screenshot):** loft showed classic **tofu** (beige face) **plus** a grey rounded square with big **"T"**. Classic Flash Wear was not visible.

**Causes:**
1. Stand fallback used `classic-swf-placeholder` = first letter of avatar name (`Tofu` → **T**). Companion-cover called `ensureStandFallback` with reasons that were **not** soft → `is-failed` kept the glyph full-opacity on TOP of empty host.
2. `assets/ruffle/demo-avatar.swf` returned **HTTP 404** on Pages (only `flash-qa/demo-avatar.swf` + `ruffle/demo-qa.swf` were live). Any path/docs pointing at ruffle/demo-avatar failed; nest/DIRECT miss → tofu path or stand junk.

**Fix (ci):** mirror Body demo under `assets/ruffle/demo-avatar.swf`; stand = PNG/thumb or tofu-SVG (**never letter**); soft companion-cover; fail → DIRECT with demo URL fallbacks. See `STATUS.md`.

## Historical — ch companion-only / cg Option A / ce wipe / cf OFF

- **ch:** COMPANION-ONLY mount + stand cover; hostLoadBytes gated on ready; EI silent-miss fixed.
- **cg:** sibling layer — paint preserved, connect hop still failed.
- **ce:** remount companion into same host → wiped paint (blank loft).
- **cf:** `WEAR_AUTO_COMPANION_UPGRADE=false` — DIRECT stable, no walk frames.

### Non-goals

- No AGPL msoy/world-client copy.
- Ruffle stays in `#avatar-ruffle-host` only (never `#stage-slot`).
- PNG / Whirled2 Smooth path unchanged.
- `demo-qa.swf` = paint smoke only; walk QA = `demo-avatar.swf` (AvatarControl mimic).
