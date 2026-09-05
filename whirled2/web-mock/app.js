/* Whirled 2 page chrome. Classic whirled.club layout. No Pixi. */
(function () {
  "use strict";
  var LOGO = "./assets/whirled-classic-logo.png";
  var LOGO_FALLBACK = "./assets/logo.svg";
  function logoImg(cls) {
    var wh = cls.indexOf("gate") >= 0 ? ' width="180" height="120"' : ' width="120" height="48"';
    return '<img class="' + cls + '" alt="Whirled Classic" src="' + LOGO + '"' + wh + ' decoding="async" onerror="this.onerror=null;this.src=\'' + LOGO_FALLBACK + '\'" />';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  var PEOPLE = [
    { name: "Brittney", initials: "B", online: true, room: "Studio Loft" },
    { name: "Agent Vortex", initials: "AV", online: true, room: "Studio Loft" },
    { name: "Pletou", initials: "P", online: true, room: "Secret Glade" }
  ];
  var STUFF = [
    { kind: "avatar", name: "Inkcoat default", creator: "you", owned: true, coins: 0 },
    { kind: "furniture", name: "Oak table", creator: "Brittney", owned: true, coins: 40 },
    { kind: "backdrop", name: "Loft wall", creator: "you", owned: true, coins: 0 }
  ];
  var SHOP = [
    { kind: "avatar", name: "Paper fox", creator: "Pletou", owned: false, coins: 80 },
    { kind: "furniture", name: "Window seat", creator: "Brittney", owned: false, coins: 60 },
    { kind: "backdrop", name: "Two-moon night", creator: "Vortex", owned: false, coins: 120 },
    { kind: "toy", name: "Click-plant", creator: "Cleaver", owned: false, coins: 20 }
  ];
  var FEED = [
    { who: "Brittney", text: "walked into Studio Loft", place: "room", ago: "2m" },
    { who: "Agent Vortex", text: "commented: needs a plant", place: "comments", ago: "1h" }
  ];
  var ROOM = "Studio Loft";
  var chat = [];
  var pollTimer = null;
  var listeners = { chat: [], occupants: [] };
  function session() { return window.WhirledApi ? window.WhirledApi.session() : null; }
  function you() {
    var s = session();
    if (s && s.user) {
      return { name: s.user.name, initials: s.user.initials || s.user.name.slice(0, 1).toUpperCase(), bio: s.user.bio || "", coins: s.user.coins || 0, room: s.user.room || ROOM };
    }
    return { name: "Guest", initials: "?", bio: "", coins: 0, room: ROOM };
  }
  function personRow(p) {
    return '<div class="person"><span class="ava' + (p.you ? " you" : "") + '">' + esc(p.initials) + '</span><span>' + esc(p.name) + (p.you ? " <span class='sub'>(you)</span>" : "") + '</span><span class="dot' + (p.online ? " on" : "") + '"></span><span class="sub">' + esc(p.you ? "you" : p.room) + "</span></div>";
  }
  function feedRow(ev) {
    return '<div class="feed-row"><span class="ava">' + esc(ev.who.slice(0, 1)) + "</span><div><b>" + esc(ev.who) + "</b> " + esc(ev.text) + "<time>" + esc(ev.ago || "just now") + " · " + esc(ev.place || "status") + "</time></div></div>";
  }
  function chatRow(msg) {
    var stamp = "";
    try { stamp = new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) {}
    return '<div class="chat-row"><b>' + esc(msg.who) + "</b> <time>" + esc(stamp) + "</time><div>" + esc(msg.text) + "</div></div>";
  }
  function card(item) {
    var tone = item.kind === "backdrop" ? "night" : item.kind === "avatar" ? "fox" : "";
    return '<article class="card"><div class="swatch ' + tone + '"></div><div class="body"><h3>' + esc(item.name) + '</h3><p class="meta">' + esc(item.kind) + " · " + esc(item.creator) + '</p><div class="price">' + (item.owned ? "owned" : item.coins + " coins") + "</div></div></article>";
  }
  function catalog(title, blurb, items) {
    return '<section class="page"><div class="page-head"><div><h1>' + esc(title) + '</h1><p>' + esc(blurb) + '</p></div></div><div class="grid">' + items.map(card).join('') + '</div></section>';
  }
  function rooms() {
    var me = you();
    var here = [{ name: me.name, initials: me.initials, online: true, room: ROOM, you: true }].concat(PEOPLE.filter(function (p) { return p.room === ROOM; }));
    return '<div class="workspace"><aside class="rail"><h2>In this room</h2>' + here.map(personRow).join('') + '</aside><section class="stage-wrap"><div class="room-flag"><b>' + esc(ROOM) + '</b>owner: ' + esc(me.name) + '</div><div id="stage-slot"><div class="stage-copy"><strong>Engine mounts here</strong>Click-to-walk belongs to the room engine.<code>#stage-slot</code></div></div><div class="chat-log" id="chat-log">' + chat.map(chatRow).join('') + '</div></section></div>';
  }
  function mePage() {
    var me = you();
    return '<section class="page"><div class="hero"><div><div class="ava lg you">' + esc(me.initials) + '</div><h1>' + esc(me.name) + '</h1><p>Home room is the profile.</p><form class="profile-form" id="profile-form"><label>Display name <input name="name" maxlength="24" value="' + esc(me.name) + '" /></label><label>Bio <input name="bio" maxlength="180" value="' + esc(me.bio) + '" /></label><button type="submit">Save profile</button><p class="meta" id="profile-msg"></p></form></div><div class="card"><div class="swatch"></div><div class="body"><h3>Studio Loft</h3><p class="meta">home · unlocked</p></div></div></div></section>';
  }
  function gate() {
    return '<section class="gate"><div class="gate-card">' + logoImg("gate-logo") + '<p class="eyebrow">Whirled Classic</p><h1>Welcome to Whirled</h1><p>Register or log in. Same tab strip as whirled.club: Me, Stuff, Games, Rooms, Groups, Shop.</p><div class="gate-grid"><form id="register-form"><h2>Register</h2><input name="name" autocomplete="username" placeholder="Display name" required /><input name="password" type="password" autocomplete="new-password" placeholder="Password" required /><button type="submit">Create account</button></form><form id="login-form"><h2>Log in</h2><input name="name" autocomplete="username" placeholder="Display name" required /><input name="password" type="password" autocomplete="current-password" placeholder="Password" required /><button type="submit">Log in</button></form></div><p class="gate-err" id="gate-err"></p><p class="meta">Offline preview stays in this browser. Run server/server.mjs to share chat.</p></div></section>';
  }
  function shell() {
    var me = you();
    return '<header class="topbar"><a class="brand" href="#rooms">' + logoImg("logo") + '<span class="sr-only">Whirled Classic</span></a><nav class="tabs">' + [["me","Me"],["stuff","Stuff"],["games","Games"],["rooms","Rooms"],["groups","Groups"],["shop","Shop"]].map(function (t) { return '<button class="tab' + (t[0] === "rooms" ? " is-on" : "") + '" type="button" data-tab="' + t[0] + '">' + t[1] + "</button>"; }).join("") + '</nav><div class="who"><div class="row"><b>' + esc(me.name) + '</b><button type="button" id="logout-btn" class="text-btn">Logoff</button><span class="text-btn">Help</span></div><div class="row"><span class="pill">' + me.coins + ' coins</span><span>Lv 1</span></div></div></header><div id="main"></div><form class="bar" id="chat-form"><input id="chat-input" maxlength="240" placeholder="" /><button class="send" type="submit">send</button><span class="tools" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="grow"></span></form>';
  }
  function paint(tab) {
    if (!session()) {
      document.getElementById("app").innerHTML = gate();
      document.getElementById("app").setAttribute("data-tab", "gate");
      bindGate();
      try { window.__whirledBoot = true; } catch (e) {}
      return;
    }
    if (!document.getElementById("main")) document.getElementById("app").innerHTML = shell();
    document.getElementById("app").setAttribute("data-tab", tab || "rooms");
    document.querySelectorAll(".tab").forEach(function (btn) { btn.classList.toggle("is-on", btn.getAttribute("data-tab") === tab); });
    var main = document.getElementById("main");
    if (!main) return;
    if (tab === "rooms") main.innerHTML = rooms();
    else if (tab === "me") main.innerHTML = mePage();
    else if (tab === "stuff") main.innerHTML = catalog("Stuff", "What you already own.", STUFF);
    else if (tab === "shop") main.innerHTML = catalog("Shop", "Coins are labels only.", SHOP);
    else if (tab === "games") main.innerHTML = '<section class="page"><h1>Games</h1><p class="meta">Play from a room toy. Not this cycle.</p></section>';
    else main.innerHTML = '<section class="page"><h1>Groups</h1><p class="meta">Shared whirleds.</p></section>';
    refreshChatLog();
    exposeBridge();
  }
  function refreshChatLog() {
    var log = document.getElementById("chat-log");
    if (!log) return;
    log.innerHTML = chat.map(chatRow).join("");
    log.scrollTop = log.scrollHeight;
  }
  function bindGate() {
    var err = document.getElementById("gate-err");
    function hook(id, fn) {
      var form = document.getElementById(id);
      if (!form) return;
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var data = new FormData(form);
        fn(data.get("name"), data.get("password")).then(function () { boot(); }).catch(function (e) { if (err) err.textContent = e.message || String(e); });
      });
    }
    hook("register-form", window.WhirledApi.register);
    hook("login-form", window.WhirledApi.login);
  }
  function exposeBridge() {
    window.WhirledChrome = {
      version: "0.4",
      getStageEl: function () { return document.getElementById("stage-slot"); },
      getSession: function () { return session(); },
      getRoom: function () { return { id: "loft", name: ROOM }; },
      onChat: function (fn) { listeners.chat.push(fn); },
      sendChat: function (text) { return window.WhirledApi.postChat("loft", text); },
      onOccupants: function (fn) { listeners.occupants.push(fn); fn(occupants()); }
    };
    document.dispatchEvent(new CustomEvent("whirled:ready", { detail: window.WhirledChrome }));
  }
  function occupants() {
    var me = you();
    return [{ id: session() && session().user.id, name: me.name, you: true }].concat(PEOPLE.filter(function (p) { return p.room === ROOM; }));
  }
  async function pushChat(text) {
    var result = await window.WhirledApi.postChat("loft", text);
    var msg = result.message || result;
    if (!chat.some(function (m) { return m.id === msg.id; })) chat.push(msg);
    refreshChatLog();
    listeners.chat.forEach(function (fn) { try { fn(msg); } catch (e) {} });
  }
  async function loadHistory() {
    var result = await window.WhirledApi.history("loft");
    chat = result.messages || [];
    refreshChatLog();
  }
  function startPoll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async function () {
      if (!session()) return;
      var result = await window.WhirledApi.pollChat("loft");
      var next = result.messages || [];
      if (next.length !== chat.length) { chat = next; refreshChatLog(); }
    }, 2500);
  }
  function boot() {
    paint(session() ? "rooms" : "");
    if (session()) { loadHistory(); startPoll(); }
    try { window.__whirledBoot = true; } catch (e) {}
  }

  function onVisible() {
    if (!session()) {
      if (document.getElementById("gate-err") || document.querySelector(".gate")) return;
      paint("");
      return;
    }
    if (!document.getElementById("main")) {
      boot();
      return;
    }
    loadHistory();
    startPoll();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") onVisible();
  });
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) onVisible();
  });
  window.addEventListener("storage", function (ev) {
    if (!ev.key) return;
    if (ev.key === "whirled2.session") {
      boot();
      return;
    }
    if (ev.key.indexOf("whirled2.chat.") === 0 && session()) {
      loadHistory();
    }
  });

  var app = document.getElementById("app");
  boot();
  app.addEventListener("click", function (ev) {
    if (ev.target.id === "logout-btn") { window.WhirledApi.logout(); chat = []; paint(""); return; }
    var tab = ev.target.closest("[data-tab]");
    if (tab && tab.getAttribute("data-tab") && session()) paint(tab.getAttribute("data-tab"));
  });
  app.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (ev.target.id === "profile-form") {
      var data = new FormData(ev.target);
      var msg = document.getElementById("profile-msg");
      window.WhirledApi.saveProfile({ name: data.get("name"), bio: data.get("bio") }).then(function () { if (msg) msg.textContent = "Saved."; paint("me"); }).catch(function (e) { if (msg) msg.textContent = e.message; });
      return;
    }
    var input = ev.target.querySelector("input");
    var text = input && input.value.trim();
    if (!text) return;
    if (ev.target.id === "status-form") {
      var list = document.getElementById("feed-list");
      if (list) list.insertAdjacentHTML("afterbegin", feedRow({ who: you().name, text: text, place: "status", ago: "just now" }));
      input.value = "";
      return;
    }
    if (ev.target.id === "chat-form") { pushChat(text); input.value = ""; }
  });
})();
