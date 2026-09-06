# Ruffle JS Integration — Official Docs Synthesis + Whirled2 Audit

**Sources (fetched 2026-09-06):**
- https://ruffle.rs/
- https://github.com/ruffle-rs/ruffle/wiki/Using-Ruffle (wiki, edited Jun 1 2026)
- https://ruffle.rs/js-docs/ → **404**; real TypeDoc is **https://ruffle.rs/js-docs/master/**
- https://ruffle.rs/js-docs/master/interfaces/Player.PlayerV1.html
- https://ruffle.rs/js-docs/master/interfaces/Config.BaseLoadOptions.html
- https://ruffle.rs/js-docs/master/interfaces/Config.URLLoadOptions.html
- https://ruffle.rs/js-docs/master/interfaces/Config.DataLoadOptions.html
- https://ruffle.rs/js-docs/master/enums/Config.WindowMode.html
- Vendored build: `assets/ruffle/` = `@ruffle-rs/ruffle` **0.6.0-nightly.2026.8.26** (web-selfhosted)
- Compared to: `src/classic-avatar.js` (`ensureRuffle` / `mountRuffle`, `?v=20260906cd`)

---

## 1. Official integration models

### Polyfill (legacy embeds)
Include `ruffle.js` once; it replaces `<object>` / `<embed>` Flash tags.

```html
<script src="path/to/ruffle/ruffle.js"></script>
```

CDN (auto-updating unpkg):

```html
<script src="https://unpkg.com/@ruffle-rs/ruffle"></script>
```

For SWFObject-style early embeds, put Ruffle as the **first** script in `<head>` so the plugin spoof installs in time. Otherwise before `</body>` is fine.

**Whirled2 choice:** JS API only — **do not rely on polyfill**. Set `polyfills: false` (we already do in `applyOfficialRuffleConfig`).

### JavaScript API (correct for Whirled2)

Official wiki + TypeDoc recipe:

```html
<script>
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = {
    ...window.RufflePlayer.config,
    publicPath: "/path/to/ruffle/",   // directory ONLY — no filename
    polyfills: false,
    wmode: "transparent",
    backgroundColor: null,
    // allowScriptAccess is per-load for JS API (default false)
  };
  window.addEventListener("DOMContentLoaded", () => {
    const ruffle = window.RufflePlayer.newest();
    const player = ruffle.createPlayer();
    document.getElementById("container").appendChild(player);
    player.style.width = "220px";
    player.style.height = "280px";
    player.ruffle().load({
      url: "movie.swf",
      allowScriptAccess: true,   // only for trusted SWFs
      wmode: "transparent",
      backgroundColor: null,
      autoplay: "on",
      splashScreen: false,
      unmuteOverlay: "hidden",
      letterbox: "off",
    }).then(() => console.info("loaded"))
      .catch((e) => console.error(e));
  });
</script>
<script src="path/to/ruffle/ruffle.js"></script>
```

**Critical API facts:**
| Call | Role |
|------|------|
| `window.RufflePlayer.newest()` | Pick newest installed SourceAPI (extension may also install) |
| `ruffle.createPlayer()` | Returns a `PlayerElement` (custom element) |
| `player.ruffle()` / `player.ruffle(1)` | **Preferred** versioned API (`PlayerV1`) |
| `player.ruffle().load(opts)` | Load SWF; returns `Promise` |
| `player.load(opts)` | **Legacy** — works but TypeDoc discourages; may collide with Flash JS API |

`load` accepts:
- **string** URL
- **`URLLoadOptions`**: `{ url, ...config }`
- **`DataLoadOptions`**: `{ data: ArrayBuffer|ArrayLike, swfFileName?, ...config }`

---

## 2. Config that matters for Classic Flash Wear

### Global (`window.RufflePlayer.config`) — set **before** `ruffle.js` loads when possible

Wiki default dump (relevant keys):

| Option | Default | Wear loft recommendation |
|--------|---------|--------------------------|
| `publicPath` | auto from `ruffle.js` URL | **Explicit directory** of self-host (`…/assets/ruffle/`) |
| `polyfills` | `true` | **`false`** (API-only page) |
| `allowScriptAccess` | `false` (JS API) | Per-`load` only; loft `true`, Stuff preview `false` |
| `wmode` | `"window"` (= opaque in Ruffle) | **`"transparent"`** |
| `backgroundColor` | `null` (use SWF bg) | **`null`** + CSS transparent; never force `#000` |
| `autoplay` | `"auto"` | `"on"` for wear (chrome drives UX) |
| `unmuteOverlay` | `"visible"` | `"hidden"` (avoid click-to-unmute overlay over loft) |
| `splashScreen` | `true` | `false` (Ruffle splash ≠ avatar) |
| `letterbox` | `"fullscreen"` | `"off"` for billboard crop |
| `base` | `null` | Set if SWF resolves relative assets wrong |
| `allowNetworking` | `"all"` | Leave `"all"` for companion nest; `"internal"` blocks `ExternalInterface.call` |

### `wmode` / WindowMode (TypeDoc)

- `"transparent"` — stage color transparent; HTML under Ruffle shows through.
- `"opaque"` / `"window"` / `"direct"` / `"gpu"` — **opaque stage** in Ruffle (black/filled box).
- Opaque + missing CSS = classic “black rectangle, looks broken” symptom.

### Transparent stage best practices

1. `wmode: "transparent"` on global **and** per-`load`.
2. `backgroundColor: null` (or omit) — do **not** set `"#FFFFFF"` / `"#000000"` unless intentional.
3. CSS: `ruffle-player, canvas { background: transparent; }`.
4. Keep stand thumb **under** the player until paint (Whirled2 already does this).
5. Loft: `pointer-events: none` on player **and** canvas so floor clicks / nameplate work (PE eating clicks is a top “not integrated” false-negative).

---

## 3. Self-hosting vs CDN + wasm paths

| Approach | Pros | Cons |
|----------|------|------|
| **Self-host** `assets/ruffle/` (Whirled2) | Same-origin; no CDN flake; Pages MIME OK | Must ship **both** `.wasm` + matching `core.ruffle.*.js` from **same nightly** |
| **CDN** unpkg / jsDelivr | Easy updates | CORS / cache / offline / “wasm 404” feels like “Ruffle dead” |

**Wasm rules (wiki + issues):**
1. Serve `.wasm` as `application/wasm` (Pages does; local static servers often don’t).
2. Keep **all** files from one release zip; mismatched `ruffle.js` ↔ hashed wasm → CompileError / ChunkLoadError.
3. `publicPath` = directory containing those files — **no filename**.
4. Cache-bust `ruffle.js?v=…` is OK if `publicPath` is set to the clean directory (Whirled2 `getRufflePublicPath()` does this).
5. CSP needs `script-src 'wasm-unsafe-eval'` (and often `style-src 'unsafe-inline'`).

**Polyfill vs API:** Polyfill auto-replaces embeds. API creates players manually. Mixing with `polyfills: true` on a SPA can surprise-replace unrelated tags — disable for Whirled2.

---

## 4. ExternalInterface in Ruffle

### Enable
JS API default is **`allowScriptAccess: false`**. Must pass `allowScriptAccess: true` in **`player.ruffle().load({…})`** for trusted loft SWFs. (Polyfill defaults closer to Flash `sameDomain`.)

### Directions
| Direction | Mechanism |
|-----------|-----------|
| **SWF → JS** | AS `ExternalInterface.call("fn", …)` → page global / exposed function |
| **JS → SWF** | AS `ExternalInterface.addCallback("name", fn)` then JS: **`player.ruffle().callExternalInterface("name", …args)`** (PlayerV1) or legacy `player.name(…)` |

### Honest Whirled limits
- Stock Grey Havens / whirled-sdk avatars use **`loaderInfo.sharedEvents`** (`controlConnect`), **not** EI.
- Ruffle EI shim helps **hand-patched / community EI** avatars and companion `host.swf` bridges.
- Full AvatarControl = Phase 2 (host SWF nest), not “EI alone”.

`allowNetworking: "internal"|"none"` currently also blocks `ExternalInterface.call()` — do not clamp networking if EI is required.

---

## 5. Nested `Loader` / `loadBytes` known limits

From Ruffle issues/PRs (2024–2026) + Whirled2 ENGINE DEV notes:

| Pattern | Status under Ruffle |
|---------|---------------------|
| Outer `player.load({ url })` http(s) | OK |
| Outer `player.load({ data: ArrayBuffer })` | OK (documented `DataLoadOptions`) |
| Outer `player.load({ url: "blob:…" })` | Often OK for **outer** player; fragile as nested URL |
| Nested `Loader.load(blob:)` / `data:` | **Fails / unreliable** — do not use |
| Nested `Loader.loadBytes(ByteArray)` | Preferred nest path (Ruffle improved immediate preload) |
| Multi-SWF `Loader.load()` chains | Still hit stubs / timing issues (`addChild at the correct time`, nested ImportAssets) |
| Nested ImportAssets depth | Known early-preload terminate bugs on some builds |

**Whirled2 recipe:** companion host = outer http `avatar-host.swf`; push avatar bytes via EI base64 → AS `Loader.loadBytes`. Prefer **direct** outer avatar SWF for Wear reliability; companion is optional nest, not the default blank-risk path.

---

## 6. Common mistakes that make Ruffle “seem not integrated”

1. **Wrong wasm path / missing `publicPath`** → script “loads”, player mounts, then CompileError / silent blank.
2. **Incomplete self-host** (only one of two `.wasm` files) → works on Chrome, dies on older Safari.
3. **`ruffle.js` / wasm version mismatch** after partial update.
4. **Load before DOM / missing container** → `getElementById` null, never `appendChild`.
5. **Config after first wasm fetch** with wrong relative base → first paint fails.
6. **Default `wmode: "window"`** → opaque black stage over loft.
7. **Forced `backgroundColor: "#000000"`** → same symptom.
8. **Missing `allowScriptAccess: true`** when expecting EI → “host dead”.
9. **Using polyfill expectations on an API page** (or leaving `polyfills: true`).
10. **`player.load` only**, ignoring `player.ruffle().load` / `callExternalInterface`.
11. **Pointer-events: auto on full-size loft player** → PE eats floor clicks; looks like room is broken / “Flash not wired”.
12. **Mounting inside `#stage-slot`** → fights Pixi; wrong ownership.
13. **Wiping stand thumb (`innerHTML = ""`)** before paint → tofu blank loft.
14. **Wrong MIME** for `.wasm` on local/dev servers.
15. **Nested `Loader.load(blob:)`** for avatar-in-host → empty nest; blame “Ruffle broken”.

---

## 7. Audit vs current Whirled2 (`classic-avatar.js`)

### What already matches official docs (good)

| Item | Code |
|------|------|
| Self-host same-origin | `RUFFLE_SELF = ./assets/ruffle/ruffle.js?v=…` |
| Explicit `publicPath` directory | `getRufflePublicPath()` → origin + `/…/assets/ruffle/` |
| `polyfills: false` | `applyOfficialRuffleConfig` |
| Transparent stage | `wmode: "transparent"`, `backgroundColor: null` |
| Prefer `player.ruffle().load` | `doLoad()` with legacy fallback |
| `DataLoadOptions` support | `opts.swfData` → `loadOpts.data` |
| Loft EI gate | `allowScriptAccess: true` only when `loftMount` |
| `callExternalInterface` | `tryCallIntoSwf` prefers PlayerV1 API |
| Host `#avatar-ruffle-host` not `#stage-slot` | loftMount / HTML builder |
| PE none on loft | player + canvas `pointer-events: none` |
| Preserve stand thumb | save/restore before remount |
| Nested loadBytes awareness | companion host comments + `hostLoadBytes` |

### Concrete mismatches / residual risks

| # | Mismatch | Impact | Fix |
|---|----------|--------|-----|
| 1 | **`applyOfficialRuffleConfig()` runs inside `mountRuffle` after `ensureRuffle`**, not before first `ruffle.js` insert | First wasm resolve may use auto `publicPath` only; race if script URL quirks | Call `applyOfficialRuffleConfig()` at start of `ensureRuffle` / `loadRuffleScript` **before** appending `<script>` |
| 2 | Config not applied when API already “cached” from extension / prior load | Extension config may win until mount | Always merge config in `ensureRuffle` when resolving `newest()` |
| 3 | Cache-bust query on script src (`?v=VERSION`) while publicPath is separate | Usually OK with explicit publicPath; confusing if publicPath omitted | Keep explicit publicPath (already); optional: load script without query, cache-bust via filename or headers |
| 4 | Stuff preview can still inherit global transparent/autoplay from loft config | Mild; preview OK | Per-instance `player.ruffle().config` or load opts only (avoid leaking loft `allowScriptAccess`) |
| 5 | Stock SDK avatars still need sharedEvents host | EI “works” but avatar idle/walk states don’t | Document as expected; companion host / Phase 2 — not a Ruffle mis-wire |
| 6 | Companion-first blank loft history | Looked like Ruffle failure | Wear = **direct** outer SWF; companion only after connected (current `?v=20260906cd` intent) |
| 7 | Local/dev servers may not set wasm MIME | “Works on Pages, broken locally” | Document MIME; configure static server |
| 8 | No wait on `loadedmetadata` / `readyState` before EI attach | Race: attachLoftAvatarHost immediately after `load()` resolve | Optionally listen `loadedmetadata` / poll `readyState >= 1` before first EI |
| 9 | `player[name](…)` tried before `callExternalInterface` | Fine as fallback; Flash name collisions rare | Prefer `callExternalInterface` first (comment already says prefer EI) |

---

## 8. CORRECT opt-in Classic Flash Wear recipe

**Host only:** `#avatar-ruffle-host` (class `classic-wear-swf-slot is-loft`).  
**Never:** `#stage-slot` (Pixi owns the room).

### Exact recommended load sequence

```
1. User opts in Classic Flash Wear (OPT_IN / FORCE_RUFFLE / playbackMode=ruffle).
2. Ensure DOM: #avatar-ruffle-host exists under Wear billboard chrome (not stage-slot).
3. applyOfficialRuffleConfig({ publicPath, polyfills:false, wmode:transparent, … })
4. ensureRuffle():
     - if !RufflePlayer.newest → inject <script src="./assets/ruffle/ruffle.js">
     - await onload → SourceAPI = RufflePlayer.newest()
5. destroyPlayersIn(host); keep stand thumb/glyph under player.
6. player = SourceAPI.createPlayer()
7. style player (size, transparent bg); loft → pointer-events:none on player+host
8. host.appendChild(player)
9. api = player.ruffle()   // PlayerV1
10. await api.load({
      url: absoluteOrBlobAvatarUrl,   // OR data: ArrayBuffer from IDB
      allowScriptAccess: true,        // loft only
      wmode: "transparent",
      backgroundColor: null,
      autoplay: "on",
      unmuteOverlay: "hidden",
      splashScreen: false,
      letterbox: "off",
      publicPath: <same directory>,   // optional reinforce
    })
11. canvas.style.background = transparent; canvas.style.pointerEvents = "none"
12. attachLoftAvatarHost(player)  // EI stubs; prefer after loadedmetadata
13. Chrome owns floor clicks / bob / bubbles; SWF paints on top of stand thumb
```

### Minimal correct `load` object (loft)

```js
player.ruffle().load({
  url: swfUrl,                 // or data: arrayBuffer, swfFileName: "avatar.swf"
  allowScriptAccess: true,
  wmode: "transparent",
  backgroundColor: null,
  autoplay: "on",
  unmuteOverlay: "hidden",
  splashScreen: false,
  letterbox: "off",
});
```

### Stuff preview (locked down)

Same sequence but `allowScriptAccess: false` (or omit), smaller max size, no loft PE rules required.

---

## 9. Top integration mistakes **in our code** (priority)

1. **Late global config** — apply `publicPath` / `polyfills:false` / transparent defaults **before** injecting `ruffle.js`, not only at mount time.
2. **Historical companion-first empty host** — empty transparent nest + faded stand = “Ruffle not integrated”; Wear must stay **direct SWF** until bridge proves connected.
3. **Expecting stock AvatarControl via EI alone** — official Ruffle EI is fine; Whirled protocol is sharedEvents — don’t treat missing walk as wasm failure.
4. **Legacy `player.load` path still present** — OK fallback; always prefer `player.ruffle().load` + `callExternalInterface`.
5. **PE / opaque / wiped thumb** — already mitigated; regressions here instantly look like “Flash dead”.

---

## 10. Exact recommended load sequence (one-liner)

> **Config → inject self-host `ruffle.js` → `newest()` → `createPlayer()` → append to `#avatar-ruffle-host` → `player.ruffle().load({url|data, wmode:"transparent", backgroundColor:null, allowScriptAccess:true})` → PE-none canvas → EI attach — never `#stage-slot`.**

---

## Quick reference links

- Product: https://ruffle.rs/
- Wiki Using Ruffle: https://github.com/ruffle-rs/ruffle/wiki/Using-Ruffle
- TypeDoc (not `/js-docs/`): https://ruffle.rs/js-docs/master/
- PlayerV1: https://ruffle.rs/js-docs/master/interfaces/Player.PlayerV1.html
- BaseLoadOptions: https://ruffle.rs/js-docs/master/interfaces/Config.BaseLoadOptions.html
- WindowMode: https://ruffle.rs/js-docs/master/enums/Config.WindowMode.html
- Selfhosted README: https://github.com/ruffle-rs/ruffle/blob/master/web/packages/selfhosted/README.md

## Whirled2 implementation map (`src/classic-avatar.js`)

| Helper | Role |
| --- | --- |
| `getRufflePublicPath()` | Absolute URL of `assets/ruffle/` from `location` |
| `applyOfficialRuffleConfig()` | Sets `window.RufflePlayer.config` (wiki merge pattern) |
| `ensureRuffle()` | Loads self-host `ruffle.js`; applies config first |
| `mountRuffle(container, url, opts)` | createPlayer → `ruffle().load({url\|data,...})`; `opts.swfData` = ArrayBuffer |
| `resolveSwfBytes(item)` | IDB / data URL / fetch → `{ buffer }` for DataLoadOptions |
| `tryCallIntoSwf(names, args)` | `callExternalInterface` → `.call` → `player[name]` |
| Loft Wear | DIRECT-stable + `playbackMode: ruffle` + `classicFlashOptIn` |

Cache bump: `?v=20260906cd`. Push script: `/tmp/push-cc.js` (dry-run default — do not push from executor).
