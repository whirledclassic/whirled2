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
  var STUFF_KEY = "whirled2.stuff";
  var SHOP_KEY = "whirled2.shop";
  var MAIL_KEY = "whirled2.mail";
  var STUFF_CATS = [
    { id: "avatars", label: "Avatars", empty: "You have no avatars yet." },
    { id: "furniture", label: "Furniture", empty: "You have no furniture yet." },
    { id: "backdrops", label: "Backdrops", empty: "You have no backdrops yet." },
    { id: "toys", label: "Toys", empty: "You have no toys yet." },
    { id: "pets", label: "Pets", empty: "You have no pets yet." },
    { id: "games", label: "Games", empty: "You have no games yet." },
    { id: "launchers", label: "Launchers", empty: "You have no launchers yet." },
    { id: "levelpacks", label: "Level Packs", empty: "You have no level packs yet." },
    { id: "itempacks", label: "Item Packs", empty: "You have no item packs yet." },
    { id: "images", label: "Images", empty: "You have no images yet." },
    { id: "music", label: "Music", empty: "You have no music yet." },
    { id: "videos", label: "Videos", empty: "You have no videos yet." }
  ];
  var stuffCat = "avatars";
  var shopCat = "avatars";
  var shopSort = "popularity";
  var shopItemId = null;
  var groupViewId = null;
  var groupThreadId = null;
  var roomMenuOpen = false;
  var roomPanelOpen = false;
  var FEED = [];
  var GROUPS_KEY = "whirled2.groups";
  var FAV_KEY = "whirled2.favorites";
  var SHOP_RATINGS_KEY = "whirled2.shopRatings";
  var ROOM_LOCK_KEY = "whirled2.roomLock.loft";
  var ROOM_RATING_KEY = "whirled2.roomRating.loft";
  var ROOM_COMMENTS_KEY = "whirled2.roomComments.loft";
  var GAMES_KEY = "whirled2.games";
  var GAME_TABLES_KEY = "whirled2.gameTables";
  var GAME_FAV_KEY = "whirled2.gameFavorites";
  var KNOWN_PROFILES_KEY = "whirled2.knownProfiles";
  var GAME_GENRES = [
    { id: "action", label: "Action/Arcade" },
    { id: "adventure", label: "Adventure/RPG" },
    { id: "card", label: "Card/Board" },
    { id: "mmo", label: "MMO/Whirled" },
    { id: "other", label: "Other" },
    { id: "puzzle", label: "Puzzle" },
    { id: "sports", label: "Sports/Racing" },
    { id: "strategy", label: "Strategy" },
    { id: "word", label: "Word" }
  ];
  var gameGenre = "all";
  var gamesMode = "browse"; // browse | detail | lobby
  var gameViewId = null;
  var gameDetailTab = "play"; // play | trophies | comments
  var friendSearchQ = "";
  var SHOP_POPULAR = [
    { id: "avatars", label: "Avatars", empty: "No popular avatars yet." },
    { id: "furniture", label: "Furniture", empty: "No popular furniture yet." },
    { id: "backdrops", label: "Backdrops", empty: "No popular backdrops yet." },
    { id: "toys", label: "Toys", empty: "No popular toys yet." },
    { id: "pets", label: "Pets", empty: "No popular pets yet." },
    { id: "games", label: "Games", empty: "No popular games yet." },
    { id: "images", label: "Images", empty: "No popular images yet." },
    { id: "music", label: "Music", empty: "No popular music yet." },
    { id: "videos", label: "Videos", empty: "No popular videos yet." }
  ];
  function loadStuff() {
    try { return JSON.parse(localStorage.getItem(STUFF_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveStuff(items) {
    localStorage.setItem(STUFF_KEY, JSON.stringify(items.slice(0, 200)));
  }
  function loadShop() {
    try { return JSON.parse(localStorage.getItem(SHOP_KEY) || "[]"); } catch (e) { return []; }
  }
  function loadFavorites() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveFavorites(ids) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify((ids || []).slice(0, 200))); } catch (e) {}
  }
  function toggleFavorite(itemId) {
    var ids = loadFavorites();
    var i = ids.indexOf(itemId);
    if (i >= 0) ids.splice(i, 1); else ids.unshift(itemId);
    saveFavorites(ids);
    return ids.indexOf(itemId) >= 0;
  }
  function loadShopRatings() {
    try { return JSON.parse(localStorage.getItem(SHOP_RATINGS_KEY) || "{}"); } catch (e) { return {}; }
  }
  function setShopRating(itemId, stars) {
    var map = loadShopRatings();
    map[itemId] = Math.max(1, Math.min(5, Number(stars) || 1));
    try { localStorage.setItem(SHOP_RATINGS_KEY, JSON.stringify(map)); } catch (e) {}
    return map[itemId];
  }
  function shopCommentsKey(itemId) { return "whirled2.shopComments." + itemId; }
  function loadShopComments(itemId) {
    try { return JSON.parse(localStorage.getItem(shopCommentsKey(itemId)) || "[]"); } catch (e) { return []; }
  }
  function saveShopComments(itemId, rows) {
    try { localStorage.setItem(shopCommentsKey(itemId), JSON.stringify((rows || []).slice(0, 100))); } catch (e) {}
  }
  function loadGroups() {
    try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveGroups(list) {
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify((list || []).slice(0, 100))); } catch (e) {}
  }
  function groupThreadsKey(gid) { return "whirled2.groupThreads." + gid; }
  function loadGroupThreads(gid) {
    try { return JSON.parse(localStorage.getItem(groupThreadsKey(gid)) || "[]"); } catch (e) { return []; }
  }
  function saveGroupThreads(gid, threads) {
    try { localStorage.setItem(groupThreadsKey(gid), JSON.stringify((threads || []).slice(0, 100))); } catch (e) {}
  }
  function loadRoomLock() {
    try { return localStorage.getItem(ROOM_LOCK_KEY) || "unlocked"; } catch (e) { return "unlocked"; }
  }
  function saveRoomLock(v) {
    try { localStorage.setItem(ROOM_LOCK_KEY, v); } catch (e) {}
  }
  function loadRoomRating() {
    try {
      var n = Number(localStorage.getItem(ROOM_RATING_KEY) || 0);
      return (n >= 1 && n <= 5) ? n : 0;
    } catch (e) { return 0; }
  }
  function saveRoomRating(n) {
    try { localStorage.setItem(ROOM_RATING_KEY, String(Math.max(1, Math.min(5, Number(n) || 1)))); } catch (e) {}
  }
  function loadRoomComments() {
    try { return JSON.parse(localStorage.getItem(ROOM_COMMENTS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveRoomComments(rows) {
    try { localStorage.setItem(ROOM_COMMENTS_KEY, JSON.stringify((rows || []).slice(0, 100))); } catch (e) {}
  }
  function loadGames() {
    try { return JSON.parse(localStorage.getItem(GAMES_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveGames(list) {
    try { localStorage.setItem(GAMES_KEY, JSON.stringify((list || []).slice(0, 200))); } catch (e) {}
  }
  function loadGameTables() {
    try { return JSON.parse(localStorage.getItem(GAME_TABLES_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveGameTables(list) {
    try { localStorage.setItem(GAME_TABLES_KEY, JSON.stringify((list || []).slice(0, 100))); } catch (e) {}
  }
  function loadGameFavorites() {
    try { return JSON.parse(localStorage.getItem(GAME_FAV_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveGameFavorites(ids) {
    try { localStorage.setItem(GAME_FAV_KEY, JSON.stringify((ids || []).slice(0, 200))); } catch (e) {}
  }
  function toggleGameFavorite(gameId) {
    var ids = loadGameFavorites();
    var i = ids.indexOf(gameId);
    if (i >= 0) ids.splice(i, 1); else ids.unshift(gameId);
    saveGameFavorites(ids);
    return ids.indexOf(gameId) >= 0;
  }
  function gameCommentsKey(gid) { return "whirled2.gameComments." + gid; }
  function loadGameComments(gid) {
    try { return JSON.parse(localStorage.getItem(gameCommentsKey(gid)) || "[]"); } catch (e) { return []; }
  }
  function saveGameComments(gid, rows) {
    try { localStorage.setItem(gameCommentsKey(gid), JSON.stringify((rows || []).slice(0, 100))); } catch (e) {}
  }
  function loadKnownProfiles() {
    try { return JSON.parse(localStorage.getItem(KNOWN_PROFILES_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveKnownProfiles(list) {
    try { localStorage.setItem(KNOWN_PROFILES_KEY, JSON.stringify((list || []).slice(0, 200))); } catch (e) {}
  }
  function rememberProfile(entry) {
    if (!entry || !entry.id) return;
    var list = loadKnownProfiles();
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === entry.id) {
        list[i].name = entry.name || list[i].name;
        list[i].at = new Date().toISOString();
        found = true;
        break;
      }
    }
    if (!found) list.unshift({ id: entry.id, name: entry.name || entry.id, at: new Date().toISOString() });
    saveKnownProfiles(list);
  }
  function gameGenreOf(g) {
    var raw = String((g && (g.genre || g.category || g.kind)) || "other").toLowerCase();
    if (raw.indexOf("action") >= 0 || raw.indexOf("arcade") >= 0) return "action";
    if (raw.indexOf("adventure") >= 0 || raw.indexOf("rpg") >= 0) return "adventure";
    if (raw.indexOf("card") >= 0 || raw.indexOf("board") >= 0) return "card";
    if (raw.indexOf("mmo") >= 0 || raw.indexOf("whirled") >= 0) return "mmo";
    if (raw.indexOf("puzzle") >= 0) return "puzzle";
    if (raw.indexOf("sport") >= 0 || raw.indexOf("racing") >= 0 || raw.indexOf("race") >= 0) return "sports";
    if (raw.indexOf("strategy") >= 0) return "strategy";
    if (raw.indexOf("word") >= 0) return "word";
    for (var i = 0; i < GAME_GENRES.length; i++) if (GAME_GENRES[i].id === raw) return raw;
    return "other";
  }
  function findGame(gid) {
    var list = loadGames();
    for (var i = 0; i < list.length; i++) if ((list[i].id || list[i].name) === gid) return list[i];
    return null;
  }
  function loftRatingLabel() {
    var n = loadRoomRating();
    return n ? ("Rating: " + n + "/5") : "Rating: new";
  }
  function sortShopItems(items, sort) {
    var arr = (items || []).slice();
    var ratings = loadShopRatings();
    function priceOf(it) { return Number(it.coins != null ? it.coins : it.price) || 0; }
    function ratingOf(it) {
      var id = it.id || it.name;
      if (ratings[id] != null) return Number(ratings[id]) || 0;
      return Number(it.rating) || 0;
    }
    function dateOf(it) { return Date.parse(it.at || it.created || it.date || 0) || 0; }
    function popOf(it) { return Number(it.popularity != null ? it.popularity : it.purchases) || 0; }
    if (sort === "rating") arr.sort(function (a, b) { return ratingOf(b) - ratingOf(a); });
    else if (sort === "price") arr.sort(function (a, b) { return priceOf(a) - priceOf(b); });
    else if (sort === "date") arr.sort(function (a, b) { return dateOf(b) - dateOf(a); });
    else arr.sort(function (a, b) { return popOf(b) - popOf(a); });
    return arr;
  }
  function shopCard(item) {
    var id = item.id || item.name || "";
    var tone = item.kind === "backdrop" ? "night" : item.kind === "avatar" ? "fox" : "";
    var price = item.owned ? "owned" : ((item.coins != null ? item.coins : item.price) || 0) + " coins";
    return '<button type="button" class="card shop-card" data-shop-item="' + esc(id) + '">'
      + '<div class="swatch ' + tone + '"></div><div class="body"><h3>' + esc(item.name || "Item") + '</h3>'
      + '<p class="meta">' + esc(item.kind || itemCat(item)) + " · " + esc(item.creator || "member") + '</p>'
      + '<div class="price">' + esc(String(price)) + '</div></div></button>';
  }
  var PASSPORT_KEY = "whirled2.passport.";
  var PASSPORT_CATS = [
    { id: "mingle", label: "Mingle" },
    { id: "play", label: "Play" },
    { id: "create", label: "Create" },
    { id: "shop", label: "Shop" }
  ];
  function loadPassport(userId) {
    try {
      var raw = localStorage.getItem(PASSPORT_KEY + userId);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function savePassport(userId, stamps) {
    try { localStorage.setItem(PASSPORT_KEY + userId, JSON.stringify((stamps || []).slice(0, 200))); } catch (e) {}
  }
    var ROOM = "Studio Loft";
  var chat = [];
  var liveOccupants = [];
  var meSub = "home"; // home | profile | friends | mail | passport | account
  var tourTip = 0;
  var goMenuOpen = false;
  var inRoom = false;
  var viewingId = null; // profile being viewed
  var FRIENDS_KEY = "whirled2.friends";
  var pollTimer = null;
  var occTimer = null;
  var WALL_KEY = "whirled2.wall.";
  var POKE_KEY = "whirled2.pokes";
  var STATUS_KEY = "whirled2.status.";
  var INFO_KEY = "whirled2.profileinfo.";
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

  function loadMail() {
    try { return JSON.parse(localStorage.getItem(MAIL_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveMail(list) {
    localStorage.setItem(MAIL_KEY, JSON.stringify((list || []).slice(0, 200)));
  }
  function unreadCount() {
    var s = session();
    if (!s || !s.user) return 0;
    var me = s.user.id;
    return loadMail().filter(function (m) { return m.toId === me && !m.read; }).length;
  }
  function sendMail(opts) {
    opts = opts || {};
    var s = session();
    if (!s || !s.user) return null;
    var list = loadMail();
    var msg = {
      id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fromId: opts.fromId || s.user.id,
      fromName: opts.fromName || s.user.name,
      toId: String(opts.toId || "").trim(),
      toName: String(opts.toName || opts.toId || "").trim(),
      subject: String(opts.subject || "").trim().slice(0, 120) || "(no subject)",
      body: String(opts.body || "").trim().slice(0, 2000),
      at: new Date().toISOString(),
      read: !!opts.read
    };
    if (!msg.toId) return null;
    list.unshift(msg);
    saveMail(list);
    return msg;
  }
  function markMailRead(id) {
    var list = loadMail();
    var changed = false;
    list.forEach(function (m) {
      if (m.id === id && !m.read) { m.read = true; changed = true; }
    });
    if (changed) saveMail(list);
  }
  function removeFriend(id) {
    saveFriends(loadFriends().filter(function (f) { return f.id !== id; }));
  }
  function itemCat(item) {
    var k = String((item && (item.kind || item.type || item.category)) || "").toLowerCase().replace(/[\s_]+/g, "");
    if (k.indexOf("avatar") >= 0) return "avatars";
    if (k.indexOf("furn") >= 0) return "furniture";
    if (k.indexOf("back") >= 0 || k.indexOf("decor") >= 0) return "backdrops";
    if (k.indexOf("toy") >= 0) return "toys";
    if (k.indexOf("pet") >= 0) return "pets";
    if (k.indexOf("launcher") >= 0) return "launchers";
    if (k.indexOf("level") >= 0) return "levelpacks";
    if (k.indexOf("itempack") >= 0 || k === "pack") return "itempacks";
    if (k.indexOf("game") >= 0) return "games";
    if (k.indexOf("image") >= 0 || k.indexOf("photo") >= 0) return "images";
    if (k.indexOf("music") >= 0 || k.indexOf("audio") >= 0) return "music";
    if (k.indexOf("video") >= 0) return "videos";
    return k || "furniture";
  }
  function catRail(mode, active) {
    return '<aside class="stuff-rail" aria-label="Categories"><ul class="stuff-cats">'
      + STUFF_CATS.map(function (c) {
          return '<li><button type="button" class="stuff-cat' + (c.id === active ? " is-on" : "") + '" data-' + mode + '-cat="' + c.id + '">' + esc(c.label) + '</button></li>';
        }).join("")
      + '</ul></aside>';
  }
  function filterByCat(items, catId) {
    return (items || []).filter(function (it) { return itemCat(it) === catId; });
  }
  function catMeta(catId) {
    for (var i = 0; i < STUFF_CATS.length; i++) if (STUFF_CATS[i].id === catId) return STUFF_CATS[i];
    return STUFF_CATS[0];
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
  function stuffPage() {
    var meta = catMeta(stuffCat);
    var all = loadStuff();
    var items = filterByCat(all, stuffCat);
    var body;
    if (!all.length) {
      body = '<div class="panel"><p class="meta">Your inventory is empty. Items you create or earn will show up here.</p></div>';
    } else if (!items.length) {
      body = '<div class="panel"><p class="meta">' + esc(meta.empty) + '</p></div>';
    } else {
      body = '<div class="grid">' + items.map(card).join("") + '</div>';
    }
    return '<section class="page stuff-page"><div class="page-head"><div><h1>Stuff</h1><p>What you already own.</p></div></div>'
      + '<div class="stuff-layout">' + catRail("stuff", stuffCat)
      + '<div class="stuff-main"><h2 class="stuff-cat-title">' + esc(meta.label) + '</h2>' + body + '</div></div></section>';
  }
  function shopItemDetail(item) {
    if (!item) {
      return '<div class="panel"><p class="meta">Item not found in local shop listings.</p>'
        + '<button type="button" class="text-btn" data-shop-back="1">Back to Shop</button></div>';
    }
    var id = item.id || item.name || "";
    var favs = loadFavorites();
    var isFav = favs.indexOf(id) >= 0;
    var ratings = loadShopRatings();
    var myRate = ratings[id] || 0;
    var comments = loadShopComments(id);
    var stars = [1,2,3,4,5].map(function (n) {
      return '<button type="button" class="star-btn' + (myRate >= n ? " is-on" : "") + '" data-shop-rate="' + n + '" data-shop-rate-item="' + esc(id) + '" aria-label="' + n + ' stars">' + (myRate >= n ? "★" : "☆") + '</button>';
    }).join("");
    var commentRows = comments.length
      ? comments.map(function (c) {
          return '<div class="wall-row"><b>' + esc(c.who || "member") + '</b> ' + esc(c.text || "") + '<time>' + esc((c.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
        }).join("")
      : '<p class="meta">No comments yet.</p>';
    var priceLabel = ((item.coins != null ? item.coins : item.price) || 0) + " coins";
    return '<div class="shop-detail">'
      + '<button type="button" class="text-btn" data-shop-back="1">← Back to Shop</button>'
      + '<div class="panel shop-detail-panel">'
      +   '<h2>' + esc(item.name || "Item") + '</h2>'
      +   '<p class="meta">' + esc(item.kind || itemCat(item)) + " · by " + esc(item.creator || "member") + '</p>'
      +   '<p class="price">' + esc(priceLabel) + ' <span class="meta">(label only)</span></p>'
      +   '<div class="shop-detail-actions">'
      +     '<button type="button" class="action-btn fav-btn' + (isFav ? " is-on" : "") + '" data-shop-fav="' + esc(id) + '">' + (isFav ? "♥ Favorited" : "♡ Favorite") + '</button>'
      +     '<button type="button" class="action-btn" disabled title="labels only, no payments">Buy — labels only, no payments</button>'
      +   '</div>'
      +   '<div class="section-label">Rate</div>'
      +   '<div class="star-row" role="group" aria-label="Rate item">' + stars + '</div>'
      +   '<div class="section-label">Comments</div>'
      +   '<div class="comment-list">' + commentRows + '</div>'
      +   '<form id="shop-comment-form" data-shop-comment-item="' + esc(id) + '">'
      +     '<textarea name="text" maxlength="400" rows="3" placeholder="Post a comment…" required></textarea>'
      +     '<button type="submit">Post Comment</button>'
      +   '</form>'
      + '</div></div>';
  }
  function shopPage() {
    if (shopItemId) {
      var allForDetail = loadShop();
      var found = null;
      for (var i = 0; i < allForDetail.length; i++) {
        var it = allForDetail[i];
        if ((it.id || it.name) === shopItemId) { found = it; break; }
      }
      return '<section class="page stuff-page"><div class="page-head"><div><h1>Shop</h1>'
        + '<p class="shop-banner">Coins are labels only — no payments on Whirled Classic yet.</p></div></div>'
        + shopItemDetail(found) + '</section>';
    }
    var meta = catMeta(shopCat);
    var all = loadShop();
    var items = sortShopItems(filterByCat(all, shopCat), shopSort);
    var body;
    if (!all.length) {
      body = '<div class="panel"><p class="meta">No listings yet. Catalog packs will show up here when they are published. Coins stay labels only.</p></div>';
    } else if (!items.length) {
      body = '<div class="panel"><p class="meta">No ' + esc(meta.label.toLowerCase()) + ' listed yet.</p></div>';
    } else {
      body = '<div class="grid">' + items.map(shopCard).join("") + '</div>';
    }
    var popular = '<div class="section-label">Popular selections</div><div class="popular-grid">'
      + SHOP_POPULAR.map(function (c) {
          var popItems = sortShopItems(filterByCat(all, c.id), "popularity").slice(0, 4);
          var inner = popItems.length
            ? '<div class="grid tight">' + popItems.map(shopCard).join("") + '</div>'
            : '<p class="meta">' + esc(c.empty) + '</p>';
          return '<div class="popular-panel"><h3>' + esc(c.label) + '</h3>' + inner + '</div>';
        }).join("")
      + '</div>';
    var sorts = [
      ["rating", "Rating"],
      ["price", "Price"],
      ["popularity", "Popularity"],
      ["date", "Date"]
    ];
    var sortUi = '<div class="shop-sort" role="group" aria-label="Sort listings">'
      + '<span class="meta">Sort:</span> '
      + sorts.map(function (s) {
          return '<button type="button" class="sort-btn' + (shopSort === s[0] ? " is-on" : "") + '" data-shop-sort="' + s[0] + '">' + s[1] + '</button>';
        }).join("")
      + '</div>';
    return '<section class="page stuff-page"><div class="page-head"><div><h1>Shop</h1>'
      + '<p class="shop-banner">Coins are labels only — no payments on Whirled Classic yet.</p>'
      + '<p class="meta">Browse popular selections, then pick a category. Purchases stay disabled (labels only, no payments).</p></div></div>'
      + popular
      + '<div class="stuff-layout">' + catRail("shop", shopCat)
      + '<div class="stuff-main"><h2 class="stuff-cat-title">' + esc(meta.label) + '</h2>' + sortUi + body + '</div></div></section>';
  }
  function catalog(title, blurb, items) {
    return '<section class="page"><div class="page-head"><div><h1>' + esc(title) + '</h1><p>' + esc(blurb) + '</p></div></div><div class="grid">' + items.map(card).join('') + '</div></section>';
  }
  function genreRail(active) {
    return '<aside class="stuff-rail games-genre-rail" aria-label="Genres"><ul class="stuff-cats">'
      + '<li><button type="button" class="stuff-cat' + (active === "all" ? " is-on" : "") + '" data-game-genre="all">All</button></li>'
      + GAME_GENRES.map(function (c) {
          return '<li><button type="button" class="stuff-cat' + (c.id === active ? " is-on" : "") + '" data-game-genre="' + c.id + '">' + esc(c.label) + '</button></li>';
        }).join("")
      + '</ul></aside>';
  }
  function genreChips(active) {
    return '<div class="genre-chips" role="group" aria-label="Genres">'
      + '<button type="button" class="sort-btn' + (active === "all" ? " is-on" : "") + '" data-game-genre="all">All</button>'
      + GAME_GENRES.map(function (c) {
          return '<button type="button" class="sort-btn' + (c.id === active ? " is-on" : "") + '" data-game-genre="' + c.id + '">' + esc(c.label) + '</button>';
        }).join("")
      + '</div>';
  }
  function gameCard(g) {
    var id = g.id || g.name || "";
    var coins = (g.coins != null ? g.coins : g.price);
    var price = coins != null ? (coins + " coins") : "free";
    return '<button type="button" class="card shop-card game-card" data-game-open="' + esc(id) + '">'
      + '<div class="swatch"></div><div class="body"><h3>' + esc(g.name || "Game") + '</h3>'
      + '<p class="meta">' + esc(gameGenreLabel(gameGenreOf(g))) + " · " + esc(g.creator || "member") + '</p>'
      + '<div class="price">' + esc(String(price)) + '</div></div></button>';
  }
  function gameGenreLabel(id) {
    for (var i = 0; i < GAME_GENRES.length; i++) if (GAME_GENRES[i].id === id) return GAME_GENRES[i].label;
    return "Other";
  }
  function gamesLobbyPage() {
    var tables = loadGameTables();
    var s = session();
    var meId = s && s.user ? s.user.id : "";
    var rows;
    if (!tables.length) {
      rows = '<div class="panel"><p class="meta">No tables awaiting players. Create a game below — local only for now.</p></div>';
    } else {
      rows = '<div class="game-table-list">' + tables.map(function (t) {
        var seats = t.players || [];
        var n = seats.length;
        var max = Number(t.maxPlayers) || 4;
        var joined = seats.some(function (p) { return p.id === meId; });
        var alone = joined && n === 1;
        var meta = alone
          ? "Waiting for other players"
          : (n + "/" + max + " players" + (t.rated ? " · rated" : " · unrated"));
        return '<div class="game-table-row">'
          + '<div><h3>' + esc(t.name || "Table") + '</h3>'
          + '<p class="meta">' + esc(meta) + (t.gameName ? (" · " + esc(t.gameName)) : "") + '</p>'
          + '<p class="meta">Host: ' + esc(t.hostName || "member") + '</p></div>'
          + '<div class="game-table-actions">'
          + (joined
            ? '<button type="button" class="action-btn" data-table-leave="' + esc(t.id) + '">Leave</button>'
              + '<button type="button" class="action-btn" data-table-start="' + esc(t.id) + '"' + (n < 1 ? " disabled" : "") + '>Start now</button>'
            : '<button type="button" class="action-btn" data-table-join="' + esc(t.id) + '"' + (n >= max ? " disabled" : "") + '>Join</button>')
          + '</div></div>';
      }).join("") + '</div>';
    }
    return '<section class="page games-page">'
      + '<button type="button" class="text-btn" data-games-back="1">← All games</button>'
      + '<div class="featured">Games awaiting players</div>'
      + '<p class="shop-banner">Multiplayer lobby shell — not a real Pixi game. Tables are local-only.</p>'
      + '<div class="section-label">Tables</div>'
      + rows
      + '<div class="section-label">Create Game</div>'
      + '<div class="panel"><form id="create-table-form">'
      +   '<input name="name" maxlength="60" placeholder="Table name" required />'
      +   '<label class="meta">Max players <input name="max" type="number" min="2" max="8" value="4" /></label>'
      +   '<label class="meta"><input name="rated" type="checkbox" /> Rated</label>'
      +   '<button type="submit">Create Game</button>'
      + '</form></div></section>';
  }
  function gameDetailPage(g) {
    if (!g) {
      gameViewId = null;
      gamesMode = "browse";
      return gamesBrowsePage();
    }
    var id = g.id || g.name;
    var favs = loadGameFavorites();
    var isFav = favs.indexOf(id) >= 0;
    var comments = loadGameComments(id);
    var commentRows = comments.length
      ? comments.map(function (c) {
          return '<div class="wall-row"><b>' + esc(c.who || "member") + '</b> ' + esc(c.text || "")
            + '<time>' + esc((c.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
        }).join("")
      : '<p class="meta">No comments yet.</p>';
    var coins = (g.coins != null ? g.coins : g.price);
    var price = coins != null ? (coins + " coins") : "free";
    var tabs = [["play", "Play"], ["trophies", "Trophies"], ["comments", "Comments"]].map(function (t) {
      return '<button type="button" class="sort-btn' + (gameDetailTab === t[0] ? " is-on" : "") + '" data-game-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join("");
    var body;
    if (gameDetailTab === "trophies") {
      body = '<div class="panel"><p class="meta">No trophies yet. Achievements arrive with the engine track.</p></div>';
    } else if (gameDetailTab === "comments") {
      body = '<div class="panel"><div class="comment-list">' + commentRows + '</div>'
        + '<form id="game-comment-form" data-game-comment="' + esc(id) + '">'
        + '<textarea name="text" maxlength="400" rows="3" placeholder="Post a comment…" required></textarea>'
        + '<button type="submit">Post Comment</button></form></div>';
    } else {
      body = '<div class="panel">'
        + '<p class="meta">Open the multiplayer lobby to create or join a table. This is a shell — not a Pixi game.</p>'
        + '<button type="button" class="action-btn" data-game-play="' + esc(id) + '">Play</button>'
        + '</div>';
    }
    return '<section class="page games-page">'
      + '<button type="button" class="text-btn" data-games-back="1">← All games</button>'
      + '<div class="shop-detail">'
      +   '<div class="panel shop-detail-panel">'
      +     '<h1>' + esc(g.name || "Game") + '</h1>'
      +     '<p class="meta">' + esc(gameGenreLabel(gameGenreOf(g))) + " · " + esc(g.creator || "member") + " · " + esc(String(price)) + '</p>'
      +     '<p class="lobby-blurb">' + esc(g.blurb || g.description || "Saved local game shell.") + '</p>'
      +     '<div class="shop-detail-actions">'
      +       '<button type="button" class="action-btn" data-game-play="' + esc(id) + '">Play</button>'
      +       '<button type="button" class="action-btn fav-btn' + (isFav ? " is-on" : "") + '" data-game-fav="' + esc(id) + '">' + (isFav ? "♥ Favorited" : "♡ Favorite") + '</button>'
      +     '</div>'
      +     '<div class="shop-sort" role="tablist">' + tabs + '</div>'
      +     body
      +   '</div></div></section>';
  }
  function gamesBrowsePage() {
    var all = loadGames();
    var filtered = gameGenre === "all" ? all.slice() : all.filter(function (g) { return gameGenreOf(g) === gameGenre; });
    var favIds = loadGameFavorites();
    var favGames = all.filter(function (g) { return favIds.indexOf(g.id || g.name) >= 0; });
    var listBody = filtered.length
      ? '<div class="grid">' + filtered.map(gameCard).join("") + '</div>'
      : '<div class="panel"><p class="meta">No games in this genre yet. Games come from localStorage <code>whirled2.games</code> only — nothing is invented.</p></div>';
    var favBody = favGames.length
      ? '<div class="grid tight">' + favGames.map(gameCard).join("") + '</div>'
      : '<p class="meta">No favorites yet.</p>';
    return '<section class="page games-page">'
      + '<div class="page-head"><div><h1>Games</h1>'
      + '<p class="shop-banner">Parlor games mount later with the engine track. Coins from games are labels only.</p></div>'
      + '<button type="button" class="action-btn" data-games-lobby="1">Games awaiting players</button></div>'
      + '<div class="stuff-layout">' + genreRail(gameGenre)
      + '<div class="stuff-main">'
      +   genreChips(gameGenre)
      +   '<div class="section-label">Featured</div>'
      +   '<div class="panel"><p class="meta">No featured games yet.</p></div>'
      +   '<div class="section-label">My favorites</div>'
      +   '<div class="panel">' + favBody + '</div>'
      +   '<div class="section-label">Games</div>'
      +   listBody
      + '</div></div></section>';
  }
  function gamesPage() {
    if (gamesMode === "lobby") return gamesLobbyPage();
    if (gamesMode === "detail" && gameViewId) {
      var g = findGame(gameViewId);
      return gameDetailPage(g);
    }
    return gamesBrowsePage();
  }
  function findGroup(gid) {
    var list = loadGroups();
    for (var i = 0; i < list.length; i++) if (list[i].id === gid) return list[i];
    return null;
  }
  function groupThreadView(g, thread) {
    var replies = (thread.replies || []);
    var rows = replies.map(function (r) {
      return '<div class="wall-row"><b>' + esc(r.who || "member") + '</b> ' + esc(r.text || "")
        + '<time>' + esc((r.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
    }).join("") || '<p class="meta">No replies yet.</p>';
    return '<section class="page group-page">'
      + '<button type="button" class="text-btn" data-group-open="' + esc(g.id) + '">← Back to ' + esc(g.name) + '</button>'
      + '<div class="featured">Discussion</div>'
      + '<h1>' + esc(thread.title || "Thread") + '</h1>'
      + '<p class="meta">Started by ' + esc(thread.who || "member") + '</p>'
      + '<div class="panel"><p>' + esc(thread.body || "") + '</p></div>'
      + '<div class="section-label">Replies</div>'
      + '<div class="comment-list">' + rows + '</div>'
      + '<form id="group-reply-form" data-group-reply="' + esc(g.id) + '" data-thread-id="' + esc(thread.id) + '">'
      +   '<textarea name="text" maxlength="800" rows="3" placeholder="Reply…" required></textarea>'
      +   '<button type="submit">Post reply</button>'
      + '</form></section>';
  }
  function groupDetailPage(g) {
    if (!g) {
      groupViewId = null; groupThreadId = null;
      return groupsListPage();
    }
    if (groupThreadId) {
      var threads0 = loadGroupThreads(g.id);
      var th = null;
      for (var t = 0; t < threads0.length; t++) if (threads0[t].id === groupThreadId) { th = threads0[t]; break; }
      if (th) return groupThreadView(g, th);
      groupThreadId = null;
    }
    var s = session();
    var meId = s && s.user ? s.user.id : "";
    var members = g.members || [];
    var isMember = members.some(function (m) { return m.id === meId; });
    var isCreator = g.creatorId === meId;
    var memberRows = members.length
      ? '<ul class="group-members">' + members.map(function (m) {
          var tag = m.id === g.creatorId ? " (creator)" : "";
          return '<li><button type="button" class="text-btn" data-profile="' + esc(m.id) + '">' + esc(m.name || m.id) + esc(tag) + '</button></li>';
        }).join("") + '</ul>'
      : '<p class="meta">No members yet.</p>';
    var threads = loadGroupThreads(g.id);
    var threadList = threads.length
      ? '<ul class="thread-list">' + threads.map(function (th) {
          return '<li><button type="button" class="text-btn" data-group-thread="' + esc(th.id) + '" data-group-open="' + esc(g.id) + '"><b>' + esc(th.title) + '</b></button>'
            + ' <span class="meta">by ' + esc(th.who || "") + ' · ' + ((th.replies && th.replies.length) || 0) + ' replies</span></li>';
        }).join("") + '</ul>'
      : '<p class="meta">No threads yet. Start a discussion below.</p>';
    var joinBtn = isMember
      ? '<button type="button" class="action-btn" data-group-leave="' + esc(g.id) + '"' + (isCreator ? ' disabled title="Creators stay in their group"' : '') + '>Leave</button>'
      : '<button type="button" class="action-btn" data-group-join="' + esc(g.id) + '">Join this group</button>';
    return '<section class="page group-page">'
      + '<button type="button" class="text-btn" data-group-back="1">← All groups</button>'
      + '<div class="featured">Group</div>'
      + '<h1>' + esc(g.name) + '</h1>'
      + '<p class="lobby-blurb">' + esc(g.blurb || "") + '</p>'
      + '<div class="group-actions">'
      +   joinBtn
      +   '<button type="button" class="action-btn" data-group-hall="' + esc(g.id) + '">Enter hall</button>'
      + '</div>'
      + '<p class="meta">Enter hall opens the Rooms lobby / Studio Loft (shared whirled halls come later).</p>'
      + '<div class="section-label">Members</div>'
      + '<div class="panel">' + memberRows + '</div>'
      + '<div class="section-label">Discussion forum</div>'
      + '<div class="panel">' + threadList
      +   '<form id="group-thread-form" data-group-new-thread="' + esc(g.id) + '">'
      +     '<input name="title" maxlength="120" placeholder="Thread title" required />'
      +     '<textarea name="body" maxlength="800" rows="3" placeholder="Say something…" required></textarea>'
      +     '<button type="submit">Start thread</button>'
      +   '</form></div></section>';
  }
  function groupsListPage() {
    var list = loadGroups();
    var s = session();
    var meId = s && s.user ? s.user.id : "";
    var rows;
    if (!list.length) {
      rows = '<div class="panel"><p class="meta">No groups yet. Create one to start a discussion.</p></div>';
    } else {
      rows = '<div class="group-list">' + list.map(function (g) {
        var n = (g.members && g.members.length) || 0;
        var joined = (g.members || []).some(function (m) { return m.id === meId; });
        return '<button type="button" class="group-row" data-group-open="' + esc(g.id) + '">'
          + '<h3>' + esc(g.name) + '</h3>'
          + '<p class="meta">' + esc(g.blurb || "") + '</p>'
          + '<span class="meta">' + n + ' member' + (n === 1 ? "" : "s") + (joined ? " · joined" : "") + '</span>'
          + '</button>';
      }).join("") + '</div>';
    }
    return '<section class="page group-page">'
      + '<div class="featured">Groups</div>'
      + '<p class="lobby-blurb">Groups are social clubs with a discussion forum and a hall. Shared whirleds come later.</p>'
      + '<div class="section-label">Your groups</div>'
      + rows
      + '<div class="section-label">Create group</div>'
      + '<div class="panel"><form id="create-group-form">'
      +   '<input name="name" maxlength="60" placeholder="Group name" required />'
      +   '<textarea name="blurb" maxlength="240" rows="2" placeholder="Short blurb" required></textarea>'
      +   '<button type="submit">Create group</button>'
      + '</form></div></section>';
  }
  function groupsPage() {
    if (groupViewId) {
      var g = findGroup(groupViewId);
      if (g) return groupDetailPage(g);
      groupViewId = null;
      groupThreadId = null;
    }
    return groupsListPage();
  }
  function roomTile(opts) {
    opts = opts || {};
    var online = opts.online != null ? opts.online : 0;
    var enter = opts.enterable !== false;
    var rating = opts.rating || "Rating: new";
    var tag = enter ? "button" : "div";
    var attrs = enter ? ' type="button" class="room-tile" data-enter-room="' + esc(opts.id || "loft") + '"' : ' class="room-tile is-empty"';
    return '<' + tag + attrs + '>'
      + '<div class="thumb" aria-hidden="true"></div>'
      + '<div class="body"><h3>' + esc(opts.name || ROOM) + '</h3>'
      +   '<p class="meta">' + esc(opts.meta || "") + '</p>'
      +   '<div class="room-rating">' + esc(rating) + '</div>'
      +   '<div class="online">' + (online > 0 ? (online + " online now!") : "0 players") + '</div>'
      +   (enter ? '<span class="enter-label">Enter</span>' : '<span class="meta">—</span>')
      + '</div></' + tag + '>';
  }
  function roomsLobby() {
    var me = you();
    var online = liveOccupants.length || 0;
    var featured = roomTile({
      id: "loft",
      name: ROOM,
      meta: "owner: " + me.name + " · home",
      online: online || (session() ? 1 : 0),
      rating: loftRatingLabel(),
      enterable: true
    });
    var activeBody = online > 0
      ? roomTile({
          id: "loft",
          name: ROOM,
          meta: "owner: " + me.name + " · active",
          online: online,
          rating: loftRatingLabel(),
          enterable: true
        })
      : '<div class="panel"><p class="meta">No active rooms right now. Enter Studio Loft to open one.</p></div>';
    var tips = [
      "Me — profile, friends, mail, passport, and account live under the Me tab.",
      "Stuff — your inventory by category. Empty shelves stay empty until you own items.",
      "Rooms — decorate and hang out. Studio Loft is your home whirled.",
      "Mail — send notes to friends from profiles or the Mail sub-tab."
    ];
    var tip = tips[tourTip % tips.length];
    return '<section class="page rooms-lobby">'
      + '<div class="featured">Featured Rooms</div>'
      + '<p class="lobby-blurb">Rooms are where you create your space and show it off. Decorate, chat and play — engine mounts inside the loft.</p>'
      + '<div class="room-tiles">' + featured + '</div>'
      + '<div class="section-label">Active Rooms</div>'
      + (online > 0 ? '<div class="room-tiles">' + activeBody + '</div>' : activeBody)
      + '<div class="section-label">Hot New Rooms</div>'
      + '<div class="panel"><p class="meta">No hot new rooms yet. Public listings arrive when the shared server publishes them.</p></div>'
      + '<div class="section-label">My Rooms</div>'
      + '<div class="room-tiles">'
      +   roomTile({ id: "loft", name: ROOM, meta: "owner: " + me.name + " · home", online: online || (session() ? 1 : 0), rating: loftRatingLabel(), enterable: true })
      + '</div>'
      + '<div class="rooms-lobby-links">'
      +   '<button type="button" class="action-btn" data-tour-tip="1">Take the Whirled Tour</button>'
      + '</div>'
      + '<div class="panel tour-panel" id="tour-panel">'
      +   '<p class="tour-tip"><b>Tip ' + ((tourTip % tips.length) + 1) + '/' + tips.length + ':</b> ' + esc(tip) + '</p>'
      +   '<p class="meta">Local tips only — not a tour of other players.</p>'
      + '</div>'
      + '</section>';
  }

  function roomCommentsPanel() {
    var comments = loadRoomComments();
    var rating = loadRoomRating();
    var stars = [1,2,3,4,5].map(function (n) {
      return '<button type="button" class="star-btn' + (rating >= n ? " is-on" : "") + '" data-room-rate="' + n + '" aria-label="Rate room ' + n + '">' + (rating >= n ? "★" : "☆") + '</button>';
    }).join("");
    var rows = comments.length
      ? comments.map(function (c) {
          return '<div class="wall-row"><b>' + esc(c.who || "member") + '</b> ' + esc(c.text || "")
            + '<time>' + esc((c.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
        }).join("")
      : '<p class="meta">No room comments yet.</p>';
    return '<div class="room-side-panel" id="room-comment-panel">'
      + '<div class="panel">'
      +   '<div class="room-side-head"><h2>Comment or rate</h2>'
      +     '<button type="button" class="text-btn" data-room-panel-close="1">Close</button></div>'
      +   '<div class="section-label">Rate this room</div>'
      +   '<div class="star-row">' + stars + ' <span class="meta">' + esc(loftRatingLabel()) + '</span></div>'
      +   '<div class="section-label">Comments</div>'
      +   '<div class="comment-list">' + rows + '</div>'
      +   '<form id="room-comment-form">'
      +     '<textarea name="text" maxlength="400" rows="3" placeholder="Leave a room comment…" required></textarea>'
      +     '<button type="submit">Post comment</button>'
      +   '</form>'
      + '</div></div>';
  }
  function lockLabel(v) {
    if (v === "friends") return "Friends";
    if (v === "locked") return "Locked";
    return "Unlocked";
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
    var lock = loadRoomLock();
    return ''
      + '<div class="workspace">'
      +   '<aside class="rail"><h2>In this room</h2>'
      +     (empty ? '<p class="sub" style="padding:8px 10px">Nobody here yet.</p>' : here.map(personRow).join(''))
      +     '<button type="button" class="text-btn leave-room" data-leave-room="1">Back to Rooms</button>'
      +   '</aside>'
      +   '<section class="stage-wrap">'
      +     '<div class="room-strip"><span class="room-name">' + esc(ROOM) + '</span>'
      +       '<span class="room-owner">owner: ' + esc(me.name) + '</span>'
      +       '<span class="room-lock-badge" title="Visual only on Pages" data-lock="' + esc(lock) + '">🔒 ' + esc(lockLabel(lock)) + '</span>'
      +       '<span class="room-rating-badge">' + esc(loftRatingLabel()) + '</span></div>'
      +     '<div id="stage-slot"><div class="stage-copy"><strong>Your room — engine mounts here</strong>Empty classic stage for now. Decorate later — click-to-walk arrives with the engine track.<code>#stage-slot</code></div></div>'
      +     '<div class="chat-log" id="chat-log">' + chat.map(chatRow).join('') + '</div>'
      +     (roomPanelOpen ? roomCommentsPanel() : '')
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


  function loadInfo(userId) {
    try {
      return Object.assign({
        activities: "", interests: "", games: "", music: "", movies: "", shows: "", books: "", about: "", homepage: ""
      }, JSON.parse(localStorage.getItem(INFO_KEY + userId) || "{}"));
    } catch (e) {
      return { activities: "", interests: "", games: "", music: "", movies: "", shows: "", books: "", about: "", homepage: "" };
    }
  }
  function saveInfo(userId, info) {
    localStorage.setItem(INFO_KEY + userId, JSON.stringify(info));
  }
  function infoRows(info) {
    var labels = [
      ["activities", "Activities"], ["interests", "Interests"], ["games", "Favorite Games"],
      ["music", "Favorite Music"], ["movies", "Favorite Movies"], ["shows", "Favorite Shows"],
      ["books", "Favorite Books"], ["about", "About Me"]
    ];
    var rows = labels.map(function (pair) {
      var val = (info[pair[0]] || "").trim();
      if (!val) return "";
      return '<div class="info-row"><span class="info-label">' + pair[1] + '</span><span class="info-value">' + esc(val) + '</span></div>';
    }).filter(Boolean).join("");
    return rows || '<p class="meta">No information filled in yet.</p>';
  }
  function friendsStrip() {
    var list = loadFriends().slice(0, 24);
    if (!list.length) return '<p class="meta">No friends listed yet.</p>';
    return '<div class="friends-strip">' + list.map(function (f) {
      var ph = localStorage.getItem("whirled2.photo." + f.id) || "";
      var thumb = ph
        ? '<img src="' + ph + '" alt="" width="48" height="48" />'
        : '<span class="friend-fallback">' + esc(String(f.name || "?").slice(0, 1).toUpperCase()) + '</span>';
      return '<button type="button" class="friend-thumb" data-profile="' + esc(f.id) + '" title="' + esc(f.name) + '">' + thumb + '<span>' + esc(f.name) + '</span></button>';
    }).join("") + '</div>';
  }
  function profileActionRow(opts) {
    opts = opts || {};
    var mailBtn = opts.mail
      ? '<button type="button" class="profile-action" ' + opts.mail + '><span class="pa-ico">✉</span><span>Send Mail</span></button>'
      : '<button type="button" class="profile-action" data-me="mail"><span class="pa-ico">✉</span><span>Mail</span></button>';
    return '<div class="profile-action-row">'
      + mailBtn
      + '<button type="button" class="profile-action" data-enter-room="loft"><span class="pa-ico">⌂</span><span>Visit Home</span></button>'
      + '<button type="button" class="profile-action" data-tab="rooms" data-rooms-lobby="1"><span class="pa-ico">▣</span><span>View Rooms</span></button>'
      + '<button type="button" class="profile-action" data-tab="stuff"><span class="pa-ico">▤</span><span>Browse Items</span></button>'
      + (opts.poke ? '<button type="button" class="profile-action poke" ' + opts.poke + '><span class="pa-ico">☞</span><span>Poke</span></button>' : '')
      + (opts.friend ? '<button type="button" class="profile-action" ' + opts.friend + '><span class="pa-ico">+</span><span>Add Friend</span></button>' : '')
      + (opts.photo ? '<label class="profile-action photo-label"><span class="pa-ico">▣</span><span>Photo</span><input type="file" id="photo-input" accept="image/*" hidden /></label>' : '')
      + '</div>';
  }

  function meSubnav() {
    return '<div class="me-subnav"><span class="me-title">Me</span><nav class="me-links">'
      + '<button type="button" class="me-link' + (meSub === "home" ? " is-on" : "") + '" data-me="home">Me</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "profile" ? " is-on" : "") + '" data-me="profile">My Profile</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link" data-enter-room="loft">My Rooms</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "friends" ? " is-on" : "") + '" data-me="friends">Friends</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "mail" ? " is-on" : "") + '" data-me="mail">Mail</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "passport" ? " is-on" : "") + '" data-me="passport">My Passport</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "account" ? " is-on" : "") + '" data-me="account">Account</button>'
      + '</nav></div>';
  }
  function newsKindOf(n) {
    var k = String((n && n.kind) || "").toLowerCase();
    if (k === "friending" || k === "friend" || k.indexOf("friend") >= 0) return "friending";
    if (k === "status") return "status";
    if (k === "comment" || k === "blue") return "comment";
    if (k === "trophy" || k === "trophies") return "trophy";
    if (k === "announce" || k === "announcement") return "announce";
    if (k === "room" || k === "rooms") return "room";
    if (k === "orange") return "status";
    return "other";
  }
  function myNewsSections() {
    var sid = session().user.id;
    var items = [];
    loadNotices().forEach(function (n) {
      items.push({ kind: newsKindOf(n), text: n.text, who: "", at: n.at || "" });
    });
    loadWall(sid).forEach(function (w) {
      var k = w.kind === "status" ? "status" : "comment";
      items.push({ kind: k, text: w.text, who: w.who || "", at: w.at || "" });
    });
    loadFriends().forEach(function (f) {
      if (!f || !f.at) return;
      items.push({ kind: "friending", text: "You friended " + (f.name || f.id) + ".", who: f.name || "", at: f.at });
    });
    function rowsFor(kind) {
      var rows = items.filter(function (it) { return it.kind === kind; })
        .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); })
        .slice(0, 12);
      if (!rows.length) return "";
      return rows.map(function (w) {
        var label = w.who ? ("<b>" + esc(w.who) + "</b> ") : "";
        return '<div class="news-row">' + label + esc(w.text) + '<time>' + esc((w.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
      }).join("");
    }
    function section(title, kind, emptyAlways) {
      var body = rowsFor(kind);
      if (!body && !emptyAlways) return "";
      if (!body) body = '<p class="meta">Nothing here yet.</p>';
      return '<div class="news-section"><h3>' + esc(title) + '</h3>' + body + '</div>';
    }
    var hasAny = items.some(function (it) {
      return it.kind === "comment" || it.kind === "friending" || it.kind === "status";
    });
    if (!hasAny) {
      return '<p class="meta">No news yet. Post a status on My Profile, leave a comment, or add a friend.</p>'
        + section("Announcements", "announce", true)
        + section("Trophies", "trophy", true)
        + section("Updated Rooms", "room", true);
    }
    return section("Comments", "comment", true)
      + section("Friendings", "friending", true)
      + section("Status", "status", true)
      + section("Announcements", "announce", true)
      + section("Trophies", "trophy", true)
      + section("Updated Rooms", "room", true);
  }
  function meHome() {
    var me = you();
    var st = loadStatus(session().user.id);
    var friendIds = {};
    loadFriends().forEach(function (f) { friendIds[f.id] = true; });
    var friendsOnline = liveOccupants.filter(function (p) {
      return !p.you && friendIds[p.id];
    });
    var friendBox = friendsOnline.length
      ? friendsOnline.map(function (p) {
          return '<div class="friend-row"><span class="ava">' + esc(p.initials || "?") + '</span><div><b>' + esc(p.name) + '</b><div class="sub">In ' + esc(p.room || ROOM) + '</div></div></div>';
        }).join("")
      : '<p class="meta">None of your friends are online right now.</p>';
    var peopleNow = liveOccupants.length || (session() ? 1 : 0);
    var unread = unreadCount();
    return '<section class="page me-page">' + meSubnav()
      + '<div class="me-grid">'
      +   '<div class="me-main">'
      +     '<div class="panel invite-banner">Invite friends to Whirled Classic — coins stay labels only (no payments).</div>'
      +     '<div class="panel"><h2>My News</h2>'
      +       (st ? '<p class="status-line"><b>Your status:</b> ' + esc(st) + '</p>' : '')
      +       myNewsSections() + '</div>'
      +   '</div>'
      +   '<aside class="me-side">'
      +     '<div class="panel links-panel">'
      +       '<div class="online-count">People Online Now: <b>' + peopleNow + '</b></div>'
      +       '<button type="button" class="text-btn" data-me="profile">My Profile</button>'
      +       '<button type="button" class="text-btn" data-enter-room="loft">My Rooms</button>'
      +       '<button type="button" class="text-btn" data-me="passport">My Passport</button>'
      +       '<button type="button" class="text-btn" data-me="mail">Mail' + (unread ? ' (' + unread + ')' : '') + '</button>'
      +       '<button type="button" class="text-btn" data-me="account">Account</button>'
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
    var info = loadInfo(sid);
    if (!info.about && me.bio) info.about = me.bio;
    var pokes = (loadPokes()[sid] || []).slice(0, 8);
    var photoHtml = photo
      ? '<img class="profile-photo" src="' + photo + '" alt="Profile photo" width="80" height="60" />'
      : '<div class="profile-photo missing"><span>' + esc(me.initials) + '</span></div>';
    var wallHtml = wall.length ? wall.map(function (w) {
      return '<div class="wall-row"><span class="ava">' + esc((w.who || "?").slice(0, 1)) + '</span><div><b>' + esc(w.who) + '</b> ' + esc(w.text) + '<time>' + esc((w.at || "").slice(0, 16).replace("T", " ")) + '</time></div></div>';
    }).join("") : '<p class="meta">No comments yet.</p>';
    var newsHtml = wall.filter(function (w) { return w.kind === "status" || w.kind === "comment"; }).slice(0, 8).map(function (w) {
      return '<div class="news-row"><b>' + esc(w.who) + '</b> ' + esc(w.text) + '<time>' + esc((w.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
    }).join("") || '<p class="meta">No player news yet.</p>';
    var member = "";
    try { member = (session().user.since || localStorage.getItem("whirled2.since." + sid) || ""); } catch (e) {}
    if (!member) {
      member = new Date().toISOString().slice(0, 10);
      try { localStorage.setItem("whirled2.since." + sid, member); } catch (e) {}
    }
    return '<section class="page me-page profile-page">' + meSubnav()
      + '<div class="classic-profile">'
      +   '<div class="cp-header">'
      +     '<div class="cp-photo">' + photoHtml + '</div>'
      +     '<div class="cp-main">'
      +       '<div class="cp-name-row"><span class="cp-name">' + esc(me.name) + '</span><span class="level-badge">Level 1</span></div>'
      +       '<div class="cp-status">' + (st ? esc(st) : '<span class="meta">No status set</span>') + '</div>'
      +       profileActionRow({ photo: true, poke: 'id="poke-self-demo"' })
      +     '</div>'
      +     '<aside class="cp-meta-box">'
      +       '<div><span class="k">Permaname</span><span class="v">' + esc(sid) + '</span></div>'
      +       '<div><span class="k">Member since</span><span class="v">' + esc(member) + '</span></div>'
      +       '<div><span class="k">Last online</span><span class="v">now</span></div>'
      +       '<div><span class="k">Home Page</span><span class="v">' + (info.homepage ? '<a href="' + esc(info.homepage) + '" target="_blank" rel="noopener">' + esc(info.homepage) + '</a>' : '—') + '</span></div>'
      +     '</aside>'
      +   '</div>'
      +   '<form class="status-form cp-status-form" id="status-form"><input name="status" maxlength="140" placeholder="Update your status…" value="' + esc(st) + '" /><button type="submit">Set status</button></form>'
      +   '<div class="cp-section"><h2>Information</h2>'
      +     '<form class="info-form" id="info-form">'
      +       '<label>Activities <input name="activities" value="' + esc(info.activities) + '" /></label>'
      +       '<label>Interests <input name="interests" value="' + esc(info.interests) + '" /></label>'
      +       '<label>Favorite Games <input name="games" value="' + esc(info.games) + '" /></label>'
      +       '<label>Favorite Music <input name="music" value="' + esc(info.music) + '" /></label>'
      +       '<label>Favorite Movies <input name="movies" value="' + esc(info.movies) + '" /></label>'
      +       '<label>Favorite Shows <input name="shows" value="' + esc(info.shows) + '" /></label>'
      +       '<label>Favorite Books <input name="books" value="' + esc(info.books) + '" /></label>'
      +       '<label>About Me <input name="about" value="' + esc(info.about || me.bio) + '" /></label>'
      +       '<label>Home Page URL <input name="homepage" value="' + esc(info.homepage) + '" /></label>'
      +       '<label>Display name <input name="name" maxlength="24" value="' + esc(me.name) + '" /></label>'
      +       '<button type="submit">Save information</button><p class="meta" id="profile-msg"></p>'
      +     '</form>'
      +     '<div class="info-preview">' + infoRows(Object.assign({}, info, { about: info.about || me.bio })) + '</div>'
      +   '</div>'
      +   '<div class="cp-section"><h2>Player News</h2>' + newsHtml + '</div>'
      +   '<div class="cp-section"><h2>Friends</h2>' + friendsStrip() + '</div>'
      +   '<div class="cp-section"><h2>Comments</h2>'
      +     '<form class="wall-form" id="wall-form"><input name="text" maxlength="240" placeholder="Leave a comment" required /><button type="submit">Post</button></form>'
      +     '<div id="wall-list">' + wallHtml + '</div></div>'
      +   '<div class="cp-section"><h2>Pokes</h2>' + (pokes.length ? pokes.map(function (p) {
            return '<div class="meta">Poked by <b>' + esc(p.from) + '</b> · ' + esc((p.at || "").slice(0, 16).replace("T", " ")) + '</div>';
          }).join("") : '<p class="meta">No pokes yet.</p>') + '</div>'
      + '</div></section>';
  }

  function collectSearchablePeople() {
    var map = {};
    function add(p) {
      if (!p || !p.id) return;
      if (session() && p.id === session().user.id) return;
      var prev = map[p.id];
      map[p.id] = {
        id: p.id,
        name: p.name || (prev && prev.name) || p.id,
        online: !!(p.online || (prev && prev.online)),
        room: p.room || (prev && prev.room) || ""
      };
    }
    liveOccupants.forEach(function (p) {
      add({ id: p.id, name: p.name, online: true, room: p.room });
      rememberProfile({ id: p.id, name: p.name });
    });
    loadFriends().forEach(function (f) { add({ id: f.id, name: f.name, online: false }); });
    loadKnownProfiles().forEach(function (p) { add({ id: p.id, name: p.name, online: false }); });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function searchPeople(q) {
    q = String(q || "").trim().toLowerCase();
    if (!q) return [];
    return collectSearchablePeople().filter(function (p) {
      var name = String(p.name || "").toLowerCase();
      var id = String(p.id || "").toLowerCase();
      return name.indexOf(q) >= 0 || id.indexOf(q) >= 0;
    }).slice(0, 40);
  }
  function meFriends() {
    var list = loadFriends().slice();
    var onlineIds = {};
    liveOccupants.forEach(function (p) { if (p && p.id) onlineIds[p.id] = p; });
    var online = list.filter(function (f) { return onlineIds[f.id]; })
      .sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || "")); });
    var offline = list.filter(function (f) { return !onlineIds[f.id]; })
      .sort(function (a, b) { return String(b.at || "").localeCompare(String(a.at || "")); });
    function friendListRow(f, isOn) {
      var occ = onlineIds[f.id];
      var st = loadStatus(f.id);
      var loc = (occ && occ.room) || "offline";
      var ph = "";
      try { ph = localStorage.getItem("whirled2.photo." + f.id) || ""; } catch (e) {}
      var thumb = ph
        ? '<img class="friend-list-photo" src="' + ph + '" alt="" width="40" height="40" />'
        : '<span class="ava">' + esc(String(f.name || "?").slice(0, 1).toUpperCase()) + '</span>';
      return '<div class="friend-list-row' + (isOn ? " is-online" : "") + '">'
        + thumb
        + '<div class="friend-list-main">'
        +   '<button type="button" class="text-btn friend-list-name" data-profile="' + esc(f.id) + '"><b>' + esc(f.name) + '</b></button>'
        +   '<div class="sub">' + (st ? esc(st) : '<span class="meta">No status</span>') + '</div>'
        +   '<div class="meta">' + (isOn ? "Online · " : "") + esc(loc) + '</div>'
        + '</div>'
        + '<div class="friend-list-actions">'
        +   '<button type="button" class="action-btn" data-mail-to="' + esc(f.id) + '" data-mail-name="' + esc(f.name) + '">Send Mail</button>'
        +   '<button type="button" class="action-btn" data-enter-room="loft">Visit Home</button>'
        +   '<button type="button" class="action-btn" data-remove-friend="' + esc(f.id) + '">Remove</button>'
        + '</div></div>';
    }
    var rows = "";
    if (online.length) {
      rows += '<div class="section-label">Online</div>' + online.map(function (f) { return friendListRow(f, true); }).join("");
    }
    if (offline.length) {
      rows += '<div class="section-label">Recent</div>' + offline.map(function (f) { return friendListRow(f, false); }).join("");
    }
    if (!list.length) {
      rows = '<p class="meta">No friends yet. Search below or open someone\'s profile and hit Add Friend.</p>';
    }
    var friendIdSet = {};
    list.forEach(function (f) { friendIdSet[f.id] = true; });
    var results = searchPeople(friendSearchQ);
    var searchRows;
    if (!String(friendSearchQ || "").trim()) {
      searchRows = '<p class="meta">Type a Whirled name or permaname (id). Results only include people in this session, your friends, or saved profiles — no invented players.</p>';
    } else if (!results.length) {
      searchRows = '<p class="meta">No matches among occupants, friends, or known profiles.</p>';
    } else {
      searchRows = results.map(function (p) {
        var isFriend = !!friendIdSet[p.id];
        return '<div class="friend-list-row' + (p.online ? " is-online" : "") + '">'
          + '<span class="ava">' + esc(String(p.name || "?").slice(0, 1).toUpperCase()) + '</span>'
          + '<div class="friend-list-main">'
          +   '<button type="button" class="text-btn friend-list-name" data-profile="' + esc(p.id) + '"><b>' + esc(p.name) + '</b></button>'
          +   '<div class="meta">permaname ' + esc(p.id) + (p.online ? " · online" : "") + '</div>'
          + '</div>'
          + '<div class="friend-list-actions">'
          +   (isFriend ? '<span class="meta">Friend</span>' : '<button type="button" class="action-btn" data-add-friend="' + esc(p.id) + '" data-friend-name="' + esc(p.name) + '">Add Friend</button>')
          +   '<button type="button" class="action-btn" data-mail-to="' + esc(p.id) + '" data-mail-name="' + esc(p.name) + '">Send Mail</button>'
          +   '<button type="button" class="action-btn" data-enter-room="loft" data-profile="' + esc(p.id) + '">Visit</button>'
          + '</div></div>';
      }).join("");
    }
    return '<section class="page me-page">' + meSubnav()
      + '<div class="panel"><h2>Friends</h2>'
      + '<div class="section-label">Search</div>'
      + '<form id="friend-search-form" class="friend-search-form">'
      +   '<input name="q" maxlength="60" placeholder="Search by Whirled name or permaname" value="' + esc(friendSearchQ) + '" />'
      +   '<button type="submit">Search</button>'
      + '</form>'
      + '<div class="friend-search-results">' + searchRows + '</div>'
      + '<div class="section-label">Your friends</div>'
      + rows + '</div></section>';
  }

  function meMail(composeTo) {
    var s = session();
    var me = s.user;
    var inbox = loadMail().filter(function (m) {
      return m.toId === me.id || m.fromId === me.id;
    });
    var friends = loadFriends();
    var preTo = (composeTo && composeTo.id) || "";
    var preName = (composeTo && composeTo.name) || "";
    var listHtml = inbox.length ? inbox.map(function (m) {
      var mine = m.fromId === me.id;
      var unread = !m.read && m.toId === me.id;
      return '<div class="mail-row' + (unread ? " unread" : "") + '" data-mail-id="' + esc(m.id) + '">'
        + '<div class="mail-meta"><b>' + esc(mine ? ("To " + m.toName) : ("From " + m.fromName)) + '</b>'
        + '<time>' + esc((m.at || "").slice(0, 16).replace("T", " ")) + '</time></div>'
        + '<div class="mail-subject">' + esc(m.subject) + '</div>'
        + '<div class="mail-body">' + esc(m.body) + '</div></div>';
    }).join("") : '<p class="meta">No mail yet.</p>';
    var friendOpts = friends.map(function (f) {
      return '<option value="' + esc(f.id) + '"' + (f.id === preTo ? " selected" : "") + '>' + esc(f.name) + '</option>';
    }).join("");
    return '<section class="page me-page">' + meSubnav()
      + '<div class="mail-layout">'
      +   '<div class="panel"><h2>Inbox</h2>' + listHtml + '</div>'
      +   '<div class="panel"><h2>Compose</h2>'
      +     '<form class="mail-form" id="mail-form">'
      +       '<label>To friend <select name="friendId"><option value="">— pick a friend —</option>' + friendOpts + '</select></label>'
      +       '<label>Or free id <input name="toId" maxlength="40" placeholder="player id" value="' + esc(preTo && !friends.some(function(f){return f.id===preTo;}) ? preTo : "") + '" /></label>'
      +       '<label>Name <input name="toName" maxlength="40" placeholder="display name" value="' + esc(preName) + '" /></label>'
      +       '<label>Subject <input name="subject" maxlength="120" required /></label>'
      +       '<label>Message <textarea name="body" rows="5" maxlength="2000" required></textarea></label>'
      +       '<button type="submit">Send Mail</button>'
      +       '<p class="meta" id="mail-msg">Stored in this browser (localStorage).</p>'
      +     '</form></div>'
      + '</div></section>';
  }

  function mePassport() {
    var sid = session().user.id;
    var me = you();
    var stamps = loadPassport(sid);
    var byCat = {};
    PASSPORT_CATS.forEach(function (c) { byCat[c.id] = []; });
    stamps.forEach(function (s) {
      var cat = (s && s.cat) || "mingle";
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(s);
    });
    var stampSections = PASSPORT_CATS.map(function (c) {
      var list = byCat[c.id] || [];
      var grid = list.length
        ? '<div class="stamp-grid">' + list.map(function (s) {
            return '<div class="stamp-cell"><span class="stamp-name">' + esc(s.name || "Stamp") + '</span></div>';
          }).join("") + '</div>'
        : '<div class="stamp-grid empty"><div class="stamp-cell empty-slot"><span class="meta">No stamps yet</span></div></div>';
      return '<div class="passport-cat">'
        + '<div class="passport-cat-head"><h3>' + esc(c.label) + '</h3>'
        + '<button type="button" class="action-btn" disabled title="Coins rewards later — labels only">Go!</button></div>'
        + grid + '</div>';
    }).join("");
    return '<section class="page me-page passport-page">' + meSubnav()
      + '<div class="panel passport-shell">'
      +   '<div class="passport-head"><h1>My Passport</h1>'
      +     '<p class="meta">Stamps mark achievements across Mingle, Play, Create, and Shop. They arrive with the engine / achievements track — this page stays empty until then.</p>'
      +     '<p class="meta">Stored optionally as <code>whirled2.passport.' + esc(sid) + '</code> (array) for later.</p>'
      +   '</div>'
      +   '<div class="passport-body">' + stampSections + '</div>'
      +   '<div class="cp-section"><h2>Group Medals</h2>'
      +     '<p class="meta">No group medals yet. Medals appear when groups and shared whirleds go live.</p>'
      +     '<button type="button" class="text-btn" data-tab="groups">Browse Groups</button>'
      +   '</div>'
      +   '<p class="meta">Player: ' + esc(me.name) + ' · permaname ' + esc(sid) + '</p>'
      + '</div></section>';
  }
  function meAccount() {
    var me = you();
    var sid = session().user.id;
    var member = "";
    try { member = (session().user.since || localStorage.getItem("whirled2.since." + sid) || ""); } catch (e) {}
    if (!member) {
      member = new Date().toISOString().slice(0, 10);
      try { localStorage.setItem("whirled2.since." + sid, member); } catch (e) {}
    }
    var emailNote = "";
    try { emailNote = localStorage.getItem("whirled2.email." + sid) || ""; } catch (e) {}
    return '<section class="page me-page account-page">' + meSubnav()
      + '<div class="panel">'
      +   '<h2>Account</h2>'
      +   '<div class="account-grid">'
      +     '<div><span class="k">Permaname</span><span class="v">' + esc(sid) + '</span></div>'
      +     '<div><span class="k">Display name</span><span class="v">' + esc(me.name) + '</span></div>'
      +     '<div><span class="k">Member since</span><span class="v">' + esc(member) + '</span></div>'
      +     '<div><span class="k">Email</span><span class="v">'
      +       '<input type="email" disabled placeholder="Not set on Pages" value="' + esc(emailNote) + '" title="Local-only placeholder — email is not required on GitHub Pages" />'
      +       '<span class="meta"> Local-only note. Not synced.</span></span></div>'
      +   '</div>'
      +   '<p class="meta">Password changes are managed by register / login — not required on this chrome.</p>'
      +   '<button type="button" class="action-btn" disabled title="Not available on Pages">Delete account — not available on Pages</button>'
      + '</div></section>';
  }

  function otherProfile(id) {
    var occ = liveOccupants.filter(function (p) { return p.id === id; })[0];
    var friend = loadFriends().filter(function (f) { return f.id === id; })[0];
    var name = (occ && occ.name) || (friend && friend.name) || id;
    var initials = (occ && occ.initials) || String(name).slice(0, 1).toUpperCase();
    var st = loadStatus(id);
    var photo = localStorage.getItem("whirled2.photo." + id) || "";
    var wall = loadWall(id);
    var info = loadInfo(id);
    var photoHtml = photo
      ? '<img class="profile-photo" src="' + photo + '" alt="" width="80" height="60" />'
      : '<div class="profile-photo missing"><span>' + esc(initials) + '</span></div>';
    var wallHtml = wall.length ? wall.map(function (w) {
      return '<div class="wall-row"><b>' + esc(w.who) + '</b> ' + esc(w.text) + '<time>' + esc((w.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
    }).join("") : '<p class="meta">No comments yet.</p>';
    var isSelf = session() && session().user.id === id;
    var member = "";
    try { member = localStorage.getItem("whirled2.since." + id) || ""; } catch (e) {}
    return '<section class="page me-page profile-page">' + meSubnav()
      + '<div class="classic-profile">'
      +   '<div class="cp-header">'
      +     '<div class="cp-photo">' + photoHtml + '</div>'
      +     '<div class="cp-main">'
      +       '<div class="cp-name-row"><span class="cp-name">' + esc(name) + '</span><span class="level-badge">Level 1</span></div>'
      +       '<div class="cp-status">' + (st ? esc(st) : '<span class="meta">No status set</span>') + '</div>'
      +       profileActionRow({
            poke: isSelf ? '' : ('data-poke="' + esc(id) + '" data-poke-name="' + esc(name) + '"'),
            friend: isSelf ? '' : ('data-add-friend="' + esc(id) + '" data-friend-name="' + esc(name) + '"'),
            mail: isSelf ? '' : ('data-mail-to="' + esc(id) + '" data-mail-name="' + esc(name) + '"')
          })
      +     '</div>'
      +     '<aside class="cp-meta-box">'
      +       '<div><span class="k">Permaname</span><span class="v">' + esc(id) + '</span></div>'
      +       '<div><span class="k">Member since</span><span class="v">' + esc(member || "—") + '</span></div>'
      +       '<div><span class="k">Last online</span><span class="v">' + (occ ? "now" : "unknown") + '</span></div>'
      +       '<div><span class="k">Home Page</span><span class="v">' + (info.homepage ? esc(info.homepage) : "—") + '</span></div>'
      +     '</aside>'
      +   '</div>'
      +   '<div class="cp-section"><h2>Information</h2>' + infoRows(info) + '</div>'
      +   '<div class="cp-section"><h2>Comments</h2>'
      +     '<form class="wall-form" id="wall-form" data-wall-user="' + esc(id) + '"><input name="text" maxlength="240" placeholder="Leave a comment" required /><button type="submit">Post</button></form>'
      +     '<div id="wall-list">' + wallHtml + '</div></div>'
      + '</div></section>';
  }

  function mePage() {
    if (viewingId && session() && viewingId !== session().user.id) return otherProfile(viewingId);
    if (viewingId && session() && viewingId === session().user.id) { meSub = "profile"; viewingId = null; }
    if (meSub === "friends") return meFriends();
    if (meSub === "mail") return meMail(window.__mailCompose || null);
    if (meSub === "passport") return mePassport();
    if (meSub === "account") return meAccount();
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
      +       '<button type="button" class="mail mail-btn" data-me="mail" title="Mail">&#9993; <u>(' + unreadCount() + ')</u></button>'
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
      +   '<span class="toolbar">'
      +     '<button type="button" class="tb tb-vol" title="Coming soon" disabled aria-label="Volume"></button>'
      +     '<span class="tb-go-wrap">'
      +       '<button type="button" class="tb tb-go" title="Go" aria-label="Go" data-tb="go"></button>'
      +       '<div class="go-menu" id="go-menu" hidden>'
      +         '<button type="button" data-go="home">Go home</button>'
      +         '<button type="button" data-go="recent">Recent — Studio Loft</button>'
      +         '<button type="button" data-go="friends">Friends online</button>'
      +         '<button type="button" data-go="games">View games awaiting players</button>'
      +       '</div>'
      +     '</span>'
      +     '<button type="button" class="tb tb-friends" title="Friends" aria-label="Friends" data-tb="friends"></button>'
      +     '<button type="button" class="tb tb-party" title="Coming soon" disabled aria-label="Parties"></button>'
      +     '<span class="tb-go-wrap tb-room-wrap">'
      +       '<button type="button" class="tb tb-room" title="Room" aria-label="Room" data-tb="room"></button>'
      +       '<div class="go-menu room-menu" id="room-menu" hidden>'
      +         '<button type="button" data-room-menu="comment">Comment or rate</button>'
      +         '<button type="button" data-room-menu="decorate" disabled>Decorate Room (coming soon)</button>'
      +         '<div class="room-lock-row meta">Lock (visual only)</div>'
      +         '<button type="button" data-room-lock="unlocked"' + (loadRoomLock() === "unlocked" ? ' class="is-on"' : '') + '>🔓 Unlocked</button>'
      +         '<button type="button" data-room-lock="friends"' + (loadRoomLock() === "friends" ? ' class="is-on"' : '') + '>👥 Friends</button>'
      +         '<button type="button" data-room-lock="locked"' + (loadRoomLock() === "locked" ? ' class="is-on"' : '') + '>🔒 Locked</button>'
      +         '<button type="button" data-room-menu="lobby">' + (inRoom ? "Leave to lobby" : "Rooms lobby") + '</button>'
      +       '</div>'
      +     '</span>'
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
    else if (tab === "stuff") main.innerHTML = stuffPage();
    else if (tab === "shop") main.innerHTML = shopPage();
    else if (tab === "games") main.innerHTML = gamesPage();
    else if (tab === "groups") main.innerHTML = groupsPage();
    else main.innerHTML = '<section class="page"><h1>Groups</h1><p class="meta">No groups yet. Shared whirleds come later.</p></section>';
    refreshChatLog();
    try {
      var badge = document.querySelector(".mail-btn u");
      if (badge) badge.textContent = "(" + unreadCount() + ")";
    } catch (e) {}
    exposeBridge();
    if (session()) ensureNoticeBar();
    else {
      var nb = document.getElementById("notice-bar");
      if (nb) nb.remove();
    }
    try {
      var lk = loadRoomLock();
      document.querySelectorAll("[data-room-lock]").forEach(function (btn) {
        btn.classList.toggle("is-on", btn.getAttribute("data-room-lock") === lk);
      });
    } catch (e) {}
    try { ensureStagePlaceholder(); } catch (e) {}
  }
  function ensureStagePlaceholder() {
    var slot = document.getElementById("stage-slot");
    if (!slot) return;
    var hasEngine = !!(slot.querySelector("canvas") || slot.querySelector("[data-whirled-engine]"));
    if (hasEngine) return;
    if (slot.querySelector(".stage-copy")) return;
    slot.innerHTML = '<div class="stage-copy"><strong>Your room — engine mounts here</strong>Empty classic stage for now. Decorate later — click-to-walk arrives with the engine track.<code>#stage-slot</code></div>';
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
    liveOccupants.forEach(function (p) { rememberProfile({ id: p.id, name: p.name }); });
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
    if (!ev.target.closest(".tb-go-wrap")) {
      var gm0 = document.getElementById("go-menu");
      if (gm0 && !gm0.hidden) { gm0.hidden = true; goMenuOpen = false; }
      var rm0 = document.getElementById("room-menu");
      if (rm0 && !rm0.hidden) { rm0.hidden = true; roomMenuOpen = false; }
    }
    if (ev.target.id === "logout-btn") {
      window.WhirledApi.logout();
      chat = []; liveOccupants = []; inRoom = false; viewingId = null; meSub = "home";
      shopItemId = null; groupViewId = null; groupThreadId = null; roomPanelOpen = false; roomMenuOpen = false;
      gamesMode = "browse"; gameViewId = null; gameDetailTab = "play"; gameGenre = "all"; friendSearchQ = "";
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
    var roomsLobbyBtn = ev.target.closest("[data-rooms-lobby]");
    if (roomsLobbyBtn && session()) {
      inRoom = false;
      paint("rooms");
      return;
    }
    var tourBtn = ev.target.closest("[data-tour-tip]");
    if (tourBtn && session()) {
      tourTip = (tourTip + 1) % 4;
      paint("rooms");
      var panel = document.getElementById("tour-panel");
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    var goItem = ev.target.closest("[data-go]");
    if (goItem && session()) {
      var g = goItem.getAttribute("data-go");
      goMenuOpen = false;
      var gm = document.getElementById("go-menu");
      if (gm) gm.hidden = true;
      if (g === "home" || g === "recent") {
        inRoom = true;
        paint("rooms");
        loadOccupants();
      } else if (g === "friends") {
        meSub = "friends";
        viewingId = null;
        paint("me");
      } else if (g === "games") {
        gamesMode = "lobby";
        gameViewId = null;
        paint("games");
      }
      return;
    }
    var tb = ev.target.closest("[data-tb]");
    if (tb && session()) {
      var kind = tb.getAttribute("data-tb");
      if (kind === "go") {
        var rmenuGo = document.getElementById("room-menu");
        if (rmenuGo) { rmenuGo.hidden = true; roomMenuOpen = false; }
        var menu = document.getElementById("go-menu");
        if (menu) {
          menu.hidden = !menu.hidden;
          goMenuOpen = !menu.hidden;
        }
        return;
      }
      if (kind === "friends") {
        meSub = "friends";
        viewingId = null;
        paint("me");
        return;
      }
      if (kind === "room") {
        var rmenu = document.getElementById("room-menu");
        var gmenu = document.getElementById("go-menu");
        if (gmenu) { gmenu.hidden = true; goMenuOpen = false; }
        if (rmenu) {
          rmenu.hidden = !rmenu.hidden;
          roomMenuOpen = !rmenu.hidden;
        }
        return;
      }
    }
    var prof = ev.target.closest("[data-profile]");
    if (prof && session()) {
      viewingId = prof.getAttribute("data-profile") || null;
      if (viewingId) {
        var pname0 = (prof.textContent || "").trim() || viewingId;
        rememberProfile({ id: viewingId, name: pname0.slice(0, 40) });
      }
      meSub = "profile";
      paint("me");
      return;
    }
    var addF = ev.target.closest("[data-add-friend]");
    if (addF && session()) {
      var fid = addF.getAttribute("data-add-friend");
      var fname = addF.getAttribute("data-friend-name") || fid;
      addFriend({ id: fid, name: fname });
      // Local same-browser: leave a short note for both sides.
      sendMail({
        toId: session().user.id,
        toName: session().user.name,
        fromId: fid,
        fromName: fname,
        subject: "New friend",
        body: fname + " is now on your friends list.",
        read: false
      });
      sendMail({
        toId: fid,
        toName: fname,
        subject: "You have a new friend",
        body: session().user.name + " added you as a friend.",
        read: false
      });
      pushNotice("friending", "You friended " + fname + "."); rememberProfile({ id: fid, name: fname });
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
    var remF = ev.target.closest("[data-remove-friend]");
    if (remF && session()) {
      removeFriend(remF.getAttribute("data-remove-friend"));
      pushNotice("gray", "Friend removed.");
      meSub = "friends";
      viewingId = null;
      paint("me");
      return;
    }
    var mailTo = ev.target.closest("[data-mail-to]");
    if (mailTo && session()) {
      window.__mailCompose = {
        id: mailTo.getAttribute("data-mail-to"),
        name: mailTo.getAttribute("data-mail-name") || ""
      };
      meSub = "mail";
      viewingId = null;
      paint("me");
      return;
    }
    var shopSortBtn = ev.target.closest("[data-shop-sort]");
    if (shopSortBtn && session()) {
      shopSort = shopSortBtn.getAttribute("data-shop-sort") || "popularity";
      paint("shop");
      return;
    }
    var shopItemBtn = ev.target.closest("[data-shop-item]");
    if (shopItemBtn && session()) {
      shopItemId = shopItemBtn.getAttribute("data-shop-item") || null;
      paint("shop");
      return;
    }
    if (ev.target.closest("[data-shop-back]") && session()) {
      shopItemId = null;
      paint("shop");
      return;
    }
    var shopFav = ev.target.closest("[data-shop-fav]");
    if (shopFav && session()) {
      toggleFavorite(shopFav.getAttribute("data-shop-fav"));
      paint("shop");
      return;
    }
    var shopRate = ev.target.closest("[data-shop-rate]");
    if (shopRate && session()) {
      setShopRating(shopRate.getAttribute("data-shop-rate-item"), shopRate.getAttribute("data-shop-rate"));
      paint("shop");
      return;
    }

    var gameGenreBtn = ev.target.closest("[data-game-genre]");
    if (gameGenreBtn && session()) {
      gameGenre = gameGenreBtn.getAttribute("data-game-genre") || "all";
      gamesMode = "browse";
      paint("games");
      return;
    }
    var gameOpen = ev.target.closest("[data-game-open]");
    if (gameOpen && session()) {
      gameViewId = gameOpen.getAttribute("data-game-open");
      gamesMode = "detail";
      gameDetailTab = "play";
      paint("games");
      return;
    }
    if (ev.target.closest("[data-games-back]") && session()) {
      gamesMode = "browse";
      gameViewId = null;
      paint("games");
      return;
    }
    if (ev.target.closest("[data-games-lobby]") && session()) {
      gamesMode = "lobby";
      gameViewId = null;
      paint("games");
      return;
    }
    var gamePlay = ev.target.closest("[data-game-play]");
    if (gamePlay && session()) {
      gamesMode = "lobby";
      paint("games");
      return;
    }
    var gameFav = ev.target.closest("[data-game-fav]");
    if (gameFav && session()) {
      toggleGameFavorite(gameFav.getAttribute("data-game-fav"));
      gamesMode = "detail";
      paint("games");
      return;
    }
    var gameTab = ev.target.closest("[data-game-tab]");
    if (gameTab && session()) {
      gameDetailTab = gameTab.getAttribute("data-game-tab") || "play";
      gamesMode = "detail";
      paint("games");
      return;
    }
    var tableJoin = ev.target.closest("[data-table-join]");
    if (tableJoin && session()) {
      var tjid = tableJoin.getAttribute("data-table-join");
      var tablesJ = loadGameTables();
      for (var tji = 0; tji < tablesJ.length; tji++) {
        if (tablesJ[tji].id === tjid) {
          tablesJ[tji].players = tablesJ[tji].players || [];
          var maxJ = Number(tablesJ[tji].maxPlayers) || 4;
          if (tablesJ[tji].players.length >= maxJ) break;
          if (!tablesJ[tji].players.some(function (p) { return p.id === session().user.id; })) {
            tablesJ[tji].players.push({ id: session().user.id, name: session().user.name });
          }
          break;
        }
      }
      saveGameTables(tablesJ);
      gamesMode = "lobby";
      paint("games");
      return;
    }
    var tableLeave = ev.target.closest("[data-table-leave]");
    if (tableLeave && session()) {
      var tlid = tableLeave.getAttribute("data-table-leave");
      saveGameTables(loadGameTables().map(function (t) {
        if (t.id !== tlid) return t;
        return Object.assign({}, t, {
          players: (t.players || []).filter(function (p) { return p.id !== session().user.id; })
        });
      }));
      gamesMode = "lobby";
      paint("games");
      return;
    }
    var tableStart = ev.target.closest("[data-table-start]");
    if (tableStart && session()) {
      pushNotice("gray", "Start now — parlor engine mounts later. Lobby stays a shell.");
      gamesMode = "lobby";
      paint("games");
      return;
    }

    var gOpen = ev.target.closest("[data-group-open]");
    if (gOpen && session() && !ev.target.closest("[data-group-thread]")) {
      groupViewId = gOpen.getAttribute("data-group-open");
      groupThreadId = null;
      paint("groups");
      return;
    }
    var gThread = ev.target.closest("[data-group-thread]");
    if (gThread && session()) {
      groupViewId = gThread.getAttribute("data-group-open") || groupViewId;
      groupThreadId = gThread.getAttribute("data-group-thread");
      paint("groups");
      return;
    }
    if (ev.target.closest("[data-group-back]") && session()) {
      groupViewId = null;
      groupThreadId = null;
      paint("groups");
      return;
    }
    var gJoin = ev.target.closest("[data-group-join]");
    if (gJoin && session()) {
      var gjid = gJoin.getAttribute("data-group-join");
      var glist = loadGroups();
      for (var gi = 0; gi < glist.length; gi++) {
        if (glist[gi].id === gjid) {
          glist[gi].members = glist[gi].members || [];
          if (!glist[gi].members.some(function (m) { return m.id === session().user.id; })) {
            glist[gi].members.push({ id: session().user.id, name: session().user.name });
          }
          break;
        }
      }
      saveGroups(glist);
      paint("groups");
      return;
    }
    var gLeave = ev.target.closest("[data-group-leave]");
    if (gLeave && session()) {
      var glid = gLeave.getAttribute("data-group-leave");
      var gl = loadGroups();
      for (var gj = 0; gj < gl.length; gj++) {
        if (gl[gj].id === glid && gl[gj].creatorId !== session().user.id) {
          gl[gj].members = (gl[gj].members || []).filter(function (m) { return m.id !== session().user.id; });
        }
      }
      saveGroups(gl);
      paint("groups");
      return;
    }
    var gHall = ev.target.closest("[data-group-hall]");
    if (gHall && session()) {
      inRoom = false;
      roomPanelOpen = false;
      pushNotice("blue", "Group hall → Rooms lobby / Studio Loft (shared halls later).");
      paint("rooms");
      return;
    }
    var roomMenuBtn = ev.target.closest("[data-room-menu]");
    if (roomMenuBtn && session()) {
      var rm = roomMenuBtn.getAttribute("data-room-menu");
      var rmenuEl = document.getElementById("room-menu");
      if (rmenuEl) rmenuEl.hidden = true;
      roomMenuOpen = false;
      if (rm === "lobby") {
        inRoom = false;
        roomPanelOpen = false;
        paint("rooms");
      } else if (rm === "comment") {
        if (!inRoom) { inRoom = true; }
        roomPanelOpen = true;
        paint("rooms");
        loadOccupants();
      } else if (rm === "decorate") {
        pushNotice("gray", "Decorate Room — coming soon.");
      }
      return;
    }
    var roomLockBtn = ev.target.closest("[data-room-lock]");
    if (roomLockBtn && session()) {
      saveRoomLock(roomLockBtn.getAttribute("data-room-lock") || "unlocked");
      var rmenu2 = document.getElementById("room-menu");
      if (rmenu2) rmenu2.hidden = true;
      roomMenuOpen = false;
      if (inRoom) paint("rooms");
      else {
        // refresh menu state in shell
        paint(document.querySelector(".tab.is-on") ? document.querySelector(".tab.is-on").getAttribute("data-tab") : "rooms");
      }
      return;
    }
    if (ev.target.closest("[data-room-panel-close]") && session()) {
      roomPanelOpen = false;
      paint("rooms");
      return;
    }
    var roomRateBtn = ev.target.closest("[data-room-rate]");
    if (roomRateBtn && session()) {
      saveRoomRating(roomRateBtn.getAttribute("data-room-rate"));
      paint("rooms");
      return;
    }
        var stuffCatBtn = ev.target.closest("[data-stuff-cat]");
    if (stuffCatBtn && session()) {
      stuffCat = stuffCatBtn.getAttribute("data-stuff-cat") || "avatars";
      paint("stuff");
      return;
    }
    var shopCatBtn = ev.target.closest("[data-shop-cat]");
    if (shopCatBtn && session()) {
      shopCat = shopCatBtn.getAttribute("data-shop-cat") || "avatars";
      paint("shop");
      return;
    }
    var mailRow = ev.target.closest("[data-mail-id]");
    if (mailRow && session() && !ev.target.closest("form")) {
      markMailRead(mailRow.getAttribute("data-mail-id"));
      // refresh unread badge in header without full navigation reset
      var badge = document.querySelector(".mail-btn u");
      if (badge) badge.textContent = "(" + unreadCount() + ")";
      mailRow.classList.remove("unread");
    }
    var meBtn = ev.target.closest("[data-me]");
    if (meBtn && session()) {
      meSub = meBtn.getAttribute("data-me") || "home";
      viewingId = null;
      if (meSub !== "mail") window.__mailCompose = null;
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
      if (t === "shop") { shopItemId = null; }
      if (t === "groups") { groupViewId = null; groupThreadId = null; }
      if (t === "games") { gamesMode = "browse"; gameViewId = null; gameDetailTab = "play"; }
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
    if (ev.target.id === "profile-form" || ev.target.id === "info-form") {
      var data = new FormData(ev.target);
      var msg = document.getElementById("profile-msg");
      var sid = session().user.id;
      var info = {
        activities: String(data.get("activities") || ""),
        interests: String(data.get("interests") || ""),
        games: String(data.get("games") || ""),
        music: String(data.get("music") || ""),
        movies: String(data.get("movies") || ""),
        shows: String(data.get("shows") || ""),
        books: String(data.get("books") || ""),
        about: String(data.get("about") || ""),
        homepage: String(data.get("homepage") || "")
      };
      saveInfo(sid, info);
      window.WhirledApi.saveProfile({ name: data.get("name") || you().name, bio: info.about }).then(function () {
        if (msg) msg.textContent = "Saved.";
        meSub = "profile";
        viewingId = null;
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
        pushNotice("status", you().name + " " + st);
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
      pushNotice("comment", you().name + " commented on a profile.");
      if (targetWall === session().user.id) { viewingId = null; meSub = "profile"; }
      else viewingId = targetWall;
      paint("me");
      return;
    }
    if (ev.target.id === "mail-form" && session()) {
      var md = new FormData(ev.target);
      var friendId = String(md.get("friendId") || "").trim();
      var toId = friendId || String(md.get("toId") || "").trim();
      var toName = String(md.get("toName") || "").trim();
      if (friendId) {
        var fr = loadFriends().filter(function (f) { return f.id === friendId; })[0];
        if (fr) toName = fr.name;
      }
      if (!toId) {
        var mm = document.getElementById("mail-msg");
        if (mm) mm.textContent = "Pick a friend or enter an id.";
        return;
      }
      sendMail({
        toId: toId,
        toName: toName || toId,
        subject: String(md.get("subject") || ""),
        body: String(md.get("body") || "")
      });
      // Same-browser peer copy already stored as one message to toId.
      window.__mailCompose = null;
      meSub = "mail";
      paint("me");
      return;
    }
    if (ev.target.id === "shop-comment-form" && session()) {
      var sc = new FormData(ev.target);
      var sct = String(sc.get("text") || "").trim().slice(0, 400);
      var scid = ev.target.getAttribute("data-shop-comment-item") || shopItemId;
      if (!sct || !scid) return;
      var scl = loadShopComments(scid);
      scl.unshift({ who: you().name, text: sct, at: new Date().toISOString() });
      saveShopComments(scid, scl);
      paint("shop");
      return;
    }

    if (ev.target.id === "friend-search-form" && session()) {
      var fsd = new FormData(ev.target);
      friendSearchQ = String(fsd.get("q") || "").trim().slice(0, 60);
      meSub = "friends";
      viewingId = null;
      paint("me");
      return;
    }
    if (ev.target.id === "game-comment-form" && session()) {
      var gc = new FormData(ev.target);
      var gct = String(gc.get("text") || "").trim().slice(0, 400);
      var gcid = ev.target.getAttribute("data-game-comment") || gameViewId;
      if (!gct || !gcid) return;
      var gcl = loadGameComments(gcid);
      gcl.unshift({ who: you().name, text: gct, at: new Date().toISOString() });
      saveGameComments(gcid, gcl);
      pushNotice("comment", you().name + " commented on a game.");
      gamesMode = "detail";
      gameDetailTab = "comments";
      paint("games");
      return;
    }
    if (ev.target.id === "create-table-form" && session()) {
      var ctd = new FormData(ev.target);
      var tname = String(ctd.get("name") || "").trim().slice(0, 60);
      if (!tname) return;
      var tmax = Math.max(2, Math.min(8, Number(ctd.get("max")) || 4));
      var trated = !!ctd.get("rated");
      var tables = loadGameTables();
      var tid = "tbl" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      tables.unshift({
        id: tid,
        name: tname,
        maxPlayers: tmax,
        rated: trated,
        hostId: session().user.id,
        hostName: session().user.name,
        gameId: gameViewId || "",
        gameName: (findGame(gameViewId) || {}).name || "",
        players: [{ id: session().user.id, name: session().user.name }],
        at: new Date().toISOString()
      });
      saveGameTables(tables);
      gamesMode = "lobby";
      paint("games");
      return;
    }

    if (ev.target.id === "create-group-form" && session()) {
      var cg = new FormData(ev.target);
      var gname = String(cg.get("name") || "").trim().slice(0, 60);
      var gblurb = String(cg.get("blurb") || "").trim().slice(0, 240);
      if (!gname) return;
      var groups = loadGroups();
      var gid = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      groups.unshift({
        id: gid,
        name: gname,
        blurb: gblurb,
        creatorId: session().user.id,
        creatorName: session().user.name,
        members: [{ id: session().user.id, name: session().user.name }],
        at: new Date().toISOString()
      });
      saveGroups(groups);
      groupViewId = gid;
      groupThreadId = null;
      paint("groups");
      return;
    }
    if (ev.target.id === "group-thread-form" && session()) {
      var gt = new FormData(ev.target);
      var gtid = ev.target.getAttribute("data-group-new-thread");
      var title = String(gt.get("title") || "").trim().slice(0, 120);
      var body = String(gt.get("body") || "").trim().slice(0, 800);
      if (!gtid || !title || !body) return;
      var threads = loadGroupThreads(gtid);
      var tid = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      threads.unshift({
        id: tid,
        title: title,
        body: body,
        who: you().name,
        whoId: session().user.id,
        at: new Date().toISOString(),
        replies: []
      });
      saveGroupThreads(gtid, threads);
      groupViewId = gtid;
      groupThreadId = tid;
      paint("groups");
      return;
    }
    if (ev.target.id === "group-reply-form" && session()) {
      var gr = new FormData(ev.target);
      var grText = String(gr.get("text") || "").trim().slice(0, 800);
      var grGid = ev.target.getAttribute("data-group-reply");
      var grTid = ev.target.getAttribute("data-thread-id");
      if (!grText || !grGid || !grTid) return;
      var grThreads = loadGroupThreads(grGid);
      for (var rti = 0; rti < grThreads.length; rti++) {
        if (grThreads[rti].id === grTid) {
          grThreads[rti].replies = grThreads[rti].replies || [];
          grThreads[rti].replies.push({ who: you().name, whoId: session().user.id, text: grText, at: new Date().toISOString() });
          break;
        }
      }
      saveGroupThreads(grGid, grThreads);
      groupViewId = grGid;
      groupThreadId = grTid;
      paint("groups");
      return;
    }
    if (ev.target.id === "room-comment-form" && session()) {
      var rc = new FormData(ev.target);
      var rct = String(rc.get("text") || "").trim().slice(0, 400);
      if (!rct) return;
      var rcl = loadRoomComments();
      rcl.unshift({ who: you().name, text: rct, at: new Date().toISOString() });
      saveRoomComments(rcl);
      roomPanelOpen = true;
      paint("rooms");
      return;
    }
    var input = ev.target.querySelector("input");
    var text = input && input.value.trim();
    if (!text) return;
    if (ev.target.id === "chat-form") { pushChat(text); input.value = ""; }
  });
})();
