/* whirled2/web-mock/src/room-stream.js
 * ?v=20260906cy
 * Park disabled — it left iPhone with an empty stage-host.
 * Join / search / home icon still here. Chrome only.
 */
(function () {
  "use strict";

  var lastRoomId = "";
  var patched = false;
  var apiWrapped = false;
  var ROOMS_KEY = "whirled2.rooms";
  var SEEN_KEY = "whirled2.seenRooms";
  var PROFILES_KEY = "whirled2.knownProfiles";

  var HOME_SVG =
    '<svg class="whirled-home-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M12 3.2 3.6 10.2c-.3.25-.35.7-.1 1 .25.3.7.35 1 .1L6 10.1V19c0 .55.45 1 1 1h3.2v-5.2h3.6V20H17c.55 0 1-.45 1-1v-8.9l1.5 1.2c.3.25.75.2 1-.1.25-.3.2-.75-.1-1L12 3.2z"/>' +
    "</svg>";

  function injectCss() {
    if (document.getElementById("whirled-room-stream-css")) return;
    var s = document.createElement("style");
    s.id = "whirled-room-stream-css";
    s.textContent =
      ".stage-host,#stage-slot{min-height:46vh!important;background:linear-gradient(#6eb7d8 58%,#c9a36a 58%)!important;}" +
      "#stage-slot canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}" +
      ".whirled-home-svg{display:inline-block;vertical-align:-2px;color:#1e6fa8;}" +
      "@media (max-width:900px){" +
      ".chat-overlay{top:6px!important;bottom:auto!important;max-height:28vh!important;width:min(70%,260px)!important;pointer-events:none!important;}" +
      ".chat-overlay .chat-row{pointer-events:none!important;}" +
      ".chat-overlay .chat-who{pointer-events:auto!important;}" +
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

  function rememberPerson(id, name) {
    id = String(id || "").trim();
    name = String(name || id || "").trim();
    if (!id && name) id = name.toLowerCase();
    if (!id) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]"); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id) {
        list[i].name = name || list[i].name;
        list[i].at = new Date().toISOString();
        found = true;
        break;
      }
    }
    if (!found) list.unshift({ id: id, name: name || id, at: new Date().toISOString() });
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(list.slice(0, 200))); } catch (e2) {}
  }

  function harvestPeople() {
    try {
      var occ = (window.WhirledChrome && window.WhirledChrome.getOccupants && window.WhirledChrome.getOccupants()) || [];
      occ.forEach(function (p) { if (p) rememberPerson(p.id, p.name); });
    } catch (e) {}
    try {
      document.querySelectorAll(".chat-who, .occ-name, [data-profile], [data-occ-id]").forEach(function (el) {
        var id = el.getAttribute("data-profile") || el.getAttribute("data-occ-id") || "";
        var name = (el.textContent || "").trim();
        if (name && name.length < 40) rememberPerson(id || name.toLowerCase(), name);
      });
    } catch (e2) {}
  }

  function searchRemote(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve([]);
    var base = (window.WHIRLED_API || "").replace(/\/$/, "");
    if (!base) return Promise.resolve([]);
    return fetch(base + "/api/users?q=" + encodeURIComponent(q)).then(function (r) {
      return r.ok ? r.json() : null;
    }).catch(function () { return null; }).then(function (body) {
      var rows = (body && (body.users || body.people || body.results || body)) || [];
      if (!Array.isArray(rows)) return [];
      return rows.map(function (u) {
        var id = u && (u.id || u.userId || u.name);
        var name = u && (u.name || u.who || id);
        if (id) rememberPerson(id, name);
        return id ? { id: id, name: name } : null;
      }).filter(Boolean);
    });
  }

  function ensureRoomInCatalog(id, name) {
    id = String(id || "").trim();
    if (!id) return;
    var map = loadMap(ROOMS_KEY);
    var prev = map[id] || {};
    map[id] = {
      id: id,
      name: String(name || prev.name || id),
      ownerId: prev.ownerId || "",
      lock: prev.lock || { mode: "unlocked", ownerId: "" },
      createdAt: prev.createdAt || new Date().toISOString(),
      blurb: prev.blurb || "seen live",
      seed: !!prev.seed,
      seenRemote: true
    };
    saveMap(ROOMS_KEY, map);
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

  function remountStage() {
    var host = document.getElementById("stage-slot");
    if (!host) return;
    if (host.querySelector("canvas")) return;
    try {
      if (typeof window.mountWhirledEngine === "function") window.mountWhirledEngine(host);
    } catch (e) {}
    try {
      if (window.WhirledChrome && typeof window.WhirledChrome.tryMountEngine === "function") {
        window.WhirledChrome.tryMountEngine();
      }
    } catch (e2) {}
  }

  function bindJoinCapture() {
    document.addEventListener("click", function (ev) {
      var join = ev.target.closest && ev.target.closest("[data-join-them]");
      if (!join) return;
      var rid = join.getAttribute("data-join-room") || activeRoomId() || "loft";
      ev.preventDefault();
      ev.stopPropagation();
      ensureRoomInCatalog(rid, rid === "loft" ? "Studio Loft" : "room");
      enterRoom(rid);
    }, true);
  }

  function bindFriendSearch() {
    document.addEventListener("submit", function (ev) {
      var form = ev.target;
      if (!form || form.id !== "friend-search-form") return;
      if (form.getAttribute("data-stream-ok") === "1") {
        form.removeAttribute("data-stream-ok");
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      var q = "";
      try {
        q = String(new FormData(form).get("q") || "").trim();
      } catch (e) {}
      harvestPeople();
      if (q) rememberPerson(q.toLowerCase(), q);
      searchRemote(q).then(function () {
        form.setAttribute("data-stream-ok", "1");
        try { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }
        catch (e2) { form.submit(); }
      });
    }, true);
  }

  function fixHomeIcons() {
    try {
      document.querySelectorAll(".pa-ico").forEach(function (el) {
        if (el.getAttribute("data-home-svg") === "1") return;
        var t = String(el.textContent || "").trim();
        if (t === "\u2302" || t === "\u2302\uFE0E" || t === "\u2302\uFE0F") {
          el.innerHTML = HOME_SVG;
          el.setAttribute("data-home-svg", "1");
        }
      });
    } catch (e) {}
  }

  function afterChromePaint() {
    wrapApi();
    try { fixHomeIcons(); } catch (eH) {}
    try { harvestPeople(); } catch (eP) {}
    remountStage();
    try {
      var id = activeRoomId();
      if (id && id !== lastRoomId) {
        lastRoomId = id;
        document.dispatchEvent(new CustomEvent("whirled:roomChanged", { detail: { id: id, name: id, items: [] } }));
      }
    } catch (eR) {}
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
        origSet.call(this, html);
        var id = this && this.id;
        if (id === "main" || id === "app") {
          try { afterChromePaint(); } catch (eA) {}
        }
      }
    });
  }

  injectCss();
  patchInnerHtml();
  bindJoinCapture();
  bindFriendSearch();
  document.addEventListener("whirled:ready", afterChromePaint);
})();
