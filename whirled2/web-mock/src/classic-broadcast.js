/* whirled2/web-mock/src/classic-broadcast.js
 * Classic /broadcast captions: stacked cream bars over the loft,
 * "Name broadcasts: message" like 2008–2012 club chat.
 * Chrome-only — does not touch #stage-slot engine files.
 */
(function () {
  "use strict";
  if (window.__whirledClassicBroadcast) return;
  window.__whirledClassicBroadcast = true;

  function host() {
    return document.querySelector("#app[data-tab='rooms'] .stage-host") ||
      document.querySelector(".stage-host");
  }

  function stackEl() {
    var h = host();
    if (!h) return null;
    var s = h.querySelector(".classic-bc-stack");
    if (s) return s;
    s = document.createElement("div");
    s.className = "classic-bc-stack";
    s.setAttribute("aria-live", "polite");
    h.appendChild(s);
    return s;
  }

  function textOf(row) {
    var bubble = row.querySelector(".chat-bubble.broadcast");
    if (!bubble) return "";
    return (bubble.textContent || "").replace(/\s+/g, " ").trim();
  }

  function whoOf(row) {
    var w = row.querySelector(".broadcast-who, .chat-who");
    if (w) return (w.textContent || "").trim();
    var t = textOf(row);
    var m = t.match(/^(.*)\s+broadcasts:/i);
    return m ? m[1].trim() : "";
  }

  function msgOf(row) {
    var bubble = row.querySelector(".chat-bubble.broadcast");
    if (!bubble) return "";
    var clone = bubble.cloneNode(true);
    var who = clone.querySelector(".broadcast-who, .broadcast-tag");
    if (who) who.remove();
    return (clone.textContent || "").replace(/^broadcasts:\s*/i, "").trim();
  }

  function sync() {
    var s = stackEl();
    if (!s) return;
    var rows = document.querySelectorAll(".chat-row.is-broadcast, .chat-overlay .chat-row.is-broadcast, .chat-log .chat-row.is-broadcast");
    var seen = {};
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var who = whoOf(row);
      var msg = msgOf(row);
      if (!msg) continue;
      var key = who + "\n" + msg;
      if (seen[key]) continue;
      seen[key] = true;
      items.push({ who: who || "?", msg: msg });
    }
    items = items.slice(-6);
    var html = items.map(function (it) {
      return '<div class="chat-bubble broadcast"><span class="broadcast-who">' +
        escapeHtml(it.who) + "</span> broadcasts: " + escapeHtml(it.msg) + "</div>";
    }).join("");
    if (s.getAttribute("data-html") !== html) {
      s.innerHTML = html;
      s.setAttribute("data-html", html);
    }
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  var obs = new MutationObserver(function () { sync(); });
  function arm() {
    var roots = document.querySelectorAll(".chat-log, .chat-overlay, #app");
    for (var i = 0; i < roots.length; i++) {
      try { obs.observe(roots[i], { childList: true, subtree: true }); } catch (e) {}
    }
    sync();
  }
  document.addEventListener("whirled:ready", arm);
  document.addEventListener("whirled:roomChanged", function () { setTimeout(sync, 40); });
  setInterval(sync, 900);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
  else arm();
})();
