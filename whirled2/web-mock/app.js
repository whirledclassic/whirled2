/* Preview of src/*.ts. No Pixi. Open index.html. */
(function () {
  "use strict";
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" })[ch];
    });
  }
  var YOU = { name: "Josh", initials: "J" };
  var PEOPLE = [
    { name: "Josh", initials: "J", online: true, room: "Studio Loft", you: true },
    { name: "Brittney", initials: "B", online: true, room: "Studio Loft" },
    { name: "Agent Vortex", initials: "AV", online: true, room: "Studio Loft" },
    { name: "Pletou", initials: "P", online: true, room: "Secret Glade" }
  ];
  var STUFF = [
    { kind: "avatar", name: "Inkcoat Josh", creator: "Josh", owned: true, coins: 0 },
    { kind: "furniture", name: "Oak table", creator: "Brittney", owned: true, coins: 40 },
    { kind: "backdrop", name: "Cream loft wall", creator: "Josh", owned: true, coins: 0 }
  ];
  var SHOP = [
    { kind: "avatar", name: "Paper fox", creator: "Pletou", owned: false, coins: 80 },
    { kind: "furniture", name: "Window seat", creator: "Brittney", owned: false, coins: 60 },
    { kind: "backdrop", name: "Two-moon night", creator: "Vortex", owned: false, coins: 120 },
    { kind: "toy", name: "Click-plant", creator: "Cleaver", owned: false, coins: 20 }
  ];
  var FEED = [
    { who: "Brittney", text: "walked into Studio Loft", place: "room", ago: "2m" },
    { who: "Josh", text: "is wiring the page around an empty stage", place: "status", ago: "18m" },
    { who: "Agent Vortex", text: "commented: needs a plant", place: "comments", ago: "1h" }
  ];
  function personRow(p) {
    return '<div class="person"><span class="ava' + (p.you ? " you" : "") + '">' + esc(p.initials) +
      '</span><span>' + esc(p.name) + (p.you ? " <span class='sub'>(you)</span>" : "") +
      '</span><span class="dot' + (p.online ? " on" : "") + '"></span><span class="sub">' +
      esc(p.you ? "you" : p.room) + '</span></div>';
  }
  function feedRow(ev) {
    return '<div class="feed-row"><span class="ava">' + esc(ev.who.slice(0, 1)) +
      '</span><div><b>' + esc(ev.who) + '</b> ' + esc(ev.text) +
      '<time>' + esc(ev.ago) + ' · ' + esc(ev.place) + '</time></div></div>';
  }
  function card(item) {
    var tone = item.kind === "backdrop" ? "night" : item.kind === "avatar" ? "fox" : "";
    return '<article class="card" data-kind="' + item.kind + '"><div class="swatch ' + tone +
      '"></div><div class="body"><h3>' + esc(item.name) + '</h3><p class="meta">' +
      esc(item.kind) + ' · ' + esc(item.creator) + '</p><div class="price">' +
      (item.owned ? "owned" : item.coins + " coins") + '</div></div></article>';
  }
  function catalog(title, blurb, items) {
    return '<section class="page"><div class="page-head"><div><h1>' + esc(title) +
      '</h1><p>' + esc(blurb) + '</p></div></div><div class="grid" id="catalog-grid">' +
      items.map(card).join("") + '</div></section>';
  }
  function rooms() {
    var here = PEOPLE.filter(function (p) { return p.room === "Studio Loft"; });
    return '<div class="workspace"><aside class="rail"><h2>In this room</h2>' +
      here.map(personRow).join("") + '</aside><section class="stage-wrap">' +
      '<div class="room-flag"><b>Studio Loft</b>owner: Josh · unlocked</div>' +
      '<div id="stage-slot"><div class="stage-copy"><strong>Engine mounts here</strong>' +
      'Leave this rectangle empty. Click-to-walk belongs to the game repo.' +
      '<code>#stage-slot</code></div></div></section>' +
      '<aside class="rail rail--end"><h2>Profile</h2><div class="profile-card">' +
      '<div class="ava lg you">J</div><h3>Josh</h3>' +
      '<p class="meta">home · Studio Loft · Providence</p>' +
      '<p>Room first. Shop never-first.</p></div><h2>Status</h2>' +
      '<form class="status-form" id="status-form">' +
      '<input id="status-input" maxlength="140" placeholder="What is happening in this room?" />' +
      '<button type="submit">Post</button></form><div id="feed-list">' +
      FEED.map(feedRow).join("") + '</div></aside></div>';
  }
  function me() {
    return '<section class="page"><div class="hero"><div>' +
      '<div class="ava lg you">J</div><h1>Josh</h1>' +
      '<p>Home room is the profile. Friends walk into Studio Loft.</p></div>' +
      '<div class="card"><div class="swatch"></div><div class="body">' +
      '<h3>Studio Loft</h3><p class="meta">home · unlocked</p></div></div></div></section>';
  }
  function paint(tab) {
    document.querySelectorAll(".tab").forEach(function (btn) {
      btn.classList.toggle("is-on", btn.getAttribute("data-tab") === tab);
    });
    var main = document.getElementById("main");
    if (!main) return;
    if (tab === "rooms") main.innerHTML = rooms();
    else if (tab === "me") main.innerHTML = me();
    else if (tab === "stuff") main.innerHTML = catalog("Stuff", "What you already own.", STUFF);
    else if (tab === "shop") main.innerHTML = catalog("Shop", "Coins are labels only. Do not wire payments.", SHOP);
    else if (tab === "games") main.innerHTML = '<section class="page"><h1>Games</h1><p class="meta">In-room toys. Not this cycle.</p></section>';
    else main.innerHTML = '<section class="page"><h1>Groups</h1><p class="meta">Shared whirleds. We do not copy whirled.club data.</p></section>';
  }
  var app = document.getElementById("app");
  app.innerHTML =
    '<header class="topbar"><a class="brand" href="#rooms"><b>Whirled 2</b><small>browser room</small></a>' +
    '<nav class="tabs">' +
    [["me","Me"],["stuff","Stuff"],["games","Games"],["rooms","Rooms"],["groups","Groups"],["shop","Shop"]].map(function (t) {
      return '<button class="tab' + (t[0] === "rooms" ? " is-on" : "") + '" type="button" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join("") +
    '</nav><div class="who"><span class="pill">coins 0</span><span>signed in as <b>Josh</b></span></div></header>' +
    '<div class="note">Fan remake chrome. The dashed rectangle is the only place the engine may draw.</div>' +
    '<div id="main"></div>' +
    '<form class="bar" id="chat-form"><input id="chat-input" placeholder="Say something in Studio Loft…" />' +
    '<button class="send" type="submit">Send</button>' +
    '<button type="button" data-tab="rooms">Go</button>' +
    '<button type="button" data-tab="me">Me</button><span class="grow"></span></form>';
  paint("rooms");
  app.addEventListener("click", function (ev) {
    var tab = ev.target.closest("[data-tab]");
    if (tab && tab.getAttribute("data-tab")) paint(tab.getAttribute("data-tab"));
  });
  app.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var input = ev.target.querySelector("input");
    var list = document.getElementById("feed-list");
    var text = input && input.value.trim();
    if (!text) return;
    if (!list) { paint("rooms"); list = document.getElementById("feed-list"); }
    if (list) list.insertAdjacentHTML("afterbegin", feedRow({ who: "Josh", text: text, place: "status", ago: "just now" }));
    input.value = "";
  });
})();
