# RUFFLE-SOURCE-DEEP — How Ruffle actually implements Flash (for Whirled2 Classic avatars)

**Research date:** 2026-09-06 (America/New_York)  
**Ruffle tree studied:** `/tmp/ruffle-src` @ `185b599` (master sparse clone: `web/packages/core` + `core/src`)  
**Vendored Whirled2 build:** `assets/ruffle/` = `@ruffle-rs/ruffle` **0.6.0-nightly.2026.8.26**  
**Whirled2 tree:** `src/classic-avatar.js` (`?v=20260906cg`), `tools/avatar-host/AvatarHost.hx`, `GREY-HAVENS-PROTOCOL.md`, `RUFFLE-INTEGRATION.md`, `ROOT-CAUSE.md`  
**Rule:** protocol / architecture study only — **no AGPL Whirled / msoy / world-client code copied**.

## Implementation note (?v=20260906cg)

**Shipped:** SAFE companion upgrade **Option A** in `src/classic-avatar.js`.

- Wear remains **DIRECT-first** (`#avatar-ruffle-host` paints outer avatar SWF).
- `WEAR_SAFE_COMPANION_UPGRADE = true` mounts `avatar-host.swf` in sibling `#avatar-companion-layer` at opacity 0.
- `mountRuffle` clears its container — **must not** remount companion into the DIRECT host until bridge `"connected"` (that was the ce blank-loft bug).
- On `"connected"`: promote companion layer, remove DIRECT players only; `loftUsesCompanionHost = true`.
- On fail / ~4s watchdog / bridge error: tear companion layer, **keep DIRECT**.
- Nested `blob:`/`data:` rejected; prefer `hostLoadBytes` + outer `DataLoadOptions.data`.
- Dual outer players here are **temporary paint insurance**, not a sharedEvents bridge across players — walk still requires the **nested** Loader inside the companion host (unchanged architecture from §6).


**Primary docs:**
- https://ruffle.rs/
- https://github.com/ruffle-rs/ruffle/wiki/Using-Ruffle (edited Jun 1 2026)
- https://ruffle.rs/js-docs/master/ (TypeDoc — note `/js-docs/` without `master` 404s)

---

## Executive summary (read first)

| Question | Answer under Ruffle today |
|----------|---------------------------|
| Can JS drive stock Whirled Body walk via EI alone? | **No.** Walk = `userProps.appearanceChanged_v2` after `controlConnect` on **`loaderInfo.sharedEvents`**. |
| Does Ruffle implement `LoaderInfo.sharedEvents`? | **Yes** — real `EventDispatcher` on each `LoaderInfoObject` (`loaderinfo_object.rs:89–157`). |
| Do parent `contentLoaderInfo` and child `root.loaderInfo` share that dispatcher? | **Yes for nested `Loader.load` / `loadBytes`** — child clip gets the **same** `LoaderInfoObject` via `MovieClip::replace_with_movie(..., loader_info)` (`movie_clip.rs:375–399`, `loader.rs` movie_loader_data). That is Adobe’s “sharedEvents bridge”. |
| Is companion `avatar-host.swf` + `Loader.loadBytes` architecturally sound? | **Yes in principle** — matches how Ruffle wires nest + how Adobe / whirled.club work. |
| Why is Wear companion auto-upgrade OFF (`WEAR_AUTO_COMPANION_UPGRADE=false`)? | Ops reality: empty host / failed nest / wiped stand = **blank loft**. Source says nest *can* work; loft must prove `"connected"` before flipping chrome. |
| Outer player: `url` vs `data` vs `blob:`? | Prefer **`DataLoadOptions.data` (ArrayBuffer)** for IDB avatars; http(s) URL OK; outer `blob:` often OK but fragile. |
| Nested `Loader.load("blob:…")` / `data:`? | **Do not use** — use **`loadBytes(ByteArray)`** (AvatarHost already rejects blob/data schemes). |
| `allowCodeImport`? | AS field exists, **defaults `true`**; error #3226 string exists but **no Rust call site found** enforcing it yet. Still set `true` for FP 10.1+ parity. |
| Dual Ruffle players (host + avatar side-by-side)? | **Not needed / wrong model** for Body walk — walk needs **one** player with nested Loader. Dual players cannot share `sharedEvents`. |

**Top recommendation for Whirled Body walk:** keep **DIRECT-stable paint**; treat companion nest as the **only** path to in-SWF walk; re-enable auto-upgrade only behind bridge `"connected"` + watchdog remount DIRECT; keep PNG hybrid as Smooth default. Do **not** invent frame-script injection or dual-player hacks.

---

## 1. Exact JS load sequence Ruffle expects

### 1.1 Official order (wiki + TypeDoc)

```
1. window.RufflePlayer = window.RufflePlayer || {};
2. window.RufflePlayer.config = { ...existing, publicPath, polyfills, wmode, ... }
   // Set BEFORE injecting ruffle.js when possible (publicPath = directory ONLY).
3. <script src="…/assets/ruffle/ruffle.js">  // self-host same nightly as .wasm
4. const source = window.RufflePlayer.newest();
5. const player = source.createPlayer();      // → PlayerElement custom element
6. container.appendChild(player);             // size via CSS
7. const api = player.ruffle();               // PlayerV1 — preferred over legacy player.* 
8. await api.load({ url | data, …opts });     // Promise; merges global → instance → load
9. (optional) player.addEventListener("loadedmetadata", …)
10. api.callExternalInterface(name, …args)    // JS → SWF after addCallback registered
```

Sources: wiki *Using Ruffle* (JavaScript API), TypeDoc `Player.PlayerV1`, `Config.BaseLoadOptions` / `URLLoadOptions` / `DataLoadOptions`.

### 1.2 Config merge priority

1. `window.RufflePlayer.config` (global)  
2. `player.ruffle().config` (per-instance)  
3. Options passed to **this** `load()` call (highest for that movie)

**Critical:** `allowScriptAccess` for the **JS API defaults to `false`**. It must be set on **`load({ allowScriptAccess: true })`** for loft (wiki Discussion #9132: cannot rely on global config alone for all embed paths).

### 1.3 Whirled2 mapping (`classic-avatar.js`)

| Step | Helper |
|------|--------|
| publicPath + transparent defaults | `getRufflePublicPath()` / `applyOfficialRuffleConfig()` |
| script inject | `ensureRuffle()` → `loadRuffleScript(RUFFLE_SELF)` |
| create + append + load | `mountRuffle(container, url, opts)` → `player.ruffle().load(loadOpts)` |
| IDB bytes | `opts.swfData` → `DataLoadOptions.data` + `swfFileName` |
| loft host | `#avatar-ruffle-host` only — **never** `#stage-slot` |

### 1.4 Minimal loft `load` object

```js
player.ruffle().load({
  // Prefer one of:
  // url: "https://…/avatar.swf",
  // data: arrayBuffer, swfFileName: "avatar.swf",
  allowScriptAccess: true,   // loft only
  wmode: "transparent",
  backgroundColor: null,
  autoplay: "on",
  unmuteOverlay: "hidden",
  splashScreen: false,
  letterbox: "off",
  allowNetworking: "all",    // "internal"|"none" also block ExternalInterface.call
});
```

---

## 2. Nested `Loader` + `loadBytes`: Ruffle vs Adobe

### 2.1 What Adobe does (Whirled-relevant)

```
world-client / AvatarHost (outer SWF)
  └─ Loader
       contentLoaderInfo.sharedEvents  ←── listen "controlConnect" BEFORE load
       loadBytes(ba, LoaderContext)
         applicationDomain = new ApplicationDomain(current)
         allowCodeImport = true
         // Do NOT set SecurityDomain for loadBytes (always parent sandbox)
  └─ nested avatar root
       root.loaderInfo === contentLoaderInfo   (same object)
       AvatarControl → dispatch controlConnect on sharedEvents
```

### 2.2 What Ruffle implements (cited)

| Feature | Status | Source |
|---------|--------|--------|
| `Loader.load(URLRequest, context?)` | Implemented (async fetch → clip) | `core/src/avm2/globals/flash/display/loader.rs` `load` |
| `Loader.loadBytes(ByteArray, context?)` | Implemented; **immediate full preload** then complete at end of frame | `loader.rs` `load_bytes` (236–303); `core/src/loader.rs` `from_bytes` branch (~1824+) |
| `LoaderContext.applicationDomain` | Read from context slot; else child of caller domain | `loader.rs` movie_loader_data domain resolution (~1680–1710) |
| `LoaderContext.allowCodeImport` | AS field default `true`; alias `allowLoadBytesCodeExecution` | `LoaderContext.as:5–40` |
| Error #3226 if `allowCodeImport=false` | Message string only — **no Rust enforce call found** | `error_messages.rs:438` |
| `SecurityDomain` for loadBytes | Not required (Adobe); Ruffle does not need it for nest | Adobe docs + AvatarHost comments |
| Re-using Loader before `init` | Stub warning “reusing a Loader” | `loader.rs:254–262` |
| Multi-SWF `Loader.load` timing | Still fragile for some apps (`addChild at the correct time` stub) | Issue **#22710** (open) |
| Nested `ImportAssets` depth | Preload can terminate early | Issue **#22426** (open) |

### 2.3 What fails / what to avoid

| Pattern | Outer Ruffle player | Nested `Loader` inside SWF |
|---------|---------------------|----------------------------|
| `http(s):` URL | OK | OK (CORS / same-origin rules apply) |
| `DataLoadOptions.data` ArrayBuffer | **Preferred** for IDB | N/A (JS-only API) |
| `blob:` URL | Often OK | **Unreliable / reject** — AvatarHost already errors |
| `data:` URL | Avoid | **Reject** |
| `loadBytes` + child `ApplicationDomain` | N/A | **Preferred nest path** |
| `loadBytes` without code import | FP would paint-only / error | Set `allowCodeImport=true` anyway |

**Whirled2 AvatarHost already matches Ruffle reality** (`AvatarHost.hx` `loaderContext` + `decodeAndLoadBytes` + blob/data rejection).

### 2.4 Timing difference vs FP (operational)

Ruffle’s `loadBytes` **preloads the entire movie immediately** (`ExecutionLimit::none()`), then defers `movie_loader_complete` to a **post-frame callback**. FP also preloads loadBytes aggressively; Ruffle’s event ordering has historically fired `init`/`complete` too early (fixed in PRs #8740, #14073, #14671) — still listen for `controlConnect` **before** `loadBytes`, and do not assume JS `load()` resolve ≡ avatar connected.

---

## 3. `sharedEvents` across parent/child — works today?

### 3.1 Implementation

```89:157:core/src/avm2/object/loaderinfo_object.rs
/// The `EventDispatcher` used for `LoaderInfo.sharedEvents`.
// FIXME: If we ever implement sandboxing, then ensure that we allow
// events to be fired across security boundaries using this object.
shared_events: Object<'gc>,
…
shared_events: activation.context.avm2.classes().eventdispatcher.construct(…),
…
pub fn shared_events(self) -> Object<'gc> { self.0.shared_events }
```

Getter: `core/src/avm2/globals/flash/display/loader_info.rs` `get_shared_events` (~551–559).  
AS: `LoaderInfo.as` `native function get sharedEvents():EventDispatcher`.

### 3.2 Why parent ↔ child handshake can work

1. `Loader` allocator creates **one** `LoaderInfoObject` on `_contentLoaderInfo` (`loader.rs` `loader_allocator`).  
2. On successful load, `replace_with_movie(..., Some(loader_info))` attaches **that same** object to the nested root clip (`movie_clip.rs:375–399`).  
3. Therefore:
   - Host: `loader.contentLoaderInfo.sharedEvents`
   - Avatar: `disp.root.loaderInfo.sharedEvents`  
   → **same EventDispatcher instance** (Adobe semantics for same-sandbox nest).

4. Grey Havens `ConnectEvent` type `"controlConnect"` with `bubbles=true` is dispatched on that dispatcher. Host `addEventListener` hears it **without** display-list bubbling — sharedEvents is a free-standing `EventDispatcher`.

### 3.3 Caveats (honest)

| Caveat | Detail |
|--------|--------|
| FIXME sandboxing | Cross-**security-domain** sharedEvents not fully modeled; **same-player nest** (our companion case) is the intended happy path. |
| Listen before load | AvatarControl may fire connect during construction — host must register listener **before** `load`/`loadBytes` (AvatarHost does). |
| No open GitHub issue titled “sharedEvents broken” | Search returned no dedicated open “sharedEvents” bug; failures tend to be broader Loader/init timing (#22710, init/complete history). |
| JS cannot touch sharedEvents | Confirmed — only AS inside the same player. Companion SWF is mandatory for stock SDK avatars. |
| `LoaderInfo.dispatchEvent` throws | Native override throws #2118 — events go through **`sharedEvents`**, not LoaderInfo itself (`LoaderInfo.as:39–41`). |

### 3.4 Verdict for Whirled2

**Companion host is viable under Ruffle source reality.** Wear blanking was an **integration / empty-host / mount-order** problem, not “Ruffle lacks sharedEvents.” Gate on bridge `"connected"` remains correct ops policy.

---

## 4. JS ↔ SWF ExternalInterface

### 4.1 Enablement

| Setting | Effect |
|---------|--------|
| `allowScriptAccess: true` on `load` | Enables EI |
| `allowNetworking: "internal" \| "none"` | Also blocks `ExternalInterface.call` (wiki) |
| No provider / unavailable | AS throws #2067 (`make_error_2067`) |

### 4.2 Directions

| Direction | AS | JS |
|-----------|----|----|
| SWF → JS | `ExternalInterface.call("WhirledAvatarHostBridge", kind, payload)` | Global / eval’d name — Ruffle uses **indirect `Function`** (`ruffle-imports.ts:36–43`) |
| JS → SWF | `ExternalInterface.addCallback("hostWalk", fn)` | `player.ruffle().callExternalInterface("hostWalk", …args)` (`impl_v1.ts:104–106` → `inner.call_exposed_callback`) |

Silent miss: TypeDoc — if callback missing, `callExternalInterface` returns `undefined` (no throw).

### 4.3 Timing / readiness

| Signal | Meaning |
|--------|---------|
| `load()` Promise resolve | Movie load pipeline finished enough to play — **not** “all addCallbacks registered” for nested content |
| `loadedmetadata` / `readyState` | Metadata available; wiki: may fire before fully loaded (`inner.tsx` `setMetadata` currently sets `ReadyState.Loaded` and fires both `loadedmetadata` and `loadeddata`) |
| AvatarHost ctor | Registers callbacks + `bridge("ready")` on first frame of **host** SWF |
| Bridge `"connected"` | Nested avatar completed `controlConnect` — **only** then is walk EI meaningful |

**Rule:** attach JS bridge early; call `hostLoadBytes` after host `"ready"`; call `hostWalk` only after `"connected"` (or queue until then). Prefer `loadedmetadata` / bridge events over assuming `load().then` alone.

### 4.4 What EI does **not** replace

Stock Whirled Body / MovieClipBody walk is **not** an EI API. Chrome bob ≠ `state_*_walking`. That requires companion nest + `appearanceChanged_v2`.

---

## 5. Transparent stage / wmode / letterbox — “blank” lookalikes

### 5.1 WindowMode (TypeDoc)

| Value | Ruffle behavior |
|-------|-----------------|
| `"transparent"` | Stage color transparent; HTML under shows through |
| `"opaque"` | Opaque stage |
| `"window"` (default) | Treated like opaque |
| `"direct"` / `"gpu"` | No special effect → opaque |

### 5.2 Pitfalls that look like “blank” or “broken Flash”

1. Default `wmode: "window"` → black/opaque rectangle over loft.  
2. Forced `backgroundColor: "#000000"` / `"#FFFFFF"` with transparent intent.  
3. `splashScreen: true` then failed wasm → blue splash / empty area.  
4. `letterbox: "fullscreen"` (default) cropping/centering weirdly in billboard — loft uses `"off"`.  
5. Wiping stand thumb (`innerHTML=""`) before paint → tofu blank (ROOT-CAUSE / classic-avatar history).  
6. Companion-first empty `host.swf` + faded stand → transparent empty nest.  
7. `pointer-events: auto` on full-size player → PE eats floor clicks (“not wired”).  
8. Missing / mismatched `.wasm` or wrong `publicPath` → CompileError / silent fail after script “loads”.  
9. Wrong MIME for `.wasm` on local servers.  
10. CSS opacity 0 on PNG under SWF before SWF paints (`classic-png-under-swf` without connected nest).

### 5.3 Whirled2 correct transparent recipe

- Global + per-load: `wmode: "transparent"`, `backgroundColor: null`  
- CSS: player + canvas `background: transparent`  
- Loft: `pointer-events: none` on player, canvas, host  
- Keep stand thumb under player until paint / connected  
- `splashScreen: false`, `unmuteOverlay: "hidden"`, `letterbox: "off"`

---

## 6. Concrete architecture recommendation — Whirled Body walk

### 6.1 Reality stack

```
[HTML loft chrome]  click-to-walk bob / face flip / bubbles  (always)
        │
        ▼
[Ruffle player]  #avatar-ruffle-host
   ├─ MODE DIRECT (default Wear today)
   │    outer = avatar.swf (DataLoadOptions or URL)
   │    paint OK; Body idle; walk frames NOT driven
   │
   └─ MODE COMPANION (optional upgrade)
        outer = avatar-host.swf (http, same origin)
           └─ Loader.loadBytes(avatar) + sharedEvents controlConnect
                └─ appearanceChanged_v2 ← hostWalk EI ← chromeWalkTo
```

### 6.2 Options evaluated

| Option | Verdict |
|--------|---------|
| **Companion host nest** | **Correct architecture** for stock SDK avatars. Source supports sharedEvents + loadBytes. Keep DIRECT-first; upgrade only on `"connected"`. |
| **Dual Ruffle players** | **Reject** — cannot bridge sharedEvents across players; doubles wasm cost; EI-only still won’t walk Body. |
| **PNG hybrid until nest proven** | **Keep as Smooth default / fallback** — best UX when walk PNGs exist; not a substitute for Classic Flash fidelity. |
| **Frame-script injection / SWF rewrite** | **Reject** for product path — brittle, legal/ethics minefield on user SWFs, harder than companion. |
| **Patch every avatar with EI** | Only for community/hand-rolled SWFs; not stock Grey Havens SDK. |
| **Wait for “Ruffle sharedEvents fix”** | Misdiagnosed — feature exists; fix loft mount discipline + prove connect in QA. |

### 6.3 Recommended Wear policy (actionable)

1. **DIRECT-stable primary** — always paint avatar bytes/URL first; never blank loft.  
2. **`WEAR_AUTO_COMPANION_UPGRADE`** — re-enable only after QA matrix shows bridge `"connected"` ≥ X% on sample SDK avatars **without** wiping paint (companion-pending CSS: stand on TOP until connected).  
3. Watchdog ~3.5s / bridge `"error"` → `remountDirectAvatarImmediate`.  
4. Chrome continues bob/flip regardless — users always see locomotion chrome.  
5. In-SWF walk is a **progressive enhancement** signaled by badge / `getLoftHostDebug().connected`.  
6. Stuff preview: `allowScriptAccess: false`.  
7. No AGPL client code — keep ORIGINAL Haxe AvatarHost + protocol docs.

### 6.4 QA probes before flipping companion ON

- Demo/host SWF alone → bridge `"ready"`.  
- `hostLoadBytes` of known SDK avatar → `"loading"` → `"loaded"` → `"connected"` → `"gotControl"`.  
- `hostWalk(true, orient)` → timeline enters `state_*_walking` (visual).  
- Fail blob URL into `hostLoadUrl` → explicit error (already).  
- Transparent: no black box; stand never wiped.  
- Ruffle console: no panic; note any `avm2_stub` for Loader.

---

## 7. Top 10 actionable rules for `classic-avatar.js`

1. **Config before script:** `applyOfficialRuffleConfig()` (explicit `publicPath` directory, `polyfills:false`, transparent defaults) before/with `ruffle.js` inject — already in `ensureRuffle`; keep it.  
2. **Prefer `player.ruffle().load` + `callExternalInterface`** — legacy `player.load` / `player[name]` only as fallback.  
3. **Loft `allowScriptAccess: true` only; Stuff preview false** — never leave loft EI off if companion expected.  
4. **Outer avatar bytes via `DataLoadOptions.data`** when IDB/blob available — don’t rely on nested or outer blob fragility.  
5. **Never feed nested Loader `blob:` / `data:`** — only `hostLoadBytes` / http(s) `hostLoadUrl`.  
6. **Companion: listen sharedEvents before loadBytes** (host SWF responsibility) — JS must not race `hostLoad*` before bridge `"ready"`.  
7. **Flip `loftUsesCompanionHost` only on bridge `"connected"`** — pending mode keeps stand visible; watchdog remounts DIRECT.  
8. **Transparent triad:** `wmode:"transparent"` + `backgroundColor:null` + CSS transparent; PE-none on loft player/canvas.  
9. **Never wipe stand thumb** for empty loft; never mount Ruffle in `#stage-slot`.  
10. **Honest UX:** chrome bob ≠ Body walk; document companion/PNG paths; no AGPL copies — protocol reimplementation only.

---

## 8. Known limitations / open issues (nested SWF + EI)

| ID | Topic | Relevance |
|----|-------|-----------|
| **#22710** | Multi-SWF stuck; `Loader.load` “addChild at the correct time” stub | Complex nests; our single avatar-in-host is simpler but watch stubs |
| **#22426** | Nested ImportAssets preload terminates early | Exotic avatar packaging |
| **#14671** / **#14789** | loadBytes immediate preload / regressions | Timing sensitivity |
| **#8740** / **#14073** | init/complete too early | Why listen before load; don’t trust early COMPLETE alone |
| **#8006** / **#8910** | applicationDomain / Flex SWZ | Domain wiring improved; still edge cases |
| Discussion **#9132** | allowScriptAccess not via global alone | Per-load EI flag |
| Wiki `allowNetworking` | internal/none blocks `ExternalInterface.call` | Keep `"all"` for loft |

No dedicated open “sharedEvents missing” issue found at research time — treat nest failures as **timing / stub / mount** until proven otherwise.

---

## 9. Source file map (quick cite index)

| Area | Path |
|------|------|
| JS PlayerV1 | `web/packages/core/src/public/player/v1.ts`, `internal/player/impl_v1.ts` |
| EI JS→page | `web/packages/core/src/ruffle-imports.ts` |
| EI callExposed | `web/packages/core/src/internal/player/inner.tsx` `callExternalInterface` |
| Load options | `web/packages/core/src/public/config/load-options.ts` |
| AVM2 Loader | `core/src/avm2/globals/flash/display/loader.rs` |
| LoaderInfo / sharedEvents | `core/src/avm2/object/loaderinfo_object.rs`, `loader_info.rs`, `LoaderInfo.as` |
| LoaderContext | `core/src/avm2/globals/flash/system/LoaderContext.as` |
| Movie load / loadBytes preload | `core/src/loader.rs` |
| Clip ↔ LoaderInfo bind | `core/src/display_object/movie_clip.rs` `replace_with_movie` |
| AVM2 ExternalInterface | `core/src/avm2/globals/flash/external/external_interface.rs` |
| Core EI bus | `core/src/external.rs` |

---

## 10. Whirled2 doc cross-links

- Protocol: `GREY-HAVENS-PROTOCOL.md`  
- Integration audit: `RUFFLE-INTEGRATION.md`  
- Wear blank root cause: `ROOT-CAUSE.md`  
- Beginner dual-mode: `HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md`  
- Host implementation: `tools/avatar-host/AvatarHost.hx`  
- Runtime: `src/classic-avatar.js` (`WEAR_AUTO_COMPANION_UPGRADE`, `mountWearIfNeeded`, `prepareCompanionPayload`)

---

## Bottom line for parent agent

**Path written:** `/workspace/whirled2-web-mock/RUFFLE-SOURCE-DEEP.md`

**Top recommendations:**
1. Companion nest is **source-correct** (sharedEvents + loadBytes + child ApplicationDomain).  
2. Keep **DIRECT-first**; do not ship a half-baked Wear companion flip.  
3. Re-enable companion upgrade only after bridge `"connected"` QA — not because “Ruffle lacks sharedEvents.”  
4. Prefer `DataLoadOptions` + `hostLoadBytes`; never nested blob URLs.  
5. PNG hybrid remains the Smooth path; dual players / frame-script injection are dead ends.
