/*
 * classic-avatar.js — Classic Whirled / Flash (.swf) avatar support for Whirled2 chrome.
 *
 * Beginner overview:
 * 1) You upload YOUR OWN .swf (and optional thumb / PNG idle+walk) in Stuff.
 * 2) We analyze what we can in the browser (size, Flash magic header, companion thumb).
 *    We cannot fully parse AvatarControl states inside a SWF in plain JS — we say so honestly.
 * 3) Paths that work today:
 *    (a) Play-as-is in Ruffle (CDN) inside Stuff preview + optional loft overlay (Experimental).
 *    (b) Attach PNG idle/walk so chrome walk works like Whirl until Pixi.
 *    (c) Hybrid: one Stuff item holds swfUrl + PNG states.
 * 4) ENGINE DEV: Ruffle lives in chrome overlay (#classic-swf-slot / billboard), NOT inside
 *    #stage-slot. Pixi still owns the room. Study community Ruffle+host-shim architecture —
 *    do NOT copy AGPL code. Full AvatarControl handshake = later Phase 2.
 *
 * Loaded BEFORE app.js from index.html. Exposes window.WhirledClassicAvatar.
 * Cache: ?v=20260906ay
 */
(function (global) {
  "use strict";

  var VERSION = "20260906ay";
  var MEDIA_IDB_NAME = "whirled2-media";
  var MEDIA_IDB_STORE = "blobs";
  var SWF_MAX_BYTES = 10 * 1024 * 1024; // classic msoy medium upload ~10MB
  var FLA_MAX_BYTES = 20 * 1024 * 1024;
  var THUMB_MAX_BYTES = 1 * 1024 * 1024;
  var RUFFLE_CDN = "https://unpkg.com/@ruffle-rs/ruffle";
  var OPT_IN_KEY = "whirled2.classicFlashOptIn"; // global preference (optional)
  // How this works (?v=20260906ay): loft prefers PNG chrome walk (Hybrid smooth).
  // Force Ruffle only when user opts in — stock SWFs need AvatarControl host to walk.
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
  // Ruffle loader (CDN) — optional; fails soft if offline / blocked
  // ---------------------------------------------------------------------------
  var ruffleLoadPromise = null;
  var activePlayers = []; // track to destroy on remount

  function ensureRuffle() {
    if (global.RufflePlayer && global.RufflePlayer.newest) {
      return Promise.resolve(global.RufflePlayer.newest());
    }
    if (ruffleLoadPromise) return ruffleLoadPromise;
    ruffleLoadPromise = new Promise(function (resolve, reject) {
      global.RufflePlayer = global.RufflePlayer || {};
      var s = document.createElement("script");
      s.src = RUFFLE_CDN;
      s.async = true;
      s.onload = function () {
        try {
          if (global.RufflePlayer && global.RufflePlayer.newest) resolve(global.RufflePlayer.newest());
          else reject(new Error("Ruffle loaded but API missing."));
        } catch (e) { reject(e); }
      };
      s.onerror = function () {
        ruffleLoadPromise = null;
        reject(new Error("Could not load Ruffle from CDN (offline or blocked). PNG fallback still works."));
      };
      document.head.appendChild(s);
    });
    return ruffleLoadPromise;
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
    // How this works (?v=20260906ay): Ruffle player with TRANSPARENT stage so loft shows through.
    // Beginner: black box was Ruffle default opaque stage — fixed via wmode + backgroundColor null + CSS.
    // ENGINE DEV: container must be chrome-owned (Stuff viewer or #avatar-wear-layer), never #stage-slot.
    // Loft mounts use pointer-events:none so floor click-to-walk still works (SWFs ignore room without AvatarControl).
    opts = opts || {};
    if (!container || !swfUrl) return Promise.reject(new Error("Missing container or SWF URL."));
    destroyPlayersIn(container);
    var loftMount = !!(opts.loftMount || (container.id === "avatar-ruffle-host")
      || (container.classList && container.classList.contains("classic-wear-swf-slot")));
    return ensureRuffle().then(function (ruffle) {
      // Global defaults help polyfill path; per-load options below still win for createPlayer.
      try {
        global.RufflePlayer = global.RufflePlayer || {};
        global.RufflePlayer.config = Object.assign({}, global.RufflePlayer.config || {}, {
          wmode: "transparent",
          backgroundColor: null,
          autoplay: "on",
          splashScreen: false,
          unmuteOverlay: "hidden"
        });
      } catch (eCfg) {}
      var player = ruffle.createPlayer();
      player.style.width = opts.width || "100%";
      player.style.height = opts.height || "100%";
      player.style.maxWidth = opts.maxWidth || "220px";
      player.style.maxHeight = opts.maxHeight || "280px";
      player.style.display = "block";
      player.style.background = "transparent";
      player.style.backgroundColor = "transparent";
      // How this works: loft Ruffle must NOT eat floor clicks — chrome PNG (or billboard move) handles walk.
      if (loftMount || opts.pointerEvents === "none") {
        player.style.pointerEvents = "none";
        try { container.style.pointerEvents = "none"; } catch (ePe) {}
      }
      player.setAttribute("data-classic-ruffle", "1");
      player.setAttribute("data-wmode", "transparent");
      container.innerHTML = "";
      container.appendChild(player);
      activePlayers.push(player);
      var loadOpts = {
        url: swfUrl,
        // null = use SWF stage color; with wmode transparent, empty stage areas stay see-through.
        backgroundColor: (opts.backgroundColor === undefined) ? null : opts.backgroundColor,
        wmode: opts.wmode || "transparent",
        autoplay: "on",
        unmuteOverlay: "hidden",
        splashScreen: false,
        letterbox: opts.letterbox || "off",
        // security: loft appearance-only. Host shim (AvatarControl) needs allowScriptAccess later + careful sandbox.
        allowScriptAccess: opts.allowScriptAccess === true
      };
      return player.load(loadOpts).then(function () {
        // Hardening: some Ruffle builds paint canvas black until CSS/canvas alpha settles.
        try {
          var cvs = player.querySelector && player.querySelector("canvas");
          if (cvs) {
            cvs.style.background = "transparent";
            cvs.style.backgroundColor = "transparent";
            if (loftMount) cvs.style.pointerEvents = "none";
          }
        } catch (eCv) {}
        return player;
      });
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
    if (item.swfSha1) {
      return idbGetBlob(item.swfSha1).then(function (rec) {
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

  function itemHasPngWalk(item) {
    // Beginner: hybrid needs at least one idle/walk PNG so chrome can click-to-walk smoothly.
    if (!item) return false;
    if (item.frames && item.frames.length) return true;
    if (item.preview && !item.isTofu) return true;
    if (item.states) {
      var idle = item.states.idle || item.states.stand;
      var walk = item.states.walk;
      if (idle && idle.frames && idle.frames.length) return true;
      if (walk && walk.frames && walk.frames.length) return true;
    }
    if (item.pack && item.pack.states) {
      var ps = item.pack.states;
      if (ps.idle && ps.idle.frames && ps.idle.frames.length) return true;
      if (ps.walk && ps.walk.frames && ps.walk.frames.length) return true;
    }
    return false;
  }

  function itemIsHybrid(item) {
    // Hybrid (smooth): SWF for appearance/archive + PNG states for loft walk/emotes.
    return !!(item && itemHasClassicSwf(item) && itemHasPngWalk(item));
  }

  function forceRuffleInLoft(item) {
    // Experimental: show Ruffle on loft even when PNGs exist (laggier; SWF still won't walk without host).
    if (item && (item.forceRuffleInLoft === true || item.useRuffleInLoft === true)) return true;
    if (item && item.pack && (item.pack.forceRuffleInLoft || item.pack.useRuffleInLoft)) return true;
    try {
      if (localStorage.getItem(FORCE_RUFFLE_KEY) === "1") return true;
    } catch (e) {}
    return false;
  }

  function shouldMountRuffleInLoft(worn) {
    // Default (?v=20260906ay): hybrid → PNG only in loft (smooth). SWF-only → Ruffle appearance.
    // Force Ruffle overlay when toggle on. Stock Whirled SWFs idle without AvatarControl host.
    if (!worn || worn.isTofu) return false;
    if (!itemHasClassicSwf(worn) && !(worn.swfUrl || worn.swfDataUrl || worn.swfSha1)) return false;
    if (!itemWantsClassicFlash(worn) && worn.mediaKind !== "swf" && !worn.classicFlashOptIn) return false;
    if (itemIsHybrid(worn) && !forceRuffleInLoft(worn)) return false;
    return true;
  }

  function loftRenderMode(worn) {
    // Labels for UI: hybrid | ruffle | png | tofu
    if (!worn || worn.isTofu) return "tofu";
    if (itemIsHybrid(worn) && !forceRuffleInLoft(worn)) return "hybrid";
    if (shouldMountRuffleInLoft(worn)) return "ruffle";
    if (itemHasPngWalk(worn)) return "png";
    return "unknown";
  }

  /*
   * AvatarControl host shim — NEXT STEPS (honest limits, do NOT copy AGPL).
   * -----------------------------------------------------------------------
   * Classic Whirled SWFs call `new AvatarControl(this)` which dispatches
   * "controlConnect" on loaderInfo.sharedEvents (NOT ExternalInterface).
   * Host must reply with hostProps that drive appearanceChanged_v1/v2
   * (location, orient, moving[, sleeping]). Without that handshake the SWF
   * idles forever — click-to-walk in chrome cannot magically animate it.
   * Study: whirled.club AvatarControl ASdocs + Grey Havens whirled-sdk;
   * community whirled-host.swf pattern (cite only; AGPL — do not paste).
   * Practical path today = Hybrid (PNG walk). Full host = Phase 2 policy bump.
   */
  function describeAvatarControlNextSteps() {
    return {
      whyIdle: "Stock Whirled SWFs speak controlConnect / appearanceChanged — not JS click handlers.",
      hybrid: "Attach PNG idle+walk → loft uses chrome walk (Hybrid smooth).",
      hostShim: "Needs Ruffle allowScriptAccess + host SWF or JS bridge implementing appearanceChanged_v1/v2.",
      docs: ["AVATAR-IMPORT.md §4", "https://www.whirled.club/code/asdocs/com/whirled/AvatarControl.html"]
    };
  }

  // ---------------------------------------------------------------------------
  // UI fragments — pale-blue classic chrome
  // ---------------------------------------------------------------------------
  function experimentalBadgeHtml() {
    return '<span class="classic-exp-badge" title="Experimental Flash / Ruffle path">Experimental</span>';
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
    // How this works: Stuff → Avatars browse shows this pale-blue panel. No obscure ?avatarLab flag required
    // for YOUR uploads — Wear uses Experimental badge + optional classic Flash opt-in.
    return '<div class="panel classic-avatar-panel" id="classic-avatar-panel">'
      + '<div class="room-side-head"><h2>Classic Flash / Whirled avatars</h2>'
      + experimentalBadgeHtml() + '</div>'
      + '<p class="meta">Upload <b>your own</b> old Whirled <code>.swf</code> (plus optional thumb / <b>PNG idle+walk</b>). '
      + 'Best feel: <b>Hybrid (smooth)</b> — PNG chrome walks in the loft; Ruffle preview in Stuff. '
      + 'SWF-only Ruffle idles without an AvatarControl host (Coming Soon). Transparent stage — no black box. '
      + 'Never scrape shop media. See <code>AVATAR-IMPORT.md</code> / <code>QA-FLASH.md</code>.</p>'
      + '<form id="classic-avatar-upload-form" class="stuff-upload-form classic-avatar-form">'
      +   '<label>Name <input name="name" maxlength="80" required placeholder="My classic avatar" /></label>'
      +   '<label>Description <textarea name="description" rows="2" maxlength="400" placeholder="Optional notes"></textarea></label>'
      +   '<label>Avatar media (.swf / .fla / zip with swf+thumb) '
      +     '<input type="file" name="media" accept=".swf,.fla,.zip,application/x-shockwave-flash,application/zip,application/vnd.adobe.flash.movie" required /></label>'
      +   '<label>Thumbnail (optional, ~80×60 PNG/JPG/GIF) '
      +     '<input type="file" name="thumb" accept="image/png,image/jpeg,image/gif,image/webp" /></label>'
      +   '<label>PNG idle fallback (optional) '
      +     '<input type="file" name="idle" accept="image/png,image/webp,image/jpeg,image/gif" /></label>'
      +   '<label>PNG walk fallback (optional, multi-select) '
      +     '<input type="file" name="walk" accept="image/png,image/webp,image/jpeg,image/gif" multiple /></label>'
      +   '<label class="check-row"><input type="checkbox" name="classicOptIn" checked /> '
      +     'Classic Flash (experimental) — Ruffle in Stuff preview; loft prefers Hybrid PNG walk when idle/walk attached</label>'
      +   '<label class="check-row"><input type="checkbox" name="forceRuffle" /> '
      +     'Force Ruffle in loft (Experimental) — show SWF on stage; still needs AvatarControl to walk; may feel laggy</label>'
      +   '<label class="check-row"><input type="checkbox" name="rights" required /> '
      +     'I confirm this is my own creation or I have the rights to store it (no shop scrapes).</label>'
      +   '<div class="stuff-detail-actions">'
      +     '<button type="button" class="action-btn" id="classic-avatar-analyze-btn">Analyze file…</button>'
      +     '<button type="submit">Save classic avatar to Stuff</button>'
      +   '</div>'
      +   '<p class="meta" id="classic-avatar-upload-msg"></p>'
      +   '<div id="classic-avatar-analyze-out"></div>'
      +   '<div id="classic-avatar-ruffle-preview" class="classic-ruffle-preview" hidden>'
      +     '<div class="section-label">Ruffle preview ' + experimentalBadgeHtml() + '</div>'
      +     '<div class="classic-ruffle-host" id="classic-ruffle-host"></div>'
      +     '<p class="meta">Play-as-is (transparent stage). Walk/states need AvatarControl host shim — Coming Soon. Prefer Hybrid PNG for loft.</p>'
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
    var force = forceRuffleInLoft(item);
    var mode = loftRenderMode(item);
    var modeLabel = mode === "hybrid" ? "Hybrid (smooth)" : (mode === "ruffle" ? "Ruffle (experimental)" : mode);
    return '<div class="panel classic-detail-extras" data-classic-detail="' + esc(item.id) + '">'
      + '<h3>Classic Flash media ' + experimentalBadgeHtml() + '</h3>'
      + '<p class="meta">SWF' + (item.swfName ? (": <code>" + esc(item.swfName) + "</code>") : "")
      + (item.swfSha1 ? (" · sha1 " + esc(String(item.swfSha1).slice(0, 12)) + "…") : "")
      + (item.swfBytes ? (" · " + esc(String(item.swfBytes)) + " bytes") : "")
      + '</p>'
      + (item.swfHeaderNote ? ('<p class="meta">' + esc(item.swfHeaderNote) + '</p>') : "")
      + '<p class="meta"><b>Loft mode:</b> <span class="classic-loft-mode-pill" data-loft-mode="' + esc(mode) + '">'
      + esc(modeLabel) + '</span>'
      + (hybrid ? " — PNG idle/walk present; Wear uses chrome click-to-walk by default." : " — attach PNG idle+walk for Hybrid smooth walk.")
      + '</p>'
      + '<label class="check-row"><input type="checkbox" data-classic-optin-item="' + esc(item.id) + '"'
      +   (opt ? " checked" : "") + ' /> Classic Flash (experimental) — Ruffle in Stuff preview</label>'
      + '<label class="check-row"><input type="checkbox" data-force-ruffle-item="' + esc(item.id) + '"'
      +   (force ? " checked" : "") + ' /> Force Ruffle in loft (Experimental) — SWF overlay; floor clicks still pass through; walk anim needs AvatarControl</label>'
      + '<div class="stuff-detail-actions">'
      +   '<button type="button" class="action-btn" data-classic-preview-swf="' + esc(item.id) + '">Preview in Ruffle…</button>'
      + '</div>'
      + '<div class="classic-ruffle-host classic-ruffle-host-detail" id="classic-ruffle-detail-host" hidden></div>'
      + '<p class="meta">Wear tip: Hybrid (smooth) = loft PNG walk + emotes. Force Ruffle = appearance only until host shim. Transparent stage (no black box). Whirl starter unchanged.</p>'
      + '</div>';
  }

  function classicViewerSlotHtml(item) {
    // Slot inside Avatar viewer for optional Ruffle mount after paint.
    if (!item || !itemHasClassicSwf(item) || !itemWantsClassicFlash(item)) return "";
    return '<div class="classic-viewer-swf-slot" id="classic-viewer-swf-slot" data-classic-viewer-id="'
      + esc(item.id) + '" aria-label="Classic SWF preview">'
      + '<span class="classic-exp-badge classic-exp-badge-overlay">Flash</span>'
      + '</div>';
  }

  function classicWearSlotHtml(worn) {
    // Sibling slot on the billboard — only when loft should actually mount Ruffle.
    // Hybrid default: no slot (PNG walk). Force Ruffle or SWF-only: mount host.
    if (!worn || worn.isTofu) return "";
    if (!shouldMountRuffleInLoft(worn)) {
      if (itemIsHybrid(worn) && itemWantsClassicFlash(worn)) {
        return '<span class="classic-hybrid-badge" title="PNG chrome walk + SWF on file">Hybrid (smooth)</span>';
      }
      return "";
    }
    var swfU = esc(worn.swfUrl || worn.swfDataUrl || "");
    return '<div id="avatar-ruffle-host" class="avatar-ruffle-host classic-ruffle-host classic-wear-swf-slot is-loft" data-swf-url="'
      + swfU + '" aria-label="Classic Flash avatar overlay" title="Ruffle experimental — pointer-events none">'
      + '<span class="classic-exp-badge classic-exp-badge-overlay">Flash</span>'
      + '</div>';
  }

  function classicHybridBadgeHtml(worn) {
    if (!worn || !itemIsHybrid(worn)) return "";
    if (forceRuffleInLoft(worn)) {
      return '<span class="classic-exp-badge" title="Force Ruffle in loft">Ruffle loft</span>';
    }
    return '<span class="classic-hybrid-badge" title="PNG chrome walk; SWF kept for Stuff preview">Hybrid (smooth)</span>';
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
    var forceRuffle = !!(form.forceRuffle && form.forceRuffle.checked);
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
            // If SWF-only and no PNG, use thumb as idle so Wear has something visible when Ruffle fails
            if (!states.idle && thumbDataUrl) {
              states.idle = { frames: [thumbDataUrl], frameDurationsMs: [400] };
            }

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
              forceRuffleInLoft: forceRuffle && !!swfBuf,
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
              forceRuffleInLoft: forceRuffle && !!swfBuf,
                swfSha1: swfBuf ? sha1 : undefined,
                _engineDev: "Hybrid classic pack — PNG states for chrome walk; SWF via Ruffle overlay when opted in. No AGPL host shim yet."
              },
              owned: true,
              at: new Date().toISOString(),
              analyzeKind: report.kind
            };
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
    try { mountViewerIfNeeded(); } catch (e1) {}
    try { mountWearIfNeeded(); } catch (e2) {}
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
    resolveSwfUrl(item).then(function (url) {
      if (!url) return;
      slot.classList.add("is-on");
      return mountRuffle(slot, url, { maxWidth: "160px", maxHeight: "200px", height: "180px" });
    }).catch(function () {
      slot.classList.add("is-failed");
      slot.title = "Ruffle preview unavailable — PNG frames still work if attached.";
    });
  }

  function mountWearIfNeeded() {
    // Prefer shared #avatar-ruffle-host; loft mounts only when shouldMountRuffleInLoft (hybrid default = skip).
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
        destroyPlayersIn(slot);
        slot.classList.remove("is-on");
      }
      return;
    }
    if (!slot) return;
    var attrUrl = slot.getAttribute("data-swf-url") || "";
    resolveSwfUrl(worn).then(function (url) {
      url = url || attrUrl || null;
      if (!url) return;
      slot.classList.add("is-on");
      slot.classList.add("is-loft");
      var bill = slot.closest(".avatar-wear-billboard");
      return mountRuffle(slot, url, {
        maxWidth: "140px",
        maxHeight: "180px",
        height: "160px",
        loftMount: true,
        pointerEvents: "none",
        wmode: "transparent",
        backgroundColor: null
      }).then(function () {
        if (bill) {
          var img = bill.querySelector(".avatar-wear-sprite");
          // SWF-only: hide empty PNG stub. Hybrid+Force Ruffle: keep PNG for walk under soft veil.
          if (img && !itemIsHybrid(worn)) img.classList.add("classic-png-under-swf");
          if (img && itemIsHybrid(worn) && forceRuffleInLoft(worn)) {
            img.classList.add("classic-png-under-swf-soft");
          }
        }
      });
    }).catch(function () {
      slot.classList.add("is-failed");
    });
  }

  // ---------------------------------------------------------------------------
  // Event binding — delegated on #app so we don't fight app.js router hard
  // ---------------------------------------------------------------------------
  var bound = false;
  function bindEvents(hooks) {
    // hooks: { findStuff, saveStuff, loadStuff, session, paint, pushNotice, wearStuffAvatar }
    if (hooks) {
      if (hooks.findStuff) api._findStuff = hooks.findStuff;
      if (hooks.saveStuff) api._saveStuff = hooks.saveStuff;
      if (hooks.loadStuff) api._loadStuff = hooks.loadStuff;
      if (hooks.session) api._session = hooks.session;
      if (hooks.paint) api._paint = hooks.paint;
      if (hooks.pushNotice) api._pushNotice = hooks.pushNotice;
      if (hooks.wearStuffAvatar) api._wearStuffAvatar = hooks.wearStuffAvatar;
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
        if (msg) msg.textContent = report.isSwf ? "SWF detected — you can Save, or Preview below after Save." : (report.isFla ? "FLA archived path only — publish SWF for playback." : "See analyze results.");
        // Live Ruffle preview for SWF before save
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
          itemsF[fi].forceRuffleInLoft = !!t.checked;
          if (itemsF[fi].pack) itemsF[fi].pack.forceRuffleInLoft = !!t.checked;
          try { api._saveStuff(itemsF); } catch (eF) {}
          // Per-item flag only — do not flip global FORCE_RUFFLE_KEY from one Stuff row.
          if (api._pushNotice) {
            api._pushNotice("green", t.checked
              ? "Force Ruffle in loft ON — SWF appearance; click floor to move. Walk anim still needs AvatarControl / Hybrid PNGs."
              : "Force Ruffle off — loft uses Hybrid (smooth) PNG walk when available.", { transient: true });
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
      var items = (api._loadStuff && api._loadStuff()) || [];
      items.unshift(row);
      try {
        api._saveStuff(items);
      } catch (eSave) {
        if (msg) msg.textContent = "Could not save — storage full? Try smaller PNGs / SWF.";
        return;
      }
      if (api._awardAction) try { api._awardAction("upload"); } catch (eA) {}
      if (api._pushNotice) {
        api._pushNotice("green", row.classicFlashOptIn
          ? "Classic avatar saved. Open it → Wear (Experimental Flash). Add PNGs anytime for walk."
          : "Classic avatar saved (archive / PNG path). Enable Classic Flash on the item for Ruffle.", { transient: true });
      }
      if (api._paint) {
        // Open detail — app.js uses stuffMode / stuffItemId; set via hooks if provided
        if (typeof api._openStuffDetail === "function") api._openStuffDetail(row.id);
        else api._paint("stuff");
      }
      if (msg) msg.textContent = "Saved.";
    }).catch(function (err) {
      if (msg) msg.textContent = String(err && err.message || err);
    });
  }

  // ---------------------------------------------------------------------------
  // Enrich worn row when app.js wears an item (called from hook)
  // ---------------------------------------------------------------------------
  function enrichWornRow(row, item) {
    if (!row || !item) return row;
    if (item.swfSha1) row.swfSha1 = item.swfSha1;
    if (item.swfDataUrl) row.swfDataUrl = item.swfDataUrl;
    if (item.swfUrl) row.swfUrl = item.swfUrl;
    if (item.swfName) row.swfName = item.swfName;
    if (item.swfBytes) row.swfBytes = item.swfBytes;
    row.classicFlashOptIn = !!(item.classicFlashOptIn || item.useClassicFlash
      || (item.pack && item.pack.classicFlashOptIn));
    row.forceRuffleInLoft = !!(item.forceRuffleInLoft || item.useRuffleInLoft
      || (item.pack && (item.pack.forceRuffleInLoft || item.pack.useRuffleInLoft)));
    if (item.source) row.source = item.source;
    if (row.classicFlashOptIn && (row.swfSha1 || row.swfDataUrl || row.swfUrl)) {
      row.mediaKind = "swf";
      if (!row.swfUrl && row.swfDataUrl) row.swfUrl = row.swfDataUrl;
    }
    row.loftRenderMode = loftRenderMode(row);
    row.isHybrid = itemIsHybrid(row);
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
  api.ensureRuffle = ensureRuffle;
  api.mountRuffle = mountRuffle;
  api.resolveSwfUrl = resolveSwfUrl;
  api.itemHasClassicSwf = itemHasClassicSwf;
  api.itemWantsClassicFlash = itemWantsClassicFlash;
  api.itemHasPngWalk = itemHasPngWalk;
  api.itemIsHybrid = itemIsHybrid;
  api.forceRuffleInLoft = forceRuffleInLoft;
  api.shouldMountRuffleInLoft = shouldMountRuffleInLoft;
  api.loftRenderMode = loftRenderMode;
  api.classicHybridBadgeHtml = classicHybridBadgeHtml;
  api.describeAvatarControlNextSteps = describeAvatarControlNextSteps;
  api.enrichWornRow = enrichWornRow;
  api.canWearWithoutPng = canWearWithoutPng;
  api.afterPaint = afterPaint;
  api.bindEvents = bindEvents;
  api.saveClassicUploadFromForm = saveClassicUploadFromForm;
  api.destroyPlayers = destroyPlayers;
  api.SWF_MAX_BYTES = SWF_MAX_BYTES;
  api.FORCE_RUFFLE_KEY = FORCE_RUFFLE_KEY;

  // Allow app.js to set open-detail helper
  api.setOpenStuffDetail = function (fn) { api._openStuffDetail = fn; };

  global.WhirledClassicAvatar = api;
})(typeof window !== "undefined" ? window : this);
