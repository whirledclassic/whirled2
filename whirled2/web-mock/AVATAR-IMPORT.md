# AVATAR-IMPORT — classic Whirled avatars → Whirled2

**STATUS: DEFERRED / SIDE PROJECT — locked off for normal users.**

**Audience:** beginners on the web-mock chrome + ENGINE DEV on the Pixi (or later) room engine.  
**Status:** Phase 0–1 wardrobe foundation exists behind a feature flag; **not** active for visitors (Sep 2026). **Do not** treat this as a license to scrape whirled.club shop media.  
**Unlock side work:** URL `?avatarLab=1` (sets `localStorage whirled2.avatarLab = "1"`) or set that storage key manually. Default **OFF**.  
**Related:** `ENGINE-BRIDGE.md` (Flash/Ruffle still banned for live rooms; Phase 2 deferred), Stuff upload UI in `app.js`, research clones under `/workspace/research/`.

**What normal users see:** Stuff → Avatars keeps the stub thumbnail upload + a quiet **“Classic SWF wardrobe — On hold”** note. No SWF upload UI, no Wear that affects the room.

---

## Beginner summary (read this first)

Classic Whirled avatars were mostly **Flash `.swf` files** plus a small **thumbnail image** (about **80×60**). Creators uploaded them from **Stuff → Avatars**. The server stored files by a **content hash** (SHA-1 of the bytes) and served them from a media CDN URL like:

`{mediaURL}` + `{40-char-hex-hash}` + `.swf` / `.png` / …

The SWF talked to the room through **`AvatarControl`** (Whirled SDK): hotspot (feet / nameplate), facing (0–359°), walk vs idle, named **states**, one-shot **actions**, sleep, etc.

Browsers no longer run Flash. Revival options:

1. **Keep the SWF** and play it with **Ruffle** behind a small **host shim** (best fidelity for real SDK avatars).
2. **Convert** to sprite sheets / Spine / WebGL (lossy; good for simple / static looks).
3. **Static PNG/GIF** fallbacks (already close to today’s web-mock stubs).

**Whirled2 should not mass-download other people’s shop items.** Only the user’s **own** files, licensed bases, or media they already legally have.

**Top recommendation:** Phase 0–1 archive + upload shell now; Phase 2 reuse the proven **Ruffle + `whirled-host.swf`** pattern (see community `lulzsun/whirled2`); Phase 3 sync wardrobe by content hash so files are not lost when localStorage clears.

---

## 1) Repo map

| Repo | Role for avatars |
|------|------------------|
| [greyhavens/msoy](https://github.com/greyhavens/msoy) | Original platform: upload servlet, `Avatar` / `AvatarRecord`, `HashMediaDesc`, mime types, S3/media store |
| [greyhavens/whirled-sdk](https://github.com/greyhavens/whirled-sdk) | Creator SDK: `AvatarControl.as`, templates, `default-avatar.swf` |
| [greyhavens/whirled-api](https://github.com/greyhavens/whirled-api) | Parallel API library copy of `AvatarControl` |
| [greyhavens/whirled-projects](https://github.com/greyhavens/whirled-projects) | Example avatars (AS3 + FLA), remix `_data.xml` datapacks, ImageFlipper bounce avatar |
| [greyhavens/thane](https://github.com/greyhavens/thane) | Server-side Tamarin/Flash-compat VM — **not** a browser player; useful historically, not for `#stage-slot` |
| [threerings/orth](https://github.com/threerings/orth) | Shared `MediaDesc` / **`MediaDescSize`** (thumbnail **80×60**) |
| [lulzsun/whirled2](https://github.com/lulzsun/whirled2) | **Community revival** with working **Ruffle host shim** (`flash/whirled-host/`) and long spec `docs/specs/swf-avatar-rendering.md` — **study & cite; do not copy AGPL code blindly into our stack without license review** |
| [Whirled-Archives/Wiki](https://github.com/Whirled-Archives/Wiki) | Archived wiki dump; live docs also at [wiki.whirled.club](https://wiki.whirled.club) |
| Community forks | `nking1232/msoy` (old msoy fork); `Damian1992die/whirled-wyvern` (exported game project, not avatar CDN); `Baking-Bits/WhirledBlocklist` (moderation list, not media) |

**Local research clones (this box):** `/workspace/research/{msoy,whirled-sdk,whirled-api,whirled-projects,thane}/`

**Live wiki (reachable):** [Create avatars](https://wiki.whirled.club/wiki/Create_avatars), [AvatarControl ASdocs](https://www.whirled.club/code/asdocs/com/whirled/AvatarControl.html), orientation / configurable avatar tutorials.

---

## 2) Format facts (A) — what is a classic avatar?

### Primary media

| Kind | Mime / suffix (msoy) | Notes |
|------|----------------------|--------|
| **Flash avatar SWF** | `APPLICATION_SHOCKWAVE_FLASH` (40) → `.swf` | Normal creator upload. `Avatar.isConsistent()` requires primary media **SWF or remixed**. |
| **Remixed datapack ZIP** | `APPLICATION_ZIP` (42) / `APPLICATION_ZIP_NOREMIX` (44) → `.zip` | Remixable packs: `_data.xml` + `_CONTENT` blob (often a base SWF) + optional texture files. See `whirled-projects/avatars/snowman/data/_data.xml`, `imageflipper-remix/`. |
| **Static / bounce image path** | PNG/JPEG/GIF as upload → often packaged into ImageFlipper-style remix | Wiki: “SWF **or image file to be converted into a bouncing image avatar**.” Example AS: `ImageFlipper.as` (max 600×450 image, flip + bounce while walking). |
| **Default stubs** | Default SWF via `DefaultItemMediaDesc` (`member` / `guest`); static PNG via `getStaticImageAvatarMedia()` | Client defaults when no custom media. |

**Citations (msoy):**

- `src/java/com/threerings/msoy/item/data/all/Avatar.java` — fields `avatarMedia`, `scale`; consistency = SWF \|\| remixed.
- `src/java/com/threerings/msoy/item/server/persist/AvatarRecord.java` — DB: `avatarMediaHash`, `avatarMimeType`, `scale`, plus inherited `thumbMediaHash` / `thumbMimeType`.
- `src/java/com/threerings/msoy/data/all/MediaMimeTypes.java` — mime byte codes + suffixes.
- `src/java/com/threerings/msoy/data/all/HashMediaDesc.java` — URL = `mediaURL + hex(hash) + suffix`.

### Thumbnail

- Wiki + orth: **max ~80×60**, PNG/JPG/GIF.
- `MediaDescSize.THUMBNAIL_WIDTH = 80`, `THUMBNAIL_HEIGHT = 60` (`threerings/orth` … `MediaDescSize.java`).
- Upload pipeline can auto-scale thumbs to PNG (`UploadUtil` → `THUMBNAIL_MIME_TYPE = IMAGE_PNG`).

### Remix / datapack extras (not always present)

- `_data.xml` declares colors, numbers, optional `DisplayObject` files, and `_CONTENT` SWF blob.
- Runtime: `AvatarControl.getDefaultDataPack()` / `DataPack` (see Snowman / ImageFlipper examples).

### Size limits (original upload servlet)

From `ItemMediaUploadServlet.java`:

| Mime class | Cap |
|------------|-----|
| Images (small) | **5 MB** |
| SWF (medium) | **10 MB** |
| ZIP / audio / video (large) | **100 MB** |

---

## 3) Original upload flow (B) — msoy Java / DB / CDN

```
Browser (Stuff → Upload avatar)
    │  multipart: Avatar Media (SWF|image|zip) + Thumbnail Media
    ▼
ItemMediaUploadServlet  (item media upload)
    │  detect mime, size-check, blacklist hash
    │  SHA-1 of bytes  (UploadFile: MessageDigest.getInstance("SHA"))
    │  publish to media store (local dir and/or S3)
    ▼
HashMediaDesc  →  path = mediaURL + hexHash + ".swf"|".png"|…
    │
    ▼
GWT Item editor  ← JS callback parent.setHash(mediaId, filename, hash, mime, …)
    │
    ▼
AvatarRecord / Item tables
    avatarMediaHash + avatarMimeType + scale
    thumbMediaHash + thumbMimeType (+ furni media optional)
```

**Key classes / paths:**

| Piece | Where |
|-------|--------|
| Upload servlet | `msoy/.../item/server/ItemMediaUploadServlet.java` |
| Publish / hash store | `msoy/.../web/server/UploadUtil.java` (`publishUploadFile`, `publishImage`) |
| Hash → URL | `HashMediaDesc.getMediaPath(prefix, hash, mimeType)` |
| Config base URL | `DeploymentConfig.mediaURL` (`@media_url@`); server `ServerConfig.mediaURL`, `mediaDir`, optional `mediaS3*` |
| Proxy prefix | `DeploymentConfig.PROXY_PREFIX = "/remedia/"` |
| Cloudfront signed URLs | `CloudfrontMediaDesc` — signing historically disabled (`getMediaPath` falls back to unsigned hash path) |

**URL pattern (canonical):**

```text
{mediaURL}{sha1_hex_lowercase}{suffix}
# example shape (wiki / upload UI): 031c99dbf403923daad884fb562bd7f0d83d555x.swf
# note: classic hashes are 40 hex chars (SHA-1); wiki examples sometimes show an extra digit/typo in docs
```

**Live probe (Sep 2026, accurate, limited):**

- `https://www.whirled.club/` responds (club still up).
- `https://mediaserver.whirled.com/` answers via Cloudflare → Wasabi/S3 with **AccessDenied** on unknown keys (bucket exists; **do not** scrape or brute hashes).
- We **did not** verify that arbitrary old shop hashes still publicly serve. Even if some URLs still 200, **mass import of others’ shop media is out of scope / not legal strategy**.

**User-facing flow (wiki Create avatars):**

1. Stuff → Avatars → Upload  
2. Name  
3. Avatar Media = SWF **or** image (bounce conversion)  
4. Thumbnail Media = bitmap ≤ 80×60  
5. Description (required to sell)  
6. Copyright confirmation → Save → inventory  

---

## 4) What `AvatarControl` expects (C)

**Inheritance:** `AvatarControl` → `ActorControl` → `EntityControl` → `AbstractControl`.

**Sources:** `whirled-sdk/.../AvatarControl.as`, `ActorControl.as`, `EntityControl.as`; live ASdocs on whirled.club; tutorials (hotspot / orientation).

| Concern | API / behavior |
|---------|----------------|
| **Construct** | `new AvatarControl(this)` — display object must be on stage |
| **Hotspot** | `setHotSpot(x, y, height?)` — pixels from top-left; default ≈ `(width/2, height)`. `height` = pixels **above** hotspot for name label |
| **Facing** | `getOrientation()` / `setOrientation(orient)` — **0 = facing camera/forward**, increases **counter-clockwise** to **359** |
| **Walk** | `isMoving()`; appearance changes when walk starts/stops |
| **Location** | logical `[x,y,z]` fractions or pixel location; `setPreferredY(pixels)` for flying / off-ground |
| **States** | `registerStates(...)` persistent; first = default; `getState` / `setState`; ≤ 64 chars |
| **Actions** | `registerActions(...)` one-shots; `ACTION_TRIGGERED`; ≤ 64 chars |
| **Speech / sleep** | `AVATAR_SPOKE`; `isSleeping()` + `APPEARANCE_CHANGED` |
| **Host handshake** | Control dispatches `"controlConnect"` on `root.loaderInfo.sharedEvents` with `userProps` / `hostProps` (two SDK vintages in the wild — see below) |

**ENGINE DEV — orientation rule of thumb:** treat `orient > 180` as “face left” for simple 2D flippers (ImageFlipper / many bases); full 360 avatars listen to `APPEARANCE_CHANGED` and redraw.

**Two SDK vintages (community-verified in `lulzsun` WhirledHost):**

1. Older `WhirledControl` — props on the connect event directly; `appearanceChanged_v1(location, orient, moving)`.  
2. Newer `AbstractControl` — props under `event.props`; `appearanceChanged_v2(..., sleeping)`.

Host → avatar drives motion via **`appearanceChanged_*`**, not by calling the avatar’s `setOrientation` (that direction is avatar → host request).

---

## 5) Can modern stacks play old SWFs? (D)

| Approach | Feasibility | Fidelity | Notes |
|----------|-------------|----------|--------|
| **Ruffle (AVM2/AS3) + host shim** | **High** for SDK avatars | High for shapes/bitmaps/masks; filters/Stage3D limited | Proven by `lulzsun/whirled2` (`whirled-host.swf`). Ruffle implements `LoaderInfo.sharedEvents`. Needs `allowScriptAccess` for EI between shim ↔ JS. |
| **Ruffle alone (no shim)** | Low for control | Visual may work; **no** walk/state unless SWF was hand-patched with `ExternalInterface` | Stock Whirled SWFs have **zero** EI — they only speak `controlConnect`. |
| **OpenFL / Haxe transpile** | Low–medium | Lossy; project-by-project | Not a drop-in for arbitrary user SWFs. |
| **Offline SWF → sprite sheet / Spine / glTF** | Medium | Lossy; weak for remix/datapack/reactive avatars | Good LOD / distant avatars later. |
| **PNG/GIF/WebP static** | High | Idle pose only | Matches current web-mock stub path. |
| **Thane** | N/A for browsers | — | Server Unix Tamarin + partial Flash libs. |

**ENGINE DEV note:** Current `ENGINE-BRIDGE.md` §8 says **“Do not bring Flash / SWF / Ruffle into this stack.”** That was correct for day-one Pixi walk demos. **Avatar import Phase 2 requires an explicit policy bump** (bridge version ≥ 0.5) so Ruffle lives in a **chrome-owned overlay / sandbox**, while Pixi keeps nametags / click-to-walk / room geometry. Do not silently violate the do-not list.

---

## 6) Practical Whirled2 paths ranked (E)

### 1) User uploads own SWF + thumb → demo server / IndexedDB / Git LFS → Ruffle + host shim *(recommended primary)*

**Feasibility: highest for “real” classic avatars.**

- User proves copyright checkbox (already in Stuff upload).  
- Store bytes by **content hash**; inventory JSON points at hash.  
- Engine/chrome loads **host SWF in Ruffle**, host `Loader.load`s avatar URL.  
- Drive via `setAppearance` / `setState` / `playAction` (shim ExternalInterface).  

**Pros:** unmodified SDK avatars; matches original format; community prior art.  
**Cons:** Flash EOL complexity; CPU/wasm cost; security (untrusted SWF) — isolate; license review if borrowing `lulzsun` AGPL ideas/code.

### 2) Convert SWF → sprite sheets / Spine / WebGL *(lossy)*

**Feasibility: medium; good as Phase 4+ LOD.**

- Offline job at upload or “Bake” button.  
- Loses AvatarControl reactivity unless you map frame labels → states.  

### 3) PNG/GIF static (and optional simple bounce in Pixi)

**Feasibility: highest short-term; already almost there.**

- Web-mock Stuff already accepts images for stubs (~200KB cap today).  
- Pixi can bounce/flip like ImageFlipper without Flash.  

### 4) Import from whirled.club if media URLs still serve

**Feasibility: uncertain; legally constrained.**

- Pattern known (`HashMediaDesc`).  
- Host `mediaserver.whirled.com` exists but denies anonymous listing; individual object availability **not** something we should scrape.  
- **Allowed:** user pastes a URL **they own** / creator re-upload of **their** hash if it still 200s.  
- **Disallowed:** bulk shop mirror / “download everyone’s avatars.”

### 5) Archive pack: zip of media IDs + metadata JSON synced to account

**Feasibility: high as portability layer (pairs with 1).**

```text
wardrobe-pack.zip
  manifest.json     # version, user, items[]
  media/
    {sha1}.swf
    {sha1}.png
```

Import into Stuff + optional demo-server wardrobe.

---

## 7) Sync so avatars are not lost (F)

| Mechanism | Purpose |
|-----------|---------|
| **Content-addressed hash of bytes** | Same as classic (SHA-1 hex) for interoperability with msoy URLs; optionally also store **SHA-256** for modern integrity. Dedupes identical SWFs. |
| **Per-user wardrobe inventory JSON** | On demo server when logged in: `{ activeId, items:[{id,name,hash,mime,thumbHash,scale,createdAt}] }`. Mirror key in localStorage for Pages-only. |
| **Export / import wardrobe file** | One-click download of archive pack (E5); import merges by hash. |
| **Optional durable mirror** | User-opt-in GitHub Release asset, IPFS CID, or S3 — **only their pack**, never a scraped catalog. |
| **Legal** | Checkbox: own creation / licensed base / permission. No shop scrape. Respect remix “no remix” ZIP mime. |

**Suggested inventory record (chrome):**

```json
{
  "id": "av_…",
  "kind": "avatar",
  "name": "My Bean",
  "sha1": "…40 hex…",
  "sha256": "…optional…",
  "mime": "application/x-shockwave-flash",
  "bytes": 123456,
  "thumbSha1": "…",
  "thumbMime": "image/png",
  "scale": 1,
  "source": "upload",
  "mediaUrl": "/media/….swf",
  "createdAt": "2026-09-06T…"
}
```

---

## 8) Bridge for hired engine (G) — `window.WhirledChrome` extensions

**Today (v0.4)** — `exposeBridge()` in `app.js`:

- `getStageEl`, `getSession`, `getRoom`, chat, occupants, wallet  
- **Missing:** wardrobe list, active avatar, media URLs, SWF hooks  

**Proposed (v0.5+)** — chrome owns inventory; engine consumes:

```js
window.WhirledChrome = {
  version: "0.5",
  // …existing…
  listWardrobe: function () { /* avatar items for session user */ },
  getActiveAvatar: function () { /* item or null */ },
  setActiveAvatar: function (itemIdOrNull) { /* persist + emit event */ },
  onAvatarChange: function (fn) { /* subscribe */ },
  // mediaUrl may be blob:, /media/{hash}.swf, or https same-origin
  resolveAvatarMediaUrl: function (item) { /* string */ }
};
```

**ENGINE DEV integration sketch:**

1. Pixi mounts **only** in `#stage-slot` (unchanged).  
2. Optional **chrome** layer `#avatar-swf-layer` (sibling under `.stage-host`, z-index between stage and decorate) hosts Ruffle players **or** engine composites Ruffle canvases into Pixi textures — pick one topology and document it.  
3. On `setActiveAvatar` / `onAvatarChange`: engine calls host shim `whirledSetAppearance(hostId, x,y,z, orient, moving, sleeping)` when the player walks.  
4. Nametag Y: prefer shim `setHotSpot` height / `setPreferredY` over guessing pixels.  

**Do not** put Ruffle inside Pixi’s ownership without coordinating z-index with `#decorate-layer` / `#stage-bubbles` (see ENGINE-BRIDGE §10).

---

## 9) Current web-mock gap (peek)

| Area | Today | Gap |
|------|--------|-----|
| Stuff → Avatars | Empty inventory copy; upload **image stub** only; copy says “SWF / full media arrives with the engine later”; ~**200KB** image cap | No SWF field, no hash store, no wear → room |
| `localStorage` `whirled2.stuff` | Cap 200 items; thumbs as data URLs | No binary media store; clears = loss |
| `server/server.mjs` | Auth, chat, room music — **no** `/api/wardrobe` or media | Need endpoints for sync |
| `WhirledChrome` | v0.4 stage/session/chat/wallet | No wardrobe / active avatar |
| `ENGINE-BRIDGE.md` | Explicit **no Flash/Ruffle** | Policy conflict with Phase 2 — must revise deliberately |
| Stage | Empty `#stage-slot` + chrome speech bubbles | No avatar sprite / SWF |

---

## 10) Recommended phased plan

### Phase 0 — Archive (now, no playback)

**Goal:** users’ files stop disappearing.

1. Document this file; link from `DEV-NOTES.md` / `STATUS.md` (chrome owners).  
2. Add **Export wardrobe** (JSON + optional zip of blobs user already uploaded as stubs).  
3. Encourage creators to keep original `.swf` + thumb on disk / Git LFS personally.  
4. **Do not** scrape whirled.club.

### Phase 1 — Upload UI “Coming Soon” shell → then real stub+SWF accept

**Goal:** chrome UX matches classic Stuff upload without claiming playback yet.

1. Stuff → Avatars upload form:  
   - Name, description, copyright checkbox (exists)  
   - **Avatar media** file input: `.swf` *Coming Soon* badge **or** accept SWF and store opaque blob without playing  
   - **Thumbnail** png/jpg/gif (enforce 80×60 soft max / rescale)  
2. Compute **SHA-1** (and SHA-256) in browser; store metadata in `whirled2.stuff`.  
3. Prefer **IndexedDB** for blobs > localStorage quota; keep JSON index in localStorage.  
4. Detail pane: “Wear in room — Coming Soon” + hash fingerprint.  
5. Demo server: `POST /api/wardrobe/media` (auth) → save by hash; `GET /api/wardrobe` inventory.

### Phase 2 — Ruffle bridge (policy bump + ENGINE DEV)

**Goal:** wear own SWF in loft.

1. Revise `ENGINE-BRIDGE.md`: allow Ruffle **only** via chrome-managed host shim; Pixi remains authoritative for room coords.  
2. Vendor **Ruffle** + ship a **host SWF** (implement ourselves under our license, or negotiate AGPL compatibility with `lulzsun/whirled2`’s shim — **legal review first**).  
3. Wire `setActiveAvatar` → load host → load avatar media URL.  
4. Map Pixi walk → `appearanceChanged` (edge-triggered start/stop, not every frame — classic avatars restart walk cycles if spammed).  
5. Security: size caps, magic-byte check (`FWS`/`CWS`/`ZWS`), same-origin media, sandbox strategy (cross-origin iframe / worker — see community spec W3).  

### Phase 3 — Sync & portability

**Goal:** change browsers / clear storage without losing wardrobe.

1. Server wardrobe as source of truth when demo API on; Pages = local + export reminder.  
2. Import/export pack (E5).  
3. Optional user mirrors (Release / IPFS / S3).  
4. Later: sprite-sheet bake (E2) as LOD; static PNG (E3) always available.

---

## 11) Exact next code steps

### Chrome (`whirled2-web-mock`)

1. **Docs:** keep this file; add one-line pointer in `STATUS.md`.  
2. **`app.js` Stuff upload:**  
   - For `typeId === "avatars"`, add second file input `avatarMedia` (`.swf,.zip`) marked Coming Soon **or** store-without-play.  
   - Raise/split size limits: thumb ≤ 200KB–1MB; SWF ≤ 10MB (match classic medium).  
   - On save: `crypto.subtle.digest` SHA-256 + JS SHA-1 helper; put blob in IndexedDB `whirled2.media`.  
3. **`exposeBridge()`:** bump to `0.5`; add `listWardrobe` / `getActiveAvatar` / `setActiveAvatar` / `onAvatarChange` (even if wear is no-op initially).  
4. **`server/server.mjs`:**  
   - `GET/PUT /api/wardrobe`  
   - `PUT /api/media/:hash` (raw body, auth, mime allowlist)  
   - `GET /api/media/:hash`  
5. **UI:** Stuff detail → Wear; Me tab shows active thumb.  
6. **ENGINE-BRIDGE.md:** replace Flash ban with “Ruffle only behind chrome host shim; coordinate z-index.”

### Engine integrator (private Pixi repo)

1. Subscribe `WhirledChrome.onAvatarChange`.  
2. Until Phase 2: show **thumb** or placeholder bean at player feet.  
3. Phase 2: either  
   - **A)** ask chrome to mount Ruffle overlay and report footprint, or  
   - **B)** own Ruffle instances and draw to texture — document choice in engine README.  
4. When moving: call chrome/shim appearance API with logical room coords + orientation + moving flag **on edges**.  
5. Prefer hotspot / preferredY for nametag; keep listening to `onChat` for mouth/`avatarSpoke` later.

---

## 12) Risks

| Risk | Mitigation |
|------|------------|
| **Flash EOL / Ruffle gaps** | Host shim; corpus test (guest/member/SDK samples from whirled-projects); graceful PNG fallback |
| **Copyright / shop scrape** | User-owned uploads only; no bulk CDN harvest; keep copyright checkbox |
| **File size / quota** | Classic 10MB SWF; IndexedDB + server; warn on export size |
| **Untrusted SWF / XSS via ExternalInterface** | Shim-only script access; isolate players; never `allowScriptAccess` to raw avatar |
| **License clash** (`lulzsun/whirled2` is **AGPL-3.0**) | Reimplement shim from public SDK protocol docs, or accept AGPL for the whole distribution — **decide before copying code** |
| **ENGINE-BRIDGE policy conflict** | Explicit versioned bridge bump |
| **Perf (many wasm instances)** | Cap concurrent SWFs; distant LOD to static; learn from community one-player/room work later |
| **Remix datapacks** | Phase 2.5: unpack ZIP + `_data.xml` or require baked SWF export from creators |

---

## 13) Answers checklist (A–G)

| # | Answer |
|---|--------|
| **A** | Classic = **SWF** (+ optional **remix ZIP** / bounce **image→ImageFlipper**); **thumb PNG/JPG/GIF ~80×60**; DB stores **SHA-1 hashes** + mime + **scale**. |
| **B** | Upload via **`ItemMediaUploadServlet`** → SHA-1 publish → **`HashMediaDesc` URL** → **`AvatarRecord`**; media URL from **`media_url` / S3**. |
| **C** | **`AvatarControl`**: hotspot, states, actions, orientation 0–359 CCW, moving, sleep, preferredY; host handshake on **`controlConnect`**. |
| **D** | **Ruffle + host shim = best**; transpile/sprite-sheet = lossy; static images = easy fallback; Thane ≠ browser. |
| **E** | Ranked: **(1) user SWF+Ruffle** → (3) static → (5) archive pack → (2) bake → (4) club URL only if user-owned & still serves. |
| **F** | Hash + wardrobe JSON + export/import + optional mirror; **no shop scrape**. |
| **G** | Extend **`WhirledChrome`** with wardrobe / `setActiveAvatar` / media URL; engine drives shim appearance. |

---

## 14) Top recommended approach (one paragraph)

**Ship Phase 0–1 immediately:** content-addressed storage of **user-supplied** SWF+thumb (IndexedDB + demo-server), wardrobe JSON, and export packs so creations are not lost. **Then Phase 2:** bump the engine bridge and play those SWFs with **Ruffle loading a small host shim** that speaks the real `AvatarControl` handshake (the approach validated by community whirled2 — reimplement or license-clear before merging). Keep Pixi for room/walk; use static thumbs as fallback. **Never** mass-download whirled.club shop media.

---

*Research notes drawn from greyhavens/msoy, whirled-sdk, whirled-projects, orth MediaDescSize, wiki.whirled.club, and public lulzsun/whirled2 host shim + swf-avatar-rendering spec (Aug 2026). Local clones: `/workspace/research/`.*
