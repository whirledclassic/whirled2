# SMOOTH-RUFFLE — Classic Flash walk (?v=20260906ck)

## Goal
Floor click → billboard moves **and** avatar plays walk animation for the whole trek → idle on arrive.

## Architecture (what works)
1. **COMPANION-ONLY** — Ruffle loads `avatar-host.swf` into `#avatar-ruffle-host` (never `#stage-slot`). Stand PNG/tofu-SVG covers until bridge `"connected"`. Then `hostLoadBytes` / `hostLoadUrl` nests the Body; `hostWalk` → `appearanceChanged_v2`.
2. **flashQa DemoAvatar** — `ConnectBag` (public `props`) + ENTER_FRAME leg cycle (green walk / blue idle). Also registers EI `hostWalk` so **DIRECT** remount still animates.
3. **Tofu (cj)** — CSS `.tofu-leg-l/r` + bob when `.is-walking` / `.is-tofu-walk`.
4. **Chrome walk (cj)** — always binds floor click unless `#stage-slot[data-engine-owns-avatar-walk=1]`.

## Status badge
- `connected` — nest live, real Body walk
- `DIRECT` / `DIRECT+walk` — outer SWF; demo EI walk if present
- `failed` — mount death (stand still visible)

## Retest
```
https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906ck&flashQa=1&avatarDebug=1
```
1. Enter loft — no grey letter T, no blank loft.
2. Floor click — stick figure **green legs cycle** while moving; blue idle on arrive.
3. Console: `WhirledClassicAvatar.getLoftHostDebug()` → `companionConnected` or `directEiWalk`.
4. Wear default tofu — legs bob on floor click.
5. Wear real Body as Classic Flash — prefer connected nest; Smooth PNG if hybrid frames exist.
