/*
 * classic-avatar.js — Classic Whirled / Flash (.swf) avatar support for Whirled2 chrome.
 *
 * Beginner overview:
 * 1) You upload YOUR OWN .swf (and optional thumb / PNG idle+walk) in Stuff.
 * 2) We analyze what we can in the browser (size, Flash magic header, companion thumb).
 *    We cannot fully parse AvatarControl states inside a SWF in plain JS — we say so honestly.
 * 3) Dual Wear modes (playbackMode on Stuff item):
 *    (A) Classic Flash (Ruffle) — real .swf via Ruffle in loft (transparent, PE none).
 *    (B) Whirled2 Smooth (png-hybrid) — PNG idle/walk chrome walk like Whirl (no Ruffle).
 *    Default: hybrid if PNGs, else ruffle if SWF. One Stuff item may hold swfUrl + PNG states.
 * 4) ENGINE DEV: Ruffle lives in chrome overlay (#classic-swf-slot / billboard), NOT inside
 *    #stage-slot. Pixi still owns the room. Study community Ruffle+host-shim architecture —
 *    do NOT copy AGPL code. Full AvatarControl handshake = later Phase 2.
 *
 * Loaded BEFORE app.js from index.html. Exposes window.WhirledClassicAvatar.
 * Cache: ?v=20260906ch
 */
(function (global) {
  "use strict";

  var VERSION = "20260906ch";
  var MEDIA_IDB_NAME = "whirled2-media";
  var MEDIA_IDB_STORE = "blobs";
  var SWF_MAX_BYTES = 10 * 1024 * 1024; // classic msoy medium upload ~10MB
  var FLA_MAX_BYTES = 20 * 1024 * 1024;
  var THUMB_MAX_BYTES = 1 * 1024 * 1024;
  var RUFFLE_CDN = "./assets/ruffle/ruffle.js?v=" + VERSION;
  var RUFFLE_SELF = RUFFLE_CDN;

  /**
   * Official Ruffle self-host: publicPath must be the DIRECTORY containing ruffle.js + .wasm
   * (Using-Ruffle wiki). Without it, wasm can 404 relative to the page and Ruffle "doesn't work".
   * Beginner: this is why CDN-only felt broken on Pages — wasm must load next to ruffle.js.
   */
  function getRufflePublicPath() {
    try {
      var scriptSrc = "./assets/ruffle/ruffle.js";
      var u = new URL(scriptSrc, global.location.href);
      var path = u.pathname || "";
      var dir = path.replace(/[^\/]+$/, "");
      return u.origin + dir;
    } catch (e) {
      try { return new URL("./assets/ruffle/", global.location.href).href; } catch (e2) {
        return "./assets/ruffle/";
      }
    }
  }
  function applyOfficialRuffleConfig(extra) {
    global.RufflePlayer = global.RufflePlayer || {};
    var base = {
      publicPath: getRufflePublicPath(),
      polyfills: false,
      wmode: "transparent",
      backgroundColor: null,
      autoplay: "on",
      splashScreen: false,
      unmuteOverlay: "hidden",
      letterbox: "off",
      warnOnUnsupportedContent: false
    };
    global.RufflePlayer.config = Object.assign({}, global.RufflePlayer.config || {}, base, extra || {});
    return global.RufflePlayer.config;
  }

  // demo-qa.swf = Ruffle paint smoke ONLY (no AvatarControl). Walk QA uses BODY_DEMO below.
  var RUFFLE_DEMO_SWF = "./assets/ruffle/demo-qa.swf";
  var BODY_DEMO_SWF = "./assets/avatars/flash-qa/demo-avatar.swf"; // controlConnect + appearanceChanged_v2
  var OPT_IN_KEY = "whirled2.classicFlashOptIn"; // global preference (optional)
  // How this works (?v=20260906ch): COMPANION-ONLY nest for Classic Flash walk.
  // Beginner: we load OUR tiny host.swf first; your avatar is rebuilt inside it from bytes.
  // Stand thumb covers the host (opacity 1) until bridge "connected" — never a blank loft.
  // ENGINE DEV: cg dual-layer raced loftActivePlayer + EI silent-miss → never connected.
  // Single Ruffle = host nest + sharedEvents; fail/watchdog → remount DIRECT (chrome bob).
  // loftUsesCompanionHost ONLY on bridge "connected". Reject nested blob:/data: — hostLoadBytes only.
  // Gate hostLoadBytes on bridge "ready" (addCallback race). LIVE club: appearanceChanged_v2 walk.
  // Force Ruffle only when user opts in — stock SWFs need AvatarControl host to walk.
  var WEAR_COMPANION_ONLY = true; // (?v=20260906ch) single-player host nest + stand cover
  var WEAR_SAFE_COMPANION_UPGRADE = false; // cg Option A dual-layer OFF
  var WEAR_AUTO_COMPANION_UPGRADE = false; // legacy ce flag kept false (dangerous remount-into-host)
  var FORCE_RUFFLE_KEY = "whirled2.forceRuffleInLoft";
  var api = {};

  // ---------------------------------------------------------------------------
  // Tiny HTML escape (same spirit as app.js esc)
  // ---------------------------------------------------------------------------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  // ---------------------------------------------------------------------------
  // File sniffing — magic bytes, not file extensions alone
  // ---------------------------------------------------------------------------
  function sniffKind(u8, fileName) {
    // How this works: look at the first bytes. SWF = FWS / CWS / ZWS. FLA old = OLE D0CF11E0.
    // Zip (PK) may contain a SWF + thumb. Beginner: extensions can lie; magic is honest.
    var name = String(fileName || "").toLowerCase();
    if (!u8 || u8.length < 3) {
      if (/\.swf$/i.test(name)) return "swf-unknown";
      if (/\.fla$/i.test(name)) return "fla-unknown";
      if (/\.zip$/i.test(name)) return "zip-unknown";
      return "unknown";
    }
    // SWF magic
    if (u8[0] === 0x46 && u8[1] === 0x57 && u8[2] === 0x53) return "swf-fws"; // uncompressed
    if (u8[0] === 0x43 && u8[1] === 0x57 && u8[2] === 0x53) return "swf-cws"; // zlib
    if (u8[0] === 0x5a && u8[1] === 0x57 && u8[2] === 0x53) return "swf-zws"; // LZMA
    // OLE compound (old Flash FLA)
    if (u8[0] === 0xd0 && u8[1] === 0xcf && u8[2] === 0x11 && u8[3] === 0xe0) return "fla-ole";
    // Zip (modern FLA or wardrobe pack)
    if (u8[0] === 0x50 && u8[1] === 0x4b) {
      if (/\.fla$/i.test(name)) return "fla-zip";
      return "zip";
    }
    // PNG / JPEG / GIF for companion thumbs
    if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e) return "png";
    if (u8[0] === 0xff && u8[1] === 0xd8) return "jpeg";
    if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) return "gif";
    if (/\.swf$/i.test(name)) return "swf-unknown";
    if (/\.fla$/i.test(name)) return "fla-unknown";
    if (/\.zip$/i.test(name)) return "zip-unknown";
    return "unknown";
  }

  function isSwfKind(kind) {
    return kind === "swf-fws" || kind === "swf-cws" || kind === "swf-zws" || kind === "swf-unknown";
  }
  function isFlaKind(kind) {
    return kind === "fla-ole" || kind === "fla-zip" || kind === "fla-unknown";
  }

  function parseSwfHeader(u8) {
    // How this works: SWF header = 3-byte signature + 1-byte version + 4-byte little-endian length.
    // We do NOT decompress or parse tags (no AvatarControl states in JS). Honest limits.
    var kind = sniffKind(u8, "");
    if (!isSwfKind(kind) || u8.length < 8) {
      return { ok: false, kind: kind, reason: "Not a recognizable SWF header (need FWS/CWS/ZWS)." };
    }
    var version = u8[3];
    var fileLength = u8[4] | (u8[5] << 8) | (u8[6] << 16) | (u8[7] << 24);
    var compression =
      kind === "swf-fws" ? "none (FWS)" :
      kind === "swf-cws" ? "zlib (CWS)" :
      kind === "swf-zws" ? "LZMA (ZWS)" : "unknown";
    return {
      ok: true,
      kind: kind,
      version: version,
      declaredLength: fileLength >>> 0,
      actualBytes: u8.length,
      compression: compression,
      // Frame size / fps live in the RECT after header — needs bit unpack + inflate for CWS.
      // We leave that to Ruffle; do not fake dimensions.
      dimensions: null,
      fps: null,
      note: "Flash tag tree / AvatarControl states are NOT parsed in-browser. Use Ruffle play-as-is or attach PNG states."
    };
  }

  // ---------------------------------------------------------------------------
  // SHA-1 (classic HashMediaDesc style) + helpers
  // ---------------------------------------------------------------------------
  function bufToHex(buf) {
    var u8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    var out = "";
    for (var i = 0; i < u8.length; i++) {
      var h = u8[i].toString(16);
      out += h.length === 1 ? "0" + h : h;
    }
    return out;
  }
  function sha1PureJs(arrayBuffer) {
    function rotl(n, s) { return (n << s) | (n >>> (32 - s)); }
    function toWords(u8) {
      var l = u8.length;
      var nWords = (((l + 8) >> 6) + 1) * 16;
      var w = new Array(nWords);
      var i;
      for (i = 0; i < nWords; i++) w[i] = 0;
      for (i = 0; i < l; i++) w[i >> 2] |= u8[i] << (24 - (i % 4) * 8);
      w[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
      w[nWords - 1] = l * 8;
      return w;
    }
    var u8 = new Uint8Array(arrayBuffer);
    var words = toWords(u8);
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    for (var i = 0; i < words.length; i += 16) {
      var w = new Array(80), j, a, b, c, d, e, f, k, temp;
      for (j = 0; j < 16; j++) w[j] = words[i + j] | 0;
      for (j = 16; j < 80; j++) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      a = h0; b = h1; c = h2; d = h3; e = h4;
      for (j = 0; j < 80; j++) {
        if (j < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
        else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
        else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else { f = b ^ c ^ d; k = 0xCA62C1D6; }
        temp = (rotl(a, 5) + f + e + k + w[j]) | 0;
        e = d; d = c; c = rotl(b, 30); b = a; a = temp;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
    }
    function hex32(n) {
      var s = (n >>> 0).toString(16);
      return ("00000000" + s).slice(-8);
    }
    return hex32(h0) + hex32(h1) + hex32(h2) + hex32(h3) + hex32(h4);
  }
  function sha1OfArrayBuffer(arrayBuffer) {
    return Promise.resolve().then(function () {
      if (global.crypto && crypto.subtle && crypto.subtle.digest) {
        return crypto.subtle.digest("SHA-1", arrayBuffer).then(function (dig) {
          return bufToHex(dig);
        }).catch(function () { return sha1PureJs(arrayBuffer); });
      }
      return sha1PureJs(arrayBuffer);
    });
  }
  function fileToArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error("Could not read file.")); };
      reader.readAsArrayBuffer(file);
    });
  }
  function arrayBufferToDataUrl(arrayBuffer, mime) {
    var u8 = new Uint8Array(arrayBuffer);
    var chunk = 0x8000;
    var parts = [];
    for (var i = 0; i < u8.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, u8.subarray(i, i + chunk)));
    }
    return "data:" + (mime || "application/octet-stream") + ";base64," + btoa(parts.join(""));
  }
  function revokeUrl(url) {
    if (url && String(url).indexOf("blob:") === 0) {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }
  }

  // ---------------------------------------------------------------------------
  // IndexedDB blob store (shared name with app.js lab — same DB)
  // ---------------------------------------------------------------------------
  function openMediaIdb() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB not available."));
        return;
      }
      var req = indexedDB.open(MEDIA_IDB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(MEDIA_IDB_STORE)) {
          db.createObjectStore(MEDIA_IDB_STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("IndexedDB open failed")); };
    });
  }
  function idbPutBlob(sha1, record) {
    return openMediaIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_IDB_STORE, "readwrite");
        tx.objectStore(MEDIA_IDB_STORE).put(record, sha1);
        tx.oncomplete = function () { resolve(sha1); };
        tx.onerror = function () { reject(tx.error || new Error("IDB put failed")); };
      });
    });
  }
  function idbGetBlob(sha1) {
    return openMediaIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_IDB_STORE, "readonly");
        var req = tx.objectStore(MEDIA_IDB_STORE).get(sha1);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error || new Error("IDB get failed")); };
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Analyze a File → honest report
  // ---------------------------------------------------------------------------
  function analyzeFile(file) {
    if (!file) return Promise.reject(new Error("No file."));
    return fileToArrayBuffer(file).then(function (buf) {
      var u8 = new Uint8Array(buf);
      var kind = sniffKind(u8, file.name);
      var report = {
        fileName: file.name || "upload",
        bytes: u8.length,
        mime: file.type || "",
        kind: kind,
        isSwf: isSwfKind(kind),
        isFla: isFlaKind(kind),
        isZip: kind === "zip" || kind === "zip-unknown" || kind === "fla-zip",
        isImage: kind === "png" || kind === "jpeg" || kind === "gif",
        swf: null,
        flaNote: null,
        paths: [],
        honestLimits: []
      };
      if (report.isSwf) {
        report.swf = parseSwfHeader(u8);
        report.paths = [
          { id: "ruffle", label: "Play-as-is in Ruffle (Experimental)", detail: "Best visual fidelity for a real .swf. Walk/states need a host shim later — today it plays the movie clip." },
          { id: "png", label: "Attach PNG idle/walk exports", detail: "Export frames from Animate and map them like the PNG wizard so loft click-to-walk works now." },
          { id: "hybrid", label: "Hybrid classic pack", detail: "Keep the SWF for Stuff preview + optional loft overlay; use PNGs for chrome walk until Pixi." }
        ];
        report.honestLimits.push("Cannot parse Flash internals (tags, AvatarControl states/actions) in JavaScript.");
        report.honestLimits.push("Ruffle alone has no Whirled host shim — appearanceChanged / hotspot not driven yet.");
      } else if (report.isFla) {
        report.flaNote = kind === "fla-ole"
          ? "Old Adobe Flash OLE .fla (source). Browsers cannot play it. Publish → .swf in Animate, and/or export PNG sequences."
          : "Zip-based .fla (newer Animate). Still source — publish SWF / export PNGs for the game.";
        report.paths = [
          { id: "publish", label: "Publish SWF from Animate", detail: "File → Publish → SWF, then re-upload here." },
          { id: "png", label: "Export PNG idle/walk", detail: "Modern Wear path — same as Whirl." }
        ];
        report.honestLimits.push("Raw .fla is never mounted in the loft or Ruffle.");
      } else if (report.isZip) {
        report.paths = [
          { id: "unzip-hint", label: "Zip with SWF + thumb", detail: "We’ll look for .swf + image inside (simple scan). Remix datapacks (_data.xml) are Coming Soon." }
        ];
        report.honestLimits.push("Full remix datapack unpack is not implemented yet.");
      } else if (report.isImage) {
        report.paths = [
          { id: "thumb", label: "Use as thumbnail / PNG fallback", detail: "Classic thumbs were ~80×60. Fine as Stuff card art or idle frame." }
        ];
      } else {
        report.honestLimits.push("Unrecognized type — try .swf, .fla, .zip (swf+thumb), or PNG/JPEG/GIF.");
      }
      // Keep buffer for caller
      report._buffer = buf;
      report._u8 = u8;
      return report;
    });
  }

  // Lightweight zip local-file scan for .swf + images (store / deflate — images only if stored or we skip inflate)
  function scanZipForAvatarParts(u8) {
    // How this works: walk local file headers; collect .swf (stored or note deflated) + image names.
    // Beginner: if the SWF is stored (method 0) we can extract it; deflated SWF needs inflate — we note it.
    var view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    function u16(o) { return view.getUint16(o, true); }
    function u32(o) { return view.getUint32(o, true); }
    var i = 0;
    var found = { swf: null, swfName: "", images: [], notes: [] };
    while (i + 30 < u8.length) {
      if (u32(i) !== 0x04034b50) break;
      var method = u16(i + 8);
      var compSize = u32(i + 18);
      var nameLen = u16(i + 26);
      var extraLen = u16(i + 28);
      var nameBytes = u8.subarray(i + 30, i + 30 + nameLen);
      var name = "";
      try { name = new TextDecoder("utf-8").decode(nameBytes); } catch (e) { name = "file"; }
      var dataStart = i + 30 + nameLen + extraLen;
      var data = u8.subarray(dataStart, dataStart + compSize);
      i = dataStart + compSize;
      if (/\/$/.test(name)) continue;
      if (/\.swf$/i.test(name)) {
        if (method === 0) {
          found.swf = data.slice ? data.slice(0) : new Uint8Array(data);
          found.swfName = name;
        } else {
          found.notes.push("Found " + name + " but it is compressed in the zip (need inflate) — unzip locally and upload the .swf.");
        }
      } else if (/\.(png|jpe?g|gif|webp)$/i.test(name) && method === 0 && data.length < 400000) {
        var mime = /\.png$/i.test(name) ? "image/png" : (/\.gif$/i.test(name) ? "image/gif" : (/\.webp$/i.test(name) ? "image/webp" : "image/jpeg"));
        try {
          var b64 = btoa(Array.prototype.map.call(data, function (c) { return String.fromCharCode(c); }).join(""));
          found.images.push({ name: name, dataUrl: "data:" + mime + ";base64," + b64 });
        } catch (eImg) {}
      }
    }
    return found;
  }

  // ---------------------------------------------------------------------------
  // Ruffle loader — FIRST-CLASS (?v=20260906cd)
  // Self-host assets/ruffle/ (GitHub Pages same-origin). Preload on Classic Flash / debug / flashQa.
  // Beginner: loft badge shows Ready / Mounting / Playing / Failed (not vague Experimental).
  // ENGINE DEV: one ensureRuffle shared by Stuff preview + loft Wear. Companion hostLoadBytes still primary.
  // ---------------------------------------------------------------------------
  var ruffleLoadPromise = null;
  var ruffleLoadSource = null;
  var activePlayers = [];
  var ruffleUiStatus = { state: "idle", detail: "", source: null, error: null, at: 0 };
  function setRuffleStatus(state, detail, extra) {
    extra = extra || {};
    ruffleUiStatus = {
      state: String(state || "idle"),
      detail: String(detail || ""),
      source: extra.source != null ? extra.source : ruffleLoadSource,
      error: extra.error != null ? String(extra.error) : (state === "failed" ? String(detail || "") : null),
      at: Date.now()
    };
    try { paintRuffleStatusBadges(); } catch (ePaint) {}
    return ruffleUiStatus;
  }
  function getRuffleStatus() { return ruffleUiStatus; }
  function ruffleStatusLabel(st) {
    st = st || ruffleUiStatus.state;
    if (st === "loading") return "Ruffle loading…";
    if (st === "ready") return "Ruffle ready";
    if (st === "mounting") return "Ruffle mounting";
    if (st === "playing") return "Ruffle playing";
    if (st === "failed") return "Ruffle failed";
    return "Ruffle idle";
  }
  function ruffleStatusBadgeHtml(opts) {
    opts = opts || {};
    var st = opts.state || ruffleUiStatus.state;
    var label = opts.label || ruffleStatusLabel(st);
    var title = opts.title || (ruffleUiStatus.error
      ? ("Ruffle: " + ruffleUiStatus.error)
      : ("Ruffle status: " + st + (ruffleUiStatus.source ? (" via " + ruffleUiStatus.source) : "")));
    var cls = "ruffle-status-badge is-" + st;
    if (opts.overlay) cls += " ruffle-status-badge-overlay";
    if (opts.compact) cls += " is-compact";
    return '<span class="' + cls + '" data-ruffle-status-badge="1" data-state="' + esc(st)
      + '" title="' + esc(title) + '">' + esc(label) + '</span>';
  }
  function paintRuffleStatusBadges() {
    var nodes = document.querySelectorAll("[data-ruffle-status-badge]");
    if (!nodes || !nodes.length) return;
    var st = ruffleUiStatus.state;
    var label = ruffleStatusLabel(st);
    var title = ruffleUiStatus.error
      ? ("Ruffle: " + ruffleUiStatus.error)
      : ("Ruffle status: " + st + (ruffleUiStatus.source ? (" via " + ruffleUiStatus.source) : ""));
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      try {
        el.setAttribute("data-state", st);
        el.className = String(el.className || "").replace(/\bis-(idle|loading|ready|mounting|playing|failed)\b/g, "").trim();
        el.classList.add("ruffle-status-badge", "is-" + st);
        el.title = title;
        if (el.classList.contains("ruffle-status-badge-overlay")) {
          var shortMap = { loading: "Loading", ready: "Ready", mounting: "Mounting", playing: "Playing", failed: "Failed", idle: "Ruffle" };
          el.textContent = shortMap[st] || "Ruffle";
        } else {
          el.textContent = label;
        }
      } catch (eN) {}
    }
  }
  function flashQaEnabled() {
    try {
      var q = String(global.location && global.location.search || "");
      return /(?:\?|&)flashQa=1(?:&|$)/.test(q);
    } catch (e) { return false; }
  }
  function shouldPreloadRuffle() {
    try {
      if (flashQaEnabled() || avatarDebugEnabled()) return true;
      if (localStorage.getItem(OPT_IN_KEY) === "1") return true;
      if (localStorage.getItem(FORCE_RUFFLE_KEY) === "1") return true;
      if (global.WhirledChrome && global.WhirledChrome.getWornAvatar) {
        var worn = global.WhirledChrome.getWornAvatar();
        if (worn && (getPlaybackMode(worn) === "ruffle" || shouldMountRuffleInLoft(worn))) return true;
      }
    } catch (e) {}
    return false;
  }
  function loadRuffleScript(src, tag) {
    return new Promise(function (resolve, reject) {
      global.RufflePlayer = global.RufflePlayer || {};
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.setAttribute("data-whirled-ruffle", "1");
      s.setAttribute("data-whirled-ruffle-src", src);
      s.onload = function () {
        try {
          if (global.RufflePlayer && global.RufflePlayer.newest) resolve(global.RufflePlayer.newest());
          else reject(new Error("Ruffle loaded but API missing (" + tag + ")."));
        } catch (e) { reject(e); }
      };
      s.onerror = function () {
        reject(new Error("Could not load Ruffle (" + tag + ")."));
      };
      document.head.appendChild(s);
    });
  }
  function ensureRuffle() {
    // Official wiki: set window.RufflePlayer.config (incl. publicPath) before/with script.
    try { applyOfficialRuffleConfig(); } catch (ePre) {}
    // How this works (?v=20260906cd): load vendored assets/ruffle/ruffle.js (Pages same-origin).
    // Beginner: Stuff preview + loft Wear share this helper; errors show on the loft badge.
    // ENGINE DEV: wasm siblings must sit next to ruffle.js; GitHub Pages serves application/wasm.
    if (global.RufflePlayer && global.RufflePlayer.newest) {
      if (!ruffleLoadSource) ruffleLoadSource = "cached";
      if (ruffleUiStatus.state === "idle" || ruffleUiStatus.state === "loading") {
        setRuffleStatus("ready", "Ruffle API present", { source: ruffleLoadSource });
      }
      return Promise.resolve(global.RufflePlayer.newest());
    }
    if (ruffleLoadPromise) return ruffleLoadPromise;
    setRuffleStatus("loading", "Loading Ruffle (self-host)…", { source: "self" });
    var primary = (typeof RUFFLE_SELF !== "undefined" && RUFFLE_SELF) ? RUFFLE_SELF : RUFFLE_CDN;
    ruffleLoadPromise = loadRuffleScript(primary, "self").then(function (apiInst) {
      ruffleLoadSource = "self";
      setRuffleStatus("ready", "Ruffle ready (self-host)", { source: "self" });
      return apiInst;
    }).catch(function (err) {
      ruffleLoadPromise = null;
      var msg = (err && err.message) || "Could not load Ruffle from assets/ruffle/. PNG fallback still works.";
      setRuffleStatus("failed", msg, { error: msg, source: "self" });
      throw new Error(msg);
    });
    return ruffleLoadPromise;
  }
  function preloadRuffleIfNeeded() {
    if (!shouldPreloadRuffle()) return Promise.resolve(null);
    return ensureRuffle().catch(function () { return null; });
  }
  function getDemoQaSwfUrl() {
    // Paint-only smoke SWF — NOT for walk proof.
    try { return new URL(RUFFLE_DEMO_SWF + "?v=" + VERSION, global.location.href).href; }
    catch (e) { return RUFFLE_DEMO_SWF; }
  }
  function getBodyDemoSwfUrl() {
    // (?v=20260906ch) AvatarControl mimic — floor click → hostWalk → green walk pose.
    try { return new URL(BODY_DEMO_SWF + "?v=" + VERSION, global.location.href).href; }
    catch (e) { return BODY_DEMO_SWF; }
  }

  function preloadRuffle() {
    try { ensureRuffle().catch(function () {}); } catch (e) {}
  }
  function destroyPlayers() {
    activePlayers.forEach(function (p) {
      try {
        if (p && p.remove) p.remove();
        else if (p && p.parentNode) p.parentNode.removeChild(p);
      } catch (e) {}
    });
    activePlayers = [];
  }

  function mountRuffle(container, swfUrl, opts) {
    // How this works (?v=20260906bt): Ruffle TRANSPARENT stage + loft PE-none canvas; preserve stand thumb.
    // Beginner: black box was opaque stage — fixed via wmode + backgroundColor null + CSS.
    // ENGINE DEV: chrome-owned host only (never #stage-slot). Loft enables allowScriptAccess so
    // user-owned SWFs can talk to our minimal AvatarHost shim (EI only — not full sharedEvents).
    opts = opts || {};
    if (!container || (!swfUrl && !(opts && opts.swfData))) {
      return Promise.reject(new Error("Missing container or SWF (url or data)."));
    }
    destroyPlayersIn(container);
    var loftMount = !!(opts.loftMount || (container.id === "avatar-ruffle-host")
      || (container.classList && container.classList.contains("classic-wear-swf-slot")));
    setRuffleStatus("mounting", loftMount ? "Mounting loft SWF…" : "Mounting preview…");
    return ensureRuffle().then(function (ruffle) {
      try { applyOfficialRuffleConfig(); } catch (eCfg) {}
      var player = ruffle.createPlayer();
      player.style.width = opts.width || "100%";
      player.style.height = opts.height || "100%";
      player.style.maxWidth = opts.maxWidth || "220px";
      player.style.maxHeight = opts.maxHeight || "280px";
      player.style.display = "block";
      player.style.background = "transparent";
      player.style.backgroundColor = "transparent";
      // How this works: loft Ruffle must NOT eat floor clicks — hitbox/nameplate owns emote clicks.
      if (loftMount || opts.pointerEvents === "none") {
        player.style.pointerEvents = "none";
        try { container.style.pointerEvents = "none"; } catch (ePe) {}
      }
      player.setAttribute("data-classic-ruffle", "1");
      player.setAttribute("data-wmode", "transparent");
      if (loftMount) player.setAttribute("data-loft-ruffle", "1");
      // (?v=20260906bt) CRITICAL: do NOT wipe stand thumb / placeholder — empty loft looks like tofu.
      // Beginner: keep last thumb under Ruffle until SWF paints; restore on fail.
      // ENGINE DEV: innerHTML="" was the overnight tofu bug after ?v=bs.
      var savedStand = null;
      var savedGlyph = null;
      try {
        var standEl = container.querySelector("img.classic-swf-stand-thumb");
        if (standEl) {
          savedStand = { src: standEl.getAttribute("src") || standEl.src || "", alt: standEl.alt || "" };
        }
        var glyphEl = container.querySelector(".classic-swf-placeholder");
        if (glyphEl) savedGlyph = glyphEl.outerHTML;
      } catch (eSave) {}
      destroyPlayersIn(container);
      // Clear only ruffle nodes; rebuild host contents with stand first, then player.
      try {
        var keepBits = [];
        if (savedStand && savedStand.src) {
          keepBits.push('<img class="classic-swf-stand-thumb" src="' + esc(savedStand.src)
            + '" alt="' + esc(savedStand.alt || "") + '" aria-hidden="true" />');
        } else if (savedGlyph) {
          keepBits.push(savedGlyph);
        }
        container.innerHTML = keepBits.join("");
      } catch (eHtml) { try { container.innerHTML = ""; } catch (e2) {} }
      container.appendChild(player);
      activePlayers.push(player);
      try { container.classList.add("is-mounting"); container.classList.remove("is-failed", "is-playing"); } catch (eCl) {}
      // Loft: allowScriptAccess so SWF→JS EI can reach our shim. Preview/Stuff stays locked down.
      var allowScript = loftMount ? true : (opts.allowScriptAccess === true);
      // Official Using-Ruffle: player.ruffle().load({url|data, ...}). Prefer data ArrayBuffer for IDB.
      // Beginner: blob: URLs can work on outer player but data: is the documented in-memory path.
      // ENGINE DEV: callExternalInterface for EI; publicPath set in applyOfficialRuffleConfig.
      var loadOpts = {
        backgroundColor: (opts.backgroundColor === undefined) ? null : opts.backgroundColor,
        wmode: opts.wmode || "transparent",
        autoplay: "on",
        unmuteOverlay: "hidden",
        splashScreen: false,
        letterbox: opts.letterbox || "off",
        allowScriptAccess: allowScript
      };
      if (opts.swfData) {
        loadOpts.data = opts.swfData;
        loadOpts.swfFileName = opts.swfFileName || "avatar.swf";
      } else {
        loadOpts.url = swfUrl;
      }
      function doLoad() {
        try {
          var api = player.ruffle && player.ruffle();
          if (api && typeof api.load === "function") return api.load(loadOpts);
        } catch (eR) { logAvatarDebug("ruffle().load threw", eR && eR.message); }
        // Legacy fallback (PlayerElement.load)
        return player.load(loadOpts);
      }
      return doLoad().then(function () {
        try {
          var cvs = player.querySelector && player.querySelector("canvas");
          if (cvs) {
            cvs.style.background = "transparent";
            cvs.style.backgroundColor = "transparent";
            if (loftMount) cvs.style.pointerEvents = "none";
          }
        } catch (eCv) {}
        if (loftMount) {
          try { attachLoftAvatarHost(player, container); } catch (eHost) {
            logAvatarDebug("attachLoftAvatarHost failed", eHost && eHost.message);
          }
        }
        try {
          container.classList.remove("is-mounting", "is-failed");
          container.classList.add("is-playing", "is-on");
        } catch (eOk) {}
        setRuffleStatus("playing", loftMount ? "Playing in loft" : "Playing preview", { source: ruffleLoadSource });
        return player;
      }).catch(function (err) {
        try {
          container.classList.remove("is-mounting", "is-playing");
          container.classList.add("is-failed", "is-on");
          container.setAttribute("data-ruffle-error", String(err && err.message || err).slice(0, 160));
        } catch (eF) {}
        setRuffleStatus("failed", String(err && err.message || err), { error: String(err && err.message || err) });
        throw err;
      });
    }).catch(function (err) {
      try {
        container.classList.remove("is-mounting", "is-playing");
        container.classList.add("is-failed", "is-on");
        container.setAttribute("data-ruffle-error", String(err && err.message || err).slice(0, 160));
      } catch (eF2) {}
      setRuffleStatus("failed", String(err && err.message || err), { error: String(err && err.message || err) });
      throw err;
    });
  }

  function destroyPlayersIn(container) {
    if (!container) return;
    var nodes = container.querySelectorAll("[data-classic-ruffle], ruffle-player, ruffle-embed");
    for (var i = 0; i < nodes.length; i++) {
      try { nodes[i].remove(); } catch (e) {}
    }
    container.querySelectorAll && null;
  }

  // ---------------------------------------------------------------------------
  // Resolve SWF URL from a Stuff / worn row (blob from IDB, or data URL)
  // ---------------------------------------------------------------------------
  function resolveSwfUrl(item) {
    if (!item) return Promise.resolve(null);
    if (item.swfUrl && (/^(blob:|data:|https?:|\.\/|\/)/i.test(item.swfUrl))) {
      return Promise.resolve(item.swfUrl);
    }
    if (item.swfDataUrl) return Promise.resolve(item.swfDataUrl);
    var sha = item.swfSha1 || (item.pack && item.pack.swfSha1) || null;
    if (sha) {
      return idbGetBlob(sha).then(function (rec) {
        if (!rec) return null;
        if (rec.blob) return URL.createObjectURL(rec.blob);
        if (rec.dataUrl) return rec.dataUrl;
        if (rec.buffer) {
          var blob = new Blob([rec.buffer], { type: rec.mime || "application/x-shockwave-flash" });
          return URL.createObjectURL(blob);
        }
        return null;
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  function itemHasClassicSwf(item) {
    return !!(item && (item.swfSha1 || item.swfDataUrl || item.swfUrl || (item.pack && item.pack.swfUrl)));
  }

  function itemWantsClassicFlash(item) {
    // How this works: per-item opt-in OR global preference. Clear Experimental badge either way.
    if (!item) return false;
    if (item.classicFlashOptIn === true || item.useClassicFlash === true) return true;
    if (item.pack && (item.pack.classicFlashOptIn || item.pack.useClassicFlash)) return true;
    try {
      if (localStorage.getItem(OPT_IN_KEY) === "1" && itemHasClassicSwf(item)) return true;
    } catch (e) {}
    return false;
  }

  function stateHasFrames(st) {
    return !!(st && st.frames && st.frames.length);
  }

  function itemHasPngWalk(item) {
    // Beginner (?v=20260906bs): Whirled2 Smooth needs REAL walk PNGs — not thumb/preview alone.
    // ROOT CAUSE FIX: thumb copied into states.idle used to return true here → false Smooth
    // (playbackMode png-hybrid) → loft PNG path with no walk frames → frozen/tofu look.
    // ENGINE DEV: Hybrid gate = states.walk (or pack.walk) with frames. Idle-only / thumb ≠ Smooth.
    if (!item || item.isTofu) return false;
    if (item.states && stateHasFrames(item.states.walk)) return true;
    if (item.pack && item.pack.states && stateHasFrames(item.pack.states.walk)) return true;
    return false;
  }

  function itemHasStandThumb(item) {
    // Thumb/preview only — useful as stand art under SWF motion, NOT enough for Hybrid smooth.
    if (!item || item.isTofu) return false;
    return !!(item.preview || item.thumb);
  }

  function itemIsHybrid(item) {
    // Hybrid (smooth): SWF archive + PNG idle/walk for loft click-to-walk (Whirl path).
    return !!(item && itemHasClassicSwf(item) && itemHasPngWalk(item));
  }

  /**
   * Dual Wear modes (?v=20260906bg) — research + user ask: pick ONE clear path per item.
   * playbackMode: 'png-hybrid' | 'ruffle'
   * Default: hybrid if real PNG idle/walk exist, else ruffle if SWF, else null (Whirl/PNG-only).
   * Beginner: Smooth = chrome PNG walk (no Ruffle). Classic Flash = real .swf via Ruffle.
   * ENGINE DEV: mount gate reads playbackMode first; legacy forceRuffleInLoft still maps to ruffle.
   */
  function normalizePlaybackMode(mode) {
    mode = String(mode || "").toLowerCase().trim();
    if (mode === "png-hybrid" || mode === "hybrid" || mode === "smooth" || mode === "png") return "png-hybrid";
    if (mode === "ruffle" || mode === "flash" || mode === "swf" || mode === "classic") return "ruffle";
    return null;
  }

  function defaultPlaybackMode(item) {
    if (!item || item.isTofu) return null;
    if (itemHasPngWalk(item)) return "png-hybrid";
    if (itemHasClassicSwf(item) || item.swfUrl || item.swfDataUrl || item.swfSha1) return "ruffle";
    return null;
  }

  function getPlaybackMode(item) {
    // How this works: explicit item.playbackMode wins; else pack; else legacy forceRuffle → ruffle;
    // else default (PNGs → hybrid, SWF-only → ruffle).
    if (!item) return null;
    var explicit = normalizePlaybackMode(item.playbackMode)
      || normalizePlaybackMode(item.pack && item.pack.playbackMode);
    if (explicit === "png-hybrid" && !itemHasPngWalk(item)) {
      // Smooth requires frames — fall through so UI can CTA attach PNGs.
      if (itemHasClassicSwf(item)) return "ruffle";
      return null;
    }
    if (explicit) return explicit;
    // Legacy: forceRuffleInLoft / useRuffleInLoft meant Classic Flash appearance.
    if (item.forceRuffleInLoft === true || item.useRuffleInLoft === true) return "ruffle";
    if (item.pack && (item.pack.forceRuffleInLoft || item.pack.useRuffleInLoft)) return "ruffle";
    try {
      if (localStorage.getItem(FORCE_RUFFLE_KEY) === "1" && itemHasClassicSwf(item)) return "ruffle";
    } catch (e) {}
    return defaultPlaybackMode(item);
  }

  function setPlaybackModeOnItem(item, mode) {
    if (!item) return item;
    mode = normalizePlaybackMode(mode);
    if (!mode) return item;
    if (mode === "png-hybrid" && !itemHasPngWalk(item)) {
      // Cannot enable Smooth without idle/walk — keep prior / default to ruffle if SWF.
      mode = itemHasClassicSwf(item) ? "ruffle" : mode;
      if (mode !== "png-hybrid") {
        item._playbackModeBlocked = "png-hybrid-needs-frames";
      }
    } else {
      try { delete item._playbackModeBlocked; } catch (eB) {}
    }
    item.playbackMode = mode;
    if (!item.pack) item.pack = {};
    item.pack.playbackMode = mode;
    // Keep legacy boolean in sync so older app.js paths still work.
    item.forceRuffleInLoft = (mode === "ruffle" && itemHasClassicSwf(item));
    item.pack.forceRuffleInLoft = item.forceRuffleInLoft;
    if (mode === "ruffle" && itemHasClassicSwf(item)) {
      item.classicFlashOptIn = true;
      item.pack.classicFlashOptIn = true;
    }
    return item;
  }

  function forceRuffleInLoft(item) {
    // Dual-mode: ruffle playbackMode OR legacy force flag / global key.
    var mode = getPlaybackMode(item);
    if (mode === "ruffle") return true;
    if (mode === "png-hybrid") return false;
    if (item && (item.forceRuffleInLoft === true || item.useRuffleInLoft === true)) return true;
    if (item && item.pack && (item.pack.forceRuffleInLoft || item.pack.useRuffleInLoft)) return true;
    try {
      if (localStorage.getItem(FORCE_RUFFLE_KEY) === "1") return true;
    } catch (e) {}
    return false;
  }

  function shouldMountRuffleInLoft(worn) {
    // Mode A (ruffle): mount transparent Ruffle. Mode B (png-hybrid): never mount Ruffle in loft.
    // (?v=20260906bt): SWF markers beat a stale isTofu flag — never skip mount for classic Wear.
    if (!worn) return false;
    var hasSwf = itemHasClassicSwf(worn) || !!(worn.swfUrl || worn.swfDataUrl || worn.swfSha1 || worn.mediaKind === "swf");
    if (worn.isTofu && !hasSwf) return false;
    if (!hasSwf) return false;
    var mode = getPlaybackMode(worn);
    if (mode === "png-hybrid") return false;
    if (mode === "ruffle") {
      // Still require classic opt-in / mediaKind so random SWF archives do not surprise-mount.
      if (!itemWantsClassicFlash(worn) && worn.mediaKind !== "swf" && !worn.classicFlashOptIn
        && !worn.forceRuffleInLoft) {
        // SWF-only Wear with default ruffle: treat as wanting classic.
        if (defaultPlaybackMode(worn) === "ruffle") return true;
        return false;
      }
      return true;
    }
    // Legacy fallback
    if (!itemWantsClassicFlash(worn) && worn.mediaKind !== "swf" && !worn.classicFlashOptIn) return false;
    if (itemIsHybrid(worn) && !forceRuffleInLoft(worn)) return false;
    return true;
  }

  function loftRenderMode(worn) {
    // Labels for UI: hybrid | ruffle | png | tofu  (hybrid ≈ png-hybrid)
    if (!worn) return "tofu";
    if (worn.isTofu && !wornHasClassicSwf(worn)) return "tofu";
    var mode = getPlaybackMode(worn);
    if (mode === "png-hybrid") return "hybrid";
    if (mode === "ruffle" || shouldMountRuffleInLoft(worn)) return "ruffle";
    if (itemHasPngWalk(worn)) return "png";
    return "unknown";
  }

  function wornHasClassicSwf(worn) {
    return !!(worn && (worn.swfUrl || worn.swfDataUrl || worn.swfSha1
      || worn.mediaKind === "swf" || itemHasClassicSwf(worn)));
  }

  /**
   * SWF-only walk UX (?v=20260906bb): bob + slight flip the loft billboard / Ruffle host
   * while chrome moves it. Stock SWFs cannot animate via AvatarControl yet — this keeps
   * the room feeling alive without broken tofu or a frozen slide.
   */
  function setLoftWalkMotion(on, faceHint) {
    var layer = document.getElementById("avatar-wear-layer");
    if (!layer) return;
    var bill = layer.querySelector(".avatar-wear-billboard");
    var host = layer.querySelector("#avatar-ruffle-host, .avatar-ruffle-host");
    // (?v=20260906cd): Body (uravatar) flips via orient<180 → scaleX=-1. When companion host
    // is connected, do NOT also CSS-flip the ruffle host (double-flip = moonwalk). Fallback
    // direct-avatar path still uses --wear-face on host bob keyframes (bt).
    var companionFacing = !!(loftUsesCompanionHost && loftHostState.connected);
    try {
      var face = (faceHint === -1 || faceHint === 1) ? faceHint
        : (bill && parseFloat(bill.style.getPropertyValue("--wear-face"))) || loftHostState._face || 1;
      if (face === -1 || face === 1) {
        loftHostState._face = face;
        if (bill) bill.style.setProperty("--wear-face", String(face));
        if (host) {
          if (companionFacing) {
            host.classList.add("is-companion-facing");
            host.style.setProperty("--wear-face", "1");
          } else {
            host.classList.remove("is-companion-facing");
            host.style.setProperty("--wear-face", String(face));
          }
        }
      }
    } catch (eFace) {}
    if (on) {
      layer.classList.add("is-swf-walking");
      if (bill) bill.classList.add("is-swf-walking");
      if (host) host.classList.add("is-swf-walking");
    } else {
      layer.classList.remove("is-swf-walking");
      if (bill) bill.classList.remove("is-swf-walking");
      if (host) host.classList.remove("is-swf-walking");
    }
  }

  function ensureClassicWornStates(row, item) {
    // How this works: Wear must carry classic item states + artFaces so loft = Whirl path.
    // Beginner: absolutize happens in app.js; here we merge pack.states if row.states empty.
    if (!row) return row;
    item = item || {};
    var packStates = (item.pack && item.pack.states) || item.states || null;
    if (packStates && typeof packStates === "object") {
      var hasAny = false;
      Object.keys(packStates).forEach(function (k) {
        if (stateHasFrames(packStates[k])) hasAny = true;
      });
      if (hasAny) {
        if (!row.states || typeof row.states !== "object") row.states = {};
        Object.keys(packStates).forEach(function (k) {
          if (stateHasFrames(packStates[k]) && !stateHasFrames(row.states[k])) {
            row.states[k] = {
              frames: (packStates[k].frames || []).slice(),
              frameDurationsMs: (packStates[k].frameDurationsMs || []).slice()
            };
          }
        });
      }
    }
    // Idle from frames if still missing. (?v=20260906bs): for Classic Flash / SWF-only,
    // do NOT invent states.idle from thumb/preview — that falsely tripped Hybrid + empty walk.
    // Keep thumb/preview on the row for Stuff cards + Ruffle last-stand art in loft HTML.
    if (!row.states) row.states = {};
    var pmEnsure = normalizePlaybackMode(row.playbackMode) || normalizePlaybackMode(row.pack && row.pack.playbackMode);
    var swfOnlyEnsure = !!(row.swfSha1 || row.swfDataUrl || row.swfUrl || row.mediaKind === "swf")
      && !stateHasFrames(row.states && row.states.walk)
      && !(row.pack && row.pack.states && stateHasFrames(row.pack.states.walk));
    if (!stateHasFrames(row.states.idle)) {
      if (row.frames && row.frames.length) {
        row.states.idle = { frames: row.frames.slice(), frameDurationsMs: (row.frameDurationsMs || []).slice() };
      } else if (!(pmEnsure === "ruffle" || swfOnlyEnsure)) {
        if (row.preview) {
          row.states.idle = { frames: [row.preview], frameDurationsMs: [400] };
        } else if (row.thumb) {
          row.states.idle = { frames: [row.thumb], frameDurationsMs: [400] };
        }
      }
    }
    if (!(row.frames && row.frames.length) && stateHasFrames(row.states.idle)) {
      row.frames = row.states.idle.frames.slice();
      row.frameDurationsMs = (row.states.idle.frameDurationsMs || []).slice();
    }
    if (!row.artFaces) {
      row.artFaces = item.artFaces || (item.pack && item.pack.artFaces) || "left";
    }
    return row;
  }

  /*
   * AvatarControl host shim (?v=20260906bs) — architecture study only; do NOT copy AGPL.
   * -----------------------------------------------------------------------
   * Research: Grey Havens whirled-sdk AvatarControl / ActorControl:
   *   - Stock Whirled SWFs dispatch "controlConnect" on loaderInfo.sharedEvents
   *     (NOT ExternalInterface). Host replies with hostProps; motion is driven by
   *     appearanceChanged_v1(location, orient, moving) / v2(+sleeping).
   *   - registerStates / registerActions / setState / triggerAction / setLogicalLocation
   *     are the public AS API (wiki.whirled.club + whirled.club ASdocs).
   * Ruffle: allowScriptAccess on player.load enables ExternalInterface both ways.
   *   - JS→SWF: player.callbackName(...) or player.ruffle().call(...) when SWF used addCallback.
   *   - SWF→JS: ExternalInterface.call("fn") hits window.fn when we expose stubs.
   * Honest: stock SDK avatars have ZERO EI — they need a Flash-side host SWF for
   * sharedEvents. This JS shim still helps hand-patched / community EI avatars and
   * logs what the SWF tries (?avatarDebug=1). Chrome always moves the billboard + bob.
   */

  // (?v=20260906cd): companion host nest — outer Ruffle = host.swf (http); avatar via hostLoadBytes.
  // Beginner: host.swf is OUR tiny Flash wrapper — not your avatar. It rebuilds your SWF from base64 bytes.
  // ENGINE DEV: nested Loader.load(blob:/data:) FAILS under Ruffle. Use Loader.loadBytes(ByteArray) only.
  // EI cannot pass ByteArray — JS sends base64 (chunked if huge). http(s) may still use hostLoadUrl.
  var COMPANION_HOST_SWF = "./assets/avatar-host/avatar-host.swf?v=" + VERSION;
  var loftUsesCompanionHost = false;
  var loftCompanionAttempted = false;
  var loftPendingAvatarUrl = null;
  var loftPendingAvatarB64 = null;
  var loftHostBridgeLog = [];
  var loftMountGeneration = 0;
  var loftCompanionWatchTimer = 0;
  var loftFallbackInFlight = false;
  var HOST_B64_CHUNK = 240000; // EI-safe chunk size for hostLoadBytesChunk
  var HOST_B64_MAX = 14 * 1024 * 1024; // ~10MB SWF as base64

  var loftActivePlayer = null;
  // (?v=20260906ch) Option A: DIRECT player stays in #avatar-ruffle-host; companion mounts in sibling layer.
  var loftDirectPlayer = null;
  var loftCompanionLayer = null;
  var loftCompanionPlayer = null;
  var loftSafeUpgradeActive = false;
  var loftHostState = {
    connected: false,
    gotControl: false,
    hostReady: false, // (?v=20260906ch) AvatarHost ctor registered addCallback + bridge ready
    bytesLoading: false,
    moving: false,
    orient: 180,
    state: "Default",
    sleeping: false,
    location: [0.5, 0, 0.5],
    lastEiCalls: [],
    lastJsToSwf: [],
    lastBridge: null,
    actions: [],
    states: [],
    hostMode: false,
    avatarUrl: null
  };
  // (?v=20260906cd) Walk duration parity + speak/sleep chrome wire (Grey Havens study — no AGPL).
  // Beginner: while you walk across the loft, the SWF stays in "walking" the whole time (not a blink).
  // ENGINE DEV: club WalkAnimation keeps isMoving + lerps _loc; we tick hostWalk(~100ms) with locX from billboard.
  var loftWalkLocTick = 0;
  var WALK_LOC_TICK_MS = 100;
  var HOST_SLEEP_IDLE_MS = 60000; // ~60s no floor/chat activity → hostSleep(true)
  var loftIdleCheckTimer = 0;
  var loftLastActivityAt = Date.now();

  function avatarDebugEnabled() {
    try {
      var q = String(global.location && global.location.search || "");
      return /(?:\?|&)avatarDebug=1(?:&|$)/.test(q);
    } catch (e) { return false; }
  }
  function logAvatarDebug() {
    if (!avatarDebugEnabled()) return;
    try {
      var args = ["[WhirledAvatarHost]"].concat([].slice.call(arguments));
      (global.console && console.log && console.log.apply(console, args));
    } catch (eL) {}
  }

  function rememberEi(dir, name, args) {
    var row = { at: Date.now(), dir: dir, name: String(name || ""), args: args };
    var bag = dir === "swf→js" ? loftHostState.lastEiCalls : loftHostState.lastJsToSwf;
    bag.unshift(row);
    if (bag.length > 40) bag.length = 40;
    logAvatarDebug(dir, name, args);
  }

  /**
   * Try to invoke a method the SWF registered via ExternalInterface.addCallback.
   * Ruffle exposes callbacks on the player element; some builds also support ruffle().call.
   * Beginner: if nothing is registered, this silently fails — chrome bob/bubble still work.
   */
  /**
   * (?v=20260906ch) Prefer companion host player for ALL host* EI.
   * Beginner: walk commands talk to host.swf, not the raw Body on DIRECT.
   * ENGINE DEV: cg dual-layer left loftActivePlayer on DIRECT during ready-flush → silent miss.
   */
  function resolveHostEiPlayer() {
    if (loftCompanionPlayer) return loftCompanionPlayer;
    return loftActivePlayer;
  }

  function tryCallIntoSwf(names, args, playerOpt) {
    // Official js-docs: prefer player.ruffle().callExternalInterface(name, ...args).
    // Beginner: if the SWF never registered the callback, chrome bob/bubble still work.
    // ENGINE DEV (?v=20260906ch): Ruffle returns undefined when callback missing — that is a MISS,
    // not ok:true (cg false-success stopped hostLoadBytes retries → never connected).
    args = args || [];
    var player = playerOpt || resolveHostEiPlayer() || loftActivePlayer;
    if (!player) return { ok: false, reason: "no-player" };
    var list = Array.isArray(names) ? names : [names];
    var tried = [];
    for (var i = 0; i < list.length; i++) {
      var name = list[i];
      if (!name) continue;
      tried.push(name);
      try {
        var apiR = player.ruffle && player.ruffle();
        if (apiR && typeof apiR.callExternalInterface === "function") {
          var rEi = apiR.callExternalInterface.apply(apiR, [name].concat(args));
          // undefined/null = callback not registered (Ruffle silent miss). false is a valid Bool return.
          if (rEi !== undefined && rEi !== null) {
            rememberEi("js→swf", name + " (callExternalInterface)", args);
            return { ok: true, via: "callExternalInterface:" + name, result: rEi };
          }
          logAvatarDebug("EI silent miss (undefined)", name);
        }
        if (apiR && typeof apiR.call === "function") {
          var r2 = apiR.call.apply(apiR, [name].concat(args));
          if (r2 !== undefined && r2 !== null) {
            rememberEi("js→swf", name + " (ruffle.call)", args);
            return { ok: true, via: "ruffle.call:" + name, result: r2 };
          }
        }
      } catch (e2) { logAvatarDebug("ruffle EI " + name + " threw", e2 && e2.message); }
      try {
        if (typeof player[name] === "function") {
          var r1 = player[name].apply(player, args);
          rememberEi("js→swf", name, args);
          return { ok: true, via: "player." + name, result: r1 };
        }
      } catch (e1) { logAvatarDebug("player." + name + " threw", e1 && e1.message); }
    }
    rememberEi("js→swf", "MISS:" + tried.join("|"), args);
    return { ok: false, reason: "no-callback", tried: tried };
  }

  /**
   * Resolve companion host SWF URL relative to this page (Pages subpath safe).
   * Beginner: host.swf is OUR tiny Flash wrapper — not your avatar. It loads your SWF inside.
   */
  function getCompanionHostSwfUrl() {
    try {
      return new URL(COMPANION_HOST_SWF, global.location.href).href;
    } catch (e) {
      return COMPANION_HOST_SWF;
    }
  }

  /** ArrayBuffer → plain base64 (no data: prefix). ENGINE DEV: EI string for hostLoadBytes. */
  function arrayBufferToBase64(arrayBuffer) {
    var u8 = new Uint8Array(arrayBuffer);
    var chunk = 0x8000;
    var parts = [];
    for (var i = 0; i < u8.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, u8.subarray(i, i + chunk)));
    }
    return btoa(parts.join(""));
  }

  function dataUrlToBase64(dataUrl) {
    var s = String(dataUrl || "");
    var idx = s.indexOf("base64,");
    if (idx < 0) return null;
    return s.slice(idx + 7).replace(/\s+/g, "");
  }

  /**
   * Resolve raw SWF bytes from Stuff / worn row (IDB / data URL / fetch blob|http).
   * Beginner: this is the file you uploaded — we need the bytes so the host SWF can rebuild it.
   * Returns Promise<{ buffer, mime, source }|null>
   */
  function resolveSwfBytes(item) {
    if (!item) return Promise.resolve(null);
    function fromBuffer(buf, mime, source) {
      if (!buf) return null;
      var ab = buf;
      if (buf instanceof ArrayBuffer) ab = buf;
      else if (buf.buffer && buf.byteLength != null) ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      else return null;
      return { buffer: ab, mime: mime || "application/x-shockwave-flash", source: source || "buffer" };
    }
    function fromBlob(blob, source) {
      if (!blob || !blob.arrayBuffer) return Promise.resolve(null);
      return blob.arrayBuffer().then(function (ab) {
        return fromBuffer(ab, blob.type || "application/x-shockwave-flash", source || "blob");
      });
    }
    if (item.swfDataUrl) {
      try {
        var b64d = dataUrlToBase64(item.swfDataUrl);
        if (b64d) {
          var bin = atob(b64d);
          var u8 = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          return Promise.resolve(fromBuffer(u8.buffer, "application/x-shockwave-flash", "swfDataUrl"));
        }
      } catch (eD) {}
    }
    var sha = item.swfSha1 || (item.pack && item.pack.swfSha1) || null;
    if (sha) {
      return idbGetBlob(sha).then(function (rec) {
        if (!rec) return null;
        if (rec.buffer) return fromBuffer(rec.buffer, rec.mime, "idb-buffer");
        if (rec.blob) return fromBlob(rec.blob, "idb-blob");
        if (rec.dataUrl) {
          var b64 = dataUrlToBase64(rec.dataUrl);
          if (!b64) return null;
          var bin2 = atob(b64);
          var u82 = new Uint8Array(bin2.length);
          for (var j = 0; j < bin2.length; j++) u82[j] = bin2.charCodeAt(j);
          return fromBuffer(u82.buffer, rec.mime || "application/x-shockwave-flash", "idb-dataUrl");
        }
        return null;
      }).catch(function () { return null; });
    }
    var url = item.swfUrl || null;
    if (url && (/^(blob:|https?:)/i.test(url) || url.indexOf("/") === 0 || url.indexOf("./") === 0)) {
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error("fetch " + res.status);
        return res.arrayBuffer();
      }).then(function (ab) {
        return fromBuffer(ab, "application/x-shockwave-flash", "fetch:" + String(url).slice(0, 12));
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  /**
   * (?v=20260906cd) Decide companion load strategy.
   * - blob:/data: → NEVER hostLoadUrl (nested Loader fails). Need base64 → hostLoadBytes, else skip companion.
   * - http(s)/relative → hostLoadUrl OK.
   * Returns { ok, mode: 'bytes'|'url'|'skip', b64?, url?, reason }
   */
  function prepareCompanionStrategy(avatarUrl, item) {
    return prepareCompanionPayload(avatarUrl, item);
  }

  function prepareCompanionPayload(avatarUrl, item) {
    var url = avatarUrl || "";
    if (/^https?:/i.test(url) || (/^\.?\//.test(url) && url.indexOf("blob:") !== 0)) {
      // relative or http — fine for hostLoadUrl; still prefer bytes if IDB has them
      return resolveSwfBytes(item).then(function (got) {
        if (got && got.buffer) {
          var b64p = arrayBufferToBase64(got.buffer);
          if (b64p && b64p.length <= HOST_B64_MAX) {
            return { ok: true, mode: "bytes", b64: b64p, url: url, reason: "bytes-prefer:" + got.source };
          }
        }
        return { ok: true, mode: "url", url: url, reason: "http-or-relative" };
      });
    }
    if (url.indexOf("data:") === 0) {
      var b64d = dataUrlToBase64(url);
      if (b64d && b64d.length <= HOST_B64_MAX) {
        return Promise.resolve({ ok: true, mode: "bytes", b64: b64d, url: url, reason: "dataurl-to-b64" });
      }
      return Promise.resolve({ ok: false, mode: "skip", reason: "data-too-large-or-bad", skipped: true });
    }
    // blob: or unknown — MUST use bytes path; never nested URL load
    return resolveSwfBytes(item).then(function (got) {
      if (!got || !got.buffer) {
        // Fallback: fetch the blob: URL itself for bytes
        if (url.indexOf("blob:") === 0) {
          return fetch(url).then(function (res) {
            if (!res.ok) throw new Error("blob fetch " + res.status);
            return res.arrayBuffer();
          }).then(function (ab) {
            var b64f = arrayBufferToBase64(ab);
            if (!b64f || b64f.length > HOST_B64_MAX) {
              return { ok: false, mode: "skip", skipped: true, reason: "blob-b64-too-large:" + (b64f && b64f.length) };
            }
            return { ok: true, mode: "bytes", b64: b64f, url: url, reason: "blob-fetched-bytes" };
          }).catch(function (err) {
            return { ok: false, mode: "skip", skipped: true, reason: "blob-bytes-fail:" + (err && err.message) };
          });
        }
        return { ok: false, mode: "skip", skipped: true, reason: "no-bytes-for-blob" };
      }
      var b64 = arrayBufferToBase64(got.buffer);
      if (!b64 || b64.length > HOST_B64_MAX) {
        return { ok: false, mode: "skip", skipped: true, reason: "b64-too-large:" + (b64 && b64.length) };
      }
      return { ok: true, mode: "bytes", b64: b64, url: url, reason: "idb-bytes:" + got.source };
    });
  }

  function clearCompanionWatch() {
    if (loftCompanionWatchTimer) {
      try { clearTimeout(loftCompanionWatchTimer); } catch (eT) {}
      loftCompanionWatchTimer = 0;
    }
  }

  /**
   * (?v=20260906ch) Option A — sibling companion layer inside #avatar-ruffle-host.
   * Beginner: DIRECT avatar stays visible; companion host loads invisibly on top until connected.
   * ENGINE DEV: mountRuffle clears its container — never pass the main host slot until promote.
   */
  function ensureCompanionLayer(slot) {
    if (!slot) return null;
    var layer = null;
    try { layer = slot.querySelector("#avatar-companion-layer"); } catch (eQ) {}
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "avatar-companion-layer";
      layer.className = "avatar-companion-layer";
      layer.setAttribute("aria-hidden", "true");
      layer.setAttribute("data-companion-layer", "1");
      try { slot.appendChild(layer); } catch (eA) { return null; }
    }
    try {
      layer.style.opacity = "0";
      layer.style.pointerEvents = "none";
      layer.classList.add("is-companion-pending");
      layer.classList.remove("is-companion-visible", "is-failed", "is-playing");
    } catch (eSt) {}
    loftCompanionLayer = layer;
    return layer;
  }

  function removeDirectPlayersOnly(slot) {
    if (!slot) return;
    var kids = [];
    try { kids = Array.prototype.slice.call(slot.children || []); } catch (eK) { kids = []; }
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (!el) continue;
      if (el.id === "avatar-companion-layer" || (el.getAttribute && el.getAttribute("data-companion-layer") === "1")) continue;
      if (el.classList && (el.classList.contains("classic-swf-stand-thumb") || el.classList.contains("classic-swf-placeholder"))) continue;
      var tag = String(el.tagName || "").toUpperCase();
      var isRuffle = tag === "RUFFLE-PLAYER" || tag === "RUFFLE-EMBED"
        || (el.getAttribute && el.getAttribute("data-classic-ruffle") === "1");
      if (!isRuffle) continue;
      try {
        activePlayers = activePlayers.filter(function (p) { return p !== el; });
      } catch (eF) {}
      try {
        if (el.remove) el.remove();
        else if (el.parentNode) el.parentNode.removeChild(el);
      } catch (eR) {}
    }
  }

  function tearDownCompanionLayer(reason) {
    // Keep DIRECT paint — only remove the sibling companion attempt.
    clearCompanionWatch();
    logAvatarDebug("tearDownCompanionLayer (keep DIRECT)", reason, {
      hadLayer: !!loftCompanionLayer,
      hadDirect: !!loftDirectPlayer,
      gen: loftMountGeneration
    });
    loftSafeUpgradeActive = false;
    loftUsesCompanionHost = false;
    loftHostState.hostMode = false;
    loftHostState.connected = false;
    loftHostState.gotControl = false;
    loftFallbackInFlight = false;
    var layer = loftCompanionLayer;
    var slot = null;
    try {
      slot = (layer && layer.parentNode)
        || document.getElementById("avatar-ruffle-host")
        || document.getElementById("classic-wear-swf-slot");
    } catch (eS) {}
    if (layer) {
      try { destroyPlayersIn(layer); } catch (eD) {}
      try {
        if (layer.remove) layer.remove();
        else if (layer.parentNode) layer.parentNode.removeChild(layer);
      } catch (eRm) {}
    }
    loftCompanionLayer = null;
    loftCompanionPlayer = null;
    if (loftDirectPlayer) {
      loftActivePlayer = loftDirectPlayer;
    }
    if (slot) {
      try {
        slot.classList.remove("is-companion-connected", "is-failed", "is-mounting");
        slot.classList.add("is-on");
        if (loftDirectPlayer || slot.querySelector("ruffle-player, ruffle-embed, [data-classic-ruffle]")) {
          slot.classList.add("is-playing");
        }
        slot.setAttribute("data-mount-mode", "direct");
      } catch (eCl) {}
      try { ensureStandFallback(slot, null, "companion-teardown:" + String(reason || "").slice(0, 60)); } catch (eSt) {}
    }
    return loftDirectPlayer || loftActivePlayer;
  }

  function promoteCompanionOverDirect(slot) {
    // Bridge "connected" (+ nest success) — NOW it is safe to drop DIRECT paint.
    slot = slot || document.getElementById("avatar-ruffle-host")
      || document.getElementById("classic-wear-swf-slot");
    loftUsesCompanionHost = true;
    loftHostState.hostMode = true;
    loftHostState.connected = true;
    loftSafeUpgradeActive = false;
    loftFallbackInFlight = false;
    if (loftCompanionPlayer) loftActivePlayer = loftCompanionPlayer;
    if (loftCompanionLayer) {
      try {
        loftCompanionLayer.style.opacity = "1";
        loftCompanionLayer.classList.add("is-companion-visible", "is-playing");
        loftCompanionLayer.classList.remove("is-companion-pending", "is-mounting", "is-failed");
        loftCompanionLayer.setAttribute("aria-hidden", "false");
      } catch (eL) {}
    }
    if (slot) {
      try { removeDirectPlayersOnly(slot); } catch (eRp) {}
      loftDirectPlayer = null;
      try {
        slot.classList.add("is-companion-connected", "is-playing", "is-on");
        slot.classList.remove("is-mounting", "is-failed");
        slot.setAttribute("data-mount-mode", "companion");
      } catch (eSc) {}
    }
    logAvatarDebug("promoteCompanionOverDirect — DIRECT removed; nest owns paint", {
      gotControl: !!loftHostState.gotControl,
      hasCompanion: !!loftCompanionPlayer
    });
  }

  function remountDirectAvatar(slot, avatarUrl, worn, loftOpts, reason) {
    return remountDirectAvatarImmediate(reason || "remountDirect", slot, avatarUrl, worn, loftOpts);
  }

  function remountDirectAvatarImmediate(reason, slotOpt, urlOpt, wornOpt, loftOptsOpt) {
    // (?v=20260906ch) If Option A sibling upgrade is active and DIRECT still paints, only tear companion.
    // Beginner: never blank the loft just because companion failed — keep the avatar you already see.
    // ENGINE DEV: remount into #avatar-ruffle-host only when DIRECT is gone (legacy / wipe recovery).
    if (loftDirectPlayer && (loftSafeUpgradeActive || loftCompanionLayer)) {
      tearDownCompanionLayer(reason || "keep-direct");
      return Promise.resolve(loftDirectPlayer);
    }
    if (loftFallbackInFlight) {
      logAvatarDebug("remountDirect skipped (in flight)", reason);
      return Promise.resolve(null);
    }
    var gen = loftMountGeneration;
    var slot = slotOpt || document.getElementById("avatar-ruffle-host")
      || document.getElementById("classic-wear-swf-slot");
    var url = urlOpt || loftPendingAvatarUrl || loftHostState.avatarUrl;
    if (!slot || !url) {
      logAvatarDebug("remountDirect missing slot/url", reason);
      return Promise.resolve(null);
    }
    loftFallbackInFlight = true;
    clearCompanionWatch();
    loftUsesCompanionHost = false;
    loftHostState.hostMode = false;
    loftHostState.connected = false;
    logAvatarDebug("REMOUNT DIRECT avatar", reason, { gen: gen, urlKind: String(url).slice(0, 12) });
    var worn = wornOpt || null;
    if (!worn) {
      try {
        if (global.WhirledChrome && global.WhirledChrome.getWornAvatar) worn = global.WhirledChrome.getWornAvatar();
      } catch (eW) {}
    }
    ensureStandFallback(slot, worn, "fallback:" + String(reason || "").slice(0, 80));
    var loftOpts = loftOptsOpt || {
      maxWidth: "140px",
      maxHeight: "180px",
      height: "160px",
      loftMount: true,
      pointerEvents: "none",
      wmode: "transparent",
      backgroundColor: null,
      allowScriptAccess: true
    };
    function finishRemount(player) {
      if (gen !== loftMountGeneration) {
        logAvatarDebug("remountDirect stale gen", gen, loftMountGeneration);
        return player;
      }
      loftUsesCompanionHost = false;
      loftHostState.hostMode = false;
      loftHostState.connected = false;
      loftHostState.gotControl = false;
      loftHostState.hostReady = false;
      loftHostState.bytesLoading = false;
      loftSafeUpgradeActive = false;
      loftCompanionLayer = null;
      loftCompanionPlayer = null;
      loftDirectPlayer = player || null;
      loftActivePlayer = player || loftActivePlayer;
      loftFallbackInFlight = false;
      try {
        slot.classList.remove("is-failed", "is-companion-connected");
        slot.classList.add("is-playing", "is-on");
        slot.setAttribute("data-mount-mode", "direct");
      } catch (eCl) {}
      logAvatarDebug("remountDirect OK", { hasPlayer: !!player });
      return player;
    }
    function failRemount(err) {
      loftFallbackInFlight = false;
      ensureStandFallback(slot, worn, (err && err.message) || "direct-remount-failed");
      logAvatarDebug("remountDirect FAILED", err && err.message);
      return null;
    }
    // Prefer DataLoadOptions ArrayBuffer (official) over blob: URL for remount too.
    return resolveSwfBytes(worn).then(function (got) {
      var o = Object.assign({}, loftOpts);
      if (got && got.buffer) {
        o.swfData = got.buffer;
        o.swfFileName = "avatar.swf";
      }
      return mountRuffle(slot, url, o).then(finishRemount);
    }).catch(failRemount);
  }

  function armCompanionWatchdog(gen, reasonTag) {
    clearCompanionWatch();
    loftCompanionWatchTimer = setTimeout(function () {
      loftCompanionWatchTimer = 0;
      if (gen !== loftMountGeneration) return;
      if (loftHostState.connected) {
        logAvatarDebug("watchdog OK — connected", reasonTag);
        return;
      }
      // (?v=20260906ch) ~4s no connect → tear companion layer, KEEP DIRECT (Option A).
      logAvatarDebug("watchdog FIRE — no connected → keep DIRECT", reasonTag, {
        lastBridge: loftHostState.lastBridge,
        companionAttempted: loftCompanionAttempted,
        safeUpgrade: loftSafeUpgradeActive,
        hadDirect: !!loftDirectPlayer
      });
      if (loftDirectPlayer && (loftSafeUpgradeActive || loftCompanionLayer)) {
        tearDownCompanionLayer("watchdog-no-connected:" + String(reasonTag || ""));
      } else {
        // Companion-ONLY or no DIRECT left → remount avatar DIRECT (chrome bob fallback)
        remountDirectAvatarImmediate("watchdog-no-connected:" + String(reasonTag || ""));
      }
    }, 5500); // (?v=20260906ch) loadBytes + controlConnect; Option A keeps DIRECT meanwhile
  }

  /**
   * JS←host bridge. Host SWF calls ExternalInterface.call("WhirledAvatarHostBridge", kind, payload).
   * Kinds: ready|loading|loaded|connected|actions|states|error|setLocation|action|appearance_error
   */
  function installWhirledAvatarHostBridge() {
    global.WhirledAvatarHostBridge = function (kind, payload) {
      kind = String(kind || "");
      var row = { at: Date.now(), kind: kind, payload: payload };
      loftHostState.lastBridge = row;
      loftHostBridgeLog.unshift(row);
      if (loftHostBridgeLog.length > 40) loftHostBridgeLog.length = 40;
      rememberEi("swf→js", "bridge:" + kind, [payload]);
      logAvatarDebug("hostBridge", kind, payload);

      if (kind === "ready") {
        // (?v=20260906ch) addCallbacks are live — ONLY now is hostLoadBytes safe.
        loftHostState.hostReady = true;
        if (loftCompanionPlayer) loftActivePlayer = loftCompanionPlayer;
        logAvatarDebug("host ready — flush pending hostLoadBytes");
        tryFlushPendingAvatarLoad();
      }
      if (kind === "loading") {
        loftHostState.bytesLoading = true;
        logAvatarDebug("host loading nested avatar", payload);
      }
      if (kind === "loaded") {
        loftHostState.bytesLoading = true;
        tryFlushPendingAvatarLoad();
        logAvatarDebug("host loaded avatar bytes (await controlConnect)");
      }
      if (kind === "gotControl") {
        loftHostState.gotControl = (payload === true || payload === "true" || payload === 1);
        logAvatarDebug("gotControl", loftHostState.gotControl, payload);
      }
      if (kind === "connected") {
        // (?v=20260906ch) ONLY flip companion flags here — never at host mount (blank loft).
        // Beginner: walk frames work now because host can call appearanceChanged_v2.
        // ENGINE DEV: companion-ONLY drops stand cover; Option A promotes sibling if present.
        loftHostState.connected = true;
        loftHostState.hostReady = true;
        loftHostState.hostMode = true;
        loftUsesCompanionHost = true;
        clearCompanionWatch();
        loftFallbackInFlight = false;
        if (loftCompanionPlayer) loftActivePlayer = loftCompanionPlayer;
        try {
          var slotC = document.getElementById("avatar-ruffle-host")
            || document.getElementById("classic-wear-swf-slot");
          if (loftCompanionLayer || loftSafeUpgradeActive) {
            promoteCompanionOverDirect(slotC);
          } else if (slotC) {
            // Companion-ONLY: reveal nest, drop stand cover
            slotC.classList.add("is-companion-connected", "is-playing", "is-on");
            slotC.classList.remove("is-mounting", "is-failed");
            slotC.setAttribute("data-mount-mode", "companion");
          }
        } catch (eCc) {}
        logAvatarDebug("companion connected — nest owns walk; re-sync appearance", {
          moving: loftHostState.moving,
          orient: loftHostState.orient,
          gotControl: !!loftHostState.gotControl
        });
        setTimeout(function () {
          try {
            callHostWalk(!!loftHostState.moving, loftHostState.orient);
          } catch (eSync) {}
        }, 0);
      }
      if (kind === "actions") {
        try {
          loftHostState.actions = Array.isArray(payload) ? payload.slice() : (payload ? [].concat(payload) : []);
        } catch (eA) { loftHostState.actions = []; }
      }
      if (kind === "states") {
        try {
          loftHostState.states = Array.isArray(payload) ? payload.slice() : (payload ? [].concat(payload) : []);
        } catch (eS) { loftHostState.states = []; }
      }
      if (kind === "setLocation") {
        // AvatarControl setLogicalLocation → host setLocation_v1 → chrome walk / hostWalk(true)
        try { handleBridgeSetLocation(payload); } catch (eSetLoc) {
          logAvatarDebug("setLocation handler failed", eSetLoc && eSetLoc.message);
        }
      }
      if (kind === "error" || kind === "ei_error" || kind === "appearance_error") {
        logAvatarDebug("companion host error → keep DIRECT / remount if needed", kind, payload);
        remountDirectAvatarImmediate("bridge:" + kind + ":" + String(payload || "").slice(0, 60));
      }
      return true;
    };
  }

  function tryCallHostMethod(name, args) {
    args = args || [];
    // (?v=20260906ch) Always prefer companion host player for hostLoadBytes/hostWalk/…
    var player = resolveHostEiPlayer();
    if (!player) return { ok: false, reason: "no-player" };
    try {
      if (typeof player[name] === "function") {
        var r = player[name].apply(player, args);
        rememberEi("js→swf", name, args.length === 1 && typeof args[0] === "string" && args[0].length > 80
          ? [String(args[0]).slice(0, 40) + "…(" + args[0].length + ")"]
          : args);
        return { ok: true, via: "player." + name, result: r };
      }
    } catch (e1) { logAvatarDebug("host." + name + " threw", e1 && e1.message); }
    return tryCallIntoSwf([name], args, player);
  }

  function callHostLoadBytes(b64) {
    if (!b64) return { ok: false, reason: "empty-b64" };
    loftPendingAvatarB64 = b64;
    // (?v=20260906ch) Gate on bridge ready — addCallback race if called from mountRuffle.then alone.
    if (!loftHostState.hostReady) {
      logAvatarDebug("hostLoadBytes queued (awaiting ready)", { len: b64.length });
      return { ok: false, reason: "awaiting-ready", queued: true };
    }
    if (loftCompanionPlayer) loftActivePlayer = loftCompanionPlayer;
    // Single shot if small; else chunk (EI string limits)
    if (b64.length <= HOST_B64_CHUNK) {
      var r = tryCallHostMethod("hostLoadBytes", [b64]);
      // Host returns Bool; false = decode/load failed; undefined miss already → ok:false
      if (r.ok && r.result === false) {
        logAvatarDebug("hostLoadBytes host rejected", { len: b64.length, via: r.via });
        return { ok: false, reason: "host-rejected", via: r.via, result: false };
      }
      logAvatarDebug("hostLoadBytes", { ok: r.ok, len: b64.length, via: r.via, result: r.result });
      return r;
    }
    logAvatarDebug("hostLoadBytes chunked", { len: b64.length, chunk: HOST_B64_CHUNK });
    var begin = tryCallHostMethod("hostLoadBytesBegin", []);
    if (!begin.ok) {
      // Fallback: try single call anyway
      return tryCallHostMethod("hostLoadBytes", [b64]);
    }
    for (var i = 0; i < b64.length; i += HOST_B64_CHUNK) {
      var piece = b64.slice(i, i + HOST_B64_CHUNK);
      var cr = tryCallHostMethod("hostLoadBytesChunk", [piece]);
      if (!cr.ok) {
        logAvatarDebug("hostLoadBytesChunk fail", i);
        return cr;
      }
    }
    var commit = tryCallHostMethod("hostLoadBytesCommit", []);
    logAvatarDebug("hostLoadBytesCommit", commit);
    return commit;
  }

  function tryFlushPendingAvatarLoad() {
    // Prefer base64 → hostLoadBytes; http(s) → hostLoadUrl. Never blob:/data: into hostLoadUrl.
    if (loftPendingAvatarB64 && loftActivePlayer) {
      return callHostLoadBytes(loftPendingAvatarB64);
    }
    var url = loftHostState._hostLoadUrl || null;
    if (url && loftActivePlayer) {
      if (String(url).indexOf("blob:") === 0 || String(url).indexOf("data:") === 0) {
        logAvatarDebug("tryFlush skipped blob/data URL (need hostLoadBytes)", String(url).slice(0, 24));
        return { ok: false, reason: "blob-data-not-for-hostLoadUrl" };
      }
      return callHostLoadUrl(url);
    }
    return { ok: false, reason: "no-pending" };
  }

  function callHostLoadUrl(url) {
    if (!url) return { ok: false, reason: "empty-url" };
    if (String(url).indexOf("blob:") === 0 || String(url).indexOf("data:") === 0) {
      logAvatarDebug("callHostLoadUrl REJECTED blob/data — use hostLoadBytes", String(url).slice(0, 24));
      return { ok: false, reason: "blob-data-rejected" };
    }
    loftHostState._hostLoadUrl = url;
    loftHostState.avatarUrl = loftPendingAvatarUrl || url;
    if (!loftHostState.hostReady) {
      logAvatarDebug("hostLoadUrl queued (awaiting ready)", String(url).slice(0, 48));
      return { ok: false, reason: "awaiting-ready", queued: true };
    }
    if (loftCompanionPlayer) loftActivePlayer = loftCompanionPlayer;
    var r = tryCallHostMethod("hostLoadUrl", [url]);
    logAvatarDebug("hostLoadUrl", r);
    if (!r.ok) {
      setTimeout(function () {
        var r2 = tryCallHostMethod("hostLoadUrl", [url]);
        logAvatarDebug("hostLoadUrl-retry", r2);
        if (!r2.ok) {
          setTimeout(function () {
            tryCallHostMethod("hostLoadUrl", [url]);
          }, 250);
        }
      }, 80);
    }
    return r;
  }

  function syncHostLocationFromBillboard() {
    try {
      var layer = document.getElementById("avatar-wear-layer");
      var bill = layer && layer.querySelector(".avatar-wear-billboard");
      var xPct = bill && parseFloat(String(bill.style.getPropertyValue("--wear-x") || "").replace("%", ""));
      if (typeof xPct === "number" && isFinite(xPct)) {
        // Map chrome % to Whirled logical X (0..1). Y/Z stay floor-ish defaults.
        loftHostState.location = [Math.max(0, Math.min(1, xPct / 100)), 0, 0.5];
      }
    } catch (eLoc) {}
    return loftHostState.location;
  }

  function callHostWalk(moving, orient, locXOpt) {
    // (?v=20260906cd) Optional locX (0..1) — club lerps _loc while isMoving; chrome billboard supplies X.
    loftHostState.moving = !!moving;
    if (typeof orient === "number" && isFinite(orient)) loftHostState.orient = orient;
    var o = loftHostState.orient;
    var locX;
    if (typeof locXOpt === "number" && isFinite(locXOpt)) {
      locX = Math.max(0, Math.min(1, locXOpt));
      try {
        loftHostState.location = [locX, loftHostState.location[1], loftHostState.location[2]];
      } catch (eLx) { loftHostState.location = [locX, 0, 0.5]; }
    } else {
      var loc = syncHostLocationFromBillboard();
      locX = (loc && typeof loc[0] === "number") ? loc[0] : 0.5;
    }
    logAvatarDebug("hostWalk", { moving: !!moving, orient: o, locX: locX, connected: loftHostState.connected });
    var r = tryCallHostMethod("hostWalk", [!!moving, o, locX]);
    if (!r.ok) {
      // Legacy EI-only path
      return notifyLoftAppearance(!!moving, o);
    }
    return r;
  }

  function stopWalkLocTick() {
    if (loftWalkLocTick) {
      try { clearInterval(loftWalkLocTick); } catch (eT) {}
      loftWalkLocTick = 0;
    }
  }

  function startWalkLocTick() {
    // ENGINE DEV (?v=20260906cd): while loftHostState.moving, re-push hostWalk(true,orient,locX) ~100ms.
    // Beginner: keeps Flash walk frames playing for the whole floor trek, like whirled.club.
    stopWalkLocTick();
    loftWalkLocTick = setInterval(function () {
      if (!loftHostState.moving) {
        stopWalkLocTick();
        return;
      }
      try {
        syncHostLocationFromBillboard();
        callHostWalk(true, loftHostState.orient);
      } catch (eTick) {}
    }, WALK_LOC_TICK_MS);
  }

  function setHostSleepBadge(on) {
    try {
      var plate = document.querySelector("#avatar-wear-layer .avatar-wear-nameplate");
      if (!plate) return;
      var z = plate.querySelector(".host-sleep-zzz");
      if (on) {
        if (!z) {
          z = document.createElement("span");
          z.className = "host-sleep-zzz idle-zzz";
          z.setAttribute("aria-hidden", "true");
          z.textContent = " Zzz";
          plate.appendChild(z);
        }
      } else if (z) {
        try { z.parentNode.removeChild(z); } catch (eR) {}
      }
    } catch (eB) {}
  }

  function callHostSleep(sleeping) {
    // (?v=20260906cd) hostSleep → appearanceChanged_v2 sleeping bit (AvatarHost stub ready).
    loftHostState.sleeping = !!sleeping;
    logAvatarDebug("hostSleep", { sleeping: !!sleeping, connected: loftHostState.connected });
    var r = tryCallHostMethod("hostSleep", [!!sleeping]);
    if (!r.ok) {
      // Still update appearance sleeping via legacy probe if possible
      try { notifyLoftAppearance(!!loftHostState.moving, loftHostState.orient); } catch (eA) {}
    }
    setHostSleepBadge(!!sleeping);
    return r;
  }

  function callHostSpoke() {
    // (?v=20260906cd) loft chat → hostSpoke → userProps.avatarSpoke_v1 (talk anims).
    // Beginner: when you send chat, the avatar can mouth / play its speak clip if the SWF supports it.
    noteLoftActivity();
    logAvatarDebug("hostSpoke", { connected: loftHostState.connected });
    var r = tryCallHostMethod("hostSpoke", []);
    if (!r.ok) {
      // Some builds expose the callback without args bag
      try { r = tryCallHostMethod("hostSpoke", []); } catch (eS) {}
    }
    return r;
  }

  function armLoftIdleSleep() {
    if (loftIdleCheckTimer) {
      try { clearTimeout(loftIdleCheckTimer); } catch (eC) {}
      loftIdleCheckTimer = 0;
    }
    var wait = Math.max(1500, HOST_SLEEP_IDLE_MS - (Date.now() - loftLastActivityAt) + 80);
    loftIdleCheckTimer = setTimeout(function () {
      loftIdleCheckTimer = 0;
      var idleFor = Date.now() - loftLastActivityAt;
      if (idleFor >= HOST_SLEEP_IDLE_MS) {
        if (loftHostState.moving) {
          // Still walking — check again after arrive
          armLoftIdleSleep();
          return;
        }
        if (!loftHostState.sleeping) callHostSleep(true);
      } else {
        armLoftIdleSleep();
      }
    }, wait);
  }

  function noteLoftActivity() {
    // Beginner (?v=20260906cd): any floor click / chat / walk wakes the avatar (clears Zzz).
    loftLastActivityAt = Date.now();
    if (loftHostState.sleeping) {
      try { callHostSleep(false); } catch (eW) {}
    }
    armLoftIdleSleep();
  }

  function handleBridgeSetLocation(payload) {
    // (?v=20260906cd) Avatar setLocation_v1 → real chrome move (club requestMove parity), not store-only.
    // ENGINE DEV: bridge payload {x,y,z,orient} logical 0..1; chromeWalkTo uses % of stage.
    var x = 0.5, y = 0, z = 0.5, o = loftHostState.orient;
    try {
      if (payload && typeof payload === "object") {
        if (typeof payload.x === "number" && isFinite(payload.x)) x = payload.x;
        if (typeof payload.y === "number" && isFinite(payload.y)) y = payload.y;
        if (typeof payload.z === "number" && isFinite(payload.z)) z = payload.z;
        if (typeof payload.orient === "number" && isFinite(payload.orient)) o = payload.orient;
      }
    } catch (eP) {}
    loftHostState.location = [x, y, z];
    loftHostState.orient = o;
    noteLoftActivity();
    var xPct = Math.max(8, Math.min(92, x * 100));
    var started = false;
    try {
      if (global.WhirledChrome && typeof global.WhirledChrome.chromeWalkTo === "function") {
        global.WhirledChrome.chromeWalkTo(xPct, 78);
        started = true;
      }
    } catch (eChrome) {}
    if (!started) {
      // No chrome walker — still keep Body in walking with locX until something arrives.
      callHostWalk(true, o, x);
      startWalkLocTick();
    }
    logAvatarDebug("bridge setLocation → move", { x: x, orient: o, chrome: started });
    return started;
  }

  function callHostEmote(name) {
    name = String(name || "Wave");
    var r = tryCallHostMethod("hostEmote", [name]);
    if (!r.ok) {
      return notifyLoftEmoteLegacy(name);
    }
    return r;
  }

  function buildAvatarHostShim(player) {
    // Minimal stubs a SWF might ExternalInterface.call. Never eval. Log everything.
    var shim = {
      version: VERSION,
      isConnected: function () {
        rememberEi("swf→js", "isConnected", []);
        return true;
      },
      hasControl: function () {
        rememberEi("swf→js", "hasControl", []);
        return true;
      },
      getEnvironment: function () {
        rememberEi("swf→js", "getEnvironment", []);
        return "room";
      },
      controlConnect: function (userProps) {
        // Some patched avatars poke JS with this name; real SDK uses sharedEvents.
        rememberEi("swf→js", "controlConnect", [userProps]);
        loftHostState.connected = true;
        try {
          // Nudge appearance after handshake so walk loops may leave idle.
          setTimeout(function () {
            notifyLoftAppearance(false, loftHostState.orient);
          }, 50);
        } catch (eC) {}
        return { ok: true, host: "WhirledAvatarHost", version: VERSION };
      },
      setHotSpot: function (x, y, h) {
        rememberEi("swf→js", "setHotSpot", [x, y, h]);
        return true;
      },
      registerActions: function () {
        rememberEi("swf→js", "registerActions", [].slice.call(arguments));
        return true;
      },
      registerStates: function () {
        rememberEi("swf→js", "registerStates", [].slice.call(arguments));
        return true;
      },
      setLogicalLocation: function (x, y, z, orient) {
        rememberEi("swf→js", "setLogicalLocation", [x, y, z, orient]);
        return true;
      },
      setPixelLocation: function (x, y, z, orient) {
        rememberEi("swf→js", "setPixelLocation", [x, y, z, orient]);
        return true;
      },
      setState: function (state) {
        rememberEi("swf→js", "setState", [state]);
        loftHostState.state = String(state || loftHostState.state);
        return true;
      },
      getState: function () {
        rememberEi("swf→js", "getState", []);
        return loftHostState.state;
      },
      getOrientation: function () {
        rememberEi("swf→js", "getOrientation", []);
        return loftHostState.orient;
      },
      isMoving: function () {
        rememberEi("swf→js", "isMoving", []);
        return !!loftHostState.moving;
      },
      isSleeping: function () {
        rememberEi("swf→js", "isSleeping", []);
        return !!loftHostState.sleeping;
      },
      triggerAction: function (name, arg) {
        rememberEi("swf→js", "triggerAction", [name, arg]);
        return true;
      },
      // Catch-all used when we install a Proxy-like dispatcher on window
      _dispatch: function (name, args) {
        rememberEi("swf→js", name, args);
        if (name === "controlConnect") return shim.controlConnect(args && args[0]);
        return null;
      }
    };
    shim._player = player;
    return shim;
  }

  function installGlobalEiStubs(shim) {
    // Expose common names SWFs may ExternalInterface.call. Shim-only; no arbitrary eval.
    var names = [
      "WhirledAvatarHost", "whirledAvatarHost", "AvatarHost",
      "controlConnect", "whirledControlConnect",
      "isConnected", "hasControl", "getEnvironment",
      "setHotSpot", "registerActions", "registerStates",
      "setLogicalLocation", "setPixelLocation",
      "setState", "getState", "getOrientation", "isMoving", "isSleeping",
      "triggerAction", "appearanceChanged", "appearanceChanged_v1", "appearanceChanged_v2"
    ];
    global.WhirledAvatarHost = shim;
    names.forEach(function (n) {
      if (n === "WhirledAvatarHost" || n === "whirledAvatarHost" || n === "AvatarHost") {
        try { global[n] = shim; } catch (eA) {}
        return;
      }
      if (typeof shim[n] === "function") {
        try {
          global[n] = function () {
            return shim[n].apply(shim, arguments);
          };
        } catch (eB) {}
      } else {
        // appearanceChanged_* may be called TO the SWF, not from it — stub return for safety
        try {
          global[n] = function () {
            rememberEi("swf→js", n, [].slice.call(arguments));
            return null;
          };
        } catch (eC) {}
      }
    });
  }

  function attachLoftAvatarHost(player, container) {
    // (?v=20260906ch): attach after companion host OR direct-avatar mount.
    // Prefer keeping companion as EI target when both exist (should not in companion-ONLY).
    if (loftCompanionPlayer && player === loftDirectPlayer && player !== loftCompanionPlayer) {
      logAvatarDebug("attachLoftAvatarHost: keep EI on companion (DIRECT re-attach)");
    } else {
      loftActivePlayer = player;
    }
    loftHostState.connected = false;
    // Do NOT clear hostReady here if this attach is the host player — ready may already have fired.
    installWhirledAvatarHostBridge();
    try { noteLoftActivity(); } catch (eAct) {}
    var shim = buildAvatarHostShim(player);
    installGlobalEiStubs(shim);
    try { player._whirledHost = shim; } catch (eP) {}
    try { if (container) container._whirledHost = shim; } catch (eC) {}
    logAvatarDebug("loft host attached", {
      allowScriptAccess: true,
      companion: loftUsesCompanionHost,
      debug: avatarDebugEnabled()
    });
    setTimeout(function () {
      // Prefer companion EI API
      var ready = tryCallHostMethod("hostReady", []);
      var isConn = tryCallHostMethod("hostIsConnected", []);
      logAvatarDebug("post-mount host probe", { ready: ready, isConn: isConn });
      tryFlushPendingAvatarLoad();
      if (loftUsesCompanionHost || loftHostState.hostMode) {
        callHostWalk(false, loftHostState.orient);
        return;
      }
      // Direct-avatar fallback (bt): probe EI-only SWFs
      var probe = tryCallIntoSwf([
        "controlConnect", "whirledControlConnect", "connect",
        "hostWalk", "hostLoadUrl",
        "appearanceChanged_v2", "appearanceChanged_v1", "appearanceChanged",
        "setBodyState", "setState", "bodyState"
      ], [false, loftHostState.orient, loftHostState.location]);
      logAvatarDebug("post-mount probe", probe);
      notifyLoftAppearance(false, loftHostState.orient);
    }, 120);
    return shim;
  }

  function notifyLoftAppearance(moving, orient) {
    // Host→avatar direction (study): appearanceChanged_v1/v2 — edge-triggered.
    loftHostState.moving = !!moving;
    if (typeof orient === "number" && isFinite(orient)) loftHostState.orient = orient;
    var loc = loftHostState.location;
    var argsV2 = [loc, loftHostState.orient, loftHostState.moving, loftHostState.sleeping];
    var argsV1 = [loc, loftHostState.orient, loftHostState.moving];
    var r = tryCallIntoSwf([
      "appearanceChanged_v2", "appearanceChanged_v1", "appearanceChanged",
      "setMoving", "setBodyState", "setState", "bodyState", "setWalk", "walk"
    ], moving ? argsV2 : argsV1);
    // Also try body-state strings many custom avatars use
    if (moving) {
      tryCallIntoSwf(["setBodyState", "setState", "bodyState", "gotoAndPlay", "playWalk"], ["walk"]);
      tryCallIntoSwf(["setBodyState", "setState", "bodyState"], ["Walk"]);
      tryCallIntoSwf(["setBodyState", "setState", "bodyState"], ["Moving"]);
    } else {
      tryCallIntoSwf(["setBodyState", "setState", "bodyState", "playIdle"], ["idle"]);
      tryCallIntoSwf(["setBodyState", "setState", "bodyState"], ["Default"]);
      tryCallIntoSwf(["setBodyState", "setState", "bodyState"], ["Standing"]);
    }
    return r;
  }

  function notifyLoftWalk(moving, orientHint) {
    // (?v=20260906cd): chrome bob ALWAYS; companion hostWalk drives in-SWF walk scenes.
    // Beginner: floor click → walking frames for the WHOLE trek; arrive → idle (hostWalk false).
    // ENGINE DEV: hostWalk → appearanceChanged_v2(loc, orient, moving, sleeping) → Body
    // state_<state>_walking. While moving, ~100ms locX ticks match club WalkAnimation _loc lerp.
    // Orient: face±1 → 90/270.
    noteLoftActivity();
    var faceForCss = (orientHint === -1 || orientHint === 1) ? orientHint : undefined;
    setLoftWalkMotion(!!moving, faceForCss);
    var orient = loftHostState.orient;
    if (typeof orientHint === "number" && isFinite(orientHint) && orientHint !== -1 && orientHint !== 1) {
      orient = orientHint;
    } else if (moving) {
      // Whirled orient: 0 faces front, clockwise. Map chrome face ±1 → approx left/right.
      orient = (orientHint === -1) ? 90 : (orientHint === 1 ? 270 : orient);
    }
    loftHostState.orient = orient;
    var result;
    if (loftUsesCompanionHost || loftHostState.hostMode) {
      result = callHostWalk(!!moving, orient);
    } else {
      // Fallback: try hostWalk anyway (callbacks may exist), then legacy EI appearance probes.
      var hr = tryCallHostMethod("hostWalk", [!!moving, orient]);
      if (hr.ok) {
        loftUsesCompanionHost = true;
        loftHostState.hostMode = true;
        result = hr;
      } else {
        result = notifyLoftAppearance(!!moving, orient);
      }
    }
    if (moving) startWalkLocTick();
    else stopWalkLocTick();
    return result;
  }

  function notifyLoftEmoteLegacy(actionName) {
    // Legacy EI-only / chrome-bob path (bt) when companion host is unavailable.
    actionName = String(actionName || "wave");
    var variants = [
      actionName,
      actionName.charAt(0).toUpperCase() + actionName.slice(1),
      actionName.toLowerCase(),
      actionName.toUpperCase()
    ];
    var r = tryCallIntoSwf([
      "triggerAction", "doAction", "action", "playAction",
      "setBodyState", "setState", "bodyState", "playEmote", "emote"
    ], [variants[0]]);
    if (!r.ok) {
      for (var i = 0; i < variants.length; i++) {
        r = tryCallIntoSwf(["triggerAction", "setBodyState", "setState", "bodyState"], [variants[i]]);
        if (r.ok) break;
      }
    }
    try {
      setLoftWalkMotion(true);
      setTimeout(function () { setLoftWalkMotion(false); }, 520);
    } catch (eB) {}
    return r;
  }

  function notifyLoftEmote(actionName) {
    // (?v=20260906cd): prefer companion hostEmote → messageReceived_v1(ACTION_TRIGGERED).
    actionName = String(actionName || "wave");
    var pretty = actionName.charAt(0).toUpperCase() + actionName.slice(1);
    try {
      setLoftWalkMotion(true);
      setTimeout(function () { setLoftWalkMotion(false); }, 520);
    } catch (eB) {}
    if (loftUsesCompanionHost || loftHostState.hostMode) {
      var r1 = callHostEmote(pretty);
      if (r1 && r1.ok) return r1;
      var r2 = callHostEmote(actionName);
      if (r2 && r2.ok) return r2;
    }
    var hr = tryCallHostMethod("hostEmote", [pretty]);
    if (hr.ok) return hr;
    return notifyLoftEmoteLegacy(actionName);
  }

  function getLoftHostDebug() {
    var hostDbg = tryCallHostMethod("hostGetDebug", []);
    return {
      version: VERSION,
      hasPlayer: !!loftActivePlayer,
      hasDirectPlayer: !!loftDirectPlayer,
      hasCompanionPlayer: !!loftCompanionPlayer,
      safeUpgradeActive: !!loftSafeUpgradeActive,
      companionHost: loftUsesCompanionHost || loftHostState.hostMode,
      companionAttempted: loftCompanionAttempted,
      companionConnected: !!loftHostState.connected,
      gotControl: !!loftHostState.gotControl,
      wearCompanionOnly: !!WEAR_COMPANION_ONLY,
      wearSafeCompanionUpgrade: !!WEAR_SAFE_COMPANION_UPGRADE,
      hostReady: !!loftHostState.hostReady,
      bytesLoading: !!loftHostState.bytesLoading,
      hostSwf: getCompanionHostSwfUrl(),
      avatarUrl: !!(loftPendingAvatarUrl || loftHostState.avatarUrl),
      hostLoadUrlKind: loftHostState._hostLoadUrl ? String(loftHostState._hostLoadUrl).slice(0, 48) : null,
      hostLoadBytesLen: loftPendingAvatarB64 ? loftPendingAvatarB64.length : 0,
      state: {
        connected: loftHostState.connected,
        gotControl: !!loftHostState.gotControl,
        moving: loftHostState.moving,
        orient: loftHostState.orient,
        state: loftHostState.state,
        sleeping: loftHostState.sleeping,
        hostMode: loftHostState.hostMode,
        actions: (loftHostState.actions || []).slice(0, 12),
        states: (loftHostState.states || []).slice(0, 12)
      },
      lastBridge: loftHostState.lastBridge,
      bridgeLog: loftHostBridgeLog.slice(0, 12),
      hostGetDebug: hostDbg,
      lastEiCalls: loftHostState.lastEiCalls.slice(0, 12),
      lastJsToSwf: loftHostState.lastJsToSwf.slice(0, 12),
      nextSteps: describeAvatarControlNextSteps()
    };
  }

  function describeAvatarControlNextSteps() {
    return {
      whyIdle: "Stock Whirled SWFs dispatch ConnectEvent type controlConnect on loaderInfo.sharedEvents (NOT ExternalInterface).",
      protocol: "Nested host: Ruffle loads avatar-host.swf (http) → hostLoadBytes(base64) → Loader.loadBytes → sharedEvents controlConnect → hostProps → gotControl_v1 → appearanceChanged_v2. http(s) avatars may use hostLoadUrl.",
      liveClub: "whirled.club world-client: ActorSprite floor move → appearanceChanged_v2(loc,orient,moving,sleeping) → Body state_*_walking / towalking / fromwalking. Embed allowScriptAccess sameDomain; nested avatar inside host SWF (same nest as ours).",
      whatWorksNow: "ch: COMPANION-ONLY host nest + stand cover until connected; hostLoadBytes gated on ready; EI silent-miss fixed; hostWalk→appearanceChanged_v2; fail→DIRECT; spoke/sleep.",
      hybrid: "Attach PNG idle+walk → loft uses chrome walk (Whirled2 Smooth) — best mobile feel.",
      hostShim: "assets/avatar-host/avatar-host.swf compiled from tools/avatar-host/AvatarHost.hx (Haxe --swf). No AGPL copy.",
      debug: "Add ?avatarDebug=1 then WhirledClassicAvatar.getLoftHostDebug()",
      docs: ["HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md", "tools/avatar-host/README.md", "greyhavens/whirled-api AbstractControl.as (study only)"]
    };
  }

  // ---------------------------------------------------------------------------
  // UI fragments — pale-blue classic chrome
  // ---------------------------------------------------------------------------
  function experimentalBadgeHtml() {
    // (?v=20260906cd): live Ruffle status instead of vague Experimental.
    return ruffleStatusBadgeHtml({ state: ruffleUiStatus.state === "idle" ? "ready" : ruffleUiStatus.state });
  }

  function analyzeReportHtml(report) {
    if (!report) return "";
    var lines = "";
    lines += '<li><b>File</b> — ' + esc(report.fileName) + ' · ' + esc(String(report.bytes)) + ' bytes</li>';
    lines += '<li><b>Detected</b> — ' + esc(report.kind) + (report.mime ? (" · " + esc(report.mime)) : "") + '</li>';
    if (report.swf && report.swf.ok) {
      lines += '<li><b>SWF</b> — Flash v' + esc(String(report.swf.version))
        + ' · ' + esc(report.swf.compression)
        + ' · declared length ' + esc(String(report.swf.declaredLength)) + '</li>';
    }
    if (report.flaNote) lines += '<li><b>FLA</b> — ' + esc(report.flaNote) + '</li>';
    if (report.honestLimits && report.honestLimits.length) {
      lines += '<li><b>Limits</b> — ' + esc(report.honestLimits.join(" ")) + '</li>';
    }
    var paths = (report.paths || []).map(function (p) {
      return '<li><b>' + esc(p.label) + '</b> — ' + esc(p.detail) + '</li>';
    }).join("");
    return '<div class="classic-analyze-report panel">'
      + '<h3>Analyze results ' + experimentalBadgeHtml() + '</h3>'
      + '<ul class="help-tips">' + lines + '</ul>'
      + (paths ? ('<div class="section-label">What you can do</div><ul class="help-tips">' + paths + '</ul>') : "")
      + '</div>';
  }

  function classicUploadPanelHtml() {
    // How this works (?v=20260906bg): dual-mode one-flow — Drop SWF (+ optional PNG) → Analyze →
    // pick Whirled2 Smooth OR Classic Flash (Ruffle) → Save → Wear & enter loft.
    // Beginner: no Adobe Flash Player. Smooth = PNG walk. Classic = real .swf via Ruffle.
    // ENGINE DEV: playbackMode persisted on Stuff row; loft mount reads getPlaybackMode.
    return '<div class="panel classic-avatar-panel" id="classic-avatar-panel">'
      + '<div class="room-side-head"><h2>Classic Flash / Whirled avatars</h2>'
      + experimentalBadgeHtml() + '</div>'
      + '<p class="meta"><b>One-flow setup:</b> drop your own old Whirled <code>.swf</code> (plus optional PNG idle+walk zip/files) → '
      + '<b>Analyze</b> → pick a <b>Wear mode</b> → <b>Save to Stuff</b> → <b>Wear &amp; enter loft</b>. '
      + 'No Flash Player install. Dual modes: <b>Whirled2 Smooth</b> (PNG hybrid, recommended when frames exist) or '
      + '<b>Classic Flash (Ruffle)</b> (real .swf appearance). Docs: <code>HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md</code>.</p>'
      + '<form id="classic-avatar-upload-form" class="stuff-upload-form classic-avatar-form">'
      +   '<label>Name <input name="name" maxlength="80" required placeholder="My classic avatar" /></label>'
      +   '<label>Description <textarea name="description" rows="2" maxlength="400" placeholder="Optional notes"></textarea></label>'
      +   '<label>Avatar media (.swf / .fla / zip with swf+thumb+pngs) '
      +     '<input type="file" name="media" accept=".swf,.fla,.zip,application/x-shockwave-flash,application/zip,application/vnd.adobe.flash.movie" required /></label>'
      +   '<label>Thumbnail (optional, ~80×60 PNG/JPG/GIF) '
      +     '<input type="file" name="thumb" accept="image/png,image/jpeg,image/gif,image/webp" /></label>'
      +   '<label>PNG idle (required for Whirled2 Smooth) '
      +     '<input type="file" name="idle" accept="image/png,image/webp,image/jpeg,image/gif" /></label>'
      +   '<label>PNG walk frames (required for Smooth, multi-select) '
      +     '<input type="file" name="walk" accept="image/png,image/webp,image/jpeg,image/gif" multiple /></label>'
      +   '<div class="section-label">Wear mode (pick one)</div>'
      +   '<div class="classic-mode-cards" role="radiogroup" aria-label="Wear playback mode">'
      +     '<label class="classic-mode-card is-recommended">'
      +       '<input type="radio" name="playbackMode" value="png-hybrid" data-auto-hybrid="1" />'
      +       '<span class="classic-mode-card-title">Whirled2 Smooth</span>'
      +       '<span class="classic-mode-card-badge">Recommended when walk PNGs exist</span>'
      +       '<span class="classic-mode-card-detail">PNG/WebP idle+walk like Whirl — click floor to walk, emotes when frames exist. '
      +         '<b>No Ruffle</b> in loft. Badge: Walking: PNG hybrid (no Ruffle).</span>'
      +     '</label>'
      +     '<label class="classic-mode-card">'
      +       '<input type="radio" name="playbackMode" value="ruffle" checked data-auto-ruffle="1" />'
      +       '<span class="classic-mode-card-title">Classic Flash (Ruffle)</span>'
      +       '<span class="classic-mode-card-badge">Default for SWF-only</span>'
      +       '<span class="classic-mode-card-detail">Plays real <code>.swf</code> via Ruffle (transparent, pointer-events none). '
      +         'Billboard moves + bob/flip; EI host shim tries walk/idle. Badge: Appearance: Ruffle (SWF).</span>'
      +     '</label>'
      +   '</div>'
      +   '<label class="check-row"><input type="checkbox" name="classicOptIn" checked data-auto-classic="1" /> '
      +     'Classic Flash media on file — keep .swf for Ruffle preview / Classic mode</label>'
      +   '<p class="meta" id="classic-mode-hint">Tip: attach PNG idle+walk to enable Smooth. SWF-only → Classic Flash still Wearable immediately.</p>'
      +   '<label class="check-row"><input type="checkbox" name="rights" required /> '
      +     'I confirm this is my own creation or I have the rights to store it (no shop scrapes).</label>'
      +   '<div class="stuff-detail-actions">'
      +     '<button type="button" class="action-btn" id="classic-avatar-analyze-btn">Analyze file…</button>'
      +     '<button type="submit">Save classic avatar to Stuff</button>'
      +   '</div>'
      +   '<p class="meta" id="classic-avatar-upload-msg"></p>'
      +   '<div id="classic-avatar-analyze-out"></div>'
      +   '<div id="classic-avatar-post-save" class="classic-post-save" hidden></div>'
      +   '<div id="classic-avatar-ruffle-preview" class="classic-ruffle-preview" hidden>'
      +     '<div class="section-label">Ruffle preview ' + experimentalBadgeHtml() + '</div>'
      +     '<div class="classic-ruffle-host" id="classic-ruffle-host"></div>'
      +     '<p class="meta">Transparent stage (no black box). SWF walk anim needs AvatarControl — Coming Soon. Attach PNG idle+walk for Whirled2 Smooth.</p>'
      +   '</div>'
      + '</form>'
      + '<p class="meta fla-test-soon"><b>FLA lab reference:</b> <code>assets/avatars/fla-lab/</code> holds a source .fla + sketch bitmaps (Coming Soon as Wearable). '
      + 'Drop a real published <code>.swf</code> above and this UI lights up immediately.</p>'
      + '</div>';
  }


  function classicDetailExtrasHtml(item) {
    if (!item || !itemHasClassicSwf(item)) {
      if (item && item.flaNote) {
        return '<div class="panel classic-detail-extras">'
          + '<h3>Classic source on file</h3>'
          + '<p class="meta">' + esc(item.flaNote) + ' ' + experimentalBadgeHtml() + '</p>'
          + '<p class="meta">Publish a .swf or attach PNG idle/walk, then Wear.</p></div>';
      }
      return "";
    }
    var opt = itemWantsClassicFlash(item);
    var hybrid = itemIsHybrid(item);
    var hasPng = itemHasPngWalk(item);
    var mode = getPlaybackMode(item) || defaultPlaybackMode(item) || "ruffle";
    var modeLabel = mode === "png-hybrid" ? "Whirled2 Smooth (PNG hybrid)" : "Classic Flash (Ruffle)";
    var smoothDisabled = !hasPng;
    return '<div class="panel classic-detail-extras" data-classic-detail="' + esc(item.id) + '">'
      + '<h3>Classic Flash media ' + experimentalBadgeHtml() + '</h3>'
      + '<p class="meta">SWF' + (item.swfName ? (": <code>" + esc(item.swfName) + "</code>") : "")
      + (item.swfSha1 ? (" · sha1 " + esc(String(item.swfSha1).slice(0, 12)) + "…") : "")
      + (item.swfBytes ? (" · " + esc(String(item.swfBytes)) + " bytes") : "")
      + '</p>'
      + (item.swfHeaderNote ? ('<p class="meta">' + esc(item.swfHeaderNote) + '</p>') : "")
      + '<div class="section-label">Wear mode (before Wear)</div>'
      + '<div class="classic-mode-cards" role="radiogroup" aria-label="Wear playback mode">'
      +   '<label class="classic-mode-card' + (mode === "png-hybrid" ? " is-on" : "") + (smoothDisabled ? " is-disabled" : " is-recommended") + '">'
      +     '<input type="radio" name="playbackMode-' + esc(item.id) + '" value="png-hybrid"'
      +       ' data-playback-mode-item="' + esc(item.id) + '"'
      +       (mode === "png-hybrid" ? " checked" : "")
      +       (smoothDisabled ? " disabled" : "") + ' />'
      +     '<span class="classic-mode-card-title">Whirled2 Smooth</span>'
      +     '<span class="classic-mode-card-badge">' + (smoothDisabled ? "Needs PNG frames" : "Recommended") + '</span>'
      +     '<span class="classic-mode-card-detail">Walking: PNG hybrid (no Ruffle). Chrome click-to-walk + emotes.</span>'
      +   '</label>'
      +   '<label class="classic-mode-card' + (mode === "ruffle" ? " is-on" : "") + '">'
      +     '<input type="radio" name="playbackMode-' + esc(item.id) + '" value="ruffle"'
      +       ' data-playback-mode-item="' + esc(item.id) + '"'
      +       (mode === "ruffle" ? " checked" : "") + ' />'
      +     '<span class="classic-mode-card-title">Classic Flash (Ruffle)</span>'
      +     '<span class="classic-mode-card-badge">SWF appearance</span>'
      +     '<span class="classic-mode-card-detail">Appearance: Ruffle (SWF). Transparent loft mount; bob/flip on walk.</span>'
      +   '</label>'
      + '</div>'
      + (smoothDisabled
        ? ('<p class="meta classic-png-cta"><b>Convert / attach PNG frames</b> to enable Whirled2 Smooth — drop idle+walk on the Classic upload panel '
          + '(or re-save this item with PNGs). Classic Flash still works now.</p>')
        : ('<p class="meta"><b>Active mode:</b> <span class="classic-loft-mode-pill" data-loft-mode="'
          + esc(mode === "png-hybrid" ? "hybrid" : "ruffle") + '">' + esc(modeLabel) + '</span></p>'))
      + '<label class="check-row"><input type="checkbox" data-classic-optin-item="' + esc(item.id) + '"'
      +   (opt ? " checked" : "") + ' /> Keep Classic Flash media (Stuff Ruffle preview available)</label>'
      + '<div class="stuff-detail-actions">'
      +   '<button type="button" class="action-btn" data-classic-preview-swf="' + esc(item.id) + '">Preview in Ruffle…</button>'
      + '</div>'
      + '<div class="classic-ruffle-host classic-ruffle-host-detail" id="classic-ruffle-detail-host" hidden></div>'
      + '<p class="meta">Wear tip: pick a mode card, then Wear. Smooth = loft PNG walk. Classic Flash = Ruffle appearance. Whirl starter unchanged.</p>'
      + '</div>';
  }


  function classicViewerSlotHtml(item) {
    // Slot inside Avatar viewer for optional Ruffle mount after paint.
    if (!item || !itemHasClassicSwf(item) || !itemWantsClassicFlash(item)) return "";
    return '<div class="classic-viewer-swf-slot" id="classic-viewer-swf-slot" data-classic-viewer-id="'
      + esc(item.id) + '" aria-label="Classic SWF preview">'
      + ruffleStatusBadgeHtml({ overlay: true, compact: true })
      + '</div>';
  }

  function classicWearSlotHtml(worn) {
    // Sibling slot on the billboard — only when loft should actually mount Ruffle.
    // Hybrid default: no slot (PNG walk). Force Ruffle or SWF-only: mount host.
    if (!worn) return "";
    if (worn.isTofu && !wornHasClassicSwf(worn)) return "";
    if (!shouldMountRuffleInLoft(worn)) {
      if (itemIsHybrid(worn) && itemWantsClassicFlash(worn)) {
        // (?v=20260906bg): Mode B — PNG walk means Ruffle is NOT running in loft.
        return '<span class="classic-hybrid-badge" title="Walking uses PNG spritesheets in HTML/JS. Ruffle is NOT involved unless Force Ruffle.">Walking: PNG hybrid (no Ruffle)</span>';
      }
      return "";
    }
    var swfU = esc(worn.swfUrl || worn.swfDataUrl || "");
    var shaU = esc(worn.swfSha1 || (worn.pack && worn.pack.swfSha1) || "");
    var standU = esc(worn.thumb || worn.preview || "");
    var initial = esc(((worn.name || "SWF").trim().charAt(0) || "S").toUpperCase());
    return '<div id="avatar-ruffle-host" class="avatar-ruffle-host classic-ruffle-host classic-wear-swf-slot is-loft" data-swf-url="'
      + swfU + '" data-swf-sha1="' + shaU + '" aria-label="Classic Flash avatar overlay" title="Ruffle experimental — PE none; click nameplate/hitbox for emotes">'
      + (standU
        ? ('<img class="classic-swf-stand-thumb" src="' + standU + '" alt="" aria-hidden="true" />')
        : ('<div class="classic-swf-placeholder" aria-hidden="true"><span>' + initial + '</span></div>'))
      + ruffleStatusBadgeHtml({ overlay: true, compact: true })
      + '</div>';
  }

  function classicHybridBadgeHtml(worn) {
    // How this works (?v=20260906bg): UI label from playbackMode — does not change mount/walk.
    // Beginner: Smooth badge = PNG walk. Classic Flash badge = Ruffle SWF appearance.
    if (!worn) return "";
    var mode = getPlaybackMode(worn);
    if (mode === "ruffle" || (forceRuffleInLoft(worn) && itemHasClassicSwf(worn))) {
      return ruffleStatusBadgeHtml({
        label: "Appearance: " + ruffleStatusLabel(ruffleUiStatus.state === "idle" ? "ready" : ruffleUiStatus.state),
        title: "Ruffle WASM for .swf — live status"
      }) + ' <span class="avatar-playback-badge is-ruffle" title="Classic Flash Wear mode">SWF</span>';
    }
    if (mode === "png-hybrid" || itemIsHybrid(worn)) {
      return '<span class="classic-hybrid-badge avatar-playback-badge is-png-hybrid" title="PNG spritesheets walk the loft. Ruffle is NOT involved.">Walking: PNG hybrid (no Ruffle)</span>';
    }
    return "";
  }

  function classicWearModePickerHtml(item) {
    // Injected above Wear button in Stuff viewer — clear dual cards before Wear.
    // Beginner: pick Smooth or Classic Flash, then Wear. ENGINE DEV: persists playbackMode.
    if (!item || !itemHasClassicSwf(item)) return "";
    var hasPng = itemHasPngWalk(item);
    var mode = getPlaybackMode(item) || defaultPlaybackMode(item) || "ruffle";
    var smoothDisabled = !hasPng;
    return '<div class="classic-wear-mode-picker" data-classic-wear-picker="' + esc(item.id) + '">'
      + '<div class="section-label">Wear mode</div>'
      + '<div class="classic-mode-cards" role="radiogroup" aria-label="Wear playback mode">'
      +   '<label class="classic-mode-card' + (mode === "png-hybrid" ? " is-on" : "")
      +     (smoothDisabled ? " is-disabled" : " is-recommended") + '">'
      +     '<input type="radio" name="wear-playback-' + esc(item.id) + '" value="png-hybrid"'
      +       ' data-playback-mode-item="' + esc(item.id) + '"'
      +       (mode === "png-hybrid" ? " checked" : "")
      +       (smoothDisabled ? " disabled" : "") + ' />'
      +     '<span class="classic-mode-card-title">Whirled2 Smooth</span>'
      +     '<span class="classic-mode-card-detail">'
      +       (smoothDisabled
        ? 'Attach PNG idle+walk first (Convert / attach frames).'
        : 'Walking: PNG hybrid (no Ruffle)')
      +     '</span>'
      +   '</label>'
      +   '<label class="classic-mode-card' + (mode === "ruffle" ? " is-on" : "") + '">'
      +     '<input type="radio" name="wear-playback-' + esc(item.id) + '" value="ruffle"'
      +       ' data-playback-mode-item="' + esc(item.id) + '"'
      +       (mode === "ruffle" ? " checked" : "") + ' />'
      +     '<span class="classic-mode-card-title">Classic Flash (Ruffle)</span>'
      +     '<span class="classic-mode-card-detail">Appearance: Ruffle (SWF)</span>'
      +   '</label>'
      + '</div>'
      + (smoothDisabled
        ? '<p class="meta classic-png-cta">SWF-only: Classic Flash works now. Add PNG frames to unlock Smooth.</p>'
        : '')
      + '</div>';
  }

  // ---------------------------------------------------------------------------
  // Build Stuff row from upload form
  // ---------------------------------------------------------------------------
  function readImageDataUrl(file, maxBytes) {
    maxBytes = maxBytes || THUMB_MAX_BYTES;
    if (!file) return Promise.resolve(null);
    if (file.size > maxBytes) return Promise.reject(new Error("Image too large (~" + Math.round(maxBytes / 1024) + "KB cap): " + file.name));
    return fileToArrayBuffer(file).then(function (buf) {
      var kind = sniffKind(new Uint8Array(buf), file.name);
      var mime = file.type || (kind === "png" ? "image/png" : (kind === "gif" ? "image/gif" : "image/jpeg"));
      return arrayBufferToDataUrl(buf, mime);
    });
  }

  function saveClassicUploadFromForm(form, sessionUser) {
    // Returns Promise<itemRow>
    var name = (form.name && form.name.value || "Classic avatar").slice(0, 80);
    var description = (form.description && form.description.value || "Classic Flash / Whirled avatar (user upload).").slice(0, 400);
    var mediaFile = form.media && form.media.files && form.media.files[0];
    var thumbFile = form.thumb && form.thumb.files && form.thumb.files[0];
    var idleFile = form.idle && form.idle.files && form.idle.files[0];
    var walkFiles = form.walk && form.walk.files ? Array.prototype.slice.call(form.walk.files, 0) : [];
    var classicOptIn = !!(form.classicOptIn && form.classicOptIn.checked);
    var playbackModeRaw = "";
    try {
      var pmEl = form.querySelector('input[name="playbackMode"]:checked');
      playbackModeRaw = pmEl ? pmEl.value : "";
    } catch (ePm) {}
    // Legacy checkbox support if an older cached form still has forceRuffle / preferHybrid.
    var forceRuffleLegacy = !!(form.forceRuffle && form.forceRuffle.checked);
    var preferHybridLegacy = !(form.preferHybrid && form.preferHybrid.checked === false);
    var rights = !!(form.rights && form.rights.checked);
    if (!rights) return Promise.reject(new Error("Please confirm the rights checkbox."));
    if (!mediaFile) return Promise.reject(new Error("Pick a .swf / .fla / zip file."));
    if (mediaFile.size > Math.max(SWF_MAX_BYTES, FLA_MAX_BYTES)) {
      return Promise.reject(new Error("File over size cap (~10MB SWF / ~20MB FLA)."));
    }

    return analyzeFile(mediaFile).then(function (report) {
      var buf = report._buffer;
      var u8 = report._u8;
      var swfBuf = null;
      var swfName = mediaFile.name;
      var thumbDataUrl = null;
      var flaNote = report.flaNote || null;
      var headerNote = "";

      var chain = Promise.resolve();

      if (report.isZip) {
        var parts = scanZipForAvatarParts(u8);
        if (parts.swf) {
          swfBuf = parts.swf.buffer.slice(parts.swf.byteOffset, parts.swf.byteOffset + parts.swf.byteLength);
          swfName = parts.swfName || swfName;
          report = Object.assign({}, report, { isSwf: true, swf: parseSwfHeader(new Uint8Array(swfBuf)) });
        }
        if (parts.images[0] && !thumbFile) thumbDataUrl = parts.images[0].dataUrl;
        if (parts.notes.length) headerNote = parts.notes.join(" ");
      } else if (report.isSwf) {
        swfBuf = buf;
        if (report.swf && report.swf.ok) {
          headerNote = "Flash v" + report.swf.version + " · " + report.swf.compression;
        }
      } else if (report.isFla) {
        // Store FLA bytes for archive; cannot play
        flaNote = report.flaNote;
      } else {
        return Promise.reject(new Error("Please upload a .swf, .fla, or zip containing a .swf."));
      }

      // Thumb / idle / walk
      chain = chain.then(function () {
        if (thumbFile) return readImageDataUrl(thumbFile).then(function (u) { thumbDataUrl = u; });
      });
      var idleUrl = null;
      var walkUrls = [];
      chain = chain.then(function () {
        if (idleFile) return readImageDataUrl(idleFile).then(function (u) { idleUrl = u; });
      });
      walkFiles.forEach(function (wf) {
        chain = chain.then(function () {
          return readImageDataUrl(wf).then(function (u) { if (u) walkUrls.push(u); });
        });
      });

      return chain.then(function () {
        var shaPromise = swfBuf
          ? sha1OfArrayBuffer(swfBuf)
          : (report.isFla ? sha1OfArrayBuffer(buf) : Promise.resolve(null));
        return shaPromise.then(function (sha1) {
          var storePromise = Promise.resolve(null);
          if (swfBuf && sha1) {
            var blob = new Blob([swfBuf], { type: "application/x-shockwave-flash" });
            storePromise = idbPutBlob(sha1, {
              mime: "application/x-shockwave-flash",
              blob: blob,
              name: swfName,
              bytes: swfBuf.byteLength || swfBuf.length,
              at: new Date().toISOString(),
              source: "classic-upload"
            }).catch(function () {
              // Fallback: small SWFs as data URL on the row
              return null;
            });
          } else if (report.isFla && sha1) {
            var flaBlob = new Blob([buf], { type: "application/octet-stream" });
            storePromise = idbPutBlob(sha1, {
              mime: "application/octet-stream",
              blob: flaBlob,
              name: mediaFile.name,
              bytes: buf.byteLength,
              at: new Date().toISOString(),
              source: "classic-fla-archive"
            }).catch(function () { return null; });
          }

          return storePromise.then(function () {
            var states = {};
            if (idleUrl) {
              states.idle = { frames: [idleUrl], frameDurationsMs: [400] };
            }
            if (walkUrls.length) {
              states.walk = {
                frames: walkUrls,
                frameDurationsMs: walkUrls.map(function () { return 160; })
              };
            }
            // (?v=20260906bs): Do NOT put thumb into states.idle — that falsely tripped Hybrid.
            // Keep thumb/preview on the row for Stuff cards + last-resort stand art under Ruffle.

            var swfDataUrl = null;
            if (swfBuf && (!sha1 || (swfBuf.byteLength || swfBuf.length) < 1.5e6)) {
              try {
                swfDataUrl = arrayBufferToDataUrl(swfBuf, "application/x-shockwave-flash");
              } catch (eDu) {}
            }

            var preview = idleUrl || thumbDataUrl || "";
            var nid = "cav" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            var row = {
              id: nid,
              name: name,
              description: description,
              kind: "avatar",
              type: "avatar",
              category: "avatars",
              creator: (sessionUser && sessionUser.name) || "you",
              ownerId: (sessionUser && sessionUser.id) || "",
              thumb: thumbDataUrl || idleUrl || "",
              preview: preview || thumbDataUrl || "",
              frames: (states.idle && states.idle.frames) ? states.idle.frames.slice() : (preview ? [preview] : []),
              frameDurationsMs: (states.idle && states.idle.frameDurationsMs) || [],
              states: states,
              artFaces: "left",
              source: swfBuf ? "classic-swf" : "classic-fla",
              classicFlashOptIn: classicOptIn && !!swfBuf,
              forceRuffleInLoft: false,
              playbackMode: undefined,
              swfName: swfBuf ? swfName : undefined,
              swfSha1: swfBuf ? sha1 : undefined,
              swfBytes: swfBuf ? (swfBuf.byteLength || swfBuf.length) : undefined,
              swfDataUrl: swfDataUrl || undefined,
              swfUrl: undefined, // resolved at runtime from IDB
              swfHeaderNote: headerNote || undefined,
              flaNote: flaNote || undefined,
              flaSha1: (!swfBuf && report.isFla) ? sha1 : undefined,
              pack: {
                name: name,
                states: states,
                source: "classic-hybrid",
                classicFlashOptIn: classicOptIn && !!swfBuf,
                forceRuffleInLoft: false,
                playbackMode: undefined,
                swfSha1: swfBuf ? sha1 : undefined,
                _engineDev: "Dual-mode classic pack — playbackMode png-hybrid|ruffle. PNG states for Smooth; SWF via Ruffle for Classic. No AGPL host shim yet."
              },
              owned: true,
              at: new Date().toISOString(),
              analyzeKind: report.kind
            };
            // Dual-mode (?v=20260906bg): persist playbackMode; default hybrid if PNGs else ruffle.
            var chosenMode = normalizePlaybackMode(playbackModeRaw);
            if (!chosenMode) {
              if (forceRuffleLegacy) chosenMode = "ruffle";
              else if (preferHybridLegacy && (idleUrl || walkUrls.length)) chosenMode = "png-hybrid";
              else chosenMode = defaultPlaybackMode(row) || (swfBuf ? "ruffle" : null);
            }
            // (?v=20260906bs): Smooth requires walk PNGs. SWF-only / thumb-only → force Classic Flash.
            if (chosenMode === "png-hybrid" && !walkUrls.length && !itemHasPngWalk(row)) {
              chosenMode = swfBuf ? "ruffle" : chosenMode;
            }
            if (!chosenMode && swfBuf) chosenMode = "ruffle";
            if (chosenMode) setPlaybackModeOnItem(row, chosenMode);
            if (chosenMode === "ruffle" && swfBuf) {
              row.classicFlashOptIn = true;
              if (row.pack) row.pack.classicFlashOptIn = true;
            }

            // Placeholder 1×1 if nothing visual — Wear still allowed for Flash opt-in
            if (!row.thumb && !row.preview && row.classicFlashOptIn) {
              row.thumb = "";
              row.preview = "";
              row._classicSwfOnly = true;
            }
            return row;
          });
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // After-paint mounts (Stuff viewer + loft wear)
  // ---------------------------------------------------------------------------
  function afterPaint() {
    // Called from app.js paint() — soft-fail always.
    // (?v=20260906cd): preload Ruffle when Classic Flash / debug / flashQa.
    try { preloadRuffleIfNeeded(); } catch (e0) {}
    try { mountViewerIfNeeded(); } catch (e1) {}
    try { mountWearIfNeeded(); } catch (e2) {}
    try { paintRuffleStatusBadges(); } catch (e3) {}
  }

  function mountViewerIfNeeded() {
    var slot = document.getElementById("classic-viewer-swf-slot");
    if (!slot) return;
    var id = slot.getAttribute("data-classic-viewer-id");
    if (!id || !global.WhirledChrome) return;
    // Prefer Stuff lookup via a hook app.js may set
    var item = null;
    if (typeof api._findStuff === "function") item = api._findStuff(id);
    if (!item) return;
    // Shared mount pipeline with loft (same mountRuffle / ensureRuffle / status badge).
    resolveSwfUrl(item).then(function (url) {
      if (!url) {
        slot.classList.add("is-failed");
        slot.title = "SWF bytes missing — re-upload.";
        setRuffleStatus("failed", "SWF bytes missing for preview");
        return null;
      }
      slot.classList.add("is-on");
      return mountRuffle(slot, url, { maxWidth: "160px", maxHeight: "200px", height: "180px" });
    }).catch(function (err) {
      slot.classList.add("is-failed");
      var msg = String(err && err.message || err || "Ruffle preview unavailable");
      slot.title = msg + " — PNG frames still work if attached.";
      slot.setAttribute("data-ruffle-error", msg.slice(0, 160));
      setRuffleStatus("failed", msg, { error: msg });
      if (api._pushNotice) try { api._pushNotice("status", "Ruffle: " + msg); } catch (eN) {}
    });
  }

  function ensureStandFallback(slot, worn, reason) {
    // (?v=20260906cd): always leave SOMETHING visible — thumb, or initial glyph. Never blank loft.
    // Beginner: while mounting / DIRECT-first, show stand WITHOUT marking is-failed (that dims Ruffle).
    // ENGINE DEV: only real failures get is-failed + data-mount-fail.
    if (!slot) return;
    try {
      var r = String(reason || "");
      var soft = /^(mounting|direct-first|fallback:)/i.test(r);
      if (soft) {
        slot.classList.add("is-mounting");
        // keep is-playing if already painting; do not force-failed
      } else {
        slot.classList.add("is-failed");
        slot.classList.remove("is-playing", "is-mounting");
        if (reason) slot.setAttribute("data-mount-fail", r.slice(0, 120));
      }
      var stand = (worn && (worn.thumb || worn.preview)) || "";
      if (stand) {
        var existing = slot.querySelector("img.classic-swf-stand-thumb");
        if (!existing) {
          var img = document.createElement("img");
          img.className = "classic-swf-stand-thumb";
          img.alt = (worn && worn.name) || "Avatar";
          img.src = stand;
          img.style.opacity = "1";
          slot.insertBefore(img, slot.firstChild);
        } else {
          existing.style.opacity = "1";
        }
      } else if (!slot.querySelector(".classic-swf-placeholder")) {
        var g = document.createElement("div");
        g.className = "classic-swf-placeholder";
        g.setAttribute("aria-hidden", "true");
        g.innerHTML = "<span>" + esc(((worn && worn.name) || "SWF").trim().charAt(0).toUpperCase() || "S") + "</span>";
        slot.insertBefore(g, slot.firstChild);
      }
    } catch (eThumb) {}
  }

  function mountWearIfNeeded() {
    // Prefer shared #avatar-ruffle-host; loft mounts only when shouldMountRuffleInLoft (hybrid default = skip).
    // (?v=20260906bt): sha1-only Wear must resolve via IDB; never silent-return when URL missing.
    var slot = document.getElementById("avatar-ruffle-host")
      || document.getElementById("classic-wear-swf-slot");
    var worn = null;
    try {
      if (global.WhirledChrome && global.WhirledChrome.getWornAvatar) {
        worn = global.WhirledChrome.getWornAvatar();
      }
    } catch (e) {}
    if (!shouldMountRuffleInLoft(worn)) {
      // Hybrid smooth: destroy any stale loft player so PNG walk stays clickable / visible.
      if (slot) {
        try { tearDownCompanionLayer("hybrid-smooth"); } catch (eTd) {}
        destroyPlayersIn(slot);
        slot.classList.remove("is-on", "is-playing", "is-mounting", "is-companion-connected");
        try { slot.removeAttribute("data-mount-mode"); } catch (eMm) {}
      }
      loftDirectPlayer = null;
      loftActivePlayer = null;
      loftCompanionPlayer = null;
      loftSafeUpgradeActive = false;
      loftUsesCompanionHost = false;
      return;
    }
    if (!slot) return;
    var attrUrl = slot.getAttribute("data-swf-url") || "";
    var attrSha = slot.getAttribute("data-swf-sha1") || "";
    // Merge sha1 from DOM if worn snapshot lost it (localStorage slim).
    if (worn && !worn.swfSha1 && attrSha) {
      try { worn.swfSha1 = attrSha; } catch (eSha) {}
    }
    resolveSwfUrl(worn).then(function (url) {
      url = url || attrUrl || null;
      if (!url) {
        // CRITICAL: do not return silently — user sees empty loft (= "tofu").
        ensureStandFallback(slot, worn, "no-swf-url (re-upload SWF if IDB cleared)");
        logAvatarDebug("mountWearIfNeeded: no URL", {
          sha1: worn && worn.swfSha1, attrUrl: !!attrUrl, attrSha: !!attrSha
        });
        return null;
      }
      slot.classList.add("is-on");
      slot.classList.add("is-loft");
      var bill = slot.closest(".avatar-wear-billboard");
      function afterMountUi() {
        if (bill) {
          var img = bill.querySelector(".avatar-wear-sprite");
          // (?v=20260906cd): NEVER classic-png-under-swf (opacity 0) unless companion connected
          // AND a real SWF is painting — otherwise loft goes blank (stand/PNG were the only paint).
          // Hybrid soft veil OK under Force Ruffle. SWF-only path has stand thumb inside host.
          if (img && itemIsHybrid(worn) && forceRuffleInLoft(worn)) {
            img.classList.add("classic-png-under-swf-soft");
            img.classList.remove("classic-png-under-swf");
          } else if (img && !itemIsHybrid(worn) && loftHostState.connected
              && (slot.classList.contains("is-companion-connected") || slot.getAttribute("data-mount-mode") === "direct")) {
            img.classList.add("classic-png-under-swf");
          } else if (img) {
            img.classList.remove("classic-png-under-swf");
          }
        }
      }
      // (?v=20260906ch) DIRECT-first + SAFE companion (Option A sibling layer).
      // Beginner: always show your avatar first. Companion upgrades invisibly; fail keeps DIRECT.
      // ENGINE DEV: loftUsesCompanionHost only on bridge "connected". Watchdog ~4s → tear companion.
      installWhirledAvatarHostBridge();
      loftMountGeneration += 1;
      var mountGen = loftMountGeneration;
      loftPendingAvatarUrl = url; // ORIGINAL blob/http for direct remount
      loftPendingAvatarB64 = null;
      loftHostState.avatarUrl = url;
      loftHostState._hostLoadUrl = null;
      loftUsesCompanionHost = false;
      loftCompanionAttempted = false;
      loftSafeUpgradeActive = false;
      loftDirectPlayer = null;
      loftCompanionPlayer = null;
      loftCompanionLayer = null;
      loftHostState.hostMode = false;
      loftHostState.connected = false;
      loftHostState.gotControl = false;
      loftHostState.hostReady = false;
      loftHostState.bytesLoading = false;
      loftFallbackInFlight = false;
      clearCompanionWatch();
      ensureStandFallback(slot, worn, "mounting");
      try { slot.classList.remove("is-failed"); } catch (eSf) {}
      var hostUrl = getCompanionHostSwfUrl();
      var loftOpts = {
        maxWidth: "140px",
        maxHeight: "180px",
        height: "160px",
        loftMount: true,
        pointerEvents: "none",
        wmode: "transparent",
        backgroundColor: null,
        allowScriptAccess: true
      };

      function mountDirectPrimary(why) {
        logAvatarDebug("mount DIRECT primary", why);
        loftUsesCompanionHost = false;
        loftHostState.hostMode = false;
        loftHostState.connected = false;
        loftHostState.gotControl = false;
        loftSafeUpgradeActive = false;
        // Official DataLoadOptions when we have bytes (IDB/blob) — more reliable than blob: URL.
        // Beginner: your uploaded SWF lives in IndexedDB; we hand Ruffle the bytes directly.
        // ENGINE DEV: resolveSwfBytes → {data}; blob: fetch fallback; else URLLoadOptions.
        function withDataOpts(buf) {
          var o = Object.assign({}, loftOpts);
          if (buf) { o.swfData = buf; o.swfFileName = "avatar.swf"; }
          return mountRuffle(slot, url || "avatar.swf", o).then(function (player) {
            loftDirectPlayer = player || null;
            loftActivePlayer = player || loftActivePlayer;
            afterMountUi();
            try {
              slot.classList.add("is-playing", "is-on");
              slot.setAttribute("data-mount-mode", "direct");
            } catch (eM) {}
            return player;
          });
        }
        return resolveSwfBytes(worn).then(function (got) {
          if (got && got.buffer) return withDataOpts(got.buffer);
          if (url && String(url).indexOf("blob:") === 0) {
            return fetch(url).then(function (res) {
              if (!res.ok) throw new Error("blob fetch " + res.status);
              return res.arrayBuffer();
            }).then(function (ab) { return withDataOpts(ab); }).catch(function () {
              return withDataOpts(null);
            });
          }
          return withDataOpts(null);
        });
      }

      function startCompanionWithPayload(prep) {
        // (?v=20260906ch) Option A: mount companion host in sibling layer — NEVER clear DIRECT slot.
        // Beginner: you keep seeing your avatar; companion tries walk-sync invisibly.
        // ENGINE DEV: mountRuffle(slot) would wipe DIRECT (ce blank loft) — mount into layer only.
        loftCompanionAttempted = true;
        loftSafeUpgradeActive = true;
        loftPendingAvatarB64 = (prep.mode === "bytes") ? prep.b64 : null;
        loftHostState._hostLoadUrl = (prep.mode === "url") ? prep.url : null;
        // Reject nested blob:/data: — prepareCompanionPayload already prefers bytes; double-gate URL mode.
        if (prep.mode === "url" && prep.url && (/^(blob:|data:)/i.test(String(prep.url)))) {
          logAvatarDebug("companion reject nested blob/data URL — keep DIRECT", String(prep.url).slice(0, 24));
          loftSafeUpgradeActive = false;
          return Promise.resolve(loftDirectPlayer);
        }
        var layer = ensureCompanionLayer(slot);
        if (!layer) {
          logAvatarDebug("companion layer missing — keep DIRECT");
          loftSafeUpgradeActive = false;
          return Promise.resolve(loftDirectPlayer);
        }
        logAvatarDebug("companion SAFE attempt (Option A sibling layer)", {
          reason: prep.reason, mode: prep.mode, hostUrl: hostUrl,
          b64Len: prep.b64 ? prep.b64.length : 0,
          hasDirect: !!loftDirectPlayer
        });
        try {
          slot.classList.remove("is-companion-connected");
          slot.setAttribute("data-mount-mode", "companion-pending");
          // Keep DIRECT is-playing so loft stays painted; stand stays opacity 1 via CSS pending rule.
          if (loftDirectPlayer) slot.classList.add("is-playing", "is-on");
        } catch (ePend) {}
        ensureStandFallback(slot, worn, "companion-pending-safe");
        var companionOpts = Object.assign({}, loftOpts, {
          loftMount: true,
          pointerEvents: "none",
          wmode: "transparent",
          backgroundColor: null,
          allowScriptAccess: true
        });
        return mountRuffle(layer, hostUrl, companionOpts).then(function (player) {
          if (mountGen !== loftMountGeneration) return player;
          loftCompanionPlayer = player || null;
          loftActivePlayer = player || loftActivePlayer; // EI → companion; DIRECT still paints
          loftHostState.hostMode = false;
          loftUsesCompanionHost = false;
          loftHostState.connected = false;
          afterMountUi();
          try { layer.classList.add("is-companion-pending"); layer.style.opacity = "0"; } catch (eOp) {}
          var fed = { ok: false };
          if (prep.mode === "bytes" && prep.b64) {
            fed = callHostLoadBytes(prep.b64);
            if (!fed.ok) {
              setTimeout(function () {
                if (mountGen !== loftMountGeneration || loftHostState.connected) return;
                callHostLoadBytes(prep.b64);
              }, 120);
            }
          } else if (prep.mode === "url" && prep.url) {
            fed = callHostLoadUrl(prep.url);
          } else {
            tearDownCompanionLayer("companion-no-payload");
            return loftDirectPlayer || player;
          }
          setTimeout(function () {
            if (mountGen !== loftMountGeneration || loftHostState.connected) return;
            tryFlushPendingAvatarLoad();
          }, 200);
          setTimeout(function () {
            if (mountGen !== loftMountGeneration || loftHostState.connected) return;
            var r = tryFlushPendingAvatarLoad();
            logAvatarDebug("companion late flush", r);
            if (!r || !r.ok) {
              tearDownCompanionLayer("hostLoad-never-ok");
            }
          }, 700);
          armCompanionWatchdog(mountGen, prep.reason || prep.mode);
          return player;
        }).catch(function (hostErr) {
          logAvatarDebug("companion host mount failed — keep DIRECT", hostErr && hostErr.message);
          tearDownCompanionLayer((hostErr && hostErr.message) || "host-mount-fail");
          return loftDirectPlayer;
        });
      }

      function mountCompanionOnly(prep) {
        // (?v=20260906ch) COMPANION-ONLY into #avatar-ruffle-host — stand thumb covers until connected.
        // Beginner: you see your stand/thumb first; when walk-sync connects, the real Flash avatar shows.
        // ENGINE DEV: single Ruffle = host.swf + loadBytes nest. No dual-wasm. ce wipe was empty host
        // visible — we keep stand z-index cover (companion-cover) until bridge "connected".
        loftCompanionAttempted = true;
        loftSafeUpgradeActive = false;
        loftDirectPlayer = null;
        loftPendingAvatarB64 = (prep.mode === "bytes") ? prep.b64 : null;
        loftHostState._hostLoadUrl = (prep.mode === "url") ? prep.url : null;
        loftHostState.hostReady = false;
        loftHostState.bytesLoading = false;
        loftHostState.connected = false;
        loftUsesCompanionHost = false;
        loftHostState.hostMode = false;
        if (prep.mode === "url" && prep.url && (/^(blob:|data:)/i.test(String(prep.url)))) {
          logAvatarDebug("companion-only reject blob/data URL — DIRECT fallback", String(prep.url).slice(0, 24));
          return mountDirectPrimary("companion-reject-blob");
        }
        ensureStandFallback(slot, worn, "companion-only-cover");
        try {
          slot.classList.remove("is-companion-connected", "is-playing", "is-failed");
          slot.classList.add("is-on", "is-mounting");
          slot.setAttribute("data-mount-mode", "companion-cover");
        } catch (eCover) {}
        logAvatarDebug("companion-ONLY mount host.swf", {
          reason: prep.reason, mode: prep.mode, hostUrl: hostUrl,
          b64Len: prep.b64 ? prep.b64.length : 0
        });
        var companionOpts = Object.assign({}, loftOpts, {
          loftMount: true,
          pointerEvents: "none",
          wmode: "transparent",
          backgroundColor: null,
          allowScriptAccess: true
        });
        return mountRuffle(slot, hostUrl, companionOpts).then(function (player) {
          if (mountGen !== loftMountGeneration) return player;
          loftCompanionPlayer = player || null;
          loftActivePlayer = player || loftActivePlayer;
          loftDirectPlayer = null;
          loftHostState.hostMode = false;
          loftUsesCompanionHost = false;
          loftHostState.connected = false;
          // Keep stand cover — mountRuffle adds is-playing; strip it until connected.
          try {
            slot.classList.remove("is-playing");
            slot.classList.add("is-mounting", "is-on");
            slot.setAttribute("data-mount-mode", "companion-cover");
          } catch (eCv) {}
          ensureStandFallback(slot, worn, "companion-only-post-host");
          afterMountUi();
          // Queue bytes; flush on bridge "ready" (addCallback live). Also retry briefly.
          if (prep.mode === "bytes" && prep.b64) {
            loftPendingAvatarB64 = prep.b64;
            var fed = callHostLoadBytes(prep.b64); // may queue awaiting-ready
            logAvatarDebug("companion-only first loadBytes", fed);
          } else if (prep.mode === "url" && prep.url) {
            loftHostState._hostLoadUrl = prep.url;
            if (loftHostState.hostReady) callHostLoadUrl(prep.url);
          } else {
            return remountDirectAvatarImmediate("companion-only-no-payload");
          }
          // Retries: ready may race; loadedmetadata-ish delays
          [80, 200, 450, 900, 1600].forEach(function (ms) {
            setTimeout(function () {
              if (mountGen !== loftMountGeneration || loftHostState.connected) return;
              if (loftCompanionPlayer) loftActivePlayer = loftCompanionPlayer;
              var r = tryFlushPendingAvatarLoad();
              logAvatarDebug("companion-only flush@" + ms, r);
            }, ms);
          });
          armCompanionWatchdog(mountGen, "companion-only:" + (prep.reason || prep.mode));
          return player;
        }).catch(function (hostErr) {
          logAvatarDebug("companion-only host mount failed → DIRECT", hostErr && hostErr.message);
          return remountDirectAvatarImmediate((hostErr && hostErr.message) || "host-mount-fail");
        });
      }

      // Strategy (?v=20260906ch) COMPANION-ONLY (preferred) with DIRECT fallback:
      // Beginner: host nest drives real walk frames; stand covers until connected; fail → plain SWF + bob.
      // ENGINE DEV: WEAR_COMPANION_ONLY=true. Dual-layer Option A kept off (WEAR_SAFE_COMPANION_UPGRADE=false).
      ensureStandFallback(slot, worn, "strategy-start");
      if (WEAR_COMPANION_ONLY) {
        return prepareCompanionStrategy(url, worn).then(function (prep) {
          if (mountGen !== loftMountGeneration) return null;
          if (!prep || !prep.ok || prep.skipped || (prep.mode !== "bytes" && prep.mode !== "url")) {
            logAvatarDebug("companion-only skipped — DIRECT", prep && {
              ok: prep && prep.ok, mode: prep && prep.mode, reason: prep && prep.reason
            });
            return mountDirectPrimary("no-companion-payload");
          }
          return mountCompanionOnly(prep);
        }).catch(function (err) {
          logAvatarDebug("companion-only prep fail → DIRECT", err && err.message);
          return mountDirectPrimary("prep-fail");
        });
      }
      // Legacy Option A dual-layer (off by default)
      ensureStandFallback(slot, worn, "direct-first-safe");
      return mountDirectPrimary("direct-first-visible").then(function (player) {
        if (mountGen !== loftMountGeneration) return player;
        if (!WEAR_SAFE_COMPANION_UPGRADE) return player;
        prepareCompanionStrategy(url, worn).then(function (prep) {
          if (mountGen !== loftMountGeneration) return;
          if (!prep || !prep.ok || prep.skipped || (prep.mode !== "bytes" && prep.mode !== "url")) return;
          setTimeout(function () {
            if (mountGen !== loftMountGeneration || loftHostState.connected || loftCompanionAttempted) return;
            if (!loftDirectPlayer) return;
            startCompanionWithPayload(prep).catch(function (err) {
              tearDownCompanionLayer("companion-upgrade-fail");
            });
          }, 450);
        }).catch(function () {});
        return player;
      }).catch(function (err) {
        ensureStandFallback(slot, worn, (err && err.message) || "direct-primary-fail");
        return null;
      });
    }).catch(function (err) {
      ensureStandFallback(slot, worn, (err && err.message) || "ruffle-mount-failed");
    });
  }

  // ---------------------------------------------------------------------------
  // Event binding — delegated on #app so we don't fight app.js router hard
  // ---------------------------------------------------------------------------
  var bound = false;
  function bindEvents(hooks) {
    // hooks: { findStuff, saveStuff, loadStuff, session, paint, pushNotice, wearStuffAvatar, enterLoft }
    if (hooks) {
      if (hooks.findStuff) api._findStuff = hooks.findStuff;
      if (hooks.saveStuff) api._saveStuff = hooks.saveStuff;
      if (hooks.loadStuff) api._loadStuff = hooks.loadStuff;
      if (hooks.session) api._session = hooks.session;
      if (hooks.paint) api._paint = hooks.paint;
      if (hooks.pushNotice) api._pushNotice = hooks.pushNotice;
      if (hooks.wearStuffAvatar) api._wearStuffAvatar = hooks.wearStuffAvatar;
      if (hooks.enterLoft) api._enterLoft = hooks.enterLoft;
      if (hooks.awardAction) api._awardAction = hooks.awardAction;
    }
    if (bound) return;
    bound = true;
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("submit", onDocSubmit, true);
    document.addEventListener("change", onDocChange, true);
  }

  function onDocClick(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;

    // Analyze button
    if (t.closest("#classic-avatar-analyze-btn")) {
      ev.preventDefault();
      ev.stopPropagation();
      var form = document.getElementById("classic-avatar-upload-form");
      var msg = document.getElementById("classic-avatar-upload-msg");
      var out = document.getElementById("classic-avatar-analyze-out");
      var file = form && form.media && form.media.files && form.media.files[0];
      if (!file) {
        if (msg) msg.textContent = "Choose a file first.";
        return;
      }
      if (msg) msg.textContent = "Analyzing…";
      analyzeFile(file).then(function (report) {
        if (out) out.innerHTML = analyzeReportHtml(report);
        // Auto-setup (?v=20260906bg): Classic opt-in + default Wear mode after Analyze.
        try {
          if (form) {
            if (form.classicOptIn) form.classicOptIn.checked = true;
            var hasIdle = !!(form.idle && form.idle.files && form.idle.files[0]);
            var hasWalk = !!(form.walk && form.walk.files && form.walk.files.length);
            // (?v=20260906bs): Smooth only when walk PNGs attached — thumb/idle alone stays Classic Flash.
            var defMode = hasWalk ? "png-hybrid" : "ruffle";
            var radios = form.querySelectorAll('input[name="playbackMode"]');
            for (var ri = 0; ri < radios.length; ri++) {
              radios[ri].checked = (radios[ri].value === defMode);
            }
            // Legacy checkboxes if present
            if (form.preferHybrid) form.preferHybrid.checked = true;
          }
        } catch (eAuto) {}
        var tip = report.isSwf
          ? "SWF detected — pick Whirled2 Smooth (needs PNG idle+walk) or Classic Flash (Ruffle). Default set from attached frames."
          : (report.isFla ? "FLA archived path only — publish SWF for playback." : "See analyze results.");
        if (msg) msg.textContent = tip;
        // Live Ruffle preview for SWF before save (optional path — loads CDN only when previewing SWF)
        if (report.isSwf && report._buffer) {
          var prev = document.getElementById("classic-avatar-ruffle-preview");
          var host = document.getElementById("classic-ruffle-host");
          if (prev && host) {
            prev.hidden = false;
            var blob = new Blob([report._buffer], { type: "application/x-shockwave-flash" });
            var url = URL.createObjectURL(blob);
            mountRuffle(host, url, { maxWidth: "200px", maxHeight: "240px", height: "220px" }).catch(function (err) {
              if (msg) msg.textContent = (err && err.message) || "Ruffle preview failed.";
            });
          }
        }
      }).catch(function (err) {
        if (msg) msg.textContent = String(err && err.message || err);
      });
      return;
    }

    // Preview SWF on detail
    if (t.closest("[data-classic-preview-swf]")) {
      ev.preventDefault();
      ev.stopPropagation();
      var id = t.closest("[data-classic-preview-swf]").getAttribute("data-classic-preview-swf");
      var item = api._findStuff && api._findStuff(id);
      var host2 = document.getElementById("classic-ruffle-detail-host");
      if (!item || !host2) return;
      host2.hidden = false;
      resolveSwfUrl(item).then(function (url) {
        if (!url) throw new Error("SWF bytes not found in IndexedDB — re-upload.");
        return mountRuffle(host2, url, { maxWidth: "200px", maxHeight: "240px", height: "220px" });
      }).catch(function (err) {
        if (api._pushNotice) api._pushNotice("status", String(err && err.message || err));
      });
      return;
    }

    // Wear & enter loft (one-flow after Save)
    var wearEnter = t.closest("[data-classic-wear-enter]");
    if (wearEnter) {
      ev.preventDefault();
      ev.stopPropagation();
      var wid = wearEnter.getAttribute("data-classic-wear-enter");
      var wItem = api._findStuff && api._findStuff(wid);
      if (!wItem) {
        if (api._pushNotice) api._pushNotice("status", "Avatar not found — try Stuff → Avatars.");
        return;
      }
      if (api._wearStuffAvatar) api._wearStuffAvatar(wItem);
      if (api._pushNotice) {
        var wMode = getPlaybackMode(wItem) || defaultPlaybackMode(wItem);
        api._pushNotice("green", wMode === "png-hybrid"
          ? "Wearing Whirled2 Smooth — entering loft. Click floor to walk (PNG hybrid, no Ruffle)."
          : "Wearing Classic Flash (Ruffle) — entering loft. Click floor to move (bob walk). Attach PNGs for Smooth.", { transient: true });
      }
      // Enter rooms loft via hook if present
      if (typeof api._enterLoft === "function") api._enterLoft();
      else if (api._paint) {
        try { if (global.WhirledChrome && typeof global.WhirledChrome.enterRoom === "function") global.WhirledChrome.enterRoom("loft"); } catch (eEr) {}
        api._paint("rooms");
      }
      return;
    }
    var openDet = t.closest("[data-classic-open-detail]");
    if (openDet) {
      ev.preventDefault();
      ev.stopPropagation();
      var oid = openDet.getAttribute("data-classic-open-detail");
      if (typeof api._openStuffDetail === "function") api._openStuffDetail(oid);
      else if (api._paint) api._paint("stuff");
      return;
    }

    // Open classic docs section from guide
    if (t.closest("[data-classic-guide-open]")) {
      ev.preventDefault();
      // Let app.js avatar guide handle if present; also scroll classic panel
      var panel = document.getElementById("classic-avatar-panel");
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function onDocChange(ev) {
    var t = ev.target;
    if (!t) return;
    if (t.getAttribute && t.getAttribute("data-classic-optin-item")) {
      var iid = t.getAttribute("data-classic-optin-item");
      var items = api._loadStuff && api._loadStuff();
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === iid) {
          items[i].classicFlashOptIn = !!t.checked;
          if (items[i].pack) items[i].pack.classicFlashOptIn = !!t.checked;
          try { api._saveStuff(items); } catch (e) {}
          if (api._pushNotice) {
            api._pushNotice("green", t.checked
              ? "Classic Flash on — Stuff Ruffle preview; loft prefers Hybrid PNG walk when frames exist."
              : "Classic Flash off — loft uses PNG states / tofu.", { transient: true });
          }
          if (api._wearStuffAvatar && global.WhirledChrome && global.WhirledChrome.getWornAvatar) {
            var w = global.WhirledChrome.getWornAvatar();
            if (w && w.stuffId === iid) api._wearStuffAvatar(items[i]);
          }
          if (api._paint) {
            var cur = document.querySelector(".tab.is-on");
            api._paint(cur ? cur.getAttribute("data-tab") : "stuff");
          }
          break;
        }
      }
    }

    if (t.getAttribute && t.getAttribute("data-force-ruffle-item")) {
      var fid = t.getAttribute("data-force-ruffle-item");
      var itemsF = api._loadStuff && api._loadStuff();
      if (!itemsF) return;
      for (var fi = 0; fi < itemsF.length; fi++) {
        if (itemsF[fi].id === fid) {
          setPlaybackModeOnItem(itemsF[fi], t.checked ? "ruffle" : "png-hybrid");
          try { api._saveStuff(itemsF); } catch (eF) {}
          if (api._pushNotice) {
            api._pushNotice("green", t.checked
              ? "Classic Flash (Ruffle) mode — SWF appearance; click floor to move."
              : "Whirled2 Smooth — loft uses PNG hybrid walk when frames exist.", { transient: true });
          }
          if (api._wearStuffAvatar && global.WhirledChrome && global.WhirledChrome.getWornAvatar) {
            var wF = global.WhirledChrome.getWornAvatar();
            if (wF && wF.stuffId === fid) api._wearStuffAvatar(itemsF[fi]);
          }
          if (api._paint) {
            var curF = document.querySelector(".tab.is-on");
            api._paint(curF ? curF.getAttribute("data-tab") : "stuff");
          }
          break;
        }
      }
    }

    // Dual-mode radio cards (?v=20260906bg)
    if (t.getAttribute && t.getAttribute("data-playback-mode-item") && t.checked) {
      var pmid = t.getAttribute("data-playback-mode-item");
      var pmVal = normalizePlaybackMode(t.value);
      var itemsPm = api._loadStuff && api._loadStuff();
      if (!itemsPm || !pmVal) return;
      for (var pi = 0; pi < itemsPm.length; pi++) {
        if (itemsPm[pi].id === pmid) {
          if (pmVal === "png-hybrid" && !itemHasPngWalk(itemsPm[pi])) {
            if (api._pushNotice) {
              api._pushNotice("status", "Whirled2 Smooth needs PNG idle+walk — attach frames first (Convert / attach). Classic Flash still available.");
            }
            // Revert radio to ruffle
            try {
              var rRadios = document.querySelectorAll('[data-playback-mode-item="' + pmid + '"]');
              for (var rr = 0; rr < rRadios.length; rr++) {
                rRadios[rr].checked = (rRadios[rr].value === "ruffle");
              }
            } catch (eRev) {}
            return;
          }
          setPlaybackModeOnItem(itemsPm[pi], pmVal);
          try { api._saveStuff(itemsPm); } catch (ePmSave) {}
          if (api._pushNotice) {
            api._pushNotice("green", pmVal === "png-hybrid"
              ? "Wear mode: Whirled2 Smooth (PNG hybrid, no Ruffle)."
              : "Wear mode: Classic Flash (Ruffle SWF appearance).", { transient: true });
          }
          if (api._wearStuffAvatar && global.WhirledChrome && global.WhirledChrome.getWornAvatar) {
            var wPm = global.WhirledChrome.getWornAvatar();
            if (wPm && wPm.stuffId === pmid) api._wearStuffAvatar(itemsPm[pi]);
          }
          if (api._paint) {
            var curPm = document.querySelector(".tab.is-on");
            api._paint(curPm ? curPm.getAttribute("data-tab") : "stuff");
          }
          break;
        }
      }
    }
  }

  function onDocSubmit(ev) {
    var form = ev.target;
    if (!form || form.id !== "classic-avatar-upload-form") return;
    ev.preventDefault();
    ev.stopPropagation();
    var msg = document.getElementById("classic-avatar-upload-msg");
    var sess = api._session && api._session();
    if (!sess || !sess.user) {
      if (msg) msg.textContent = "Log in first.";
      return;
    }
    if (msg) msg.textContent = "Saving…";
    saveClassicUploadFromForm(form, sess.user).then(function (row) {
      // Ensure playbackMode is set (saveClassicUploadFromForm already applies dual-mode).
      try {
        if (!row.playbackMode) {
          var fallback = defaultPlaybackMode(row) || (row.swfSha1 || row.swfDataUrl ? "ruffle" : null);
          if (fallback) setPlaybackModeOnItem(row, fallback);
        }
      } catch (eHy) {}
      var items = (api._loadStuff && api._loadStuff()) || [];
      items.unshift(row);
      try {
        api._saveStuff(items);
      } catch (eSave) {
        if (msg) msg.textContent = "Could not save — storage full? Try smaller PNGs / SWF.";
        return;
      }
      if (api._awardAction) try { api._awardAction("upload"); } catch (eA) {}
      var modeNow = getPlaybackMode(row) || defaultPlaybackMode(row);
      var hybridNow = modeNow === "png-hybrid" || itemIsHybrid(row);
      var notice = modeNow === "png-hybrid"
        ? "Saved Whirled2 Smooth — PNG loft walk ready. Wear & enter loft."
        : (modeNow === "ruffle"
          ? "Saved Classic Flash (Ruffle) — transparent SWF + bob walk. Attach PNG idle+walk anytime for Smooth."
          : "Classic avatar saved. Pick a Wear mode on the card, then Wear.");
      if (api._pushNotice) api._pushNotice("green", notice, { transient: true });
      var post = document.getElementById("classic-avatar-post-save");
      if (post) {
        post.hidden = false;
        post.innerHTML = '<div class="section-label">Ready</div>'
          + '<p class="meta">' + esc(notice) + '</p>'
          + '<div class="stuff-detail-actions">'
          +   '<button type="button" class="action-btn" data-classic-wear-enter="' + esc(row.id) + '">Wear &amp; enter loft</button>'
          +   '<button type="button" class="text-btn" data-classic-open-detail="' + esc(row.id) + '">Open in Stuff</button>'
          + '</div>'
          + (hybridNow ? '' : '<p class="meta">Tip: add PNG idle+walk to unlock Whirled2 Smooth — Classic Flash (Ruffle) works now without PNGs.</p>');
      }
      if (msg) msg.textContent = "Saved.";
      if (api._paint) {
        if (typeof api._openStuffDetail === "function") api._openStuffDetail(row.id);
        else api._paint("stuff");
      }
    }).catch(function (err) {
      if (msg) msg.textContent = String(err && err.message || err);
    });
  }

  // ---------------------------------------------------------------------------
  // Enrich worn row when app.js wears an item (called from hook)
  // ---------------------------------------------------------------------------
  function enrichWornRow(row, item) {
    // How this works (?v=20260906bb): copy classic fields; keep worn row SMALL (sha1, not huge data URL)
    // so localStorage Wear does not fail → tofu. Resolve SWF bytes from IDB at mount time.
    if (!row || !item) return row;
    if (item.swfSha1) row.swfSha1 = item.swfSha1;
    if (item.swfName) row.swfName = item.swfName;
    if (item.swfBytes) row.swfBytes = item.swfBytes;
    // Prefer tiny URLs only — drop multi-MB data: URLs from the worn snapshot.
    if (item.swfUrl && String(item.swfUrl).indexOf("data:") !== 0) row.swfUrl = item.swfUrl;
    if (item.swfDataUrl && String(item.swfDataUrl).length < 120000) {
      row.swfDataUrl = item.swfDataUrl;
      if (!row.swfUrl) row.swfUrl = item.swfDataUrl;
    } else if (row.swfDataUrl && String(row.swfDataUrl).length >= 120000) {
      try { delete row.swfDataUrl; } catch (eStrip) { row.swfDataUrl = undefined; }
    }
    row.classicFlashOptIn = !!(item.classicFlashOptIn || item.useClassicFlash
      || (item.pack && item.pack.classicFlashOptIn));
    // Dual-mode: copy playbackMode; sync legacy forceRuffle from it.
    var pm = getPlaybackMode(item) || getPlaybackMode(row) || defaultPlaybackMode(item) || defaultPlaybackMode(row);
    // (?v=20260906bs): SWF without walk PNGs always Classic Flash — never false Smooth → tofu loft.
    if ((!pm || pm === "png-hybrid") && itemHasClassicSwf(item) && !itemHasPngWalk(item) && !itemHasPngWalk(row)) {
      pm = "ruffle";
    }
    if (pm) {
      row.playbackMode = pm;
      row.forceRuffleInLoft = (pm === "ruffle");
      if (!row.pack) row.pack = {};
      row.pack.playbackMode = pm;
      row.pack.forceRuffleInLoft = row.forceRuffleInLoft;
    } else {
      row.forceRuffleInLoft = !!(item.forceRuffleInLoft || item.useRuffleInLoft
        || (item.pack && (item.pack.forceRuffleInLoft || item.pack.useRuffleInLoft)));
    }
    if (item.source) row.source = item.source;
    ensureClassicWornStates(row, item);
    if (row.swfSha1 || row.swfDataUrl || row.swfUrl || pm === "ruffle" || row.classicFlashOptIn) {
      if (row.swfSha1 || row.swfDataUrl || row.swfUrl) {
        row.mediaKind = "swf";
        row.classicFlashOptIn = true;
      }
      if (!row.swfUrl && row.swfDataUrl) row.swfUrl = row.swfDataUrl;
    }
    // Keep sha1 on pack so resolveSwfUrl can find IDB after localStorage slim.
    if (row.swfSha1) {
      if (!row.pack) row.pack = {};
      row.pack.swfSha1 = row.swfSha1;
    }
    // Hybrid flag from item (has PNG frames) — worn row may omit empty walk until setAvatarState.
    row.isHybrid = itemIsHybrid(item) || itemIsHybrid(row) || pm === "png-hybrid";
    row.loftRenderMode = loftRenderMode(row);
    row.playbackMode = pm || row.playbackMode || null;
    // Never mark classic Wear as tofu.
    if (row.isTofu && wornHasClassicSwf(row)) row.isTofu = false;
    // Harden: never persist multi-MB SWF data URLs on worn snapshot (blows localStorage → tofu).
    if (row.swfDataUrl && String(row.swfDataUrl).length >= 120000) {
      try { delete row.swfDataUrl; } catch (eStrip2) { row.swfDataUrl = undefined; }
      if (row.swfUrl && String(row.swfUrl).indexOf("data:") === 0 && String(row.swfUrl).length >= 120000) {
        try { delete row.swfUrl; } catch (eStrip3) { row.swfUrl = undefined; }
      }
    }
    return row;
  }

  function canWearWithoutPng(item) {
    // Allow Wear when classic Flash opt-in + SWF present even if no thumb/frames.
    return !!(item && itemWantsClassicFlash(item) && itemHasClassicSwf(item));
  }

  // Public API
  api.version = VERSION;
  api.analyzeFile = analyzeFile;
  api.analyzeReportHtml = analyzeReportHtml;
  api.classicUploadPanelHtml = classicUploadPanelHtml;
  api.classicDetailExtrasHtml = classicDetailExtrasHtml;
  api.classicViewerSlotHtml = classicViewerSlotHtml;
  api.classicWearSlotHtml = classicWearSlotHtml;
  api.experimentalBadgeHtml = experimentalBadgeHtml;
  api.ruffleStatusBadgeHtml = ruffleStatusBadgeHtml;
  api.setRuffleStatus = setRuffleStatus;
  api.getRuffleStatus = getRuffleStatus;
  api.paintRuffleStatusBadges = paintRuffleStatusBadges;
  api.getRufflePublicPath = getRufflePublicPath;
  api.applyOfficialRuffleConfig = applyOfficialRuffleConfig;
  api.ensureRuffle = ensureRuffle;
  api.preloadRuffleIfNeeded = preloadRuffleIfNeeded;
  api.preloadRuffle = preloadRuffle;
  api.shouldPreloadRuffle = shouldPreloadRuffle;
  api.flashQaEnabled = flashQaEnabled;
  api.getDemoQaSwfUrl = getDemoQaSwfUrl;
  api.getBodyDemoSwfUrl = getBodyDemoSwfUrl;
  api.BODY_DEMO_SWF = BODY_DEMO_SWF;
  api.WEAR_COMPANION_ONLY = WEAR_COMPANION_ONLY;
  api.resolveHostEiPlayer = resolveHostEiPlayer;
  api.RUFFLE_SELF = RUFFLE_SELF;
  api.RUFFLE_DEMO_SWF = RUFFLE_DEMO_SWF;
  api.mountRuffle = mountRuffle;
  api.resolveSwfUrl = resolveSwfUrl;
  api.resolveSwfBytes = resolveSwfBytes;
  api.prepareCompanionStrategy = prepareCompanionStrategy;
  api.callHostLoadBytes = callHostLoadBytes;
  api.itemHasClassicSwf = itemHasClassicSwf;
  api.itemWantsClassicFlash = itemWantsClassicFlash;
  api.itemHasPngWalk = itemHasPngWalk;
  api.itemHasStandThumb = itemHasStandThumb;
  api.itemIsHybrid = itemIsHybrid;
  api.forceRuffleInLoft = forceRuffleInLoft;
  api.shouldMountRuffleInLoft = shouldMountRuffleInLoft;
  api.loftRenderMode = loftRenderMode;
  api.getPlaybackMode = getPlaybackMode;
  api.defaultPlaybackMode = defaultPlaybackMode;
  api.normalizePlaybackMode = normalizePlaybackMode;
  api.setPlaybackModeOnItem = setPlaybackModeOnItem;
  api.classicWearModePickerHtml = classicWearModePickerHtml;
  api.wornHasClassicSwf = wornHasClassicSwf;
  api.setLoftWalkMotion = setLoftWalkMotion;
  api.ensureClassicWornStates = ensureClassicWornStates;
  api.classicHybridBadgeHtml = classicHybridBadgeHtml;
  api.describeAvatarControlNextSteps = describeAvatarControlNextSteps;
  api.notifyLoftWalk = notifyLoftWalk;
  api.callHostWalk = callHostWalk;
  api.callHostEmote = callHostEmote;
  api.callHostSpoke = callHostSpoke;
  api.callHostSleep = callHostSleep;
  api.noteLoftActivity = noteLoftActivity;
  api.startWalkLocTick = startWalkLocTick;
  api.stopWalkLocTick = stopWalkLocTick;
  api.getCompanionHostSwfUrl = getCompanionHostSwfUrl;
  api.installWhirledAvatarHostBridge = installWhirledAvatarHostBridge;
  api.notifyLoftEmote = notifyLoftEmote;
  api.notifyLoftAppearance = notifyLoftAppearance;
  api.getLoftHostDebug = getLoftHostDebug;
  api.tryCallIntoSwf = tryCallIntoSwf;
  api.avatarDebugEnabled = avatarDebugEnabled;
  api.enrichWornRow = enrichWornRow;
  api.canWearWithoutPng = canWearWithoutPng;
  api.afterPaint = afterPaint;
  api.bindEvents = bindEvents;
  api.saveClassicUploadFromForm = saveClassicUploadFromForm;
  api.destroyPlayers = destroyPlayers;
  api.SWF_MAX_BYTES = SWF_MAX_BYTES;
  api.FORCE_RUFFLE_KEY = FORCE_RUFFLE_KEY;

  // Allow app.js to set open-detail / enter-loft helpers
  api.setOpenStuffDetail = function (fn) { api._openStuffDetail = fn; };
  api.setEnterLoft = function (fn) { api._enterLoft = fn; };

  global.WhirledClassicAvatar = api;
})(typeof window !== "undefined" ? window : this);
