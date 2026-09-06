/* whirled2/web-mock/src/stage-fix.js
 * ?v=20260906cz
 * Chrome-only. Always put a visible loft into #stage-slot.
 */
(function () {
  "use strict";
  if (window.__whirledStageFix2) return;
  window.__whirledStageFix2 = true;

  var css = document.createElement("style");
  css.textContent =
    ".stage-host,#stage-slot{" +
    "min-height:46vh!important;position:relative!important;overflow:hidden!important;" +
    "background:linear-gradient(180deg,#7ec4ea 0%,#6eb7d8 55%,#c9a36a 55%,#b8925a 100%)!important;}" +
    "#stage-slot .loft-backdrop{position:absolute;inset:0;}" +
    "#stage-slot canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;}" +
    ".loft-hint-engine-waiting,.avatar-engine-waiting-note{display:none!important;}";
  document.documentElement.appendChild(css);

  var LOFT =
    '<div class="loft-backdrop" aria-hidden="true">' +
    '<div class="loft-sky"></div>' +
    '<div class="loft-walls"><div class="loft-wall loft-wall-l"></div>' +
    '<div class="loft-wall loft-wall-r"></div><div class="loft-corner"></div></div>' +
    '<div class="loft-floor"><div class="loft-floor-grid"></div></div>' +
    '</div>';

  function fill() {
    var host = document.querySelector(".stage-host");
    var slot = document.getElementById("stage-slot");
    if (!host && !slot) return;
    if (!slot && host) {
      slot = document.createElement("div");
      slot.id = "stage-slot";
      host.insertBefore(slot, host.firstChild);
    }
    if (!slot) return;
    if (slot.querySelector("canvas")) return;
    if (!slot.querySelector(".loft-backdrop")) {
      slot.innerHTML = LOFT;
    }
    if (typeof window.mountWhirledEngine === "function") {
      try { window.mountWhirledEngine(slot); } catch (e) {}
    }
  }

  document.addEventListener("whirled:ready", fill);
  document.addEventListener("whirled:roomChanged", fill);
  setInterval(fill, 400);
})();
