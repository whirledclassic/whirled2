/* whirled2/web-mock/src/stage-fix.js
 * ?v=20260906cx
 * Chrome-only. If paint leaves an empty loft, remount instant + Pixi.
 * Does not touch Nabir / WhirledClassicGame.
 */
(function () {
  "use strict";
  if (window.__whirledStageFix) return;
  window.__whirledStageFix = true;

  var css = document.createElement("style");
  css.textContent =
    ".stage-host,#stage-slot{min-height:42vh!important;position:relative!important;background:#6eb7d8!important;}" +
    "#stage-slot canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;}" +
    "@media (max-width:700px){#stage-slot{max-height:none!important;min-height:46vh!important;}}";
  document.documentElement.appendChild(css);

  function slot() { return document.getElementById("stage-slot"); }

  function empty(el) {
    if (!el) return true;
    return !el.querySelector("canvas");
  }

  function fill() {
    var el = slot();
    if (!el) return;
    if (!empty(el)) return;
    if (typeof window.mountWhirledEngine === "function") {
      try { window.mountWhirledEngine(el); } catch (e) {}
    }
  }

  document.addEventListener("whirled:ready", function () {
    setTimeout(fill, 0);
    setTimeout(fill, 200);
    setTimeout(fill, 800);
  });
  document.addEventListener("whirled:roomChanged", function () { setTimeout(fill, 0); });

  var n = 0;
  var t = setInterval(function () {
    fill();
    n += 1;
    if (n > 20) clearInterval(t);
  }, 300);
})();
