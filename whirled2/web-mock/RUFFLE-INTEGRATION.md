# RUFFLE-INTEGRATION — Whirled2 Classic Flash (opt-in)

Research basis: [Using Ruffle wiki](https://github.com/ruffle-rs/ruffle/wiki/Using-Ruffle) (edited 2026-06-01), [BaseLoadOptions](https://ruffle.rs/js-docs/master/interfaces/Config.BaseLoadOptions.html), [DataLoadOptions](https://ruffle.rs/js-docs/master/interfaces/Config.DataLoadOptions.html), [PlayerV1.callExternalInterface](https://ruffle.rs/js-docs/master/interfaces/Player.PlayerV1.html). Grey Havens / whirled.club protocol: see `GREY-HAVENS-PROTOCOL.md` / `FLASH-SYNC-RESEARCH.md` (study only — no AGPL copy).

## Correct JS API (self-host)

1. Host `assets/ruffle/` (ruffle.js + sibling `.wasm` + core*.js) on same origin.
2. Set `window.RufflePlayer.config.publicPath` to the **directory** URL of those files (required when wasm resolve fails).
3. `polyfills: false` when using the JS API only (we create players ourselves).
4. `const player = RufflePlayer.newest().createPlayer(); container.appendChild(player);`
5. Load with **`player.ruffle().load({ ... })`** (preferred). Legacy `player.load` is fallback only.
6. Options we use for loft Wear: `wmode: "transparent"`, `backgroundColor: null`, `autoplay: "on"`, `splashScreen: false`, `letterbox: "off"`, `allowScriptAccess: true` (trusted user SWFs only).
7. For IndexedDB avatars: prefer `{ data: ArrayBuffer, swfFileName: "avatar.swf" }` over `blob:` URLs ([#19176](https://github.com/ruffle-rs/ruffle/issues/19176)).
8. JS→SWF EI: `player.ruffle().callExternalInterface(name, ...args)`.
9. Wasm MIME must be `application/wasm` (GitHub Pages OK).

## What was wrong in Whirled2

| Issue | Why it felt "not integrated" |
| --- | --- |
| Companion-first nest | Empty transparent `host.swf` painted "playing" → blank loft |
| Optional companion remount | Wiped a working DIRECT paint |
| `player.load` only | Docs prefer `player.ruffle().load` |
| Missing/weak `publicPath` | Wasm can fail silently relative to page URL |
| `blob:` for IDB | Works sometimes; `data` ArrayBuffer is the supported in-memory path |
| EI via ad-hoc `player[name]` / `.call` | Prefer `callExternalInterface` |

## Opt-in product path

1. Stuff: Classic Flash (`playbackMode: "ruffle"`) + classic opt-in.
2. Loft: `#avatar-ruffle-host` (chrome) — **never** `#stage-slot` (Pixi).
3. Mount: DIRECT-stable `ruffle().load` of avatar bytes/URL; stand thumb until paint.
4. Phase-2 (optional): companion `avatar-host.swf` + `hostLoadBytes` for Grey Havens `controlConnect` / `appearanceChanged_v2` walk scenes — only after DIRECT paint is solid.

## Grey Havens / whirled.club (why club walk ≠ JS EI)

Stock Whirled avatars handshake on Flash `loaderInfo.sharedEvents` event `controlConnect`, then the **Flash host** drives `appearanceChanged_v2`. JS ExternalInterface alone cannot inject that. Club nests avatar SWFs inside `world-client.swf`. Our companion host reimplements that protocol thinly (ORIGINAL Haxe — not AGPL copy). Ruffle can run the host + `loadBytes`, but nested blob/data URL loads are unreliable — hence DIRECT-first for opt-in playability.
