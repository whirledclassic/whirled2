# Rooms fidelity — classic Whirled / whirled.club → Whirled2

**Purpose:** Player-facing notes so Whirled2 can copy classic room look + flow, then add modern extras.  
**Sources (2026-09-06):** [wiki.whirled.club Room](https://wiki.whirled.club/wiki/Room), [Door](https://wiki.whirled.club/wiki/Door), [FAQ](https://wiki.whirled.club/wiki/Frequently_asked_questions), [Room editing FAQ](https://wiki.whirled.club/wiki/Room_editing_FAQ), [Starting out](https://wiki.whirled.club/wiki/Starting_out), [Chat](https://wiki.whirled.club/wiki/Chat), [Music](https://wiki.whirled.club/wiki/Music), [Party](https://wiki.whirled.club/wiki/Party); live [whirled.club](https://whirled.club/) (JS client — little static HTML); mock at `/workspace/whirled2-web-mock/`.  
**Scope:** Report only. No ship. Prefer beginner comments on any future code edits.

Whirled2 is a same-game-spirit revival (classic chrome + new engine). Not affiliated with Three Rings / whirled.club; greyhavens/msoy is reference only.

---

## 1. How whirled.club rooms work (player-facing)

### What a room is

A **room** is a social hangout space: avatar walks on a backdrop, furniture/toys/pets/videos/images can be placed, music plays from a playlist (heard, not “seen”), chat goes to everyone present. Rooms link to other rooms via **doors** (any furniture marked as a door). First home room is free; extra rooms cost coins/bars; rooms cannot be deleted (classic).

### Discovery / lobby paths

Classic players reach rooms several ways (not only one “lobby screen”):

| Path | What you do |
|------|-------------|
| **Rooms tab** | Browse public rooms; click **thumbnail or name** to enter. |
| **Me → Rooms / My Rooms** | Your owned rooms as a thumbnail list; click thumb/name → enter. |
| **Profile → Your Rooms / View Rooms** | Unlocked public rooms for that player. |
| **Friends → Join them!** | Jump to the room a friend is in right now. |
| **Go… (control bar)** | Recently visited rooms, Go home, group halls, visit online friends. |
| **In-room doors** | Green-glow furniture → another room (or create/link a room while decorating). |
| **Groups** | Each group has ≥1 hall room. |

Lobby sections in spirit (Whirled2 already mirrors names): **Featured**, **Active**, **Hot New**, **My Rooms** — plus friends’ activity via Friends/Go, not only the Rooms tab.

### What you see BEFORE entering

Classic intent: **browse cards → decide → enter**. On a room listing / card you typically get:

- **Thumbnail** — room snapshot / scene preview (clickable).
- **Room name** — clickable.
- **Owner** (or home/group context).
- **Activity** — occupant **count** style (“N online now!”); friends path also implies **who** (Join them / visit friend).
- **Rating** — rooms can be commented/rated (Room menu → comment or rate; also from My Rooms name chrome).
- **Lock** — unlocked / friends-only / owner-only (enforced on enter; staff/Agents can bypass on classic).
- **Music?** — not a rich pre-enter “now playing” card in wiki docs; music loads **after** enter if volume is unmuted (mute skips loading the MP3 — useful when a bad track breaks the room).
- **Description** — less formal than Shop items; comments + rating carry social signal.

**User target for Whirled2:** lobby → **room card/preview** → see occupants/activity → **Enter**. Classic click-thumb-to-enter is instant; Whirled2 should keep that speed but add a clear **preview beat** (hover/sheet/detail) so people see who is already there *before* committing — “people can come on the room like before they enter.”

### Click room → enter sequence

1. Click thumbnail / name / Enter (or Join them / Go home / door).
2. Client loads the room stage (classic = Flash scene + entities; Whirled2 = `#stage-slot` + decorate layer + engine later).
3. If not muted, room playlist audio starts; playlist note UI appears when music is present.
4. Your avatar appears; you can click-to-walk (white outlined circle on standable floor; Shift+click height for fly/float).
5. Chat input is live; Room tab is the default group chat for that scene.
6. **Doors** (inside): hover shows green glow → click → load linked room (name on tooltip may lag if room renamed until door advanced-edit is updated).

There is no separate “hotel lobby door animation” documented for Rooms-tab enters — doors are **in-scene furniture**. Whirled2 can still add a short modern loading / curtain for polish.

### Occupant list while inside

- **Show/Hide occupants** via Chat options (classic); names also appear as blue-glow avatars on stage.
- Name colors: **blue** normal, **peach** logout-clone (dev), **gray + Zzz** idle, **yellow** `/away`, **white** pets; Club star prefix; AVR game icon over name.
- Click avatar (blue glow) → profile / invite / etc. Pets = grey glow for owner options.
- Whirled2 modernizes this as a **left rail**: “In this room (N)”, you-first, presence dots, friend highlight, owner crown, click menu (Profile / Whisper / Invite / Block…).

### Room menu (control bar → Room icon)

Classic Room menu / related chrome:

| Action | Notes |
|--------|--------|
| **Edit / Decorate Room** | Place/move furniture; **lock** triad lives here (unlocked / friends / locked). |
| **View items** | List furniture, toys, launchers, images, videos, backdrops (not avatars/pets); shop/bleep hooks. |
| **Comment or rate** | Stars + comments; Unmark themed Whirled from here or My Rooms. |
| **Take snapshot** | Preview popup + save/share options. |
| **View room playlist** | Current track (ID3) + queue; owner/managers remove/switch; anyone may add (max 99). |
| **Zoom** | Slider when room scrolls larger than viewport. |
| **Clickable furniture** | Hold to reveal glows: green door, orange link, white game. |
| **Share / embed** | Separate control-bar control for embedding the room. |
| **Go… / Friends / Parties / Volume** | Navigation + social + audio level. |

### Doors & multi-room (classic depth)

- Any furniture → **Make Door** while decorating.
- Link to **existing** room (stay in decorate popup → visit target → “Set this location as target”) or **buy new** room from My Rooms flow.
- **Drop Door** removes door behavior; the room itself remains.
- Creating rooms: Me → My Rooms pay path, or door “buy new” path.

### Visual chrome (look to copy)

- **Top:** pale-blue paper tabs — Me, Stuff, Games, **Rooms**, Groups, Shop; brand logo left; balances / mail / level right.
- **Lobby pages:** light paper panels, blue section banners (Featured band), white **room tiles** with left thumb + right meta, blue name links, bold “N online now!”.
- **In room:** dark **stage** (backdrop + avatars) fills the center; **occupant rail** (classic: chat-options list; Whirled2: left rail); **bottom control bar** with chat input (“Type here to chat!”), chat options, Go, Friends, Parties, Room, volume.
- **Chat:** Room tabs blue; private orange; group bluish-gray; Slide = dark history panel; Overlay = history on **left of room window**.
- Avoid gold/purple “premium” chrome for base UI (Whirled2 rule); Club membership is a separate Coming Soon lane.

---

## 2. Visual notes (whirled.club + wiki → mock tokens)

| Classic cue | Whirled2 mock today |
|-------------|---------------------|
| Pale blue paper (`#e8f4fb`-ish) | `--paper` / Classic Blue theme (`?v=20260906z`) |
| Blue accent links / tab on-state | `--accent` `#1e6fa8` |
| Room tile white card + border | `.room-tile` white, `#c5deee` border |
| Thumb = scene snapshot | `.room-tile .thumb` **placeholder gradient** (sky/floor bands) — not a real snapshot |
| Featured banner | `.featured` orange→blue section labels |
| Dark stage | `.stage-host` / `#stage-slot` dark teal stage copy |
| Bottom bar | `.bar` chat + toolbar Go / Friends / Parties / Room / Music |
| Occupant rail | `.rail.occ-rail` modern left list |
| Enter CTA | `.enter-label` blue gradient “Enter” |

Live whirled.club is a JS app (“Whirled Club is loading…”) — fidelity for layout comes from wiki behavior + this mock’s pale-blue shell, not from static HTML scrape.

---

## 3. Gap list vs `/workspace/whirled2-web-mock/`

### Large gaps (fidelity blockers for “lobby → see people → enter”)

1. **No pre-enter room preview sheet** — Tile click calls `tryEnterLoft()` and sets `inRoom` immediately. Missing: card/detail showing **occupant names**, lock, rating, owner, optional “now playing”, then Confirm Enter. This is the main miss vs user intent.
2. **Single shared loft only** — Everything is `Studio Loft` / `whirled2.*.loft`. No per-user homes as separate rooms, no **doors**, no multi-room graph.
3. **Lobby listings are shells** — Featured/Active/My Rooms all point at the same loft; Hot New is empty copy; no **friends’ rooms** strip fed by real presence; `ROOMS: RoomCard[] = []` in `src/data.ts`.
4. **Thumbnails are fake** — Gradient placeholder, not snapshot / decorate-layer raster / engine capture. Snapshot menu item is stub.
5. **Enter has no loading / transition** — Instant paint swap lobby ↔ `roomView()`; no door curtain, no asset-load progress (classic Flash load / Whirled2 engine mount).
6. **Decorate ≠ classic furniture stage** — Chips on `#decorate-layer` sibling of `#stage-slot`; no depth/hotspot/floor rugs, no Make Door, no glow system (green/orange/white/blue/grey).
7. **Profile “View Rooms”** — Jumps to Rooms lobby (`data-rooms-lobby`), not that player’s public room list.

### Medium gaps

8. **Lobby tiles omit lock icon / occupant names** — Count only (`N online now!` / `0 players`); lock badge exists **inside** `roomView` strip, not on lobby cards.
9. **Occupants API is thin offline** — Server path exists; Pages fallback is mostly you. No directory of “who’s in which public room” for Active/Featured.
10. **Music model differs** — Classic: Stuff MP3 playlist, anyone-add, owner remove/switch, mute-skips-load. Mock: local queue + YouTube/Spotify embeds in `#room-embed-dock`, owner-gated embeds — good modern upgrade, but playlist UX still not full classic View items + ID3 note.
11. **Parties** — Local create/join board; no follow-the-leader across rooms / party icon over names.
12. **Share/embed room** — Invite link copy exists; classic share/embed popup depth missing.
13. **Zoom / clickable-furniture highlight** — Stubs in Room menu.
14. **Name-color / idle / away / Club star** on occupants — Presence dots stubbed; not full wiki color language.

### Small gaps / polish

15. Recent-rooms chips exist (`whirled2.recentRooms`) — good; could show thumbs + lock.
16. Tour button = local tips only (honest) — fine until real tour rooms exist.
17. Comment/rate + lock triad in Room menu — **present and locally enforced** (`canEnterLoft`) — keep; surface lock on lobby cards.
18. Go menu / Friends Join them / hangout-invite-after-leave — partially there; wire to multi-room IDs later.
19. Group “Enter hall” is lobby/loft meta — not a distinct hall scene yet.

### What the mock already gets right (keep)

- Rooms tab ↔ lobby vs `inRoom` stage split (`roomsLobby` / `roomView`).
- Tile meta: name, owner, rating label, online count, Enter CTA.
- Lock triad unlocked/friends/locked with enter gating.
- Occupant left rail (modernized), chat Room/PM/Group tabs, Slide vs Overlay.
- Room menu: comment/rate, decorate, view items, playlist/music, lobby leave.
- Pale-blue chrome + dark stage; engine only via `WhirledChrome.getStageEl()` / `#stage-slot`.
- Beginner / How-this-works comments already used heavily in `app.js`.

---

## 4. Recommended next build (top 8)

Prioritized for **classic fidelity first**, then modern extras. Each item should land with **beginner comments** (`// How this works` / `// Beginner:`).

### 1. Room preview before enter (P0 — user intent) — **Shipped in ?v=20260906aa**

**Copy classic:** thumbnail + name + owner + rating + lock.  
**Modern:** occupant **names** + presence, optional now-playing, Enter / Cancel.  
**Flow:** lobby click → open preview sheet (do not set `inRoom` yet) → fetch/poll occupants for that room id → **Enter** → soft curtain → `tryEnterLoft` / future `tryEnterRoom(id)`.  
**Files:** `roomsLobby`, `roomTile` (`data-room-preview`), `#room-preview-panel`, `#room-enter-curtain`, CSS in `styles.css`.  
**Beginner comment:** explain preview vs enter so nobody wires paint(`rooms`) with `inRoom=true` on first click again.

### 2. Lobby card chrome parity (P0)

On every tile: real-ish thumb slot, lock glyph, rating, “N online” **and** up to ~3 occupant name chips (“Alex +2”). Friends’ rooms section: rooms where `loadFriends()` are present.  
Keep Featured / Active / Hot New / My Rooms; fill Active from presence when server available; keep Hot New honest-empty until publish API exists.

### 3. Soft enter sequence (P1)

Short loading curtain (“Entering Studio Loft…”) → mount stage → heartbeat occupants → start music respect mute. Hook for future engine `onRoomEnter`. No fake players.

### 4. Snapshot thumbs (P1)

Room menu Take snapshot: rasterize decorate-layer + stage placeholder (or engine callback later) → save dataURL on room record → lobby `.thumb`. Stub → real.

### 5. Multi-room data model (P1–P2)

`whirled2.rooms.{roomId}` + per-user home id; My Rooms list; profile View Rooms filters `ownerId` + unlocked. Keep single loft as default home for Pages offline. Beginner comments on keys + migration from `*.loft`.

### 6. Doors + glow legend (P2)

Decorate: Make Door / Drop Door / link target room; hover glow colors per wiki (green door, orange link, white game, blue avatar, grey pet). Can be CSS outline on chips until engine entities exist.

### 7. Directory presence API (P2)

Shared server: `GET /api/rooms` (id, name, owner, lock, rating, occupantIds/names, thumbUrl, updated). Pages fallback: local only, no invented strangers. Powers Active / friends’ rooms / preview.

### 8. Classic playlist + mute-safe load (P2, alongside modern embeds)

Stuff MP3 → room playlist (max 99); owner remove/switch; guest add policy; **muted = do not fetch media** (classic safety). Keep YouTube/Spotify as modern owner embed path in dock (already outside `#stage-slot`).

---

## 5. Implementation sketch (for whoever builds next)

```text
Lobby tile click
  → openRoomPreview(roomId)          // NOT inRoom yet
  → show thumb, owner, lock, rating, occupants[]
  → [Enter] → canEnter(roomId) → enterRoom(roomId)
       → loading curtain
       → inRoom=true; trackRecentRoom
       → paint roomView; loadOccupants; ensure music muted-safe
  → [Cancel] → close sheet, stay lobby
```

**Do not:** invent fake occupants to fill Active/Hot New.  
**Do:** beginner-comment every new localStorage key and the preview-vs-enter split.

---

## 6. Quick reference — classic control bar vs mock toolbar

| Classic | Mock |
|---------|------|
| Chat options (slide/overlay, occupants, clear, settings) | Chat options + `whirled2.chatUi` |
| Volume | Partial / music dock mute |
| Go… | Go menu + recent rooms |
| Friends | Friends popup |
| Parties | Party board local |
| Share/embed | Copy invite link |
| Room menu | comment, decorate, view items, snapshot stub, zoom stub, music, lock triad, lobby |
| Clickable furniture | Missing |
| Zoom | Stub |

---

*Last updated: 2026-09-06 (ET). Doc-only pass — nothing pushed.*
