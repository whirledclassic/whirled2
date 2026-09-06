/* whirled2/web-mock/src/room-stream.js
 * ?v=20260906cp
 *
 * How this works: chrome paint() does main.innerHTML = rooms(), which used to
 * destroy the Pixi canvas, flash the homemade loft ("another room"), then remount.
 * This file parks a live #stage-slot across that wipe and streams room id into
 * the same engine via whirled:roomChanged.
 *
 * Also: iOS often paints U+2302 HOUSE (⌂) as a black square. Swap to an SVG.
 *
 * Beginner: load AFTER app.js. No private engine files.
 * ENGINE DEV: listen document "whirled:roomChanged" or hooks.applyRoom — do not remount.
 */
(function () {
  "use strict";

  var PARK_ID = "whirled-stage-park";
  var parked = null;
  var lastRoomId = "";
  var patched = false;

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
      ".go-home .whirled-home-svg,.tb-home .whirled-home-svg{width:16px;height:16px;}";
    document.head.appendChild(s);
  }

  function isTofuHomeText(txt) {
    txt = String(txt || "").trim();
    if (!txt) return false;
    if (txt === "\u2302" || txt === "\u2302\uFE0E" || txt === "\u2302\uFE0F") return true;
    if (txt === "\uD83C\uDFE0" || txt.indexOf("\uD83C\uDFE0") === 0) return true;
    return false;
  }

  function fixHomeIcons(root) {
    root = root || document;
    var nodes = [];
    try {
      nodes = root.querySelectorAll(".pa-ico, .profile-action span, [data-enter-room], [data-go-home], [title='Go home'], [aria-label='Go home']");
    } catch (e) {
      nodes = [];
    }
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el || el.getAttribute("data-home-svg") === "1") continue;
      if (el.querySelector && el.querySelector(".whirled-home-svg")) {
        el.setAttribute("data-home-svg", "1");
        continue;
      }
      var raw = el.childNodes.length === 1 && el.firstChild && el.firstChild.nodeType === 3
        ? el.textContent
        : (el.childNodes.length === 0 ? el.textContent : "");
      if (isTofuHomeText(raw)) {
        el.innerHTML = HOME_SVG;
        el.setAttribute("data-home-svg", "1");
        continue;
      }
      if (el.getAttribute && el.getAttribute("data-enter-room") === "loft" && isTofuHomeText(el.textContent)) {
        var ico = el.querySelector(".pa-ico");
        if (ico) {
          ico.innerHTML = HOME_SVG;
          ico.setAttribute("data-home-svg", "1");
        }
      }
    }
    var walker;
    try {
      walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT, null);
      var hits = [];
      var n;
      while ((n = walker.nextNode())) {
        if (isTofuHomeText(n.nodeValue) && n.parentNode && n.parentNode.tagName !== "SCRIPT") {
          hits.push(n);
        }
      }
      hits.forEach(function (tn) {
        var wrap = document.createElement("span");
        wrap.className = "whirled-home-wrap";
        wrap.setAttribute("data-home-svg", "1");
        wrap.innerHTML = HOME_SVG;
        tn.parentNode.replaceChild(wrap, tn);
      });
    } catch (eW) {}
  }

  function hold() {
    var el = document.getElementById(PARK_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = PARK_ID;
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  function looksLikeEngine(slot) {
    if (!slot) return false;
    return !!(
      slot.querySelector("canvas") ||
      slot.getAttribute("data-whirled-engine") === "1" ||
      slot.getAttribute("data-engine-owns-avatar-walk") === "1"
    );
  }

  function park() {
    var slot = document.getElementById("stage-slot");
    if (!slot || (slot.parentNode && slot.parentNode.id === PARK_ID)) {
      if (slot) parked = slot;
      return !!parked;
    }
    if (!looksLikeEngine(slot)) return false;
    try {
      hold().appendChild(slot);
      parked = slot;
      return true;
    } catch (e) {
      return false;
    }
  }

  function restore() {
    if (!parked || !parked.isConnected) {
      parked = null;
      return false;
    }
    var fresh = document.getElementById("stage-slot");
    if (!fresh) return false;
    if (fresh === parked) return true;
    try {
      fresh.replaceWith(parked);
    } catch (e) {
      try {
        if (fresh.parentNode) {
          fresh.parentNode.insertBefore(parked, fresh);
          fresh.remove();
        }
      } catch (e2) {
        return false;
      }
    }
    try {
      parked.setAttribute("data-whirled-engine", "1");
      parked.setAttribute("data-engine-owns-avatar-walk", "1");
    } catch (e3) {}
    return true;
  }

  function currentRoomPayload() {
    var id = "loft";
    var name = "";
    try {
      if (window.WhirledChrome && typeof window.WhirledChrome.getRoom === "function") {
        var r = window.WhirledChrome.getRoom() || {};
        id = String(r.id || r.roomId || "loft");
        name = String(r.name || "");
      }
    } catch (e) {}
    if (!name) {
      var strip = document.querySelector(".room-name");
      if (strip) name = String(strip.textContent || "").trim();
    }
    var items = [];
    try {
      if (window.WhirledChrome && typeof window.WhirledChrome.getRoomItems === "function") {
        var pack = window.WhirledChrome.getRoomItems(id) || {};
        items = pack.items || [];
        if (pack.roomId) id = String(pack.roomId);
      }
    } catch (e2) {}
    return { id: id, name: name || id, items: items };
  }

  function notifyRoom(force) {
    var payload = currentRoomPayload();
    if (!force && payload.id === lastRoomId) return payload;
    lastRoomId = payload.id;
    try {
      document.dispatchEvent(new CustomEvent("whirled:roomChanged", { detail: payload }));
    } catch (e) {}
    try {
      if (window.__whirledEngine && typeof window.__whirledEngine.applyRoom === "function") {
        window.__whirledEngine.applyRoom(payload);
      }
    } catch (e2) {}
    return payload;
  }

  function afterChromePaint() {
    var inRoom = !!(document.getElementById("stage-slot") || document.querySelector(".stage-host"));
    if (inRoom) {
      restore();
      notifyRoom(false);
    }
    var curtain = document.getElementById("room-enter-curtain");
    if (curtain && looksLikeEngine(parked || document.getElementById("stage-slot"))) {
      curtain.classList.add("is-stream");
    }
    try { fixHomeIcons(document); } catch (eH) {}
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
        if (id === "main" || id === "app") {
          try { park(); } catch (eP) {}
        }
        origSet.call(this, html);
        if (id === "main" || id === "app") {
          try { afterChromePaint(); } catch (eA) {}
        }
      }
    });
  }

  function bumpBridgeVersion() {
    try {
      if (window.WhirledChrome && window.WhirledChrome.version === "0.6") {
        window.WhirledChrome.version = "0.7";
      }
    } catch (e) {}
  }

  injectCss();
  patchInnerHtml();

  document.addEventListener("whirled:ready", function () {
    bumpBridgeVersion();
    afterChromePaint();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bumpBridgeVersion();
      afterChromePaint();
    });
  } else {
    bumpBridgeVersion();
    afterChromePaint();
  }
})();
