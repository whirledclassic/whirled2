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
  var PEOPLE = []; // real occupants only — filled from presence API / session
  var STUFF = [
    { kind: "avatar", name: "Inkcoat default", creator: "you", owned: true, coins: 0 },
    { kind: "furniture", name: "Oak table", creator: "studio", owned: true, coins: 40 },
    { kind: "backdrop", name: "Loft wall", creator: "you", owned: true, coins: 0 }
  ];
  var SHOP = [
    { kind: "avatar", name: "Paper fox", creator: "shop", owned: false, coins: 80 },
    { kind: "furniture", name: "Window seat", creator: "studio", owned: false, coins: 60 },
    { kind: "backdrop", name: "Two-moon night", creator: "shop", owned: false, coins: 120 },
    { kind: "toy", name: "Click-plant", creator: "shop", owned: false, coins: 20 }
  ];
  var FEED = [];
  var ROOM = "Studio Loft";
  var chat = [];
  var liveOccupants = [];
  var meSub = "home"; // home | profile | friends
  var inRoom = false;
  var viewingId = null; // profile being viewed
  var FRIENDS_KEY = "whirled2.friends";
  var pollTimer = null;
  var occTimer = null;
  var WALL_KEY = "whirled2.wall.";
  var POKE_KEY = "whirled2.pokes";
  var STATUS_KEY = "whirled2.status.";
  var notices = [];
  var NOTE_KEY = "whirled2.notices";
  var listeners = { chat: [], occupants: [] };
  function loadFriends() {
    try { return JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveFriends(list) {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(list.slice(0, 100)));
  }
  function addFriend(entry) {
    var list = loadFriends();
    if (!entry || !entry.id) return list;
    if (list.some(function (f) { return f.id === entry.id; })) return list;
    list.unshift({ id: entry.id, name: entry.name, at: new Date().toISOString() });
    saveFriends(list);
    return list;
  }
  function session() { return window.WhirledApi ? window.WhirledApi.session() : null; }
  function you() {
    var s = session();
    if (s && s.user) {
      return { name: s.user.name, initials: s.user.initials || s.user.name.slice(0, 1).toUpperCase(), bio: s.user.bio || "", coins: s.user.coins || 0, room: s.user.room || ROOM };
    }
    return { name: "Guest", initials: "?", bio: "", coins: 0, room: ROOM };
  }
  function personRow(p) {
    var id = p.id || "";
    return '<button type="button" class="person" data-profile="' + esc(id) + '">'
      + '<span class="ava' + (p.you ? " you" : "") + '">' + esc(p.initials || "?") + '</span>'
      + '<span class="person-name">' + esc(p.name) + (p.you ? " <span class=\"sub\">(you)</span>" : "") + '</span>'
      + '<span class="dot' + (p.online ? " on" : "") + '"></span>'
      + '<span class="sub">' + esc(p.you ? "you" : (p.room || "")) + '</span></button>';
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
  function roomsLobby() {
    var me = you();
    var online = liveOccupants.length || (session() ? 1 : 0);
    return '<section class="page rooms-lobby">'
      + '<div class="featured">Featured Rooms</div>'
      + '<p class="lobby-blurb">Rooms are where you create your space and show it off. Decorate, chat and play — engine mounts inside the loft.</p>'
      + '<div class="section-label">Active rooms</div>'
      + '<div class="room-tiles">'
      +   '<button type="button" class="room-tile" data-enter-room="loft">'
      +     '<div class="thumb"></div>'
      +     '<div class="body"><h3>Studio Loft</h3>'
      +       '<p class="meta">owner: ' + esc(me.name) + ' · home</p>'
      +       '<div class="online">' + online + ' online now!</div>'
      +       '<span class="enter-label">Enter</span></div>'
      +   '</button>'
      + '</div>'
      + '<p class="meta">More public rooms arrive when the shared server lists them.</p>'
      + '</section>';
  }
  function roomView() {
    var me = you();
    var here = liveOccupants.slice();
    if (!here.some(function (p) { return p.you || (session() && p.id === session().user.id); })) {
      here = [{ id: session() && session().user && session().user.id, name: me.name, initials: me.initials, online: true, room: ROOM, you: true }].concat(here);
    } else {
      here = here.map(function (p) {
        if (session() && p.id === session().user.id) return Object.assign({}, p, { you: true, initials: p.initials || me.initials });
        return p;
      });
    }
    var empty = here.length === 0;
    return ''
      + '<div class="workspace">'
      +   '<aside class="rail"><h2>In this room</h2>'
      +     (empty ? '<p class="sub" style="padding:8px 10px">Nobody here yet.</p>' : here.map(personRow).join(''))
      +     '<button type="button" class="text-btn leave-room" data-leave-room="1">Back to Rooms</button>'
      +   '</aside>'
      +   '<section class="stage-wrap">'
      +     '<div class="room-strip"><span class="room-name">' + esc(ROOM) + '</span><span class="room-owner">owner: ' + esc(me.name) + '</span></div>'
      +     '<div id="stage-slot"><div class="stage-copy"><strong>Engine mounts here</strong>Click-to-walk belongs to the room engine.<code>#stage-slot</code></div></div>'
      +     '<div class="chat-log" id="chat-log">' + chat.map(chatRow).join('') + '</div>'
      +   '</section>'
      + '</div>';
  }
  function rooms() {
    return inRoom ? roomView() : roomsLobby();
  }


  function wallKey(userId) { return WALL_KEY + (userId || "guest"); }
  function loadWall(userId) {
    try { return JSON.parse(localStorage.getItem(wallKey(userId)) || "[]"); } catch (e) { return []; }
  }
  function saveWall(userId, rows) {
    localStorage.setItem(wallKey(userId), JSON.stringify(rows.slice(-80)));
  }
  function loadStatus(userId) {
    try { return localStorage.getItem(STATUS_KEY + userId) || ""; } catch (e) { return ""; }
  }
  function saveStatus(userId, text) {
    localStorage.setItem(STATUS_KEY + userId, String(text || "").slice(0, 140));
  }
  function loadPokes() {
    try { return JSON.parse(localStorage.getItem(POKE_KEY) || "{}"); } catch (e) { return {}; }
  }
  function addPoke(fromId, toId) {
    var map = loadPokes();
    var key = toId;
    if (!map[key]) map[key] = [];
    map[key].unshift({ from: fromId, at: new Date().toISOString() });
    map[key] = map[key].slice(0, 40);
    localStorage.setItem(POKE_KEY, JSON.stringify(map));
    return map[key];
  }
  function photoFor(user) {
    if (user && user.photo) return user.photo;
    try {
      var s = session();
      if (s && s.user && s.user.id === (user && user.id)) {
        return localStorage.getItem("whirled2.photo." + s.user.id) || "";
      }
      if (user && user.id) return localStorage.getItem("whirled2.photo." + user.id) || "";
    } catch (e) {}
    return "";
  }

  function loadNotices() {
    try { notices = JSON.parse(localStorage.getItem(NOTE_KEY) || "[]"); } catch (e) { notices = []; }
    return notices;
  }
  function pushNotice(kind, text) {
    loadNotices();
    notices.unshift({ kind: kind || "gray", text: text, at: new Date().toISOString() });
    notices = notices.slice(0, 30);
    try { localStorage.setItem(NOTE_KEY, JSON.stringify(notices)); } catch (e) {}
    renderNotices();
  }
  function renderNotices() {
    loadNotices();
    var el = document.getElementById("notice-bar");
    if (!el) return;
    if (!notices.length) { el.innerHTML = '<div class="notice-empty">No notifications</div>'; return; }
    el.innerHTML = notices.slice(0, 8).map(function (n) {
      return '<div class="notice-row kind-' + esc(n.kind) + '">' + esc(n.text) + '</div>';
    }).join("");
  }
  function ensureNoticeBar() {
    if (document.getElementById("notice-bar")) { renderNotices(); return; }
    if (!session()) return;
    var box = document.createElement("aside");
    box.id = "notice-bar";
    box.className = "notice-bar";
    box.setAttribute("aria-label", "Notifications");
    document.body.appendChild(box);
    renderNotices();
  }

  function meSubnav() {
    return '<div class="me-subnav"><span class="me-title">Me</span><nav class="me-links">'
      + '<button type="button" class="me-link' + (meSub === "home" ? " is-on" : "") + '" data-me="home">Me</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "profile" ? " is-on" : "") + '" data-me="profile">My Profile</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link" data-tab="rooms">My Rooms</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "friends" ? " is-on" : "") + '" data-me="friends">Friends</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link" disabled title="Coming soon">Account</button>'
      + '</nav></div>';
  }
  function meHome() {
    var me = you();
    var st = loadStatus(session().user.id);
    var wall = loadWall(session().user.id).slice(0, 12);
    var news = wall.map(function (w) {
      return '<div class="news-row"><b>' + esc(w.who) + '</b> ' + esc(w.text) + '<time>' + esc((w.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
    }).join("") || '<p class="meta">No news yet. Post a status on My Profile.</p>';
    var friendsOnline = liveOccupants.filter(function (p) { return !p.you; });
    var friendBox = friendsOnline.length
      ? friendsOnline.map(function (p) { return '<div class="friend-row"><span class="ava">' + esc(p.initials) + '</span><div><b>' + esc(p.name) + '</b><div class="sub">In ' + esc(p.room || ROOM) + '</div></div></div>'; }).join("")
      : '<p class="meta">No other players online in this room right now.</p>';
    return '<section class="page me-page">' + meSubnav()
      + '<div class="me-grid">'
      +   '<div class="me-main">'
      +     '<div class="panel invite-banner">Invite friends to Whirled Classic — coins stay labels only (no payments).</div>'
      +     '<div class="panel"><h2>My News</h2>'
      +       (st ? '<p class="status-line"><b>Your status:</b> ' + esc(st) + '</p>' : '')
      +       news + '</div>'
      +   '</div>'
      +   '<aside class="me-side">'
      +     '<div class="panel links-panel">'
      +       '<div class="online-count">People in loft: <b>' + (liveOccupants.length || 1) + '</b></div>'
      +       '<button type="button" class="text-btn" data-me="profile">My Profile</button>'
      +       '<button type="button" class="text-btn" data-tab="rooms">My Rooms</button>'
      +       '<button type="button" class="text-btn" data-me="profile">My Passport</button>'
      +       '<span class="meta">Passport stamps come later with the engine track.</span>'
      +     '</div>'
      +     '<div class="panel"><h2>My Friends Online</h2>' + friendBox + '</div>'
      +   '</aside>'
      + '</div></section>';
  }
  function meProfile() {
    var me = you();
    var sid = session().user.id;
    var st = loadStatus(sid);
    var photo = photoFor(session().user);
    var wall = loadWall(sid);
    var pokes = (loadPokes()[sid] || []).slice(0, 8);
    var photoHtml = photo
      ? '<img class="profile-photo" src="' + photo + '" alt="Profile photo" width="80" height="60" />'
      : '<div class="ava lg you profile-photo-fallback">' + esc(me.initials) + '</div>';
    var wallHtml = wall.length ? wall.map(function (w) {
      return '<div class="wall-row"><span class="ava">' + esc((w.who || "?").slice(0, 1)) + '</span><div><b>' + esc(w.who) + '</b> ' + esc(w.text) + '<time>' + esc((w.at || "").slice(0, 16).replace("T", " ")) + '</time></div></div>';
    }).join("") : '<p class="meta">No comments yet. Be the first on this wall.</p>';
    var pokeHtml = pokes.length ? pokes.map(function (p) {
      return '<div class="meta">Poked by <b>' + esc(p.from) + '</b> · ' + esc((p.at || "").slice(0, 16).replace("T", " ")) + '</div>';
    }).join("") : '<p class="meta">No pokes yet.</p>';
    return '<section class="page me-page">' + meSubnav()
      + '<div class="profile-card panel">'
      +   '<div class="profile-head">' + photoHtml
      +     '<div class="profile-head-text">'
      +       '<div class="profile-title-row"><h1>My Profile</h1><span class="level-badge">Level 1</span></div>'
      +       '<div class="whirled-name">' + esc(me.name) + '</div>'
      +       '<div class="status-line" id="status-display">' + (st ? esc(st) : '<span class="meta">No status set</span>') + '</div>'
      +       '<div class="profile-meta meta">Permaname: ' + esc(sid) + ' · Member of Whirled Classic</div>'
      +       '<div class="profile-actions">'
      +         '<button type="button" class="action-btn" disabled title="Mail comes with shared server">Send Mail</button>'
      +         '<button type="button" class="action-btn" data-tab="rooms">Visit Home</button>'
      +         '<button type="button" class="action-btn" data-tab="rooms">View Rooms</button>'
      +         '<button type="button" class="action-btn" data-tab="stuff">Browse Items</button>'
      +         '<button type="button" class="poke-btn" id="poke-self-demo">Poke</button>'
      +         '<label class="photo-btn">Photo <input type="file" id="photo-input" accept="image/*" hidden /></label>'
      +       '</div></div></div>'
      +   '<form class="status-form" id="status-form"><input name="status" maxlength="140" placeholder="What are you up to?" value="' + esc(st) + '" /><button type="submit">Update status</button></form>'
      +   '<form class="profile-form" id="profile-form"><label>Display name <input name="name" maxlength="24" value="' + esc(me.name) + '" /></label>'
      +     '<label>About me <input name="bio" maxlength="180" value="' + esc(me.bio) + '" /></label>'
      +     '<button type="submit">Save profile</button><p class="meta" id="profile-msg"></p></form>'
      + '</div>'
      + '<div class="panel"><h2>Information</h2><p class="meta">' + (me.bio ? esc(me.bio) : "Add an About me blurb above.") + '</p></div>'
      + '<div class="panel"><h2>Player News / Wall</h2>'
      +   '<form class="wall-form" id="wall-form"><input name="text" maxlength="240" placeholder="Comment on this profile" required /><button type="submit">Comment</button></form>'
      +   '<div id="wall-list">' + wallHtml + '</div></div>'
      + '<div class="panel"><h2>Pokes</h2><div id="poke-list">' + pokeHtml + '</div>'
      +   '<p class="meta">Pokes notify you in the bottom-right bar (classic Whirled style).</p></div>'
      + '</section>';
  }
  function meFriends() {
    var list = loadFriends();
    var rows = list.length ? list.map(function (f) {
      return '<div class="friend-row">'
        + '<button type="button" class="text-btn" data-profile="' + esc(f.id) + '"><b>' + esc(f.name) + '</b></button>'
        + '<span class="meta">friended ' + esc((f.at || "").slice(0, 10)) + '</span>'
        + '<button type="button" class="action-btn" data-profile="' + esc(f.id) + '">Visit</button>'
        + '</div>';
    }).join("") : '<p class="meta">No friends yet. Open someone\'s profile and hit Add Friend.</p>';
    return '<section class="page me-page">' + meSubnav()
      + '<div class="panel"><h2>Friends</h2>'
      + '<p class="meta">Invite Them! Search comes with the shared server. For now, add people you meet in the loft.</p>'
      + rows + '</div></section>';
  }
  function otherProfile(id) {
    var me = you();
    var occ = liveOccupants.filter(function (p) { return p.id === id; })[0];
    var friend = loadFriends().filter(function (f) { return f.id === id; })[0];
    var name = (occ && occ.name) || (friend && friend.name) || id;
    var initials = (occ && occ.initials) || String(name).slice(0, 1).toUpperCase();
    var st = loadStatus(id);
    var photo = localStorage.getItem("whirled2.photo." + id) || "";
    var wall = loadWall(id);
    var photoHtml = photo
      ? '<img class="profile-photo" src="' + photo + '" alt="" width="80" height="60" />'
      : '<div class="ava lg profile-photo-fallback">' + esc(initials) + '</div>';
    var wallHtml = wall.length ? wall.map(function (w) {
      return '<div class="wall-row"><b>' + esc(w.who) + '</b> ' + esc(w.text) + '<time>' + esc((w.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
    }).join("") : '<p class="meta">No comments yet.</p>';
    var isSelf = session() && session().user.id === id;
    return '<section class="page me-page">' + meSubnav()
      + '<div class="profile-card panel"><div class="profile-head">' + photoHtml
      + '<div class="profile-head-text">'
      + '<div class="profile-title-row"><h1>' + (isSelf ? "My Profile" : "Profile") + '</h1><span class="level-badge">Level 1</span></div>'
      + '<div class="whirled-name">' + esc(name) + '</div>'
      + '<div class="status-line">' + (st ? esc(st) : '<span class="meta">No status set</span>') + '</div>'
      + '<div class="profile-actions">'
      +   (isSelf ? '' : '<button type="button" class="poke-btn" data-poke="' + esc(id) + '" data-poke-name="' + esc(name) + '">Poke</button>')
      +   (isSelf ? '' : '<button type="button" class="action-btn" data-add-friend="' + esc(id) + '" data-friend-name="' + esc(name) + '">Add Friend</button>')
      +   '<button type="button" class="action-btn" data-tab="rooms">Visit Home</button>'
      + '</div></div></div></div>'
      + '<div class="panel"><h2>Wall</h2>'
      + '<form class="wall-form" id="wall-form" data-wall-user="' + esc(id) + '"><input name="text" maxlength="240" placeholder="Comment on this profile" required /><button type="submit">Comment</button></form>'
      + '<div id="wall-list">' + wallHtml + '</div></div></section>';
  }
  function mePage() {
    if (viewingId && session() && viewingId !== session().user.id) return otherProfile(viewingId);
    if (viewingId && session() && viewingId === session().user.id) { meSub = "profile"; viewingId = null; }
    if (meSub === "friends") return meFriends();
    if (meSub === "profile") return meProfile();
    return meHome();
  }


  function gate() {
    return ''
      + '<section class="gate"><div class="gate-card">'
      +   logoImg("gate-logo")
      +   '<p class="eyebrow">Whirled Classic</p>'
      +   '<h1>Welcome to Whirled</h1>'
      +   '<p>Play games, make friends, make stuff — classic whirled chrome, new engine.</p>'
      +   '<div class="gate-grid">'
      +     '<form id="register-form"><h2>It\'s free — create an account</h2>'
      +       '<input name="name" autocomplete="username" placeholder="Display name" required />'
      +       '<input name="password" type="password" autocomplete="new-password" placeholder="New password" required />'
      +       '<button type="submit">Sign Up</button></form>'
      +     '<form id="login-form"><h2>Already have an account?</h2>'
      +       '<input name="name" autocomplete="username" placeholder="Display name" required />'
      +       '<input name="password" type="password" autocomplete="current-password" placeholder="Password" required />'
      +       '<button type="submit">Logon</button></form>'
      +   '</div>'
      +   '<p class="gate-err" id="gate-err"></p>'
      +   '<p class="meta">Offline preview stays in this browser. Shared chat needs server/server.mjs.</p>'
      + '</div></section>';
  }
  function shell() {
    var me = you();
    return ''
      + '<header class="topbar">'
      +   '<a class="brand" href="#rooms">' + logoImg("logo") + '<span class="sr-only">Whirled Classic</span></a>'
      +   '<nav class="tabs">' + [["me","Me"],["stuff","Stuff"],["games","Games"],["rooms","Rooms"],["groups","Groups"],["shop","Shop"]].map(function (t) {
            return '<button class="tab' + (t[0] === "rooms" ? " is-on" : "") + '" type="button" data-tab="' + t[0] + '">' + t[1] + '</button>';
          }).join("") + '</nav>'
      +   '<div class="who">'
      +     '<div class="row who-links">'
      +       '<span class="mail" title="Mail">&#9993; <u>(0)</u></span>'
      +       '<b>' + esc(me.name) + '</b>'
      +       '<span class="sep">|</span>'
      +       '<span class="text-btn">Help</span>'
      +       '<span class="sep">|</span>'
      +       '<button type="button" id="logout-btn" class="text-btn">Logoff</button>'
      +     '</div>'
      +     '<div class="row who-stats">'
      +       '<span class="stat coins" title="Coins">' + me.coins + ' coins</span>'
      +       '<span class="stat level" title="Level">Lv 1</span>'
      +     '</div>'
      +   '</div>'
      + '</header>'
      + '<div id="main"></div>'
      + '<form class="bar" id="chat-form">'
      +   '<button type="button" class="chat-opts" title="Chat options" aria-label="Chat options">&#9679;</button>'
      +   '<input id="chat-input" maxlength="240" placeholder="Type here to chat!" autocomplete="off" />'
      +   '<button class="send" type="submit">send</button>'
      +   '<span class="toolbar" aria-hidden="true">'
      +     '<i class="tb tb-vol" title="Volume"></i>'
      +     '<i class="tb tb-go" title="Go"></i>'
      +     '<i class="tb tb-friends" title="Friends"></i>'
      +     '<i class="tb tb-party" title="Parties"></i>'
      +     '<i class="tb tb-room" title="Room"></i>'
      +   '</span>'
      + '</form>';
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
    var tabAttr = tab || "rooms";
    if (tabAttr === "rooms" && !inRoom) tabAttr = "rooms-lobby";
    if (tabAttr === "rooms" && inRoom) tabAttr = "rooms";
    document.getElementById("app").setAttribute("data-tab", tabAttr);
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
    if (session()) ensureNoticeBar();
    else {
      var nb = document.getElementById("notice-bar");
      if (nb) nb.remove();
    }
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
    return liveOccupants.slice();
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

  function refreshOccupantRail() {
    var rail = document.querySelector(".rail");
    if (!rail || !document.querySelector(".workspace")) return;
    var me = you();
    var here = liveOccupants.slice();
    if (session() && !here.some(function (p) { return p.id === session().user.id; })) {
      here.unshift({ id: session().user.id, name: me.name, initials: me.initials, online: true, room: ROOM, you: true });
    } else {
      here = here.map(function (p) {
        if (session() && p.id === session().user.id) return Object.assign({}, p, { you: true });
        return p;
      });
    }
    rail.innerHTML = "<h2>In this room</h2>" + (here.length ? here.map(personRow).join("") : '<p class="sub" style="padding:8px 10px">Nobody here yet.</p>');
    listeners.occupants.forEach(function (fn) { try { fn(here); } catch (e) {} });
  }
  async function loadOccupants() {
    if (!session()) { liveOccupants = []; return; }
    var result = await window.WhirledApi.heartbeat("loft");
    liveOccupants = (result.occupants || []).map(function (p) {
      return {
        id: p.id,
        name: p.name,
        initials: p.initials || String(p.name).slice(0, 1).toUpperCase(),
        online: true,
        room: p.room || ROOM,
        you: session() && p.id === session().user.id
      };
    });
    refreshOccupantRail();
  }
  function startOccPoll() {
    if (occTimer) clearInterval(occTimer);
    loadOccupants();
    occTimer = setInterval(function () { if (session()) loadOccupants(); }, 5000);
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
    if (session()) { loadHistory(); startPoll(); startOccPoll(); }
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
    startOccPoll();
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
    if (ev.target.id === "logout-btn") {
      window.WhirledApi.logout();
      chat = []; liveOccupants = []; inRoom = false; viewingId = null;
      paint("");
      return;
    }
    var enter = ev.target.closest("[data-enter-room]");
    if (enter && session()) {
      inRoom = true;
      paint("rooms");
      loadOccupants();
      return;
    }
    if (ev.target.closest("[data-leave-room]")) {
      inRoom = false;
      paint("rooms");
      return;
    }
    var prof = ev.target.closest("[data-profile]");
    if (prof && session()) {
      viewingId = prof.getAttribute("data-profile") || null;
      meSub = "profile";
      paint("me");
      return;
    }
    var addF = ev.target.closest("[data-add-friend]");
    if (addF && session()) {
      addFriend({ id: addF.getAttribute("data-add-friend"), name: addF.getAttribute("data-friend-name") });
      pushNotice("gray", "You friended " + (addF.getAttribute("data-friend-name") || "someone") + ".");
      meSub = "friends";
      viewingId = null;
      paint("me");
      return;
    }
    var pokeOther = ev.target.closest("[data-poke]");
    if (pokeOther && session()) {
      var pid = pokeOther.getAttribute("data-poke");
      var pname = pokeOther.getAttribute("data-poke-name") || pid;
      addPoke(session().user.name, pid);
      pushNotice("orange", "You poked " + pname + ".");
      return;
    }
    var meBtn = ev.target.closest("[data-me]");
    if (meBtn && session()) {
      meSub = meBtn.getAttribute("data-me") || "home";
      viewingId = null;
      paint("me");
      return;
    }
    if (ev.target.id === "poke-self-demo" && session()) {
      var sid = session().user.id;
      addPoke(session().user.name, sid);
      pushNotice("orange", session().user.name + " poked you.");
      meSub = "profile";
      viewingId = null;
      paint("me");
      return;
    }
    var tab = ev.target.closest("[data-tab]");
    if (tab && tab.getAttribute("data-tab") && session()) {
      var t = tab.getAttribute("data-tab");
      if (t === "me") { meSub = "home"; viewingId = null; }
      if (t === "rooms") { /* keep inRoom */ }
      paint(t);
    }
  });
  app.addEventListener("change", function (ev) {
    if (ev.target.id !== "photo-input" || !session()) return;
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    if (file.size > 200000) { alert("Keep photos under ~200KB for this demo."); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = 80; canvas.height = 60;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#e8f4fb";
        ctx.fillRect(0, 0, 80, 60);
        var scale = Math.min(80 / img.width, 60 / img.height);
        var w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (80 - w) / 2, (60 - h) / 2, w, h);
        var data = canvas.toDataURL("image/png");
        localStorage.setItem("whirled2.photo." + session().user.id, data);
        var s = session();
        s.user.photo = data;
        try { localStorage.setItem("whirled2.session", JSON.stringify(s)); } catch (e) {}
        meSub = "profile";
        paint("me");
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
  app.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (ev.target.id === "profile-form") {
      var data = new FormData(ev.target);
      var msg = document.getElementById("profile-msg");
      window.WhirledApi.saveProfile({ name: data.get("name"), bio: data.get("bio") }).then(function () {
        if (msg) msg.textContent = "Saved.";
        meSub = "profile";
        paint("me");
      }).catch(function (e) { if (msg) msg.textContent = e.message; });
      return;
    }
    if (ev.target.id === "status-form" && session()) {
      var data2 = new FormData(ev.target);
      var st = String(data2.get("status") || "").trim().slice(0, 140);
      saveStatus(session().user.id, st);
      var wall = loadWall(session().user.id);
      if (st) {
        wall.unshift({ who: you().name, text: "updated status: " + st, at: new Date().toISOString(), kind: "status" });
        saveWall(session().user.id, wall);
        pushNotice("gray", you().name + " " + st);
      }
      meSub = "profile";
      paint("me");
      return;
    }
    if (ev.target.id === "wall-form" && session()) {
      var data3 = new FormData(ev.target);
      var text3 = String(data3.get("text") || "").trim().slice(0, 240);
      if (!text3) return;
      var targetWall = ev.target.getAttribute("data-wall-user") || session().user.id;
      var wall2 = loadWall(targetWall);
      wall2.unshift({ who: you().name, text: text3, at: new Date().toISOString(), kind: "comment" });
      saveWall(targetWall, wall2);
      pushNotice("blue", you().name + " commented on a profile.");
      if (targetWall === session().user.id) { viewingId = null; meSub = "profile"; }
      else viewingId = targetWall;
      paint("me");
      return;
    }
    var input = ev.target.querySelector("input");
    var text = input && input.value.trim();
    if (!text) return;
    if (ev.target.id === "chat-form") { pushChat(text); input.value = ""; }
  });
})();
