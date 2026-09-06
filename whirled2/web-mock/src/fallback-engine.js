/* whirled2/web-mock/src/fallback-engine.js
 * ?v=20260906cv
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
    tryRemote(host);
    if (typeof prev === "function" && prev !== root.mountWhirledEngine) {
      try { return prev(host); } catch (e) {}
    }
  };
})(window);
