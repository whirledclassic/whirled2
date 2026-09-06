/* whirled2/web-mock/src/engine-instant.js
 * ?v=20260906cs
 * Load BEFORE app.js. Preload engineSrc, hide enter curtain, hide loft-wait copy.
 */
(function () {
  "use strict";
  function src() {
    try {
      var q = String(location.search || "");
      var m = /(?:\?|&)engineSrc=([^&]+)/.exec(q);
      if (m && m[1]) return decodeURIComponent(m[1]);
    } catch (e) {}
    try { return localStorage.getItem("whirled2.engineSrc") || ""; } catch (e2) { return ""; }
  }
  var css = document.createElement("style");
  css.id = "whirled-engine-instant-css";
  css.textContent =
    "#room-enter-curtain,.room-enter-curtain{display:none!important;opacity:0!important;pointer-events:none!important;}" +
    "body.has-live-engine .loft-backdrop,body.has-live-engine .loft-hint-engine-waiting,body.has-live-engine .avatar-engine-waiting-note{display:none!important;}" +
    "#stage-slot canvas{display:block;width:100%;height:100%;}";
  document.documentElement.appendChild(css);

  var url = src();
  if (url) {
    try {
      var link = document.createElement("link");
      link.rel = "modulepreload";
      link.href = url;
      document.head.appendChild(link);
    } catch (e) {}
    window.__whirledEnginePreload = import(url).then(function (mod) {
      var mount = (mod && (mod.mountWhirledEngine || mod.default)) || null;
      if (typeof mount === "function") window.mountWhirledEngine = mount;
      return mod;
    }).catch(function () { return null; });
  }

  function killCurtain() {
    var c = document.getElementById("room-enter-curtain");
    if (c) c.remove();
    document.querySelectorAll(".room-enter-curtain").forEach(function (el) { el.remove(); });
  }
  function markLive() {
    var slot = document.getElementById("stage-slot");
    if (slot && slot.querySelector("canvas")) document.body.classList.add("has-live-engine");
    if (typeof window.mountWhirledEngine === "function") document.body.classList.add("has-live-engine");
    killCurtain();
  }
  function mountNow() {
    markLive();
    var host = document.getElementById("stage-slot");
    if (!host) return;
    function go(mount) {
      if (typeof mount !== "function") return;
      try { mount(host); document.body.classList.add("has-live-engine"); } catch (e) {}
    }
    if (typeof window.mountWhirledEngine === "function") { go(window.mountWhirledEngine); return; }
    if (window.WhirledChrome && typeof window.WhirledChrome.tryMountEngine === "function") {
      try { window.WhirledChrome.tryMountEngine(); } catch (e2) {}
      return;
    }
    if (window.__whirledEnginePreload) {
      window.__whirledEnginePreload.then(function () { go(window.mountWhirledEngine); });
    }
  }
  document.addEventListener("whirled:ready", function () { mountNow(); });
  document.addEventListener("DOMContentLoaded", function () { mountNow(); });
  try {
    new MutationObserver(function () { killCurtain(); markLive(); }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e3) {}
  setInterval(function () { killCurtain(); markLive(); }, 250);
})();
