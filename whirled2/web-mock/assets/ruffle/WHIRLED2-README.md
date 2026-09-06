# Vendored Ruffle (self-hosted)

**Why:** GitHub Pages + flaky CDN (unpkg) made Classic Flash look “not integrated.”
We ship the official **web-selfhosted** nightly here so `ruffle.js` + `.wasm` load from the same origin.

- Source: https://github.com/ruffle-rs/ruffle/releases (nightly-2026-08-26 web-selfhosted)
- License: MIT OR Apache-2.0 (see LICENSE_*)
- Entry: `./assets/ruffle/ruffle.js` (loads sibling `.wasm` + `core.ruffle.*.js`)
- Demo QA SWF: `demo-qa.swf` (tiny Flash file for `?flashQa=1` guest loft)

**MIME:** GitHub Pages serves `.wasm` as `application/wasm`. Local static servers must too.

Do **not** commit `*.map` source maps (large, unused at runtime).
