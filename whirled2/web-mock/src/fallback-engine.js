/* whirled2/web-mock/src/fallback-engine.js
 * ?v=20260906cw
 * Chrome-only. Instant #stage-slot canvas, then public Pixi if it loads.
 * Does not touch WhirledClassicGame.
 */
(function (root) {
  "use strict";
  if (root.__whirledFallbackBound) return;
  root.__whirledFallbackBound = true;

  function isLocal(url) {
    return /^(https?:\/\/)?(127\.0\.0\.1|localhost|0\.0\.0\.0)(:|\/|$)/i.test(String(url || ""));
  }

  function remoteSrc() {
    var pageHttps = /^https:/i.test(location.protocol);
    try {
      var q = String(location.search || "");
      var m = /(?:\?|&)engineSrc=([^&]+)/.exec(q);
      if (m && m[1]) {
        var fromQ = decodeURIComponent(m[1].replace(/\+/g, " "));
        if (!(pageHttps && isLocal(fromQ))) return fromQ;
      }
    } catch (e) {}
    try {
      var ls = localStorage.getItem("whirled2.engineSrc");
      if (ls && !(pageHttps && isLocal(ls))) return String(ls);
    } catch (e2) {}
    try {
      if (root.WHIRLED_ENGINE_SRC) return String(root.WHIRLED_ENGINE_SRC);
    } catch (e3) {}
    return "";
  }

  function instantStage(host) {
    if (!host) return null;
    if (host.getAttribute("data-remote-engine") === "1" && host.querySelector("canvas")) {
      return host.querySelector("canvas");
    }
    var cv = host.querySelector("canvas.whirled-instant-stage");
    if (!cv) {
      cv = document.createElement("canvas");
      cv.className = "whirled-instant-stage";
      cv.style.cssText = "display:block;width:100%;height:100%;background:#6eb7d8;";
      host.innerHTML = "";
      host.appendChild(cv);
    }
    host.setAttribute("data-whirled-engine", "1");
    host.setAttribute("data-engine-owns-avatar-walk", "1");
    var r = host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(2, Math.floor((r.width || 320) * dpr));
    cv.height = Math.max(2, Math.floor((r.height || 200) * dpr));
    var ctx = cv.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#6eb7d8";
      ctx.fillRect(0, 0, cv.width, cv.height * 0.58);
      ctx.fillStyle = "#c9a36a";
      ctx.fillRect(0, cv.height * 0.58, cv.width, cv.height * 0.42);
    }
    return cv;
  }

  function loadPixi(host) {
    var src = remoteSrc();
    if (!src) return Promise.resolve(false);
    var pending = root.__whirledPixiReady;
    if (!pending) {
      try { pending = import(src); root.__whirledPixiReady = pending; }
      catch (e) { return Promise.resolve(false); }
    }
    return pending.then(function (mod) {
      var mount = (mod && (mod.mountWhirledEngine || mod.default)) || null;
      if (typeof mount !== "function") return false;
      return Promise.resolve(mount(host)).then(function () {
        host.setAttribute("data-remote-engine", "1");
        return true;
      });
    }).catch(function () { return false; });
  }

  root.mountWhirledEngine = function (host) {
    instantStage(host);
    return loadPixi(host);
  };
})(window);
