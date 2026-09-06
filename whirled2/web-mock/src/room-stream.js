/* whirled2/web-mock/src/room-stream.js
 * ?v=20260906cp
 *
 * How this works: chrome paint() does main.innerHTML = rooms(), which used to
 * destroy the Pixi canvas, flash the homemade loft ("another room"), then remount.
 * This file parks a live #stage-slot across that wipe and streams room id into
 * the same engine via whirled:roomChanged.
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

  function injectCss() {
    if (document.getElementById("whirled-room-stream-css")) return;
    var s = document.createElement("style");
    s.id = "whirled-room-stream-css";
    s.textContent =
      "#whirled-stage-park{position:fixed!important;left:-9999px!important;top:0;width:1px;height:1px;overflow:hidden;}" +
      ".room-enter-curtain.is-stream{background:rgba(14,40,64,.22);transition:opacity 70ms linear;}";
    document.head.appendChild(s);
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
    if (!slot || slot.parentNode && slot.parentNode.id === PARK_ID) {
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
