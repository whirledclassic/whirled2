# GREY-HAVENS-PROTOCOL — Whirled2 Flash sync (study → reimplement)

**Purpose:** Document the classic Whirled control wire so Whirled2’s companion `AvatarHost` can drive stock SDK avatars like whirled.club — **without copying AGPL msoy/world-client source**.  
**Cache notes:** toward `?v=20260906by`  
**Rule:** protocol reimplementation only. Local Grey Havens dumps under `/tmp/whirled-research/` are read-only study material.

---

## Connect handshake

| Step | Who | What |
| --- | --- | --- |
| 1 | Avatar | `new AvatarControl(disp)` while `disp` is on stage |
| 2 | AbstractControl | Builds `userProps` via `setUserProps` (Entity → Actor → Avatar) |
| 3 | AbstractControl | Dispatches `"controlConnect"` on `disp.root.loaderInfo.sharedEvents` with `props.userProps` |
| 4 | Host ControlBackend | Listener already registered on nested Loader’s `sharedEvents` |
| 5 | Host | Saves userProps; builds `hostProps` + nested `initProps`; sets `props.hostProps` |
| 6 | Avatar | `gotHostProps` → `_funcs = hostProps`; consumes `initProps` then deletes it |
| 7 | Host EntityBackend | After connect: `requestControl` → `callUserCode("gotControl_v1")` |
| 8 | Duplicate connect | Set `props.alreadyConnected = true` and return |

Whirled2: Ruffle loads **host.swf** (http); avatar bytes via `Loader.loadBytes` (not nested `blob:` URL). Listen for `controlConnect` **before** `load` / `loadBytes`.

---

## hostProps bag (Actor / Avatar)

Inherited from **ControlBackend → EntityBackend → ActorBackend → AvatarBackend**.

### Always present (transactions)

- `startTransaction` / `commitTransaction`

### EntityBackend

`lookupMemory_v1`, `updateMemory_v1`, `getMemories_v1`,  
`getInstanceId_v1`, `getViewerName_v1`, `getMyEntityId_v1`,  
`getEntityIds_v1`, `getEntityProperty_v1`,  
`setHotSpot_v1`, `sendMessage_v1`, `sendSignal_v1`,  
`getRoomBounds_v1`, `canEditRoom_v1`,  
`showPopup_v1`, `clearPopup_v1`,  
`getCamera_v1`, `getMicrophone_v1`,  
`getMusicId3_v1`, `getMusicOwner_v1`,  
`selfDestruct_v1`,  
`triggerEvent_v1` (deprecated → action message)

### ActorBackend (walk / state)

- `setLocation_v1(x,y,z,orient)` — logical 0..1 room coords  
- `setMoveSpeed_v1(pxPerSec)` — default 500, min 50  
- `setWalkSpeed_v1(n)` — deprecated; club does `setMoveSpeed_v1(n * 1000)`  
- `setOrientation_v1(orient)` — club notes TODO / not working server-side  
- `setState_v1` / `getState_v1`

### AvatarBackend

- `setPreferredY_v1(pixels)` — preferred height off ground

### initProps (startup only)

| Key | Source |
| --- | --- |
| `location` | `[x,y,z]` logical |
| `env` | `"room"` / `"shop"` / `"viewer"` |
| `datapack` | ByteArray or null (`getAndClearDataPack`) |
| `orient` | Actor |
| `isMoving` | Actor |
| `isSleeping` | Avatar (`MemberSprite.isIdle`) |

---

## userProps bag (host → avatar)

### EntityControl

`gotControl_v1`, `messageReceived_v1(name,arg,isAction)`, `signalReceived_v1`,  
`memoryChanged_v1`, `receivedChat_v2`,  
`entityEntered_v1` / `entityLeft_v1` / `entityMoved_v2`,  
`lookupEntityProperty_v1`,  
`hasConfigPanel_v1` / `getConfigPanel_v1`,  
`musicStartStop_v1` / `musicId3_v1`

### ActorControl

`appearanceChanged_v2(location, orient, moving, sleeping)`  
`appearanceChanged_v1(location, orient, moving)` — legacy  
`stateSet_v1(newState)`

### AvatarControl

`avatarSpoke_v1()`, `getActions_v1()`, `getStates_v1()`

---

## Walking / sleeping / emote

### Club OccupantSprite

```
moveTo(dest):
  kill prior WalkAnimation
  setOrientation(dest.orient, false)
  _walk = WalkAnimation(...); start
  appearanceChanged()   // isMoving() == true

walkCompleted():
  _walk = null
  appearanceChanged()   // isMoving() == false
```

`ActorSprite.appearanceChanged` → `appearanceChanged_v2(loc, orient, isMoving(), isIdle())`.

### Body / FLA convention (wiki)

- Standing: scene/clip `state_<Name>` (default `state_Default`)
- Walking: `state_<Name>_walking`
- Optional transitions: `*_towalking`, `*_fromwalking` (Body.as / MovieClipBody — SDK, not world-client strings)
- On `APPEARANCE_CHANGED`: re-query `getOrientation()`, `isMoving()`, `isSleeping()`

### Emote / speak

- Emote: host calls `messageReceived_v1(actionName, null, true)` → `ACTION_TRIGGERED`
- Speak: host calls `avatarSpoke_v1()` → `AVATAR_SPOKE`
- Avatar may also `sendMessage_v1` / `triggerAction` back to host

---

## whirled.club client nest

```
HTML
  frame.nocache.js  → GWT frame module (cache.html permutation)
  swfobject.js      → embed world-client.swf
  world-client.swf
    └─ ActorSprite / MemberSprite
         └─ nested Loader (avatar media)
              MediaStub.swf fallback URL:
                http://media.whirled.club/media/MediaStub.swf
              default-avatar.swf when no media
              sharedEvents "controlConnect" ↔ AvatarBackend
```

Whirled2 loft mirrors the **nested Loader host** with a thin ORIGINAL companion SWF + JS EI (`hostWalk` / `hostSleep` / `hostSpoke` / `hostEmote` / `hostLoadBytes`).

---

## Top 5 gaps blocking club-like sync

1. **Sleeping / AFK** — `appearanceChanged_v2` sleeping bit must flip via loft idle → `hostSleep` (host stub ready; chrome wire pending).
2. **Walk duration / location lerp** — club keeps `isMoving` true for whole `WalkAnimation` and updates screen/`_loc`; we only edge-toggle moving + optional locX.
3. **Avatar-initiated `setLocation_v1`** — must become a real move (appearance moving=true → arrive → false), not just store coords.
4. **Speak path** — loft chat must call `hostSpoke` → `avatarSpoke_v1` for talk anims.
5. **Media fallbacks** — no MediaStub / default-avatar when loadBytes fails; config `datapack` always null.

---

## Whirled2 AvatarHost status

See `tools/avatar-host/AvatarHost.hx`, `FLASH-SYNC-RESEARCH.md`, `QA-FLASH.md`.  
Rebuild: `/tmp/haxe_…/haxe` + `tools/avatar-host/build.hxml` → `assets/avatar-host/avatar-host.swf`.  
**Do not push** from research passes unless asked.
