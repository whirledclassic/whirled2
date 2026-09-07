/* whirled2/web-mock/src/landscape-fix.js ?v=20260907b */
(function () {
  "use strict";
  if (window.__whirledLandFix) return;
  window.__whirledLandFix = true;
  function shortLand() {
    var land = false, coarse = false;
    try { land = window.matchMedia("(orientation: landscape)").matches; } catch (e) {}
    try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch (e2) {}
    return land && (window.innerHeight <= 640 || (coarse && window.innerHeight <= 720));
  }
  function inRooms() {
    var app = document.getElementById("app");
    return !!(app && app.getAttribute("data-tab") === "rooms");
  }
  function apply() {
    var on = inRooms() && shortLand();
    document.documentElement.classList.toggle("w2-land-room", on);
    document.body.classList.toggle("room-immersive", on || document.documentElement.classList.contains("w2-room-fs"));
    var host = document.querySelector("#app[data-tab='rooms'] .stage-host");
    var slot = document.getElementById("stage-slot");
    if (on && host && slot) {
      slot.style.width = "100%";
      slot.style.height = "100%";
      slot.style.maxWidth = "none";
      host.style.minHeight = "100%";
      host.style.height = "100%";
    }
    var cluster = document.querySelector(".room-view-cluster");
    var dock = document.getElementById("w2-view-float");
    if (on && cluster) {
      if (!dock) { dock = document.createElement("div"); dock.id = "w2-view-float"; document.body.appendChild(dock); }
      if (cluster.parentNode !== dock) dock.appendChild(cluster);
    } else if (dock && cluster) {
      var strip = document.querySelector(".room-strip");
      if (strip && cluster.parentNode === dock) strip.appendChild(cluster);
    }
  }
  window.addEventListener("resize", apply, { passive: true });
  window.addEventListener("orientationchange", function () { setTimeout(apply, 60); });
  document.addEventListener("whirled:ready", apply);
  document.addEventListener("whirled:roomChanged", apply);
  setInterval(apply, 500);
  apply();
})();
