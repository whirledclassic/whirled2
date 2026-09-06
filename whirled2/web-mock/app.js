/*
 * Whirled2 page chrome (classic whirled.club-style UI). No Pixi / no private engine.
 *
 * How this works (beginner overview):
 * 1) index.html loads src/api.js then app.js. Everything runs in one IIFE (this file).
 * 2) Gate: if no session, show register/login. Session lives in localStorage whirled2.session
 *    (via WhirledApi). Offline Pages uses local users in whirled2.users; optional server/server.mjs
 *    can share chat when WHIRLED_API is set.
 * 3) After login, shell() builds the top tabs + chat bar; paint(tab) fills #main for Me / Stuff /
 *    Games / Rooms / Groups / Shop. Room stage is empty #stage-slot for a future engine.
 * 4) Most data is browser-local (localStorage keys whirled2.*). Coins are labels only — no payments.
 * 5) Engine bridge: window.WhirledChrome.getStageEl() returns #stage-slot. See ENGINE-BRIDGE.md.
 * 6) paint() redraws HTML from state; click/submit listeners on #app handle almost all UI actions.
 */
(function () {
  "use strict";
  // ---------------------------------------------------------------------------
  // How this works: brand mark is an SVG (crisp + true transparency).
  // Cache-bust with LOGO_V so phones don't keep an old black-box PNG.
  // Fallbacks: transparent PNG, then classic mark, then tiny svg.
  var LOGO_V = "20260906c";
  var LOGO = "./assets/whirled2-logo.svg?v=" + LOGO_V;
  var LOGO_PNG = "./assets/whirled2-logo.png?v=" + LOGO_V;
  var LOGO_CLASSIC = "./assets/whirled-classic-logo.png?v=" + LOGO_V;
  var LOGO_FALLBACK = "./assets/logo.svg?v=" + LOGO_V;
  function logoImg(cls) {
    // How this works: if SVG fails, onerror swaps to PNG then classic then logo.svg.
    return '<img class="' + cls + '" alt="Whirled2" src="' + LOGO + '"'
      + ' decoding="async" data-fb1="' + LOGO_PNG + '" data-fb2="' + LOGO_CLASSIC + '" data-fb3="' + LOGO_FALLBACK + '"'
      + ' onerror="var i=this,a=i.getAttribute(\'data-fb1\');if(a){i.setAttribute(\'data-fb1\',i.getAttribute(\'data-fb2\')||\'\');i.setAttribute(\'data-fb2\',i.getAttribute(\'data-fb3\')||\'\');i.removeAttribute(\'data-fb3\');i.src=a;}else{i.onerror=null;}" />';
  }


  // esc(s) escapes HTML so user names/chat cannot inject tags.
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  // ---------------------------------------------------------------------------
  // localStorage keys + UI state
  // Information: almost every feature persists under whirled2.* in this browser.
  // There is no invented NPC catalog — empty lists stay empty until the user adds data.
  // ---------------------------------------------------------------------------
  var PEOPLE = []; // real occupants only — filled from presence API / session
  var STUFF_KEY = "whirled2.stuff";
  var SHOP_KEY = "whirled2.shop";
  var MAIL_KEY = "whirled2.mail";
  var PARTIES_KEY = "whirled2.parties";
  var ROOM_LAYOUT_KEY = "whirled2.roomLayout.loft";
  var MY_PARTY_KEY = "whirled2.myParty";
  var BLOCKLIST_KEY = "whirled2.blocklist";
  var GALLERIES_KEY = "whirled2.galleries";
  var TRANSACTIONS_KEY = "whirled2.transactions";
  var ROLES_KEY = "whirled2.roles";
  var CHAT_UI_KEY = "whirled2.chatUi";
  var FIRST_USER_KEY = "whirled2.firstUserId";
  var BROWSER_THEME_KEY = "whirled2.browserTheme";
  // How this works: browser themes are CSS-variable presets on #app[data-theme=…].
  // Saved in localStorage whirled2.browserTheme. Premium cards are labels only (Coming Soon).
  var BROWSER_THEMES = {
    classic: { id: "classic", label: "Classic Blue", blurb: "Default pale-blue Whirled chrome." },
    night: { id: "night", label: "Night Loft", blurb: "Dim stage chrome for late sessions." },
    soft: { id: "soft", label: "Soft Sky", blurb: "Airy light panels and soft tab blues." }
  };
  function loadBrowserTheme() {
    try {
      var t = localStorage.getItem(BROWSER_THEME_KEY) || "classic";
      return BROWSER_THEMES[t] ? t : "classic";
    } catch (e) { return "classic"; }
  }
  function saveBrowserTheme(id) {
    if (!BROWSER_THEMES[id]) id = "classic";
    try { localStorage.setItem(BROWSER_THEME_KEY, id); } catch (e) {}
    applyBrowserTheme(id);
  }
  function applyBrowserTheme(id) {
    id = id || loadBrowserTheme();
    if (!BROWSER_THEMES[id]) id = "classic";
    var el = document.getElementById("app");
    if (el) el.setAttribute("data-theme", id);
  }
  function loadGroupTheme(gid) {
    try { return JSON.parse(localStorage.getItem("whirled2.groupTheme." + gid) || "null"); }
    catch (e) { return null; }
  }
  function saveGroupTheme(gid, hex) {
    // How this works: prototype only — tints that group's detail header on this browser.
    // Full themed Whirled (skin top bar, mark items, mark rooms) is Coming Soon — no payments.
    var draft = { hex: hex, updatedAt: new Date().toISOString() };
    try { localStorage.setItem("whirled2.groupTheme." + gid, JSON.stringify(draft)); } catch (e) {}
    return draft;
  }

  // ---------------------------------------------------------------------------
  // Room music / playlist (wiki Music) — offline Pages-safe
  // How this works: MP3/etc upload → Stuff (type music, data URL). Room menu opens
  // playlist panel. Tracks live in localStorage whirled2.playlist.loft. HTML5
  // <audio id="room-audio"> plays current; onended advances. Max 99 tracks.
  // ---------------------------------------------------------------------------
  var PLAYLIST_KEY = "whirled2.playlist.loft";
  var MUSIC_WARN_BYTES = 2 * 1024 * 1024; // soft warn ~2MB
  var MUSIC_MAX_BYTES = 4 * 1024 * 1024;  // hard reject ~4MB
  function isLoftOwner() {
    // How this works: loft "owner" ≈ first registered user on this browser (Pages).
    var sid = session() && session().user && session().user.id;
    if (!sid) return false;
    try {
      var first = localStorage.getItem(FIRST_USER_KEY);
      if (first) return sid === first;
    } catch (e) {}
    return true;
  }
  function defaultPlaylist() {
    return { tracks: [], currentIndex: 0, ownerOnlyAdd: false };
  }
  function loadPlaylist() {
    try {
      var p = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "null");
      if (!p || !Array.isArray(p.tracks)) return defaultPlaylist();
      if (typeof p.currentIndex !== "number") p.currentIndex = 0;
      if (typeof p.ownerOnlyAdd !== "boolean") p.ownerOnlyAdd = false;
      return p;
    } catch (e) { return defaultPlaylist(); }
  }
  function savePlaylist(p) {
    try { localStorage.setItem(PLAYLIST_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function myMusicStuff() {
    return loadStuff().filter(function (it) {
      var k = String(it.kind || it.type || it.category || "").toLowerCase();
      return k === "music" && (it.dataUrl || it.audio || it.thumb);
    });
  }
  function ensureRoomAudioEl() {
    var a = document.getElementById("room-audio");
    if (a) return a;
    a = document.createElement("audio");
    a.id = "room-audio";
    a.preload = "auto";
    a.style.display = "none";
    document.body.appendChild(a);
    a.addEventListener("ended", function () { playlistNext(true); });
    return a;
  }
  function syncRoomAudio() {
    // How this works: keep <audio> pointed at playlist current track; try play when in room.
    var a = ensureRoomAudioEl();
    a.muted = !!roomAudioMuted;
    if (!inRoom) {
      try { a.pause(); } catch (e) {}
      return;
    }
    var pl = loadPlaylist();
    var track = pl.tracks[pl.currentIndex];
    if (!track || !track.dataUrl) {
      try { a.pause(); a.removeAttribute("src"); } catch (e2) {}
      return;
    }
    if (a.getAttribute("data-track-id") !== track.id) {
      a.setAttribute("data-track-id", track.id);
      a.src = track.dataUrl;
    }
    var playPromise = a.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(function () {
        musicGestureNeeded = false;
        var btn = document.getElementById("music-gesture-btn");
        if (btn) btn.hidden = true;
      }).catch(function () {
        musicGestureNeeded = true;
        var btn2 = document.getElementById("music-gesture-btn");
        if (btn2) btn2.hidden = false;
      });
    }
  }
  function playlistNext(fromEnded) {
    var pl = loadPlaylist();
    if (!pl.tracks.length) return;
    pl.currentIndex = (pl.currentIndex + 1) % pl.tracks.length;
    savePlaylist(pl);
    if (playlistPanelOpen && inRoom) paint("rooms");
    else syncRoomAudio();
  }
  function playlistPanel() {
    var pl = loadPlaylist();
    var owner = isLoftOwner();
    var canAdd = owner || !pl.ownerOnlyAdd;
    var music = myMusicStuff();
    var rows = pl.tracks.length
      ? pl.tracks.map(function (t, i) {
          var now = i === pl.currentIndex;
          return '<div class="playlist-row' + (now ? " is-playing" : "") + '">'
            + (now ? "<b>" : "") + esc(t.name || "Track") + (now ? "</b>" : "")
            + ' <span class="meta">by ' + esc(t.by || "?") + '</span>'
            + (owner ? (' <button type="button" class="text-btn" data-playlist-play="' + i + '">Play</button>'
              + ' <button type="button" class="text-btn" data-playlist-remove="' + i + '">Remove</button>') : "")
            + '</div>';
        }).join("")
      : '<p class="meta">Playlist empty. Add a track from My Music (Stuff → Music).</p>';
    var addOpts = music.length
      ? music.map(function (m) {
          return '<option value="' + esc(m.id) + '">' + esc(m.name || "Untitled") + '</option>';
        }).join("")
      : "";
    return '<div class="room-side-panel" id="room-playlist-panel">'
      + '<div class="panel">'
      +   '<div class="room-side-head"><h2>Room playlist</h2>'
      +     '<button type="button" class="text-btn" data-playlist-close="1">Close</button></div>'
      +   '<p class="meta">Classic wiki Music vibe: anyone can add (unless owner locks). Max 99. Offline localStorage only — no shared server yet.</p>'
      +   '<div class="playlist-now">'
      +     (pl.tracks[pl.currentIndex]
            ? ('Now playing: <b>' + esc(pl.tracks[pl.currentIndex].name || "Track") + '</b>')
            : "Nothing playing.")
      +   '</div>'
      +   '<div class="playlist-controls">'
      +     '<button type="button" class="action-btn" id="music-gesture-btn"' + (musicGestureNeeded ? "" : " hidden") + ' data-music-gesture="1">Click to play room music</button>'
      +     (owner ? '<button type="button" class="action-btn" data-playlist-next="1">Next</button>' : "")
      +     '<button type="button" class="action-btn" data-room-mute="1">' + (roomAudioMuted ? "Unmute" : "Mute") + '</button>'
      +   '</div>'
      +   '<div class="section-label">Queue (' + pl.tracks.length + '/99)</div>'
      +   '<div class="playlist-list">' + rows + '</div>'
      +   (owner
          ? ('<label class="check-row"><input type="checkbox" data-playlist-owner-only="1"' + (pl.ownerOnlyAdd ? " checked" : "") + ' /> Only owner may add tracks</label>')
          : ('<p class="meta">' + (pl.ownerOnlyAdd ? "Owner locked adds — only loft owner can add." : "Anyone in the room may add (classic default).") + '</p>'))
      +   (canAdd
          ? ('<div class="section-label">Add from My Music</div>'
            + (music.length
              ? ('<form id="playlist-add-form" class="playlist-add-form">'
                + '<select name="stuffId" required><option value="">— pick a track —</option>' + addOpts + '</select>'
                + '<button type="submit">Add to playlist</button></form>')
              : '<p class="meta">No Music in Stuff yet. Stuff → Music → Upload… (MP3/WAV/OGG; copyright checkbox required).</p>'))
          : '<p class="meta">Adds locked to loft owner.</p>')
      + '</div></div>';
  }

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
  var stuffItemId = null;
  var stuffMode = "browse"; // browse | upload | detail | edit
  var invitePanelOpen = false;
  var occMenuId = null;
  var friendInvitePending = null; // {id,name} for buddy request popup
  var shopCat = "avatars";
  var shopSort = "popularity";
  var shopItemId = null;
  var groupViewId = null;
  var groupThreadId = null;
  var roomMenuOpen = false;
  var roomPanelOpen = false;
  var playlistPanelOpen = false; // Room menu → View room playlist
  var decorateMode = false;
  var partyPanelOpen = false;
  var helpOpen = false;
  var legalOpen = false; // Help → Legal / Disclaimer
  var musicGestureNeeded = false; // browser blocked autoplay — show Click to play
  var roomAudioMuted = false;
  var stuffListMode = false; // show list form on stuff detail
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
  // ---------------------------------------------------------------------------
  // Stuff / Shop / Parties / Blocklist / Galleries / Transactions loaders
  // How this works: load* reads JSON from localStorage; save* writes a capped array.
  // ---------------------------------------------------------------------------
  function loadStuff() {
    try { return JSON.parse(localStorage.getItem(STUFF_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveStuff(items) {
    localStorage.setItem(STUFF_KEY, JSON.stringify(items.slice(0, 200)));
  }
  function loadShop() {
    try { return JSON.parse(localStorage.getItem(SHOP_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveShop(items) {
    try { localStorage.setItem(SHOP_KEY, JSON.stringify((items || []).slice(0, 200))); } catch (e) {}
  }
  function findShopListingByStuff(stuffId) {
    var all = loadShop();
    for (var i = 0; i < all.length; i++) {
      if (all[i].sourceStuffId === stuffId || all[i].stuffId === stuffId) return all[i];
    }
    return null;
  }
  function loadParties() {
    try { return JSON.parse(localStorage.getItem(PARTIES_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveParties(list) {
    try { localStorage.setItem(PARTIES_KEY, JSON.stringify((list || []).slice(0, 100))); } catch (e) {}
  }
  function loadMyPartyId() {
    try { return localStorage.getItem(MY_PARTY_KEY) || ""; } catch (e) { return ""; }
  }
  function saveMyPartyId(id) {
    try {
      if (id) localStorage.setItem(MY_PARTY_KEY, id);
      else localStorage.removeItem(MY_PARTY_KEY);
    } catch (e) {}
  }
  function findParty(id) {
    var list = loadParties();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function currentParty() {
    var id = loadMyPartyId();
    return id ? findParty(id) : null;
  }
  function loadBlocklist() {
    try { return JSON.parse(localStorage.getItem(BLOCKLIST_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveBlocklist(list) {
    try { localStorage.setItem(BLOCKLIST_KEY, JSON.stringify((list || []).slice(0, 200))); } catch (e) {}
  }
  function isBlocked(id) {
    if (!id) return false;
    var sid = String(id).toLowerCase();
    return loadBlocklist().some(function (b) {
      return String(b.id || "").toLowerCase() === sid || String(b.permaname || "").toLowerCase() === sid;
    });
  }
  function addBlocked(entry) {
    var id = String((entry && entry.id) || "").trim();
    if (!id) return false;
    var list = loadBlocklist().filter(function (b) { return String(b.id).toLowerCase() !== id.toLowerCase(); });
    list.unshift({
      id: id,
      permaname: id,
      name: String((entry && entry.name) || id).trim().slice(0, 40),
      at: new Date().toISOString()
    });
    saveBlocklist(list);
    return true;
  }
  function removeBlocked(id) {
    saveBlocklist(loadBlocklist().filter(function (b) { return String(b.id) !== String(id); }));
  }
  function loadGalleries() {
    try { return JSON.parse(localStorage.getItem(GALLERIES_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveGalleries(list) {
    try { localStorage.setItem(GALLERIES_KEY, JSON.stringify((list || []).slice(0, 50))); } catch (e) {}
  }
  function findGallery(id) {
    var all = loadGalleries();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function loadTransactions() {
    try { return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveTransactions(list) {
    try { localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify((list || []).slice(0, 300))); } catch (e) {}
  }
  function appendTransaction(row) {
    var list = loadTransactions();
    list.unshift({
      id: "tx" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      kind: (row && row.kind) || "note",
      label: String((row && row.label) || "").slice(0, 160),
      coins: Number((row && row.coins) || 0) || 0,
      note: "Coins are labels only — no real currency.",
      at: new Date().toISOString()
    });
    saveTransactions(list);
  }
  function clearStrayUI() {
    goMenuOpen = false;
    roomMenuOpen = false;
    partyPanelOpen = false;
    playlistPanelOpen = false;
    helpOpen = false;
    legalOpen = false;
    invitePanelOpen = false;
    occMenuId = null;
    friendInvitePending = null;
    chatOptsOpen = false;
    chatNameMenu = null;
    profileEditSection = null;
    var gm = document.getElementById("go-menu");
    if (gm) gm.hidden = true;
    var rm = document.getElementById("room-menu");
    if (rm) rm.hidden = true;
    var orphanParty = document.getElementById("party-panel");
    if (orphanParty && !document.querySelector(".workspace #party-panel")) orphanParty.remove();
    var buddy = document.getElementById("buddy-invite-modal");
    if (buddy) buddy.remove();
    var com = document.getElementById("chat-opts-menu");
    if (com) com.hidden = true;
    var cnm = document.getElementById("chat-name-menu");
    if (cnm) cnm.remove();
    clearTransientNotices();
  }

  function loadRoomLayout() {
    try {
      var raw = JSON.parse(localStorage.getItem(ROOM_LAYOUT_KEY) || '{"items":[]}');
      if (!raw || !Array.isArray(raw.items)) return { items: [] };
      return raw;
    } catch (e) { return { items: [] }; }
  }
  function saveRoomLayout(layout) {
    try {
      var items = (layout && layout.items) ? layout.items.slice(0, 80) : [];
      localStorage.setItem(ROOM_LAYOUT_KEY, JSON.stringify({ items: items }));
    } catch (e) {}
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
  // ---------------------------------------------------------------------------
  // Roles (Admin / Mod / Player) — localStorage whirled2.roles
  // Information: name/id "test" or "admin" always counts as admin. First registered
  // account id is stored in whirled2.firstUserId (see api.js) and bootstrapped admin.
  // ---------------------------------------------------------------------------
  function loadRoles() {
    try { return JSON.parse(localStorage.getItem(ROLES_KEY) || "{}"); } catch (e) { return {}; }
  }
  function saveRoles(map) {
    try { localStorage.setItem(ROLES_KEY, JSON.stringify(map || {})); } catch (e) {}
  }
  function isPrivilegedName(nameOrId) {
    var s = String(nameOrId || "").trim().toLowerCase();
    return s === "test" || s === "admin";
  }
  function getRole(userId) {
    if (!userId) return "player";
    var id = String(userId);
    if (isPrivilegedName(id)) return "admin";
    var map = loadRoles();
    if (map[id] === "admin" || map[id] === "mod" || map[id] === "player") return map[id];
    // name lookup via session / known profiles
    try {
      var s = session();
      if (s && s.user && s.user.id === id && isPrivilegedName(s.user.name)) return "admin";
    } catch (e) {}
    try {
      var known = loadKnownProfiles();
      for (var i = 0; i < known.length; i++) {
        if (known[i].id === id && isPrivilegedName(known[i].name)) return "admin";
      }
    } catch (e2) {}
    try {
      var friends = loadFriends();
      for (var fi = 0; fi < friends.length; fi++) {
        if (friends[fi].id === id && isPrivilegedName(friends[fi].name)) return "admin";
      }
    } catch (e3) {}
    return "player";
  }
  function setRole(userId, role) {
    if (!userId) return;
    var id = String(userId);
    var map = loadRoles();
    var r = role === "admin" || role === "mod" ? role : "player";
    if (r === "player") delete map[id];
    else map[id] = r;
    // always keep test/admin as admin in map for clarity
    if (isPrivilegedName(id)) map[id] = "admin";
    saveRoles(map);
  }
  function roleBadgeHtml(role) {
    if (role === "admin") {
      return '<span class="role-badge role-admin" title="Admin">Admin</span><span class="role-badge role-agent" title="Classic staff">Agent</span>';
    }
    if (role === "mod") {
      return '<span class="role-badge role-mod" title="Moderator">Mod</span>';
    }
    return "";
  }
  function bootstrapRoles() {
    if (!session() || !session().user) return;
    var map = loadRoles();
    var empty = !map || !Object.keys(map).length;
    var me = session().user;
    var meId = String(me.id || "");
    var meName = String(me.name || "");
    function ensureAdmin(uid) {
      if (!uid) return;
      map[String(uid)] = "admin";
    }
    // Always treat test/admin name or id as admin
    if (isPrivilegedName(meId) || isPrivilegedName(meName)) ensureAdmin(meId);
    if (empty) {
      if (isPrivilegedName(meId) || isPrivilegedName(meName)) ensureAdmin(meId);
      try {
        var first = localStorage.getItem(FIRST_USER_KEY) || "";
        if (first) ensureAdmin(first);
      } catch (e) {}
      try {
        if (localStorage.getItem("whirled2.forceAdmin") === "1") ensureAdmin(meId);
      } catch (e2) {}
    } else {
      // still ensure privileged names even if map not empty
      if (isPrivilegedName(meId) || isPrivilegedName(meName)) ensureAdmin(meId);
      try {
        var first2 = localStorage.getItem(FIRST_USER_KEY) || "";
        if (first2 && (isPrivilegedName(first2) || first2 === meId)) ensureAdmin(first2);
      } catch (e3) {}
    }
    // Scan known local users for test/admin
    try {
      var users = JSON.parse(localStorage.getItem("whirled2.users") || "{}");
      Object.keys(users).forEach(function (k) {
        var u = users[k];
        if (u && (isPrivilegedName(u.id) || isPrivilegedName(u.name))) ensureAdmin(u.id || k);
      });
    } catch (e4) {}
    saveRoles(map);
  }
  // ---------------------------------------------------------------------------
  // Chat UI prefs — localStorage whirled2.chatUi { mode, hideHistory, textSize }
  // mode "overlay" (default) = floating log over the room; "slide" = dark side panel.
  // ---------------------------------------------------------------------------
  function loadChatUi() {
    try {
      var raw = JSON.parse(localStorage.getItem(CHAT_UI_KEY) || "null");
      if (raw && (raw.mode === "slide" || raw.mode === "overlay")) {
        return {
          mode: raw.mode,
          hideHistory: !!raw.hideHistory,
          textSize: raw.textSize === "sm" || raw.textSize === "lg" ? raw.textSize : "md"
        };
      }
    } catch (e) {}
    return { mode: "overlay", hideHistory: false, textSize: "md" };
  }
  function saveChatUi(cfg) {
    try { localStorage.setItem(CHAT_UI_KEY, JSON.stringify(cfg || loadChatUi())); } catch (e) {}
  }
  var chatOptsOpen = false;
  var chatNameMenu = null; // { id, name, x, y }
  var chatSendTimes = [];
  var chatPinnedScroll = false;

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
    var tone = item.kind === "backdrop" || itemCat(item) === "backdrops" ? "night" : (item.kind === "avatar" || itemCat(item) === "avatars") ? "fox" : "";
    var price = item.owned ? "owned" : ((item.coins != null ? item.coins : item.price) || 0) + " coins";
    var visual = item.thumb
      ? '<img class="stuff-thumb" src="' + item.thumb + '" alt="" />'
      : '<div class="swatch ' + tone + '"></div>';
    return '<button type="button" class="card shop-card" data-shop-item="' + esc(id) + '">'
      + visual + '<div class="body"><h3>' + esc(item.name || "Item") + '</h3>'
      + '<p class="meta">' + esc(item.kind || itemCat(item)) + " · " + esc(item.creator || item.sellerName || "member") + '</p>'
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
  var meSub = "home"; // home | profile | friends | mail | passport | account | themes | club | blocklist | galleries | transactions | contests | share
  var profileEditSection = null; // null | status | photo | info
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

  // ---------------------------------------------------------------------------
  // Session helpers + occupant / chat row HTML builders
  // ---------------------------------------------------------------------------
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
    var open = occMenuId && occMenuId === id;
    var menu;
    if (p.you) {
      menu = '<div class="occ-menu" role="menu">'
        + '<button type="button" class="occ-menu-item" data-profile="' + esc(id) + '">View Profile</button>'
        + '<button type="button" class="occ-menu-item" data-me="profile">Edit profile</button>'
        + '</div>';
    } else {
      menu = '<div class="occ-menu" role="menu">'
        + '<button type="button" class="occ-menu-item" data-profile="' + esc(id) + '">View Profile</button>'
        + '<button type="button" class="occ-menu-item" data-invite-buddy="' + esc(id) + '" data-friend-name="' + esc(p.name || id) + '">Invite to be your friend</button>'
        + '<button type="button" class="occ-menu-item" data-mail-to="' + esc(id) + '" data-mail-name="' + esc(p.name || id) + '">Send Mail</button>'
        + '<button type="button" class="occ-menu-item" data-enter-room="loft">Visit Home</button>'
        + '</div>';
    }
    return '<div class="person-wrap' + (open ? " is-open" : "") + '">'
      + '<button type="button" class="person" data-occ-menu="' + esc(id) + '">'
      + '<span class="ava' + (p.you ? " you" : "") + '">' + esc(p.initials || "?") + '</span>'
      + '<span class="person-name">' + esc(p.name) + roleBadgeHtml(getRole(id)) + (p.you ? " <span class=\"sub\">(you)</span>" : "") + '</span>'
      + '<span class="dot' + (p.online ? " on" : "") + '"></span>'
      + '<span class="sub">' + esc(p.you ? "you" : (p.room || "")) + '</span></button>'
      + (open ? menu : "")
      + '</div>';
  }
  function occLegend() {
    return '<div class="occ-legend" title="Starting out glow colors — legend only">'
      + '<span><i class="lg green"></i> Green door</span>'
      + '<span><i class="lg white"></i> White game</span>'
      + '<span><i class="lg blue"></i> Blue player</span>'
      + '</div>';
  }
  function shareInviteUrl() {
    try {
      if (location && location.href && location.protocol !== "about:") return String(location.href).split("#")[0];
    } catch (e) {}
    return "https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260905z";
  }
  function inviteThemPanel() {
    var url = shareInviteUrl();
    var subject = encodeURIComponent("Come hang out in Whirled2");
    var body = encodeURIComponent(
      "Hey! Join me in Whirled2 — a free social world revival (no payments). Not affiliated with whirled.club.\n\n"
      + "Open: " + url + "\n\n"
      + "Coins are labels only. See you in the loft!"
    );
    return '<div class="panel invite-them-panel" id="invite-them-panel">'
      + '<div class="room-side-head"><h2>Invite Them!</h2>'
      +   '<button type="button" class="text-btn" data-invite-close="1">Close</button></div>'
      + '<p class="meta">Share Whirled2 with a friend. No email-import from Hotmail etc. — just a link or mailto.</p>'
      + '<label class="invite-link-label">Share link'
      +   '<input id="invite-share-url" readonly value="' + esc(url) + '" />'
      + '</label>'
      + '<div class="invite-them-actions">'
      +   '<button type="button" class="action-btn" data-invite-copy="1">Copy link</button>'
      +   '<a class="action-btn" href="mailto:?subject=' + subject + '&body=' + body + '">Email invite</a>'
      + '</div>'
      + '<p class="meta" id="invite-copy-msg"></p>'
      + '</div>';
  }
  function friendInvitePopup() {
    if (!friendInvitePending) return "";
    var t = friendInvitePending;
    return '<div class="modal-backdrop" id="buddy-invite-modal" data-buddy-cancel="1">'
      + '<div class="modal-card" role="dialog" aria-label="Friend request" onclick="event.stopPropagation()">'
      +   '<h2>Invite ' + esc(t.name) + '</h2>'
      +   '<p class="meta">Optional message (sent as a mail note). Default classic text below.</p>'
      +   '<form id="buddy-invite-form" data-buddy-id="' + esc(t.id) + '" data-buddy-name="' + esc(t.name) + '">'
      +     '<textarea name="message" rows="3" maxlength="400">Let\'s be buddies!</textarea>'
      +     '<div class="invite-them-actions">'
      +       '<button type="submit" class="action-btn">Send request</button>'
      +       '<button type="button" class="text-btn" data-buddy-cancel="1">Cancel</button>'
      +     '</div>'
      +   '</form>'
      + '</div></div>';
  }
  function feedRow(ev) {
    return '<div class="feed-row"><span class="ava">' + esc(ev.who.slice(0, 1)) + "</span><div><b>" + esc(ev.who) + "</b> " + esc(ev.text) + "<time>" + esc(ev.ago || "just now") + " · " + esc(ev.place || "status") + "</time></div></div>";
  }
  function chatRow(msg) {
    var stamp = "";
    try { stamp = new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) {}
    if (msg.system) {
      return '<div class="chat-row chat-system"><div class="chat-bubble system">' + esc(msg.text) + '</div></div>';
    }
    var uid = msg.userId || "";
    var role = getRole(uid);
    if (!role || role === "player") {
      // try resolve by who name
      if (isPrivilegedName(msg.who) || isPrivilegedName(uid)) role = "admin";
    }
    var accent = role === "admin" ? " is-admin" : (role === "mod" ? " is-mod" : "");
    var text = String(msg.text || "");
    var emote = !!msg.emote;
    if (!emote && (/^\/me\s+/i.test(text) || /^\/emote\s+/i.test(text))) {
      emote = true;
      text = text.replace(/^\/(me|emote)\s+/i, "");
    }
    var nameBtn = '<button type="button" class="chat-who" data-chat-who="' + esc(uid || msg.who || "") + '" data-chat-who-name="' + esc(msg.who || "") + '">' + esc(msg.who || "?") + '</button>';
    var body = emote
      ? ('<div class="chat-bubble emote"><i>' + esc(msg.who) + " " + esc(text) + "</i></div>")
      : ('<div class="chat-bubble">' + esc(text) + "</div>");
    return '<div class="chat-row' + accent + (emote ? " is-emote" : "") + '">'
      + (emote ? "" : (nameBtn + roleBadgeHtml(role) + ' <time>' + esc(stamp) + "</time>"))
      + body + "</div>";
  }
  function card(item) {
    var id = item.id || "";
    var thumb = item.thumb
      ? '<img class="stuff-thumb" src="' + item.thumb + '" alt="" />'
      : '<div class="swatch"></div>';
    return '<button type="button" class="card stuff-card" data-stuff-item="' + esc(id) + '">'
      + thumb
      + '<div class="body"><h3>' + esc(item.name || "Item") + '</h3>'
      + '<p class="meta">' + esc(item.kind || itemCat(item)) + (item.creator ? (" · " + esc(item.creator)) : "") + '</p>'
      + '<div class="price">owned</div></div></button>';
  }
  function findStuff(id) {
    var all = loadStuff();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function stuffUploadForm(meta) {
    // How this works: Music category accepts audio files (data URL in whirled2.stuff).
    // Other categories stay image-thumb stubs. Copyright checkbox is always required.
    var isMusic = meta.id === "music";
    var fileLabel = isMusic
      ? 'Audio file (MP3 / WAV / OGG / WebM) <input type="file" name="media" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/*" required />'
      : 'Thumbnail / image (optional) <input type="file" name="image" accept="image/png,image/jpeg,image/gif,image/webp" />';
    var blurb = isMusic
      ? 'Wiki Music: upload an audio file you own or have rights to. Stored as a data URL in this browser (~2–4MB). Add tracks to the room playlist from Room menu. Do <b>not</b> upload copyrighted material you do not own.'
      : 'Wiki-style stub: name + description + optional thumbnail. SWF / full media arrives with the engine later. Images only for this mock (png/jpg/gif/webp), ~200KB cap.';
    return '<div class="panel stuff-upload-panel">'
      + '<div class="room-side-head"><h2>Upload / Create — ' + esc(meta.label) + '</h2>'
      +   '<button type="button" class="text-btn" data-stuff-mode="browse">Cancel</button></div>'
      + '<p class="meta">' + blurb + '</p>'
      + '<form id="stuff-upload-form" class="stuff-upload-form">'
      +   '<label>Name <input name="name" maxlength="80" required placeholder="' + (isMusic ? "Track name" : "Item name") + '" /></label>'
      +   '<label>Description <textarea name="description" rows="3" maxlength="400" placeholder="What is it?"></textarea></label>'
      +   '<label>Type <input name="type" readonly value="' + esc(meta.label) + '" data-type-id="' + esc(meta.id) + '" /></label>'
      +   '<input type="hidden" name="typeId" value="' + esc(meta.id) + '" />'
      +   '<label>' + fileLabel + '</label>'
      +   '<label class="check-row"><input type="checkbox" name="copyright" required /> I confirm I have the right to upload this (copyright). I will not upload material I do not own or lack permission to use.</label>'
      +   '<button type="submit">Save to Stuff</button>'
      +   '<p class="meta" id="stuff-upload-msg"></p>'
      + '</form></div>';
  }
  function stuffDetail(item) {
    if (!item) {
      return '<div class="panel"><p class="meta">Item not found.</p>'
        + '<button type="button" class="text-btn" data-stuff-mode="browse">Back</button></div>';
    }
    var friends = loadFriends();
    var friendOpts = friends.map(function (f) {
      return '<option value="' + esc(f.id) + '">' + esc(f.name) + '</option>';
    }).join("");
    var thumb = item.thumb
      ? '<img class="stuff-detail-thumb" src="' + item.thumb + '" alt="" />'
      : '<div class="swatch"></div>';
    var edit = stuffMode === "edit";
    var listing = findShopListingByStuff(item.id);
    var body = edit
      ? ('<form id="stuff-edit-form" data-stuff-edit="' + esc(item.id) + '">'
        + '<label>Name <input name="name" maxlength="80" required value="' + esc(item.name || "") + '" /></label>'
        + '<label>Description <textarea name="description" rows="3" maxlength="400">' + esc(item.description || "") + '</textarea></label>'
        + '<button type="submit">Save</button> '
        + '<button type="button" class="text-btn" data-stuff-item="' + esc(item.id) + '">Cancel</button>'
        + '</form>')
      : ('<p>' + esc(item.description || "No description.") + '</p>'
        + '<p class="meta">' + esc(item.kind || itemCat(item)) + " · by " + esc(item.creator || "you") + '</p>');
    var listBlock = "";
    if (!edit) {
      if (listing) {
        listBlock = '<div class="section-label">Shop listing</div>'
          + '<p class="meta">Listed at <b>' + esc(String(listing.coins != null ? listing.coins : listing.price || 0)) + ' coins</b> (display-only).'
          + (listing.tags ? (" Tags: " + esc(listing.tags)) : "") + '</p>'
          + '<button type="button" class="action-btn danger" data-stuff-delist="' + esc(item.id) + '">Delist</button>';
      } else if (stuffListMode) {
        listBlock = '<div class="section-label">List Item → Shop</div>'
          + '<form id="stuff-list-form" data-stuff-list="' + esc(item.id) + '" class="stuff-list-form">'
          +   '<label>Price in coins (label only) <input name="coins" type="number" min="0" max="999999" value="100" required /></label>'
          +   '<label>Tags <input name="tags" maxlength="120" placeholder="furniture, cozy, loft" /></label>'
          +   '<label class="check-row"><input type="checkbox" name="copyright" required /> I confirm I have the right to list this (copyright).</label>'
          +   '<div class="stuff-detail-actions">'
          +     '<button type="submit">Confirm list in Shop</button>'
          +     '<button type="button" class="text-btn" data-stuff-list-cancel="1">Cancel</button>'
          +   '</div>'
          +   '<p class="meta">Copies a listing into Shop with your seller id/name and thumb. Buy stays disabled — coins are labels only.</p>'
          + '</form>';
      } else {
        listBlock = '<div class="section-label">Shop</div>'
          + '<button type="button" class="action-btn" data-stuff-list-open="' + esc(item.id) + '">List Item</button>'
          + '<p class="meta">Creator loop: list a copy into Shop. Price is display-only.</p>';
      }
    }
    return '<div class="panel stuff-detail-panel">'
      + '<button type="button" class="text-btn" data-stuff-mode="browse">← Back to ' + esc(catMeta(stuffCat).label) + '</button>'
      + '<div class="stuff-detail-head">' + thumb + '<div><h2>' + esc(item.name || "Item") + '</h2>' + body + '</div></div>'
      + (edit ? "" : (
        '<div class="stuff-detail-actions">'
        + '<button type="button" class="action-btn" data-stuff-edit-open="' + esc(item.id) + '">Edit name/desc</button>'
        + '<button type="button" class="action-btn danger" data-stuff-delete="' + esc(item.id) + '">Delete</button>'
        + '</div>'
        + listBlock
        + '<div class="section-label">Send as Gift</div>'
        + (friends.length
          ? ('<form id="stuff-gift-form" data-stuff-gift="' + esc(item.id) + '" class="stuff-gift-form">'
            + '<select name="friendId" required><option value="">— pick a friend —</option>' + friendOpts + '</select>'
            + '<button type="submit">Send as Gift</button>'
            + '<p class="meta">Sends a mail note (local). Item stays in your Stuff on this mock.</p>'
            + '</form>')
          : '<p class="meta">Add a friend first to send gifts.</p>')
      ))
      + '</div>';
  }
  function stuffPage() {
    var meta = catMeta(stuffCat);
    var all = loadStuff();
    var items = filterByCat(all, stuffCat);
    var how = '<div class="panel how-stuff-panel">'
      + '<h3>How do I get stuff?</h3>'
      + '<p class="meta">Create furniture and media yourself (wiki Upload), or earn/buy later. Coins stay labels only — no payments. Nothing is invented for you.</p>'
      + '<button type="button" class="action-btn" data-stuff-mode="upload">Upload…</button>'
      + '</div>';
    var body;
    if (stuffMode === "upload") {
      body = stuffUploadForm(meta);
    } else if ((stuffMode === "detail" || stuffMode === "edit") && stuffItemId) {
      body = stuffDetail(findStuff(stuffItemId));
    } else if (!items.length) {
      body = how + '<div class="panel"><p class="meta">' + esc(meta.empty) + (all.length ? "" : " Your inventory starts empty.") + '</p></div>';
    } else {
      body = how + '<div class="grid">' + items.map(card).join("") + '</div>';
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
      +     '<button type="button" class="action-btn" disabled title="Coins are labels only — no payments">Buy — Coins are labels only — no payments</button>'
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
        + '<p class="shop-banner">Coins are labels only — no payments on Whirled2 yet.</p></div></div>'
        + shopItemDetail(found) + '</section>';
    }
    var meta = catMeta(shopCat);
    var all = loadShop();
    var items = sortShopItems(filterByCat(all, shopCat), shopSort);
    var body;
    if (!all.length) {
      body = '<div class="panel"><p class="meta">No listings yet. List items from Stuff → List Item. Coins stay labels only — no invented catalog.</p></div>';
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
      + '<p class="shop-banner">Coins are labels only — no payments on Whirled2 yet.</p>'
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
    // How this works: creators act as managers here. Theme panel is Coming Soon (wiki Whirleds FAQ)
    // plus an optional local hex draft that only tints this group's header on this browser.
    var gTheme = loadGroupTheme(g.id) || {};
    var headerStyle = (gTheme.hex ? (' style="--group-accent:' + esc(gTheme.hex) + '"') : '');
    var themePanel = isCreator
      ? ('<div class="section-label">Edit Whirled theme</div>'
        + '<div class="panel group-theme-panel">'
        +   '<span class="club-badge-soon">Coming Soon</span>'
        +   '<p>Classic themed Whirleds let managers <b>skin the top bar</b> (hex + images), <b>mark items</b> allowed in the whirled, and <b>mark rooms</b>. See wiki Whirleds FAQ / Create Whirleds.</p>'
        +   '<p class="meta">No payments here. Prototype below only tints this group page header on your browser (<code>whirled2.groupTheme.' + esc(g.id) + '</code>).</p>'
        +   '<form id="group-theme-form" data-group-theme="' + esc(g.id) + '" class="group-theme-form">'
        +     '<label>Draft header color <input type="color" name="hex" value="' + esc(gTheme.hex || "#3aa3e0") + '" /></label>'
        +     '<button type="submit" class="action-btn">Save local draft</button>'
        +   '</form></div>')
      : '';
    return '<section class="page group-page"' + headerStyle + '>'
      + '<button type="button" class="text-btn" data-group-back="1">← All groups</button>'
      + '<div class="featured group-featured-head">Group</div>'
      + '<h1 class="group-title-accent">' + esc(g.name) + '</h1>'
      + '<p class="lobby-blurb">' + esc(g.blurb || "") + '</p>'
      + '<div class="group-actions">'
      +   joinBtn
      +   '<button type="button" class="action-btn" data-group-hall="' + esc(g.id) + '">Enter hall</button>'
      + '</div>'
      + '<p class="meta">Enter hall opens the Rooms lobby / Studio Loft (shared whirled halls come later).</p>'
      + themePanel
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

  function decorateInventory() {
    var all = loadStuff();
    var allow = { furniture: 1, backdrops: 1, toys: 1, images: 1 };
    return all.filter(function (it) { return allow[itemCat(it)]; });
  }
  function decorateChipHtml(it) {
    var x = Number(it.x) || 40;
    var y = Number(it.y) || 40;
    var thumb = it.thumb
      ? '<img src="' + it.thumb + '" alt="" />'
      : '<span class="dec-chip-label">' + esc((it.name || "?").slice(0, 12)) + '</span>';
    return '<div class="decorate-chip" data-dec-id="' + esc(it.id) + '" style="left:' + x + 'px;top:' + y + 'px" title="' + esc(it.name || "item") + '">'
      + thumb
      + '<button type="button" class="dec-chip-x" data-dec-remove="' + esc(it.id) + '" title="Take from room">×</button>'
      + '</div>';
  }
  function decorateLayerHtml() {
    var layout = loadRoomLayout();
    if (!layout.items.length && !decorateMode) return '<div id="decorate-layer" class="decorate-layer" aria-hidden="true"></div>';
    return '<div id="decorate-layer" class="decorate-layer' + (decorateMode ? " is-active" : "") + '" aria-label="Room decorations">'
      + layout.items.map(decorateChipHtml).join("")
      + '</div>';
  }
  function decoratePanel() {
    var inv = decorateInventory();
    var layout = loadRoomLayout();
    var placed = layout.items || [];
    var invRows = inv.length
      ? inv.map(function (it) {
          var thumb = it.thumb ? '<img class="dec-inv-thumb" src="' + it.thumb + '" alt="" />' : '<span class="dec-inv-swatch"></span>';
          return '<div class="dec-inv-row">'
            + thumb
            + '<div class="dec-inv-meta"><b>' + esc(it.name || "Item") + '</b><span class="meta">' + esc(itemCat(it)) + '</span></div>'
            + '<button type="button" class="action-btn" data-dec-add="' + esc(it.id) + '">Add to room</button>'
            + '</div>';
        }).join("")
      : '<p class="meta">No furniture, backdrops, toys, or images in Stuff yet. Upload some first.</p>';
    var placedRows = placed.length
      ? '<ul class="dec-placed-list">' + placed.map(function (it) {
          return '<li><b>' + esc(it.name || "Item") + '</b> <span class="meta">(' + Math.round(it.x || 0) + ',' + Math.round(it.y || 0) + ')</span> '
            + '<button type="button" class="text-btn" data-dec-remove="' + esc(it.id) + '">Take from room</button></li>';
        }).join("") + '</ul>'
      : '<p class="meta">Nothing placed yet.</p>';
    return '<div class="room-side-panel decorate-panel" id="decorate-panel">'
      + '<div class="panel">'
      +   '<div class="room-side-head"><h2>Decorate Room</h2>'
      +     '<button type="button" class="text-btn" data-decorate-close="1">Close</button></div>'
      +   '<p class="meta">Wiki Furniture shell — chips on a decorate layer (sibling of #stage-slot). Drag to move. Engine still mounts via getStageEl().</p>'
      +   '<div class="section-label">Your Stuff</div>'
      +   '<div class="dec-inv-list">' + invRows + '</div>'
      +   '<div class="section-label">View items (layout)</div>'
      +   placedRows
      +   '<div class="stuff-detail-actions">'
      +     '<button type="button" class="action-btn" data-dec-save="1">Save layout</button>'
      +   '</div>'
      +   '<p class="meta">Saved to <code>whirled2.roomLayout.loft</code>.</p>'
      + '</div></div>';
  }
  function partyPanel() {
    var parties = loadParties();
    var mine = currentParty();
    var rows = parties.length
      ? parties.map(function (p) {
          var members = (p.members || []).map(function (m) { return m.name; }).join(", ") || "empty";
          var joined = mine && mine.id === p.id;
          return '<div class="party-row panel">'
            + '<h3>' + esc(p.name || "Party") + '</h3>'
            + '<p class="meta">' + esc(p.visibility || "open") + ' · host ' + esc(p.creatorName || "member")
            + ' · ' + esc(String((p.members || []).length)) + ' members</p>'
            + '<p class="meta">Members: ' + esc(members) + '</p>'
            + (joined
              ? '<button type="button" class="action-btn" data-party-leave="' + esc(p.id) + '">Leave</button>'
              : '<button type="button" class="action-btn" data-party-join="' + esc(p.id) + '">Join</button>')
            + '</div>';
        }).join("")
      : '<div class="panel"><p class="meta">No parties yet. Create one below — empty list from <code>whirled2.parties</code>.</p></div>';
    return '<div class="room-side-panel party-panel" id="party-panel">'
      + '<div class="panel">'
      +   '<div class="room-side-head"><h2>Party board</h2>'
      +     '<button type="button" class="text-btn" data-party-close="1">Close</button></div>'
      +   '<p class="meta">Wiki Party stub. Follow-the-leader is meta only — shared server later.</p>'
      +   (mine ? '<p class="party-now"><b>Your party:</b> ' + esc(mine.name) + '</p>' : '<p class="meta">You are not in a party.</p>')
      +   '<div class="section-label">Parties</div>'
      +   rows
      +   '<div class="section-label">Create party</div>'
      +   '<form id="party-create-form" class="party-create-form">'
      +     '<label>Name <input name="name" maxlength="60" required placeholder="Party name" /></label>'
      +     '<label>Visibility <select name="visibility"><option value="open">Open</option><option value="friends">Friends</option></select></label>'
      +     '<button type="submit">Create party</button>'
      +   '</form>'
      + '</div></div>';
  }
    // How this works: Legal / Disclaimer is a first-class page (Help link + gate footer).
  // No copyrighted uploads; Whirled2 is not official whirled.club.
  function legalPage() {
    return '<section class="page legal-page"><div class="page-head"><div><h1>Legal / Disclaimer</h1>'
      + '<p>Please read before uploading or sharing.</p></div>'
      + '<button type="button" class="text-btn" data-legal-close="1">Close</button></div>'
      + '<div class="panel legal-panel">'
      +   '<h2>Copyright &amp; uploads</h2>'
      +   '<p><b>We do not promote or allow</b> uploading copyrighted material you do not own or have rights to use.</p>'
      +   '<p>Users must only upload content they <b>created</b> or are <b>authorized</b> to use. The copyright checkbox on Upload / List Item is required — check it only if that statement is true.</p>'
      +   '<p class="meta">Room music and Stuff media stay in <b>your browser</b> on GitHub Pages (localStorage). That does not make unauthorized uploads OK.</p>'
      + '</div>'
      + '<div class="panel legal-panel">'
      +   '<h2>Whirled2 is not the original Whirled</h2>'
      +   '<p>Whirled2 is inspired by the original Whirled concept, public research, community docs, and open-source references (including <a href="https://github.com/greyhavens/msoy" target="_blank" rel="noopener">greyhavens/msoy</a>). We do <b>not</b> copy or redistribute original proprietary assets from whirled.club, Three Rings Design, or other projects.</p>'
      +   '<p>Logos and UI here are <b>Whirled2 originals</b> or user-supplied. This is <b>not</b> official Whirled Club / whirled.club.</p>'
      +   '<p>Features are <b>prototypes</b> and subject to change. Coins and bars are <b>labels only</b> — no live payments on this mock.</p>'
      + '</div></section>';
  }
function helpPage() {
    return '<section class="page help-page"><div class="page-head"><div><h1>Help</h1>'
      + '<p>Starting Out — Whirled2 chrome tips.</p></div>'
      + '<button type="button" class="text-btn" data-help-close="1">Close Help</button></div>'
      + '<div class="panel"><h2>Starting Out</h2>'
      + '<ul class="help-tips">'
      + '<li><b>Me</b> — profile, friends, mail, passport stamps, account (permaname). Coins are labels only.</li>'
      + '<li><b>Rooms</b> — enter Studio Loft; chat in the bar; Room menu for comment/rate, decorate, lock (visual).</li>'
      + '<li><b>Stuff upload</b> — furniture/media with Upload…; <b>Music</b> accepts MP3/WAV/OGG (copyright checkbox required). List Item copies into Shop.</li>'
      + '<li><b>Room playlist</b> — Room menu → View room playlist. Add from My Music; owner can remove/next. Soft autoplay with Click-to-play if blocked.</li>'
      + '<li><b>Themes</b> — Me → Themes for browser CSS presets; group managers get Edit Whirled theme shell (Coming Soon).</li>'
      + '<li><b>Mail</b> — header count; compose from Me → Mail or profiles.</li>'
      + '<li><b>Groups</b> — local clubs with discussion + Enter hall (lobby meta).</li>'
      + '<li><b>Games lobby</b> — genre filters and local tables from <code>whirled2.games</code> only — never invented titles.</li>'
      + '<li><b>Coins labels</b> — prices display only; Buy stays disabled (“no payments”).</li>'
      + '<li><b>Parties</b> — toolbar party board: create/join/leave locally; follow-leader later on a shared server.</li>'
      + '<li><b>Decorate</b> — place Stuff furniture/backdrops/toys/images as chips; Save to room layout.</li>'
      + '</ul></div>'
      + '<div class="panel"><h2>Concept &amp; Status (spirit)</h2>'
      + '<p class="meta">Whirled = social network + virtual world. Tabs: Me, Stuff, Games, Rooms, Groups, Shop. Pale blue classic chrome — no gold/purple. Engine mounts only in <code>#stage-slot</code> via <code>window.WhirledChrome</code>. No fake NPCs or invented catalog. No private engine in this mock.</p>'
      + '<p class="meta">This pass: chat-send fix, empty notice-bar, themes shells, room music playlist, Legal page. Cache <code>?v=20260906a</code>.</p>'
      + '<p class="meta"><b>Club</b> — Membership Coming Soon (Me → Club or header Club). Coins/bars stay labels; no live payments.</p>'
      + '<p class="meta"><button type="button" class="text-btn" data-legal-open="1">Legal / Disclaimer</button> — copyright uploads; not affiliated with whirled.club.</p>'
      + '<p class="meta">Live docs: CONCEPT.md / STATUS.md / DEV-NOTES.md — no external secrets.</p>'
      + '</div></section>';
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
  // ---------------------------------------------------------------------------
  // Rooms: lobby tiles vs in-room stage (#stage-slot) + chat log / overlay
  // ---------------------------------------------------------------------------
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
      +     occLegend()
      +     (empty ? '<p class="sub" style="padding:8px 10px">Nobody here yet.</p>' : here.map(personRow).join(''))
      +     '<button type="button" class="text-btn leave-room" data-leave-room="1">Back to Rooms</button>'
      +   '</aside>'
      +   '<section class="stage-wrap">'
      +     '<div class="room-strip"><span class="room-name">' + esc(ROOM) + '</span>'
      +       '<span class="room-owner">owner: ' + esc(me.name) + '</span>'
      +       '<span class="room-lock-badge" title="Visual only on Pages" data-lock="' + esc(lock) + '">🔒 ' + esc(lockLabel(lock)) + '</span>'
      +       '<span class="room-rating-badge">' + esc(loftRatingLabel()) + '</span></div>'
      +     '<div class="stage-body chat-mode-' + esc(loadChatUi().mode) + ' text-size-' + esc(loadChatUi().textSize) + (loadChatUi().hideHistory ? ' hide-history' : '') + '">'
      +     '<div class="stage-host">'
      +       '<div id="stage-slot"><div class="stage-copy"><strong>Your room — engine mounts here</strong>Empty classic stage for now. Decorate with Room menu — click-to-walk arrives with the engine track.<code>#stage-slot</code></div></div>'
      +       decorateLayerHtml()
      +       '<div class="chat-overlay is-empty" id="chat-overlay" aria-live="polite" hidden></div>'
      +     '</div>'
      +     '<div class="chat-log" id="chat-log">' + chat.map(chatRow).join('') + '</div>'
      +     '</div>'
      +     (roomPanelOpen ? roomCommentsPanel() : '')
      +     (playlistPanelOpen ? playlistPanel() : '')
      +     (decorateMode ? decoratePanel() : '')
      +     (partyPanelOpen ? partyPanel() : '')
      +     '<button type="button" class="music-gesture-fab" id="music-gesture-btn"' + (musicGestureNeeded ? "" : " hidden") + ' data-music-gesture="1">Click to play room music</button>'
      +   '</section>'
      + '</div>'
      + friendInvitePopup();
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
    if (fromId == null || toId == null) return null;
    if (String(fromId) === String(toId)) return null;
    try {
      var s = session();
      if (s && s.user && String(toId) === String(s.user.id)
          && (String(fromId) === String(s.user.id) || String(fromId) === String(s.user.name))) {
        return null;
      }
    } catch (e) {}
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

  function persistNotices() {
    try { localStorage.setItem(NOTE_KEY, JSON.stringify(notices)); } catch (e) {}
  }
  function isPokeNoticeText(t) {
    t = t != null ? String(t) : "";
    return /poked you/i.test(t) || /You poked/.test(t);
  }
  function isEphemeralNotice(n) {
    if (!n) return false;
    if (n.transient) return true;
    var t = n.text != null ? String(n.text) : "";
    if (/^Room layout saved/.test(t)) return true;
    if (isPokeNoticeText(t)) return true;
    return false;
  }
  function stripStuckPokeNotices() {
    loadNotices();
    var me = null;
    try { me = session() && session().user; } catch (e) { me = null; }
    var next = notices.filter(function (n) {
      var t = n && n.text != null ? String(n.text) : "";
      if (isPokeNoticeText(t)) return false;
      if (me && me.name && t === (me.name + " poked you.")) return false;
      return true;
    });
    if (next.length === notices.length) return;
    notices = next;
    persistNotices();
  }
  function loadNotices() {
    try { notices = JSON.parse(localStorage.getItem(NOTE_KEY) || "[]"); } catch (e) { notices = []; }
    if (!Array.isArray(notices)) notices = [];
    var now = Date.now();
    var kept = notices.filter(function (n) {
      if (!isEphemeralNotice(n)) return true;
      var ts = n.at ? Date.parse(n.at) : 0;
      return !!(ts && (now - ts) < 3500);
    });
    if (kept.length !== notices.length) {
      notices = kept;
      persistNotices();
    }
    return notices;
  }
  function dismissNoticeId(id) {
    if (!id) return;
    loadNotices();
    var next = notices.filter(function (n) { return n.id !== id; });
    if (next.length === notices.length) return;
    notices = next;
    persistNotices();
    renderNotices();
  }
  function clearTransientNotices() {
    loadNotices();
    var next = notices.filter(function (n) { return !isEphemeralNotice(n); });
    if (next.length === notices.length) return;
    notices = next;
    persistNotices();
    renderNotices();
  }
  function pushNotice(kind, text, opts) {
    opts = opts || {};
    loadNotices();
    var notice = {
      id: "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      kind: kind || "gray",
      text: text,
      at: new Date().toISOString()
    };
    if (opts.transient) notice.transient = true;
    notices.unshift(notice);
    notices = notices.slice(0, 30);
    persistNotices();
    renderNotices();
    if (notice.transient) {
      var nid = notice.id;
      setTimeout(function () { dismissNoticeId(nid); }, 3000);
    }
  }
  function renderNotices() {
    loadNotices();
    var el = document.getElementById("notice-bar");
    if (!el) return;
    var party = currentParty();
    var partyRow = party
      ? '<div class="notice-row kind-blue party-notice">Party: ' + esc(party.name) + ' <span class="meta">(follow-leader — shared server later)</span></div>'
      : "";
    // How this works: hide the floating cream panel when there is nothing to show.
    // Never leave a permanent "No notifications" placeholder (looked like a stuck toast).
    if (!notices.length && !partyRow) {
      el.innerHTML = "";
      el.hidden = true;
      el.classList.add("is-empty");
      return;
    }
    el.hidden = false;
    el.classList.remove("is-empty");
    var clearBtn = notices.length
      ? '<div class="notice-toolbar"><button type="button" class="notice-clear-all" data-notice-clear-all="1">Clear all</button></div>'
      : "";
    el.innerHTML = clearBtn + partyRow + notices.slice(0, 8).map(function (n) {
      return '<div class="notice-row kind-' + esc(n.kind) + (n.transient ? " notice-toast" : "") + '" data-notice-id="' + esc(n.id) + '">'
        + '<span class="notice-text">' + esc(n.text) + '</span>'
        + '<button type="button" class="notice-dismiss" data-dismiss-notice="' + esc(n.id) + '" aria-label="Dismiss">×</button>'
        + '</div>';
    }).join("");
  }
  function bindNoticeBarClicks(box) {
    if (!box || box._noticeBound) return;
    box._noticeBound = true;
    box.addEventListener("click", function (ev) {
      var d = ev.target.closest("[data-dismiss-notice]");
      if (d) {
        ev.preventDefault();
        dismissNoticeId(d.getAttribute("data-dismiss-notice"));
        return;
      }
      if (ev.target.closest("[data-notice-clear-all]")) {
        ev.preventDefault();
        loadNotices();
        notices = [];
        persistNotices();
        renderNotices();
      }
    });
  }
  function ensureNoticeBar() {
    stripStuckPokeNotices();
    var existing = document.getElementById("notice-bar");
    if (existing) { bindNoticeBarClicks(existing); renderNotices(); return; }
    if (!session()) return;
    var box = document.createElement("aside");
    box.id = "notice-bar";
    box.className = "notice-bar";
    box.setAttribute("aria-label", "Notifications");
    document.body.appendChild(box);
    bindNoticeBarClicks(box);
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
      return '<button type="button" class="friend-thumb" data-profile="' + esc(f.id) + '" title="' + esc(f.name) + '">' + thumb + '<span>' + esc(f.name) + roleBadgeHtml(getRole(f.id)) + '</span></button>';
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
      + '<button type="button" class="me-link' + (meSub === "themes" ? " is-on" : "") + '" data-me="themes">Themes</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "club" ? " is-on" : "") + '" data-me="club">Club</button>'
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
      +     '<div class="panel invite-banner">Invite friends to Whirled2 — coins stay labels only (no payments).</div>'
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
      +       '<button type="button" class="text-btn" data-me="themes">Themes</button>'
      +       '<button type="button" class="text-btn" data-me="club">Club / Membership</button>'
      +       '<button type="button" class="text-btn" data-legal-open="1">Legal / Disclaimer</button>'
      +       '<hr class="me-side-rule" />'
      +       '<button type="button" class="text-btn" data-me="blocklist">My Blocklist</button>'
      +       '<button type="button" class="text-btn" data-me="galleries">My Galleries</button>'
      +       '<button type="button" class="text-btn" data-me="transactions">My Transactions</button>'
      +       '<button type="button" class="text-btn" data-me="contests">Contests</button>'
      +       '<button type="button" class="text-btn" data-me="share">Share Whirled</button>'
      +     '</div>'
      +     '<div class="panel"><h2>My Friends Online</h2>' + friendBox + '</div>'
      +   '</aside>'
      + '</div></section>';
  }

  // ---------------------------------------------------------------------------
  // Me → My Profile (classic edit links: read-only until you click Edit)
  // profileEditSection: null | "status" | "photo" | "info"
  // ---------------------------------------------------------------------------
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
    wall = wall.filter(function (w) { return !w.fromId || !isBlocked(w.fromId); });
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
    var editSt = profileEditSection === "status";
    var editPh = profileEditSection === "photo";
    var editInfo = profileEditSection === "info";
    function editToggle(sec, label) {
      var open = profileEditSection === sec;
      return '<button type="button" class="edit-link' + (open ? " is-open" : "") + '" data-profile-edit="' + sec + '">'
        + (open ? "Done" : ("Edit " + label)) + '</button>';
    }
    return '<section class="page me-page profile-page">' + meSubnav()
      + '<div class="classic-profile">'
      +   '<div class="cp-header">'
      +     '<div class="cp-photo">' + photoHtml
      +       '<div class="cp-edit-row">' + editToggle("photo", "photo") + '</div></div>'
      +     '<div class="cp-main">'
      +       '<div class="cp-name-row"><span class="cp-name">' + esc(me.name) + '</span>' + roleBadgeHtml(getRole(sid)) + '<span class="level-badge">Level 1</span></div>'
      +       '<div class="cp-status-block">'
      +         '<div class="cp-status">' + (st ? esc(st) : '<span class="meta">No status set</span>') + '</div>'
      +         editToggle("status", "status")
      +       '</div>'
      +       profileActionRow({})
      +     '</div>'
      +     '<aside class="cp-meta-box">'
      +       '<div><span class="k">Permaname</span><span class="v">' + esc(sid) + '</span></div>'
      +       '<div><span class="k">Member since</span><span class="v">' + esc(member) + '</span></div>'
      +       '<div><span class="k">Last online</span><span class="v">now</span></div>'
      +       '<div><span class="k">Home Page</span><span class="v">' + (info.homepage ? '<a href="' + esc(info.homepage) + '" target="_blank" rel="noopener">' + esc(info.homepage) + '</a>' : '—') + '</span></div>'
      +     '</aside>'
      +   '</div>'
      +   (editSt
          ? ('<div class="cp-edit-panel is-open" id="edit-status-panel">'
            +   '<div class="cp-edit-head"><b>Edit status</b>'
            +     '<button type="button" class="text-btn" data-profile-edit-cancel="1">Cancel</button></div>'
            +   '<form class="status-form cp-status-form" id="status-form">'
            +     '<input name="status" maxlength="140" placeholder="Update your status…" value="' + esc(st) + '" />'
            +     '<button type="submit">Set status</button></form></div>')
          : '')
      +   (editPh
          ? ('<div class="cp-edit-panel is-open" id="edit-photo-panel">'
            +   '<div class="cp-edit-head"><b>Edit photo</b>'
            +     '<button type="button" class="text-btn" data-profile-edit-cancel="1">Cancel</button></div>'
            +   '<p class="meta">Choose an image from your device (stored in this browser).</p>'
            +   '<label class="profile-action photo-label edit-photo-pick"><span class="pa-ico">▣</span><span>Choose photo</span>'
            +     '<input type="file" id="photo-input" accept="image/*" hidden /></label>'
            +   '<p class="meta" id="photo-edit-msg"></p></div>')
          : '')
      +   '<div class="cp-section"><div class="cp-section-head"><h2>Information</h2>'
      +     editToggle("info", "information") + '</div>'
      +     '<div class="info-preview">' + infoRows(Object.assign({}, info, { about: info.about || me.bio })) + '</div>'
      +     (editInfo
            ? ('<div class="cp-edit-panel is-open" id="edit-info-panel">'
              +   '<div class="cp-edit-head"><b>Edit information</b>'
              +     '<button type="button" class="text-btn" data-profile-edit-cancel="1">Cancel</button></div>'
              +   '<form class="info-form" id="info-form">'
              +     '<label>Activities <input name="activities" value="' + esc(info.activities) + '" /></label>'
              +     '<label>Interests <input name="interests" value="' + esc(info.interests) + '" /></label>'
              +     '<label>Favorite Games <input name="games" value="' + esc(info.games) + '" /></label>'
              +     '<label>Favorite Music <input name="music" value="' + esc(info.music) + '" /></label>'
              +     '<label>Favorite Movies <input name="movies" value="' + esc(info.movies) + '" /></label>'
              +     '<label>Favorite Shows <input name="shows" value="' + esc(info.shows) + '" /></label>'
              +     '<label>Favorite Books <input name="books" value="' + esc(info.books) + '" /></label>'
              +     '<label>About Me <input name="about" value="' + esc(info.about || me.bio) + '" /></label>'
              +     '<label>Home Page URL <input name="homepage" value="' + esc(info.homepage) + '" /></label>'
              +     '<label>Display name <input name="name" maxlength="24" value="' + esc(me.name) + '" /></label>'
              +     '<div class="cp-edit-actions"><button type="submit">Save information</button>'
              +       '<button type="button" class="text-btn" data-profile-edit-cancel="1">Done</button></div>'
              +     '<p class="meta" id="profile-msg"></p>'
              +   '</form></div>')
            : '')
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
      if (isBlocked(p.id)) return false;
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
        +   '<button type="button" class="text-btn friend-list-name" data-profile="' + esc(f.id) + '"><b>' + esc(f.name) + '</b></button>' + roleBadgeHtml(getRole(f.id))
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
          +   '<button type="button" class="text-btn friend-list-name" data-profile="' + esc(p.id) + '"><b>' + esc(p.name) + '</b></button>' + roleBadgeHtml(getRole(p.id))
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
      + '<div class="panel"><div class="friends-head"><h2>Friends</h2>'
      +   '<button type="button" class="action-btn" data-invite-open="1">Invite Them!</button></div>'
      + (invitePanelOpen ? inviteThemPanel() : '')
      + '<div class="section-label">Search</div>'
      + '<form id="friend-search-form" class="friend-search-form">'
      +   '<input name="q" maxlength="60" placeholder="Search by Whirled name or permaname" value="' + esc(friendSearchQ) + '" />'
      +   '<button type="submit">Search</button>'
      + '</form>'
      + '<div class="friend-search-results">' + searchRows + '</div>'
      + '<div class="section-label">Your friends</div>'
      + rows + '</div>'
      + friendInvitePopup()
      + '</section>';
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
    var myRole = getRole(sid);
    var roleLabel = myRole === "admin" ? "Admin" : (myRole === "mod" ? "Mod" : "Player");
    var rolePanel = "";
    if (myRole === "admin") {
      var people = [];
      var seen = {};
      function addP(id, name) {
        if (!id || seen[id] || id === sid) return;
        seen[id] = true;
        people.push({ id: id, name: name || id });
      }
      loadFriends().forEach(function (f) { addP(f.id, f.name); });
      loadKnownProfiles().forEach(function (p) { addP(p.id, p.name); });
      liveOccupants.forEach(function (p) { addP(p.id, p.name); });
      var rows = people.length
        ? people.map(function (p) {
            var r = getRole(p.id);
            return '<div class="role-admin-row">'
              + '<div><b>' + esc(p.name) + '</b> ' + roleBadgeHtml(r)
              + '<div class="meta">permaname ' + esc(p.id) + ' · ' + esc(r) + '</div></div>'
              + '<div class="role-admin-actions">'
              +   '<button type="button" class="action-btn" data-set-role="' + esc(p.id) + '" data-role="admin">Admin</button>'
              +   '<button type="button" class="action-btn" data-set-role="' + esc(p.id) + '" data-role="mod">Mod</button>'
              +   '<button type="button" class="action-btn" data-set-role="' + esc(p.id) + '" data-role="player">Player</button>'
              + '</div></div>';
          }).join("")
        : '<p class="meta">No known profiles yet — friends, occupants, and remembered players appear here.</p>';
      rolePanel = '<div class="panel"><h2>Roles (local)</h2>'
        + '<p class="meta">Promote or demote known players on this browser only. Mods can be set by admins.</p>'
        + rows + '</div>';
    }
    return '<section class="page me-page account-page">' + meSubnav()
      + '<div class="panel">'
      +   '<h2>Account</h2>'
      +   '<div class="account-grid">'
      +     '<div><span class="k">Permaname</span><span class="v">' + esc(sid) + '</span></div>'
      +     '<div><span class="k">Display name</span><span class="v">' + esc(me.name) + '</span></div>'
      +     '<div><span class="k">Role</span><span class="v">' + esc(roleLabel) + " " + roleBadgeHtml(myRole) + '</span></div>'
      +     '<div><span class="k">Member since</span><span class="v">' + esc(member) + '</span></div>'
      +     '<div><span class="k">Email</span><span class="v">'
      +       '<input type="email" disabled placeholder="Not set on Pages" value="' + esc(emailNote) + '" title="Local-only placeholder — email is not required on GitHub Pages" />'
      +       '<span class="meta"> Local-only note. Not synced.</span></span></div>'
      +   '</div>'
      +   '<p class="meta">Password changes are managed by register / login — not required on this chrome.</p>'
      +   '<p class="meta">Browser look: <button type="button" class="text-btn" data-me="themes">Themes</button> (CSS presets on this device). Group world themes live on group pages for managers.</p>'
      +   '<button type="button" class="action-btn" disabled title="Not available on Pages">Delete account — not available on Pages</button>'
      + '</div>'
      + rolePanel
      + '</section>';
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
    wall = wall.filter(function (w) { return !w.fromId || !isBlocked(w.fromId); });
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
      +       '<div class="cp-name-row"><span class="cp-name">' + esc(name) + '</span>' + roleBadgeHtml(getRole(id)) + '<span class="level-badge">Level 1</span></div>'
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


  var galleryViewId = null;

  function meBlocklist() {
    var list = loadBlocklist();
    var rows = list.length
      ? list.map(function (b) {
          return '<div class="block-row">'
            + '<div><b>' + esc(b.name || b.id) + '</b><div class="meta">permaname ' + esc(b.id) + '</div></div>'
            + '<button type="button" class="action-btn" data-unblock="' + esc(b.id) + '">Remove</button>'
            + '</div>';
        }).join("")
      : '<p class="meta">Your blocklist is empty. Blocked players stay out of friends search results and cannot leave wall comments here.</p>';
    return '<section class="page me-page">' + meSubnav()
      + '<div class="panel"><h2>My Blocklist</h2>'
      + '<p class="meta">Stored locally as <code>whirled2.blocklist</code>. Add by permaname / id — no invented players.</p>'
      + '<form id="blocklist-add-form" class="blocklist-add-form">'
      +   '<input name="id" maxlength="40" placeholder="Permaname or id" required />'
      +   '<input name="name" maxlength="40" placeholder="Display name (optional)" />'
      +   '<button type="submit">Add to blocklist</button>'
      + '</form>'
      + '<div class="block-list">' + rows + '</div>'
      + '</div></section>';
  }

  function meGalleries() {
    var galleries = loadGalleries();
    if (galleryViewId) {
      var g = findGallery(galleryViewId);
      if (!g) {
        galleryViewId = null;
      } else {
        var imgs = (g.images || []);
        var grid = imgs.length
          ? '<div class="gallery-grid">' + imgs.map(function (im) {
              var thumb = im.thumb
                ? '<img src="' + im.thumb + '" alt="' + esc(im.name || "") + '" />'
                : '<div class="swatch"></div>';
              return '<div class="gallery-cell">' + thumb
                + '<div class="meta">' + esc(im.name || "image") + '</div>'
                + '<button type="button" class="text-btn" data-gallery-remove-img="' + esc(im.id) + '" data-gallery-id="' + esc(g.id) + '">Remove</button>'
                + '</div>';
            }).join("") + '</div>'
          : '<p class="meta">This gallery is empty. Add images from your Stuff → Images below.</p>';
        var stuffImgs = loadStuff().filter(function (it) {
          return itemCat(it) === "images" && (it.ownerId === session().user.id || it.owned);
        });
        var already = {};
        imgs.forEach(function (im) { already[im.stuffId || im.id] = true; });
        var addOpts = stuffImgs.filter(function (it) { return !already[it.id]; }).map(function (it) {
          return '<option value="' + esc(it.id) + '">' + esc(it.name || it.id) + '</option>';
        }).join("");
        return '<section class="page me-page">' + meSubnav()
          + '<div class="panel"><div class="friends-head"><h2>' + esc(g.name) + '</h2>'
          +   '<button type="button" class="text-btn" data-gallery-back="1">← All galleries</button></div>'
          + grid
          + '<form id="gallery-add-img-form" data-gallery-id="' + esc(g.id) + '" class="gallery-add-form">'
          +   '<label>Add from Stuff Images <select name="stuffId" required><option value="">— pick an image —</option>' + (addOpts || '<option value="" disabled>No images in Stuff yet</option>') + '</select></label>'
          +   '<button type="submit"' + (addOpts ? "" : " disabled") + '>Add image</button>'
          + '</form>'
          + '<p class="meta">Galleries are local (<code>whirled2.galleries</code>). Upload images under Stuff → Images first.</p>'
          + '</div></section>';
      }
    }
    var listHtml = galleries.length
      ? '<div class="gallery-list">' + galleries.map(function (g) {
          var n = (g.images || []).length;
          return '<div class="gallery-row">'
            + '<button type="button" class="text-btn" data-gallery-open="' + esc(g.id) + '"><b>' + esc(g.name) + '</b></button>'
            + '<span class="meta">' + n + ' image' + (n === 1 ? "" : "s") + '</span>'
            + '<button type="button" class="action-btn" data-gallery-delete="' + esc(g.id) + '">Delete</button>'
            + '</div>';
        }).join("") + '</div>'
      : '<p class="meta">No galleries yet. Create one below — empty authentic list from <code>whirled2.galleries</code>.</p>';
    return '<section class="page me-page">' + meSubnav()
      + '<div class="panel"><h2>My Galleries</h2>'
      + listHtml
      + '<form id="gallery-create-form" class="gallery-create-form">'
      +   '<input name="name" maxlength="60" placeholder="Gallery name" required />'
      +   '<button type="submit">Create gallery</button>'
      + '</form>'
      + '</div></section>';
  }

  function meTransactions() {
    var rows = loadTransactions();
    var list = rows.length
      ? rows.map(function (tx) {
          return '<div class="tx-row">'
            + '<div><b>' + esc(tx.kind || "event") + '</b> — ' + esc(tx.label || "")
            + (tx.coins ? (' <span class="meta">(' + esc(String(tx.coins)) + ' coins label)</span>') : '')
            + '<div class="meta">' + esc(tx.note || "Coins are labels only — no real currency.") + '</div></div>'
            + '<time class="meta">' + esc((tx.at || "").slice(0, 16).replace("T", " ")) + '</time>'
            + '</div>';
        }).join("")
      : '<p class="meta">No transactions yet. Listing a shop item or uploading Stuff appends a label-only ledger row.</p>';
    return '<section class="page me-page">' + meSubnav()
      + '<div class="panel"><h2>My Transactions</h2>'
      + '<p class="meta">Stub ledger in <code>whirled2.transactions</code>. <b>Coins are labels only — no real currency / no payments.</b></p>'
      + '<div class="tx-list">' + list + '</div>'
      + '</div></section>';
  }

  function meContests() {
    return '<section class="page me-page">' + meSubnav()
      + '<div class="panel"><h2>Contests</h2>'
      + '<p class="meta">None running.</p>'
      + '<p class="meta">Classic contest boards return when community events are wired — this page stays empty rather than inventing winners.</p>'
      + '</div></section>';
  }


  // ---------------------------------------------------------------------------
  // Club / Membership — Coming Soon (no payments; local notify stub only)
  // ---------------------------------------------------------------------------
  // How this works: Me → Themes previews CSS variable presets via #app[data-theme].
  // Premium cards are Coming Soon labels only — no payments.
  function meThemes() {
    var cur = loadBrowserTheme();
    function card(id, premium) {
      var t = id ? BROWSER_THEMES[id] : null;
      if (premium) {
        return '<div class="theme-card is-premium">'
          + '<div class="theme-swatch theme-swatch-premium" aria-hidden="true"></div>'
          + '<h3>' + esc(premium.label) + '</h3>'
          + '<p class="meta">' + esc(premium.blurb) + '</p>'
          + '<span class="club-badge-soon">Coming Soon</span>'
          + '<p class="meta">May be purchasable later — labels only, no checkout today.</p>'
          + '</div>';
      }
      var on = cur === id;
      return '<div class="theme-card' + (on ? " is-on" : "") + '">'
        + '<div class="theme-swatch theme-swatch-' + esc(id) + '" aria-hidden="true"></div>'
        + '<h3>' + esc(t.label) + '</h3>'
        + '<p class="meta">' + esc(t.blurb) + '</p>'
        + '<button type="button" class="action-btn" data-browser-theme="' + esc(id) + '">'
        + (on ? "Selected" : "Preview") + '</button></div>';
    }
    return '<section class="page me-page themes-page">' + meSubnav()
      + '<div class="panel"><h2>Browser themes</h2>'
      + '<p class="meta">Reskin the chrome on <b>this browser</b> with CSS presets (saved as <code>whirled2.browserTheme</code>). Soft visual polish only — does not change the engine.</p>'
      + '<div class="theme-grid">'
      +   card("classic") + card("night") + card("soft")
      +   card(null, { label: "Aurora Club", blurb: "Premium accent pack inspired by Club flair." })
      +   card(null, { label: "Neon Arcade", blurb: "High-contrast play chrome — maybe later." })
      + '</div></div>'
      + '<div class="panel"><h2>Group world themes</h2>'
      + '<p class="meta">Classic themed Whirleds let group managers reskin the top bar (hex + images), mark allowed items, and mark rooms. See wiki Whirleds FAQ. In Whirled2 that editor is <b>Coming Soon</b> — a tiny local hex draft lives on each group page for managers (prototype only, no payments).</p>'
      + '<button type="button" class="text-btn" data-tab="groups">Browse Groups</button>'
      + '</div></section>';
  }

  function meClub() {
    var sid = session() && session().user ? session().user.id : "guest";
    var note = "";
    try { note = localStorage.getItem("whirled2.clubNotify." + sid) || ""; } catch (e) {}
    var interested = false;
    try { interested = localStorage.getItem("whirled2.clubInterested." + sid) === "1"; } catch (e2) {}
    return '<section class="page me-page club-page">' + meSubnav()
      + '<div class="panel club-hero">'
      +   '<div class="club-badge-soon">Coming Soon</div>'
      +   '<h2>Club / Membership</h2>'
      +   '<p>Club Whirled–style membership for <b>Whirled2</b> is on the way. Nothing to buy today — this page is a preview of what membership <i>may</i> include.</p>'
      + '</div>'
      + '<div class="panel">'
      +   '<h2>What membership may include</h2>'
      +   '<p class="meta">Inspired by classic Club Whirled perks. All items are <b>may / subject to change</b> — prototypes only.</p>'
      +   '<ul class="club-may-list">'
      +     '<li>Extra rooms or room slots beyond the free home loft</li>'
      +     '<li>Cosmetic flair (badges, name accents, room themes) — labels &amp; visuals, not pay-to-win</li>'
      +     '<li>Supporter recognition in-profile (Club member mark)</li>'
      +     '<li>Early access to selected chrome or decorate toys</li>'
      +     '<li>Occasional member-only events or contests</li>'
      +   '</ul>'
      +   '<p class="meta">Coins and bars remain <b>labels only</b>. There are <b>no live payments</b> and no purchase buttons that charge money on this mock.</p>'
      + '</div>'
      + '<div class="panel club-disclaimer">'
      +   '<h2>Disclaimer</h2>'
      +   '<p><b>Whirled2</b> is <b>not affiliated</b> with Three Rings Design, the operators of whirled.club, or any official Whirled commercial entity. We do not claim to be official whirled.club.</p>'
      +   '<p>Whirled2 is a same-game-spirit revival on a <b>new engine</b>, informed by public research, community docs, and the open-source <a href="https://github.com/greyhavens/msoy" target="_blank" rel="noopener">greyhavens/msoy</a> reference (BSD) — not a Flash/msoy port and not a private-engine dump.</p>'
      +   '<p>Features you see here are <b>prototypes</b>. Items, pages, and perks may appear or disappear before any launch. <b>Nothing is final.</b></p>'
      +   '<p class="meta">Full IP / upload rules: <button type="button" class="text-btn" data-legal-open="1">Legal / Disclaimer</button>. Coins stay labels only — no payments.</p>'
      + '</div>'
      + '<div class="panel">'
      +   '<h2>Notify me</h2>'
      +   '<p class="meta">Optional local stub — no real mailing list. We can also just announce in-game later.</p>'
      +   '<form id="club-notify-form" class="club-notify-form">'
      +     '<label>Email (optional, stored only in this browser)'
      +       '<input type="email" name="email" maxlength="120" placeholder="you@example.com" value="' + esc(note) + '" /></label>'
      +     '<label class="check-row"><input type="checkbox" name="interested"' + (interested ? " checked" : "") + ' /> Keep me posted (local flag)</label>'
      +     '<button type="submit" class="action-btn">Save interest</button>'
      +     '<p class="meta" id="club-notify-msg">' + (interested ? "You are marked interested on this browser." : "We will announce Club membership in Whirled2 when ready.") + '</p>'
      +   '</form>'
      +   '<p class="meta">No checkout. No cards. Coins stay labels.</p>'
      + '</div></section>';
  }

  function meShare() {
    var url = shareInviteUrl();
    return '<section class="page me-page">' + meSubnav()
      + '<div class="panel"><h2>Share Whirled</h2>'
      + '<p class="meta">Copy the Pages URL and invite a friend. Coins stay labels only.</p>'
      + '<label class="invite-link-label">Pages URL'
      +   '<input id="share-whirled-url" readonly value="' + esc(url) + '" />'
      + '</label>'
      + '<div class="invite-them-actions">'
      +   '<button type="button" class="action-btn" data-share-copy="1">Copy URL</button>'
      + '</div>'
      + '<p class="meta" id="share-copy-msg"></p>'
      + '</div></section>';
  }

  function mePage() {
    if (viewingId && session() && viewingId !== session().user.id) {
      if (isBlocked(viewingId)) {
        return '<section class="page me-page">' + meSubnav()
          + '<div class="panel"><h2>Blocked</h2><p class="meta">This player is on your blocklist. Remove them from My Blocklist to view their profile.</p>'
          + '<button type="button" class="text-btn" data-me="blocklist">My Blocklist</button></div></section>';
      }
      return otherProfile(viewingId);
    }
    if (viewingId && session() && viewingId === session().user.id) { meSub = "profile"; viewingId = null; }
    if (meSub === "friends") return meFriends();
    if (meSub === "mail") return meMail(window.__mailCompose || null);
    if (meSub === "passport") return mePassport();
    if (meSub === "account") return meAccount();
    if (meSub === "profile") return meProfile();
    if (meSub === "blocklist") return meBlocklist();
    if (meSub === "galleries") return meGalleries();
    if (meSub === "transactions") return meTransactions();
    if (meSub === "contests") return meContests();
    if (meSub === "share") return meShare();
    if (meSub === "themes") return meThemes();
    if (meSub === "club") return meClub();
    return meHome();
  }



  // ---------------------------------------------------------------------------
  // Gate (logged out) + Shell (logged in chrome) + paint(tab) redraw
  // How this works: paint("rooms"|"me"|...) replaces #main innerHTML from state.
  // ---------------------------------------------------------------------------
  function gate() {
    return ''
      + '<section class="gate"><div class="gate-card">'
      +   logoImg("gate-logo")
      +   '<p class="eyebrow">Whirled2</p>'
      +   '<h1>Welcome to Whirled2</h1>'
      +   '<p>Play games, make friends, make stuff — classic Whirled spirit, new engine — Whirled2.</p>'
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
      +   '<p class="gate-legal meta">By continuing you agree not to upload copyrighted material you do not own. '
      +     '<button type="button" class="text-btn" data-legal-open="1">Legal / Disclaimer</button></p>'
      + '</div></section>';
  }
  function shell() {
    var me = you();
    return ''
      + '<header class="topbar">'
      +   '<a class="brand" href="#rooms">' + logoImg("logo") + '<span class="sr-only">Whirled2</span></a>'
      +   '<nav class="tabs">' + [["me","Me"],["stuff","Stuff"],["games","Games"],["rooms","Rooms"],["groups","Groups"],["shop","Shop"]].map(function (t) {
            return '<button class="tab' + (t[0] === "rooms" ? " is-on" : "") + '" type="button" data-tab="' + t[0] + '">' + t[1] + '</button>';
          }).join("") + '</nav>'
      +   '<div class="who">'
      +     '<div class="row who-links">'
      +       '<button type="button" class="mail mail-btn" data-me="mail" title="Mail">&#9993; <u>(' + unreadCount() + ')</u></button>'
      +       '<b>' + esc(me.name) + '</b>'
      +       '<span class="sep">|</span>'
      +       '<button type="button" class="text-btn" data-me="club" title="Membership">Club</button>'
      +       '<span class="sep">|</span>'
      +       '<button type="button" class="text-btn" data-help-open="1">Help</button>'
      +       '<span class="sep">|</span>'
      +       '<button type="button" class="text-btn" data-legal-open="1">Legal</button>'
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
      +   '<div class="chat-opts-wrap">'
      +   '<button type="button" class="chat-opts" id="chat-opts-btn" title="Chat options" aria-label="Chat options" data-chat-opts="1">&#9679;</button>'
      +   '<div class="chat-opts-menu" id="chat-opts-menu" hidden></div>'
      +   '</div>'
      +   '<input id="chat-input" maxlength="240" placeholder="Type here to chat!" autocomplete="off" />'
      +   '<button class="send" type="submit">send</button>'
      +   '<span class="toolbar">'
      +     '<button type="button" class="tb tb-vol" title="Mute / unmute room music" aria-label="Volume" data-room-mute="1"></button>'
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
      +     '<button type="button" class="tb tb-party" title="Parties" aria-label="Parties" data-tb="party"></button>'
      +     '<span class="tb-go-wrap tb-room-wrap">'
      +       '<button type="button" class="tb tb-room" title="Room" aria-label="Room" data-tb="room"></button>'
      +       '<div class="go-menu room-menu" id="room-menu" hidden>'
      +         '<button type="button" data-room-menu="comment">Comment or rate</button>'
      +         '<button type="button" data-room-menu="decorate">Decorate Room</button>'
      +         '<button type="button" data-room-menu="playlist">View room playlist</button>'
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
      applyBrowserTheme();
      // How this works: Legal page is readable from the gate (logged out) too.
      if (legalOpen || tab === "legal") {
        legalOpen = true;
        document.getElementById("app").innerHTML = legalPage();
        document.getElementById("app").setAttribute("data-tab", "legal");
        try { window.__whirledBoot = true; } catch (e) {}
        return;
      }
      document.getElementById("app").innerHTML = gate();
      document.getElementById("app").setAttribute("data-tab", "gate");
      bindGate();
      try { window.__whirledBoot = true; } catch (e) {}
      return;
    }
    bootstrapRoles(); // ensure admin badges for test / first user before first paint
    if (!document.getElementById("main")) document.getElementById("app").innerHTML = shell();
    var tabAttr = tab || "rooms";
    if (tabAttr === "rooms" && !inRoom) tabAttr = "rooms-lobby";
    if (tabAttr === "rooms" && inRoom) tabAttr = "rooms";
    document.getElementById("app").setAttribute("data-tab", tabAttr);
    document.querySelectorAll(".tab").forEach(function (btn) { btn.classList.toggle("is-on", btn.getAttribute("data-tab") === tab); });
    var main = document.getElementById("main");
    if (!main) return;
    applyBrowserTheme();
    if (legalOpen || tab === "legal") { legalOpen = true; helpOpen = false; main.innerHTML = legalPage(); }
    else if (helpOpen || tab === "help") { helpOpen = true; legalOpen = false; main.innerHTML = helpPage(); }
    else if (tab === "rooms") main.innerHTML = rooms();
    else if (tab === "me") main.innerHTML = mePage();
    else if (tab === "stuff") main.innerHTML = stuffPage();
    else if (tab === "shop") main.innerHTML = shopPage();
    else if (tab === "games") main.innerHTML = gamesPage();
    else if (tab === "groups") main.innerHTML = groupsPage();
    else main.innerHTML = '<section class="page"><h1>Groups</h1><p class="meta">No groups yet. Shared whirleds come later.</p></section>';
    if (partyPanelOpen && !(tab === "rooms" && inRoom)) {
      var existingParty = document.getElementById("party-panel");
      if (!existingParty) {
        var wrap = document.createElement("div");
        wrap.innerHTML = partyPanel();
        document.body.appendChild(wrap.firstChild);
      }
    } else if (!partyPanelOpen) {
      var orphanParty = document.getElementById("party-panel");
      if (orphanParty && !document.querySelector(".workspace #party-panel")) orphanParty.remove();
    }
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
    try { if (decorateMode) bindDecorateDrag(); } catch (e) {}
    try { syncRoomAudio(); } catch (e) {}
  }
  function ensureStagePlaceholder() {
    var slot = document.getElementById("stage-slot");
    if (!slot) return;
    var hasEngine = !!(slot.querySelector("canvas") || slot.querySelector("[data-whirled-engine]"));
    if (hasEngine) return;
    if (slot.querySelector(".stage-copy")) return;
    slot.innerHTML = '<div class="stage-copy"><strong>Your room — engine mounts here</strong>Empty classic stage for now. Decorate with Room menu — click-to-walk arrives with the engine track.<code>#stage-slot</code></div>';
    var host = slot.parentElement;
    if (host && host.classList.contains("stage-host") && !document.getElementById("decorate-layer")) {
      host.insertAdjacentHTML("beforeend", decorateLayerHtml());
    }
  }
  // Information: refreshChatLog writes both #chat-log (slide) and #chat-overlay (overlay).
  function refreshChatLog() {
    var ui = loadChatUi();
    var html = chat.map(chatRow).join("");
    var body = document.querySelector(".stage-body");
    if (body) {
      body.classList.toggle("chat-mode-slide", ui.mode === "slide");
      body.classList.toggle("chat-mode-overlay", ui.mode === "overlay");
      body.classList.toggle("hide-history", !!ui.hideHistory);
      body.classList.remove("text-size-sm", "text-size-md", "text-size-lg");
      body.classList.add("text-size-" + (ui.textSize || "md"));
    }
    var log = document.getElementById("chat-log");
    if (log) {
      var nearBottom = (log.scrollHeight - log.scrollTop - log.clientHeight) < 48;
      var stick = !chatPinnedScroll || nearBottom;
      log.innerHTML = html;
      if (stick) log.scrollTop = log.scrollHeight;
    }
    var ov = document.getElementById("chat-overlay");
    if (ov) {
      var showOv = ui.mode === "overlay" && !ui.hideHistory && chat.length > 0;
      if (showOv) {
        ov.hidden = false;
        ov.classList.remove("is-empty");
        var nearB = (ov.scrollHeight - ov.scrollTop - ov.clientHeight) < 48;
        var stickO = !chatPinnedScroll || nearB;
        ov.innerHTML = html;
        if (stickO) ov.scrollTop = ov.scrollHeight;
      } else {
        ov.hidden = true;
        ov.classList.add("is-empty");
        ov.innerHTML = "";
      }
    }
    applyChatBarVisibility();
  }
  function applyChatBarVisibility() {
    var app = document.getElementById("app");
    var tab = app && app.getAttribute("data-tab");
    var show = !!(session() && tab === "rooms" && inRoom);
    var bar = document.getElementById("chat-form");
    if (bar) bar.style.display = show ? "" : "none";
    var menu = document.getElementById("chat-opts-menu");
    if (menu && !show) { menu.hidden = true; chatOptsOpen = false; }
  }
  function pushSystemChat(text) {
    chat.push({ id: "sys" + Date.now(), system: true, text: text, at: new Date().toISOString() });
    if (chat.length > 120) chat = chat.slice(-100);
    refreshChatLog();
  }
  function clearRoomChatDisplay(clearStorage) {
    chat = [];
    refreshChatLog();
    if (clearStorage) {
      try { localStorage.removeItem("whirled2.chat.loft"); } catch (e) {}
    }
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
  var _decDrag = null;
  function bindDecorateDrag() {
    var layer = document.getElementById("decorate-layer");
    if (!layer || layer._decBound) return;
    layer._decBound = true;
    layer.addEventListener("pointerdown", function (ev) {
      if (!decorateMode) return;
      if (ev.target.closest("[data-dec-remove]")) return;
      var chip = ev.target.closest(".decorate-chip");
      if (!chip) return;
      ev.preventDefault();
      var id = chip.getAttribute("data-dec-id");
      var rect = layer.getBoundingClientRect();
      _decDrag = {
        id: id,
        chip: chip,
        ox: ev.clientX - chip.offsetLeft,
        oy: ev.clientY - chip.offsetTop,
        layer: layer,
        rect: rect
      };
      try { chip.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    layer.addEventListener("pointermove", function (ev) {
      if (!_decDrag) return;
      var x = ev.clientX - _decDrag.ox;
      var y = ev.clientY - _decDrag.oy;
      var maxX = Math.max(0, _decDrag.layer.clientWidth - 56);
      var maxY = Math.max(0, _decDrag.layer.clientHeight - 56);
      x = Math.max(0, Math.min(maxX, x));
      y = Math.max(0, Math.min(maxY, y));
      _decDrag.chip.style.left = x + "px";
      _decDrag.chip.style.top = y + "px";
    });
    function endDrag() {
      if (!_decDrag) return;
      var id = _decDrag.id;
      var x = parseFloat(_decDrag.chip.style.left) || 0;
      var y = parseFloat(_decDrag.chip.style.top) || 0;
      var layout = loadRoomLayout();
      for (var i = 0; i < layout.items.length; i++) {
        if (layout.items[i].id === id) {
          layout.items[i].x = x;
          layout.items[i].y = y;
          break;
        }
      }
      saveRoomLayout(layout);
      _decDrag = null;
    }
    layer.addEventListener("pointerup", endDrag);
    layer.addEventListener("pointercancel", endDrag);
  }
  // ---------------------------------------------------------------------------
  // WhirledChrome bridge — engine mounts only via getStageEl() → #stage-slot
  // ---------------------------------------------------------------------------
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
  // ---------------------------------------------------------------------------
  // Chat send / options / name menu / history poll
  // Soft rate-limit: >5 messages in 3s → system "You're being too chatty…"
  // ---------------------------------------------------------------------------
  async function pushChat(text) {
    text = String(text || "").trim();
    if (!text) return;
    if (/^\/clear$/i.test(text)) {
      clearRoomChatDisplay(false);
      return;
    }
    var now = Date.now();
    chatSendTimes = chatSendTimes.filter(function (t) { return now - t < 3000; });
    if (chatSendTimes.length >= 5) {
      pushSystemChat("You're being too chatty…");
      return;
    }
    chatSendTimes.push(now);
    var emote = false;
    var sendText = text;
    if (/^\/me\s+/i.test(text) || /^\/emote\s+/i.test(text)) {
      emote = true;
      sendText = text; // keep prefix so history shows; chatRow detects
    }
    var result = await window.WhirledApi.postChat("loft", sendText);
    var msg = result.message || result;
    if (emote) msg.emote = true;
    if (!chat.some(function (m) { return m.id === msg.id; })) chat.push(msg);
    refreshChatLog();
    listeners.chat.forEach(function (fn) { try { fn(msg); } catch (e) {} });
  }
  function renderChatOptsMenu() {
    var menu = document.getElementById("chat-opts-menu");
    if (!menu) return;
    var ui = loadChatUi();
    menu.innerHTML = ''
      + '<div class="chat-opts-title">Chat options</div>'
      + '<label class="chat-opts-row" data-chat-mode="overlay"><input type="radio" name="chat-mode" value="overlay"' + (ui.mode === "overlay" ? " checked" : "") + ' /> Overlay chat</label>'
      + '<label class="chat-opts-row" data-chat-mode="slide"><input type="radio" name="chat-mode" value="slide"' + (ui.mode === "slide" ? " checked" : "") + ' /> Slide chat</label>'
      + '<label class="chat-opts-row' + (ui.mode !== "overlay" ? " is-disabled" : "") + '" data-chat-hide-row="1"><input type="checkbox" data-chat-hide="1"' + (ui.hideHistory ? " checked" : "") + (ui.mode !== "overlay" ? " disabled" : "") + ' /> Hide chat history <span class="meta">(F9)</span></label>'
      + '<div class="chat-opts-title">Text size</div>'
      + '<div class="chat-opts-sizes">'
      +   '<button type="button" class="action-btn' + (ui.textSize === "sm" ? " is-on" : "") + '" data-chat-size="sm">S</button>'
      +   '<button type="button" class="action-btn' + (ui.textSize === "md" ? " is-on" : "") + '" data-chat-size="md">M</button>'
      +   '<button type="button" class="action-btn' + (ui.textSize === "lg" ? " is-on" : "") + '" data-chat-size="lg">L</button>'
      + '</div>'
      + '<button type="button" class="action-btn chat-opts-clear" data-chat-clear="1">Clear room chat</button>';
  }
  function openChatNameMenu(id, name, x, y) {
    var existing = document.getElementById("chat-name-menu");
    if (existing) existing.remove();
    chatNameMenu = { id: id, name: name };
    var menu = document.createElement("div");
    menu.id = "chat-name-menu";
    menu.className = "chat-name-menu";
    menu.style.left = Math.max(8, Math.min(window.innerWidth - 180, x)) + "px";
    menu.style.top = Math.max(8, Math.min(window.innerHeight - 160, y)) + "px";
    var sid = session() && session().user ? session().user.id : "";
    var self = sid && id && sid === id;
    menu.innerHTML = ''
      + '<button type="button" data-profile="' + esc(id) + '">View profile</button>'
      + (self ? '' : '<button type="button" data-add-friend="' + esc(id) + '" data-friend-name="' + esc(name) + '">Add friend</button>')
      + (self ? '' : '<button type="button" data-mail-to="' + esc(id) + '" data-mail-name="' + esc(name) + '">Send mail</button>')
      + (self ? '' : '<button type="button" data-block-chat="' + esc(id) + '" data-block-name="' + esc(name) + '">Block</button>');
    document.body.appendChild(menu);
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
    var leave = '<button type="button" class="text-btn leave-room" data-leave-room="1">Back to Rooms</button>';
    rail.innerHTML = "<h2>In this room</h2>" + occLegend()
      + (here.length ? here.map(personRow).join("") : '<p class="sub" style="padding:8px 10px">Nobody here yet.</p>')
      + leave;
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
  // ---------------------------------------------------------------------------
  // Boot + presence / chat polling timers
  // ---------------------------------------------------------------------------
  function boot() {
    applyBrowserTheme();
    if (session()) stripStuckPokeNotices();
    paint(session() ? "rooms" : "");
    if (session()) { loadHistory(); startPoll(); startOccPoll(); ensureNoticeBar(); }
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
  // ---------------------------------------------------------------------------
  // Event delegation: one click listener + one submit listener on #app
  // Information: buttons use data-* attributes (data-tab, data-me, data-profile-edit, …).
  // ---------------------------------------------------------------------------
  app.addEventListener("click", function (ev) {
    if (!ev.target.closest(".tb-go-wrap")) {
      var gm0 = document.getElementById("go-menu");
      if (gm0 && !gm0.hidden) { gm0.hidden = true; goMenuOpen = false; }
      var rm0 = document.getElementById("room-menu");
      if (rm0 && !rm0.hidden) { rm0.hidden = true; roomMenuOpen = false; }
    }
    // Chat options + name menu
    var chatOptsBtn = ev.target.closest("[data-chat-opts]");
    if (chatOptsBtn) {
      ev.preventDefault();
      chatOptsOpen = !chatOptsOpen;
      var com = document.getElementById("chat-opts-menu");
      if (com) {
        if (chatOptsOpen) { renderChatOptsMenu(); com.hidden = false; }
        else com.hidden = true;
      }
      return;
    }
    if (ev.target.closest("[data-chat-mode]")) {
      var modeEl = ev.target.closest("[data-chat-mode]");
      var uiM = loadChatUi();
      uiM.mode = modeEl.getAttribute("data-chat-mode") === "slide" ? "slide" : "overlay";
      if (uiM.mode !== "overlay") uiM.hideHistory = false;
      saveChatUi(uiM);
      renderChatOptsMenu();
      refreshChatLog();
      return;
    }
    if (ev.target.closest("[data-chat-hide-row]") || ev.target.closest("[data-chat-hide]")) {
      var rowH = ev.target.closest("[data-chat-hide-row]") || ev.target.closest("[data-chat-hide]");
      var box = rowH.querySelector ? rowH.querySelector("[data-chat-hide]") : rowH;
      if (!box || box.disabled) return;
      var uiH = loadChatUi();
      // label click already toggled native checkbox; read after toggle
      setTimeout(function () {
        uiH.hideHistory = !!box.checked;
        saveChatUi(uiH);
        refreshChatLog();
        renderChatOptsMenu();
        var comH = document.getElementById("chat-opts-menu");
        if (comH) comH.hidden = false;
        chatOptsOpen = true;
      }, 0);
      return;
    }
    if (ev.target.closest("[data-chat-size]")) {
      var uiS = loadChatUi();
      uiS.textSize = ev.target.closest("[data-chat-size]").getAttribute("data-chat-size") || "md";
      saveChatUi(uiS);
      renderChatOptsMenu();
      refreshChatLog();
      return;
    }
    if (ev.target.closest("[data-chat-clear]")) {
      if (confirm("Clear room chat display? Also clear saved local history?")) {
        clearRoomChatDisplay(true);
      } else if (confirm("Clear display only (keep saved history)?")) {
        clearRoomChatDisplay(false);
      }
      chatOptsOpen = false;
      var com2 = document.getElementById("chat-opts-menu");
      if (com2) com2.hidden = true;
      return;
    }
    var chatWho = ev.target.closest("[data-chat-who]");
    if (chatWho) {
      ev.preventDefault();
      openChatNameMenu(
        chatWho.getAttribute("data-chat-who") || "",
        chatWho.getAttribute("data-chat-who-name") || "",
        ev.clientX,
        ev.clientY
      );
      return;
    }
    if (ev.target.closest("[data-block-chat]")) {
      var blk = ev.target.closest("[data-block-chat]");
      addBlocked({ id: blk.getAttribute("data-block-chat"), name: blk.getAttribute("data-block-name") });
      var cnm0 = document.getElementById("chat-name-menu");
      if (cnm0) cnm0.remove();
      chatNameMenu = null;
      pushNotice("status", "Blocked " + (blk.getAttribute("data-block-name") || "player") + ".");
      return;
    }
    if (ev.target.closest("[data-set-role]") && session() && getRole(session().user.id) === "admin") {
      var sr = ev.target.closest("[data-set-role]");
      setRole(sr.getAttribute("data-set-role"), sr.getAttribute("data-role"));
      paint("me");
      return;
    }
    if (!ev.target.closest("#chat-opts-menu") && !ev.target.closest("#chat-opts-btn")) {
      var com3 = document.getElementById("chat-opts-menu");
      if (com3 && !com3.hidden) { com3.hidden = true; chatOptsOpen = false; }
    }
    if (!ev.target.closest("#chat-name-menu") && !ev.target.closest("[data-chat-who]")) {
      var cnm1 = document.getElementById("chat-name-menu");
      if (cnm1) { cnm1.remove(); chatNameMenu = null; }
    }

    if (ev.target.id === "logout-btn") {
      window.WhirledApi.logout();
      chat = []; liveOccupants = []; inRoom = false; viewingId = null; meSub = "home";
      shopItemId = null; groupViewId = null; groupThreadId = null; roomPanelOpen = false; roomMenuOpen = false;
      gamesMode = "browse"; gameViewId = null; gameDetailTab = "play"; gameGenre = "all"; friendSearchQ = "";
      decorateMode = false; partyPanelOpen = false; playlistPanelOpen = false; helpOpen = false; legalOpen = false; galleryViewId = null; stuffListMode = false;
      clearStrayUI();
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
      decorateMode = false;
      roomPanelOpen = false;
      playlistPanelOpen = false;
      paint("rooms");
      return;
    }
    var roomsLobbyBtn = ev.target.closest("[data-rooms-lobby]");
    if (roomsLobbyBtn && session()) {
      inRoom = false;
      decorateMode = false;
      roomPanelOpen = false;
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
      if (kind === "party") {
        var gmenuP = document.getElementById("go-menu");
        var rmenuP = document.getElementById("room-menu");
        if (gmenuP) { gmenuP.hidden = true; goMenuOpen = false; }
        if (rmenuP) { rmenuP.hidden = true; roomMenuOpen = false; }
        partyPanelOpen = !partyPanelOpen;
        if (inRoom) paint("rooms");
        else {
          var cur = document.querySelector(".tab.is-on");
          paint(cur ? cur.getAttribute("data-tab") : "rooms");
        }
        return;
      }
    }
    var occBtn = ev.target.closest("[data-occ-menu]");
    if (occBtn && session() && !ev.target.closest(".occ-menu")) {
      var oid = occBtn.getAttribute("data-occ-menu") || "";
      occMenuId = (occMenuId === oid) ? null : oid;
      if (document.querySelector(".workspace")) refreshOccupantRail();
      else paint(document.querySelector(".tab.is-on") ? document.querySelector(".tab.is-on").getAttribute("data-tab") : "rooms");
      return;
    }
    if (ev.target.closest("[data-buddy-cancel]")) {
      friendInvitePending = null;
      var modal = document.getElementById("buddy-invite-modal");
      if (modal) modal.remove();
      else paint(document.querySelector(".tab.is-on") ? document.querySelector(".tab.is-on").getAttribute("data-tab") : "rooms");
      return;
    }
    var invBuddy = ev.target.closest("[data-invite-buddy]");
    if (invBuddy && session()) {
      friendInvitePending = {
        id: invBuddy.getAttribute("data-invite-buddy"),
        name: invBuddy.getAttribute("data-friend-name") || invBuddy.getAttribute("data-invite-buddy")
      };
      occMenuId = null;
      if (document.querySelector(".workspace")) {
        refreshOccupantRail();
        if (!document.getElementById("buddy-invite-modal")) {
          var wrap = document.createElement("div");
          wrap.innerHTML = friendInvitePopup();
          document.getElementById("app").appendChild(wrap.firstChild);
        }
      } else paint("me");
      return;
    }
    if (ev.target.closest("[data-invite-open]") && session()) {
      invitePanelOpen = true;
      meSub = "friends";
      viewingId = null;
      paint("me");
      return;
    }
    if (ev.target.closest("[data-invite-close]") && session()) {
      invitePanelOpen = false;
      meSub = "friends";
      paint("me");
      return;
    }
    if (ev.target.closest("[data-invite-copy]") && session()) {
      var inp = document.getElementById("invite-share-url");
      var msg = document.getElementById("invite-copy-msg");
      var val = inp ? inp.value : shareInviteUrl();
      function copied() { if (msg) msg.textContent = "Link copied."; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(copied).catch(function () {
          if (inp) { inp.select(); try { document.execCommand("copy"); copied(); } catch (e) { if (msg) msg.textContent = val; } }
        });
      } else if (inp) {
        inp.select();
        try { document.execCommand("copy"); copied(); } catch (e) { if (msg) msg.textContent = val; }
      }
      return;
    }
    var stuffModeBtn = ev.target.closest("[data-stuff-mode]");
    if (stuffModeBtn && session()) {
      stuffMode = stuffModeBtn.getAttribute("data-stuff-mode") || "browse";
      if (stuffMode === "browse") { stuffItemId = null; stuffListMode = false; }
      if (stuffMode === "upload") { stuffItemId = null; stuffListMode = false; }
      paint("stuff");
      return;
    }
    var stuffItemBtn = ev.target.closest("[data-stuff-item]");
    if (stuffItemBtn && session() && !ev.target.closest("form")) {
      stuffItemId = stuffItemBtn.getAttribute("data-stuff-item") || null;
      stuffMode = "detail";
      stuffListMode = false;
      paint("stuff");
      return;
    }
    var stuffEditOpen = ev.target.closest("[data-stuff-edit-open]");
    if (stuffEditOpen && session()) {
      stuffItemId = stuffEditOpen.getAttribute("data-stuff-edit-open");
      stuffMode = "edit";
      paint("stuff");
      return;
    }
    var stuffDel = ev.target.closest("[data-stuff-delete]");
    if (stuffDel && session()) {
      var delId = stuffDel.getAttribute("data-stuff-delete");
      if (delId && confirm("Delete this item from your Stuff?")) {
        saveStuff(loadStuff().filter(function (it) { return it.id !== delId; }));
        // also delist if listed
        saveShop(loadShop().filter(function (it) { return it.sourceStuffId !== delId && it.stuffId !== delId; }));
        stuffItemId = null;
        stuffMode = "browse";
        stuffListMode = false;
        pushNotice("gray", "Item deleted from Stuff.");
        paint("stuff");
      }
      return;
    }
    if (ev.target.closest("[data-stuff-list-open]") && session()) {
      stuffListMode = true;
      stuffMode = "detail";
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-stuff-list-cancel]") && session()) {
      stuffListMode = false;
      paint("stuff");
      return;
    }
    var stuffDelist = ev.target.closest("[data-stuff-delist]");
    if (stuffDelist && session()) {
      var dsid = stuffDelist.getAttribute("data-stuff-delist");
      saveShop(loadShop().filter(function (it) { return it.sourceStuffId !== dsid && it.stuffId !== dsid; }));
      pushNotice("gray", "Listing removed from Shop.");
      stuffListMode = false;
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-help-open]") && session()) {
      helpOpen = true;
      legalOpen = false;
      partyPanelOpen = false;
      paint("help");
      return;
    }
    if (ev.target.closest("[data-help-close]") && session()) {
      helpOpen = false;
      paint("rooms");
      return;
    }
    // Legal works logged-in or from the gate.
    if (ev.target.closest("[data-legal-open]")) {
      legalOpen = true;
      helpOpen = false;
      partyPanelOpen = false;
      paint("legal");
      return;
    }
    if (ev.target.closest("[data-legal-close]")) {
      legalOpen = false;
      if (session()) paint("rooms");
      else paint("");
      return;
    }
    if (ev.target.closest("[data-browser-theme]") && session()) {
      saveBrowserTheme(ev.target.closest("[data-browser-theme]").getAttribute("data-browser-theme"));
      meSub = "themes";
      paint("me");
      return;
    }
    if (ev.target.closest("[data-decorate-close]") && session()) {
      decorateMode = false;
      paint("rooms");
      return;
    }
    if (ev.target.closest("[data-party-close]") && session()) {
      partyPanelOpen = false;
      var ppx = document.getElementById("party-panel");
      if (ppx && !document.querySelector(".workspace #party-panel")) ppx.remove();
      if (inRoom) paint("rooms");
      else {
        var curP = document.querySelector(".tab.is-on");
        paint(curP ? curP.getAttribute("data-tab") : "rooms");
      }
      return;
    }
    var decAdd = ev.target.closest("[data-dec-add]");
    if (decAdd && session()) {
      var sidAdd = decAdd.getAttribute("data-dec-add");
      var stuffAdd = findStuff(sidAdd);
      if (!stuffAdd) return;
      var layoutAdd = loadRoomLayout();
      var nidDec = "dec" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      layoutAdd.items.push({
        id: nidDec,
        stuffId: stuffAdd.id,
        name: stuffAdd.name,
        thumb: stuffAdd.thumb || "",
        kind: itemCat(stuffAdd),
        x: 40 + (layoutAdd.items.length % 6) * 56,
        y: 40 + Math.floor(layoutAdd.items.length / 6) * 56
      });
      saveRoomLayout(layoutAdd);
      decorateMode = true;
      paint("rooms");
      bindDecorateDrag();
      return;
    }
    var decRem = ev.target.closest("[data-dec-remove]");
    if (decRem && session()) {
      var rid = decRem.getAttribute("data-dec-remove");
      var layoutRem = loadRoomLayout();
      layoutRem.items = layoutRem.items.filter(function (it) { return it.id !== rid; });
      saveRoomLayout(layoutRem);
      paint("rooms");
      if (decorateMode) bindDecorateDrag();
      return;
    }
    if (ev.target.closest("[data-dec-save]") && session()) {
      // positions already written during drag; confirm persist
      saveRoomLayout(loadRoomLayout());
      pushNotice("green", "Room layout saved.", { transient: true });
      paint("rooms");
      if (decorateMode) bindDecorateDrag();
      return;
    }
    var partyJoin = ev.target.closest("[data-party-join]");
    if (partyJoin && session()) {
      var pjid = partyJoin.getAttribute("data-party-join");
      var plist = loadParties();
      for (var pi = 0; pi < plist.length; pi++) {
        if (plist[pi].id === pjid) {
          plist[pi].members = plist[pi].members || [];
          if (!plist[pi].members.some(function (m) { return m.id === session().user.id; })) {
            plist[pi].members.push({ id: session().user.id, name: session().user.name });
          }
          break;
        }
      }
      saveParties(plist);
      saveMyPartyId(pjid);
      var pj = findParty(pjid);
      pushNotice("blue", "Joined party “" + ((pj && pj.name) || "Party") + "”.");
      partyPanelOpen = true;
      if (inRoom) paint("rooms"); else paint(document.querySelector(".tab.is-on") ? document.querySelector(".tab.is-on").getAttribute("data-tab") : "rooms");
      renderNotices();
      return;
    }
    var partyLeave = ev.target.closest("[data-party-leave]");
    if (partyLeave && session()) {
      var plid = partyLeave.getAttribute("data-party-leave");
      var pl = loadParties();
      for (var pjx = 0; pjx < pl.length; pjx++) {
        if (pl[pjx].id === plid) {
          pl[pjx].members = (pl[pjx].members || []).filter(function (m) { return m.id !== session().user.id; });
        }
      }
      saveParties(pl);
      if (loadMyPartyId() === plid) saveMyPartyId("");
      pushNotice("gray", "Left party.");
      partyPanelOpen = true;
      if (inRoom) paint("rooms"); else paint(document.querySelector(".tab.is-on") ? document.querySelector(".tab.is-on").getAttribute("data-tab") : "rooms");
      renderNotices();
      return;
    }
    var prof = ev.target.closest("[data-profile]");
    if (prof && session()) {
      viewingId = prof.getAttribute("data-profile") || null;
      occMenuId = null;
      if (viewingId) {
        var pname0 = (prof.getAttribute("data-friend-name") || prof.textContent || "").trim() || viewingId;
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
      if (!pid || pid === session().user.id) return;
      addPoke(session().user.name, pid);
      pushNotice("orange", "You poked " + pname + ".", { transient: true });
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
      occMenuId = null;
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
        playlistPanelOpen = false;
        decorateMode = false;
        paint("rooms");
      } else if (rm === "comment") {
        if (!inRoom) { inRoom = true; }
        roomPanelOpen = true;
        playlistPanelOpen = false;
        paint("rooms");
        loadOccupants();
      } else if (rm === "decorate") {
        if (!inRoom) { inRoom = true; }
        decorateMode = true;
        roomPanelOpen = false;
        playlistPanelOpen = false;
        partyPanelOpen = false;
        paint("rooms");
        loadOccupants();
        bindDecorateDrag();
      } else if (rm === "playlist") {
        if (!inRoom) { inRoom = true; }
        playlistPanelOpen = true;
        roomPanelOpen = false;
        decorateMode = false;
        partyPanelOpen = false;
        paint("rooms");
        loadOccupants();
        syncRoomAudio();
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
    if (ev.target.closest("[data-playlist-close]") && session()) {
      playlistPanelOpen = false;
      paint("rooms");
      return;
    }
    // How this works: playlist controls — owner play/remove/next; mute; gesture unlock for autoplay.
    if (ev.target.closest("[data-music-gesture]") && session()) {
      musicGestureNeeded = false;
      syncRoomAudio();
      var gbtn = document.getElementById("music-gesture-btn");
      if (gbtn) gbtn.hidden = true;
      return;
    }
    if (ev.target.closest("[data-room-mute]") && session()) {
      roomAudioMuted = !roomAudioMuted;
      var aMute = document.getElementById("room-audio");
      if (aMute) aMute.muted = roomAudioMuted;
      if (playlistPanelOpen && inRoom) paint("rooms");
      return;
    }
    if (ev.target.closest("[data-playlist-next]") && session() && isLoftOwner()) {
      playlistNext(false);
      if (playlistPanelOpen) paint("rooms");
      else syncRoomAudio();
      return;
    }
    var plPlay = ev.target.closest("[data-playlist-play]");
    if (plPlay && session() && isLoftOwner()) {
      var pl = loadPlaylist();
      pl.currentIndex = Math.max(0, Number(plPlay.getAttribute("data-playlist-play")) || 0);
      savePlaylist(pl);
      paint("rooms");
      syncRoomAudio();
      return;
    }
    var plRem = ev.target.closest("[data-playlist-remove]");
    if (plRem && session() && isLoftOwner()) {
      var pl2 = loadPlaylist();
      var ri = Number(plRem.getAttribute("data-playlist-remove"));
      if (ri >= 0 && ri < pl2.tracks.length) {
        pl2.tracks.splice(ri, 1);
        if (pl2.currentIndex >= pl2.tracks.length) pl2.currentIndex = Math.max(0, pl2.tracks.length - 1);
        savePlaylist(pl2);
      }
      paint("rooms");
      syncRoomAudio();
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
      stuffMode = "browse";
      stuffItemId = null;
      paint("stuff");
      return;
    }
    var shopCatBtn = ev.target.closest("[data-shop-cat]");
    if (shopCatBtn && session()) {
      shopCat = shopCatBtn.getAttribute("data-shop-cat") || "avatars";
      paint("shop");
      return;
    }
    if (ev.target.closest("[data-share-copy]") && session()) {
      var sinp = document.getElementById("share-whirled-url");
      var smsg = document.getElementById("share-copy-msg");
      var sval = sinp ? sinp.value : shareInviteUrl();
      function scCopied() { if (smsg) smsg.textContent = "URL copied."; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(sval).then(scCopied).catch(function () {
          if (sinp) { sinp.select(); try { document.execCommand("copy"); scCopied(); } catch (e) { if (smsg) smsg.textContent = sval; } }
        });
      } else if (sinp) {
        sinp.select();
        try { document.execCommand("copy"); scCopied(); } catch (e) { if (smsg) smsg.textContent = sval; }
      }
      return;
    }
    var unblockBtn = ev.target.closest("[data-unblock]");
    if (unblockBtn && session()) {
      removeBlocked(unblockBtn.getAttribute("data-unblock"));
      meSub = "blocklist";
      paint("me");
      return;
    }
    var galOpen = ev.target.closest("[data-gallery-open]");
    if (galOpen && session()) {
      galleryViewId = galOpen.getAttribute("data-gallery-open");
      meSub = "galleries";
      paint("me");
      return;
    }
    if (ev.target.closest("[data-gallery-back]") && session()) {
      galleryViewId = null;
      meSub = "galleries";
      paint("me");
      return;
    }
    var galDel = ev.target.closest("[data-gallery-delete]");
    if (galDel && session()) {
      var gdel = galDel.getAttribute("data-gallery-delete");
      if (gdel && confirm("Delete this gallery?")) {
        saveGalleries(loadGalleries().filter(function (g) { return g.id !== gdel; }));
        if (galleryViewId === gdel) galleryViewId = null;
        meSub = "galleries";
        paint("me");
      }
      return;
    }
    var galRemImg = ev.target.closest("[data-gallery-remove-img]");
    if (galRemImg && session()) {
      var gidR = galRemImg.getAttribute("data-gallery-id");
      var iidR = galRemImg.getAttribute("data-gallery-remove-img");
      var galls = loadGalleries();
      for (var gi = 0; gi < galls.length; gi++) {
        if (galls[gi].id === gidR) {
          galls[gi].images = (galls[gi].images || []).filter(function (im) { return im.id !== iidR; });
          break;
        }
      }
      saveGalleries(galls);
      galleryViewId = gidR;
      meSub = "galleries";
      paint("me");
      return;
    }
    var mailRow = ev.target.closest("[data-mail-id]");
    if (mailRow && session() && !ev.target.closest("form")) {
      markMailRead(mailRow.getAttribute("data-mail-id"));
      // refresh unread badge in header without full navigation reset
      var badge = document.querySelector(".mail-btn u");
      if (badge) badge.textContent = "(" + unreadCount() + ")";
      // also refresh Me sidebar mail count if present
      try {
        document.querySelectorAll('.links-panel [data-me="mail"]').forEach(function (btn) {
          var u = unreadCount();
          btn.textContent = u ? ("Mail (" + u + ")") : "Mail";
        });
      } catch (e) {}
      mailRow.classList.remove("unread");
    }
    var ped = ev.target.closest("[data-profile-edit]");
    if (ped && session()) {
      var sec = ped.getAttribute("data-profile-edit");
      profileEditSection = (profileEditSection === sec) ? null : sec;
      meSub = "profile";
      viewingId = null;
      paint("me");
      return;
    }
    if (ev.target.closest("[data-profile-edit-cancel]") && session()) {
      profileEditSection = null;
      meSub = "profile";
      paint("me");
      return;
    }
    var meBtn = ev.target.closest("[data-me]");
    if (meBtn && session()) {
      meSub = meBtn.getAttribute("data-me") || "home";
      viewingId = null;
      occMenuId = null;
      galleryViewId = null; // sidebar Me links always show list/root, not a nested gallery
      if (meSub !== "profile") profileEditSection = null;
      if (meSub !== "mail") window.__mailCompose = null;
      paint("me");
      return;
    }
    var pokeSelfBtn = ev.target.closest("#poke-self-demo");
    if (pokeSelfBtn) {
      // Own profile must never poke self — leftover demo id is a no-op.
      return;
    }
    var tab = ev.target.closest("[data-tab]");
    if (tab && tab.getAttribute("data-tab") && session()) {
      var t = tab.getAttribute("data-tab");
      clearStrayUI();
      if (t === "me") { meSub = "home"; viewingId = null; galleryViewId = null; }
      if (t === "rooms") { /* keep inRoom; decorate stays until leave */ }
      else { decorateMode = false; roomPanelOpen = false; }
      if (t === "shop") { shopItemId = null; }
      if (t === "groups") { groupViewId = null; groupThreadId = null; }
      if (t === "games") { gamesMode = "browse"; gameViewId = null; gameDetailTab = "play"; }
      if (t === "stuff") { stuffMode = "browse"; stuffItemId = null; stuffListMode = false; }
      paint(t);
    }
  });
  app.addEventListener("change", function (ev) {
    if (ev.target.matches("[data-playlist-owner-only]") && session() && isLoftOwner()) {
      var plO = loadPlaylist();
      plO.ownerOnlyAdd = !!ev.target.checked;
      savePlaylist(plO);
      return;
    }
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
        profileEditSection = null;
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
        profileEditSection = null;
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
      profileEditSection = null;
      paint("me");
      return;
    }
    if (ev.target.id === "wall-form" && session()) {
      var data3 = new FormData(ev.target);
      var text3 = String(data3.get("text") || "").trim().slice(0, 240);
      if (!text3) return;
      var targetWall = ev.target.getAttribute("data-wall-user") || session().user.id;
      if (targetWall !== session().user.id && isBlocked(targetWall)) {
        pushNotice("gray", "That player is on your blocklist.");
        return;
      }
      var wall2 = loadWall(targetWall);
      wall2.unshift({ who: you().name, text: text3, at: new Date().toISOString(), kind: "comment", fromId: session().user.id });
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

    if (ev.target.id === "buddy-invite-form" && session()) {
      var bid = ev.target.getAttribute("data-buddy-id");
      var bname = ev.target.getAttribute("data-buddy-name") || bid;
      var bfd = new FormData(ev.target);
      var bmsg = String(bfd.get("message") || "").trim().slice(0, 400) || "Let's be buddies!";
      addFriend({ id: bid, name: bname });
      sendMail({
        toId: bid,
        toName: bname,
        subject: "Friend request",
        body: bmsg
      });
      sendMail({
        toId: session().user.id,
        toName: session().user.name,
        fromId: bid,
        fromName: bname,
        subject: "Friend request sent",
        body: "You invited " + bname + ": " + bmsg,
        read: true
      });
      pushNotice("friending", "Friend request sent to " + bname + ".");
      rememberProfile({ id: bid, name: bname });
      friendInvitePending = null;
      occMenuId = null;
      meSub = "friends";
      viewingId = null;
      paint("me");
      return;
    }
    if (ev.target.id === "stuff-upload-form" && session()) {
      var sud = new FormData(ev.target);
      var sname = String(sud.get("name") || "").trim().slice(0, 80);
      var sdesc = String(sud.get("description") || "").trim().slice(0, 400);
      var stype = String(sud.get("typeId") || stuffCat || "furniture");
      var msgEl = document.getElementById("stuff-upload-msg");
      if (!sname) { if (msgEl) msgEl.textContent = "Name required."; return; }
      if (!sud.get("copyright")) { if (msgEl) msgEl.textContent = "Copyright confirmation required."; return; }
      var isMusicUp = stype === "music";
      var fileInput = ev.target.querySelector(isMusicUp ? 'input[name="media"]' : 'input[name="image"]');
      var file = fileInput && fileInput.files && fileInput.files[0];
      // How this works: finishSave writes whirled2.stuff. Music keeps audio in dataUrl; thumb optional.
      function finishSave(thumb, dataUrl) {
        var items = loadStuff();
        var nid = "st" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        var row = {
          id: nid,
          name: sname,
          description: sdesc,
          kind: stype,
          type: stype,
          category: stype,
          creator: session().user.name,
          ownerId: session().user.id,
          thumb: thumb || "",
          owned: true,
          at: new Date().toISOString()
        };
        if (dataUrl) row.dataUrl = dataUrl;
        items.unshift(row);
        saveStuff(items);
        stuffItemId = nid;
        stuffMode = "detail";
        appendTransaction({ kind: "upload", label: "Uploaded Stuff “" + sname + "” (" + stype + ")", coins: 0 });
        pushNotice("green", "Saved “" + sname + "” to Stuff.", { transient: true });
        paint("stuff");
      }
      if (isMusicUp) {
        if (!file) { if (msgEl) msgEl.textContent = "Pick an audio file to upload."; return; }
        var okAudio = {
          "audio/mpeg": 1, "audio/mp3": 1, "audio/wav": 1, "audio/x-wav": 1,
          "audio/ogg": 1, "audio/webm": 1, "audio/mp4": 1
        };
        var looksAudio = okAudio[file.type] || /\.(mp3|wav|ogg|webm|m4a)$/i.test(file.name || "");
        if (!looksAudio) {
          if (msgEl) msgEl.textContent = "Music uploads need MP3, WAV, OGG, or WebM.";
          return;
        }
        if (file.size > MUSIC_MAX_BYTES) {
          if (msgEl) msgEl.textContent = "File is over ~4MB — too large for browser storage on this mock. Please use a shorter/smaller track.";
          return;
        }
        if (file.size > MUSIC_WARN_BYTES) {
          if (msgEl) msgEl.textContent = "Large file (~" + Math.round(file.size / 1048576 * 10) / 10 + "MB). Saving may strain localStorage…";
        }
        var areader = new FileReader();
        areader.onload = function () {
          var dataUrl = String(areader.result || "");
          if (dataUrl.length > MUSIC_MAX_BYTES * 1.4) {
            if (msgEl) msgEl.textContent = "Encoded audio too large for localStorage — try a smaller file.";
            return;
          }
          finishSave("", dataUrl);
        };
        areader.onerror = function () { if (msgEl) msgEl.textContent = "Could not read audio file."; };
        areader.readAsDataURL(file);
        return;
      }
      if (!file) { finishSave("", ""); return; }
      var okTypes = { "image/png":1, "image/jpeg":1, "image/jpg":1, "image/gif":1, "image/webp":1 };
      if (!okTypes[file.type]) {
        if (msgEl) msgEl.textContent = "Images only for this mock (png/jpg/gif/webp). SWF comes later with the engine.";
        return;
      }
      if (file.size > 200000) {
        if (msgEl) msgEl.textContent = "Image is larger than ~200KB — please shrink it for this mock.";
        alert("Keep Stuff thumbnails under ~200KB for this mock.");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = String(reader.result || "");
        if (dataUrl.length > 280000) {
          if (msgEl) msgEl.textContent = "Encoded image too large for localStorage — try a smaller file.";
          return;
        }
        finishSave(dataUrl, "");
      };
      reader.onerror = function () { if (msgEl) msgEl.textContent = "Could not read file."; };
      reader.readAsDataURL(file);
      return;
    }
    if (ev.target.id === "stuff-edit-form" && session()) {
      var eid = ev.target.getAttribute("data-stuff-edit");
      var ed = new FormData(ev.target);
      var items2 = loadStuff();
      for (var ei = 0; ei < items2.length; ei++) {
        if (items2[ei].id === eid) {
          items2[ei].name = String(ed.get("name") || "").trim().slice(0, 80) || items2[ei].name;
          items2[ei].description = String(ed.get("description") || "").trim().slice(0, 400);
          break;
        }
      }
      saveStuff(items2);
      stuffItemId = eid;
      stuffMode = "detail";
      paint("stuff");
      return;
    }
    if (ev.target.id === "stuff-list-form" && session()) {
      var lid = ev.target.getAttribute("data-stuff-list");
      var src = findStuff(lid);
      if (!src) return;
      var ld = new FormData(ev.target);
      if (!ld.get("copyright")) { alert("Copyright confirmation required."); return; }
      var coins = Math.max(0, Math.min(999999, Number(ld.get("coins")) || 0));
      var tags = String(ld.get("tags") || "").trim().slice(0, 120);
      var shop = loadShop().filter(function (it) { return it.sourceStuffId !== lid && it.stuffId !== lid; });
      var shopId = "shop" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      shop.unshift({
        id: shopId,
        sourceStuffId: src.id,
        stuffId: src.id,
        name: src.name,
        description: src.description || "",
        kind: src.kind || itemCat(src),
        type: src.type || itemCat(src),
        category: itemCat(src),
        coins: coins,
        price: coins,
        tags: tags,
        thumb: src.thumb || "",
        creator: session().user.name,
        sellerId: session().user.id,
        sellerName: session().user.name,
        popularity: 0,
        at: new Date().toISOString()
      });
      saveShop(shop);
      stuffListMode = false;
      appendTransaction({ kind: "list", label: "Listed “" + (src.name || "item") + "” in Shop", coins: coins });
      pushNotice("green", "Listed “" + (src.name || "item") + "” in Shop at " + coins + " coins (label).", { transient: true });
      paint("stuff");
      return;
    }
    if (ev.target.id === "blocklist-add-form" && session()) {
      var bd = new FormData(ev.target);
      var bid = String(bd.get("id") || "").trim().slice(0, 40);
      var bname = String(bd.get("name") || "").trim().slice(0, 40) || bid;
      if (!bid) return;
      if (session().user.id && bid.toLowerCase() === String(session().user.id).toLowerCase()) {
        pushNotice("gray", "You cannot block yourself.");
        return;
      }
      addBlocked({ id: bid, name: bname });
      meSub = "blocklist";
      paint("me");
      return;
    }
    if (ev.target.id === "gallery-create-form" && session()) {
      var gcd = new FormData(ev.target);
      var gname = String(gcd.get("name") || "").trim().slice(0, 60);
      if (!gname) return;
      var gs = loadGalleries();
      var gid = "gal" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      gs.unshift({ id: gid, name: gname, images: [], at: new Date().toISOString() });
      saveGalleries(gs);
      galleryViewId = gid;
      meSub = "galleries";
      paint("me");
      return;
    }
    if (ev.target.id === "gallery-add-img-form" && session()) {
      var gaid = ev.target.getAttribute("data-gallery-id");
      var gad = new FormData(ev.target);
      var sidImg = String(gad.get("stuffId") || "").trim();
      var stuffImg = findStuff(sidImg);
      if (!gaid || !stuffImg) return;
      var gals = loadGalleries();
      for (var gx = 0; gx < gals.length; gx++) {
        if (gals[gx].id === gaid) {
          gals[gx].images = gals[gx].images || [];
          gals[gx].images.push({
            id: "gi" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
            stuffId: stuffImg.id,
            name: stuffImg.name,
            thumb: stuffImg.thumb || ""
          });
          break;
        }
      }
      saveGalleries(gals);
      galleryViewId = gaid;
      meSub = "galleries";
      paint("me");
      return;
    }
    if (ev.target.id === "party-create-form" && session()) {
      var pd = new FormData(ev.target);
      var pname = String(pd.get("name") || "").trim().slice(0, 60);
      var pvis = String(pd.get("visibility") || "open");
      if (!pname) return;
      if (pvis !== "friends") pvis = "open";
      var parties = loadParties();
      var pid = "pty" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      parties.unshift({
        id: pid,
        name: pname,
        visibility: pvis,
        creatorId: session().user.id,
        creatorName: session().user.name,
        members: [{ id: session().user.id, name: session().user.name }],
        at: new Date().toISOString()
      });
      saveParties(parties);
      saveMyPartyId(pid);
      partyPanelOpen = true;
      pushNotice("blue", "Created party “" + pname + "”.");
      if (inRoom) paint("rooms");
      else paint(document.querySelector(".tab.is-on") ? document.querySelector(".tab.is-on").getAttribute("data-tab") : "rooms");
      renderNotices();
      return;
    }
    if (ev.target.id === "stuff-gift-form" && session()) {
      var gidItem = ev.target.getAttribute("data-stuff-gift");
      var itemG = findStuff(gidItem);
      var gd = new FormData(ev.target);
      var fidG = String(gd.get("friendId") || "").trim();
      var frG = loadFriends().filter(function (f) { return f.id === fidG; })[0];
      if (!itemG || !frG) return;
      sendMail({
        toId: frG.id,
        toName: frG.name,
        subject: "Gift: " + (itemG.name || "item"),
        body: session().user.name + " sent you “" + (itemG.name || "an item") + "” as a gift (Stuff stub — mail note only on this mock)."
      });
      pushNotice("blue", "Gift note sent to " + frG.name + ".");
      stuffMode = "detail";
      paint("stuff");
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
    if (ev.target.id === "playlist-add-form" && session()) {
      var plAdd = new FormData(ev.target);
      var stuffId = String(plAdd.get("stuffId") || "");
      var item = findStuff(stuffId);
      if (!item) return;
      var plA = loadPlaylist();
      if (!isLoftOwner() && plA.ownerOnlyAdd) {
        pushNotice("orange", "Only the loft owner may add tracks right now.");
        return;
      }
      if (plA.tracks.length >= 99) {
        pushNotice("orange", "Playlist is full (99 max).");
        return;
      }
      var dataUrl = item.dataUrl || item.audio || "";
      if (!dataUrl) {
        pushNotice("orange", "That Music item has no audio data. Re-upload under Stuff → Music.");
        return;
      }
      plA.tracks.push({
        id: "trk" + Date.now().toString(36),
        stuffId: item.id,
        name: item.name || "Track",
        by: session().user.name,
        at: new Date().toISOString(),
        dataUrl: dataUrl
      });
      if (plA.tracks.length === 1) plA.currentIndex = 0;
      savePlaylist(plA);
      playlistPanelOpen = true;
      paint("rooms");
      syncRoomAudio();
      return;
    }
    if (ev.target.id === "group-theme-form" && session()) {
      var gtf = new FormData(ev.target);
      var gidT = ev.target.getAttribute("data-group-theme");
      var hex = String(gtf.get("hex") || "").trim();
      if (!gidT || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
      saveGroupTheme(gidT, hex);
      groupViewId = gidT;
      pushNotice("green", "Saved local group theme draft (header tint only).", { transient: true });
      paint("groups");
      return;
    }
    // How this works (chat send + radio pitfall):
    // #chat-opts-menu lives INSIDE #chat-form and injects <input type="radio"> rows.
    // A bare querySelector("input") hits the first radio (empty value) → early return → Send does nothing.
    // Always read #chat-input for the chat form, before the generic input path below.
    if (ev.target.id === "chat-form") {
      var chatInput = document.getElementById("chat-input") || ev.target.querySelector("#chat-input");
      var chatText = chatInput && chatInput.value.trim();
      if (!chatText) return;
      pushChat(chatText); // offline OK via WhirledApi.postChat → localStorage whirled2.chat.loft
      if (chatInput) chatInput.value = "";
      return;
    }
    var input = ev.target.querySelector("input");
    var text = input && input.value.trim();
    if (!text) return;
    if (ev.target.id === "club-notify-form" && session()) {
      var cf = new FormData(ev.target);
      var email = String(cf.get("email") || "").trim().slice(0, 120);
      var interested = !!ev.target.querySelector('[name="interested"]') && ev.target.querySelector('[name="interested"]').checked;
      var sid = session().user.id;
      try {
        if (email) localStorage.setItem("whirled2.clubNotify." + sid, email);
        else localStorage.removeItem("whirled2.clubNotify." + sid);
        localStorage.setItem("whirled2.clubInterested." + sid, interested ? "1" : "0");
      } catch (e) {}
      var msg = document.getElementById("club-notify-msg");
      if (msg) msg.textContent = interested
        ? "Saved locally. We'll announce Club membership in Whirled2 when ready."
        : "Interest cleared on this browser.";
      return;
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "F9") {
      var app = document.getElementById("app");
      if (!app || app.getAttribute("data-tab") !== "rooms" || !inRoom) return;
      var ui = loadChatUi();
      if (ui.mode !== "overlay") return;
      ui.hideHistory = !ui.hideHistory;
      saveChatUi(ui);
      refreshChatLog();
      ev.preventDefault();
    }
  });
  document.addEventListener("scroll", function (ev) {
    var t = ev.target;
    if (!t || !t.id) return;
    if (t.id === "chat-log" || t.id === "chat-overlay") {
      chatPinnedScroll = (t.scrollHeight - t.scrollTop - t.clientHeight) > 48;
    }
  }, true);
})();
