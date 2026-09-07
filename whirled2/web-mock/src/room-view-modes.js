/* whirled2/web-mock/src/room-view-modes.js
 * ?v=20260907a
 * Chrome-only. Fit modes live outside #stage-slot.
 * ENGINE DEV: do not remount Pixi when fit / fullscreen / orientation changes.
 */
(function () {
  "use strict";
  if (window.__whirledViewModes) return;
  window.__whirledViewModes = true;

  var KEY = "whirled2.viewMode";
  var MODES = ["shrink", "letterbox", "full-height"];
  var LABELS = {
    shrink: "Shrink to fit",
    letterbox: "Letterbox",
    "full-height": "Full height"
  };
  var ROOM_AR = 2.4;

  function loadMode() {
    try {
      var v = localStorage.getItem(KEY) || "shrink";
      return MODES.indexOf(v) >= 0 ? v : "shrink";
    } catch (e) {
      return "shrink";
    }
  }
  function saveMode(mode) {
    if (MODES.indexOf(mode) < 0) mode = "shrink";
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    return mode;
  }

  function inRoomsTab() {
    var app = document.getElementById("app");
    return !!(app && app.getAttribute("data-tab") === "rooms");
  }
  function isPhone() {
    return document.documentElement.classList.contains("w2-phone");
  }
  function isLandscapePhone() {
    try {
      var land = window.matchMedia("(orientation: landscape)").matches;
      var short = window.matchMedia("(max-height: 560px)").matches;
      return land && (isPhone() || short);
    } catch (e) {
      return false;
    }
  }

  function ensureCluster() {
    var strip = document.querySelector("#app[data-tab='rooms'] .room-strip");
    if (!strip) return null;
    var existing = strip.querySelector(".room-view-cluster");
    if (existing) return existing;
    var wrap = document.createElement("div");
    wrap.className = "room-view-cluster";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Room view");
    var label = document.createElement("span");
    label.className = "room-view-label";
    label.textContent = "View";
    wrap.appendChild(label);
    MODES.forEach(function (mode) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-view-mode", mode);
      b.textContent = LABELS[mode];
      wrap.appendChild(b);
    });
    var fs = document.createElement("button");
    fs.type = "button";
    fs.className = "room-view-fs";
    fs.setAttribute("data-view-fullscreen", "1");
    fs.setAttribute("title", "Fullscreen room (F)");
    fs.setAttribute("aria-label", "Fullscreen room");
    fs.textContent = "FS";
    wrap.appendChild(fs);
    strip.appendChild(wrap);
    return wrap;
  }

  function syncButtons() {
    var mode = loadMode();
    document.documentElement.setAttribute("data-view-mode", mode);
    var cluster = document.querySelector(".room-view-cluster");
    if (!cluster) return;
    var buttons = cluster.querySelectorAll("[data-view-mode]");
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute("data-view-mode") === mode;
      buttons[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
    var fs = cluster.querySelector("[data-view-fullscreen]");
    if (fs) {
      var live = !!(document.fullscreenElement || document.webkitFullscreenElement);
      fs.setAttribute("aria-pressed", live ? "true" : "false");
      fs.textContent = live ? "X" : "FS";
    }
  }

  function applyFit() {
    var host = document.querySelector("#app[data-tab='rooms'] .stage-host");
    var slot = document.getElementById("stage-slot");
    if (!host || !slot || !inRoomsTab()) return;
    slot.classList.add("w2-fit-slot");
    var mode = loadMode();
    document.documentElement.setAttribute("data-view-mode", mode);
    var box = host.getBoundingClientRect();
    var W = Math.max(120, box.width);
    var H = Math.max(120, box.height);
    var ar = ROOM_AR;
    var w;
    var h;
    if (mode === "full-height") {
      h = H;
      w = Math.round(h * ar);
    } else {
      if (W / H > ar) {
        h = H;
        w = Math.round(h * ar);
      } else {
        w = W;
        h = Math.round(w / ar);
      }
    }
    var nextW = w + "px";
    var nextH = h + "px";
    var nextMax = mode === "full-height" ? "none" : "100%";
    var changed = slot.style.width !== nextW || slot.style.height !== nextH;
    slot.style.width = nextW;
    slot.style.height = nextH;
    slot.style.maxWidth = nextMax;
    if (changed) {
      try { window.dispatchEvent(new Event("whirled:viewFit")); } catch (e) {}
    }
  }

  function fsElement() {
    return document.querySelector("#app[data-tab='rooms'] .stage-host") ||
      document.getElementById("app") ||
      document.documentElement;
  }
  function isFs() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function requestFs() {
    var el = fsElement();
    if (!el) return;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!req) {
      document.documentElement.classList.add("w2-room-fs");
      document.body.classList.add("room-immersive");
      applyFit();
      return;
    }
    try {
      var p = req.call(el);
      if (p && p.catch) p.catch(function () {
        document.documentElement.classList.add("w2-room-fs");
        document.body.classList.add("room-immersive");
        applyFit();
      });
    } catch (e) {
      document.documentElement.classList.add("w2-room-fs");
      document.body.classList.add("room-immersive");
    }
  }
  function exitFs() {
    document.documentElement.classList.remove("w2-room-fs");
    try {
      var ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (ex && isFs()) {
        var p = ex.call(document);
        if (p && p.catch) p.catch(function () {});
      }
    } catch (e) {}
  }
  function toggleFs() {
    if (isFs() || document.documentElement.classList.contains("w2-room-fs")) exitFs();
    else requestFs();
  }

  function applyImmersion() {
    if (!inRoomsTab()) {
      document.body.classList.remove("room-immersive");
      document.body.classList.remove("w2-chat-collapsed");
      document.documentElement.classList.remove("w2-room-fs");
      return;
    }
    if (isLandscapePhone()) {
      document.body.classList.add("room-immersive");
      if (!document.body.hasAttribute("data-chat-pref")) {
        document.body.classList.add("w2-chat-collapsed");
      }
    } else if (!isFs() && !document.documentElement.classList.contains("w2-room-fs")) {
      document.body.classList.remove("room-immersive");
      document.body.classList.remove("w2-chat-collapsed");
    }
  }

  function ensureChatHandle() {
    var bar = document.querySelector("#app[data-tab='rooms'] > .bar");
    if (!bar) return;
    if (bar.querySelector(".room-view-chat-handle")) return;
    var h = document.createElement("button");
    h.type = "button";
    h.className = "room-view-chat-handle";
    h.setAttribute("data-chat-handle", "1");
    h.textContent = "chat";
    bar.insertBefore(h, bar.firstChild);
  }

  function tick() {
    if (!inRoomsTab()) return;
    ensureCluster();
    ensureChatHandle();
    syncButtons();
    applyImmersion();
    applyFit();
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var modeBtn = t.closest("[data-view-mode]");
    if (modeBtn) {
      saveMode(modeBtn.getAttribute("data-view-mode"));
      syncButtons();
      applyFit();
      return;
    }
    if (t.closest("[data-view-fullscreen]")) {
      toggleFs();
      return;
    }
    if (t.closest("[data-chat-handle]")) {
      document.body.classList.toggle("w2-chat-collapsed");
      document.body.setAttribute("data-chat-pref", "1");
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (!inRoomsTab()) return;
    if (ev.key === "f" || ev.key === "F") {
      if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
      ev.preventDefault();
      toggleFs();
    }
    if (ev.key === "Escape") {
      exitFs();
    }
  });

  window.addEventListener("resize", function () {
    applyImmersion();
    applyFit();
    syncButtons();
  }, { passive: true });
  window.addEventListener("orientationchange", function () {
    setTimeout(function () {
      applyImmersion();
      applyFit();
    }, 80);
  });
  document.addEventListener("fullscreenchange", function () {
    document.documentElement.classList.toggle("w2-room-fs", isFs());
    applyFit();
    syncButtons();
  });
  document.addEventListener("whirled:ready", tick);
  document.addEventListener("whirled:roomChanged", tick);
  setInterval(tick, 800);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tick);
  } else {
    tick();
  }
})();
