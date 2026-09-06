/* whirled2/web-mock/src/engine-instant.js
 * ?v=20260906ct
 * Safe: CSS only + optional modulepreload. No MutationObserver. No setInterval.
 */
(function () {
  "use strict";
  try {
    if (!document.getElementById("whirled-engine-instant-css")) {
      var css = document.createElement("style");
      css.id = "whirled-engine-instant-css";
      css.textContent =
        "#room-enter-curtain,.room-enter-curtain{display:none!important;}" +
        "#stage-slot canvas{display:block;width:100%;height:100%;}";
      (document.head || document.documentElement).appendChild(css);
    }
  } catch (e) {}

  var url = "";
  try {
    var q = String(location.search || "");
    var m = /(?:\?|&)engineSrc=([^&]+)/.exec(q);
    if (m && m[1]) url = decodeURIComponent(m[1]);
  } catch (e2) {}
  if (!url) {
    try { url = localStorage.getItem("whirled2.engineSrc") || ""; } catch (e3) {}
  }
  if (!url || !/^https?:/i.test(url)) return;
  try {
    var link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = url;
    (document.head || document.documentElement).appendChild(link);
  } catch (e4) {}
})();
