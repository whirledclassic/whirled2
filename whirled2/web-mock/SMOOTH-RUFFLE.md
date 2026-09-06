# SMOOTH-RUFFLE — Classic Flash walk (?v=20260906cl)

## Goal
Floor click → billboard moves **and** avatar plays walk animation for the whole trek → idle on arrive.

## Root cause fixed (cl)
**Cover was hiding walk.** CSS `companion-cover` kept `.classic-swf-stand-tofu` / thumb at `z-index:6` over `ruffle-player`, so DemoAvatar green walk ran **under** a static stand cover (invisible). Nested companion for flashQa made this worse when nest lagged.

## Architecture (what works)
1. **flashQa / demo-avatar** — **DIRECT** mount of `demo-avatar.swf` + EI `hostWalk` (visible stick). Do **not** companion-only nest the demo under a cover that never clears.
2. **Real Body SWFs** — COMPANION-ONLY nest: `avatar-host.swf` → `hostLoadBytes` → `hostWalk` → `appearanceChanged_v2`. Stand cover only until player exists / connected.
3. **Cover hide (cl)** — CSS `:has(ruffle-player)` + `.is-playing` / billboard `.is-walking` → stand opacity 0; JS `hideStandCoverForPaint` on walk/connected/DIRECT.
4. **Tofu (cj/cl)** — CSS `.tofu-leg-l/r` with `transform-box:fill-box` + bob when `.is-walking` / `.is-tofu-walk` (including `.classic-swf-stand-tofu`).
5. **Chrome walk (cj)** — always binds floor click unless `#stage-slot[data-engine-owns-avatar-walk=1]`; always adds `.is-walking` for ruffle loft too.

## Status badge
- `connected` — nest live, real Body walk
- `DIRECT` / `DIRECT+walk` — outer SWF; demo EI walk if present
- `failed` — mount death (stand still visible)

## Retest
```
https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906cl&flashQa=1&avatarDebug=1
```
1. Enter loft — no grey letter T, no blank loft, **no static tofu covering the stick**.
2. Floor click — stick figure **green legs cycle VISIBLE** while moving; blue idle on arrive.
3. Console: `WhirledClassicAvatar.getLoftHostDebug()` → `directEiWalk` (demo) or `companionConnected` (Body).
4. Wear default tofu — legs bob on floor click.
5. Wear real Body as Classic Flash — prefer connected nest; Smooth PNG if hybrid frames exist.
