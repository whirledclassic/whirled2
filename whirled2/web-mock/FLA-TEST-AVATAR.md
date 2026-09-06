# Test classic avatar (.fla) — how we make it work

**File saved:** `assets/avatars/fla-lab/user-test-avatar.fla` (~1.8 MB)  
**Format:** Old Adobe Flash **OLE compound document** (not zip FLA). Metadata: *Saved by Adobe Flash Windows 9.0* (~2010).  
**Status (?v=20260906aw):** Classic Flash **upload UI is ready** — drop a published `.swf` on Stuff → Classic Flash panel. FLA extracts still not Wearable.

**Prior (?v=20260906aq):** Advanced as far as the file allows — **no SWF / no PNG sprite sequence inside**. Extracted camera JPEGs are **concept sketches** (multi-tail fox on lined paper), not loft-ready frames. Whirl remains the working Wearable.

## What we inspected (aq)

| Check | Result |
|-------|--------|
| `unzip` / zip FLA | Fail — OLE (`D0 CF 11 E0…`), not PK zip |
| Embedded JPEG scan | 4 bitmaps → `assets/avatars/fla-lab/extracted/bitmap_*.jpg` |
| Usable as idle/walk pack? | **No** — pencil sketch photos, not transparent sprite frames |
| Published `.swf` in tree | **None** — Ruffle lab stays gated (`?avatarLab=1`) until you supply one |

## What a .fla is vs what the game needs

| Artifact | Role |
|----------|------|
| **`.fla`** | Flash *source* (timeline, symbols, scripts). Browsers / Pixi / Ruffle **cannot** play it. |
| **`.swf`** | Published binary classic Whirled used in-room (`AvatarControl` / controlConnect). |
| **PNG pack** (idle/walk/…) | What Whirled2 chrome uses *today* on `#avatar-wear-layer` + what Pixi can eat next. |

## Two tracks (both valid)

### Track A — Classic fidelity (Flash in a sandbox)
1. Open the `.fla` in **Adobe Animate** (or Flash CS3–CS5) → **File → Publish → SWF**.
2. Upload the `.swf` via Stuff → Avatars → **Classic Flash / Whirled avatars** (Experimental). Optional: also keep a copy under `assets/avatars/fla-lab/`.
3. Phase 2 (policy bump in ENGINE-BRIDGE): **Ruffle + host shim** loads the SWF; Pixi keeps room floor / click / nametags.

### Track B — Modern engine power (recommended)
1. From Animate: export **PNG sequences** per state into folders:
   - `idle/` (calm loop — arms down)
   - `walk/` (4–8 frames)
   - optional `wave/`, `sit/`, `pose/`, `dance/`
2. Pack JSON = same schema as Whirl (`states.idle` / `states.walk` / emotes…).
3. Stuff → Add pack / Wear → loft billboard + click-to-walk + click-avatar emotes.

**Best of both:** keep `.fla`/`.swf` as archival + optional Ruffle lab; ship day-to-day play on **Track B**.

## Exact steps we need from you

1. Prefer a **published `.swf`** from this FLA (Animate → Publish), **and/or**
2. PNG exports: `idle/` + `walk/` (and emotes if any), classic-ish thumb ~80×60, transparent background.
3. Confirm whether this FLA already uses Whirled **AvatarControl** or is a plain movie clip / sketch board.

Until then: Stuff shows **FLA Test Avatar — Coming Soon** guidance (see STATUS); do not Wear sketch JPEGs as a loft avatar.

## Do-nots
- Don’t drop Ruffle into live Rooms for all users until ENGINE-BRIDGE policy bump.
- Don’t expect the raw `.fla` to mount in the browser.
- Don’t replace Whirl with extracted sketch photos.
