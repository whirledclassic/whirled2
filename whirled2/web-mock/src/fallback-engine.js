/* whirled2/web-mock/src/fallback-engine.js
 * ?v=20260906cu
 * Instant room canvas when Nabir Pixi engineSrc is missing.
 * If engineSrc loads later, that mount replaces this canvas.
 */
(function (root) {
  "use strict";
  if (root.__whirledFallbackBound) return;
  root.__whirledFallbackBound = true;

  function remoteSrc() {
    try {
      var q = String(location.search || "");
      var m = /(?:\?|&)engineSrc=([^&]+)/.exec(q);
      if (m && m[1]) return decodeURIComponent(m[1].replace(/\+/g, " "));
    } catch (e) {}
    try {
      var ls = localStorage.getItem("whirled2.engineSrc");
      if (ls) return String(ls);
    } catch (e2) {}
    try {
      if (root.WHIRLED_ENGINE_SRC) return String(root.WHIRLED_ENGINE_SRC);
    } catch (e3) {}
    return "";
  }

  function roomName() {
    try {
      var r = root.WhirledChrome && root.WhirledChrome.getRoom && root.WhirledChrome.getRoom();
      if (r && r.name) return String(r.name);
    } catch (e) {}
    var el = document.querySelector(".room-name");
    return el ? String(el.textContent || "Studio Loft").trim() : "Studio Loft";
  }

  function paintCanvas(cv, x, y) {
    var w = cv.width;
    var h = cv.height;
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#6eb7d8";
    ctx.fillRect(0, 0, w, h * 0.58);
    ctx.fillStyle = "#c9a36a";
    ctx.fillRect(0, h * 0.58, w, h * 0.42);
    ctx.strokeStyle = "rgba(90,60,30,0.18)";
    ctx.lineWidth = 1;
    var gy = h * 0.58;
    for (var i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, gy + i * (h * 0.42) / 8);
      ctx.lineTo(w, gy + i * (h * 0.42) / 8);
      ctx.stroke();
    }
    ctx.fillStyle = "#8ec8e4";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.58);
    ctx.lineTo(w * 0.18, h * 0.22);
    ctx.lineTo(w * 0.18, h * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, h * 0.58);
    ctx.lineTo(w * 0.82, h * 0.22);
    ctx.lineTo(w * 0.82, h * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4f0e4";
    ctx.font = "bold 13px Trebuchet MS, sans-serif";
    ctx.fillText(roomName(), 12, 22);
    ctx.fillStyle = "#1e6fa8";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(10, Math.min(w, h) * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#16324a";
    ctx.beginPath();
    ctx.arc(x, y - Math.max(10, Math.min(w, h) * 0.035) - 6, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function fallbackMount(host) {
    if (!host) return;
    if (host.getAttribute("data-remote-engine") === "1" && host.querySelector("canvas")) return;
    var cv = host.querySelector("canvas.whirled-fallback-stage");
    if (!cv) {
      host.innerHTML = "";
      cv = document.createElement("canvas");
      cv.className = "whirled-fallback-stage";
      cv.style.display = "block";
      cv.style.width = "100%";
      cv.style.height = "100%";
      host.appendChild(cv);
    }
    host.setAttribute("data-whirled-engine", "1");
    host.setAttribute("data-engine-owns-avatar-walk", "1");
    function fit() {
      var r = host.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.floor(r.width * dpr));
      cv.height = Math.max(1, Math.floor(r.height * dpr));
    }
    var pos = { x: 0.5, y: 0.72, tx: 0.5, ty: 0.72 };
    fit();
    function tick() {
      if (!cv.isConnected) return;
      pos.x += (pos.tx - pos.x) * 0.12;
      pos.y += (pos.ty - pos.y) * 0.12;
      paintCanvas(cv, pos.x * cv.width, pos.y * cv.height);
      root.__whirledFallbackRaf = requestAnimationFrame(tick);
    }
    if (root.__whirledFallbackRaf) cancelAnimationFrame(root.__whirledFallbackRaf);
    tick();
    if (!cv.getAttribute("data-walk")) {
      cv.setAttribute("data-walk", "1");
      cv.addEventListener("pointerdown", function (ev) {
        var r = cv.getBoundingClientRect();
        if (!r.width || !r.height) return;
        pos.tx = (ev.clientX - r.left) / r.width;
        pos.ty = Math.max(0.58, (ev.clientY - r.top) / r.height);
      });
    }
    document.addEventListener("whirled:roomChanged", function () {
      paintCanvas(cv, pos.x * cv.width, pos.y * cv.height);
    });
  }

  function tryRemote(host) {
    var src = remoteSrc();
    if (!src) return;
    import(src).then(function (mod) {
      var mount = (mod && (mod.mountWhirledEngine || mod.default)) || null;
      if (typeof mount !== "function") return;
      host.setAttribute("data-remote-engine", "1");
      return mount(host);
    }).catch(function () {});
  }

  var prev = root.mountWhirledEngine;
  root.mountWhirledEngine = function (host) {
    fallbackMount(host);
    tryRemote(host);
    if (typeof prev === "function" && prev !== root.mountWhirledEngine) {
      try { return prev(host); } catch (e) {}
    }
  };
})(window);
