# Whirled2 — Old avatar import + sync (research)

**Status:** research complete (2026-09-06) · chrome upload UI not shipped yet  
**Audience:** beginners + ENGINE DEV (hired engine integrator)  
**Goal:** let people bring classic Whirled avatars into Whirled2 and keep them so they are not lost in time.

---

## 1. What a classic Whirled avatar actually is

From **Grey Havens / Three Rings** source (`greyhavens/msoy`, `greyhavens/whirled-sdk`):

| Piece | Fact |
| --- | --- |
| Primary media | **Flash `.swf`** (Shockwave) — see `Avatar.isConsistent()` requiring `avatarMedia.isSWF()` or remixed |
| Scale | float `scale` on the Avatar item (default 1) |
| Thumb / furni | separate media hashes (`thumbMediaHash`, `furniMediaHash`) on `AvatarRecord` |
| Identity of bytes | **SHA-1 content hash** → `HashMediaDesc` (`hash` + mimeType + constraint) |
| Media URL shape | `HashMediaDesc.getMediaPath(mediaHash, mimeType)` under deployment `mediaURL` |
| Defaults | bundled `member` / `guest` SWFs + static PNG fallback (`Avatar.getDefaultMemberAvatarMedia`, etc.) |
| Behavior API | `com.whirled.AvatarControl` — `registerActions`, `registerStates`, speak / AFK / hotspot via `ActorControl` + `sharedEvents` host protocol |

**Upload path (classic server):** `ItemMediaUploadServlet` → SHA-1 hash file → `UploadUtil.publishUploadFile` (media store / historically S3) → item row points at hash, not a fragile path.

**Beginner takeaway:** an avatar is “a SWF file + a thumbnail + a scale number,” addressed forever by the **hash of the SWF bytes**. That hash is how we keep them from being lost.

---

## 2. Grey Havens + Whirled GitHub map

### Official Grey Havens org — https://github.com/greyhavens/

| Repo | Why it matters for avatars |
| --- | --- |
| [greyhavens/msoy](https://github.com/greyhavens/msoy) | Full Whirled platform. `Avatar.java`, `AvatarRecord.java`, `HashMediaDesc`, `ItemMediaUploadServlet`, room sprites |
| [greyhavens/whirled-sdk](https://github.com/greyhavens/whirled-sdk) | Creator SDK — `AvatarControl.as`, templates, examples |
| [greyhavens/whirled-api](https://github.com/greyhavens/whirled-api) | Shared API library |
| [greyhavens/whirled-projects](https://github.com/greyhavens/whirled-projects) | Example **avatars/**, pets, furni, games (study sources, not a shop dump) |
| [greyhavens/thane](https://github.com/greyhavens/thane) | Modified Tamarin VM used by MSOY server agents (not browser playback) |
| bang-*, everything*, greyweb | Other Grey Havens games / site — not avatar wardrobe |

### Community / archives

| Repo | Notes |
| --- | --- |
| [lulzsun/whirled2](https://github.com/lulzsun/whirled2) | **Separate** AGPL engine revival (live demo whirled.jimmyqua.ch). Already implements **SWF upload + Ruffle playback** + long spec `docs/specs/swf-avatar-rendering.md`. Architecture to **study**; do **not** copy AGPL code into this chrome mock without license review. |
| Whirled-Archives/Wiki | Wiki archive |
| Baking-Bits/WhirledBlocklist | Historical crashy-avatar blocklist idea (hash blacklist) |
| nking1232/msoy, marblyn/Whirled | msoy forks |

### Wiki (human docs)

- https://wiki.whirled.club/wiki/Create_avatars  
- https://wiki.whirled.club/wiki/Simple_avatar_(Flash_tutorial)  
- https://wiki.whirled.club/wiki/Whirled_SDK  

Creators published SWFs built with Adobe Flash + SDK templates; upload needed SWF + thumb metadata.

---

## 3. Can modern browsers play old avatars?

| Approach | Feasibility | Notes |
| --- | --- | --- |
| **Ruffle** (Flash emulator) | **Best practical path** | Community whirled2 already does per-avatar Ruffle → canvas → billboard; moving toward host shim `whirled-host.swf` so **unmodified** SDK SWFs get state/action control |
| Native Flash plugin | Dead | Not an option in 2026 browsers |
| Convert SWF → Spine / sprite sheets | Hard / lossy | Possible offline pipeline later; not required for v1 |
| Static PNG/GIF only | Easy fallback | No actions/states; fine for wardrobe preview |
| Mass-download whirled.club shop | **Do not** | Legal + ToS risk; only user-owned / licensed files |

**ENGINE DEV:** `#stage-slot` / `window.WhirledChrome` stays the mount. Chrome can own wardrobe UI + media URLs; engine owns Ruffle instances + AvatarControl host handshake.

---

## 4. Recommended Whirled2 plan (phased)

### Phase 0 — Archive so nothing is lost (do first)

**Content-addressed wardrobe**, mirroring classic `HashMediaDesc`:

```json
{
  "version": 1,
  "avatars": [
    {
      "id": "local-uuid",
      "name": "My loft fox",
      "sha1": "abcdef…",
      "mime": "application/x-shockwave-flash",
      "scale": 1,
      "thumbSha1": "…",
      "source": "user-upload",
      "createdAt": "2026-09-06T…"
    }
  ],
  "activeId": "local-uuid"
}
```

- Store **bytes** keyed by SHA-1 (demo server disk, or IndexedDB on Pages-only).
- Export / import a **wardrobe pack** (zip: `manifest.json` + `media/<sha1>.swf` + thumbs).
- Same hash on two devices = same avatar (dedupe, sync, backup).

### Phase 1 — Chrome upload UI (this repo)

Stuff → Avatars → **Upload SWF + optional thumb** (Coming Soon shell → real):

1. User picks `.swf` (and PNG thumb).
2. Browser computes SHA-1; POST to demo `POST /api/media` + `POST /api/wardrobe`.
3. List wardrobe; **Wear** sets `activeAvatar` on member presence.
4. Pages-only mode: IndexedDB + export zip (same-browser until demo server).

**Legal copy in UI:** only upload avatars **you created** or have rights to use (licensed bases). No shop scraping.

### Phase 2 — Engine playback bridge

```text
Chrome wardrobe  --mediaUrl-->  Engine in #stage-slot
                                 Ruffle (+ optional whirled-host.swf)
                                 AvatarControl events (state / action / speak)
```

Suggested `window.WhirledChrome` hooks (ENGINE DEV):

- `getWardrobe()` → list `{ id, name, mediaUrl, thumbUrl, scale }`
- `setActiveAvatar(id | mediaUrl)`
- `onAvatarSpoke` / bubble duration already in chrome chat settings

Study (don’t paste) lulzsun host-shim design: intercept SDK `sharedEvents` so **unpatched** user SWFs work.

### Phase 3 — Sync across devices / time

1. **Demo server** as source of truth (hash blob store + per-user wardrobe JSON).  
2. **Export/import zip** for offline backup.  
3. Optional later: GitHub Release / object storage mirror of *your* hashes.  
4. Optional: blacklist bad hashes (classic upload had `checkBlacklist(hash)`).

---

## 5. What we will NOT do

- Invent a fake shop full of other people’s avatars.
- Claim Flash EOL is solved without Ruffle (or similar).
- Copy AGPL engine code into this BSD-oriented chrome mock without a deliberate license decision.
- Depend on Grey Havens media CDN still serving private user files forever — **user re-upload + hash archive** is the durable path.

---

## 6. Next code steps (this web-mock)

1. Add Stuff → **My avatars** panel (list + Wear + Export) using `localStorage` / IndexedDB stubs.  
2. Demo server: `POST /api/media` (sha1 body), `GET /api/media/:sha1`, `GET/PUT /api/wardrobe/:memberId`.  
3. Extend `ENGINE-BRIDGE.md` with wardrobe + Ruffle mount contract.  
4. Coordinate with engine repo: Ruffle in `#stage-slot`, host shim for AvatarControl.  
5. Optional: link “learn from SDK examples” → `greyhavens/whirled-projects/avatars` (source study only).

---

## 7. Citations (source paths)

- `greyhavens/msoy` → `src/java/com/threerings/msoy/item/data/all/Avatar.java`  
- `greyhavens/msoy` → `src/java/com/threerings/msoy/item/server/persist/AvatarRecord.java`  
- `greyhavens/msoy` → `src/java/com/threerings/msoy/data/all/HashMediaDesc.java` (SHA-1 + media path)  
- `greyhavens/msoy` → `src/java/com/threerings/msoy/item/server/ItemMediaUploadServlet.java`  
- `greyhavens/whirled-sdk` → `libraries/whirled/src/main/as/com/whirled/AvatarControl.as`  
- `lulzsun/whirled2` → `docs/specs/swf-avatar-rendering.md`, `api/avatar.go`, `api/stuff.go` (architecture reference; AGPL)

---

## 8. One-line answer

**Upload your own classic `.swf` (+ thumb), store by SHA-1 like Grey Havens `HashMediaDesc`, sync wardrobe JSON + blobs on the demo server (and export zips), play in-engine with Ruffle + an AvatarControl host shim — that is how old Whirled avatars survive into Whirled2 without being lost in time.**
