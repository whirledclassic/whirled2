/* Stuff shelf cleanup + help link ?v=20260907c */
(function () {
  if (window.__whirledStuffClean) return;
  window.__whirledStuffClean = true;
  function canUpload() {
    return !!(window.WhirledMembership && WhirledMembership.canUploadAvatar && WhirledMembership.canUploadAvatar());
  }
  function onAvatars() {
    var t = document.querySelector(".stuff-cat-title");
    return !!(t && /avatar/i.test(t.textContent || ""));
  }
  function bar() {
    var app = document.getElementById("app");
    if (!app || app.getAttribute("data-tab") !== "stuff") {
      var old = document.getElementById("w2-stuff-bar");
      if (old) old.remove();
      return;
    }
    var main = document.querySelector(".stuff-main") || document.querySelector(".stuff-page");
    if (!main) return;
    var el = document.getElementById("w2-stuff-bar");
    if (!el) {
      el = document.createElement("div");
      el.id = "w2-stuff-bar";
      el.className = "w2-stuff-bar";
      main.insertBefore(el, main.firstChild);
    }
    var upload = canUpload() && onAvatars();
    el.innerHTML =
      '<a href="./avatar-help.html">How avatars work</a>' +
      (onAvatars() ? (upload
        ? '<span class="meta">Creators can upload</span>'
        : '<span class="meta">Upload locked — membership / creator</span>') : '');
  }
  document.addEventListener("whirled:ready", bar);
  setInterval(bar, 800);
  bar();
})();
