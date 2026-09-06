/* whirled2/web-mock/src/engine-sync.js
 * ?v=20260906da
 * Insert the engine module into #stage-slot and keep room/wear in sync.
 * Does not touch WhirledClassicGame.
 */
(function () {
  "use strict";
  if (window.__whirledEngineSync) return;
  window.__whirledEngineSync = true;

  function slot() {
    return document.getElementById("stage-slot");
  }

  function payload() {
    var room = { id: "loft", name: "Studio Loft", items: [] };
    try {
      if (window.WhirledChrome && window.WhirledChrome.getRoom) {
        room = Object.assign(room, window.WhirledChrome.getRoom() || {});
      }
    } catch (e) {}
    try {
      if (window.WhirledChrome && window.WhirledChrome.getRoomItems) {
        var items = window.WhirledChrome.getRoomItems(room.id);
        if (items) room.items = items.items || items || [];
      }
    } catch (e2) {}
    return room;
  }

  function sync() {
    var room = payload();
    try { document.dispatchEvent(new CustomEvent("whirled:roomChanged", { detail: room })); } catch (e) {}
    try {
      if (window.__whirledEngine && window.__whirledEngine.applyRoom) {
        window.__whirledEngine.applyRoom(room);
      }
    } catch (e2) {}
    try {
      if (window.WhirledChrome && window.WhirledChrome.getWornAvatar) {
        var worn = window.WhirledChrome.getWornAvatar();
        document.dispatchEvent(new CustomEvent("whirled:wearChanged", { detail: worn }));
        if (window.__whirledEngine && window.__whirledEngine.applyAppearance) {
          window.__whirledEngine.applyAppearance(worn);
        }
      }
    } catch (e3) {}
  }

  function mount() {
    var host = slot();
    if (!host) return;
    if (window.WhirledChrome && typeof window.WhirledChrome.tryMountEngine === "function") {
      Promise.resolve(window.WhirledChrome.tryMountEngine()).then(function (ok) {
        if (ok) sync();
      }).catch(function () {});
      return;
    }
    var src = "";
    try {
      if (window.WhirledChrome && window.WhirledChrome.getEngineSrc) src = window.WhirledChrome.getEngineSrc() || "";
    } catch (e) {}
    if (!src) {
      try { src = window.WHIRLED_ENGINE_SRC || ""; } catch (e2) {}
    }
    if (!src) return;
    import(src).then(function (mod) {
      var fn = (mod && (mod.mountWhirledEngine || mod.default)) || window.mountWhirledEngine;
      if (typeof fn !== "function") return;
      return fn(host);
    }).then(function () { sync(); }).catch(function () {});
  }

  document.addEventListener("whirled:ready", function () {
    mount();
    setTimeout(mount, 200);
    setTimeout(sync, 400);
  });
  document.addEventListener("whirled:roomChanged", function () {
    setTimeout(sync, 0);
  });

  var n = 0;
  var t = setInterval(function () {
    if (slot() && !slot().querySelector("canvas")) mount();
    else if (slot() && slot().querySelector("canvas")) sync();
    n += 1;
    if (n > 25) clearInterval(t);
  }, 400);
})();
