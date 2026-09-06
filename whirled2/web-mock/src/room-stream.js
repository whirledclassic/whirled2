/* whirled2/web-mock/src/room-stream.js
 * ?v=20260906cq
 *
 * Parks live #stage-slot across chrome paint (no loft-first flash).
 * Streams room id via whirled:roomChanged.
 * Presence: heartbeat the ACTIVE room (not always loft); Join them uses that room.
 * Mobile: chat overlay no longer steals floor taps.
 * Home glyph: SVG house instead of iOS tofu square.
 */
(function () {
  "use strict";

  var PARK_ID = "whirled-stage-park";
  var parked = null;
  var lastRoomId = "";
  var patched = false;
  var apiWrapped = false;
  var ROOMS_KEY = "whirled2.rooms";
  var SEEN_KEY = "whirled2.seenRooms";

  var HOME_SVG =
    '<svg class="whirled-home-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M12 3.2 3.6 10.2c-.3.25-.35.7-.1 1 .25.3.7.35 1 .1L6 10.1V19c0 .55.45 1 1 1h3.2v-5.2h3.6V20H17c.55 0 1-.45 1-1v-8.9l1.5 1.2c.3.25.75.2 1-.1.25-.3.2-.75-.1-1L12 3.2z"/>' +
    "</svg>";

  function injectCss() {
    if (document.getElementById("whirled-room-stream-css")) return;
    var s = document.createElement("style");
    s.id = "whirled-room-stream-css";
    s.textContent =
      "#whirled-stage-park{position:fixed!important;left:-9999px!important;top:0;width:1px;height:1px;overflow:hidden;}" +
      ".room-enter-curtain.is-stream{background:rgba(14,40,64,.22);transition:opacity 70ms linear;}" +
      ".whirled-home-svg{display:inline-block;vertical-align:-2px;flex:0 0 auto;color:#1e6fa8;}" +
      ".pa-ico .whirled-home-svg,.profile-action .whirled-home-svg{width:18px;height:18px;}" +
      "@media (max-width:900px){" +
      ".chat-overlay{top:6px!important;bottom:auto!important;max-height:28vh!important;width:min(70%,260px)!important;pointer-events:none!important;}" +
      ".chat-overlay .chat-row{pointer-events:none!important;}" +
      ".chat-overlay .chat-who{pointer-events:auto!important;}" +
      ".stage-host,#stage-slot,canvas{touch-action:manipulation;}" +
      "}";
    document.head.appendChild(s);
  }

  function activeRoomId() {
    try {
      var r = window.WhirledChrome && window.WhirledChrome.getRoom && window.WhirledChrome.getRoom();
      if (r && (r.id || r.roomId)) return String(r.id || r.roomId);
    } catch (e) {}
    return "loft";
  }

  function loadMap(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) { return {}; }
  }
  function saveMap(key, map) {
    try { localStorage.setItem(key, JSON.stringify(map)); } catch (e) {}
  }

  function ensureRoomInCatalog(id, name, extra) {
    id = String(id || "").trim();
    if (!id) return null;
    var map = loadMap(ROOMS_KEY);
    var prev = map[id] || {};
    map[id] = {
      id: id,
      name: String(name || prev.name || id),
      ownerId: (extra && extra.ownerId) || prev.ownerId || "",
      lock: prev.lock || { mode: "unlocked", ownerId: "" },
      createdAt: prev.createdAt || new Date().toISOString(),
      blurb: prev.blurb || "seen live",
      seed: !!prev.seed,
      seenRemote: true
    };
    if (map[id].lock && !map[id].lock.mode) map[id].lock.mode = "unlocked";
    saveMap(ROOMS_KEY, map);
    var seen = loadMap(SEEN_KEY);
    seen[id] = { id: id, name: map[id].name, at: Date.now() };
    saveMap(SEEN_KEY, seen);
    return map[id];
  }

  function enterRoom(id, name) {
    id = String(id || "loft");
    ensureRoomInCatalog(id, name);
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("data-go-room", id);
    b.hidden = true;
    document.body.appendChild(b);
    try { b.click(); } catch (e) {}
    try { b.remove(); } catch (e2) {}
  }

  function wrapApi() {
    if (apiWrapped || !window.WhirledApi) return;
    apiWrapped = true;
    ["heartbeat", "occupants", "history", "postChat", "pollChat", "getRoomMusic"].forEach(function (fn) {
      var orig = window.WhirledApi[fn];
      if (typeof orig !== "function") return;
      window.WhirledApi[fn] = function (room) {
        var rid = room;
        try {
          var live = activeRoomId();
          if (!rid || rid === "loft") rid = live || rid || "loft";
        } catch (e) {}
        var args = [].slice.call(arguments);
        args[0] = rid;
        return orig.apply(this, args);
      };
    });
  }

  function rememberOccupantRooms() {
    try {
      var list = (window.WhirledChrome && window.WhirledChrome.getOccupants)
        ? window.WhirledChrome.getOccupants()
        : [];
      (list || []).forEach(function (p) {
        if (!p) return;
        var rid = p.roomId || p.room;
        if (!rid || rid === "Studio Loft") rid = "loft";
        ensureRoomInCatalog(String(rid), p.roomName || (rid === "loft" ? "Studio Loft" : String(rid)));
      });
    } catch (e) {}
  }

  function paintSeenRoomsLobby() {
    var host = document.querySelector(".rooms-lobby");
    if (!host || document.getElementById("seen-rooms-strip")) return;
    var seen = loadMap(SEEN_KEY);
    var ids = Object.keys(seen).filter(function (id) { return id && id !== "loft"; });
    if (!ids.length) return;
    var wrap = document.createElement("div");
    wrap.id = "seen-rooms-strip";
    wrap.innerHTML = '<div class="section-label">Rooms people are in</div><div class="room-tiles"></div>';
    var tiles = wrap.querySelector(".room-tiles");
    ids.sort(function (a, b) { return (seen[b].at || 0) - (seen[a].at || 0); }).slice(0, 8).forEach(function (id) {
      var r = seen[id];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "room-tile";
      btn.setAttribute("data-go-room", id);
      btn.innerHTML = "<b>" + String(r.name || id).replace(/[<>]/g, "") + "</b><span class=\"meta\">unlocked · tap to join</span>";
      tiles.appendChild(btn);
    });
    var active = host.querySelector(".section-label");
    if (active && active.parentNode) active.parentNode.insertBefore(wrap, active);
    else host.appendChild(wrap);
  }

  function retargetJoinButtons() {
    document.querySelectorAll("[data-join-them]").forEach(function (btn) {
      if (btn.getAttribute("data-join-bound") === "1") return;
      btn.setAttribute("data-join-bound", "1");
      var name = btn.getAttribute("data-join-name") || "";
      var rid = btn.getAttribute("data-join-room");
      if (!rid) {
        try {
          var occ = (window.WhirledChrome && window.WhirledChrome.getOccupants && window.WhirledChrome.getOccupants()) || [];
          var hit = occ.filter(function (p) {
            return p && String(p.name || "").toLowerCase() === String(name).toLowerCase();
          })[0];
          if (hit && hit.roomId) rid = hit.roomId;
          else if (hit && hit.room && hit.room !== "Studio Loft") rid = hit.room;
        } catch (e) {}
      }
      if (!rid) rid = activeRoomId() || "loft";
      btn.setAttribute("data-join-room", rid);
    });
  }

  function bindJoinCapture() {
    document.addEventListener("click", function (ev) {
      var join = ev.target.closest && ev.target.closest("[data-join-them]");
      if (!join) return;
      var rid = join.getAttribute("data-join-room") || activeRoomId() || "loft";
      var name = join.getAttribute("data-join-name") || "friend";
      ev.preventDefault();
      ev.stopPropagation();
      ensureRoomInCatalog(rid, rid === "loft" ? "Studio Loft" : name + "'s room");
      enterRoom(rid, name);
    }, true);
  }

  function bindHashRoom() {
    function fromHash() {
      var raw = String(location.hash || "").replace(/^#/, "");
      var parts = raw.split("/").filter(Boolean);
      if (parts[0] !== "rooms" || !parts[1] || parts[1] === "loft") return;
      ensureRoomInCatalog(parts[1], decodeURIComponent(parts[1]));
      enterRoom(parts[1]);
    }
    window.addEventListener("hashchange", fromHash);
    setTimeout(fromHash, 400);
  }

  function isTofuHomeText(txt) {
    txt = String(txt || "").trim();
    return txt === "\u2302" || txt === "\u2302\uFE0E" || txt === "\u2302\uFE0F";
  }

  function fixHomeIcons(root) {
    root = root || document;
    try {
      root.querySelectorAll(".pa-ico").forEach(function (el) {
        if (el.getAttribute("data-home-svg") === "1") return;
        if (isTofuHomeText(el.textContent)) {
          el.innerHTML = HOME_SVG;
          el.setAttribute("data-home-svg", "1");
        }
      });
    } catch (e) {}
  }

  function hold() {
    var el = document.getElementById(PARK_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = PARK_ID;
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }

  function looksLikeEngine(slot) {
    if (!slot) return false;
    return !!(slot.querySelector("canvas") || slot.getAttribute("data-whirled-engine") === "1");
  }

  function park() {
    var slot = document.getElementById("stage-slot");
    if (!slot || (slot.parentNode && slot.parentNode.id === PARK_ID)) {
      if (slot) parked = slot;
      return !!parked;
    }
    if (!looksLikeEngine(slot)) return false;
    try { hold().appendChild(slot); parked = slot; return true; } catch (e) { return false; }
  }

  function restore() {
    if (!parked || !parked.isConnected) { parked = null; return false; }
    var fresh = document.getElementById("stage-slot");
    if (!fresh) return false;
    if (fresh === parked) return true;
    try { fresh.replaceWith(parked); } catch (e) {
      try { fresh.parentNode.insertBefore(parked, fresh); fresh.remove(); } catch (e2) { return false; }
    }
    try {
      parked.setAttribute("data-whirled-engine", "1");
      parked.setAttribute("data-engine-owns-avatar-walk", "1");
    } catch (e3) {}
    return true;
  }

  function currentRoomPayload() {
    var id = activeRoomId();
    var name = "";
    try {
      var r = window.WhirledChrome && window.WhirledChrome.getRoom && window.WhirledChrome.getRoom();
      name = r && r.name ? r.name : "";
    } catch (e) {}
    if (!name) {
      var strip = document.querySelector(".room-name");
      if (strip) name = String(strip.textContent || "").trim();
    }
    return { id: id, name: name || id, items: [] };
  }

  function notifyRoom(force) {
    var payload = currentRoomPayload();
    if (!force && payload.id === lastRoomId) return payload;
    lastRoomId = payload.id;
    try { document.dispatchEvent(new CustomEvent("whirled:roomChanged", { detail: payload })); } catch (e) {}
    try {
      if (window.__whirledEngine && window.__whirledEngine.applyRoom) window.__whirledEngine.applyRoom(payload);
    } catch (e2) {}
    return payload;
  }

  function afterChromePaint() {
    wrapApi();
    var inRoom = !!(document.getElementById("stage-slot") || document.querySelector(".stage-host"));
    if (inRoom) {
      restore();
      notifyRoom(false);
      try { ensureRoomInCatalog(activeRoomId(), currentRoomPayload().name); } catch (eR) {}
    }
    var curtain = document.getElementById("room-enter-curtain");
    if (curtain && looksLikeEngine(parked || document.getElementById("stage-slot"))) curtain.classList.add("is-stream");
    try { fixHomeIcons(document); } catch (eH) {}
    try { rememberOccupantRooms(); } catch (eO) {}
    try { retargetJoinButtons(); } catch (eJ) {}
    try { paintSeenRoomsLobby(); } catch (eS) {}
  }

  function patchInnerHtml() {
    if (patched) return;
    patched = true;
    var desc = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    if (!desc || typeof desc.set !== "function") return;
    var origSet = desc.set;
    var origGet = desc.get;
    Object.defineProperty(Element.prototype, "innerHTML", {
      configurable: true,
      enumerable: desc.enumerable,
      get: origGet,
      set: function (html) {
        var id = this && this.id;
        if (id === "main" || id === "app") { try { park(); } catch (eP) {}
        }
        origSet.call(this, html);
        if (id === "main" || id === "app") { try { afterChromePaint(); } catch (eA) {}
        }
      }
    });
  }

  injectCss();
  patchInnerHtml();
  bindJoinCapture();
  bindHashRoom();

  document.addEventListener("whirled:ready", function () {
    wrapApi();
    afterChromePaint();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { wrapApi(); afterChromePaint(); });
  } else {
    wrapApi();
    afterChromePaint();
  }
})();
