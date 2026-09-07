/* whirled2/web-mock/src/membership.js ?v=20260907b */
(function () {
  "use strict";
  if (window.__whirledMembership) return;
  window.__whirledMembership = true;
  var KEY = "whirled2.membership";
  function sessionUser() {
    try {
      if (window.WhirledApi && WhirledApi.session) {
        var s = WhirledApi.session();
        if (s && s.user) return s.user;
      }
    } catch (e) {}
    try {
      var raw = JSON.parse(localStorage.getItem("whirled2.session") || "null");
      return raw && raw.user ? raw.user : null;
    } catch (e2) { return null; }
  }
  function uid() { var u = sessionUser(); return u && u.id ? String(u.id) : ""; }
  function uname() { var u = sessionUser(); return u && u.name ? String(u.name) : ""; }
  function loadAll() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function saveAll(map) { try { localStorage.setItem(KEY, JSON.stringify(map || {})); } catch (e) {} }
  function rec(id) { return loadAll()[String(id)] || { member: false, creator: false, pendingCreator: false }; }
  function write(id, patch) {
    id = String(id || ""); if (!id) return rec(id);
    var map = loadAll();
    var cur = map[id] || { member: false, creator: false, pendingCreator: false };
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) cur[k] = patch[k];
    map[id] = cur; saveAll(map); return cur;
  }
  function isDev() {
    var id = uid().toLowerCase(), name = uname().toLowerCase();
    if (id === "test" || id === "admin" || name === "test" || name === "admin") return true;
    try { var roles = JSON.parse(localStorage.getItem("whirled2.roles") || "{}"); if (roles[uid()] === "admin") return true; } catch (e) {}
    try { var adm = JSON.parse(localStorage.getItem("whirled2.admins") || "[]"); if (adm.indexOf(uid()) >= 0) return true; } catch (e2) {}
    return localStorage.getItem("whirled2.forceAdmin") === "1";
  }
  function isMod() {
    if (isDev()) return true;
    try { var roles = JSON.parse(localStorage.getItem("whirled2.roles") || "{}"); return roles[uid()] === "mod" || roles[uid()] === "admin"; } catch (e) { return false; }
  }
  function isMember() { return isDev() || !!rec(uid()).member; }
  function isCreator() { return isDev() || !!(rec(uid()).creator && rec(uid()).member); }
  function canUploadAvatar() { return isDev() || isCreator(); }
  window.WhirledMembership = {
    isDev: isDev, isMod: isMod, isMember: isMember, isCreator: isCreator, canUploadAvatar: canUploadAvatar,
    grant: function (id, flags, by) {
      if (!isMod()) return null;
      return write(id, { member: !!flags.member, creator: !!flags.creator, pendingCreator: false, grantedBy: String(by || uid() || "staff"), grantedAt: new Date().toISOString() });
    }
  };
  function toast(text) {
    var n = document.getElementById("w2-member-toast");
    if (!n) { n = document.createElement("div"); n.id = "w2-member-toast"; n.className = "w2-member-toast"; document.body.appendChild(n); }
    n.textContent = text; n.classList.add("is-on");
    setTimeout(function () { n.classList.remove("is-on"); }, 2600);
  }
  function lockPurchases() {
    var page = document.querySelector(".club-page");
    if (page && !page.querySelector(".w2-member-lock-note")) {
      var note = document.createElement("p");
      note.className = "meta w2-member-lock-note";
      note.textContent = "Checkout is built but locked. Join / Buy cannot make you a member. A moderator or developer can grant membership.";
      var hero = page.querySelector(".club-hero"); if (hero) hero.appendChild(note);
    }
    var btns = document.querySelectorAll(".club-tier-cta, [data-club-buy], [data-buy-membership], [data-join-club]");
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      b.disabled = false;
      b.setAttribute("aria-disabled", "true");
      b.classList.add("w2-pay-locked");
      if (!b.getAttribute("data-w2-locked")) {
        b.setAttribute("data-w2-locked", "1");
        if (!/coming soon|free —|locked/i.test(b.textContent || "")) b.textContent = (b.textContent || "Join") + " — locked";
      }
    }
    if (page && isMod() && !page.querySelector("#w2-staff-grant")) {
      var staff = document.createElement("div");
      staff.className = "panel w2-staff-grant"; staff.id = "w2-staff-grant";
      staff.innerHTML = "<h2>Staff: grant membership</h2><p class=\"meta\">Only way a player becomes a member while payments are off.</p><label>User id <input id=\"w2-grant-id\" maxlength=\"80\" /></label><label class=\"check-row\"><input type=\"checkbox\" id=\"w2-grant-member\" checked /> Member</label><label class=\"check-row\"><input type=\"checkbox\" id=\"w2-grant-creator\" /> Creator</label><button type=\"button\" class=\"action-btn\" id=\"w2-grant-btn\">Grant</button>";
      page.appendChild(staff);
    }
    if (page && sessionUser() && !page.querySelector("#w2-creator-apply")) {
      var apply = document.createElement("div"); apply.className = "panel"; apply.id = "w2-creator-apply";
      var st = rec(uid());
      apply.innerHTML = "<h2>Become a creator</h2><p class=\"meta\">Creators must be members. Checkout cannot grant that. Apply; staff grant the flags.</p><p class=\"meta\">You: " + (isDev() ? "developer" : (isCreator() ? "creator" : (isMember() ? "member" : "free player"))) + (st.pendingCreator ? " · pending" : "") + "</p><button type=\"button\" class=\"action-btn\" id=\"w2-apply-creator\">Apply as creator</button>";
      page.appendChild(apply);
    }
  }
  function lockAvatarUpload() {
    var app = document.getElementById("app");
    if (!app || app.getAttribute("data-tab") !== "stuff") return;
    if (canUploadAvatar()) { var old = document.getElementById("w2-avatar-gate"); if (old) old.remove(); return; }
    var uploadBtns = document.querySelectorAll('[data-stuff-mode="upload"], #classic-avatar-upload-form button, .classic-avatar-form button');
    for (var i = 0; i < uploadBtns.length; i++) uploadBtns[i].setAttribute("data-w2-avatar-lock", "1");
    var main = document.querySelector(".stuff-main") || document.querySelector(".stuff-page");
    if (main && !document.getElementById("w2-avatar-gate")) {
      var gate = document.createElement("div"); gate.id = "w2-avatar-gate"; gate.className = "panel w2-avatar-gate";
      gate.innerHTML = "<h3>Avatar upload is for creators</h3><p class=\"meta\">Only creators and developers can upload avatars. Membership Join cannot grant this. A moderator can.</p><button type=\"button\" class=\"text-btn\" data-tab=\"me\" data-me=\"club\">Open Club / Membership</button>";
      main.insertBefore(gate, main.firstChild);
    }
    var form = document.getElementById("classic-avatar-upload-form");
    if (form) {
      var fields = form.querySelectorAll("input, button, textarea, select");
      for (var f = 0; f < fields.length; f++) fields[f].disabled = true;
    }
  }
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest("button, a, [data-club-buy], [data-stuff-mode]") : null;
    if (!t) return;
    if (t.id === "w2-grant-btn") {
      ev.preventDefault(); ev.stopPropagation();
      if (!isMod()) { toast("Staff only."); return; }
      var idEl = document.getElementById("w2-grant-id");
      var id = idEl && idEl.value ? idEl.value.trim() : "";
      if (!id) { toast("Enter a user id."); return; }
      var member = !!(document.getElementById("w2-grant-member") && document.getElementById("w2-grant-member").checked);
      var creator = !!(document.getElementById("w2-grant-creator") && document.getElementById("w2-grant-creator").checked);
      if (creator) member = true;
      window.WhirledMembership.grant(id, { member: member, creator: creator }, uname() || uid());
      toast("Granted to " + id + "."); return;
    }
    if (t.id === "w2-apply-creator") {
      ev.preventDefault(); ev.stopPropagation();
      if (!uid()) { toast("Log in first."); return; }
      write(uid(), { pendingCreator: true });
      toast("Application saved. Staff must grant creator. Join cannot."); return;
    }
    if (t.classList.contains("club-tier-cta") || t.hasAttribute("data-club-buy") || t.hasAttribute("data-buy-membership") || t.hasAttribute("data-join-club") || t.classList.contains("w2-pay-locked")) {
      ev.preventDefault(); ev.stopPropagation();
      toast("Payments are off. That button cannot make you a member."); return;
    }
    if (t.getAttribute("data-w2-avatar-lock") === "1" || t.getAttribute("data-stuff-mode") === "upload") {
      if (!canUploadAvatar()) {
        ev.preventDefault(); ev.stopPropagation();
        toast("Avatar upload is for creators and developers.");
      }
    }
  }, true);
  document.addEventListener("submit", function (ev) {
    if (ev.target && ev.target.id === "classic-avatar-upload-form" && !canUploadAvatar()) {
      ev.preventDefault(); ev.stopPropagation(); toast("Avatar upload is for creators and developers.");
    }
  }, true);
  function tick() { lockPurchases(); lockAvatarUpload(); }
  document.addEventListener("whirled:ready", tick);
  setInterval(tick, 700);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick); else tick();
})();
