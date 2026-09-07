/* whirled2/web-mock/src/network-sync.js
 * Same-origin tab sync so two browsers/profiles on one machine share
 * chat, mail, groups, roles. GitHub Pages has no server; this is the
 * local network piece until demo server is pointed at WHIRLED_API.
 */
(function () {
  "use strict";
  if (window.__whirledNetSync) return;
  window.__whirledNetSync = true;

  var WATCH = {
    "whirled2.mail": "mail",
    "whirled2.groups": "groups",
    "whirled2.roles": "roles",
    "whirled2.chat.loft": "chat",
    "whirled2.newsletter": "news",
    "whirled2.friends": "friends"
  };

  window.addEventListener("storage", function (ev) {
    if (!ev || !ev.key || !WATCH[ev.key]) return;
    document.dispatchEvent(new CustomEvent("whirled:net", { detail: WATCH[ev.key] }));
    if (WATCH[ev.key] === "chat") {
      try { document.dispatchEvent(new Event("whirled:roomChanged")); } catch (e) {}
    }
  });
})();
