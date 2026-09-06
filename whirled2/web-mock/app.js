/*
 * Whirled2 page chrome (classic whirled.club-style UI). No Pixi / no private engine.
 *
 * How this works (beginner overview):
 * 1) index.html loads src/api.js then app.js. Everything runs in one IIFE (this file).
 * 2) Gate: if no session, show register/login. Session lives in localStorage whirled2.session
 *    (via WhirledApi). Offline Pages uses local users in whirled2.users; optional server/server.mjs
 *    can share chat + room music when WHIRLED_API is set.
 * 3) After login, shell() builds the top tabs + chat bar; paint(tab) fills #main for Me / Stuff /
 *    Games / Rooms / Groups / Shop. Room stage is empty #stage-slot for a future engine.
 * 4) Most data is browser-local (localStorage keys whirled2.*). Coins + Bars are play currency (earn-only) — no payments.
 * 5) Engine bridge: window.WhirledChrome.getStageEl() returns #stage-slot. See ENGINE-BRIDGE.md.
 * 6) paint() redraws HTML from state; click/submit listeners on #app handle almost all UI actions.
 */
(function () {
  "use strict";
  // ---------------------------------------------------------------------------
  // How this works: brand mark is an SVG (crisp + true transparency).
  // Cache-bust with LOGO_V so phones don't keep an old black-box PNG.
  // Fallbacks: transparent PNG, then classic mark, then tiny svg.
  var LOGO_V = "20260906ay";
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
  // How this works (?v=20260906ax): strip accidental "NaN" concat bugs (e.g. Invalid Date → name+getMonth()+0+getDate()+0).
  // Beginner: display names must stay human — never show TestNaN0NaN0 in the occupant strip.
  function sanitizeDisplayName(name, fallback) {
    var s = String(name == null ? "" : name).trim();
    if (!s || /NaN/i.test(s)) {
      s = String(fallback == null ? "" : fallback).trim();
    }
    s = s.replace(/NaN/gi, "").replace(/\s{2,}/g, " ").trim();
    if (!s || /^[0\W]*$/.test(s)) s = String(fallback || "Player").trim() || "Player";
    return s.slice(0, 40);
  }
  function displayNameForOccupant(p) {
    // Prefer live session name for YOU so a stale API/presence row cannot paint NaN junk.
    try {
      var s = session();
      if (s && s.user && p && (p.you || String(p.id) === String(s.user.id))) {
        return sanitizeDisplayName(s.user.name, "You");
      }
    } catch (e) {}
    return sanitizeDisplayName(p && p.name, (p && p.id) || "Player");
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
  var ROOM_LAYOUT_KEY = "whirled2.roomLayout.loft"; // legacy loft key; prefer roomLayoutStorageKey()
  // How this works (?v=20260906at): layouts are per-room: whirled2.roomLayout.{roomId}.
  // Beginner: doors live on decorate chips (doorTo). Travel uses tryEnterRoom — chrome only.
  // ENGINE DEV: door travel never remounts #stage-slot specially; same roomView paint.
  // How this works (20260906af): multi-room catalog in whirled2.rooms (object map by id).
  // Beginner: Studio Loft stays the default seed; Create Room adds more you own.
  // ENGINE DEV: catalog is chrome/localStorage only — does not remount #stage-slot.
  var ROOMS_CATALOG_KEY = "whirled2.rooms";
  var ROOM_CREATE_COINS = 10000; // classic: 10,000 coins OR 1 bar
  var ROOM_CREATE_BARS = 1;
  var MY_PARTY_KEY = "whirled2.myParty";
  var BLOCKLIST_KEY = "whirled2.blocklist";
  var GALLERIES_KEY = "whirled2.galleries";
  var TRANSACTIONS_KEY = "whirled2.transactions";
  var WALLET_KEY = "whirled2.wallet."; // + userId
  var ROLES_KEY = "whirled2.roles";
  var CHAT_UI_KEY = "whirled2.chatUi";
  var FIRST_USER_KEY = "whirled2.firstUserId";
  // How this works: Avatar lab is a SIDE PROJECT. Default OFF so normal visitors see no SWF wardrobe UI.
  // Unlock with ?avatarLab=1 (also sets localStorage) or localStorage whirled2.avatarLab = "1".
  // ENGINE DEV: lab Wear only writes wardrobe.activeId — never mounts Ruffle / never touches #stage-slot.
  var AVATAR_LAB_KEY = "whirled2.avatarLab";
  var WARDROBE_KEY = "whirled2.wardrobe";
  var MEDIA_IDB_NAME = "whirled2-media";
  var MEDIA_IDB_STORE = "blobs";
  var AVATAR_SWF_MAX_BYTES = 10 * 1024 * 1024; // classic medium upload ~10MB
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
    // What: paint the saved browser theme (Classic / Night / Soft) onto #app.
    // How: set data-theme so CSS variables swap; pin body class for debugging.
    // Why: tab switches (Me→Rooms→Stuff) must not leave Night ink/paper on Classic pages.
    // ENGINE DEV: themes only retint chrome CSS vars — never #stage-slot / Pixi.
    id = id || loadBrowserTheme();
    if (!BROWSER_THEMES[id]) id = "classic";
    var el = document.getElementById("app");
    if (el) {
      el.setAttribute("data-theme", id);
      // How this works: wipe any accidental inline theme leftovers on the shell host.
      try {
        el.style.removeProperty("background");
        el.style.removeProperty("background-color");
        el.style.removeProperty("color");
      } catch (eClr) {}
    }
    try {
      var b = document.body;
      if (b) {
        b.classList.remove("theme-classic", "theme-night", "theme-soft");
        b.classList.add("theme-" + id);
      }
    } catch (eBody) {}
    // How this works: keep #main on paper so empty frames between paints do not flash --sky.
    try {
      var main = document.getElementById("main");
      if (main) {
        main.style.removeProperty("background");
        main.style.removeProperty("background-image");
        main.style.removeProperty("color");
      }
    } catch (eMain) {}
  }
  function clearProfileSkinDom() {
    // What: remove Profile look (custom BG / text / modules) from the DOM.
    // How: strip inline background + --profile-* vars and skin classes from profile nodes.
    // Why: leaving My Profile for Stuff/Rooms must not flash the old skin on the next page.
    // ENGINE DEV: profile page chrome only — never touches #stage-slot or room music dock.
    var nodes = document.querySelectorAll(".page.profile-page, .profile-skin, .has-profile-skin");
    nodes.forEach(function (el) {
      try {
        el.style.background = "";
        el.style.backgroundColor = "";
        el.style.backgroundImage = "";
        el.style.backgroundSize = "";
        el.style.backgroundRepeat = "";
        el.style.backgroundAttachment = "";
        el.style.backgroundPosition = "";
        el.style.removeProperty("--profile-accent");
        el.style.removeProperty("--profile-panel");
        el.style.removeProperty("--profile-text");
        el.style.removeProperty("--profile-link");
        el.style.removeProperty("--profile-font-scale");
        el.style.removeProperty("--profile-radius");
        el.classList.remove(
          "has-profile-skin",
          "profile-radius-sharp", "profile-radius-soft", "profile-radius-round",
          "profile-mod-frosted", "profile-mod-solid", "profile-mod-outline",
          "profile-header-band", "profile-header-minimal", "profile-header-accent-bar"
        );
      } catch (eN) {}
    });
    var banner = document.getElementById("profile-banner");
    if (banner) {
      try {
        banner.hidden = true;
        banner.style.backgroundImage = "";
      } catch (eB) {}
    }
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
  // Room music / playlist (wiki Music) + shared realtime soundtrack
  // How this works: MP3/etc upload → Stuff (type music, data URL). Room menu opens
  // playlist panel. Tracks live in localStorage whirled2.playlist.loft.
  // source: local | youtube | spotify. Local uses HTML5 <audio id="room-audio">;
  // embeds use #room-embed-dock iframe (shell host outside #main — not #stage-slot).
  // Shared sync: owner Set embed → WhirledApi.setRoomMusic (demo server) OR
  // whirled2.roomMusic.loft (Pages local-only / multi-tab via storage event).
  // Guests poll ~2–3s and auto-apply owner embedSrc + seek from startedAt.
  // ENGINE DEV: keep embed dock outside Pixi mount + outside #main so paint never wipes it.
  // ---------------------------------------------------------------------------
  var PLAYLIST_KEY = "whirled2.playlist.loft";
  var ROOM_MUSIC_KEY = "whirled2.roomMusic.loft"; // Pages fallback mirror of server music row
  // How this works: last applied sync fingerprint so we do not rebuild the iframe every poll.
  var lastMusicSyncKey = "";
  var ytPlayer = null; // YouTube IFrame API player (when available)
  var ytApiLoading = false;
  var ytApiReady = false;
  var lastYtSeekAt = 0;
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
  function canControlRoomMusic() {
    // How this works: Pages mock — session may control music when loft owner OR playlist.ownerId
    // matches session OR ownerId is empty (then claim on first save). Fixes users who are
    // not FIRST_USER_KEY and previously only saw "Owner controls" with no embed.
    // Beginner: the person who opened their loft can Set embed; a foreign lock (other ownerId) stays locked.
    // ENGINE DEV: use this for Set embed + source tabs (not bare isLoftOwner alone).
    var s = session();
    var sid = s && s.user && s.user.id;
    if (!sid) return false;
    if (isLoftOwner()) return true;
    try {
      var pl = loadPlaylist();
      var oid = pl && pl.ownerId ? String(pl.ownerId) : "";
      if (!oid) return true; // empty → claim on save
      return oid === String(sid);
    } catch (eCan) {
      return true;
    }
  }
  function claimPlaylistOwnerIfNeeded(pl) {
    // How this works: first successful music-control save stamps playlist.ownerId = session user.
    // Beginner: once claimed, that user (or loft owner) keeps control.
    var s = session();
    var sid = s && s.user && s.user.id;
    if (!pl || !sid) return pl;
    if (!pl.ownerId) pl.ownerId = String(sid);
    return pl;
  }
  function defaultPlaylist() {
    // How this works: current = track index (legacy currentIndex migrated on load).
    // ownerControlsMusic: only loft owner may switch source / paste embeds (hard).
    // ownerOnlyAdd: guests may add local tracks only when false; never change yt/spotify.
    // ownerId: who claimed music control in this browser loft (empty until first control save).
    return {
      source: "local",
      tracks: [],
      current: 0,
      ownerOnlyAdd: true,
      ownerControlsMusic: true,
      ownerId: "",
      embedUrl: "",
      embedSrc: "",
      embedTitle: "",
      startedAt: 0,
      loop: true
    };
  }
  function normalizePlaylistSource(v) {
    v = String(v || "local").toLowerCase();
    if (v === "youtube" || v === "spotify" || v === "local") return v;
    return "local";
  }
  function loadPlaylist() {
    try {
      var p = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "null");
      if (!p || typeof p !== "object") return defaultPlaylist();
      if (!Array.isArray(p.tracks)) p.tracks = [];
      // migrate legacy currentIndex → current
      if (typeof p.current !== "number") {
        p.current = typeof p.currentIndex === "number" ? p.currentIndex : 0;
      }
      delete p.currentIndex;
      if (typeof p.ownerOnlyAdd !== "boolean") p.ownerOnlyAdd = true;
      if (typeof p.ownerControlsMusic !== "boolean") p.ownerControlsMusic = true;
      p.ownerId = String(p.ownerId || "");
      p.source = normalizePlaylistSource(p.source);
      p.embedUrl = String(p.embedUrl || "");
      p.embedSrc = String(p.embedSrc || "");
      p.embedTitle = String(p.embedTitle || "").slice(0, 120);
      p.startedAt = Number(p.startedAt || 0) || 0;
      p.loop = p.loop === false ? false : true;
      return p;
    } catch (e) { return defaultPlaylist(); }
  }
  function savePlaylist(p) {
    try {
      if (p && typeof p === "object") {
        if (typeof p.current !== "number" && typeof p.currentIndex === "number") p.current = p.currentIndex;
        delete p.currentIndex;
      }
      localStorage.setItem(PLAYLIST_KEY, JSON.stringify(p));
    } catch (e) {}
  }
  function isWhirledApiLive() {
    // How this works: demo server mode when WHIRLED_API is a non-empty origin.
    // Beginner: GitHub Pages leaves this empty → shared soundtrack is local-only.
    try { return !!(window.WHIRLED_API && String(window.WHIRLED_API).replace(/\/$/, "")); }
    catch (e) { return false; }
  }
  function isDemoApi() {
    // Alias: Discord / shared API features need WHIRLED_API (demo server origin).
    return isWhirledApiLive();
  }
  function musicSyncMetaHtml() {
    // How this works: clear UI meta so players know Pages alone cannot sync two phones.
    if (isWhirledApiLive()) {
      return '<p class="meta playlist-sync-meta">Everyone in this loft hears the same loop (synced). Demo server sync is <b>on</b>.</p>';
    }
    return '<p class="meta playlist-sync-meta">Everyone in this loft hears the same loop (synced). '
      + '<b>Shared soundtrack syncs when the demo server is running; Pages alone is local-only.</b> '
      + '(Same browser / multi-tab can still share via localStorage.)</p>';
  }
  function youtubeVideoIdFromEmbedSrc(src) {
    // How this works: pull the 11-char-ish video id from a youtube-nocookie embed URL.
    try {
      var u = new URL(String(src || ""));
      var parts = (u.pathname || "").split("/").filter(Boolean);
      var i = parts.indexOf("embed");
      if (i >= 0) {
        var seg = parts[i + 1] || "";
        if (seg && seg !== "videoseries" && /^[A-Za-z0-9_-]{6,64}$/.test(seg)) return seg;
      }
    } catch (e) {}
    return "";
  }
  function musicElapsedSeconds(pl) {
    // How this works: seconds since startedAt, used for start= / seekTo.
    var started = Number((pl && pl.startedAt) || 0) || 0;
    if (!started) return 0;
    return Math.max(0, Math.floor((Date.now() - started) / 1000));
  }
  function ensureYoutubeIframeApi(cb) {
    // How this works: load YouTube IFrame API once; then we can seekTo for shared sync.
    // Beginner: if the API is blocked, we still fall back to iframe start= on first apply.
    // ENGINE DEV: chrome-only; never inject into #stage-slot.
    if (ytApiReady && window.YT && window.YT.Player) {
      if (cb) cb();
      return;
    }
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      ytApiReady = true;
      try { if (typeof prev === "function") prev(); } catch (eP) {}
      if (cb) try { cb(); } catch (eC) {}
    };
    if (window.YT && window.YT.Player) {
      ytApiReady = true;
      if (cb) cb();
      return;
    }
    if (ytApiLoading) return;
    ytApiLoading = true;
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    (document.head || document.body).appendChild(tag);
  }
  function destroyYtPlayer() {
    try {
      if (ytPlayer && typeof ytPlayer.destroy === "function") ytPlayer.destroy();
    } catch (e) {}
    ytPlayer = null;
  }
  function attachYtPlayerIfPossible(pl) {
    // How this works: wrap the dock iframe with YT.Player so we can seekTo(elapsed % duration).
    // Beginner: only rebuilds when the video id changes; soft seek when drift is big.
    if (!pl || normalizePlaylistSource(pl.source) !== "youtube" || !pl.embedSrc) return;
    var vid = youtubeVideoIdFromEmbedSrc(pl.embedSrc);
    if (!vid) return;
    ensureYoutubeIframeApi(function () {
      try {
        var dock = document.getElementById("room-embed-dock");
        if (!dock || dock.hidden) return;
        var frame = dock.querySelector("iframe.room-embed-frame");
        if (!frame) return;
        if (!frame.id) frame.id = "whirled2-yt-frame";
        // enablejsapi must be on the src for Player to attach
        var wantEnable = String(frame.src || "").indexOf("enablejsapi=1") === -1;
        if (wantEnable) {
          try {
            var u = new URL(frame.src);
            u.searchParams.set("enablejsapi", "1");
            u.searchParams.set("origin", location.origin || "");
            frame.src = u.toString();
          } catch (eEn) {}
        }
        function softSeek(player) {
          var elapsed = musicElapsedSeconds(pl);
          var dur = 0;
          try { dur = Number(player.getDuration && player.getDuration()) || 0; } catch (eD) {}
          var target = elapsed;
          if (dur > 1) target = elapsed % Math.floor(dur);
          var nowPos = 0;
          try { nowPos = Number(player.getCurrentTime && player.getCurrentTime()) || 0; } catch (eT) {}
          // Only seek when drift > 2.5s — avoid thrashing every poll.
          if (Math.abs(nowPos - target) > 2.5) {
            try { player.seekTo(target, true); } catch (eS) {}
            lastYtSeekAt = Date.now();
          }
          try {
            if (player.getPlayerState && player.getPlayerState() !== 1) {
              player.playVideo();
            }
          } catch (ePlay) {}
        }
        if (ytPlayer && ytPlayer.__vid === vid) {
          softSeek(ytPlayer);
          return;
        }
        destroyYtPlayer();
        ytPlayer = new window.YT.Player(frame.id, {
          events: {
            onReady: function (ev) {
              try {
                var p = ev.target;
                p.__vid = vid;
                var elapsed = musicElapsedSeconds(pl);
                var dur = Number(p.getDuration && p.getDuration()) || 0;
                var target = dur > 1 ? (elapsed % Math.floor(dur)) : elapsed;
                try { p.seekTo(target, true); } catch (e0) {}
                try { p.playVideo(); } catch (e1) {}
                // Prefer loop via playlist=self already on embed URL; also setLoop if available.
                try { if (p.setLoop) p.setLoop(true); } catch (e2) {}
              } catch (eR) {}
            },
            onStateChange: function (ev) {
              // When ended, restart for loop if API reports ended (0)
              try {
                if (ev.data === 0 && ytPlayer && typeof ytPlayer.seekTo === "function") {
                  ytPlayer.seekTo(0, true);
                  ytPlayer.playVideo();
                }
              } catch (eEnd) {}
            }
          }
        });
        ytPlayer.__vid = vid;
      } catch (eAttach) {}
    });
  }
  function applySharedMusicState(remote, opts) {
    // How this works: guest/owner apply a music row from server or localStorage mirror.
    // Beginner: guests do not paste — owner embedSrc appears automatically.
    // ENGINE DEV: only rewrite iframe when embedSrc / startedAt fingerprint changes.
    opts = opts || {};
    if (!remote || typeof remote !== "object") return false;
    if (!remote.embedSrc && !remote.embedUrl) return false;
    var pl = loadPlaylist();
    var src = normalizePlaylistSource(remote.source || pl.source || "youtube");
    if (src !== "youtube" && src !== "spotify") src = "youtube";
    var startedAt = Number(remote.startedAt || 0) || 0;
    var fp = String(remote.embedSrc || "") + "|" + startedAt + "|" + src;
    var same = fp === lastMusicSyncKey
      && pl.embedSrc === String(remote.embedSrc || "")
      && Number(pl.startedAt || 0) === startedAt;
    pl.source = src;
    pl.embedUrl = String(remote.embedUrl || pl.embedUrl || "");
    pl.embedSrc = String(remote.embedSrc || "");
    pl.embedTitle = String(remote.embedTitle || pl.embedTitle || "").slice(0, 120);
    pl.startedAt = startedAt;
    pl.loop = remote.loop === false ? false : true;
    if (remote.ownerId) pl.ownerId = String(remote.ownerId);
    savePlaylist(pl);
    lastMusicSyncKey = fp;
    if (!inRoom) return true;
    if (!same || opts.force) {
      try {
        var dock = document.getElementById("room-embed-dock");
        if (dock) dock.removeAttribute("data-embed-src");
      } catch (eF) {}
      try { syncRoomAudio(); } catch (eS) {}
    } else if (src === "youtube") {
      // Soft seek only — do not recreate iframe every poll.
      try { attachYtPlayerIfPossible(pl); } catch (eA) {}
    }
    return true;
  }
  async function publishRoomMusicFromPlaylist(pl) {
    // How this works: after owner Set embed, publish to demo server (or Pages local mirror).
    if (!pl || !pl.embedSrc) return null;
    if (!window.WhirledApi || typeof window.WhirledApi.setRoomMusic !== "function") return null;
    var payload = {
      source: normalizePlaylistSource(pl.source),
      embedUrl: pl.embedUrl || "",
      embedSrc: pl.embedSrc || "",
      embedTitle: pl.embedTitle || "",
      startedAt: Number(pl.startedAt || Date.now()) || Date.now(),
      loop: pl.loop === false ? false : true,
      ownerId: pl.ownerId || (session() && session().user && session().user.id) || ""
    };
    try {
      var row = await window.WhirledApi.setRoomMusic("loft", payload);
      if (row && row.startedAt) {
        pl.startedAt = Number(row.startedAt) || pl.startedAt;
        if (row.ownerId) pl.ownerId = String(row.ownerId);
        savePlaylist(pl);
        lastMusicSyncKey = String(pl.embedSrc || "") + "|" + pl.startedAt + "|" + normalizePlaylistSource(pl.source);
      }
      return row;
    } catch (e) {
      try { pushNotice("orange", "Could not publish shared soundtrack: " + ((e && e.message) || e)); } catch (eN) {}
      return null;
    }
  }
  async function pollSharedRoomMusic() {
    // How this works: poll with chat (~2.5s). Guests auto-apply owner's embed without pasting.
    if (!session() || !inRoom) return;
    if (!window.WhirledApi || typeof window.WhirledApi.getRoomMusic !== "function") return;
    try {
      var remote = await window.WhirledApi.getRoomMusic("loft");
      if (!remote || !remote.embedSrc) return;
      var pl = loadPlaylist();
      // If we are owner and local embed is newer empty remote skip; otherwise apply remote.
      var remoteAt = Number(remote.updatedAt || remote.startedAt || 0) || 0;
      var localAt = Number(pl.startedAt || 0) || 0;
      var sameSrc = String(pl.embedSrc || "") === String(remote.embedSrc || "");
      if (sameSrc && Number(pl.startedAt || 0) === Number(remote.startedAt || 0)) {
        // Soft YouTube seek only
        if (normalizePlaylistSource(pl.source) === "youtube") {
          try { attachYtPlayerIfPossible(pl); } catch (eSoft) {}
        }
        return;
      }
      // Guests always take remote. Owner takes remote if remote URL differs (another device).
      applySharedMusicState(remote, { force: !sameSrc });
      // Remount playlist meta lightly if open (not while typing)
      if (playlistPanelOpen && !playlistPanelHasFocus()) {
        playlistPanelDirty = true;
        try { ensurePlaylistPanel(); } catch (eP) {}
      }
    } catch (ePoll) {}
  }
  function bindRoomMusicStorageListener() {
    // How this works: Pages multi-tab sync via storage event on whirled2.roomMusic.loft.
    // Beginner: two different phones on GitHub Pages alone still cannot sync — need the demo server.
    if (window.__whirledMusicStorageBound) return;
    window.__whirledMusicStorageBound = true;
    window.addEventListener("storage", function (ev) {
      try {
        if (!ev || ev.key !== ROOM_MUSIC_KEY) return;
        if (!inRoom || !session()) return;
        var remote = null;
        try { remote = JSON.parse(ev.newValue || "null"); } catch (e) {}
        if (remote && remote.embedSrc) applySharedMusicState(remote, { force: true });
      } catch (eS) {}
    });
  }
  function myMusicStuff() {
    return loadStuff().filter(function (it) {
      var k = String(it.kind || it.type || it.category || "").toLowerCase();
      return k === "music" && (it.dataUrl || it.audio || it.thumb);
    });
  }
  // How this works: paste a YouTube or Spotify link → we turn it into a safe https embed iframe src.
  // Beginner: watch / youtu.be / Shorts / Live / playlist / music.youtube all work; Spotify track/album/playlist/episode too.
  // ENGINE DEV: https-only host allowlist; prefer embed/VID?list= when both present; no sandbox on iframe (clicks must work).
  function parseYouTubeEmbed(raw) {
    raw = String(raw || "").trim();
    if (!raw) return { ok: false, error: "Paste a YouTube video or playlist URL." };
    var u;
    try { u = new URL(raw); } catch (e) { return { ok: false, error: "That does not look like a valid URL." }; }
    if (u.protocol !== "https:") return { ok: false, error: "Use https:// YouTube links only." };
    var host = (u.hostname || "").toLowerCase().replace(/^www\./, "");
    var ytHosts = {
      "youtube.com": 1,
      "m.youtube.com": 1,
      "music.youtube.com": 1,
      "youtu.be": 1,
      "youtube-nocookie.com": 1
    };
    if (!ytHosts[host]) {
      return { ok: false, error: "Only youtube.com / music.youtube.com / youtu.be links are allowed." };
    }
    var list = u.searchParams.get("list") || "";
    var vid = "";
    var path = u.pathname || "";
    // Strip share junk (si=) — we only care about v / list / path ids.
    if (host === "youtu.be") {
      // youtu.be/VIDEOID or youtu.be/VIDEOID?list=
      vid = path.replace(/^\//, "").split("/")[0] || "";
      // drop query-ish junk from path segment (rare)
      vid = vid.split("?")[0].split("&")[0];
    } else if (path.indexOf("/embed/") === 0 || path.indexOf("/embed/") > -1) {
      var embParts = path.split("/");
      var embIdx = embParts.indexOf("embed");
      vid = (embIdx >= 0 ? embParts[embIdx + 1] : "") || "";
      if (vid === "videoseries") vid = "";
    } else if (path.indexOf("/playlist") === 0) {
      list = list || u.searchParams.get("list") || "";
    } else if (path.indexOf("/shorts/") === 0 || path.indexOf("/live/") === 0 || path.indexOf("/watch/") === 0) {
      // /shorts/ID, /live/ID, /watch/ID (some share URLs)
      var segs = path.split("/").filter(Boolean);
      vid = segs[1] || "";
    } else if (path.indexOf("/music/") === 0 || path === "/music" || path.indexOf("/watch") === 0) {
      // music.youtube.com/watch?v= or /music/watch?v=
      vid = u.searchParams.get("v") || "";
    } else {
      vid = u.searchParams.get("v") || "";
      if (!vid && path.indexOf("/v/") === 0) {
        vid = path.split("/")[2] || "";
      }
    }
    if (!vid) vid = u.searchParams.get("v") || "";
    if (!list) list = u.searchParams.get("list") || "";
    // Validate ids (YouTube video ids are typically 11 chars; playlists vary).
    if (vid && !/^[A-Za-z0-9_-]{6,64}$/.test(vid)) {
      return { ok: false, error: "Could not read a YouTube video id." };
    }
    if (list && !/^[A-Za-z0-9_-]{6,64}$/.test(list)) {
      return { ok: false, error: "Could not read a YouTube playlist id." };
    }
    var src = "";
    var title = "YouTube";
    // Prefer video+list when both present → embed/VID?list=
    if (vid && list) {
      src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(vid) + "?list=" + encodeURIComponent(list);
      title = "YouTube video + playlist";
    } else if (vid) {
      src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(vid);
      title = "YouTube video";
    } else if (list) {
      src = "https://www.youtube-nocookie.com/embed/videoseries?list=" + encodeURIComponent(list);
      title = "YouTube playlist";
    } else {
      return { ok: false, error: "Need a watch, youtu.be, Shorts, Live, embed, or playlist URL." };
    }
    return { ok: true, embedUrl: raw, embedSrc: src, embedTitle: title };
  }
  function parseSpotifyEmbed(raw) {
    raw = String(raw || "").trim();
    if (!raw) return { ok: false, error: "Paste a Spotify track, album, playlist, or episode URL." };
    var u;
    try { u = new URL(raw); } catch (e) { return { ok: false, error: "That does not look like a valid URL." }; }
    if (u.protocol !== "https:") return { ok: false, error: "Use https:// Spotify links only." };
    var host = (u.hostname || "").toLowerCase().replace(/^www\./, "");
    // spotify.link short links rarely include type/id in the path without a network hop — only accept if parseable.
    if (host === "spotify.link" || host === "spotify.app.link") {
      var spParts = (u.pathname || "").split("/").filter(Boolean);
      // Rare path shapes: /track/ID etc. if ever present without redirect
      if (spParts[0] && spParts[0].indexOf("intl-") === 0) spParts = spParts.slice(1);
      var spType = spParts[0] || "";
      var spId = (spParts[1] || "").split("?")[0];
      var spAllowed = { track: 1, album: 1, playlist: 1, episode: 1 };
      if (!spAllowed[spType] || !/^[A-Za-z0-9]{10,64}$/.test(spId)) {
        return { ok: false, error: "spotify.link short URLs need open.spotify.com (copy link from Spotify app → Share → Copy link)." };
      }
      return {
        ok: true,
        embedUrl: raw,
        embedSrc: "https://open.spotify.com/embed/" + spType + "/" + encodeURIComponent(spId),
        embedTitle: "Spotify " + spType
      };
    }
    if (host !== "open.spotify.com") {
      return { ok: false, error: "Only open.spotify.com (or parseable spotify.link) links are allowed." };
    }
    var parts = (u.pathname || "").split("/").filter(Boolean);
    // international paths: /intl-xx/track/id
    if (parts[0] && parts[0].indexOf("intl-") === 0) parts = parts.slice(1);
    var type = parts[0] || "";
    var id = (parts[1] || "").split("?")[0];
    var allowed = { track: 1, album: 1, playlist: 1, episode: 1 };
    if (!allowed[type] || !/^[A-Za-z0-9]{10,64}$/.test(id)) {
      return { ok: false, error: "Need open.spotify.com/{track|album|playlist|episode}/{id}." };
    }
    return {
      ok: true,
      embedUrl: raw,
      embedSrc: "https://open.spotify.com/embed/" + type + "/" + encodeURIComponent(id) + "?utm_source=generator",
      embedTitle: "Spotify " + type
    };
  }
  function detectEmbedSourceFromUrl(raw) {
    // How this works: peek at host so we can auto-switch My uploads → YouTube/Spotify when owner pastes a link.
    try {
      var u = new URL(String(raw || "").trim());
      if (u.protocol !== "https:") return "";
      var h = (u.hostname || "").toLowerCase().replace(/^www\./, "");
      if (h === "youtube.com" || h === "m.youtube.com" || h === "music.youtube.com" || h === "youtu.be" || h === "youtube-nocookie.com") return "youtube";
      if (h === "open.spotify.com" || h === "spotify.link" || h === "spotify.app.link") return "spotify";
    } catch (e) {}
    return "";
  }
  function parseRoomEmbed(source, raw) {
    // Auto-pick source from URL when caller passes "" or mismatched local.
    var detected = detectEmbedSourceFromUrl(raw);
    if ((!source || source === "local") && detected) source = detected;
    else if ((source === "youtube" || source === "spotify") && detected && detected !== source) source = detected;
    if (source === "youtube") return parseYouTubeEmbed(raw);
    if (source === "spotify") return parseSpotifyEmbed(raw);
    return { ok: false, error: "Pick YouTube or Spotify." };
  }
  function roomEmbedSrcForIframe(pl) {
    // How this works: take stored embedSrc and add YouTube loop + playsinline + start= for shared sync.
    // Beginner: one video keeps repeating; guests join mid-song via start= seconds from startedAt.
    // ENGINE DEV: YouTube single-video loop REQUIRES loop=1&playlist=VIDEO_ID (same id). Keep playsinline=1.
    // Prefer IFrame API seekTo when available; start= is the sparingly-used iframe fallback (URL change only).
    var base = String((pl && pl.embedSrc) || "");
    if (!base) return "";
    var kind = normalizePlaylistSource(pl && pl.source);
    if (kind === "spotify") return base; // cannot force Spotify loop the same way
    if (kind !== "youtube") return base;
    try {
      var u = new URL(base);
      u.searchParams.set("playsinline", "1");
      u.searchParams.set("enablejsapi", "1");
      try { if (location.origin) u.searchParams.set("origin", location.origin); } catch (eO) {}
      var path = u.pathname || "";
      var list = u.searchParams.get("list") || "";
      var vid = "";
      var parts = path.split("/").filter(Boolean);
      var embIdx = parts.indexOf("embed");
      if (embIdx >= 0) {
        var seg = parts[embIdx + 1] || "";
        if (seg && seg !== "videoseries") vid = seg;
      }
      if (vid && !list) {
        // Single video → loop forever via playlist=self
        u.searchParams.set("loop", "1");
        u.searchParams.set("playlist", vid);
      } else if (list) {
        // Playlist / video+list — loop=1 is valid; player advances then wraps
        u.searchParams.set("loop", "1");
      } else if (vid) {
        u.searchParams.set("loop", "1");
        u.searchParams.set("playlist", vid);
      }
      // Shared soundtrack: land near the same beat (unknown duration → raw elapsed; API corrects later).
      var elapsed = musicElapsedSeconds(pl);
      if (elapsed > 0) u.searchParams.set("start", String(elapsed));
      return u.toString();
    } catch (eLoop) {
      return base;
    }
  }
  function updateRoomMusicChip() {
    // How this works: ♪ chip pulses when a yt/spotify dock (or local audio) is live in-room.
    // Beginner: glowing note = music is still playing even if the modal is closed.
    // ENGINE DEV: toggle .is-playing on .tb-music; never tear down dock from here.
    try {
      var btn = document.querySelector(".tb-music");
      if (!btn) return;
      var playing = false;
      if (inRoom) {
        var pl = loadPlaylist();
        var src = normalizePlaylistSource(pl && pl.source);
        if (src === "youtube" || src === "spotify") {
          var dock = document.getElementById("room-embed-dock");
          playing = !!(dock && !dock.hidden && pl.embedSrc);
        } else if (src === "local") {
          var a = document.getElementById("room-audio");
          playing = !!(a && !a.paused && a.src);
        }
      }
      btn.classList.toggle("is-playing", !!playing);
    } catch (eChip) {}
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
  function removeRoomEmbedDock() {
    // How this works: hide/clear the shell dock. Leaving room / local source pauses embed.
    // Beginner: Close player is separate — this fully tears down the iframe when music should stop.
    // ENGINE DEV: dock lives in shell() outside #main — never wipe via main.innerHTML.
    roomEmbedExpanded = false;
    try { destroyYtPlayer(); } catch (eYt) {}
    var dock = document.getElementById("room-embed-dock");
    if (!dock) return;
    dock.hidden = true;
    dock.classList.remove("is-expanded");
    dock.innerHTML = "";
    dock.removeAttribute("data-embed-src");
    dock.removeAttribute("data-embed-kind");
    // Safety: if a stray dock somehow landed under #main, drop it (shell host is the only one).
    try {
      var main = document.getElementById("main");
      if (main && main.contains(dock)) {
        var app = document.getElementById("app");
        var bar = app && document.getElementById("chat-form");
        if (app && bar) app.insertBefore(dock, bar);
        else if (app) app.appendChild(dock);
      }
    } catch (eHome) {}
  }
  function applyRoomEmbedExpanded(dock) {
    // How this works: toggle is-expanded + Close player visibility from roomEmbedExpanded.
    // Beginner: Open player = big bottom sheet; Close player collapses it.
    // ENGINE DEV: never reparent to document.body — dock stays under #app so click delegation works.
    // CSS position:fixed; left/right/bottom:0; z-index:100 keeps the sheet above .bar.
    if (!dock) return;
    dock.classList.toggle("is-expanded", !!roomEmbedExpanded);
    var col = dock.querySelector("[data-embed-collapse]");
    if (col) col.hidden = !roomEmbedExpanded;
    if (roomEmbedExpanded) dock.hidden = false;
  }
  function ensureRoomEmbedDock(pl) {
    // How this works: iframe + big mobile buttons in the persistent shell dock (outside #main).
    // Beginner: on a phone, tap "Open player" / "Open on YouTube" — those always work even if the tiny iframe play button is hard to hit.
    // ENGINE DEV: #room-embed-dock is created in shell() after #main / before .bar — paint never destroys it.
    // Touch: raise z-index + pointer-events; expand sheet for ~220px tap target on iOS.
    // How this works (20260906af mute-safe): when muted, do NOT mount the embed iframe (classic wiki:
    // muted → do not load the track — avoids a bad stream breaking the room). Labels still update elsewhere.
    // Beginner: Mute = no YouTube/Spotify load; Unmute remounts from saved playlist embedSrc.
    if (roomAudioMuted) {
      removeRoomEmbedDock();
      try { updateRoomMusicChip(); } catch (eMuteDock) {}
      return null;
    }
    if (!inRoom || !pl || (pl.source !== "youtube" && pl.source !== "spotify") || !pl.embedSrc) {
      removeRoomEmbedDock();
      return null;
    }
    var app = document.getElementById("app");
    var dock = document.getElementById("room-embed-dock");
    if (!dock && app) {
      dock = document.createElement("div");
      dock.id = "room-embed-dock";
      dock.classList.add("room-embed-dock");
      dock.hidden = true;
      var bar = document.getElementById("chat-form");
      if (bar) app.insertBefore(dock, bar);
      else app.appendChild(dock);
    }
    if (!dock) return null;
    // Never append under .stage-body / #main — keep under #app shell host.
    try {
      var main = document.getElementById("main");
      if (main && main.contains(dock) && app) {
        var bar2 = document.getElementById("chat-form");
        if (bar2) app.insertBefore(dock, bar2);
        else app.appendChild(dock);
      }
    } catch (eMove) {}
    // Use classList — never dock.className = "…" (that wiped is-expanded).
    dock.classList.add("room-embed-dock");
    var onRoomsStage = !!document.querySelector("#main .stage-wrap");
    // Hide collapsed dock off the rooms stage; expanded fixed sheet can stay visible.
    dock.hidden = !onRoomsStage && !roomEmbedExpanded;
    if (onRoomsStage || roomEmbedExpanded) dock.hidden = false;
    var kind = pl.source === "spotify" ? "spotify" : "youtube";
    var title = esc(pl.embedTitle || (kind === "spotify" ? "Spotify" : "YouTube"));
    var src = roomEmbedSrcForIframe(pl);
    // How this works: rewrite iframe only when src changes (or caller cleared data-embed-src to force refresh).
    if (dock.getAttribute("data-embed-src") !== src) {
      dock.setAttribute("data-embed-src", src);
      dock.setAttribute("data-embed-kind", kind);
      var openHref = String(pl.embedUrl || "");
      var openLabel = kind === "spotify" ? "Open on Spotify" : "Open on YouTube";
      var openBtn = openHref
        ? ('<a class="action-btn room-embed-open room-embed-open-btn" href="' + esc(openHref) + '" target="_blank" rel="noopener noreferrer">' + openLabel + '</a>')
        : "";
      var muteLbl = roomAudioMuted ? "Unmute" : "Mute";
      // How this works (?v=20260906ax): compact pale-blue Now playing mini-bar — title ellipsis + Open / Set / Mute.
      // Beginner: no dark green slab, no truncated "YouTube loo…" pileup. Expanded player stays available.
      var shortKind = kind === "spotify" ? "Spotify" : "YouTube";
      dock.innerHTML = ''
        + '<div class="room-embed-now" role="status" aria-live="polite">'
        +   '<span class="room-embed-now-glyph" aria-hidden="true">♪</span>'
        +   '<div class="room-embed-now-text">'
        +     '<strong class="room-embed-now-title">Now playing</strong>'
        +     '<span class="room-embed-now-sub" title="' + title + '">' + title + '</span>'
        +     '<span class="room-embed-now-kind meta">' + shortKind + (kind === "youtube" ? " · loops" : "") + '</span>'
        +   '</div>'
        +   '<div class="room-embed-now-actions">'
        +     '<button type="button" class="action-btn room-embed-play-btn" data-embed-expand="1" title="Open player">Open</button>'
        +     '<button type="button" class="text-btn" data-playlist-open-panel="1" title="Set room music">Set</button>'
        +     '<button type="button" class="text-btn" data-room-mute="1" title="Mute or unmute">' + muteLbl + '</button>'
        +     '<button type="button" class="text-btn room-embed-collapse" data-embed-collapse="1" hidden>Close</button>'
        +   '</div>'
        + '</div>'
        + '<div class="room-embed-mobile-controls" role="group" aria-label="Room music controls">'
        +   '<button type="button" class="action-btn" data-embed-focus="1">Tap play</button>'
        +   openBtn
        + '</div>'
        + '<div class="room-embed-frame-wrap">'
        +   '<iframe class="room-embed-frame" title="' + title + '" src="' + esc(src) + '" '
        +   'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share" '
        +   'allowfullscreen playsinline referrerpolicy="strict-origin-when-cross-origin"></iframe>'
        + '</div>';
    } else {
      dock.setAttribute("data-embed-kind", kind);
      try {
        var muteBtn = dock.querySelector('.room-embed-now-actions [data-room-mute]');
        if (muteBtn) muteBtn.textContent = roomAudioMuted ? "Unmute" : "Mute";
        var sub = dock.querySelector(".room-embed-now-sub");
        if (sub) { sub.textContent = pl.embedTitle || title; sub.setAttribute("title", pl.embedTitle || title); }
      } catch (eRefresh) {}
    }
    applyRoomEmbedExpanded(dock);
    try { updateRoomMusicChip(); } catch (eChipDock) {}
    // How this works: after iframe exists, try YouTube IFrame API for seekTo sync (fallback already used start=).
    if (kind === "youtube") {
      try { attachYtPlayerIfPossible(pl); } catch (eYtAtt) {}
    }
    return dock;
  }
  function playlistPanelHasFocus() {
    // How this works: if an embed URL field (or any form control) is focused, never replaceChild the panel.
    // Beginner: replacing mid-paste dismisses the keyboard and kills the paste — that was the bug.
    try {
      var panel = document.getElementById("room-playlist-panel");
      var ae = document.activeElement;
      if (!panel || !ae || !panel.contains(ae)) return false;
      var tag = (ae.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    } catch (eFocus) { return false; }
  }
  function focusPlaylistEmbedUrl() {
    // How this works: after opening Room music, focus the paste field so owners can paste immediately.
    // Beginner: one tap Room music → keyboard/paste ready on the link box.
    // ENGINE DEV: rAF so the field exists after mount/replace.
    requestAnimationFrame(function () {
      try {
        var panel = document.getElementById("room-playlist-panel");
        if (!panel) return;
        var inp = panel.querySelector('#playlist-embed-form input[name="embedUrl"], #playlist-smart-embed-form input[name="embedUrl"]');
        if (!inp) return;
        try { inp.focus({ preventScroll: false }); } catch (eF) { try { inp.focus(); } catch (eF2) {} }
        try { panel.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (eSc) {}
      } catch (eFocusUrl) {}
    });
  }
  function collapseRoomEmbedSheet() {
    // How this works: expanded Open player sheet is z-index 100; Room music modal is z-index 120.
    // Beginner: opening Room music collapses the big player so it does not cover the paste box.
    roomEmbedExpanded = false;
    try {
      var dock = document.getElementById("room-embed-dock");
      if (dock) applyRoomEmbedExpanded(dock);
    } catch (eCol) {}
  }
  function closePlaylistPanel() {
    // How this works: Close / backdrop / Done ONLY remove the modal — never stop audio / never clear the dock.
    // Beginner: music (and YouTube loop) keeps playing in the dock after you close the sheet.
    // ENGINE DEV: never call removeRoomEmbedDock() here; leave iframe + local <audio> alone.
    playlistPanelOpen = false;
    playlistPanelDirty = false;
    try {
      var el = document.getElementById("room-playlist-panel");
      if (el) el.remove();
    } catch (eClose) {}
    try { updateRoomMusicChip(); } catch (eChipClose) {}
  }
  function setPlaylistEmbedMsg(kind, msg) {
    // How this works: show success/error inside the modal so phones do not miss the notice bar.
    // Beginner: green = embed set; orange/red = fix the link and try again.
    try {
      var el = document.getElementById("playlist-embed-msg");
      if (!el) return;
      el.textContent = msg || "";
      el.setAttribute("data-kind", kind || "");
      el.className = "playlist-embed-msg" + (kind ? (" is-" + kind) : "");
    } catch (eMsg) {}
  }
  function applyPlaylistEmbedFromUi(ev) {
    // How this works: Set embed path — button click OR form submit. Read URL from input value
    // (querySelector), not only FormData. Success shows Done (close modal only; dock keeps playing).
    // Beginner: paste link → Set embed → Done — keep playing.
    // ENGINE DEV: claim ownerId; clear data-embed-src once so dock rewrites; never remove dock on Done.
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!session()) return false;
    if (!canControlRoomMusic()) {
      setPlaylistEmbedMsg("error", "Owner controls room music.");
      pushNotice("orange", "Owner controls room music.");
      return false;
    }
    var panel = document.getElementById("room-playlist-panel");
    var inp = panel
      ? panel.querySelector('#playlist-embed-form input[name="embedUrl"], #playlist-smart-embed-form input[name="embedUrl"], input.playlist-embed-url[name="embedUrl"]')
      : null;
    var rawUrl = inp ? String(inp.value || "") : "";
    if (!rawUrl && ev && ev.target && ev.target.closest) {
      var form = ev.target.closest("form");
      if (form) {
        try {
          var fd = new FormData(form);
          rawUrl = String(fd.get("embedUrl") || "");
        } catch (eFd) {}
      }
    }
    rawUrl = String(rawUrl || "").trim();
    if (!rawUrl) {
      setPlaylistEmbedMsg("error", "Paste a YouTube or Spotify link first.");
      return false;
    }
    var plE = loadPlaylist();
    var srcE = normalizePlaylistSource(plE.source);
    var detected = detectEmbedSourceFromUrl(rawUrl);
    if (detected && (srcE === "local" || srcE !== detected)) {
      srcE = detected;
      plE.source = detected;
    }
    if (srcE !== "youtube" && srcE !== "spotify") {
      setPlaylistEmbedMsg("error", "Switch Music source to YouTube or Spotify first (or paste a YouTube/Spotify link).");
      pushNotice("orange", "Switch Music source to YouTube or Spotify first (or paste a YouTube/Spotify link).");
      return false;
    }
    var parsed = parseRoomEmbed(srcE, rawUrl);
    if (!parsed.ok) {
      setPlaylistEmbedMsg("error", parsed.error || "Invalid embed URL.");
      pushNotice("orange", parsed.error || "Invalid embed URL.");
      return false;
    }
    plE.source = srcE;
    plE.embedUrl = parsed.embedUrl;
    plE.embedSrc = parsed.embedSrc;
    plE.embedTitle = parsed.embedTitle;
    plE.ownerControlsMusic = true;
    plE.loop = true;
    // Reset shared timeline so every client seeks from the same start.
    plE.startedAt = Date.now();
    if (typeof plE.ownerOnlyAdd !== "boolean") plE.ownerOnlyAdd = true;
    claimPlaylistOwnerIfNeeded(plE);
    savePlaylist(plE);
    lastMusicSyncKey = String(plE.embedSrc || "") + "|" + plE.startedAt + "|" + srcE;
    try {
      var dockForce = document.getElementById("room-embed-dock");
      if (dockForce) dockForce.removeAttribute("data-embed-src");
    } catch (eForce) {}
    playlistPanelOpen = true;
    playlistPanelDirty = true; // remount once to show Done success (modal only — dock iframe stays)
    paint("rooms");
    try { syncRoomAudio(); } catch (eSync) {}
    // Publish so other phones / tabs hear the same loop (server) or same-browser tabs (Pages).
    try { publishRoomMusicFromPlaylist(plE); } catch (ePub) {}
    var okMsg = srcE === "spotify"
      ? "Embed set — everyone in this loft hears the same loop (synced). Press play in the dock."
      : "Embed set — everyone in this loft hears the same loop (synced). YouTube will loop.";
    setPlaylistEmbedMsg("ok", okMsg);
    pushNotice("green", "Room music set — shared soundtrack published. Tap Done to keep listening.", { transient: true });
    return true;
  }
  function ensurePlaylistPanel() {
    // How this works: Room music is a full-screen modal sheet on #app (outside #main).
    // Beginner: dim backdrop + card; stays open until Close / backdrop / leave / clearStrayUI.
    // ENGINE DEV: do NOT replaceChild on every paint — only when playlistPanelDirty (or first mount).
    // Ignore strict data-tab==="rooms" when inRoom && playlistPanelOpen (tab attr can flicker).
    // Never remount while dirty+focused; clear dirty without remount (stops blur→wipe Bug A).
    var app = document.getElementById("app");
    var existing = document.getElementById("room-playlist-panel");
    var keepOpen = !!(playlistPanelOpen && inRoom && session());
    if (!app || !keepOpen) {
      if (existing) existing.remove();
      playlistPanelDirty = false;
      return null;
    }
    // Drop any copy that landed under #main from an old paint.
    try {
      var main = document.getElementById("main");
      if (main) {
        var stray = main.querySelector("#room-playlist-panel");
        if (stray && stray !== existing) stray.remove();
        if (existing && main.contains(existing)) existing.remove(), existing = null;
      }
    } catch (eStray) {}
    existing = document.getElementById("room-playlist-panel");
    // Keep live DOM when open + already mounted unless explicitly dirty.
    if (existing && existing.parentNode === app) {
      if (playlistPanelHasFocus()) {
        // Never remount while focused — clear dirty so blur does not wipe paste state.
        playlistPanelDirty = false;
        return existing;
      }
      if (!playlistPanelDirty) {
        return existing;
      }
    }
    var html = playlistPanel();
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    var next = wrap.firstChild;
    if (!next) return null;
    if (existing && existing.parentNode) {
      existing.parentNode.replaceChild(next, existing);
    } else {
      var dock = document.getElementById("room-embed-dock");
      var bar = document.getElementById("chat-form");
      if (dock && dock.parentNode === app) {
        if (dock.nextSibling) app.insertBefore(next, dock.nextSibling);
        else app.appendChild(next);
      } else if (bar) app.insertBefore(next, bar);
      else app.appendChild(next);
    }
    playlistPanelDirty = false;
    return document.getElementById("room-playlist-panel");
  }

  function syncRoomAudio() {
    // How this works: local → <audio>; youtube/spotify → #room-embed-dock iframe; pause local when not local.
    // Beginner: closing the Room music modal does NOT call this teardown — only leave/local-switch does.
    // ENGINE DEV: single-track sets audio.loop=true; multi-track uses playlistNext on ended for continuous play.
    // How this works (20260906af): mute-safe — when muted, unload local src and skip embed mount (do not fetch).
    // Beginner: Mute never breaks the room; Unmute loads music again from the saved playlist.
    var a = ensureRoomAudioEl();
    a.muted = !!roomAudioMuted;
    try { a.volume = roomAudioMuted ? 0 : Math.max(0, Math.min(1, roomAudioVolume)); } catch (eVol) {}
    var pl = loadPlaylist();
    var src = normalizePlaylistSource(pl.source);
    if (!inRoom) {
      try { a.pause(); } catch (e) {}
      removeRoomEmbedDock();
      try { updateRoomMusicChip(); } catch (eOut) {}
      return;
    }
    if (src !== "local") {
      try { a.pause(); a.removeAttribute("src"); a.removeAttribute("data-track-id"); a.loop = false; } catch (eHide) {}
      a.style.display = "none";
      ensureRoomEmbedDock(pl); // no-ops / removes dock when muted
      musicGestureNeeded = false;
      var btnHide = document.getElementById("music-gesture-btn");
      if (btnHide) btnHide.hidden = true;
      try { updateRoomMusicChip(); } catch (eEmb) {}
      return;
    }
    removeRoomEmbedDock();
    a.style.display = "none";
    var track = pl.tracks[pl.current];
    if (!track || !track.dataUrl) {
      try { a.pause(); a.removeAttribute("src"); a.loop = false; } catch (e2) {}
      try { updateRoomMusicChip(); } catch (eEmpty) {}
      return;
    }
    // Mute-safe local: do not assign src while muted (classic — muted means do not load the track).
    if (roomAudioMuted) {
      try { a.pause(); a.removeAttribute("src"); a.removeAttribute("data-track-id"); a.loop = false; } catch (eMuteLocal) {}
      musicGestureNeeded = false;
      try { updateRoomMusicChip(); } catch (eMuteChip) {}
      return;
    }
    // Single track → native loop; queue → playlistNext wraps (already continuous).
    a.loop = pl.tracks.length === 1;
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
        try { updateRoomMusicChip(); } catch (eOk) {}
      }).catch(function () {
        musicGestureNeeded = true;
        var btn2 = document.getElementById("music-gesture-btn");
        if (btn2) btn2.hidden = false;
        try { updateRoomMusicChip(); } catch (eNeed) {}
      });
    } else {
      try { updateRoomMusicChip(); } catch (eSyncChip) {}
    }
  }
  function playlistNext(fromEnded) {
    // How this works: advance local queue once (no double pl.current++).
    // Beginner: Next / track-ended both call this; click handler must not increment again.
    // ENGINE DEV: set playlistPanelDirty so ensurePlaylistPanel can refresh "Now playing" once.
    var pl = loadPlaylist();
    if (normalizePlaylistSource(pl.source) !== "local") return;
    if (!pl.tracks.length) return;
    pl.current = (pl.current + 1) % pl.tracks.length; // once only — do not increment again in the click handler
    savePlaylist(pl);
    playlistPanelDirty = true;
    if (playlistPanelOpen && inRoom) paint("rooms");
    else syncRoomAudio();
  }
  function playlistPanel() {
    // How this works: one clear mobile path — paste URL (auto-detect) OR pick tab → Set embed → Done.
    // Beginner: Done / Close only hide this sheet; the dock keeps playing (and YouTube loops).
    // ENGINE DEV: no second preview iframe here (that remounted a competing player). Dock owns the live iframe.
    var pl = loadPlaylist();
    var canCtrl = canControlRoomMusic();
    var canAddLocal = canCtrl || !pl.ownerOnlyAdd;
    var src = normalizePlaylistSource(pl.source);
    var music = myMusicStuff();
    var rows = pl.tracks.length
      ? pl.tracks.map(function (t, i) {
          var now = i === pl.current;
          return '<div class="playlist-row' + (now ? " is-playing" : "") + '">'
            + (now ? "<b>" : "") + esc(t.name || "Track") + (now ? "</b>" : "")
            + ' <span class="meta">by ' + esc(t.by || "?") + '</span>'
            + (canCtrl ? (' <button type="button" class="text-btn" data-playlist-play="' + i + '">Play</button>'
              + ' <button type="button" class="text-btn" data-playlist-remove="' + i + '">Remove</button>') : "")
            + '</div>';
        }).join("")
      : '<p class="meta">Playlist empty. Add a track from My Music (Stuff → Music).</p>';
    var addOpts = music.length
      ? music.map(function (m) {
          return '<option value="' + esc(m.id) + '">' + esc(m.name || "Untitled") + '</option>';
        }).join("")
      : "";
    var sourceTabs = '<div class="section-label">Music source</div>'
      + '<div class="playlist-source-tabs" role="tablist">'
      +   '<button type="button" class="action-btn' + (src === "local" ? " is-on" : "") + '" data-playlist-source="local"' + (canCtrl ? "" : " disabled") + '>My uploads</button>'
      +   '<button type="button" class="action-btn' + (src === "youtube" ? " is-on" : "") + '" data-playlist-source="youtube"' + (canCtrl ? "" : " disabled") + '>YouTube</button>'
      +   '<button type="button" class="action-btn' + (src === "spotify" ? " is-on" : "") + '" data-playlist-source="spotify"' + (canCtrl ? "" : " disabled") + '>Spotify</button>'
      + '</div>'
      + (canCtrl
          ? '<p class="meta playlist-flow-hint">Paste a link (auto-detects YouTube / Spotify) or pick a tab, then tap <b>Set embed</b>.</p>'
          : '<p class="meta owner-music-note">Owner controls room music — you can listen, but only the loft owner changes source or embeds.</p>');
    var localBody = ''
      +   '<div class="playlist-now">'
      +     (pl.tracks[pl.current]
            ? ('Now playing: <b>' + esc(pl.tracks[pl.current].name || "Track") + '</b> <span class="meta">(loops)</span>')
            : "Nothing playing.")
      +   '</div>'
      +   '<div class="playlist-controls">'
      +     '<button type="button" class="action-btn" id="music-gesture-btn"' + (musicGestureNeeded ? "" : " hidden") + ' data-music-gesture="1">Click to play room music</button>'
      +     (canCtrl ? '<button type="button" class="action-btn" data-playlist-next="1">Next</button>' : "")
      +     '<button type="button" class="action-btn" data-room-mute="1">' + (roomAudioMuted ? "Unmute" : "Mute") + '</button>'
      +   '</div>'
      +   '<div class="section-label">Queue (' + pl.tracks.length + '/99)</div>'
      +   '<div class="playlist-list">' + rows + '</div>'
      +   (canCtrl
          ? ('<label class="check-row"><input type="checkbox" data-playlist-owner-only="1"' + (pl.ownerOnlyAdd ? " checked" : "") + ' /> Only owner may add local tracks</label>')
          : ('<p class="meta">' + (pl.ownerOnlyAdd ? "Owner locked local adds." : "Guests may add local tracks (uploads only).") + '</p>'))
      +   (canAddLocal && src === "local"
          ? ('<div class="section-label">Add from My Music</div>'
            + (music.length
              ? ('<form id="playlist-add-form" class="playlist-add-form">'
                + '<select name="stuffId" required><option value="">— pick a track —</option>' + addOpts + '</select>'
                + '<button type="submit">Add to playlist</button></form>')
              : '<p class="meta">No Music in Stuff yet. Stuff → Music → Upload… (MP3/WAV/OGG; copyright checkbox required).</p>'))
          : (src === "local" ? '<p class="meta">Local adds locked to loft owner.</p>' : ""))
      + (canCtrl && src === "local"
          ? ('<div class="section-label">Or paste YouTube / Spotify</div>'
            + '<form id="playlist-smart-embed-form" class="playlist-embed-form">'
            + '<input name="embedUrl" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" required class="playlist-embed-url" placeholder="Paste YouTube or Spotify link" />'
            + '<button type="button" class="action-btn playlist-set-embed-btn" data-playlist-set-embed="1">Set embed</button></form>'
            + '<p id="playlist-embed-msg" class="playlist-embed-msg" role="status" aria-live="polite"></p>')
          : "")
      + '<button type="button" class="action-btn playlist-done-btn" data-playlist-close="1">Done — keep playing</button>';
    var embedOpen = pl.embedUrl
      ? ('<a class="text-btn room-embed-open" href="' + esc(pl.embedUrl) + '" target="_blank" rel="noopener noreferrer">'
        + (src === "spotify" ? "Open on Spotify" : "Open on YouTube") + '</a>')
      : "";
    var hasEmbed = !!pl.embedSrc;
    var embedBody = ''
      + (canCtrl
          ? ('<form id="playlist-embed-form" class="playlist-embed-form">'
            + '<label class="section-label" for="playlist-embed-url-input">Paste link</label>'
            + '<input id="playlist-embed-url-input" name="embedUrl" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" required class="playlist-embed-url" placeholder="' + (src === "youtube" ? "Paste YouTube link" : "Paste Spotify link") + '" value="' + esc(pl.embedUrl || "") + '" />'
            + '<button type="button" class="action-btn playlist-set-embed-btn" data-playlist-set-embed="1">Set embed</button></form>'
            + '<p id="playlist-embed-msg" class="playlist-embed-msg" role="status" aria-live="polite"></p>')
          : '<p class="meta">Owner controls room music — you hear their embed automatically (no paste needed).</p>')
      + (hasEmbed
          ? ('<div class="playlist-embed-success">'
            + '<p class="meta"><b>Playing in the dock</b> · ' + esc(pl.embedTitle || src) + (embedOpen ? (' · ' + embedOpen) : "") + '</p>'
            + '<p class="meta">' + (src === "spotify"
                ? "Spotify loops via its own player."
                : "YouTube loops in the background after you press play.") + '</p>'
            + '<button type="button" class="action-btn playlist-done-btn" data-playlist-close="1">Done — keep playing</button>'
            + '</div>')
          : '<p class="meta">No embed set yet — paste a link and tap Set embed.</p>')
      + '<div class="playlist-controls playlist-embed-mute-row">'
      +   '<button type="button" class="action-btn" data-room-mute="1">' + (roomAudioMuted ? "Unmute" : "Mute") + '</button>'
      + '</div>'
      + '<p class="meta legal-embed-note">Embedded players use YouTube/Spotify’s own embeds. Respect their ToS; Whirled2 does not host that audio. Local uploads still require you own the rights. Closing this sheet does not stop music.</p>';
    return '<div class="room-music-modal" id="room-playlist-panel" data-playlist-backdrop="1" role="dialog" aria-modal="true" aria-label="Room music">'
      + '<div class="room-music-card panel" data-playlist-card="1">'
      +   '<div class="room-side-head"><h2>Room music</h2>'
      +     '<button type="button" class="text-btn" data-playlist-close="1">Close</button></div>'
      +   '<p class="meta">Everyone in this loft hears the same loop (synced). Music keeps playing after Close — the dock under the room holds the player.</p>'
      +   musicSyncMetaHtml()
      +   sourceTabs
      +   (src === "local" ? localBody : embedBody)
      + '</div></div>';
  }

  var STUFF_CATS = [
    // How this works: wiki Stuff rail categories. howBlurb = empty-state “How do I get stuff?”
    { id: "avatars", label: "Avatars", empty: "You have no avatars yet.", how: "Avatars are how you look in rooms. Add Whirl (idle+walk) or upload idle+walk PNGs / .aseprite. Wear, then click the loft floor to walk — not Ruffle. Classic Flash upload is Experimental (see Classic panel) — STUFF-AVATARS.md / AVATAR-IMPORT.md." },
    { id: "furniture", label: "Furniture", empty: "You have no furniture yet.", how: "Furniture fills your loft. Upload a named piece with optional thumb, then Decorate Room to place chips." },
    { id: "backdrops", label: "Backdrops", empty: "You have no backdrops yet.", how: "Backdrops set the room scene. Upload an image you have rights to, then place it while decorating." },
    { id: "toys", label: "Toys", empty: "You have no toys yet.", how: "Toys are playful room items. Create your own stub here — no fake catalog fillers." },
    { id: "pets", label: "Pets", empty: "You have no pets yet.", how: "Pets were classic companions. Stub upload only for now; engine pets come later." },
    { id: "games", label: "Games", empty: "You have no games yet.", how: "Games you own appear here. Publish under Games tab / whirled2.games — never invent titles." },
    { id: "launchers", label: "Launchers", empty: "You have no launchers yet.", how: "Launchers start games from rooms (classic shop “Games”). Upload stub or list later." },
    { id: "levelpacks", label: "Level Packs", empty: "You have no level packs yet.", how: "Level packs extend games. Empty until you create or receive one." },
    { id: "itempacks", label: "Item Packs", empty: "You have no item packs yet.", how: "Item packs bundle content for games. Empty until you upload or are gifted one." },
    { id: "images", label: "Images", empty: "You have no images yet.", how: "Images for galleries and decorate. Upload png/jpg/gif/webp you have rights to." },
    { id: "music", label: "Music", empty: "You have no music yet.", how: "Music goes on the room playlist. Upload MP3/WAV/OGG you own (copyright checkbox required)." },
    { id: "videos", label: "Videos", empty: "You have no videos yet.", how: "Videos are a classic Stuff shelf. Stub upload for now — no invented clips." }
  ];
  var stuffCat = "avatars";
  var stuffItemId = null;
  var stuffMode = "browse"; // browse | upload | detail | edit
  var avatarGuideOpen = false; // in-site creator guide (?v=20260906ar)
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
  var playlistPanelOpen = false; // Room menu → View room music
  // How this works: lobby tile opens a preview sheet FIRST — inRoom stays false until Enter.
  // Beginner: Cancel closes the sheet; Enter runs tryEnterLoft (+ optional soft curtain).
  // ENGINE DEV: preview is chrome modal on #app — never mounts Pixi / #stage-slot early.
  var roomPreviewOpen = false;
  var roomPreviewId = null; // "loft" today; future room ids later
  var roomEnterCurtainTimer = null;
  // How this works: playlistPanelDirty = true when source/embed/mute/queue changes so ensurePlaylistPanel may rebuild once.
  // Modal never closes on focus loss / paint — only Close, backdrop, leave room, clearStrayUI.
  // Beginner: while you are typing/pasting a link, the panel HTML is never replaced (keyboard stays up).
  // ENGINE DEV: set dirty before paint(); clear after successful remount; Close/leave/clearStrayUI remove the node.
  var playlistPanelDirty = false;
  // How this works: #room-embed-dock lives in shell() outside #main — paint never destroys the iframe.
  // Beginner: Open player sticks open across mute / YouTube↔Spotify taps until you Close player or leave.
  // ENGINE DEV: roomEmbedExpanded + CSS is-expanded (fixed sheet inside #app). Never reparent to body.
  var roomEmbedExpanded = false;
  var occFilterQ = ""; // optional occupant rail filter when >5 people
  var roomItemsPanelOpen = false; // Room menu → View items
  var decorateMode = false;
  // How this works (?v=20260906at): selected decorate chip for Make Door / Drop Door.
  // Beginner: tap a chip while decorating → Make Door panel; outside decorate, doors travel.
  var selectedDecId = null;
  var doorGlowPreview = false; // Room menu → View clickable furniture (green door glow)
  var makeDoorPanelOpen = false; // side panel when linking/creating via a door chip
  var partyPanelOpen = false;
  var hangoutInvitePending = null; // [{id,name},…] after leave loft (real occupants only)
  var loftVisitOccupants = []; // session occupants seen this loft visit
  var helpOpen = false;
  var legalOpen = false; // Help → Legal / Disclaimer
  var devHubOpen = false; // Developer Information Hub (?v=20260906au) — #dev / #docs / ?page=dev
  var musicGestureNeeded = false; // browser blocked autoplay — show Click to play
  // How this works (20260906af): mute + volume prefs persist in localStorage.
  // Beginner: Mute remembers across reloads; volume slider is 0–100%.
  // ENGINE DEV: mute-safe load skips mounting audio/embed when muted (classic wiki Music).
  var ROOM_MUTE_KEY = "whirled2.roomMute";
  var ROOM_VOL_KEY = "whirled2.roomVolume"; // 0..1 float
  function loadRoomMutedPref() {
    try { return localStorage.getItem(ROOM_MUTE_KEY) === "1"; } catch (e) { return false; }
  }
  function saveRoomMutedPref(on) {
    try { localStorage.setItem(ROOM_MUTE_KEY, on ? "1" : "0"); } catch (e) {}
  }
  function loadRoomVolumePref() {
    try {
      var v = parseFloat(localStorage.getItem(ROOM_VOL_KEY));
      if (isNaN(v)) return 0.7;
      return Math.max(0, Math.min(1, v));
    } catch (e) { return 0.7; }
  }
  function saveRoomVolumePref(v) {
    try { localStorage.setItem(ROOM_VOL_KEY, String(Math.max(0, Math.min(1, Number(v) || 0)))); } catch (e) {}
  }
  var roomAudioMuted = loadRoomMutedPref();
  var roomAudioVolume = loadRoomVolumePref();
  var roomShareOpen = false; // Share / embed room popup
  var volPopoverOpen = false; // toolbar volume slider popover
  var stuffListMode = false; // show list form on stuff detail
  var FEED = [];
  var GROUPS_KEY = "whirled2.groups";
  var FAV_KEY = "whirled2.favorites";
  var SHOP_RATINGS_KEY = "whirled2.shopRatings";
  var ROOM_LOCK_KEY = "whirled2.roomLock.loft";
  var PROFILE_SKIN_KEY = "whirled2.profileSkin."; // + userId — Profile look / Whirled profile themes (no music)
  var ROOM_RATING_KEY = "whirled2.roomRating.loft";
  var ROOM_COMMENTS_KEY = "whirled2.roomComments.loft";
  var GAMES_KEY = "whirled2.games";
  var GAME_TABLES_KEY = "whirled2.gameTables";
  var GAME_FAV_KEY = "whirled2.gameFavorites";
  var GAME_SCORES_KEY = "whirled2.gameScores"; // local high-score stub {gameId,name,score,at}[]
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
  var gamesMode = "browse"; // browse | detail | lobby | scores | avr
  var gameViewId = null;
  var gameDetailTab = "play"; // play | watch | tables | comments
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

  // ---------------------------------------------------------------------------
  // Stuff sprite avatars (Aseprite / PNG packs) — classic Stuff feel without SWF
  // Beginner: Upload PNG/WebP or Add user packs → Wear Whirl → click loft floor to walk.
  // ENGINE DEV: #avatar-wear-layer is chrome overlay sibling of #stage-slot (not Ruffle).
  // Unified pack JSON: { name, states:{idle,walk,stand,pose}, thumb, source:"aseprite-unified" }.
  // Lab SWF path stays locked. Chrome click-to-walk yields when Pixi mountWhirledEngine owns stage.
  // ---------------------------------------------------------------------------
  var WORN_AVATAR_KEY = "whirled2.wornAvatar";
  var USER_PACK_SEEDED_KEY = "whirled2.userPackSeeded";
  var USER_PACK_INDEX = "./assets/avatars/user-pack/index.json?v=" + LOGO_V;

  function loadWornAvatar() {
    // How this works: Wear writes a small JSON { stuffId, name, thumb, preview, frames, source }.
    // Beginner (?v=20260906ap): normalize relative PNG paths so Whirl always shows in the loft.
    try {
      var raw = JSON.parse(localStorage.getItem(WORN_AVATAR_KEY) || "null");
      if (!raw || typeof raw !== "object") return null;
      return normalizeWornAvatar(raw);
    } catch (e) { return null; }
  }
  function saveWornAvatar(row) {
    if (!row) {
      localStorage.removeItem(WORN_AVATAR_KEY);
      return;
    }
    localStorage.setItem(WORN_AVATAR_KEY, JSON.stringify(row));
  }
  function absolutizeMediaUrl(url, packPath) {
    // How this works (?v=20260906ap): pack.json uses relative paths like frames/idle/frame_00.png.
    // Beginner: the loft page is /web-mock/ — relative frames 404 and the avatar looks "missing".
    // Always make Stuff/Wear URLs start with ./assets… (or keep http/data).
    // ENGINE DEV: Pixi should receive the same absolute-ish asset URLs from getWornAvatar().
    var u = String(url || "").trim();
    if (!u) return "";
    if (/^(https?:|data:|blob:)/i.test(u)) return u;
    if (u.indexOf("./") === 0 || u.indexOf("/") === 0) {
      return u.indexOf("?") >= 0 ? u : (u + "?v=" + LOGO_V);
    }
    var base = String(packPath || "").replace(/^\.\//, "");
    if (base && base.slice(-1) !== "/") base += "/";
    var full = "./" + base + u.replace(/^\.\//, "");
    return full.indexOf("?") >= 0 ? full : (full + "?v=" + LOGO_V);
  }
  function absolutizeStateMap(states, packPath) {
    if (!states || typeof states !== "object") return null;
    var out = {};
    Object.keys(states).forEach(function (k) {
      var st = states[k] || {};
      out[k] = {
        frames: (st.frames || []).map(function (f) { return absolutizeMediaUrl(f, packPath); }).filter(Boolean),
        frameDurationsMs: (st.frameDurationsMs || []).slice()
      };
    });
    return out;
  }
  function normalizeWornAvatar(raw) {
    // Repair older Wear rows that stored relative frame paths (invisible in loft).
    // How this works (?v=20260906at+au): keep swfUrl / mediaKind hooks for parallel Ruffle lab — do not strip.
    if (!raw || typeof raw !== "object") return raw;
    var path = raw.packPath || "";
    if (raw.slug && !path) path = "assets/avatars/user-pack/" + raw.slug + "/";
    // ENGINE DEV (au): classic SWF wear may set swfUrl + mediaKind:"swf". Absolutize without mounting Ruffle here.
    if (raw.swfUrl) raw.swfUrl = absolutizeMediaUrl(raw.swfUrl, path) || raw.swfUrl;
    if (raw.preview) raw.preview = absolutizeMediaUrl(raw.preview, path);
    if (raw.thumb) raw.thumb = absolutizeMediaUrl(raw.thumb, path);
    if (raw.frames && raw.frames.length) {
      raw.frames = raw.frames.map(function (f) { return absolutizeMediaUrl(f, path); }).filter(Boolean);
    }
    if (raw.states) raw.states = absolutizeStateMap(raw.states, path);
    // If frames still empty, fall back to preview so loft always shows something.
    if (!(raw.frames && raw.frames.length) && raw.preview) raw.frames = [raw.preview];
    if (raw.states && raw.states.idle && !(raw.states.idle.frames && raw.states.idle.frames.length) && raw.preview) {
      raw.states.idle.frames = [raw.preview];
    }
    // How this works (?v=20260906aq): older Wear rows mapped wave PNGs as idle (constant waving).
    // Beginner: if idle frames still live under frames/idle/, treat them as wave and calm idle = pose.
    // ENGINE DEV: same repair keeps getWornAvatar() honest for Pixi until users re-Wear.
    try { repairWornAvatarStates(raw); } catch (eRep) {}
    return raw;
  }
  function repairWornAvatarStates(raw) {
    if (!raw || !raw.states) return raw;
    if (!raw.artFaces && (raw.slug === "cyan-hair" || /cyan-hair/i.test(String(raw.packPath || "")))) {
      raw.artFaces = "left";
    }
    var idle0 = (raw.states.idle && raw.states.idle.frames && raw.states.idle.frames[0]) || "";
    var looksWaveFolder = /\/frames\/idle\//.test(String(idle0));
    if (looksWaveFolder && !raw.states.wave) {
      raw.states.wave = {
        frames: (raw.states.idle.frames || []).slice(),
        frameDurationsMs: (raw.states.idle.frameDurationsMs || [220, 220]).slice()
      };
      if (raw.states.pose && raw.states.pose.frames && raw.states.pose.frames.length) {
        raw.states.idle = {
          frames: raw.states.pose.frames.slice(),
          frameDurationsMs: (raw.states.pose.frameDurationsMs || [400, 400]).slice()
        };
      }
      raw.frames = (raw.states.idle.frames || raw.frames || []).slice();
      raw.frameDurationsMs = (raw.states.idle.frameDurationsMs || []).slice();
      if (raw.state === "wave" || !raw.state) raw.state = "idle";
      // If stuck on wave from a previous bug, calm down on load.
      if (raw.state === "wave") raw.state = "idle";
    }
    // Sit emote from stand folder art (char-c was a sit).
    if (!raw.states.sit && raw.states.stand && raw.states.stand.frames && raw.states.stand.frames.length) {
      var st0 = String(raw.states.stand.frames[0] || "");
      if (/\/frames\/stand\//.test(st0)) {
        raw.states.sit = {
          frames: raw.states.stand.frames.slice(),
          frameDurationsMs: (raw.states.stand.frameDurationsMs || [833]).slice()
        };
        if (raw.states.pose && raw.states.pose.frames && raw.states.pose.frames[0]) {
          raw.states.stand = {
            frames: [raw.states.pose.frames[0]],
            frameDurationsMs: [833]
          };
        }
      }
    }
    if (!raw.states.happy && raw.states.pose && raw.states.pose.frames && raw.states.pose.frames.length) {
      raw.states.happy = {
        frames: raw.states.pose.frames.slice().reverse(),
        frameDurationsMs: [280, 280].slice(0, raw.states.pose.frames.length)
      };
    }
    return raw;
  }
  function resolveAvatarStates(item) {
    // How this works: unified packs expose states{idle,walk,...}; legacy packs = idle-only from frames.
    // Beginner: Whirl has idle + walk so click-to-walk can animate. Parts stay optional.
    // ENGINE DEV: same shape Pixi Player should later consume from pack.json.
    var states = null;
    if (item && item.states && typeof item.states === "object") states = item.states;
    else if (item && item.pack && item.pack.states) states = item.pack.states;
    var packPath = (item && (item.packPath || (item.slug ? ("assets/avatars/user-pack/" + item.slug + "/") : ""))) || "";
    if (states) {
      return absolutizeStateMap(states, packPath) || { idle: { frames: [], frameDurationsMs: [] } };
    }
    var frames = [];
    if (item && item.frames && item.frames.length) frames = item.frames.slice();
    else if (item && item.pack && item.pack.displayFrames) frames = item.pack.displayFrames.slice();
    else if (item && item.pack && item.pack.frames) frames = item.pack.frames.slice();
    else if (item && (item.preview || item.thumb)) frames = [item.preview || item.thumb];
    frames = frames.map(function (f) { return absolutizeMediaUrl(f, packPath); }).filter(Boolean);
    var durs = (item && item.pack && item.pack.frameDurationsMs) || (item && item.frameDurationsMs) || [];
    return { idle: { frames: frames, frameDurationsMs: durs.slice() } };
  }
  function wearStuffAvatar(item) {
    // How this works: classic Use / Wear — stores preview + states for loft billboard / walk.
    // Why: SWF/Ruffle still on hold; sprite pack is the modern path until engine Ruffle.
    if (!item) return false;
    var preview = item.preview || item.thumb || "";
    if (!preview && item.pack && item.pack.preview) preview = item.pack.preview;
    var states = resolveAvatarStates(item);
    var idle = states.idle || states.stand || { frames: [], frameDurationsMs: [] };
    var frames = [];
    if (idle.frames && idle.frames.length) frames = idle.frames.slice();
    else if (item.frames && item.frames.length) frames = item.frames.slice();
    else if (item.pack && item.pack.displayFrames) frames = item.pack.displayFrames.slice();
    else if (item.pack && item.pack.frames) frames = item.pack.frames.slice();
    else if (preview) frames = [preview];
    var packPath = item.packPath || (item.slug ? ("assets/avatars/user-pack/" + item.slug + "/") : "");
    // Beginner (?v=20260906aq): copy artFaces so loft flip matches how the PNGs were drawn.
    // ENGINE DEV: artFaces "left" means native sprites face left — flip when walking right.
    var artFaces = item.artFaces || (item.pack && item.pack.artFaces) || "";
    var row = {
      stuffId: item.id,
      name: item.name || "Avatar",
      thumb: absolutizeMediaUrl(item.thumb || preview || "", packPath),
      preview: absolutizeMediaUrl(preview || item.thumb || "", packPath),
      frames: (frames || []).map(function (f) { return absolutizeMediaUrl(f, packPath); }).filter(Boolean),
      frameDurationsMs: (idle.frameDurationsMs && idle.frameDurationsMs.length)
        ? idle.frameDurationsMs.slice()
        : ((item.pack && item.pack.frameDurationsMs) || item.frameDurationsMs || []),
      states: absolutizeStateMap(states, packPath) || states,
      state: "idle",
      artFaces: artFaces || undefined,
      source: item.source || (item.pack && item.pack.source) || "png",
      packPath: packPath,
      slug: item.slug || (item.pack && item.pack.slug) || "",
      at: new Date().toISOString()
    };
    if (!(row.frames && row.frames.length) && row.preview) row.frames = [row.preview];
    // ---- MERGE NOTE (?v=20260906ax): classic Flash enrich via src/classic-avatar.js ----
    // Beginner: copies swfSha1 / swfDataUrl / classicFlashOptIn onto the worn row for Ruffle loft.
    // ENGINE DEV: still chrome #avatar-wear-layer / #avatar-ruffle-host — never #stage-slot.
    try {
      if (window.WhirledClassicAvatar && WhirledClassicAvatar.enrichWornRow) {
        row = WhirledClassicAvatar.enrichWornRow(row, item);
      } else {
        if (item.swfSha1) row.swfSha1 = item.swfSha1;
        if (item.swfDataUrl) row.swfDataUrl = item.swfDataUrl;
        if (item.swfUrl) row.swfUrl = item.swfUrl;
        if (item.swfName) row.swfName = item.swfName;
        row.classicFlashOptIn = !!(item.classicFlashOptIn || (item.pack && item.pack.classicFlashOptIn));
        if (row.classicFlashOptIn && (row.swfDataUrl || row.swfUrl || row.swfSha1)) {
          row.mediaKind = "swf";
          if (row.swfDataUrl && !row.swfUrl) row.swfUrl = row.swfDataUrl;
        }
      }
      if (row.classicFlashOptIn && (row.swfDataUrl || row.swfUrl)) {
        row.mediaKind = "swf";
        if (!row.swfUrl) row.swfUrl = row.swfDataUrl;
      }
    } catch (eClassicWear) {}
    saveWornAvatar(normalizeWornAvatar(row));
    pushRecentAvatarId(item.id);
    return true;
  }
  function isWornStuffId(id) {
    var w = loadWornAvatar();
    return !!(w && w.stuffId === id);
  }
  function avatarWearLayerHtml() {
    // How this works: billboard sprite in the room chrome (like item in your space).
    // Beginner: if nothing Worn yet, show classic default tofu so the loft isn’t empty.
    // ENGINE DEV: layer stays pointer-events none; billboard is clickable for emotes (?v=20260906aq).
    // Click-to-walk still binds on .stage-host (floor). Avatar click stopPropagation.
    // When Pixi mountWhirledEngine owns #stage-slot, chrome walk disables (see bindChromeClickToWalk).
    // How this works (?v=20260906at+au): if worn.swfUrl / mediaKind==="swf", leave a Ruffle mount hook
    // (#avatar-ruffle-host) for the parallel Flash lab — PNG path unchanged when frames exist.
    var worn = loadWornAvatar();
    if (!worn) worn = makeTofuWornRow();
    var scale = loadAvatarScale(worn.stuffId || TOFU_AVATAR_ID);
    var isTofu = !!(worn.isTofu || worn.stuffId === TOFU_AVATAR_ID || worn.source === "tofu");
    var x = (typeof worn.xPct === "number" && isFinite(worn.xPct)) ? worn.xPct : 50;
    var face = worn.face === -1 ? -1 : 1;
    var posStyle = "--wear-scale:" + scale + ";--wear-x:" + x + "%;--wear-face:" + face + ";";
    var isSwf = !!(worn.swfUrl || worn.mediaKind === "swf" || worn.kind === "swf");
    // ---- MERGE NOTE (?v=20260906ay): hybrid PNG walk preferred; Ruffle loft only if Force / SWF-only ----
    var wantsClassic = !!(worn.classicFlashOptIn || worn.useClassicFlash
      || (window.WhirledClassicAvatar && WhirledClassicAvatar.itemWantsClassicFlash && WhirledClassicAvatar.itemWantsClassicFlash(worn)));
    var forceRuffleLoft = !!(worn.forceRuffleInLoft
      || (window.WhirledClassicAvatar && WhirledClassicAvatar.forceRuffleInLoft && WhirledClassicAvatar.forceRuffleInLoft(worn)));
    var hasPngFrames = !!(worn.frames && worn.frames.length) || !!worn.preview
      || !!(worn.states && ((worn.states.idle && worn.states.idle.frames && worn.states.idle.frames.length)
        || (worn.states.walk && worn.states.walk.frames && worn.states.walk.frames.length)));
    // SWF-only (no PNG): transparent Ruffle host; pointer-events none; chrome moves billboard on floor click.
    if ((isSwf || wantsClassic) && (worn.swfUrl || worn.swfDataUrl || worn.swfSha1) && !hasPngFrames) {
      var swfAttr = esc(worn.swfUrl || worn.swfDataUrl || "");
      return '<div id="avatar-wear-layer" class="avatar-wear-layer is-on is-swf" aria-label="Classic Flash avatar (experimental)" data-swf-url="' + swfAttr + '" data-loft-mode="ruffle">'
        + '<div class="avatar-wear-billboard" data-avatar-hit="1" style="' + posStyle + '">'
        +   '<div id="avatar-ruffle-host" class="avatar-ruffle-host classic-ruffle-host is-loft" data-swf-url="' + swfAttr + '" title="Ruffle experimental — transparent; floor click moves you"></div>'
        +   '<div class="avatar-wear-nameplate">' + esc(worn.name || "SWF avatar")
        +   ' <span class="classic-exp-badge">Experimental</span></div>'
        + '</div></div>';
    }
    if (isTofu) {
      return '<div id="avatar-wear-layer" class="avatar-wear-layer is-on is-tofu" aria-label="Default tofu avatar">'
        + '<div class="avatar-wear-billboard" data-avatar-hit="1" style="' + posStyle + '">'
        +   tofuSvgHtml("tofu-avatar tofu-wear")
        +   '<div class="avatar-wear-nameplate">' + esc(worn.name || "Tofu") + '</div>'
        + '</div></div>';
    }
    worn = normalizeWornAvatar(worn) || worn;
    var stateName = worn.state || "idle";
    var st = (worn.states && (worn.states[stateName] || worn.states.idle)) || null;
    var frames = (st && st.frames && st.frames.length)
      ? st.frames
      : ((worn.frames && worn.frames.length) ? worn.frames : []);
    if (!frames.length && worn.preview) frames = [worn.preview];
    if (!frames.length && worn.thumb) frames = [worn.thumb];
    if (!frames.length) {
      // Last resort: show tofu instead of an empty invisible layer.
      return '<div id="avatar-wear-layer" class="avatar-wear-layer is-on is-tofu" aria-label="Avatar missing frames">'
        + '<div class="avatar-wear-billboard" data-avatar-hit="1" style="' + posStyle + '">'
        +   tofuSvgHtml("tofu-avatar tofu-wear")
        +   '<div class="avatar-wear-nameplate">' + esc(worn.name || "Avatar") + '</div>'
        + '</div></div>';
    }
    var src0 = frames[0];
    var durs = (st && st.frameDurationsMs) || worn.frameDurationsMs || [];
    var meta = ' data-wear-frames="' + esc(JSON.stringify(frames)) + '"'
      + ' data-wear-durs="' + esc(JSON.stringify(durs)) + '"'
      + ' data-wear-state="' + esc(stateName) + '"';
    // Hybrid (?v=20260906ay): PNG frames drive walk/emotes. Ruffle loft only if Force Ruffle.
    var classicSlot = "";
    var hybridBadge = "";
    var loftMode = "png";
    try {
      var hasSwf = !!(worn.swfUrl || worn.swfDataUrl || worn.swfSha1);
      if (hasSwf && wantsClassic) {
        if (forceRuffleLoft && window.WhirledClassicAvatar && WhirledClassicAvatar.classicWearSlotHtml) {
          classicSlot = WhirledClassicAvatar.classicWearSlotHtml(worn) || "";
          loftMode = "ruffle";
        } else if (forceRuffleLoft) {
          var swfU = esc(worn.swfUrl || worn.swfDataUrl || "");
          classicSlot = '<div id="avatar-ruffle-host" class="avatar-ruffle-host classic-ruffle-host is-loft" data-swf-url="' + swfU + '" title="Force Ruffle in loft"></div>';
          loftMode = "ruffle";
        } else {
          loftMode = "hybrid";
          if (window.WhirledClassicAvatar && WhirledClassicAvatar.classicHybridBadgeHtml) {
            hybridBadge = WhirledClassicAvatar.classicHybridBadgeHtml(worn) || "";
          } else {
            hybridBadge = '<span class="classic-hybrid-badge" title="PNG chrome walk; SWF for Stuff preview">Hybrid (smooth)</span>';
          }
        }
      } else if (window.WhirledClassicAvatar && WhirledClassicAvatar.classicWearSlotHtml) {
        classicSlot = WhirledClassicAvatar.classicWearSlotHtml(worn) || "";
      }
    } catch (eSlot) { classicSlot = ""; hybridBadge = ""; }
    var layerClass = "avatar-wear-layer is-on"
      + (loftMode === "hybrid" ? " is-swf-hybrid is-hybrid-smooth" : "")
      + (classicSlot ? " is-swf-hybrid" : "");
    var plateExtra = loftMode === "hybrid"
      ? (' ' + (hybridBadge || '<span class="classic-hybrid-badge">Hybrid (smooth)</span>'))
      : (classicSlot ? ' <span class="classic-exp-badge">Experimental</span>' : "");
    return '<div id="avatar-wear-layer" class="' + layerClass + '" aria-label="Worn avatar" data-loft-mode="' + loftMode + '">'
      + '<div class="avatar-wear-billboard" data-avatar-hit="1"' + meta + ' style="' + posStyle + '">'
      +   classicSlot
      +   '<img class="avatar-wear-sprite" src="' + src0 + '" alt="' + esc(worn.name || "Avatar") + '" />'
      +   '<div class="avatar-wear-nameplate">' + esc(worn.name || "Avatar") + plateExtra + '</div>'
      + '</div></div>';
  }
  function startAvatarWearAnim() {
    // Beginner: if the pack has multiple PNG frames, flip them like a tiny GIF.
    // ENGINE DEV: chrome walk may swap data-wear-frames between idle/walk via setAvatarState.
    var layer = document.getElementById("avatar-wear-layer");
    if (!layer || !layer.classList.contains("is-on")) return;
    var bill = layer.querySelector(".avatar-wear-billboard");
    var img = layer.querySelector(".avatar-wear-sprite");
    if (!bill || !img) return;
    var frames = [];
    var durs = [];
    try { frames = JSON.parse(bill.getAttribute("data-wear-frames") || "[]"); } catch (e1) { frames = []; }
    try { durs = JSON.parse(bill.getAttribute("data-wear-durs") || "[]"); } catch (e2) { durs = []; }
    if (layer._wearTimer) { try { clearInterval(layer._wearTimer); } catch (e3) {} layer._wearTimer = null; }
    if (!frames || frames.length < 2) {
      if (frames && frames[0]) img.src = frames[0];
      return;
    }
    var i = 0;
    img.src = frames[0];
    function tick() {
      i = (i + 1) % frames.length;
      img.src = frames[i];
    }
    var ms = (durs[0] > 0 ? durs[0] : 200);
    layer._wearTimer = setInterval(tick, ms);
  }

  // ---------------------------------------------------------------------------
  // Chrome click-to-walk (?v=20260906ao) — until Pixi owns the stage
  // Beginner: click the loft floor → avatar walks there (walk frames), then idles.
  // ENGINE DEV: when #stage-slot has canvas / [data-whirled-engine], chrome walk yields.
  // Do NOT put canvas in #avatar-wear-layer; keep walk as chrome overlay only.
  // ---------------------------------------------------------------------------
  var chromeWalkTarget = null; // { xPct, yPct, at } for WhirledChrome.getAvatarWalkTarget
  var chromeWalkRaf = 0;
  var chromeWalkBound = false;

  function isEngineMountedOnStage() {
    var slot = document.getElementById("stage-slot");
    if (!slot) return false;
    return !!(slot.querySelector("canvas") || slot.querySelector("[data-whirled-engine]"));
  }
  function setAvatarState(stateName) {
    // How this works: swap billboard frames to idle / walk / stand / pose without full paint.
    var worn = loadWornAvatar();
    if (!worn || worn.isTofu) return false;
    var states = worn.states || {};
    var name = String(stateName || "idle");
    if (!states[name] && name !== "idle") {
      if (name === "walk" && states.idle) name = "idle"; // graceful fallback
      else if (states.idle) name = "idle";
      else return false;
    }
    var st = states[name] || states.idle || { frames: worn.frames || [], frameDurationsMs: worn.frameDurationsMs || [] };
    worn.state = name;
    worn.frames = (st.frames || []).slice();
    worn.frameDurationsMs = (st.frameDurationsMs || []).slice();
    saveWornAvatar(worn);
    var layer = document.getElementById("avatar-wear-layer");
    var bill = layer && layer.querySelector(".avatar-wear-billboard");
    if (bill) {
      bill.setAttribute("data-wear-frames", JSON.stringify(worn.frames));
      bill.setAttribute("data-wear-durs", JSON.stringify(worn.frameDurationsMs));
      bill.setAttribute("data-wear-state", name);
    }
    try { startAvatarWearAnim(); } catch (e) {}
    return true;
  }
  function getAvatarWalkTarget() {
    return chromeWalkTarget ? { xPct: chromeWalkTarget.xPct, yPct: chromeWalkTarget.yPct, at: chromeWalkTarget.at } : null;
  }
  function showWalkTargetMarker(host, xPct, yPct) {
    // Classic soft white circle on the floor — optional feel, pointer-events none.
    if (!host) return;
    var m = host.querySelector(".chrome-walk-target");
    if (!m) {
      m = document.createElement("div");
      m.className = "chrome-walk-target";
      m.setAttribute("aria-hidden", "true");
      host.appendChild(m);
    }
    m.style.left = xPct + "%";
    m.style.top = yPct + "%";
    m.classList.add("is-on");
    if (m._hideT) { try { clearTimeout(m._hideT); } catch (e) {} }
    m._hideT = setTimeout(function () { m.classList.remove("is-on"); }, 900);
  }
  function applyWearBillboardPose(xPct, face) {
    var layer = document.getElementById("avatar-wear-layer");
    var bill = layer && layer.querySelector(".avatar-wear-billboard");
    if (!bill) return;
    if (typeof xPct === "number" && isFinite(xPct)) {
      bill.style.setProperty("--wear-x", xPct + "%");
    }
    if (face === 1 || face === -1) {
      bill.style.setProperty("--wear-face", String(face));
    }
  }
  function persistWearPose(xPct, face) {
    var worn = loadWornAvatar();
    if (!worn) return;
    if (typeof xPct === "number" && isFinite(xPct)) worn.xPct = Math.max(8, Math.min(92, xPct));
    if (face === 1 || face === -1) worn.face = face;
    saveWornAvatar(worn);
  }
  function chromeWalkTo(xPct, yPct) {
    // Animate billboard toward floor click. Walk frames while moving; idle on arrive.
    // How this works (?v=20260906ay): Hybrid PNG swaps walk frames; SWF-only still MOVES the billboard
    // (Ruffle pointer-events none). Stock SWF walk *animation* needs AvatarControl host — not chrome.
    if (isEngineMountedOnStage()) return; // ENGINE DEV: yield to Pixi
    var layer = document.getElementById("avatar-wear-layer");
    var bill = layer && layer.querySelector(".avatar-wear-billboard");
    if (!bill || !layer.classList.contains("is-on")) return;
    var worn = loadWornAvatar();
    if (!worn || worn.isTofu) return;
    xPct = Math.max(8, Math.min(92, xPct));
    yPct = Math.max(55, Math.min(92, yPct)); // floor band
    chromeWalkTarget = { xPct: xPct, yPct: yPct, at: new Date().toISOString() };
    var host = document.querySelector(".stage-host");
    showWalkTargetMarker(host, xPct, yPct);
    var cur = parseFloat((bill.style.getPropertyValue("--wear-x") || "50").replace("%", ""));
    if (!isFinite(cur)) cur = (typeof worn.xPct === "number" ? worn.xPct : 50);
    // How this works (?v=20260906aq): Whirl PNGs face LEFT (artFaces:"left").
    // Beginner: walking right needs a horizontal flip so they don't moonwalk.
    // ENGINE DEV: Pixi should read worn.artFaces the same way.
    var facesLeft = String(worn.artFaces || "").toLowerCase() === "left"
      || String(worn.slug || "") === "cyan-hair";
    var movingRight = xPct >= cur;
    var face = facesLeft ? (movingRight ? -1 : 1) : (movingRight ? 1 : -1);
    applyWearBillboardPose(cur, face);
    // Cancel any in-flight emote so walk owns the billboard.
    try { cancelAvatarEmoteTimer(); } catch (eEm0) {}
    setAvatarState((worn.states && worn.states.walk) ? "walk" : "idle");
    if (chromeWalkRaf) { try { cancelAnimationFrame(chromeWalkRaf); } catch (e) {} chromeWalkRaf = 0; }
    var start = cur;
    var dist = Math.abs(xPct - start);
    var speed = 28; // % per second — classic snappy walk
    var t0 = performance.now();
    function step(now) {
      if (isEngineMountedOnStage()) {
        setAvatarState("idle");
        chromeWalkRaf = 0;
        return;
      }
      var elapsed = (now - t0) / 1000;
      var travel = Math.min(dist, speed * elapsed);
      var dir = xPct >= start ? 1 : -1;
      var pos = start + dir * travel;
      applyWearBillboardPose(pos, face);
      if (travel >= dist - 0.15) {
        applyWearBillboardPose(xPct, face);
        persistWearPose(xPct, face);
        setAvatarState("idle");
        chromeWalkRaf = 0;
        return;
      }
      chromeWalkRaf = requestAnimationFrame(step);
    }
    chromeWalkRaf = requestAnimationFrame(step);
  }
  function onStageHostWalkClick(ev) {
    // Beginner: tap the floor (lower stage), not the chat strip / buttons.
    if (isEngineMountedOnStage()) return;
    if (decorateMode) return;
    var host = ev.currentTarget;
    if (!host || !host.classList.contains("stage-host")) return;
    // Ignore UI chrome inside the host (overlay history, buttons, decorate chips).
    // Beginner (?v=20260906aq): tapping the avatar opens emotes — do not start a walk.
    if (ev.target.closest("#chat-overlay, #stage-bubbles, .decorate-chip, button, a, input, textarea, select, .chrome-walk-target, [data-avatar-hit], .avatar-emote-menu")) return;
    var rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var xPct = ((ev.clientX - rect.left) / rect.width) * 100;
    var yPct = ((ev.clientY - rect.top) / rect.height) * 100;
    // Floor band ~ lower 45% of stage (classic loft floor).
    if (yPct < 52) return;
    ev.preventDefault();
    chromeWalkTo(xPct, yPct);
  }
  function bindChromeClickToWalk() {
    // How this works: one listener on .stage-host; no canvas in #stage-slot for chrome walk.
    // ENGINE DEV: if engine mounted, do not bind / remove listener so Pixi owns pointer.
    var host = document.querySelector(".stage-host");
    if (!host) return;
    if (isEngineMountedOnStage()) {
      if (host._chromeWalkBound) {
        host.removeEventListener("click", onStageHostWalkClick);
        host._chromeWalkBound = false;
        host.classList.remove("chrome-walk-ready");
      }
      return;
    }
    if (!host._chromeWalkBound) {
      host.addEventListener("click", onStageHostWalkClick);
      host._chromeWalkBound = true;
    }
    host.classList.add("chrome-walk-ready");
    chromeWalkBound = true;
  }
  // ---------------------------------------------------------------------------
  // Click avatar → emote menu (?v=20260906aq) — whirled.club-like actions
  // Beginner: tap your worn avatar (not the floor) → Wave / Sit / Pose / Happy.
  // Playing an emote plays once (short loop) then returns to idle. Floor click = walk.
  // ENGINE DEV: playAvatarEmote / listAvatarEmotes mirror pack states for Pixi later.
  // ---------------------------------------------------------------------------
  var chromeEmoteTimer = 0;
  var chromeEmoteMenuOpen = false;

  function cancelAvatarEmoteTimer() {
    if (chromeEmoteTimer) {
      try { clearTimeout(chromeEmoteTimer); } catch (e) {}
      chromeEmoteTimer = 0;
    }
  }
  function listAvatarEmotes(worn) {
    // How this works: map pack states to friendly labels. Skip walk/idle (not emotes).
    worn = worn || loadWornAvatar();
    if (!worn || worn.isTofu) return [];
    var states = worn.states || {};
    var order = [
      { key: "wave", label: "Wave" },
      { key: "dance", label: "Dance" },
      { key: "sit", label: "Sit" },
      { key: "happy", label: "Happy" },
      { key: "pose", label: "Pose" },
      { key: "stand", label: "Stand" }
    ];
    var out = [];
    order.forEach(function (row) {
      var st = states[row.key];
      if (st && st.frames && st.frames.length) out.push(row);
    });
    // If pack only has pose (no wave), still offer Pose.
    if (!out.length && states.pose && states.pose.frames && states.pose.frames.length) {
      out.push({ key: "pose", label: "Pose" });
    }
    return out;
  }
  function closeAvatarEmoteMenu() {
    chromeEmoteMenuOpen = false;
    var m = document.getElementById("avatar-emote-menu");
    if (m) m.remove();
  }
  function openAvatarEmoteMenu(anchorEl) {
    // Classic pale-blue action menu near the avatar billboard.
    closeAvatarEmoteMenu();
    var worn = loadWornAvatar();
    var emotes = listAvatarEmotes(worn);
    if (!emotes.length) {
      // Soft feedback when pack has no emote states.
      try { pushSystemChat("This avatar has no emotes yet."); } catch (e) {}
      return;
    }
    var host = document.querySelector(".stage-host");
    if (!host || !anchorEl) return;
    var menu = document.createElement("div");
    menu.id = "avatar-emote-menu";
    menu.className = "avatar-emote-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Avatar emotes");
    menu.innerHTML = '<div class="avatar-emote-title">Emotes</div>'
      + emotes.map(function (e) {
          return '<button type="button" class="avatar-emote-btn" role="menuitem" data-avatar-emote="'
            + esc(e.key) + '">' + esc(e.label) + '</button>';
        }).join("")
      + '<button type="button" class="avatar-emote-btn avatar-emote-cancel" data-avatar-emote-close="1">Cancel</button>';
    host.appendChild(menu);
    // Position near billboard (classic popup feel).
    try {
      var hr = host.getBoundingClientRect();
      var ar = anchorEl.getBoundingClientRect();
      var left = ar.left + ar.width / 2 - hr.left;
      var top = ar.top - hr.top - 8;
      menu.style.left = Math.max(8, Math.min(hr.width - 140, left - 60)) + "px";
      menu.style.top = Math.max(8, top - 8) + "px";
    } catch (ePos) {
      menu.style.left = "40%";
      menu.style.top = "40%";
    }
    chromeEmoteMenuOpen = true;
  }
  function playAvatarEmote(stateName) {
    // How this works: play emote frames for a short time, then return to idle.
    // Beginner: Wave does not loop forever — only while the emote is playing.
    var worn = loadWornAvatar();
    if (!worn || worn.isTofu) return false;
    var name = String(stateName || "");
    if (!name || name === "idle" || name === "walk") return false;
    var states = worn.states || {};
    if (!states[name] || !(states[name].frames && states[name].frames.length)) return false;
    // Stop walking toward a target so the emote is visible.
    if (chromeWalkRaf) {
      try { cancelAnimationFrame(chromeWalkRaf); } catch (eW) {}
      chromeWalkRaf = 0;
    }
    cancelAvatarEmoteTimer();
    setAvatarState(name);
    closeAvatarEmoteMenu();
    // Optional nameplate / bubble feedback.
    try {
      var label = name.charAt(0).toUpperCase() + name.slice(1);
      showAvatarEmoteBubble(label);
    } catch (eB) {}
    var st = states[name];
    var durs = st.frameDurationsMs || [];
    var total = 0;
    var frames = st.frames || [];
    for (var i = 0; i < frames.length; i++) {
      total += (durs[i] > 0 ? durs[i] : (durs[0] > 0 ? durs[0] : 220));
    }
    // Play ~2 loops for multi-frame, or hold ~1.2s for single-frame.
    var loops = frames.length > 1 ? 2 : 1;
    var hold = Math.max(900, total * loops);
    if (frames.length === 1) hold = Math.max(1200, durs[0] || 1200);
    chromeEmoteTimer = setTimeout(function () {
      chromeEmoteTimer = 0;
      // Only return to idle if we are still on this emote (user may have walked).
      var w2 = loadWornAvatar();
      if (w2 && w2.state === name) setAvatarState("idle");
    }, hold);
    return true;
  }
  function showAvatarEmoteBubble(label) {
    // Tiny classic feedback near the avatar (not a chat history line).
    var layer = document.getElementById("avatar-wear-layer");
    var bill = layer && layer.querySelector(".avatar-wear-billboard");
    if (!bill) return;
    var old = bill.querySelector(".avatar-emote-bubble");
    if (old) old.remove();
    var b = document.createElement("div");
    b.className = "avatar-emote-bubble";
    b.textContent = label;
    bill.appendChild(b);
    setTimeout(function () { try { b.remove(); } catch (e) {} }, 1400);
  }
  function onAvatarHitClick(ev) {
    // Beginner: tap character → emote menu. Must not trigger floor walk.
    if (isEngineMountedOnStage()) return;
    if (decorateMode) return;
    var hit = ev.target.closest && ev.target.closest("[data-avatar-hit]");
    if (!hit) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (chromeEmoteMenuOpen) {
      closeAvatarEmoteMenu();
      return;
    }
    openAvatarEmoteMenu(hit);
  }
  function bindAvatarEmoteClicks() {
    var layer = document.getElementById("avatar-wear-layer");
    if (!layer) return;
    var bill = layer.querySelector(".avatar-wear-billboard");
    if (!bill) return;
    if (!bill._emoteBound) {
      bill.addEventListener("click", onAvatarHitClick);
      bill._emoteBound = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Avatar scale + Stuff viewer + tofu default (20260906ak)
  // Beginner: open Stuff → Avatars → pick one → big preview + scale slider + Wear.
  // Scale is saved per item (whirled2.avatarScale.{id}) and also sizes the loft billboard.
  // ENGINE DEV: preview / billboard stay chrome — never mount SWF or touch Pixi in #stage-slot.
  // ---------------------------------------------------------------------------
  var AVATAR_RECENT_KEY = "whirled2.avatarRecent";
  var TOFU_AVATAR_ID = "tofu";

  function avatarScaleKey(id) {
    return "whirled2.avatarScale." + String(id || "");
  }
  function loadAvatarScale(id) {
    // How this works: slider 50–200% (stored 0.5–2). Default 1.
    try {
      var n = parseFloat(localStorage.getItem(avatarScaleKey(id)) || "1");
      if (!isFinite(n) || n < 0.5) n = 0.5;
      if (n > 2) n = 2;
      return n;
    } catch (e) { return 1; }
  }
  function saveAvatarScale(id, n) {
    n = parseFloat(n);
    if (!isFinite(n)) n = 1;
    if (n < 0.5) n = 0.5;
    if (n > 2) n = 2;
    try { localStorage.setItem(avatarScaleKey(id), String(n)); } catch (e) {}
    return n;
  }
  function loadRecentAvatarIds() {
    try {
      var a = JSON.parse(localStorage.getItem(AVATAR_RECENT_KEY) || "[]");
      return Array.isArray(a) ? a.filter(Boolean).slice(0, 5) : [];
    } catch (e) { return []; }
  }
  function pushRecentAvatarId(id) {
    // How this works: classic “recent 5” for Change avatar… from the room.
    if (!id || id === TOFU_AVATAR_ID) return;
    var list = loadRecentAvatarIds().filter(function (x) { return x !== id; });
    list.unshift(id);
    try { localStorage.setItem(AVATAR_RECENT_KEY, JSON.stringify(list.slice(0, 5))); } catch (e) {}
  }
  function happyFaceSvg(filled) {
    // Classic Stuff “Wear avatar” happy-face — inline SVG (no phone tofu).
    var stroke = filled ? "#1e6fa8" : "#3aa3e0";
    var fill = filled ? "#7ec8f0" : "none";
    return '<svg class="wear-face-ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">'
      + '<circle cx="12" cy="12" r="9" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>'
      + '<circle cx="9" cy="10" r="1.3" fill="' + stroke + '"/>'
      + '<circle cx="15" cy="10" r="1.3" fill="' + stroke + '"/>'
      + '<path d="M8.5 14.5c1.2 1.4 2.3 2 3.5 2s2.3-.6 3.5-2" fill="none" stroke="' + stroke + '" stroke-width="1.6" stroke-linecap="round"/>'
      + '</svg>';
  }
  function tofuSvgHtml(cls) {
    // Classic default “tofu” blank avatar — soft beige block with simple face.
    // Beginner: if you have not Worn a pack yet, the loft shows this placeholder.
    cls = cls || "tofu-avatar";
    return '<div class="' + cls + '" role="img" aria-label="Default tofu avatar">'
      + '<svg viewBox="0 0 64 80" width="100%" height="100%" aria-hidden="true" focusable="false">'
      +   '<rect x="10" y="4" width="44" height="52" rx="8" fill="#f0e6d2" stroke="#c4a882" stroke-width="2"/>'
      +   '<rect x="18" y="56" width="12" height="18" rx="3" fill="#e8dcc4" stroke="#c4a882" stroke-width="1.5"/>'
      +   '<rect x="34" y="56" width="12" height="18" rx="3" fill="#e8dcc4" stroke="#c4a882" stroke-width="1.5"/>'
      +   '<circle cx="24" cy="26" r="3" fill="#8a7048"/>'
      +   '<circle cx="40" cy="26" r="3" fill="#8a7048"/>'
      +   '<path d="M26 38c2.5 3 9.5 3 12 0" fill="none" stroke="#8a7048" stroke-width="2" stroke-linecap="round"/>'
      + '</svg></div>';
  }
  function makeTofuWornRow() {
    return {
      stuffId: TOFU_AVATAR_ID,
      name: "Tofu",
      thumb: "",
      preview: "",
      frames: [],
      frameDurationsMs: [],
      source: "tofu",
      packPath: "",
      at: new Date().toISOString(),
      isTofu: true
    };
  }
  function loftBackdropHtml(opts) {
    // How this works (?v=20260906ax): soft classic loft wall+floor — no green outdoor grass.
    // ENGINE DEV: pure CSS/HTML inside #stage-slot until Pixi replaceChildren.
    opts = opts || {};
    // Beginner: when an avatar is worn, hide the developer "engine mounts here" hint entirely.
    var hint = "";
    if (!opts.hideHint) {
      hint = opts.subtle
        ? '<div class="loft-hint loft-hint-subtle" hidden>engine mounts here</div>'
        : '<div class="loft-hint">Your room</div>';
    }
    return '<div class="loft-backdrop" aria-hidden="true">'
      +   '<div class="loft-sky"></div>'
      +   '<div class="loft-walls">'
      +     '<div class="loft-wall loft-wall-l"></div>'
      +     '<div class="loft-wall loft-wall-r"></div>'
      +     '<div class="loft-corner"></div>'
      +   '</div>'
      +   '<div class="loft-floor"><div class="loft-floor-grid"></div></div>'
      +   hint
      + '</div>';
  }
  function stagePlaceholderHtml() {
    // How this works (?v=20260906ax): hide engine placeholder junk when Whirl/tofu/SWF is on stage.
    var worn = loadWornAvatar();
    var hasWear = !!(worn && (worn.isTofu || worn.preview || worn.swfUrl || worn.swfDataUrl
      || (worn.frames && worn.frames.length) || (worn.states && worn.states.idle)));
    return loftBackdropHtml({ subtle: true, hideHint: hasWear });
  }
  function applyWearBillboardScale() {
    // How this works: CSS --wear-scale on the loft billboard from per-item scale.
    var layer = document.getElementById("avatar-wear-layer");
    if (!layer) return;
    var worn = loadWornAvatar();
    var scale = worn ? loadAvatarScale(worn.stuffId || TOFU_AVATAR_ID) : 1;
    var bill = layer.querySelector(".avatar-wear-billboard");
    if (bill) bill.style.setProperty("--wear-scale", String(scale));
  }
  function avatarViewerHtml(item) {
    // Classic Stuff Avatar viewer: preview backdrop + scale slider + Wear / Take off.
    // Beginner: see yourself here without entering a room.
    if (!item) return "";
    var frames = [];
    var st = (item.states && item.states.idle) || (item.pack && item.pack.states && item.pack.states.idle);
    if (st && st.frames && st.frames.length) frames = st.frames.slice();
    else if (item.frames && item.frames.length) frames = item.frames.slice();
    else if (item.pack && item.pack.displayFrames) frames = item.pack.displayFrames.slice();
    else if (item.pack && item.pack.frames) frames = item.pack.frames.slice();
    else if (item.preview) frames = [item.preview];
    else if (item.thumb) frames = [item.thumb];
    var src0 = frames[0] || item.preview || item.thumb || "";
    var durs = (st && st.frameDurationsMs) || (item.pack && item.pack.frameDurationsMs) || item.frameDurationsMs || [];
    var scale = loadAvatarScale(item.id);
    var worn = isWornStuffId(item.id);
    var pct = Math.round(scale * 100);
    var meta = ' data-viewer-frames="' + esc(JSON.stringify(frames)) + '"'
      + ' data-viewer-durs="' + esc(JSON.stringify(durs)) + '"';
    var sprite;
    if (src0) {
      sprite = '<img class="avatar-viewer-sprite" src="' + src0 + '" alt="' + esc(item.name || "Avatar") + '" />';
    } else {
      sprite = tofuSvgHtml("tofu-avatar tofu-in-viewer");
    }
    var wearBtn;
    if (worn) {
      wearBtn = '<button type="button" class="action-btn wear-btn is-worn" data-stuff-unwear="' + esc(item.id) + '">'
        + happyFaceSvg(true) + ' Take off</button>';
    } else {
      wearBtn = '<button type="button" class="action-btn wear-btn" data-stuff-wear="' + esc(item.id) + '">'
        + happyFaceSvg(false) + ' Wear avatar</button>';
    }
    return '<div class="avatar-viewer" id="avatar-viewer" data-viewer-id="' + esc(item.id) + '">'
      +   '<div class="avatar-viewer-stage">'
      +     loftBackdropHtml({ subtle: true })
      +     '<div class="avatar-viewer-billboard"' + meta + ' style="--avatar-scale:' + scale + '">'
      +       sprite
      +       '<div class="avatar-viewer-nameplate">' + esc(item.name || "Avatar") + '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="avatar-viewer-toolbar">'
      +     '<label class="avatar-scale-label" title="Scale (classic diagonal-arrow control)">'
      +       '<span class="avatar-scale-ico" aria-hidden="true">'
      +         '<svg viewBox="0 0 24 24" width="18" height="18" focusable="false">'
      +           '<path fill="#e07a28" d="M4 20V10l2 2 4-4 2 2-4 4 2 2H4zm16-16v10l-2-2-4 4-2-2 4-4-2-2h6z"/>'
      +         '</svg>'
      +       '</span>'
      +       '<span class="avatar-scale-text">Scale <b id="avatar-scale-pct">' + pct + '%</b></span>'
      +       '<input type="range" id="avatar-scale-slider" min="50" max="200" step="5" value="' + pct + '"'
      +         ' data-avatar-scale="' + esc(item.id) + '" aria-label="Avatar scale" />'
      +     '</label>'
      +     '<div class="avatar-viewer-actions">'
      +       wearBtn
      +       '<button type="button" class="text-btn" data-avatar-states-soon="1" title="Classic SWF states — Coming Soon">States / actions…</button>'
      +     '</div>'
      +     '<p class="meta avatar-viewer-note">Preview play flips sprite-pack frames when available. '
      +       'Classic Flash: enable <b>Classic Flash avatar (experimental)</b> on the item for Ruffle preview — full AvatarControl states Coming Soon.</p>'
      +   '</div>'
      +   (function () {
            try {
              if (window.WhirledClassicAvatar && WhirledClassicAvatar.classicViewerSlotHtml) {
                return WhirledClassicAvatar.classicViewerSlotHtml(item) || "";
              }
            } catch (e) {}
            return "";
          })()
      + '</div>';
  }
  function startAvatarViewerAnim() {
    // Beginner: multi-frame packs “preview play” in the Stuff viewer (not Ruffle).
    var viewer = document.getElementById("avatar-viewer");
    if (!viewer) return;
    var bill = viewer.querySelector(".avatar-viewer-billboard");
    var img = viewer.querySelector(".avatar-viewer-sprite");
    if (!bill || !img) return;
    var frames = [];
    var durs = [];
    try { frames = JSON.parse(bill.getAttribute("data-viewer-frames") || "[]"); } catch (e1) { frames = []; }
    try { durs = JSON.parse(bill.getAttribute("data-viewer-durs") || "[]"); } catch (e2) { durs = []; }
    if (!frames || frames.length < 2) return;
    if (viewer._viewerTimer) { try { clearInterval(viewer._viewerTimer); } catch (e3) {} }
    var i = 0;
    viewer._viewerTimer = setInterval(function () {
      i = (i + 1) % frames.length;
      img.src = frames[i];
    }, (durs[0] > 0 ? durs[0] : 200));
  }
  function changeAvatarMenuHtml() {
    // How this works: room self-menu → recent 5 + tofu + View full list → Stuff Avatars.
    var recent = loadRecentAvatarIds();
    var rows = recent.map(function (id) {
      var it = findStuff(id);
      if (!it) return "";
      var on = isWornStuffId(id);
      return '<button type="button" class="occ-menu-item' + (on ? " is-on" : "") + '" data-stuff-wear="' + esc(id) + '">'
        + esc(it.name || id) + (on ? " ✓" : "") + '</button>';
    }).join("");
    var tofuOn = isWornStuffId(TOFU_AVATAR_ID) || (!loadWornAvatar());
    return ''
      + '<button type="button" class="occ-menu-item" data-change-avatar="1">Change avatar…</button>'
      + '<div class="occ-change-avatar" id="occ-change-avatar" hidden>'
      +   '<div class="occ-change-title">Recent</div>'
      +   (rows || '<p class="meta occ-change-empty">No recent packs yet — open Stuff.</p>')
      +   '<button type="button" class="occ-menu-item' + (tofuOn && isWornStuffId(TOFU_AVATAR_ID) ? " is-on" : "") + '" data-wear-tofu="1">Default tofu</button>'
      +   '<button type="button" class="occ-menu-item" data-goto-stuff-avatars="1">View full list…</button>'
      + '</div>';
  }

  function ensureUserPackSeedButtonHtml() {
    // How this works: one-click import — prefers unified Whirl (idle+walk+pose).
    // Beginner: one Wearable avatar. Optional part packs stay in index but are not seeded by default.
    try { ensureStarterAvatar({ wearIfEmpty: false, quiet: true }); } catch (eSeedPaint) {} // ensureStarterAvatar on Stuff
    return '<div class="panel avatar-pack-seed-panel" id="avatar-pack-seed">'
      + '<h3>Aseprite avatar packs</h3>'
      + '<p class="meta">Modern Whirled2 path: one <b>Whirl</b> avatar with idle + walk (+ stand/pose). '
      + 'Classic SWF wardrobe stays On hold. Packs live in <code>assets/avatars/user-pack/</code>.</p>'
      + '<div class="stuff-detail-actions">'
      +   '<button type="button" class="action-btn" data-seed-user-packs="1">Add Whirl to Stuff</button>'
      +   '<button type="button" class="text-btn" data-seed-user-packs-parts="1" title="Optional: also add idle/walk/stand/pose as separate part items">Also add part packs…</button>'
      + '</div>'
      + '<p class="meta" id="avatar-pack-seed-msg">Adds the unified Whirl Wearable (starter avatar). Then <b>Wear</b> → Rooms → click floor to walk, click avatar for emotes.</p>'
      + '<p class="meta fla-test-soon"><b>FLA Test Avatar</b> is seeded into Stuff as a Coming Soon sketch pack from <code>assets/avatars/fla-lab/</code>. Publish a <b>.swf</b> or PNG idle+walk for a full Wearable — see <code>FLA-TEST-AVATAR.md</code>. <b>Whirl</b> is the starter avatar.</p>'
      + '<div class="stuff-detail-actions">'
      +   '<button type="button" class="action-btn" data-wear-tofu="1">' + happyFaceSvg(false) + ' Wear default tofu</button>'
      + '</div>'
      + '<p class="meta">Classic default blank avatar. Use when you want no custom pack worn.</p>'
      + '</div>';
  }
  function absolutizeStateFrames(states, path) {
    // How this works: pack.json paths are relative; Stuff rows need ./assets…?v= URLs.
    if (!states) return null;
    var out = {};
    Object.keys(states).forEach(function (k) {
      var st = states[k] || {};
      out[k] = {
        frames: (st.frames || []).map(function (f) {
          if (/^(https?:|data:|\.|\/)/.test(f)) return f.indexOf("?") >= 0 ? f : (f + "?v=" + LOGO_V);
          return "./" + path + f + "?v=" + LOGO_V;
        }),
        frameDurationsMs: (st.frameDurationsMs || []).slice()
      };
    });
    return out;
  }
  function findWhirlStuffItem() {
    // How this works: locate the starter Whirl avatar in Stuff (slug cyan-hair / preferred unified).
    var items = loadStuff();
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      if (it.slug === "cyan-hair") return it;
      if (it.preferred && itemCat(it) === "avatars" && /whirl/i.test(String(it.name || ""))) return it;
      if (/cyan-hair/.test(String(it.packPath || ""))) return it;
    }
    return null;
  }
  function renameCyanHairRowsToWhirl() {
    var items = loadStuff();
    var changed = false;
    items.forEach(function (it) {
      if (!it) return;
      if (it.slug === "cyan-hair" || /cyan-hair/.test(String(it.packPath || ""))) {
        if (it.name !== "Whirl") { it.name = "Whirl"; changed = true; }
        if (it.pack && it.pack.name && it.pack.name !== "Whirl") { it.pack.name = "Whirl"; changed = true; }
      }
      if (it.partOf === "cyan-hair" && it.name && /Cyan Hair/i.test(it.name)) {
        it.name = String(it.name).replace(/Cyan Hair/gi, "Whirl");
        changed = true;
      }
    });
    if (changed) saveStuff(items);
    try {
      var worn = loadWornAvatar();
      if (worn && (worn.slug === "cyan-hair" || /cyan-hair/.test(String(worn.packPath || "")) || /Cyan Hair/i.test(String(worn.name || "")))) {
        worn.name = "Whirl";
        saveWornAvatar(worn);
      }
    } catch (eW) {}
  }
  function seedFlaTestAvatarStub() {
    // How this works (?v=20260906ax): FLA Test Avatar appears in Stuff as Coming Soon / sketch hybrid.
    // Beginner: uses extracted fla-lab JPEGs as preview only — not a playable SWF yet.
    try {
      var items = loadStuff();
      if (items.some(function (it) { return it && it.slug === "fla-test-avatar"; })) return false;
      var thumb = "./assets/avatars/fla-lab/extracted/bitmap_00.jpg?v=" + LOGO_V;
      var frames = [
        "./assets/avatars/fla-lab/extracted/bitmap_00.jpg?v=" + LOGO_V,
        "./assets/avatars/fla-lab/extracted/bitmap_01.jpg?v=" + LOGO_V
      ];
      items.unshift({
        id: "av-fla-test",
        name: "FLA Test Avatar",
        description: "Coming Soon — your .fla sketches (fla-lab). Publish a .swf or PNG idle/walk for a full Wearable. Whirl remains the starter avatar.",
        kind: "avatar",
        type: "avatar",
        category: "avatars",
        creator: "you",
        ownerId: (session() && session().user && session().user.id) || "",
        thumb: thumb,
        preview: thumb,
        frames: frames,
        frameDurationsMs: [500, 500],
        states: { idle: { frames: frames, frameDurationsMs: [500, 500] } },
        packPath: "assets/avatars/fla-lab/",
        slug: "fla-test-avatar",
        source: "fla-lab",
        comingSoon: true,
        owned: true,
        at: new Date().toISOString()
      });
      saveStuff(items);
      return true;
    } catch (e) { return false; }
  }
  async function ensureStarterAvatar(opts) {
    // How this works (?v=20260906ax): every user gets Whirl in Stuff + auto-Wear when empty/tofu.
    // Beginner: join the game already wearing Whirl; Stuff still lets you Take off / Wear again.
    // Idempotent — never duplicates. Folder path stays assets/avatars/user-pack/cyan-hair/.
    opts = opts || {};
    renameCyanHairRowsToWhirl();
    var whirl = findWhirlStuffItem();
    if (!whirl) {
      try {
        await seedUserAvatarPacks({ includeParts: false, fromEnsure: true });
      } catch (eSeed) {}
      whirl = findWhirlStuffItem();
    } else {
      renameCyanHairRowsToWhirl();
      whirl = findWhirlStuffItem() || whirl;
    }
    try { seedFlaTestAvatarStub(); } catch (eFla) {}
    if (!whirl) return false;
    var worn = loadWornAvatar();
    var emptyOrTofu = !worn || worn.isTofu || worn.stuffId === TOFU_AVATAR_ID || worn.source === "tofu";
    if (opts.wearIfEmpty !== false && emptyOrTofu) {
      try {
        wearStuffAvatar(whirl);
        if (!opts.quiet) {
          try { pushNotice("blue", "Starter avatar Whirl equipped.", { transient: true }); } catch (eN) {}
        }
      } catch (eWear) {}
    }
    return true;
  }
  async function seedUserAvatarPacks(opts) {
    // How this works: fetch index.json; prefer unified cyan-hair (display name Whirl). Parts only if includeParts.
    // Beginner: one Wearable Whirl with idle+walk. ENGINE DEV: states mirror pack.json.
    opts = opts || {};
    var includeParts = !!opts.includeParts;
    var msg = document.getElementById("avatar-pack-seed-msg");
    try {
      var res = await fetch(USER_PACK_INDEX, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load pack index (" + res.status + ")");
      var index = await res.json();
      var packs = (index && index.packs) || [];
      var preferred = (index && index.preferred) || "cyan-hair";
      // Prefer unified first in seed order.
      packs = packs.slice().sort(function (a, b) {
        var ap = (a && (a.preferred || a.slug === preferred)) ? 0 : 1;
        var bp = (b && (b.preferred || b.slug === preferred)) ? 0 : 1;
        return ap - bp;
      });
      var items = loadStuff();
      var existing = {};
      items.forEach(function (it) {
        if (it.packPath) existing[it.packPath] = 1;
        if (it.slug) existing["slug:" + it.slug] = 1;
      });
      var added = 0;
      for (var i = 0; i < packs.length; i++) {
        var p = packs[i];
        if (!p || p.ok === false) continue;
        var isPart = !!(p.partOf || (p.source !== "aseprite-unified" && p.slug !== preferred && !p.preferred));
        if (isPart && !includeParts) continue;
        if (!isPart && p.slug !== preferred && !p.preferred && p.source !== "aseprite-unified" && !includeParts) {
          // Only seed preferred/unified unless parts requested.
          if (preferred && p.slug !== preferred) continue;
        }
        var path = p.path || ("assets/avatars/user-pack/" + p.slug + "/");
        if (existing[path] || existing["slug:" + p.slug]) continue;
        var packJson = null;
        try {
          var packUrl = "./" + (p.pack || (path + "pack.json"));
          if (packUrl.indexOf("?") < 0) packUrl += "?v=" + LOGO_V;
          var pr = await fetch(packUrl, { cache: "no-store" });
          if (pr.ok) packJson = await pr.json();
        } catch (eP) { packJson = null; }
        var thumb = "./" + (p.thumb || (path + "thumb.png")) + "?v=" + LOGO_V;
        var preview = "./" + (p.preview || (path + "preview.png")) + "?v=" + LOGO_V;
        var states = absolutizeStateFrames(packJson && packJson.states, path);
        var frames = [];
        if (states && states.idle && states.idle.frames && states.idle.frames.length) {
          frames = states.idle.frames.slice();
        } else if (packJson && packJson.displayFrames) {
          frames = packJson.displayFrames.map(function (f) { return "./" + path + f + "?v=" + LOGO_V; });
        } else if (packJson && packJson.frames) {
          frames = packJson.frames.map(function (f) { return "./" + path + f + "?v=" + LOGO_V; });
        } else {
          frames = [preview];
        }
        var durs = (states && states.idle && states.idle.frameDurationsMs)
          || (packJson && packJson.frameDurationsMs) || [];
        var nid = "av" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        var srcLabel = (packJson && packJson.source) || p.source || "aseprite";
        var desc;
        if (states && states.walk) {
          desc = "Unified Aseprite avatar (idle + walk + emotes). Wear, click floor to walk, click avatar for Wave/Sit/Pose.";
        } else if (isPart) {
          desc = "Optional part pack (" + (p.role || "frames") + ") for Whirl. Prefer the unified Whirl Wearable.";
        } else {
          desc = "Aseprite sprite pack (" + ((packJson && packJson.frameCount) || p.frameCount || frames.length) + " frames). Wear to show in your loft.";
        }
        var packForRow = packJson ? JSON.parse(JSON.stringify(packJson)) : { name: p.name, frames: frames, thumb: thumb, source: srcLabel };
        if (states) {
          packForRow.states = states;
          packForRow.frames = frames.slice();
          packForRow.displayFrames = frames.slice();
          packForRow.frameDurationsMs = durs.slice();
        }
        items.unshift({
          id: nid,
          name: (packJson && packJson.name) || p.name || p.slug,
          description: desc,
          kind: "avatar",
          type: "avatar",
          category: "avatars",
          creator: (session() && session().user && session().user.name) || "you",
          ownerId: (session() && session().user && session().user.id) || "",
          thumb: thumb,
          preview: preview,
          frames: frames,
          frameDurationsMs: durs.slice(),
          states: states || undefined,
          artFaces: (packJson && packJson.artFaces) || (p.artFaces) || undefined,
          pack: packForRow,
          packPath: path,
          slug: p.slug,
          source: srcLabel,
          partOf: p.partOf || undefined,
          preferred: !!(p.preferred || p.slug === preferred || srcLabel === "aseprite-unified"),
          sourceFile: packJson && packJson.sourceFile,
          owned: true,
          at: new Date().toISOString()
        });
        existing[path] = 1;
        existing["slug:" + p.slug] = 1;
        added++;
      }
      saveStuff(items);
      try { localStorage.setItem(USER_PACK_SEEDED_KEY, "1"); } catch (eS) {}
      // Force display name Whirl on preferred slug even if older Stuff row said Cyan Hair.
      try {
        items = loadStuff().map(function (it) {
          if (it && (it.slug === "cyan-hair" || /cyan-hair/.test(String(it.packPath || "")))) {
            it.name = "Whirl";
            if (it.pack && typeof it.pack === "object") it.pack.name = "Whirl";
          }
          if (it && it.partOf === "cyan-hair" && it.name && /Cyan Hair/i.test(it.name)) {
            it.name = String(it.name).replace(/Cyan Hair/gi, "Whirl");
          }
          return it;
        });
        saveStuff(items);
      } catch (eRename) {}
      if (msg) {
        msg.textContent = added
          ? ("Added " + added + " avatar(s) to Stuff." + (includeParts ? " (includes part packs)" : " Wear Whirl, then click the floor to walk."))
          : "Already in Stuff — open Whirl and Wear.";
      }
      pushNotice("green", added ? ("Added " + added + " avatar(s).") : "Avatar packs already seeded.", { transient: true });
      if (!opts.fromEnsure) {
        try { ensureStarterAvatar({ wearIfEmpty: true, quiet: true }); } catch (eEns) {}
        paint("stuff");
      }
    } catch (err) {
      if (msg) msg.textContent = String(err && err.message || err);
      pushNotice("status", "Could not seed avatar packs.");
    }
  }

  // ---------------------------------------------------------------------------
  // Avatar lab (Phase 0–1 foundation) — DEFERRED / locked off for normal users
  // How this works: Stuff → Avatars shows an "On hold" note unless avatarLab is on.
  // When on: list/upload/export wardrobe JSON + SWF blobs in IndexedDB whirled2-media.
  // Wear (lab only) sets activeId in localStorage — room chrome / #stage-slot ignore it.
  // ENGINE DEV: Flash/Ruffle still banned for live rooms (ENGINE-BRIDGE.md). Phase 2 deferred.
  // ---------------------------------------------------------------------------
  function syncAvatarLabFlagFromUrl() {
    // How this works: visiting ?avatarLab=1 turns the lab on and remembers it in localStorage.
    try {
      var q = new URLSearchParams(location.search || "");
      if (q.get("avatarLab") === "1") {
        localStorage.setItem(AVATAR_LAB_KEY, "1");
      }
    } catch (e) {}
  }
  function isAvatarLabOn() {
    // How this works: lab is OFF by default. ON if storage flag is "1" or URL has ?avatarLab=1.
    try {
      if (localStorage.getItem(AVATAR_LAB_KEY) === "1") return true;
    } catch (e) {}
    try {
      var q = new URLSearchParams(location.search || "");
      if (q.get("avatarLab") === "1") return true;
    } catch (e2) {}
    return false;
  }
  function emptyWardrobe() {
    return { version: 1, avatars: [], activeId: null };
  }
  function loadWardrobe() {
    // How this works: wardrobe manifest lives in localStorage; SWF bytes live in IndexedDB by SHA-1.
    try {
      var raw = JSON.parse(localStorage.getItem(WARDROBE_KEY) || "null");
      if (!raw || typeof raw !== "object") return emptyWardrobe();
      if (!Array.isArray(raw.avatars)) raw.avatars = [];
      if (raw.version == null) raw.version = 1;
      if (raw.activeId === undefined) raw.activeId = null;
      return raw;
    } catch (e) {
      return emptyWardrobe();
    }
  }
  function saveWardrobe(w) {
    w = w || emptyWardrobe();
    try {
      localStorage.setItem(WARDROBE_KEY, JSON.stringify({
        version: w.version || 1,
        avatars: (w.avatars || []).slice(0, 100),
        activeId: w.activeId || null
      }));
    } catch (e) {}
  }
  function bufToHex(buf) {
    var u8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    var out = "";
    for (var i = 0; i < u8.length; i++) {
      var h = u8[i].toString(16);
      out += h.length === 1 ? "0" + h : h;
    }
    return out;
  }
  // Pure JS SHA-1 fallback when SubtleCrypto is missing (old browsers / file:// quirks).
  // ENGINE DEV: classic msoy used SHA-1 for HashMediaDesc — keep SHA-1 for wardrobe ids.
  function sha1PureJs(arrayBuffer) {
    function rotl(n, s) { return (n << s) | (n >>> (32 - s)); }
    function toWords(u8) {
      var l = u8.length;
      var nWords = (((l + 8) >> 6) + 1) * 16;
      var w = new Array(nWords);
      var i;
      for (i = 0; i < nWords; i++) w[i] = 0;
      for (i = 0; i < l; i++) w[i >> 2] |= u8[i] << (24 - (i % 4) * 8);
      w[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
      w[nWords - 1] = l * 8;
      return w;
    }
    var u8 = new Uint8Array(arrayBuffer);
    var words = toWords(u8);
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    for (var i = 0; i < words.length; i += 16) {
      var w = new Array(80), j, a, b, c, d, e, f, k, temp;
      for (j = 0; j < 16; j++) w[j] = words[i + j] | 0;
      for (j = 16; j < 80; j++) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      a = h0; b = h1; c = h2; d = h3; e = h4;
      for (j = 0; j < 80; j++) {
        if (j < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
        else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
        else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else { f = b ^ c ^ d; k = 0xCA62C1D6; }
        temp = (rotl(a, 5) + f + e + k + w[j]) | 0;
        e = d; d = c; c = rotl(b, 30); b = a; a = temp;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
    }
    function hex32(n) {
      var s = (n >>> 0).toString(16);
      return ("00000000" + s).slice(-8);
    }
    return hex32(h0) + hex32(h1) + hex32(h2) + hex32(h3) + hex32(h4);
  }
  function sha1OfArrayBuffer(arrayBuffer) {
    // How this works: prefer SubtleCrypto SHA-1; fall back to pure JS so lab works offline.
    return Promise.resolve().then(function () {
      if (window.crypto && crypto.subtle && crypto.subtle.digest) {
        return crypto.subtle.digest("SHA-1", arrayBuffer).then(function (dig) {
          return bufToHex(dig);
        }).catch(function () {
          return sha1PureJs(arrayBuffer);
        });
      }
      return sha1PureJs(arrayBuffer);
    });
  }
  function openMediaIdb() {
    // How this works: IndexedDB keystore whirled2-media / blobs — SWF bytes by SHA-1 hex key.
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB not available in this browser."));
        return;
      }
      var req = indexedDB.open(MEDIA_IDB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(MEDIA_IDB_STORE)) {
          db.createObjectStore(MEDIA_IDB_STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("IndexedDB open failed")); };
    });
  }
  function idbPutBlob(sha1, record) {
    return openMediaIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_IDB_STORE, "readwrite");
        tx.objectStore(MEDIA_IDB_STORE).put(record, sha1);
        tx.oncomplete = function () { resolve(sha1); };
        tx.onerror = function () { reject(tx.error || new Error("IDB put failed")); };
      });
    });
  }
  function idbGetBlob(sha1) {
    return openMediaIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_IDB_STORE, "readonly");
        var req = tx.objectStore(MEDIA_IDB_STORE).get(sha1);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error || new Error("IDB get failed")); };
      });
    });
  }
  function idbClearAllBlobs() {
    return openMediaIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_IDB_STORE, "readwrite");
        tx.objectStore(MEDIA_IDB_STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error || new Error("IDB clear failed")); };
      });
    }).catch(function () { /* IDB optional when clearing */ });
  }
  function fileToArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error("Could not read file.")); };
      reader.readAsArrayBuffer(file);
    });
  }
  function arrayBufferToBase64(arrayBuffer) {
    var u8 = new Uint8Array(arrayBuffer);
    var chunk = 0x8000;
    var parts = [];
    for (var i = 0; i < u8.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, u8.subarray(i, i + chunk)));
    }
    return btoa(parts.join(""));
  }
  function avatarLabHoldPanelHtml() {
    // How this works (?v=20260906ax): legacy wardrobe lab stays On hold; user classic upload is above.
    return '<div class="panel avatar-lab-hold-panel" id="avatar-lab-hold">'
      + '<h3>Legacy SWF wardrobe lab — On hold</h3>'
      + '<p class="meta">The old IndexedDB wardrobe lab stays locked for normal visitors. '
      + '<b>Prefer the Classic Flash / Whirled avatars panel above</b> to upload your own .swf (Experimental). '
      + 'Devs: <code>?avatarLab=1</code> still unlocks the side-project lab. See <code>AVATAR-IMPORT.md</code>.</p>'
      + '<p class="meta classic-hold-bridge">No shop scrapes. Coins/Bars stay earn-only.</p>'
      + '</div>';
  }
  function avatarLabPanelHtml() {
    // How this works: full lab UI only when flag is ON. Wear sets activeId only (no room change).
    // ENGINE DEV: do not mount these SWFs in #stage-slot yet — Phase 2 deferred.
    var w = loadWardrobe();
    var rows;
    if (!w.avatars.length) {
      rows = '<p class="meta">No lab avatars yet. Upload a .swf you created or have rights to.</p>';
    } else {
      rows = '<ul class="avatar-lab-list">' + w.avatars.map(function (av) {
        var active = w.activeId && w.activeId === av.id;
        var thumb = av.thumbDataUrl
          ? '<img class="avatar-lab-thumb" src="' + av.thumbDataUrl + '" alt="" />'
          : '<div class="swatch avatar-lab-swatch"></div>';
        return '<li class="avatar-lab-row' + (active ? " is-active" : "") + '" data-lab-id="' + esc(av.id) + '">'
          + thumb
          + '<div class="avatar-lab-meta">'
          +   '<strong>' + esc(av.name || "Avatar") + '</strong>'
          +   (active ? ' <span class="meta">(lab active)</span>' : '')
          +   '<p class="meta">sha1 ' + esc((av.sha1 || "").slice(0, 12)) + '… · ' + esc(av.mime || "application/x-shockwave-flash")
          +   ' · scale ' + esc(String(av.scale != null ? av.scale : 1)) + '</p>'
          +   '<div class="avatar-lab-row-actions">'
          +     '<button type="button" class="action-btn" data-lab-wear="' + esc(av.id) + '">Wear (lab only)</button>'
          +   '</div>'
          + '</div></li>';
      }).join("") + '</ul>';
    }
    return '<div class="panel avatar-lab-panel" id="avatar-lab-panel">'
      + '<div class="room-side-head"><h2>Avatar lab</h2>'
      +   '<span class="meta">flag on · side work</span></div>'
      + '<p class="meta">Phase 0–1 archive only. <b>Wear (lab only)</b> saves <code>activeId</code> in '
      + '<code>whirled2.wardrobe</code> — it does <b>not</b> change the room avatar or <code>#stage-slot</code> yet. '
      + 'See <code>AVATAR-IMPORT.md</code>.</p>'
      + '<div class="section-label">Wardrobe</div>'
      + rows
      + '<div class="section-label">Upload SWF (lab)</div>'
      + '<form id="avatar-lab-upload-form" class="stuff-upload-form avatar-lab-upload-form">'
      +   '<label>Name <input name="name" maxlength="80" required placeholder="My avatar" /></label>'
      +   '<label>Avatar SWF <input type="file" name="swf" accept=".swf,application/x-shockwave-flash,application/vnd.adobe.flash.movie" required /></label>'
      +   '<label>Thumbnail (optional, ~80×60) <input type="file" name="thumb" accept="image/png,image/jpeg,image/gif,image/webp" /></label>'
      +   '<label>Scale <input name="scale" type="number" min="0.1" max="4" step="0.05" value="1" /></label>'
      +   '<label class="check-row"><input type="checkbox" name="rights" required /> I confirm this is my own creation or I have the rights to store it here (no shop scrapes).</label>'
      +   '<button type="submit">Save to lab wardrobe</button>'
      +   '<p class="meta" id="avatar-lab-upload-msg"></p>'
      + '</form>'
      + '<div class="section-label">Lab tools</div>'
      + '<div class="avatar-lab-tools">'
      +   '<button type="button" class="action-btn" data-lab-export="1">Export wardrobe.json</button>'
      +   '<label class="action-btn avatar-lab-import-label">Import manifest JSON'
      +     '<input type="file" accept="application/json,.json" id="avatar-lab-import-file" hidden />'
      +   '</label>'
      +   '<button type="button" class="action-btn danger" data-lab-clear="1">Clear lab data</button>'
      + '</div>'
      + '<p class="meta" id="avatar-lab-tools-msg">Export downloads the manifest only. SWF blobs stay in IndexedDB <code>whirled2-media</code> (no JSZip in this mock — re-upload SWFs after import if needed).</p>'
      + '</div>';
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
      bars: Number((row && row.bars) || 0) || 0,
      note: String((row && row.note) || "Coins & Bars are play currency — no real-money purchases on Whirled2.").slice(0, 220),
      at: (row && row.at) || new Date().toISOString()
    });
    saveTransactions(list);
  }

  // ---------------------------------------------------------------------------
  // How this works: classic dual currency — Coins (play/social) + Bars (premium-feel).
  // Stored per user in whirled2.wallet.{userId}. Bars are EARNED only (streaks / rare
  // rewards) — never Buy Bars / PayPal / Bling cash-out. Daily claim runs once per
  // browser calendar day on session paint. ENGINE DEV: wallet is chrome localStorage;
  // engine may later read WhirledChrome.getWallet() if you add a tiny getter — optional.
  // ---------------------------------------------------------------------------
  var dailyRewardPending = null; // { streakDays, coins, bars, weekly } after first claim today
  var txFilter = "all"; // all | coins | bars
  var COINS_PER_BAR_DISPLAY = 10000; // shop label math only (classic ~1 bar ≈ 10k coins)

  function pad2(n) {
    // Beginner (?v=20260906ax): never emit "NaN" into day keys / display strings.
    n = Number(n);
    if (!isFinite(n)) n = 0;
    n = Math.floor(n);
    return (n < 10 ? "0" : "") + n;
  }
  function localDayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function dayOffsetKey(dayStr, delta) {
    var p = String(dayStr || "").split("-");
    if (p.length !== 3) return "";
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() + (delta || 0));
    return localDayKey(d);
  }
  function weekKeyFromDay(dayStr) {
    // Monday date string for the week containing dayStr (browser-local).
    var p = String(dayStr || "").split("-");
    if (p.length !== 3) return localDayKey();
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var dow = d.getDay(); // 0=Sun
    var toMon = (dow === 0 ? -6 : 1 - dow);
    d.setDate(d.getDate() + toMon);
    return localDayKey(d);
  }
  // How this works: soft Level from wallet.xp. Classic vibe ~Level 10 gate for Friendly
  // People — Whirled2 demo ignores the gate (toggle freely on Account).
  // ENGINE DEV: level is chrome-only; engine may read getWallet().level later.
  function levelFromXp(xp) {
    xp = Math.max(0, Number(xp) || 0);
    // Simple curve: L1@0, L2@50, L3@120, then +100 xp per level.
    if (xp < 50) return 1;
    if (xp < 120) return 2;
    return Math.min(99, 3 + Math.floor((xp - 120) / 100));
  }
  function xpToNext(xp) {
    xp = Math.max(0, Number(xp) || 0);
    var lvl = levelFromXp(xp);
    if (lvl <= 1) return 50 - xp;
    if (lvl === 2) return 120 - xp;
    var nextAt = 120 + (lvl - 2) * 100;
    return Math.max(0, nextAt - xp);
  }
  function grantXp(userId, amount, meta) {
    // How this works: bump xp on daily login / stamp / status; recompute level.
    if (!userId || !amount) return null;
    var w = loadWallet(userId);
    w.xp = Math.max(0, (Number(w.xp) || 0) + (Number(amount) || 0));
    var prev = Number(w.level) || 1;
    w.level = levelFromXp(w.xp);
    saveWallet(userId, w);
    if (w.level > prev) {
      try {
        pushNotice("green", "Level up! You are now Level " + w.level + ".", { transient: true });
      } catch (eLv) {}
    }
    return w;
  }
  function levelBadgeHtml(userId) {
    var snap = getWalletSnapshot(userId);
    return '<span class="level-badge" title="XP ' + esc(String(snap.xp)) + ' · ' + esc(String(xpToNext(snap.xp))) + ' to next">Level ' + esc(String(snap.level)) + '</span>';
  }
  function defaultWallet() {
    return {
      coins: 0,
      bars: 0,
      lastLoginDay: "",
      streakDays: 0,
      weekKey: "",
      weekLogins: 0,
      totalLogins: 0,
      statusCoinDay: "",
      // How this works: soft level from xp (logins / stamps / status). Not a hard gate.
      xp: 0,
      level: 1
    };
  }
  function loadWallet(userId) {
    if (!userId) return defaultWallet();
    try {
      var raw = localStorage.getItem(WALLET_KEY + userId);
      if (!raw) return defaultWallet();
      var w = JSON.parse(raw);
      if (!w || typeof w !== "object") return defaultWallet();
      var base = defaultWallet();
      Object.keys(base).forEach(function (k) {
        if (w[k] == null) w[k] = base[k];
      });
      w.coins = Number(w.coins) || 0;
      w.bars = Number(w.bars) || 0;
      w.streakDays = Number(w.streakDays) || 0;
      w.weekLogins = Number(w.weekLogins) || 0;
      w.totalLogins = Number(w.totalLogins) || 0;
      w.xp = Number(w.xp) || 0;
      w.level = levelFromXp(w.xp);
      return w;
    } catch (e) { return defaultWallet(); }
  }
  function saveWallet(userId, w) {
    if (!userId || !w) return;
    try { localStorage.setItem(WALLET_KEY + userId, JSON.stringify(w)); } catch (e) {}
  }
  function getWalletSnapshot(userId) {
    var w = loadWallet(userId);
    var xp = Number(w.xp) || 0;
    return {
      coins: w.coins || 0,
      bars: w.bars || 0,
      streakDays: w.streakDays || 0,
      xp: xp,
      level: levelFromXp(xp),
      totalLogins: Number(w.totalLogins) || 0
    };
  }
  function barsLabelForCoins(coins) {
    var c = Number(coins) || 0;
    if (c <= 0) return "";
    var n = c / COINS_PER_BAR_DISPLAY;
    var shown = (Math.abs(n - Math.round(n)) < 0.001) ? String(Math.round(n)) : (Math.round(n * 10) / 10).toString();
    var unit = (shown === "1") ? " bar" : " bars";
    return "or " + shown + unit;
  }
  function formatShopPrice(coins, owned) {
    if (owned) return "owned";
    var c = Number(coins) || 0;
    var bar = barsLabelForCoins(c);
    return c + " coins" + (bar ? (" (" + bar + ")") : "");
  }
  function grantCurrency(userId, coinsDelta, barsDelta, meta) {
    // How this works: mutate wallet + append ledger row. Safe for other local users (friend accept).
    if (!userId) return null;
    var w = loadWallet(userId);
    var c = Number(coinsDelta) || 0;
    var b = Number(barsDelta) || 0;
    if (!c && !b) return w;
    w.coins = Math.max(0, (Number(w.coins) || 0) + c);
    w.bars = Math.max(0, (Number(w.bars) || 0) + b);
    saveWallet(userId, w);
    var kind = (meta && meta.kind) || "earn";
    var label = (meta && meta.label) || "Currency grant";
    var note = (meta && meta.note) || ("+" + c + " coins" + (b ? (", +" + b + " bars") : ""));
    appendTransaction({ kind: kind, label: label, coins: c, bars: b, note: note });
    return w;
  }
  function claimDailyLogin() {
    // How this works: once per calendar day on session paint. Base +50 coins, streak bonus
    // +10×min(streak,30), Bars at streak 7/14/21/30, weekly 7 distinct days → +100c +1 Bar.
    var s = session();
    if (!s || !s.user) return null;
    var uid = s.user.id;
    var w = loadWallet(uid);
    var today = localDayKey();
    if (w.lastLoginDay === today) return null;
    var yesterday = dayOffsetKey(today, -1);
    if (w.lastLoginDay === yesterday) w.streakDays = (Number(w.streakDays) || 0) + 1;
    else w.streakDays = 1;
    var wk = weekKeyFromDay(today);
    if (w.weekKey !== wk) {
      w.weekKey = wk;
      w.weekLogins = 0;
    }
    w.weekLogins = (Number(w.weekLogins) || 0) + 1;
    w.totalLogins = (Number(w.totalLogins) || 0) + 1;
    w.lastLoginDay = today;
    var streakBonus = 10 * Math.min(w.streakDays, 30);
    var coinsGain = 50 + streakBonus;
    var barsGain = 0;
    var streakBar = false;
    if ([7, 14, 21, 30].indexOf(w.streakDays) >= 0) {
      barsGain += 1;
      streakBar = true;
    }
    var weekly = false;
    if (w.weekLogins === 7) {
      coinsGain += 100;
      barsGain += 1;
      weekly = true;
    }
    w.coins = (Number(w.coins) || 0) + coinsGain;
    w.bars = (Number(w.bars) || 0) + barsGain;
    saveWallet(uid, w);
    var noteParts = ["Day " + w.streakDays + " streak", "+" + coinsGain + " coins"];
    if (barsGain) noteParts.push("+" + barsGain + " bars");
    if (weekly) noteParts.push("weekly complete");
    appendTransaction({
      kind: "login",
      label: "Daily login",
      coins: coinsGain,
      bars: barsGain,
      note: noteParts.join(" — ")
    });
    if (streakBar) {
      try { pushNotice("green", "Streak Day " + w.streakDays + " — you earned a Bar!", { transient: true }); } catch (eN) {}
    }
    if (weekly) {
      try { pushNotice("green", "Weekly login complete — +100 coins + 1 Bar!", { transient: true }); } catch (eW) {}
    }
    dailyRewardPending = {
      streakDays: w.streakDays,
      coins: coinsGain,
      bars: barsGain,
      weekly: weekly
    };
    // How this works: small XP on each daily claim (feeds Level badge).
    try { grantXp(uid, 15, { kind: "login" }); } catch (eXp) {}
    return dailyRewardPending;
  }
  function tryStatusCoinGrant(userId) {
    // +5 coins once per calendar day when status is set.
    if (!userId) return;
    var w = loadWallet(userId);
    var today = localDayKey();
    if (w.statusCoinDay === today) return;
    w.statusCoinDay = today;
    saveWallet(userId, w);
    grantCurrency(userId, 5, 0, { kind: "status", label: "Status update", note: "+5 coins for setting status" });
    try { grantXp(userId, 5, { kind: "status" }); } catch (eXpSt) {}
  }
  function dismissDailyRewardModal() {
    // How this works: clear pending + remove modal. Modal lives on document.body (outside #app),
    // so dismiss must NOT rely on #app click delegation alone.
    dailyRewardPending = null;
    var dm = document.getElementById("daily-reward-modal");
    if (dm) dm.remove();
  }
  function dailyRewardModalHtml() {
    if (!dailyRewardPending) return "";
    var r = dailyRewardPending;
    var barBit = r.bars ? (" + " + r.bars + " Bar" + (r.bars > 1 ? "s" : "")) : "";
    var weekBit = r.weekly ? '<p class="meta">Weekly streak complete — bonus included.</p>' : "";
    // No stopPropagation on the card — that blocked the Nice! button from reaching listeners.
    return '<div class="modal-backdrop" id="daily-reward-modal" role="presentation">'
      + '<div class="modal-card daily-reward-card" role="dialog" aria-modal="true" aria-label="Daily reward">'
      +   '<h2>Daily reward</h2>'
      +   '<p><b>Day ' + esc(String(r.streakDays)) + ' streak</b> — +' + esc(String(r.coins)) + ' coins' + esc(barBit) + '</p>'
      +   weekBit
      +   '<p class="meta">Coins &amp; Bars are play currency — no real-money purchases.</p>'
      +   '<button type="button" class="action-btn" id="daily-reward-ok" data-daily-dismiss="1">Nice!</button>'
      + '</div></div>';
  }
  function ensureDailyRewardModal() {
    var existing = document.getElementById("daily-reward-modal");
    if (!dailyRewardPending) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = dailyRewardModalHtml();
    var modal = wrap.firstChild;
    if (!modal) return;
    // How this works: bind dismiss on the modal itself (body-level), not only #app clicks.
    modal.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t) return;
      if (t.getAttribute && t.getAttribute("data-daily-dismiss") === "1") {
        dismissDailyRewardModal();
        return;
      }
      if (t.closest && t.closest("[data-daily-dismiss]")) {
        dismissDailyRewardModal();
        return;
      }
      // Click dimmed backdrop (not the card) to dismiss
      if (t === modal) dismissDailyRewardModal();
    });
    document.body.appendChild(modal);
    try {
      var ok = document.getElementById("daily-reward-ok");
      if (ok) ok.focus();
    } catch (eF) {}
  }
  function refreshWalletChrome() {
    var s = session();
    if (!s || !s.user) return;
    var snap = getWalletSnapshot(s.user.id);
    var coinsEl = document.querySelector(".who-stats .stat.coins, .who-stats .wallet-coins");
    var barsEl = document.querySelector(".who-stats .stat.bars, .who-stats .wallet-bars");
    if (coinsEl) coinsEl.innerHTML = esc(String(snap.coins)) + ' <span class="stat-label">coins</span>';
    if (barsEl) barsEl.innerHTML = esc(String(snap.bars)) + ' <span class="stat-label">bars</span>';
  }
  function clearStrayUI() {
    goMenuOpen = false;
    roomMenuOpen = false;
    partyPanelOpen = false;
    playlistPanelOpen = false;
    playlistPanelDirty = false;
    roomPreviewOpen = false;
    roomPreviewId = null;
    roomEmbedExpanded = false;
    roomItemsPanelOpen = false;
    roomSharePanelOpen = false;
    helpOpen = false;
    legalOpen = false;
    devHubOpen = false;
    avatarGuideOpen = false;
    invitePanelOpen = false;
    occMenuId = null;
    friendInvitePending = null;
    hangoutInvitePending = null;
    chatOptsOpen = false;
    chatNameMenu = null;
    profileEditSection = null;
    var gm = document.getElementById("go-menu");
    if (gm) gm.hidden = true;
    var rm = document.getElementById("room-menu");
    if (rm) rm.hidden = true;
    var orphanParty = document.getElementById("party-panel");
    if (orphanParty && !document.querySelector(".workspace #party-panel")) orphanParty.remove();
    var plPanel = document.getElementById("room-playlist-panel");
    if (plPanel) plPanel.remove();
    var rpPanel = document.getElementById("room-preview-panel");
    if (rpPanel) rpPanel.remove();
    var curtain = document.getElementById("room-enter-curtain");
    if (curtain) curtain.remove();
    if (roomEnterCurtainTimer) {
      try { clearTimeout(roomEnterCurtainTimer); } catch (eT) {}
      roomEnterCurtainTimer = null;
    }
    try {
      var dockClr = document.getElementById("room-embed-dock");
      if (dockClr) {
        dockClr.classList.remove("is-expanded");
        // leave iframe; sync/leave paths clear fully when needed
      }
    } catch (eDockClr) {}
    var buddy = document.getElementById("buddy-invite-modal");
    if (buddy) buddy.remove();
    var com = document.getElementById("chat-opts-menu");
    if (com) com.hidden = true;
    var cnm = document.getElementById("chat-name-menu");
    if (cnm) cnm.remove();
    var mdp = document.getElementById("make-door-panel");
    if (mdp) mdp.remove();
    clearTransientNotices();
  }

  function roomLayoutStorageKey(roomId) {
    // How this works (?v=20260906at): one layout blob per room id (loft + created rooms).
    roomId = String(roomId || (typeof currentRoomId !== "undefined" ? currentRoomId : "") || "loft");
    return "whirled2.roomLayout." + roomId;
  }
  function loadRoomLayout(roomId) {
    // How this works: load decorate chips (+ optional doorTo) for the active or given room.
    // Beginner: loft still reads the classic whirled2.roomLayout.loft key.
    roomId = String(roomId || (typeof currentRoomId !== "undefined" ? currentRoomId : "") || "loft");
    var key = roomLayoutStorageKey(roomId);
    try {
      var rawStr = localStorage.getItem(key);
      // Migrate: if loft key empty but legacy constant had data, keep using ROOM_LAYOUT_KEY.
      if (!rawStr && roomId === "loft") rawStr = localStorage.getItem(ROOM_LAYOUT_KEY);
      var raw = JSON.parse(rawStr || '{"items":[]}');
      if (!raw || !Array.isArray(raw.items)) return { items: [] };
      return raw;
    } catch (e) { return { items: [] }; }
  }
  function saveRoomLayout(layout, roomId) {
    // How this works: persist chips for this room (cap 80). Doors keep doorTo/doorLabel.
    roomId = String(roomId || (typeof currentRoomId !== "undefined" ? currentRoomId : "") || "loft");
    try {
      var items = (layout && layout.items) ? layout.items.slice(0, 80) : [];
      var payload = JSON.stringify({ items: items });
      localStorage.setItem(roomLayoutStorageKey(roomId), payload);
      if (roomId === "loft") {
        try { localStorage.setItem(ROOM_LAYOUT_KEY, payload); } catch (e0) {}
      }
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
  // ---------------------------------------------------------------------------
  // Room lock + multi-room catalog (wiki Room / Create Whirleds)
  // How this works: whirled2.rooms maps roomId → { id, name, ownerId, lock, createdAt }.
  //   Legacy whirled2.roomLock.loft still syncs for Studio Loft.
  //   unlocked → anyone may enter
  //   friends  → lock owner, room owner, loft first-user, or mutual friends
  //   locked   → only room/lock owner (and loft first-user for loft)
  // ENGINE DEV: lock + catalog are chrome/lobby gates only — never remount #stage-slot.
  // ---------------------------------------------------------------------------
  function defaultRoomLock() {
    return { mode: "unlocked", ownerId: "" };
  }
  function normalizeLockMode(mode) {
    mode = mode || "unlocked";
    if (mode !== "unlocked" && mode !== "friends" && mode !== "locked") mode = "unlocked";
    return mode;
  }
  function readLegacyLoftLock() {
    // How this works: always return { mode, ownerId }; migrate legacy string values.
    try {
      var raw = localStorage.getItem(ROOM_LOCK_KEY);
      if (!raw) return defaultRoomLock();
      if (raw === "unlocked" || raw === "friends" || raw === "locked") {
        var migrated = { mode: raw, ownerId: "" };
        try {
          migrated.ownerId = localStorage.getItem(FIRST_USER_KEY)
            || (session() && session().user && session().user.id)
            || "";
        } catch (e0) {}
        try { localStorage.setItem(ROOM_LOCK_KEY, JSON.stringify(migrated)); } catch (e1) {}
        return migrated;
      }
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return defaultRoomLock();
      return { mode: normalizeLockMode(obj.mode), ownerId: String(obj.ownerId || "") };
    } catch (e) { return defaultRoomLock(); }
  }
  function defaultLoftRoom() {
    // How this works: Studio Loft is the seeded home whirled (not a fake public catalog).
    // Beginner: loft always exists; other rooms appear only when you Create Room.
    var first = "";
    try { first = localStorage.getItem(FIRST_USER_KEY) || ""; } catch (e) {}
    var legacy = readLegacyLoftLock();
    var ownerId = String(legacy.ownerId || first || "");
    return {
      id: "loft",
      name: "Studio Loft",
      ownerId: ownerId,
      lock: { mode: normalizeLockMode(legacy.mode), ownerId: ownerId || String(legacy.ownerId || "") },
      createdAt: "",
      blurb: "home whirled",
      thumbDataUrl: null,
      markedWhirledId: null,
      seed: true
    };
  }
  function loadRoomsCatalog() {
    // How this works: load whirled2.rooms object map; always ensure loft seed exists.
    // Beginner: one shared Studio Loft + any rooms you paid (or first-free) to create.
    var map = {};
    try {
      var raw = localStorage.getItem(ROOMS_CATALOG_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) map = parsed;
        else if (Array.isArray(parsed)) {
          parsed.forEach(function (r) { if (r && r.id) map[r.id] = r; });
        }
      }
    } catch (e) { map = {}; }
    if (!map.loft) map.loft = defaultLoftRoom();
    else {
      // Merge legacy lock onto loft if catalog lock missing.
      var loft = map.loft;
      if (!loft.lock || !loft.lock.mode) {
        var leg = readLegacyLoftLock();
        loft.lock = { mode: normalizeLockMode(leg.mode), ownerId: String(leg.ownerId || loft.ownerId || "") };
      }
      loft.name = loft.name || "Studio Loft";
      loft.id = "loft";
      map.loft = loft;
    }
    return map;
  }
  function saveRoomsCatalog(map) {
    try { localStorage.setItem(ROOMS_CATALOG_KEY, JSON.stringify(map || {})); } catch (e) {}
  }
  function getRoom(roomId) {
    roomId = roomId || currentRoomId || "loft";
    var map = loadRoomsCatalog();
    return map[roomId] || (roomId === "loft" ? defaultLoftRoom() : null);
  }
  function activeRoomName() {
    var r = getRoom(currentRoomId || "loft");
    return (r && r.name) || ROOM || "Studio Loft";
  }
  function ownedRoomsFor(userId) {
    // How this works: My Rooms = rooms whose ownerId matches this player.
    userId = String(userId || "");
    if (!userId) return [];
    var map = loadRoomsCatalog();
    return Object.keys(map).map(function (k) { return map[k]; }).filter(function (r) {
      return r && String(r.ownerId || "") === userId;
    }).sort(function (a, b) {
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
  }
  function listRoomsArray() {
    var map = loadRoomsCatalog();
    return Object.keys(map).map(function (k) { return map[k]; }).filter(Boolean);
  }
  function newRoomId() {
    return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function spendCurrency(userId, coinsSpend, barsSpend, meta) {
    // How this works: deduct earn-only Coins/Bars for room create (never Buy Bars).
    // Beginner: fails honestly if the wallet cannot cover the cost.
    if (!userId) return { ok: false, reason: "session" };
    coinsSpend = Math.max(0, Number(coinsSpend) || 0);
    barsSpend = Math.max(0, Number(barsSpend) || 0);
    var w = loadWallet(userId);
    if ((Number(w.coins) || 0) < coinsSpend) return { ok: false, reason: "coins", wallet: w };
    if ((Number(w.bars) || 0) < barsSpend) return { ok: false, reason: "bars", wallet: w };
    var next = grantCurrency(userId, -coinsSpend, -barsSpend, meta || { kind: "spend", label: "Spend" });
    return { ok: true, wallet: next };
  }
  function createOwnedRoom(opts) {
    // How this works: Me → My Rooms / lobby Create Room — name + pay Coins OR Bars + optional lock.
    // Beginner: first owned room is free; later rooms cost 10,000 coins OR 1 bar (classic).
    // ENGINE DEV: only writes whirled2.rooms + wallet; does not touch #stage-slot until Enter.
    opts = opts || {};
    var s = session();
    if (!s || !s.user) return { ok: false, error: "Sign in to create a room." };
    var uid = String(s.user.id);
    var name = String(opts.name || "").trim() || "Home";
    name = name.slice(0, 48);
    var blurb = String(opts.blurb || "").trim().slice(0, 120);
    var lockMode = normalizeLockMode(opts.lockMode || "unlocked");
    // How this works: Studio Loft seed does not consume the classic “one free home” create.
    // Beginner: your first *created* room is free; loft stays the Featured seed.
    var owned = ownedRoomsFor(uid).filter(function (r) { return r && !r.seed; });
    var isFree = owned.length === 0;
    var payWith = String(opts.payWith || (isFree ? "free" : "coins"));
    if (!isFree) {
      if (payWith !== "coins" && payWith !== "bars") {
        return { ok: false, error: "Choose Coins (10,000) or Bars (1)." };
      }
      var spent = payWith === "bars"
        ? spendCurrency(uid, 0, ROOM_CREATE_BARS, {
            kind: "room",
            label: "Create room",
            note: "−1 bar for room “" + name + "”"
          })
        : spendCurrency(uid, ROOM_CREATE_COINS, 0, {
            kind: "room",
            label: "Create room",
            note: "−" + ROOM_CREATE_COINS + " coins for room “" + name + "”"
          });
      if (!spent.ok) {
        if (spent.reason === "bars") {
          return { ok: false, error: "Not enough Bars (need 1). Earn Bars from login streaks — Buy stays disabled." };
        }
        return { ok: false, error: "Not enough Coins (need 10,000). Earn Coins from daily login — no payments." };
      }
    }
    var id = newRoomId();
    var room = {
      id: id,
      name: name,
      ownerId: uid,
      lock: { mode: lockMode, ownerId: uid },
      createdAt: new Date().toISOString(),
      blurb: blurb || (isFree ? "first home (free)" : ""),
      thumbDataUrl: null,
      markedWhirledId: null,
      seed: false
    };
    var map = loadRoomsCatalog();
    map[id] = room;
    saveRoomsCatalog(map);
    return { ok: true, room: room, free: isFree, payWith: isFree ? "free" : payWith };
  }

  // ---------------------------------------------------------------------------
  // Make Door / room graph (?v=20260906at) — wiki Door chrome
  // How this works: any decorate chip can become a door (doorTo + doorLabel).
  //   Decorate → select chip → Make Door → create new room OR link existing →
  //   leave decorate → click green door → tryEnterRoom(doorTo).
  // Beginner: Drop Door removes the link but keeps the furniture + the room.
  // ENGINE DEV: travel only flips currentRoomId + paint; #stage-slot contract unchanged.
  // ---------------------------------------------------------------------------
  function ensureDoorStubFurniture() {
    // How this works: if Stuff has no furniture, seed one pale-blue "Doorframe stub"
    // so Make Door is usable without inventing a shop catalog.
    var items = loadStuff();
    var hasFurn = items.some(function (it) { return itemCat(it) === "furniture"; });
    if (hasFurn) return null;
    var stub = {
      id: "furn-door-stub",
      name: "Doorframe stub",
      kind: "furniture",
      cat: "furniture",
      thumb: "",
      creator: "Whirled2",
      blurb: "Starter doorway furniture for Make Door (not a shop SKU).",
      at: new Date().toISOString(),
      stubDoor: true
    };
    items.unshift(stub);
    try { saveStuff(items); } catch (e) {}
    return stub;
  }
  function findLayoutItem(decId, roomId) {
    var layout = loadRoomLayout(roomId);
    for (var i = 0; i < layout.items.length; i++) {
      if (layout.items[i] && layout.items[i].id === decId) return layout.items[i];
    }
    return null;
  }
  function updateLayoutItem(decId, patch, roomId) {
    roomId = roomId || currentRoomId || "loft";
    var layout = loadRoomLayout(roomId);
    var found = false;
    layout.items = (layout.items || []).map(function (it) {
      if (!it || it.id !== decId) return it;
      found = true;
      var next = Object.assign({}, it, patch || {});
      return next;
    });
    if (!found) return false;
    saveRoomLayout(layout, roomId);
    return true;
  }
  function makeDoorLink(decId, targetRoomId, label) {
    // How this works: mark chip as door → targetRoomId. Classic green glow when clickable.
    if (!decId || !targetRoomId) return { ok: false, error: "Pick furniture and a destination room." };
    if (!getRoom(targetRoomId)) return { ok: false, error: "That room is not on this browser." };
    var r = getRoom(targetRoomId);
    var doorLabel = String(label || (r && r.name) || targetRoomId).slice(0, 48);
    if (!updateLayoutItem(decId, { doorTo: targetRoomId, doorLabel: doorLabel })) {
      return { ok: false, error: "Furniture chip not found in this room." };
    }
    try { awardAction("makeDoor"); } catch (eA) {}
    return { ok: true, doorTo: targetRoomId, doorLabel: doorLabel };
  }
  function makeDoorCreateRoom(decId, opts) {
    // How this works: wiki — Make Door can create a new room, then link this chip to it.
    // Beginner: same earn-only createOwnedRoom costs (first free / 10k coins / 1 bar).
    opts = opts || {};
    var created = createOwnedRoom({
      name: opts.name || "Home",
      blurb: opts.blurb || "via Make Door",
      lockMode: opts.lockMode || "unlocked",
      payWith: opts.payWith || "coins"
    });
    if (!created.ok) return created;
    var linked = makeDoorLink(decId, created.room.id, created.room.name);
    if (!linked.ok) return linked;
    return { ok: true, room: created.room, free: created.free, doorTo: created.room.id };
  }
  function dropDoor(decId, roomId) {
    // How this works: wiki Drop Door — furniture stays; room still exists; only door link clears.
    roomId = roomId || currentRoomId || "loft";
    var layout = loadRoomLayout(roomId);
    var ok = false;
    layout.items = (layout.items || []).map(function (it) {
      if (!it || it.id !== decId) return it;
      ok = true;
      var next = Object.assign({}, it);
      delete next.doorTo;
      delete next.doorLabel;
      return next;
    });
    if (!ok) return false;
    saveRoomLayout(layout, roomId);
    return true;
  }
  function travelThroughDoor(decId) {
    // How this works: click a door chip outside decorate mode → enter linked room.
    var it = findLayoutItem(decId, currentRoomId || "loft");
    if (!it || !it.doorTo) {
      pushNotice("orange", "That furniture is not a door yet. Decorate → Make Door.", { transient: true });
      return false;
    }
    var dest = it.doorTo;
    var label = it.doorLabel || (getRoom(dest) && getRoom(dest).name) || dest;
    if (!tryEnterRoom(dest)) return false;
    beginRoomChatVisit(dest);
    try { awardAction("doorTravel"); } catch (eT) {}
    // system line added after begin (begin already pushed a fresh-visit note)
    try {
      pushSystemChat("You go through the door to “" + label + "”.");
    } catch (eS) {}
    pushNotice("green", "Entered “" + label + "”.", { transient: true });
    paint("rooms");
    try { loadOccupants(); } catch (eO) {}
    try { bindDoorLayerClicks(); } catch (eB) {}
    return true;
  }
  function doorDestOptionsHtml(excludeId) {
    // How this works: <select> of rooms you can link to (owned + loft).
    var s = session();
    var uid = s && s.user ? String(s.user.id) : "";
    var rooms = listRoomsArray().filter(function (r) {
      if (!r || !r.id) return false;
      if (excludeId && r.id === excludeId) return false;
      // Allow loft + rooms you own (classic: link to your graph).
      if (r.id === "loft") return true;
      if (uid && String(r.ownerId || "") === uid) return true;
      return false;
    });
    if (!rooms.length) return '<option value="">No rooms yet</option>';
    return rooms.map(function (r) {
      return '<option value="' + esc(r.id) + '">' + esc(r.name || r.id) + (r.id === "loft" ? " (home)" : "") + '</option>';
    }).join("");
  }
  function makeDoorPanelHtml() {
    // How this works: pale-blue Make Door panel — create new OR link existing (wiki Door).
    if (!makeDoorPanelOpen || !selectedDecId) return "";
    var it = findLayoutItem(selectedDecId);
    if (!it) return "";
    var s = session();
    var uid = s && s.user ? String(s.user.id) : "";
    var ownedN = ownedRoomsFor(uid).filter(function (r) { return r && !r.seed; }).length;
    var isFree = ownedN === 0;
    var snap = uid ? getWalletSnapshot(uid) : { coins: 0, bars: 0 };
    var curDoor = it.doorTo
      ? ('<p class="meta door-current">Door → <b>' + esc(it.doorLabel || it.doorTo) + '</b> (<code>' + esc(it.doorTo) + '</code>)</p>'
        + '<button type="button" class="action-btn" data-drop-door="' + esc(it.id) + '">Drop Door</button>')
      : '<p class="meta">Not a door yet — create a room or link an existing one.</p>';
    var payBtns = isFree
      ? '<button type="button" class="action-btn" data-make-door-create="free">Create free room + door</button>'
      : ('<button type="button" class="action-btn" data-make-door-create="coins"'
        + ((snap.coins >= ROOM_CREATE_COINS) ? "" : " disabled") + '>Pay 10,000 Coins + door</button>'
        + '<button type="button" class="action-btn" data-make-door-create="bars"'
        + ((snap.bars >= ROOM_CREATE_BARS) ? "" : " disabled") + '>Pay 1 Bar + door</button>');
    return '<div class="room-side-panel make-door-panel" id="make-door-panel">'
      + '<div class="panel">'
      +   '<div class="room-side-head"><h2>Make Door</h2>'
      +     '<button type="button" class="text-btn" data-make-door-close="1">Close</button></div>'
      +   '<p class="meta">Wiki Door: turn furniture into a doorway. Green glow = travel. Drop Door keeps the room.</p>'
      +   '<p class="meta">Selected: <b>' + esc(it.name || "Furniture") + '</b></p>'
      +   curDoor
      +   '<div class="section-label">Create a new room (classic cost)</div>'
      +   '<label class="create-room-label">New room name'
      +     '<input type="text" id="make-door-name" maxlength="48" value="Home" /></label>'
      +   '<div class="create-room-actions">' + payBtns + '</div>'
      +   '<div class="section-label">Or link an existing room</div>'
      +   '<label class="create-room-label">Destination'
      +     '<select id="make-door-target">' + doorDestOptionsHtml(currentRoomId || "loft") + '</select></label>'
      +   '<button type="button" class="action-btn" data-make-door-link="1">Link door</button>'
      +   '<p class="meta">Earn-only coins/bars — no Buy Bars. ENGINE DEV: doorTo on layout chip only.</p>'
      + '</div></div>';
  }

  function loadRoomLock(roomId) {
    // How this works: prefer lock on whirled2.rooms[roomId]; loft also mirrors legacy key.
    roomId = roomId || currentRoomId || "loft";
    var room = getRoom(roomId);
    if (room && room.lock && room.lock.mode) {
      return { mode: normalizeLockMode(room.lock.mode), ownerId: String(room.lock.ownerId || room.ownerId || "") };
    }
    if (roomId === "loft") return readLegacyLoftLock();
    return defaultRoomLock();
  }
  function canSetRoomLock(roomId) {
    // How this works: room owner (or loft first-user on loft) may change Unlocked/Friends/Locked.
    // Beginner: only the room owner flips the three lock choices (wiki Room control bar).
    roomId = roomId || currentRoomId || "loft";
    var s = session();
    if (!s || !s.user) return false;
    var sid = String(s.user.id);
    var room = getRoom(roomId);
    if (room && room.ownerId && String(room.ownerId) === sid) return true;
    if (roomId === "loft" && isLoftOwner()) return true;
    var lock = loadRoomLock(roomId);
    if (lock && lock.ownerId && String(lock.ownerId) === sid) return true;
    if (!lock || !lock.ownerId) return true;
    return false;
  }
  function saveRoomLock(mode, roomId) {
    // How this works: owner sets Unlocked / Friends / Locked; stamps ownerId on room + legacy loft key.
    // Beginner: guests cannot change the lock — buttons are disabled for them.
    roomId = roomId || currentRoomId || "loft";
    if (!canSetRoomLock(roomId)) return;
    mode = normalizeLockMode(mode);
    var ownerId = "";
    try {
      if (session() && session().user && session().user.id) ownerId = String(session().user.id);
      else ownerId = localStorage.getItem(FIRST_USER_KEY) || "";
    } catch (e) {}
    var map = loadRoomsCatalog();
    var room = map[roomId] || (roomId === "loft" ? defaultLoftRoom() : null);
    if (!room) return;
    room.lock = { mode: mode, ownerId: ownerId };
    if (!room.ownerId) room.ownerId = ownerId;
    map[roomId] = room;
    saveRoomsCatalog(map);
    if (roomId === "loft") {
      try { localStorage.setItem(ROOM_LOCK_KEY, JSON.stringify({ mode: mode, ownerId: ownerId })); } catch (e2) {}
    }
  }
  function canEnterRoom(viewerId, roomId) {
    // How this works: gate preview Enter / Visit Home / Go home before setting inRoom.
    roomId = roomId || "loft";
    var lock = loadRoomLock(roomId);
    var mode = (lock && lock.mode) || "unlocked";
    if (mode === "unlocked") return true;
    viewerId = String(viewerId || "");
    if (!viewerId) return false;
    var ownerId = String((lock && lock.ownerId) || "");
    var room = getRoom(roomId);
    if (room && room.ownerId && String(room.ownerId) === viewerId) return true;
    var first = "";
    try { first = localStorage.getItem(FIRST_USER_KEY) || ""; } catch (e) {}
    if (viewerId === ownerId || (roomId === "loft" && first && viewerId === first)) return true;
    if (mode === "locked") return false;
    if (mode === "friends") {
      var friends = loadFriends();
      if (ownerId && friends.some(function (f) { return String(f.id) === ownerId; })) return true;
      if (room && room.ownerId && friends.some(function (f) { return String(f.id) === String(room.ownerId); })) return true;
      return false;
    }
    return true;
  }
  function canEnterLoft(viewerId) {
    return canEnterRoom(viewerId, "loft");
  }
  function tryEnterRoom(roomId) {
    // How this works: shared enter path — block → notice + stay lobby; else enter room id.
    // Beginner: currentRoomId drives name/lock chrome; #stage-slot still mounts the same way.
    roomId = roomId || "loft";
    if (!getRoom(roomId)) {
      pushNotice("orange", "That room is not on this browser.");
      inRoom = false;
      return false;
    }
    var sid = session() && session().user && session().user.id;
    if (!canEnterRoom(sid, roomId)) {
      var mode = (loadRoomLock(roomId).mode || "locked");
      var rname = (getRoom(roomId) && getRoom(roomId).name) || roomId;
      var msg = mode === "friends"
        ? (rname + " is friends-only right now. You cannot enter.")
        : (rname + " is locked. Only the room owner can enter.");
      pushNotice("orange", msg);
      inRoom = false;
      return false;
    }
    currentRoomId = roomId;
    inRoom = true;
    roomImmersiveForcedOff = false;
    try { trackRecentRoom({ id: roomId, name: activeRoomName() }); } catch (eR) {}
    try { updateLandscapeImmersion(); } catch (eImm) {}
    return true;
  }
  function tryEnterLoft() {
    // How this works: legacy alias — Go home / Visit Home still enter Studio Loft.
    return tryEnterRoom("loft");
  }
  function createRoomPanelHtml(opts) {
    // How this works: Create Room shell — name, optional lock triad, pay Coins OR Bars.
    // Beginner: first owned room is free; later costs classic 10k coins or 1 bar (earn-only).
    opts = opts || {};
    var s = session();
    var uid = s && s.user ? String(s.user.id) : "";
    var ownedN = ownedRoomsFor(uid).filter(function (r) { return r && !r.seed; }).length;
    var isFree = ownedN === 0;
    var snap = uid ? getWalletSnapshot(uid) : { coins: 0, bars: 0 };
    var defName = isFree ? "Home" : ((you().name || "Player") + "'s Room");
    var costMeta = isFree
      ? '<p class="meta create-room-cost">Your <b>first</b> room is <b>free</b> (classic one free home). Later rooms cost <b>10,000 coins</b> OR <b>1 bar</b> — earn-only, no Buy Bars.</p>'
      : '<p class="meta create-room-cost">Classic cost: <b>10,000 coins</b> OR <b>1 bar</b>. Wallet: '
        + esc(String(snap.coins)) + ' coins · ' + esc(String(snap.bars)) + ' bars (earn-only).</p>';
    var payBtns = isFree
      ? '<button type="button" class="action-btn" data-create-room-pay="free">Create free room</button>'
      : ('<button type="button" class="action-btn" data-create-room-pay="coins"'
        + ((snap.coins >= ROOM_CREATE_COINS) ? "" : " disabled") + '>Pay 10,000 Coins</button>'
        + '<button type="button" class="action-btn" data-create-room-pay="bars"'
        + ((snap.bars >= ROOM_CREATE_BARS) ? "" : " disabled") + '>Pay 1 Bar</button>');
    return '<div class="panel create-room-panel" id="create-room-panel">'
      +   '<div class="room-side-head"><h2>Create Room</h2>'
      +     (opts.closeable !== false ? '<button type="button" class="text-btn" data-create-room-close="1">Close</button>' : '')
      +   '</div>'
      +   '<p class="meta">Classic path: Me → My Rooms. Starts Home-like. Parties = toolbar · Themed Whirled = Groups (Coming Soon).</p>'
      +   costMeta
      +   '<label class="create-room-label">Room name'
      +     '<input type="text" id="create-room-name" maxlength="48" value="' + esc(defName) + '" placeholder="Home" /></label>'
      +   '<label class="create-room-label">Blurb (optional)'
      +     '<input type="text" id="create-room-blurb" maxlength="120" placeholder="Short description" /></label>'
      +   '<div class="section-label">Starting lock (optional)</div>'
      +   '<div class="create-room-lock-row" role="group" aria-label="Starting privacy">'
      +     '<label class="create-lock-opt"><input type="radio" name="create-room-lock" value="unlocked" checked /> 🔓 Unlocked</label>'
      +     '<label class="create-lock-opt"><input type="radio" name="create-room-lock" value="friends" /> 👥 Friends</label>'
      +     '<label class="create-lock-opt"><input type="radio" name="create-room-lock" value="locked" /> 🔒 Locked</label>'
      +   '</div>'
      +   '<p class="meta">Doors: Decorate Room → select furniture → <b>Make Door</b> (create or link). Snapshot thumbs — Coming Soon.</p>'
      +   '<div class="create-room-actions">' + payBtns + '</div>'
      + '</div>';
  }
  function myRoomsTilesHtml(ownerId, opts) {
    // How this works: tiles for rooms you own (+ always show loft seed in lobby Featured separately).
    opts = opts || {};
    var me = you();
    ownerId = String(ownerId || (session() && session().user && session().user.id) || "");
    var list = ownedRoomsFor(ownerId);
    if (!list.length && opts.includeLoftFallback) {
      // Beginner: if you own nothing yet, still show Studio Loft so My Rooms is never a blank void.
      var loft = getRoom("loft");
      list = loft ? [loft] : [];
    }
    if (!list.length) {
      return '<div class="panel"><p class="meta">No owned rooms yet. Create your first room free below.</p></div>';
    }
    var online = liveOccupants.length || 0;
    return '<div class="room-tiles">' + list.map(function (r) {
      var isLoft = r.id === "loft";
      var occ = (isLoft && currentRoomId === "loft") ? (online || (session() ? 1 : 0)) : (session() && currentRoomId === r.id ? 1 : 0);
      return roomTile({
        id: r.id,
        name: r.name || "Room",
        meta: "owner: " + me.name + (r.blurb ? (" · " + r.blurb) : (isLoft ? " · home" : "")),
        online: occ,
        rating: isLoft ? loftRatingLabel() : "Rating: new",
        enterable: true,
        lockMode: (r.lock && r.lock.mode) || "unlocked"
      });
    }).join("") + '</div>';
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

  // ---------------------------------------------------------------------------
  // Game scores stub (localStorage whirled2.gameScores)
  // How this works (beginner): when you finish a parlor game later, chrome can
  // push { gameId, name, score, at }. Today we only DISPLAY whatever is already
  // saved — we never invent fake leaderboards.
  // ENGINE DEV: scores are chrome-only; parlor Pixi games will call a bridge later.
  // ---------------------------------------------------------------------------
  function loadGameScores() {
    // Purpose: read local high-score rows (or []).
    // How: JSON.parse whirled2.gameScores; bad data → empty list.
    // Why: Games → My scores shows real local stubs only.
    try { return JSON.parse(localStorage.getItem(GAME_SCORES_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveGameScores(list) {
    // Purpose: persist capped local score rows.
    // How: stringify up to 100 entries into whirled2.gameScores.
    // Why: keep phone storage small; ENGINE DEV does not touch #stage-slot.
    try { localStorage.setItem(GAME_SCORES_KEY, JSON.stringify((list || []).slice(0, 100))); } catch (e) {}
  }
  function gamesComingSoonPlaceholders() {
    // Purpose: show clearly-labeled Coming Soon cards (NOT fake catalog titles).
    // How: return static stub objects rendered without data-game-open.
    // Why: wiki-accurate empty Games home without inventing live whirled2.games rows.
    return [
      { title: "Parlor tables", blurb: "Classic multiplayer tables on a separate Games screen. Engine mount Coming Soon." },
      { title: "AVR hide & seek", blurb: "In-room AVR overlay games (play while hanging in a loft). Coming Soon." },
      { title: "Passport play stamps", blurb: "Earn Play-category stamps from real parlor sessions. Stub until engine ships." }
    ];
  }
  function gamesHomeNavHtml(active) {
    // Purpose: top nav for Games home (Browse / Tables / AVR / My scores).
    // How: pill buttons set gamesMode via data-games-home.
    // Why: clearer wiki-style Games landing without inventing catalog.
    var items = [
      ["browse", "Browse"],
      ["lobby", "Tables"],
      ["avr", "AVR Coming Soon"],
      ["scores", "My scores"]
    ];
    return '<nav class="games-home-nav" aria-label="Games sections">'
      + items.map(function (it) {
          return '<button type="button" class="games-nav-btn' + (active === it[0] ? " is-on" : "") + '" data-games-home="' + it[0] + '">' + it[1] + '</button>';
        }).join("")
      + '</nav>';
  }
  function parlorAvrExplainerHtml() {
    // Purpose: wiki-accurate Parlor vs AVR explainer cards.
    // How: two cards — parlor = separate screen; AVR = in-room overlay (Coming Soon).
    // Why: teach beginners before any engine exists. ENGINE DEV: AVR will overlay #stage-slot later.
    return '<div class="games-explain-grid">'
      + '<div class="games-explain-card">'
      +   '<h3>Parlor games</h3>'
      +   '<p>Open on a <b>separate Games screen</b> (tables lobby). You leave the room stage to play. Tables and Create Game live under Tables.</p>'
      + '</div>'
      + '<div class="games-explain-card">'
      +   '<h3>AVR (in-room)</h3>'
      +   '<p>AVR games overlay <b>inside your room</b> while you hang out — hide &amp; seek style. Not a parlor table.</p>'
      +   '<span class="soon-tag">Coming Soon</span>'
      + '</div>'
      + '</div>';
  }
  function gamesSoonCardsHtml() {
    // Purpose: render Coming Soon placeholder cards (never pretend-real catalog).
    // How: map gamesComingSoonPlaceholders() to .game-soon-card (no open handler).
    // Why: fill empty shelf honestly.
    return '<div class="games-soon-grid">' + gamesComingSoonPlaceholders().map(function (c) {
      return '<div class="game-soon-card" aria-label="Coming Soon">'
        + '<span class="soon-ribbon">Coming Soon</span>'
        + '<h3>' + esc(c.title) + '</h3>'
        + '<p>' + esc(c.blurb) + '</p></div>';
    }).join("") + '</div>';
  }
  function gamesScoresPage() {
    // Purpose: My scores — local stub list from whirled2.gameScores.
    // How: loadGameScores(); empty → Passport stamps Coming Soon message.
    // Why: never invent leaderboards. ENGINE DEV: parlor will write scores later.
    var rows = loadGameScores();
    var body;
    if (!rows.length) {
      body = '<div class="panel"><p class="meta">No local scores yet. Play to earn Passport stamps — <b>Coming Soon</b> with the parlor engine.</p>'
        + '<p class="meta">Scores save under <code>whirled2.gameScores</code> when games can report results.</p></div>';
    } else {
      body = '<div class="game-scores-list">' + rows.map(function (r) {
        return '<div class="game-score-row">'
          + '<div><b>' + esc(r.name || r.gameId || "Game") + '</b>'
          + '<p class="meta">' + esc((r.at || "").slice(0, 16).replace("T", " ")) + '</p></div>'
          + '<span class="price">' + esc(String(r.score != null ? r.score : "—")) + '</span></div>';
      }).join("") + '</div>';
    }
    return '<section class="page games-page">'
      + gamesHomeNavHtml("scores")
      + '<div class="page-head"><div><h1>My scores</h1>'
      + '<p class="meta">Local stub only — nothing invented.</p></div></div>'
      + body + '</section>';
  }
  function gamesAvrPage() {
    // Purpose: AVR Coming Soon landing (wiki-accurate in-room overlay games).
    // How: explainer + Coming Soon stubs; no fake live AVR catalog.
    // ENGINE DEV: future AVR mounts as overlay over #stage-slot — not a parlor screen.
    return '<section class="page games-page">'
      + gamesHomeNavHtml("avr")
      + '<div class="games-avr-panel">'
      +   '<h2>AVR — in-room games</h2>'
      +   '<p>Classic Whirled AVR means mini-games that play <b>on top of your room</b> (you stay in the loft). Hide &amp; seek is a common example.</p>'
      +   '<p class="meta"><b>Coming Soon</b> — no AVR catalog is invented here. Parlor tables are under Tables.</p>'
      +   '<span class="soon-tag">Coming Soon</span>'
      + '</div>'
      + '<div class="section-label">Placeholders (not live games)</div>'
      + gamesSoonCardsHtml()
      + '</section>';
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
  // Friendly People + news-read cursor + profile privacy (20260906q)
  // How this works: local flags only; never invent players. ENGINE DEV: chrome keys.
  // ---------------------------------------------------------------------------
  var FRIENDLY_KEY = "whirled2.friendly."; // + userId → "1" | "0"
  var NEWS_READ_KEY = "whirled2.newsRead."; // + userId → ISO timestamp cursor
  var PROFILE_PRIVACY_KEY = "whirled2.profilePrivacy."; // + userId → { information, wall }
  function isFriendly(userId) {
    if (!userId) return false;
    try { return localStorage.getItem(FRIENDLY_KEY + userId) === "1"; } catch (e) { return false; }
  }
  function setFriendly(userId, on) {
    if (!userId) return;
    try { localStorage.setItem(FRIENDLY_KEY + userId, on ? "1" : "0"); } catch (e) {}
  }
  function loadNewsReadAt(userId) {
    if (!userId) return "";
    try { return localStorage.getItem(NEWS_READ_KEY + userId) || ""; } catch (e) { return ""; }
  }
  function markNewsRead(userId) {
    if (!userId) return;
    try { localStorage.setItem(NEWS_READ_KEY + userId, new Date().toISOString()); } catch (e) {}
  }
  function defaultProfilePrivacy() {
    return { information: "public", wall: "public" };
  }
  function loadProfilePrivacy(userId) {
    var base = defaultProfilePrivacy();
    if (!userId) return base;
    try {
      var raw = JSON.parse(localStorage.getItem(PROFILE_PRIVACY_KEY + userId) || "null");
      if (!raw || typeof raw !== "object") return base;
      ["information", "wall"].forEach(function (k) {
        var v = String(raw[k] || "").toLowerCase();
        if (v === "public" || v === "friends" || v === "hidden") base[k] = v;
      });
      return base;
    } catch (e) { return base; }
  }
  function saveProfilePrivacy(userId, priv) {
    if (!userId || !priv) return;
    try { localStorage.setItem(PROFILE_PRIVACY_KEY + userId, JSON.stringify(priv)); } catch (e) {}
  }
  function canViewProfileSection(ownerId, section) {
    // How this works: enforce Public / Friends / Hidden for visitors on otherProfile.
    var s = session();
    var viewer = s && s.user ? String(s.user.id) : "";
    ownerId = String(ownerId || "");
    if (!ownerId) return false;
    if (viewer && viewer === ownerId) return true;
    var priv = loadProfilePrivacy(ownerId);
    var mode = priv[section] || "public";
    if (mode === "public") return true;
    if (mode === "hidden") return false;
    if (mode === "friends") {
      if (!viewer) return false;
      return loadFriendsFor(ownerId).some(function (f) { return String(f.id) === viewer; })
        || loadFriends().some(function (f) { return String(f.id) === ownerId; });
    }
    return true;
  }
  function listLocalUsersKnown() {
    // How this works: only whirled2.users + knownProfiles + friends + occupants — never invent.
    var out = [];
    var seen = {};
    function add(id, name) {
      id = String(id || "");
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push({ id: id, name: name || id });
    }
    try {
      var users = JSON.parse(localStorage.getItem("whirled2.users") || "{}");
      Object.keys(users || {}).forEach(function (id) {
        var u = users[id] || {};
        add(id, u.name || id);
      });
    } catch (eU) {}
    loadKnownProfiles().forEach(function (p) { add(p.id, p.name); });
    loadFriends().forEach(function (f) { add(f.id, f.name); });
    liveOccupants.forEach(function (p) { add(p.id, p.name); });
    try {
      var s = session();
      if (s && s.user) add(s.user.id, s.user.name);
    } catch (eS) {}
    return out;
  }
  function listFriendlyPeople() {
    var sid = session() && session().user ? String(session().user.id) : "";
    return listLocalUsersKnown().filter(function (p) {
      return isFriendly(p.id) && String(p.id) !== sid;
    });
  }
  function friendlyPeopleStripHtml() {
    // How this works (20260906af): Me home lists Friendly People under Friends Online.
    // Beginner: Friendly helpers auto-accept friend requests. Empty = honest "none yet".
    // ENGINE DEV: only real local users with whirled2.friendly.{id}=1 — never invent NPCs.
    var people = listFriendlyPeople();
    if (!people.length) {
      return '<p class="meta friendly-empty">No Friendly People yet. Helpers who turn on Friendly '
        + '(Account) show up here and auto-accept friend requests.</p>';
    }
    return '<div class="friendly-strip" role="list">' + people.map(function (p) {
      var ph = "";
      try { ph = localStorage.getItem("whirled2.photo." + p.id) || ""; } catch (ePh) {}
      var thumb = ph
        ? '<img src="' + ph + '" alt="" width="40" height="40" />'
        : '<span class="friend-fallback">' + esc(String(p.name || "?").slice(0, 1).toUpperCase()) + '</span>';
      return '<div class="friendly-row" role="listitem">'
        + '<button type="button" class="friend-thumb" data-profile="' + esc(p.id) + '" title="' + esc(p.name) + '">'
        + thumb + '<span>' + esc(p.name) + '</span></button>'
        + '<button type="button" class="action-btn" data-add-friend="' + esc(p.id) + '" data-friend-name="' + esc(p.name) + '">Add Friend</button>'
        + '</div>';
    }).join("") + '</div>';
  }
  function playersOnlineCount() {
    // How this works: honest local mock — session (you) + distinct friends online + loft occupants.
    var ids = {};
    var s = session();
    if (s && s.user) ids[String(s.user.id)] = true;
    var friendIds = {};
    loadFriends().forEach(function (f) { friendIds[String(f.id)] = true; });
    liveOccupants.forEach(function (p) {
      if (p && p.id) ids[String(p.id)] = true;
    });
    // Friends marked online via occupant list already counted; no invented extras.
    var n = Object.keys(ids).length;
    return Math.max(n, s ? 1 : 0);
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
        var dur = raw.bubbleDuration === "short" || raw.bubbleDuration === "long" ? raw.bubbleDuration : "medium";
        var sm = raw.speakMode === "think" || raw.speakMode === "shout" ? raw.speakMode : "speak";
        return {
          mode: raw.mode,
          hideHistory: !!raw.hideHistory,
          textSize: raw.textSize === "sm" || raw.textSize === "lg" ? raw.textSize : "md",
          // How this works: wiki Chat Settings — how long stage speech/thought bubbles stay up.
          bubbleDuration: dur,
          // How this works (?v=20260906ax): Speak / Think / Shout compose mode (wiki Chat commands).
          speakMode: sm
        };
      }
    } catch (e) {}
    return { mode: "overlay", hideHistory: false, textSize: "md", bubbleDuration: "medium", speakMode: "speak" };
  }
  function saveChatUi(cfg) {
    try { localStorage.setItem(CHAT_UI_KEY, JSON.stringify(cfg || loadChatUi())); } catch (e) {}
  }
  // How this works (20260906q): on phones, Slide's dark panel eats the green stage.
  // Auto-switch to Overlay once for the session preference so the black slab never returns.
  // ---------------------------------------------------------------------------
  // Mobile landscape immersion (20260906af) — phone sideways + inRoom
  // How this works: orientation landscape + inRoom → body.room-immersive hides top tabs,
  // stage fills viewport, Overlay chat docks bottom-corner with thin input bar.
  // Portrait or Exit control restores chrome. Optional Fullscreen API when allowed.
  // Beginner: rotate the phone sideways while in a room to go immersive; Exit or rotate back to leave.
  // ENGINE DEV: only chrome CSS/layout around #stage-slot — never remount Pixi on rotate.
  // ---------------------------------------------------------------------------
  function isPhoneLandscape() {
    try {
      if (!window.matchMedia) return false;
      // Narrow phones / small tablets — avoid forcing immersive on wide desktop landscape.
      var land = window.matchMedia("(orientation: landscape)").matches;
      var narrow = window.matchMedia("(max-height: 520px), (max-width: 900px)").matches;
      return land && narrow;
    } catch (e) { return false; }
  }
  function requestRoomFullscreen() {
    // How this works: optional Fullscreen API on #app (chrome host). Failures are ignored.
    try {
      var el = document.getElementById("app") || document.documentElement;
      if (!el) return;
      var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
        var p = req.call(el);
        if (p && p.catch) p.catch(function () {});
      }
    } catch (e) {}
  }
  function exitRoomFullscreen() {
    try {
      var ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) {
        var p = ex.call(document);
        if (p && p.catch) p.catch(function () {});
      }
    } catch (e) {}
  }
  function updateLandscapeImmersion() {
    // How this works: session-only immersive flag from landscape + inRoom (unless Exit forced off).
    // Beginner: Exit sets roomImmersiveForcedOff until you leave the room or rotate away and back.
    try {
      var want = !!(inRoom && isPhoneLandscape() && !roomImmersiveForcedOff);
      roomImmersive = want;
      document.body.classList.toggle("room-immersive", want);
      var exitBtn = document.querySelector(".room-immersive-exit");
      if (exitBtn) exitBtn.hidden = !want;
      if (want) {
        document.body.classList.add("chat-mobile-overlay");
        try {
          var ui = loadChatUi();
          if (ui.mode === "slide") {
            ui.mode = "overlay";
            saveChatUi(ui);
          }
        } catch (eUi) {}
        // Soft fullscreen attempt — browsers may deny without gesture; CSS still immerses.
        try { requestRoomFullscreen(); } catch (eFs) {}
      } else {
        try { exitRoomFullscreen(); } catch (eFs2) {}
      }
    } catch (e) {
      roomImmersive = false;
      try { document.body.classList.remove("room-immersive"); } catch (e2) {}
    }
    return roomImmersive;
  }
  function exitLandscapeImmersion() {
    // How this works: Exit control restores top tabs / full chrome without leaving the room.
    roomImmersiveForcedOff = true;
    roomImmersive = false;
    try { document.body.classList.remove("room-immersive"); } catch (e) {}
    try { exitRoomFullscreen(); } catch (e2) {}
    var exitBtn = document.querySelector(".room-immersive-exit");
    if (exitBtn) exitBtn.hidden = true;
  }
  function bindLandscapeImmersionListeners() {
    // How this works: once — orientation / resize / fullscreen change retarget chrome only.
    if (window.__whirledImmersiveBound) return;
    window.__whirledImmersiveBound = true;
    function onChange() {
      try {
        if (!isPhoneLandscape()) roomImmersiveForcedOff = false;
        updateLandscapeImmersion();
      } catch (e) {}
    }
    try { window.addEventListener("orientationchange", onChange); } catch (e0) {}
    try { window.addEventListener("resize", onChange); } catch (e1) {}
    try { window.matchMedia("(orientation: landscape)").addEventListener("change", onChange); } catch (e2) {
      try { window.matchMedia("(orientation: landscape)").addListener(onChange); } catch (e3) {}
    }
    try { document.addEventListener("fullscreenchange", onChange); } catch (e4) {}
  }
  function ensureMobileChatOverlay() {
    // Purpose: phones force Overlay chat so Slide never opens a black slab under the stage.
    // How: if narrow viewport and mode was slide, flip to overlay once and notice once.
    // Why: wiki mobile = Overlay-only. ENGINE DEV: keeps #stage-slot full-size.
    try {
      if (!window.matchMedia || !window.matchMedia("(max-width: 900px)").matches) {
        document.body.classList.remove("chat-mobile-overlay");
        return false;
      }
      document.body.classList.add("chat-mobile-overlay");
      var ui = loadChatUi();
      if (ui.mode === "slide") {
        ui.mode = "overlay";
        saveChatUi(ui);
        try {
          if (!localStorage.getItem("whirled2.chatMobileOverlayNotice")) {
            localStorage.setItem("whirled2.chatMobileOverlayNotice", "1");
            // Soft once — after paint refreshChatLog will show it if in room.
            setTimeout(function () {
              try {
                if (typeof inRoom !== "undefined" && inRoom) {
                  pushSystemChat("Phone layout uses Overlay chat so the room stays full-size.");
                }
              } catch (eN) {}
            }, 0);
          }
        } catch (e2) {}
        return true;
      }
    } catch (e) {}
    return false;
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
    // How this works (20260906af): grid card opens detail; ♥ toggles favorite without leaving the grid.
    // Beginner: heart uses the same whirled2.favorites list as the item detail page.
    // ENGINE DEV: div (not button) so the fav control is not nested buttons; click order checks fav first.
    var id = item.id || item.name || "";
    var tone = item.kind === "backdrop" || itemCat(item) === "backdrops" ? "night" : (item.kind === "avatar" || itemCat(item) === "avatars") ? "fox" : "";
    var price = formatShopPrice(item.coins != null ? item.coins : item.price, item.owned);
    var favs = loadFavorites();
    var isFav = favs.indexOf(id) >= 0;
    var visual = item.thumb
      ? '<img class="stuff-thumb" src="' + item.thumb + '" alt="" />'
      : '<div class="swatch swatch-empty ' + tone + '" aria-hidden="true"></div>';
    return '<div class="card shop-card" data-shop-item="' + esc(id) + '" role="button" tabindex="0">'
      + '<button type="button" class="shop-card-fav fav-btn' + (isFav ? " is-on" : "") + '" data-shop-fav="' + esc(id) + '" title="'
      + (isFav ? "Remove favorite" : "Favorite") + '" aria-label="' + (isFav ? "Remove favorite" : "Favorite") + '">'
      + (isFav ? "♥" : "♡") + '</button>'
      + visual + '<div class="body"><h3>' + esc(item.name || "Item") + '</h3>'
      + '<p class="meta">' + esc(item.kind || itemCat(item)) + " · " + esc(item.creator || item.sellerName || "member") + '</p>'
      + '<div class="price">' + esc(String(price)) + '</div></div></div>';
  }
  var PASSPORT_KEY = "whirled2.passport.";
  var PASSPORT_PROG_KEY = "whirled2.passportProg.";
  var PASSPORT_CATS = [
    { id: "mingle", label: "Mingle" },
    { id: "play", label: "Play" },
    { id: "create", label: "Create" },
    { id: "shop", label: "Shop" }
  ];
  // How this works: wiki Passport stamps. Each stamp listens for an action name;
  // awardAction bumps whirled2.passportProg.{userId}, then copies the stamp into
  // whirled2.passport.{userId} when the need count is met (idempotent). New stamps also grant +25 coins.
  var STAMP_CATALOG = [
    { id: "first_hello", cat: "mingle", name: "First Hello", tip: "Send a chat message in a room.", action: "chat", need: 1, goTab: "rooms", goEnter: true },
    { id: "make_friend", cat: "mingle", name: "Make a Friend", tip: "Invite someone to be your buddy.", action: "friend", need: 1, goTab: "me", goMe: "friends" },
    { id: "postmaster", cat: "mingle", name: "Postmaster", tip: "Send a piece of mail.", action: "mail", need: 1, goTab: "me", goMe: "mail" },
    { id: "status_update", cat: "mingle", name: "Status Update", tip: "Save a profile status.", action: "status", need: 1, goTab: "me", goMe: "profile" },
    { id: "room_visitor", cat: "play", name: "Room Visitor", tip: "Enter Studio Loft.", action: "enterRoom", need: 1, goTab: "rooms", goEnter: true },
    { id: "party_starter", cat: "play", name: "Party Starter", tip: "Create a party from the toolbar.", action: "party", need: 1, goTab: "rooms", goEnter: true, goParty: true },
    { id: "creator", cat: "create", name: "Creator", tip: "Upload something to Stuff.", action: "upload", need: 1, goTab: "stuff" },
    { id: "decorator", cat: "create", name: "Decorator", tip: "Place a decorate chip in your loft.", action: "decorate", need: 1, goTab: "rooms", goEnter: true, goDecorate: true },
    { id: "door_builder", cat: "create", name: "Door Builder", tip: "Make a door linking two rooms.", action: "makeDoor", need: 1, goTab: "rooms", goEnter: true, goDecorate: true },
    { id: "room_hopper", cat: "play", name: "Room Hopper", tip: "Travel through a door to another room.", action: "doorTravel", need: 1, goTab: "rooms", goEnter: true },
    { id: "shop_lister", cat: "shop", name: "Shop Lister", tip: "List an item in the Shop.", action: "shopList", need: 1, goTab: "stuff" },
    { id: "window_shopper", cat: "shop", name: "Window Shopper", tip: "Open a shop item detail.", action: "shopView", need: 1, goTab: "shop" }
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
  function loadPassportProg(userId) {
    try {
      var raw = localStorage.getItem(PASSPORT_PROG_KEY + userId);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
    } catch (e) { return {}; }
  }
  function savePassportProg(userId, prog) {
    try { localStorage.setItem(PASSPORT_PROG_KEY + userId, JSON.stringify(prog || {})); } catch (e) {}
  }
  function awardAction(action) {
    // How this works: bump progress for this action; award any catalog stamp whose
    // need is newly met. Safe to call often — already-earned stamps are skipped.
    var s = session();
    if (!s || !s.user || !action) return;
    var uid = s.user.id;
    var prog = loadPassportProg(uid);
    prog[action] = (Number(prog[action]) || 0) + 1;
    savePassportProg(uid, prog);
    var earned = loadPassport(uid);
    var have = {};
    earned.forEach(function (st) { if (st && st.id) have[st.id] = true; });
    var newly = [];
    STAMP_CATALOG.forEach(function (stamp) {
      if (stamp.action !== action) return;
      if (have[stamp.id]) return;
      if ((Number(prog[action]) || 0) < stamp.need) return;
      earned.unshift({
        id: stamp.id,
        name: stamp.name,
        cat: stamp.cat,
        tip: stamp.tip,
        at: new Date().toISOString()
      });
      have[stamp.id] = true;
      newly.push(stamp.name);
    });
    if (newly.length) {
      savePassport(uid, earned);
      try {
        pushNotice("green", "Passport stamp" + (newly.length > 1 ? "s" : "") + ": " + newly.join(", ") + "!", { transient: true });
      } catch (e) {}
      // How this works: each newly awarded stamp grants +25 coins (idempotent via stamp list).
      try {
        var coinGrant = 25 * newly.length;
        grantCurrency(uid, coinGrant, 0, {
          kind: "passport",
          label: "Passport stamp",
          note: "+" + coinGrant + " coins for stamp" + (newly.length > 1 ? "s" : "") + ": " + newly.join(", ")
        });
        try { grantXp(uid, 20 * newly.length, { kind: "passport" }); } catch (eXpPass) {}
        refreshWalletChrome();
      } catch (eCoin) {}
      // How this works: My News → Stamps reads whirled2.passport.{userId} (not invent).
    }
  }
  function findStamp(id) {
    for (var i = 0; i < STAMP_CATALOG.length; i++) if (STAMP_CATALOG[i].id === id) return STAMP_CATALOG[i];
    return null;
  }
  function goPassportStamp(stamp) {
    // How this works: Passport Go! jumps to the tab/sub where you can earn that stamp.
    if (!stamp) return;
    clearStrayUI();
    if (stamp.goEnter) {
      inRoom = true;
      try { beginRoomChatVisit(currentRoomId || "loft"); } catch (eV) { clearRoomChatDisplay(true); }
    }
    if (stamp.goDecorate) decorateMode = true;
    if (stamp.goParty) partyPanelOpen = true;
    if (stamp.goMe) {
      meSub = stamp.goMe;
      viewingId = null;
      galleryViewId = null;
    }
    var tab = stamp.goTab || "me";
    paint(tab);
    if (stamp.goEnter) loadOccupants();
  }
    var ROOM = "Studio Loft";
  var chat = [];
  // How this works (?v=20260906ax): room chat is VISIT-scoped. Entering a room starts a clean slate.
  // Beginner: demo API used to dump ancient loft messages (other players) every poll — that felt broken.
  // roomChatVisitSince = ISO time of this Enter/Clear; poll only merges messages newer than this.
  // ENGINE DEV: chrome display only — never invents catalog; music poll stays separate in startPoll.
  var roomChatVisitSince = ""; // ISO string; empty = not in a room visit
  var roomChatRoomId = ""; // which room this visit chat belongs to
  var liveOccupants = [];
  var meSub = "home"; // home | profile | rooms | friends | mail | passport | account | themes | club | blocklist | galleries | transactions | contests | share
  var newsFilter = "all"; // all | comments | friendings | status | stamps | rooms
  var roomSharePanelOpen = false; // Room menu → Share / Embed
  var profileEditSection = null; // null | status | photo | info | skin
  var tourTip = 0;
  var goMenuOpen = false;
  var inRoom = false;
  // How this works (20260906af): which room id the stage chrome is showing (default loft).
  // Beginner: leaving to lobby clears immersion; currentRoomId stays last visited until next enter.
  var currentRoomId = "loft";
  var createRoomOpen = false; // Create Room panel (lobby / Me → My Rooms)
  var roomImmersive = false; // phone landscape immersion (session-only)
  var roomImmersiveForcedOff = false; // Exit control until rotate / re-enter
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
    var s = session();
    if (s && s.user) {
      try {
        var per = JSON.parse(localStorage.getItem("whirled2.friends." + s.user.id) || "null");
        if (Array.isArray(per)) return per;
      } catch (e0) {}
    }
    try { return JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveFriends(list) {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(list.slice(0, 100)));
    var s = session();
    if (s && s.user) {
      try { localStorage.setItem("whirled2.friends." + s.user.id, JSON.stringify(list.slice(0, 100))); } catch (e) {}
    }
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
    // How this works: gift attachments carry a Stuff snapshot; claim once via giftClaimed.
    if (opts.giftItem) {
      msg.giftItem = opts.giftItem;
      msg.giftClaimed = !!opts.giftClaimed;
    }
    if (!msg.toId) return null;
    list.unshift(msg);
    saveMail(list);
    return msg;
  }
  function claimGiftFromMail(mailId) {
    // How this works: first open of gift mail moves item into recipient Stuff once.
    var s = session();
    if (!s || !s.user) return;
    var list = loadMail();
    var changed = false;
    list.forEach(function (m) {
      if (!m || m.id !== mailId) return;
      if (!m.giftItem || m.giftClaimed) return;
      if (String(m.toId) !== String(s.user.id)) return;
      var stuff = loadStuff();
      var copy = Object.assign({}, m.giftItem, {
        id: "st" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ownerId: s.user.id,
        owned: true,
        giftedFrom: m.fromName || m.fromId,
        at: new Date().toISOString()
      });
      stuff.unshift(copy);
      saveStuff(stuff);
      m.giftClaimed = true;
      changed = true;
      pushNotice("blue", "Gift claimed: " + (copy.name || "item") + " added to Stuff.");
    });
    if (changed) saveMail(list);
  }
  function markMailRead(id) {
    var list = loadMail();
    var changed = false;
    list.forEach(function (m) {
      if (m.id === id && !m.read) { m.read = true; changed = true; }
    });
    if (changed) saveMail(list);
  }
  function deleteMail(id) {
    // How this works: remove one message from whirled2.mail by id, then caller refreshes UI.
    if (!id) return;
    saveMail(loadMail().filter(function (m) { return m.id !== id; }));
  }
  function removeFriend(id) {
    var list = loadFriends().filter(function (f) { return f.id !== id; });
    saveFriends(list);
  }
  // ===========================================================================
  // Fidelity + dual currency / streaks (?v=20260906s)
  // How this works: friend requests, Room/PM chat tabs, recent rooms, gift mail,
  // command palette, reactions, notices — all localStorage / Pages-safe.
  // ENGINE DEV: chrome only; #stage-slot / WhirledChrome unchanged in spirit.
  // ===========================================================================
  var FRIEND_REQUESTS_KEY = "whirled2.friendRequests";
  var CHAT_TABS_KEY = "whirled2.chatTabs";
  var CHAT_REACTIONS_KEY = "whirled2.chatReactions";
  var RECENT_ROOMS_KEY = "whirled2.recentRooms";
  var AWAY_KEY = "whirled2.away.";
  var PRESENCE_SNAP_KEY = "whirled2.presenceSnap";
  var friendsPopupOpen = false;
  var cmdPaletteOpen = false;
  var shortcutsOpen = false;
  var awayMode = false;

  function loadFriendRequests() {
    try { return JSON.parse(localStorage.getItem(FRIEND_REQUESTS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveFriendRequests(list) {
    try { localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify((list || []).slice(0, 200))); } catch (e) {}
  }
  function incomingFriendRequestCount() {
    var s = session();
    if (!s || !s.user) return 0;
    var me = s.user.id;
    return loadFriendRequests().filter(function (r) {
      return r && r.status === "pending" && String(r.toId) === String(me);
    }).length;
  }
  function friendRelation(otherId) {
    // How this works: four classic states for profile buttons.
    otherId = String(otherId || "");
    if (!otherId) return "not_friends";
    if (loadFriends().some(function (f) { return String(f.id) === otherId; })) return "friends";
    var s = session();
    var me = s && s.user ? String(s.user.id) : "";
    var reqs = loadFriendRequests();
    for (var i = 0; i < reqs.length; i++) {
      var r = reqs[i];
      if (!r || r.status !== "pending") continue;
      if (String(r.fromId) === me && String(r.toId) === otherId) return "pending_by_you";
      if (String(r.toId) === me && String(r.fromId) === otherId) return "pending_to_you";
    }
    return "not_friends";
  }
  function findPendingRequest(fromId, toId) {
    fromId = String(fromId || ""); toId = String(toId || "");
    var reqs = loadFriendRequests();
    for (var i = 0; i < reqs.length; i++) {
      var r = reqs[i];
      if (r && r.status === "pending" && String(r.fromId) === fromId && String(r.toId) === toId) return r;
    }
    return null;
  }
  function createFriendRequest(toId, toName, message) {
    // How this works: invite creates PENDING only — friends list updates on Accept.
    // Multi-local-user: when invitee logs in on this browser, Me→Friends shows Accept.
    var s = session();
    if (!s || !s.user || !toId) return null;
    toId = String(toId);
    toName = String(toName || toId);
    if (toId === String(s.user.id)) {
      pushNotice("orange", "You cannot friend yourself.");
      return null;
    }
    if (loadFriends().some(function (f) { return String(f.id) === toId; })) {
      pushNotice("gray", toName + " is already on your friends list.");
      return null;
    }
    if (findPendingRequest(s.user.id, toId)) {
      pushNotice("gray", "Friend request to " + toName + " is already pending.");
      return null;
    }
    // If they already invited you, accept that instead of double-pending.
    var incoming = findPendingRequest(toId, s.user.id);
    if (incoming) {
      acceptFriendRequest(incoming.id);
      return incoming;
    }
    // How this works (20260906af): Friendly People auto-accept incoming friend requests (classic).
    // Beginner: if they turned on Friendly, you become friends immediately — no Accept wait.
    // ENGINE DEV: same-browser mock; still writes both sides via addFriendForUser.
    if (isFriendly(toId)) {
      addFriendForUser(s.user.id, { id: toId, name: toName });
      addFriendForUser(toId, { id: s.user.id, name: s.user.name });
      rememberProfile({ id: toId, name: toName });
      try {
        grantCurrency(s.user.id, 15, 0, { kind: "friend", label: "Friend accepted", note: "+15 coins — friended " + toName });
        grantCurrency(toId, 15, 0, { kind: "friend", label: "Friend accepted", note: "+15 coins — friended by " + (s.user.name || "") });
        refreshWalletChrome();
      } catch (eFrAuto) {}
      pushNotice("friending", toName + " (Friendly) auto-accepted — you are friends!");
      sendMail({
        toId: toId,
        toName: toName,
        subject: "Friend request auto-accepted",
        body: s.user.name + " friended you (Friendly People auto-accept)."
      });
      return { id: "fr-auto", fromId: s.user.id, toId: toId, status: "accepted", at: new Date().toISOString() };
    }
    var req = {
      id: "fr" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fromId: s.user.id,
      fromName: s.user.name,
      toId: toId,
      toName: toName,
      message: String(message || "Let's be buddies!").slice(0, 400),
      status: "pending",
      at: new Date().toISOString()
    };
    var list = loadFriendRequests();
    list.unshift(req);
    saveFriendRequests(list);
    sendMail({
      toId: toId,
      toName: toName,
      subject: "Friend request",
      body: req.message
    });
    pushNotice("friending", "Friend request sent to " + toName + ".");
    rememberProfile({ id: toId, name: toName });
    return req;
  }
  function acceptFriendRequest(reqId) {
    var s = session();
    if (!s || !s.user) return;
    var list = loadFriendRequests();
    var hit = null;
    list.forEach(function (r) {
      if (r && r.id === reqId && r.status === "pending") hit = r;
    });
    if (!hit) return;
    if (String(hit.toId) !== String(s.user.id)) return;
    hit.status = "accepted";
    saveFriendRequests(list);
    addFriend({ id: hit.fromId, name: hit.fromName });
    // Mutual: also store reverse on this browser so both profiles look friends.
    var rev = loadFriends();
    if (!rev.some(function (f) { return String(f.id) === String(hit.toId); })) {
      // Current user already on own list? skip — addFriend is for the other person.
    }
    // Ensure from-side friends list also has us when they next log in:
    // store under a per-user friends bag if needed — classic mock uses shared whirled2.friends.
    // For multi-account same browser, keep a per-user friends key overlay.
    addFriendForUser(hit.fromId, { id: s.user.id, name: s.user.name });
    addFriendForUser(s.user.id, { id: hit.fromId, name: hit.fromName });
    pushNotice("friending", hit.fromName + " is now your friend!");
    // How this works: friend accept grants +15 coins each side (local wallets).
    try {
      grantCurrency(s.user.id, 15, 0, { kind: "friend", label: "Friend accepted", note: "+15 coins — friended " + (hit.fromName || "") });
      grantCurrency(hit.fromId, 15, 0, { kind: "friend", label: "Friend accepted", note: "+15 coins — friended by " + (s.user.name || "") });
      refreshWalletChrome();
    } catch (eFrCoin) {}
    // How this works: friend-accepted shows under My News → Friendings.
    try {
      var wallAcc = loadWall(s.user.id);
      wallAcc.unshift({
        id: newWallPostId(),
        who: hit.fromName || hit.fromId,
        fromId: hit.fromId,
        text: "accepted your friend request.",
        kind: "friending",
        at: new Date().toISOString()
      });
      saveWall(s.user.id, wallAcc);
    } catch (eNews) {}
    sendMail({
      toId: hit.fromId,
      toName: hit.fromName,
      subject: "Friend request accepted",
      body: s.user.name + " accepted your friend request."
    });
  }
  function declineFriendRequest(reqId) {
    var s = session();
    if (!s || !s.user) return;
    var list = loadFriendRequests();
    list.forEach(function (r) {
      if (r && r.id === reqId && r.status === "pending" && String(r.toId) === String(s.user.id)) {
        r.status = "declined";
      }
    });
    saveFriendRequests(list);
    pushNotice("gray", "Friend request declined.");
  }
  function retractFriendRequest(reqId) {
    var s = session();
    if (!s || !s.user) return;
    var list = loadFriendRequests();
    list.forEach(function (r) {
      if (r && r.id === reqId && r.status === "pending" && String(r.fromId) === String(s.user.id)) {
        r.status = "retracted";
      }
    });
    saveFriendRequests(list);
    pushNotice("gray", "Friend request retracted.");
  }
  function friendsKeyFor(userId) {
    return "whirled2.friends." + String(userId || "");
  }
  function loadFriendsFor(userId) {
    // How this works: prefer per-user friends bag so multi-local accounts work;
    // fall back to legacy shared whirled2.friends for the current session user.
    userId = String(userId || "");
    try {
      var per = JSON.parse(localStorage.getItem(friendsKeyFor(userId)) || "null");
      if (Array.isArray(per)) return per;
    } catch (e) {}
    var s = session();
    if (s && s.user && String(s.user.id) === userId) {
      try { return JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]"); } catch (e2) { return []; }
    }
    return [];
  }
  function saveFriendsFor(userId, list) {
    userId = String(userId || "");
    try { localStorage.setItem(friendsKeyFor(userId), JSON.stringify((list || []).slice(0, 100))); } catch (e) {}
    var s = session();
    if (s && s.user && String(s.user.id) === userId) {
      try { localStorage.setItem(FRIENDS_KEY, JSON.stringify((list || []).slice(0, 100))); } catch (e2) {}
    }
  }
  function addFriendForUser(userId, entry) {
    if (!entry || !entry.id) return;
    var list = loadFriendsFor(userId);
    if (list.some(function (f) { return String(f.id) === String(entry.id); })) return;
    list.unshift({ id: entry.id, name: entry.name, at: new Date().toISOString() });
    saveFriendsFor(userId, list);
  }
  function syncFriendsFromPerUser() {
    // Call after login so loadFriends() sees this account's list.
    var s = session();
    if (!s || !s.user) return;
    var per = loadFriendsFor(s.user.id);
    try { localStorage.setItem(FRIENDS_KEY, JSON.stringify(per.slice(0, 100))); } catch (e) {}
  }

  function loadChatTabs() {
    try {
      var t = JSON.parse(localStorage.getItem(CHAT_TABS_KEY) || "null");
      if (t && typeof t === "object") {
        return {
          activeTabId: t.activeTabId || "room",
          openPMs: Array.isArray(t.openPMs) ? t.openPMs : [],
          openGroups: Array.isArray(t.openGroups) ? t.openGroups : [],
          unread: t.unread && typeof t.unread === "object" ? t.unread : {}
        };
      }
    } catch (e) {}
    return { activeTabId: "room", openPMs: [], openGroups: [], unread: {} };
  }
  function saveChatTabs(t) {
    try { localStorage.setItem(CHAT_TABS_KEY, JSON.stringify(t)); } catch (e) {}
  }
  function pmKey(a, b) {
    var ids = [String(a), String(b)].sort();
    return "whirled2.pm." + ids[0] + ":" + ids[1];
  }
  function loadPmChat(otherId) {
    var s = session();
    if (!s || !s.user || !otherId) return [];
    try { return JSON.parse(localStorage.getItem(pmKey(s.user.id, otherId)) || "[]"); } catch (e) { return []; }
  }
  function savePmChat(otherId, msgs) {
    var s = session();
    if (!s || !s.user || !otherId) return;
    try { localStorage.setItem(pmKey(s.user.id, otherId), JSON.stringify((msgs || []).slice(-120))); } catch (e) {}
  }
  function openPmTab(userId, name) {
    userId = String(userId || "");
    if (!userId) return;
    var t = loadChatTabs();
    if (!t.openPMs.some(function (p) { return String(p.userId) === userId; })) {
      t.openPMs.push({ userId: userId, name: name || userId });
    } else {
      t.openPMs = t.openPMs.map(function (p) {
        if (String(p.userId) === userId) return { userId: userId, name: name || p.name || userId };
        return p;
      });
    }
    t.activeTabId = "pm:" + userId;
    if (t.unread) t.unread[t.activeTabId] = false;
    saveChatTabs(t);
    friendsPopupOpen = false;
  }
  function closePmTab(userId) {
    var t = loadChatTabs();
    t.openPMs = t.openPMs.filter(function (p) { return String(p.userId) !== String(userId); });
    if (t.activeTabId === "pm:" + userId) t.activeTabId = "room";
    if (t.unread) delete t.unread["pm:" + userId];
    saveChatTabs(t);
  }
  function setActiveChatTab(tabId) {
    var t = loadChatTabs();
    t.activeTabId = tabId || "room";
    if (t.unread) t.unread[t.activeTabId] = false;
    saveChatTabs(t);
  }
  function markTabUnread(tabId) {
    var t = loadChatTabs();
    if (t.activeTabId === tabId) return;
    t.unread = t.unread || {};
    t.unread[tabId] = true;
    saveChatTabs(t);
  }
  // How this works: group chat tabs = bluish-gray tabs for local groups you joined.
  // ENGINE DEV: chrome-only; stored as whirled2.groupChat.{groupId} — not engine.
  function groupChatKey(gid) { return "whirled2.groupChat." + String(gid || ""); }
  function loadGroupChat(gid) {
    try { return JSON.parse(localStorage.getItem(groupChatKey(gid)) || "[]"); } catch (e) { return []; }
  }
  function saveGroupChat(gid, msgs) {
    try { localStorage.setItem(groupChatKey(gid), JSON.stringify((msgs || []).slice(-120))); } catch (e) {}
  }
  function myJoinedGroups() {
    var s = session();
    if (!s || !s.user) return [];
    var meId = s.user.id;
    return loadGroups().filter(function (g) {
      return g && (g.members || []).some(function (m) { return m && m.id === meId; });
    });
  }
  function openGroupChatTab(groupId, name) {
    groupId = String(groupId || "");
    if (!groupId) return;
    var t = loadChatTabs();
    t.openGroups = t.openGroups || [];
    if (!t.openGroups.some(function (g) { return String(g.groupId) === groupId; })) {
      t.openGroups.push({ groupId: groupId, name: name || groupId });
    } else {
      t.openGroups = t.openGroups.map(function (g) {
        if (String(g.groupId) === groupId) return { groupId: groupId, name: name || g.name || groupId };
        return g;
      });
    }
    t.activeTabId = "group:" + groupId;
    if (t.unread) t.unread[t.activeTabId] = false;
    saveChatTabs(t);
  }
  function closeGroupChatTab(groupId) {
    var t = loadChatTabs();
    t.openGroups = (t.openGroups || []).filter(function (g) { return String(g.groupId) !== String(groupId); });
    if (t.activeTabId === "group:" + groupId) t.activeTabId = "room";
    if (t.unread) delete t.unread["group:" + groupId];
    saveChatTabs(t);
  }
  function chatTabsHtml() {
    // Purpose: Room / PM / Group chat tabs above the log.
    // How: build buttons from loadChatTabs(); unread → has-unread glimmer class.
    // Why: classic wiki tabs; mobile CSS raises touch height. ENGINE DEV: chrome only.
    var t = loadChatTabs();
    var roomUnread = !!(t.unread && t.unread.room);
    // How this works (?v=20260906at): Room = blue group chat; Private = orange PM tabs (wiki colors).
    var html = '<div class="chat-tabs chat-tabs-fidelity" id="chat-tabs" role="tablist" aria-label="Chat channels">'
      + '<button type="button" class="chat-tab chat-tab-room' + (t.activeTabId === "room" || !t.activeTabId ? " is-on" : "") + (roomUnread ? " has-unread" : "") + '" data-chat-tab="room" role="tab" title="Room group chat" aria-label="Room chat">Room</button>';
    (t.openPMs || []).forEach(function (p) {
      var tid = "pm:" + p.userId;
      var un = !!(t.unread && t.unread[tid]);
      html += '<button type="button" class="chat-tab chat-tab-pm' + (t.activeTabId === tid ? " is-on" : "") + (un ? " has-unread" : "") + '" data-chat-tab="' + esc(tid) + '" role="tab" title="Private whisper" aria-label="Private chat with ' + esc(p.name || p.userId) + '">'
        + '<span class="chat-tab-kind" aria-hidden="true">Private</span>'
        + '<span class="chat-tab-name">' + esc(p.name || p.userId) + '</span>'
        + '<span class="chat-tab-x" data-chat-tab-close="' + esc(p.userId) + '" title="Close">×</span></button>';
    });
    (t.openGroups || []).forEach(function (g) {
      var tid = "group:" + g.groupId;
      var un = !!(t.unread && t.unread[tid]);
      html += '<button type="button" class="chat-tab chat-tab-group' + (t.activeTabId === tid ? " is-on" : "") + (un ? " has-unread" : "") + '" data-chat-tab="' + esc(tid) + '" role="tab">'
        + '<span>' + esc(g.name || g.groupId) + '</span>'
        + '<span class="chat-tab-x" data-chat-tab-close-group="' + esc(g.groupId) + '" title="Close">×</span></button>';
    });
    html += '</div>';
    return html;
  }
  function friendsToolbarPopupHtml() {
    if (!friendsPopupOpen) return "";
    var list = loadFriends();
    var onlineIds = {};
    liveOccupants.forEach(function (p) { if (p && p.id) onlineIds[p.id] = p; });
    var online = list.filter(function (f) { return onlineIds[f.id]; });
    var rows = online.length
      ? online.map(function (f) {
          return '<div class="friends-pop-row">'
            + '<span class="dot on pulse"></span> <b>' + esc(f.name) + '</b>'
            + '<div class="friends-pop-actions">'
            +   '<button type="button" data-whisper="' + esc(f.id) + '" data-whisper-name="' + esc(f.name) + '">Whisper</button>'
            +   '<button type="button" data-profile="' + esc(f.id) + '">Profile</button>'
            +   '<button type="button" data-join-them="1" data-join-name="' + esc(f.name) + '">Join them</button>'
            + '</div></div>';
        }).join("")
      : '<p class="meta">No friends online right now.</p>';
    return '<div class="friends-toolbar-pop" id="friends-toolbar-pop">'
      + '<div class="friends-pop-head">Friends online <button type="button" class="text-btn" data-friends-pop-close="1">×</button></div>'
      + rows + '</div>';
  }

  function loadChatReactions() {
    try { return JSON.parse(localStorage.getItem(CHAT_REACTIONS_KEY) || "{}"); } catch (e) { return {}; }
  }
  function saveChatReactions(map) {
    try { localStorage.setItem(CHAT_REACTIONS_KEY, JSON.stringify(map || {})); } catch (e) {}
  }
  function toggleChatReaction(msgId, emoji) {
    if (!msgId || !emoji) return;
    var map = loadChatReactions();
    var row = map[msgId] || {};
    var s = session();
    var uid = s && s.user ? s.user.id : "guest";
    var arr = Array.isArray(row[emoji]) ? row[emoji].slice() : [];
    var ix = arr.indexOf(uid);
    if (ix >= 0) arr.splice(ix, 1); else arr.push(uid);
    if (arr.length) row[emoji] = arr; else delete row[emoji];
    if (Object.keys(row).length) map[msgId] = row; else delete map[msgId];
    saveChatReactions(map);
  }
  function reactionPillsHtml(msgId) {
    var map = loadChatReactions();
    var row = map[msgId] || {};
    var pills = ["👍", "😂", "❤️", "🎉"].map(function (em) {
      var n = (row[em] || []).length;
      if (!n) return "";
      return '<span class="react-pill" data-react="' + esc(em) + '" data-react-msg="' + esc(msgId) + '">' + em + ' ' + n + '</span>';
    }).filter(Boolean).join("");
    return pills ? ('<div class="react-pills">' + pills + '</div>') : "";
  }
  function reactionBarHtml(msgId) {
    if (!msgId) return "";
    return '<div class="react-bar" hidden>'
      + ["👍", "😂", "❤️", "🎉"].map(function (em) {
          return '<button type="button" class="react-btn" data-react="' + esc(em) + '" data-react-msg="' + esc(msgId) + '">' + em + '</button>';
        }).join("")
      + '</div>';
  }

  function loadRecentRooms() {
    try { return JSON.parse(localStorage.getItem(RECENT_ROOMS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveRecentRooms(list) {
    try { localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify((list || []).slice(0, 8))); } catch (e) {}
  }
  function trackRecentRoom(room) {
    room = room || { id: "loft", name: ROOM };
    var list = loadRecentRooms().filter(function (r) { return r && r.id !== room.id; });
    list.unshift({ id: room.id || "loft", name: room.name || ROOM, at: new Date().toISOString() });
    saveRecentRooms(list);
  }
  function goMenuHtml() {
    var recent = loadRecentRooms();
    var recentBtns = recent.length
      ? recent.map(function (r) {
          return '<button type="button" data-go-room="' + esc(r.id) + '">Recent — ' + esc(r.name || r.id) + '</button>';
        }).join("")
      : '<button type="button" data-go="recent">Recent — Studio Loft</button>';
    var onlineFriends = loadFriends().filter(function (f) {
      return liveOccupants.some(function (p) { return p && p.id === f.id; });
    });
    var friendBtns = onlineFriends.length
      ? onlineFriends.map(function (f) {
          return '<button type="button" data-go-friend="' + esc(f.id) + '" data-go-friend-name="' + esc(f.name) + '">👥 ' + esc(f.name) + '</button>';
        }).join("")
      : '<button type="button" data-go="friends">Friends online</button>';
    return '<div class="go-menu" id="go-menu" hidden>'
      + '<button type="button" data-go="home">Go home</button>'
      + recentBtns
      + '<div class="room-lock-row meta">Friends online</div>'
      + friendBtns
      + '<button type="button" data-go="games">View games awaiting players</button>'
      + '</div>';
  }
  function recentRoomsStripHtml() {
    var recent = loadRecentRooms();
    if (!recent.length) return "";
    return '<div class="section-label">Recently visited</div>'
      + '<div class="recent-rooms-strip">'
      + recent.map(function (r) {
          return '<button type="button" class="recent-room-chip" data-room-preview="' + esc(r.id || "loft") + '">' + esc(r.name || "Room") + '</button>';
        }).join("")
      + '</div>';
  }

  function isAway(userId) {
    try { return localStorage.getItem(AWAY_KEY + userId) === "1"; } catch (e) { return false; }
  }
  function setAway(on) {
    var s = session();
    if (!s || !s.user) return;
    awayMode = !!on;
    try {
      if (on) localStorage.setItem(AWAY_KEY + s.user.id, "1");
      else localStorage.removeItem(AWAY_KEY + s.user.id);
    } catch (e) {}
  }

  function copyInviteLink(kind, id) {
    var url = shareInviteUrl();
    if (kind === "profile" && id) url += (url.indexOf("?") >= 0 ? "&" : "?") + "profile=" + encodeURIComponent(id);
    if (kind === "room") url += (url.indexOf("#") >= 0 ? "" : "#rooms");
    function done() {
      pushNotice("green", "Invite link copied.", { transient: true });
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () {
          window.prompt("Copy invite link:", url);
          done();
        });
      } else {
        window.prompt("Copy invite link:", url);
        done();
      }
    } catch (e) {
      try { window.prompt("Copy invite link:", url); done(); } catch (e2) {}
    }
  }

  function cmdPaletteHtml() {
    if (!cmdPaletteOpen) return "";
    var cmds = [
      ["me", "Me home", "tab:me:home"],
      ["profile", "My Profile", "tab:me:profile"],
      ["mail", "Mail", "tab:me:mail"],
      ["notices", "Notices", "tab:me:notices"],
      ["transactions", "Transactions", "tab:me:transactions"],
      ["friends", "Friends", "tab:me:friends"],
      ["stuff", "Stuff", "tab:stuff"],
      ["rooms", "Rooms lobby", "tab:rooms-lobby"],
      ["loft", "Enter loft", "enter:loft"],
      ["groups", "Groups", "tab:groups"],
      ["shop", "Shop", "tab:shop"],
      ["games", "Games", "tab:games"],
      ["help", "Help", "help"],
      ["themes", "Themes", "tab:me:themes"],
      ["clear", "Clear chat (active tab)", "clear-chat"],
      ["shortcuts", "Shortcuts (?)", "shortcuts"]
    ];
    return '<div class="cmd-palette-backdrop" id="cmd-palette" data-cmd-close="1">'
      + '<div class="cmd-palette" role="dialog" aria-label="Command palette" onclick="event.stopPropagation()">'
      +   '<input id="cmd-palette-input" placeholder="Jump to… (Me, Mail, Rooms…)" autocomplete="off" />'
      +   '<div class="cmd-palette-list">'
      +     cmds.map(function (c) {
            return '<button type="button" class="cmd-item" data-cmd="' + esc(c[2]) + '" data-cmd-label="' + esc(c[0] + " " + c[1]).toLowerCase() + '">'
              + '<b>' + esc(c[1]) + '</b> <span class="meta">' + esc(c[0]) + '</span></button>';
          }).join("")
      +   '</div>'
      +   '<p class="meta">Ctrl/Cmd+K · Esc closes</p>'
      + '</div></div>';
  }
  function shortcutsOverlayHtml() {
    if (!shortcutsOpen) return "";
    return '<div class="shortcuts-backdrop" id="shortcuts-overlay" data-shortcuts-close="1">'
      + '<div class="shortcuts-card" role="dialog" onclick="event.stopPropagation()">'
      +   '<div class="room-side-head"><h2>Keyboard shortcuts</h2>'
      +     '<button type="button" class="text-btn" data-shortcuts-close="1">×</button></div>'
      +   '<ul class="help-tips">'
      +     '<li><b>F9</b> — Hide/show overlay chat history</li>'
      +     '<li><b>/</b> — Focus chat (in room)</li>'
      +     '<li><b>Esc</b> — Close menus / palette</li>'
      +     '<li><b>Ctrl/Cmd+K</b> — Command palette</li>'
      +     '<li><b>?</b> — This shortcuts overlay</li>'
      +     '<li><b>/think</b> <b>/shout</b> <b>/me</b> <b>/speak</b> — chat modes (or Speak button)</li>'
      +     '<li><b>/clear</b> — clear active chat tab</li>'
      +     '<li><b>/away</b> <b>/back</b> — away stub (yellow name + PM auto-reply note)</li>'
      +   '</ul></div></div>';
  }
  function runCommand(cmd) {
    cmdPaletteOpen = false;
    shortcutsOpen = false;
    var el = document.getElementById("cmd-palette");
    if (el) el.remove();
    var sh = document.getElementById("shortcuts-overlay");
    if (sh) sh.remove();
    if (cmd === "help") { helpOpen = true; devHubOpen = false; paint("help"); return; }
    if (cmd === "dev" || cmd === "docs" || cmd === "developers") { devHubOpen = true; helpOpen = false; paint("dev"); return; }
    if (cmd === "shortcuts") { shortcutsOpen = true; ensureModernOverlays(); return; }
    if (cmd === "clear-chat") {
      clearActiveChatTab(true);
      pushNotice("blue", "Chat cleared.", { transient: true });
      return;
    }
    if (cmd === "enter:loft") {
      if (tryEnterLoft()) {
        trackRecentRoom({ id: "loft", name: ROOM });
        clearRoomChatDisplay(true);
        paint("rooms");
        loadOccupants();
      } else paint("rooms");
      return;
    }
    if (cmd === "tab:rooms-lobby") {
      inRoom = false; leaveRoomResetChat(); paint("rooms"); return;
    }
    if (cmd.indexOf("tab:me:") === 0) {
      meSub = cmd.slice(7); viewingId = null; paint("me"); return;
    }
    if (cmd.indexOf("tab:") === 0) {
      var t = cmd.slice(4);
      paint(t); return;
    }
  }
  function ensureModernOverlays() {
    var appEl = document.getElementById("app");
    if (!appEl) return;
    var oldP = document.getElementById("cmd-palette");
    if (oldP) oldP.remove();
    var oldS = document.getElementById("shortcuts-overlay");
    if (oldS) oldS.remove();
    if (cmdPaletteOpen) {
      var w = document.createElement("div");
      w.innerHTML = cmdPaletteHtml();
      if (w.firstChild) {
        document.body.appendChild(w.firstChild);
        var inp = document.getElementById("cmd-palette-input");
        if (inp) {
          setTimeout(function () { inp.focus(); }, 30);
          inp.addEventListener("input", function () {
            var q = String(inp.value || "").toLowerCase();
            document.querySelectorAll(".cmd-item").forEach(function (btn) {
              var lab = btn.getAttribute("data-cmd-label") || "";
              btn.hidden = !!(q && lab.indexOf(q) < 0);
            });
          });
        }
      }
    }
    if (shortcutsOpen) {
      var w2 = document.createElement("div");
      w2.innerHTML = shortcutsOverlayHtml();
      if (w2.firstChild) document.body.appendChild(w2.firstChild);
    }
  }
  function clearActiveChatTab(clearStorage) {
    var t = loadChatTabs();
    if (t.activeTabId === "room" || !t.activeTabId) {
      clearRoomChatDisplay(clearStorage);
      return;
    }
    if (t.activeTabId.indexOf("pm:") === 0) {
      var oid = t.activeTabId.slice(3);
      if (clearStorage !== false) savePmChat(oid, []);
      refreshChatLog();
      return;
    }
    if (t.activeTabId.indexOf("group:") === 0) {
      var gid = t.activeTabId.slice(6);
      if (clearStorage !== false) saveGroupChat(gid, []);
      refreshChatLog();
    }
  }
  function activeChatMessages() {
    var t = loadChatTabs();
    if (t.activeTabId && t.activeTabId.indexOf("pm:") === 0) {
      return loadPmChat(t.activeTabId.slice(3));
    }
    if (t.activeTabId && t.activeTabId.indexOf("group:") === 0) {
      return loadGroupChat(t.activeTabId.slice(6));
    }
    return chat;
  }
  function applyChatInputTint() {
    var input = document.getElementById("chat-input");
    if (!input) return;
    var t = loadChatTabs();
    var pm = !!(t.activeTabId && t.activeTabId.indexOf("pm:") === 0);
    var grp = !!(t.activeTabId && t.activeTabId.indexOf("group:") === 0);
    input.classList.toggle("is-pm", pm);
    input.classList.toggle("is-group", grp);
    input.placeholder = pm ? "Private whisper…" : (grp ? "Group chat…" : "Type here to chat!");
  }
  function presenceCheckNotices() {
    // How this works: approximate friend login/logout via occupant list diffs.
    var s = session();
    if (!s || !s.user) return;
    var friends = loadFriends();
    var friendIds = {};
    friends.forEach(function (f) { friendIds[f.id] = f.name; });
    var nowOnline = {};
    liveOccupants.forEach(function (p) {
      if (p && p.id && friendIds[p.id]) nowOnline[p.id] = friendIds[p.id];
    });
    var prev = {};
    try { prev = JSON.parse(localStorage.getItem(PRESENCE_SNAP_KEY) || "{}"); } catch (e) { prev = {}; }
    Object.keys(nowOnline).forEach(function (id) {
      if (!prev[id]) pushNotice("green", nowOnline[id] + " logged on.", { transient: true });
    });
    Object.keys(prev).forEach(function (id) {
      if (!nowOnline[id] && friendIds[id]) pushNotice("gray", (friendIds[id] || prev[id]) + " logged off.", { transient: true });
    });
    try { localStorage.setItem(PRESENCE_SNAP_KEY, JSON.stringify(nowOnline)); } catch (e2) {}
  }
  function friendActionButtonsHtml(id, name) {
    // How this works: profile / search show Invite | Pending+Retract | Accept+Decline | Friends+Remove.
    var rel = friendRelation(id);
    if (rel === "friends") {
      return '<button type="button" class="profile-action" disabled><span class="pa-ico">✓</span><span>Friends</span></button>'
        + '<button type="button" class="profile-action" data-remove-friend="' + esc(id) + '"><span class="pa-ico">−</span><span>Remove</span></button>';
    }
    if (rel === "pending_by_you") {
      var req = findPendingRequest(session().user.id, id);
      return '<button type="button" class="profile-action" disabled><span class="pa-ico">…</span><span>Pending…</span></button>'
        + (req ? '<button type="button" class="profile-action" data-friend-retract="' + esc(req.id) + '"><span class="pa-ico">↩</span><span>Retract</span></button>' : "");
    }
    if (rel === "pending_to_you") {
      var req2 = findPendingRequest(id, session().user.id);
      return (req2 ? '<button type="button" class="profile-action" data-friend-accept="' + esc(req2.id) + '"><span class="pa-ico">✓</span><span>Accept</span></button>'
        + '<button type="button" class="profile-action" data-friend-decline="' + esc(req2.id) + '"><span class="pa-ico">×</span><span>Decline</span></button>' : "");
    }
    return '<button type="button" class="profile-action" data-add-friend="' + esc(id) + '" data-friend-name="' + esc(name) + '"><span class="pa-ico">+</span><span>Invite</span></button>';
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
  function discordLinkedBadgeHtml(user) {
    // Purpose: Discord as attached account (icon + Discord username), not profile display name.
    // How: chip under Whirled2 name when discordUsername is set from Continue with Discord.
    if (!user || !(user.discord || user.discordId)) return "";
    var handle = String(user.discordUsername || "Linked").replace(/^@+/, "");
    // How this works (20260906ai): inline SVG Discord mark — phones often show tofu for &#120143;.
    // Beginner: blurple chip stays; white SVG icon is crisp on every device (no weird square).
    return '<span class="discord-link-badge" title="Discord account linked to this Whirled2 profile">'
      + '<svg class="discord-link-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">'
      +   '<path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>'
      + '</svg>'
      + '<span class="discord-link-label">Discord</span> '
      + '<span class="discord-link-user">@' + esc(handle) + '</span></span>';
  }
  function you() {
    var s = session();
    if (s && s.user) {
      var snap = getWalletSnapshot(s.user.id);
      var cleanName = sanitizeDisplayName(s.user.name, "Player");
      // Heal session if a prior bug wrote NaN into the stored display name.
      if (cleanName !== String(s.user.name || "") && !/NaN/i.test(cleanName)) {
        try {
          s.user.name = cleanName;
          if (window.WhirledApi && WhirledApi.saveSession) { /* offline heal below */ }
          localStorage.setItem("whirled2.session", JSON.stringify(s));
        } catch (eHeal) {}
      }
      var out = {
        name: cleanName,
        initials: (s.user.initials && !/NaN/i.test(String(s.user.initials)))
          ? s.user.initials
          : cleanName.slice(0, 1).toUpperCase(),
        bio: s.user.bio || "",
        coins: snap.coins,
        bars: snap.bars,
        streakDays: snap.streakDays,
        room: s.user.room || ROOM
      };
      // Discord is a linked account badge — not the Whirled2 display name.
      if (s.user.discord || s.user.discordId) {
        out.discord = true;
        if (s.user.discordId) out.discordId = s.user.discordId;
        if (s.user.discordUsername) out.discordUsername = s.user.discordUsername;
      }
      return out;
    }
    return { name: "Guest", initials: "?", bio: "", coins: 0, bars: 0, streakDays: 0, room: ROOM };
  }
  function isLoftOwnerId(uid) {
    // How this works: loft owner ≈ first registered user on this browser (same as isLoftOwner).
    if (!uid) return false;
    try {
      var first = localStorage.getItem(FIRST_USER_KEY);
      if (first) return String(uid) === String(first);
    } catch (e) {}
    return false;
  }
  function sortOccupantsYouFirst(list) {
    // How this works: you first, then owner, then friends, then alpha — real session occupants only.
    var friends = {};
    try {
      loadFriends().forEach(function (f) { if (f && f.id) friends[f.id] = true; });
    } catch (eF) {}
    return list.slice().sort(function (a, b) {
      var ay = a.you ? 0 : 1;
      var by = b.you ? 0 : 1;
      if (ay !== by) return ay - by;
      var ao = isLoftOwnerId(a.id) ? 0 : 1;
      var bo = isLoftOwnerId(b.id) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      var af = friends[a.id] ? 0 : 1;
      var bf = friends[b.id] ? 0 : 1;
      if (af !== bf) return af - bf;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    });
  }
  function presenceDotClass(p) {
    // green = here, yellow = /away, orange = in-game stub
    if (p && p.inGame) return "dot in-game";
    if (p && p.id && isAway(p.id)) return "dot away";
    if (p && (p.online || p.you)) return "dot on pulse";
    return "dot";
  }
  function personRow(p) {
    // How this works: compact rail row — initials, name, role, presence; click opens occ menu.
    var id = p.id || "";
    var open = occMenuId && occMenuId === id;
    var isFriend = false;
    try {
      if (!p.you) isFriend = loadFriends().some(function (f) { return f && f.id === id; });
    } catch (eFr) {}
    var isOwner = isLoftOwnerId(id);
    var niceName = displayNameForOccupant(p);
    var niceInitials = (p.initials && !/NaN/i.test(String(p.initials)))
      ? String(p.initials).slice(0, 2)
      : String(niceName).slice(0, 1).toUpperCase();
    var menu;
    if (p.you) {
      // How this works (20260906ak): Change avatar… → recent 5 + tofu + Stuff list (classic).
      // How this works (?v=20260906at): room self-menu — Profile, Change avatar, Emotes/actions.
      menu = '<div class="occ-menu" role="menu">'
        + '<button type="button" class="occ-menu-item" data-profile="' + esc(id) + '">View Profile</button>'
        + '<button type="button" class="occ-menu-item" data-me="profile">Edit profile</button>'
        + changeAvatarMenuHtml()
        + '<div class="occ-menu-sep" aria-hidden="true"></div>'
        + '<button type="button" class="occ-menu-item" data-open-avatar-emotes="1">Emotes / actions…</button>'
        + '<button type="button" class="occ-menu-item" data-room-menu="decorate">Decorate Room…</button>'
        + '</div>';
    } else {
      menu = '<div class="occ-menu" role="menu">'
        + '<button type="button" class="occ-menu-item" data-profile="' + esc(id) + '">View Profile</button>'
        + '<button type="button" class="occ-menu-item" data-whisper="' + esc(id) + '" data-whisper-name="' + esc(p.name || id) + '">Whisper</button>'
        + '<button type="button" class="occ-menu-item" data-invite-buddy="' + esc(id) + '" data-friend-name="' + esc(niceName || p.name || id) + '">Invite to be your friend</button>'
        + (currentParty() ? ('<button type="button" class="occ-menu-item" data-party-invite="' + esc(id) + '" data-party-invite-name="' + esc(niceName || p.name || id) + '">Invite to party</button>') : '')
        + '<button type="button" class="occ-menu-item" data-mail-to="' + esc(id) + '" data-mail-name="' + esc(niceName || p.name || id) + '">Send Mail</button>'
        + '<button type="button" class="occ-menu-item" data-block-chat="' + esc(id) + '" data-block-name="' + esc(p.name || id) + '">Block</button>'
        + '<button type="button" class="occ-menu-item" data-enter-room="loft">Visit Home</button>'
        + '</div>';
    }
    var wrapCls = "person-wrap"
      + (open ? " is-open" : "")
      + (p.you ? " is-you" : "")
      + (isFriend ? " is-friend" : "")
      + (isOwner ? " is-owner" : "");
    var statusLabel = p.you ? "you" : (p.inGame ? "in game" : (isAway(id) ? "away" : "here"));
    return '<div class="' + wrapCls + '">'
      + '<button type="button" class="person" data-occ-menu="' + esc(id) + '" title="' + esc(niceName || id) + '">'
      + '<span class="' + presenceDotClass(p) + '" aria-hidden="true"></span>'
      + '<span class="ava' + (p.you ? " you" : "") + (isOwner ? " owner" : "") + '">' + esc(niceInitials || "?") + '</span>'
      + '<span class="person-meta">'
      +   '<span class="person-name">' + esc(niceName)
      +     + roleBadgeHtml(getRole(id))
      +     + (isOwner ? ' <span class="owner-crown" title="Loft owner">♛</span>' : "")
      +     + (p.you ? ' <span class="sub">(you)</span>' : "")
      +     + (isFriend && !p.you ? ' <span class="friend-mark" title="Friend">★</span>' : "")
      +   '</span>'
      +   '<span class="sub person-status">' + esc(statusLabel) + '</span>'
      + '</span></button>'
      + (open ? menu : "")
      + '</div>';
  }
  function occLegend() {
    return '<div class="occ-legend" title="Presence + classic glow legend">'
      + '<span><i class="lg green"></i> Here</span>'
      + '<span><i class="lg yellow"></i> Away</span>'
      + '<span><i class="lg orange"></i> In game</span>'
      + '</div>';
  }
  function occupantRailHtml(here) {
    // How this works: modernized left rail — count, you-first, optional filter, real occupants only.
    here = sortOccupantsYouFirst(here || []);
    var n = here.length;
    var q = String(occFilterQ || "").trim().toLowerCase();
    var shown = here;
    if (q && n > 5) {
      shown = here.filter(function (p) {
        return String(p.name || "").toLowerCase().indexOf(q) >= 0
          || String(p.id || "").toLowerCase().indexOf(q) >= 0;
      });
    }
    var filter = n > 5
      ? ('<label class="occ-filter"><span class="sr-only">Filter occupants</span>'
        + '<input type="search" id="occ-filter-input" placeholder="Filter…" value="' + esc(occFilterQ || "") + '" data-occ-filter="1" autocomplete="off" /></label>')
      : "";
    return '<div class="occ-rail-head"><h2>In this room <span class="occ-count">(' + n + ')</span></h2>'
      + occLegend()
      + filter
      + '</div>'
      + '<div class="occ-list">'
      + (shown.length ? shown.map(personRow).join("") : '<p class="sub occ-empty">Nobody here yet.</p>')
      + '</div>'
      + '<button type="button" class="text-btn leave-room" data-leave-room="1">Back to Rooms</button>';
  }
  function shareInviteUrl() {
    try {
      if (location && location.href && location.protocol !== "about:") return String(location.href).split("#")[0];
    } catch (e) {}
    return "https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906ax";
  }
  function roomShareUrl() {
    // How this works (20260906af): share link lands on Rooms lobby (#rooms) so friends can preview/enter.
    // Beginner: same base Pages URL + #rooms — no fake social APIs.
    var base = shareInviteUrl();
    if (base.indexOf("#") >= 0) base = base.split("#")[0];
    return base + "#rooms";
  }
  function roomEmbedSnippet() {
    // How this works: optional iframe snippet pointing at the room preview/enter URL.
    // Beginner: copy/paste into a page you own — Whirled2 does not post to social networks.
    // ENGINE DEV: embed hits the static mock URL only; no server-side oEmbed.
    var url = roomShareUrl();
    return '<iframe src="' + url + '" title="Whirled2 room" width="480" height="320" '
      + 'style="border:1px solid #9bb8cc;border-radius:6px;max-width:100%" '
      + 'loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  }
  function roomSharePopupHtml() {
    // How this works: Share / embed popup beyond clipboard-only (classic room control bar).
    if (!roomShareOpen) return "";
    var url = roomShareUrl();
    var snip = roomEmbedSnippet();
    return '<div class="modal-backdrop room-share-backdrop" id="room-share-modal" data-room-share-backdrop="1" role="presentation">'
      + '<div class="modal-card room-share-card" role="dialog" aria-modal="true" aria-label="Share or embed room" data-room-share-card="1" onclick="event.stopPropagation()">'
      +   '<div class="room-side-head"><h2>Share or embed</h2>'
      +     '<button type="button" class="text-btn" data-room-share-close="1" aria-label="Close">×</button></div>'
      +   '<p class="meta">Copy a link so friends can open the Rooms lobby and preview this loft. Optional embed uses a plain iframe — no social APIs.</p>'
      +   '<label class="invite-link-label">Share URL'
      +     '<input id="room-share-url" readonly value="' + esc(url) + '" /></label>'
      +   '<div class="invite-them-actions">'
      +     '<button type="button" class="action-btn" data-room-share-copy-url="1">Copy link</button>'
      +   '</div>'
      +   '<label class="invite-link-label">Embed snippet'
      +     '<textarea id="room-share-embed" readonly rows="4">' + esc(snip) + '</textarea></label>'
      +   '<div class="invite-them-actions">'
      +     '<button type="button" class="action-btn" data-room-share-copy-embed="1">Copy embed</button>'
      +   '</div>'
      +   '<p class="meta" id="room-share-msg"></p>'
      + '</div></div>';
  }
  function openRoomSharePopup() {
    roomShareOpen = true;
    var existing = document.getElementById("room-share-modal");
    if (existing) existing.remove();
    var wrap = document.createElement("div");
    wrap.innerHTML = roomSharePopupHtml();
    var app = document.getElementById("app");
    if (wrap.firstChild && app) app.appendChild(wrap.firstChild);
  }
  function closeRoomSharePopup() {
    roomShareOpen = false;
    var el = document.getElementById("room-share-modal");
    if (el) el.remove();
  }
  function tbIconSvg(kind) {
    // How this works (20260906ak): crisp inline SVG toolbar icons (currentColor) — no CSS bg / emoji tofu.
    // Beginner: Chat options, Volume, Go, Friends, Parties, Room all share this helper.
    var common = ' class="tb-ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"';
    if (kind === "chatopts") {
      return '<svg' + common + '><path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z"/></svg>';
    }
    if (kind === "vol") {
      return '<svg' + common + '><path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a3.5 3.5 0 0 0-1.8-3.1v6.2A3.5 3.5 0 0 0 16.5 12zM14 5.2v1.7a5.5 5.5 0 0 1 0 10.2v1.7a7.2 7.2 0 0 0 0-13.6z"/></svg>';
    }
    if (kind === "vol-mute") {
      return '<svg' + common + '><path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3zm14.5.3 1.4-1.4 1.1 1.1-1.4 1.4 1.4 1.4-1.1 1.1-1.4-1.4-1.4 1.4-1.1-1.1 1.4-1.4-1.4-1.4 1.1-1.1 1.4 1.4z"/></svg>';
    }
    if (kind === "go") {
      return '<svg' + common + '><path fill="currentColor" d="M4 11h9.2L10.6 8.4 12 7l6 6-6 6-1.4-1.4L13.2 13H4v-2z"/></svg>';
    }
    if (kind === "friends") {
      return '<svg' + common + '><path fill="currentColor" d="M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm6.5-.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 19c0-2.8 2.7-5 6.5-5s6.5 2.2 6.5 5v1h-13v-1zm14 .5v.5h5v-1c0-1.9-1.3-3.5-3.2-4.3 1 .6 1.7 1.8 1.7 3.3z"/></svg>';
    }
    if (kind === "party") {
      return '<svg' + common + '><path fill="currentColor" d="M12 3 9.5 9H4l4.5 3.4L6.5 19 12 15.2 17.5 19l-2-6.6L20 9h-5.5L12 3z"/></svg>';
    }
    if (kind === "room") {
      return '<svg' + common + '><path fill="currentColor" d="M4 20V9l8-5 8 5v11h-5v-6H9v6H4zm2-2h1v-6h10v6h1v-8.2l-6-3.8-6 3.8V18z"/></svg>';
    }
    return "";
  }
  function volToolbarHtml() {
    // How this works (20260906af/ak): classic-ish Volume — mute toggle + slider popover + SVG speaker.
    // Beginner: speaker button mutes; open the slider to set loudness (saved on this browser).
    // ENGINE DEV: volume applies to local <audio>; mute-safe skips embed/local load when muted.
    var pct = Math.round((roomAudioVolume || 0) * 100);
    var muteTitle = roomAudioMuted ? "Unmute room music" : "Mute room music";
    var ico = roomAudioMuted ? tbIconSvg("vol-mute") : tbIconSvg("vol");
    return '<span class="tb-vol-wrap' + (roomAudioMuted ? " is-muted" : "") + (volPopoverOpen ? " is-open" : "") + '">'
      + '<button type="button" class="tb tb-vol" title="' + muteTitle + '" aria-label="Volume" data-room-mute="1">' + ico + '</button>'
      + '<button type="button" class="tb-vol-open text-btn" title="Volume slider" aria-label="Open volume slider" data-vol-toggle="1">'
      +   '<svg class="tb-ico tb-ico-caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 4l4 4 4-4z"/></svg>'
      + '</button>'
      + '<div class="tb-vol-pop" id="tb-vol-pop"' + (volPopoverOpen ? "" : " hidden") + ' role="dialog" aria-label="Room volume">'
      +   '<label class="tb-vol-label">Volume <span id="tb-vol-pct">' + pct + '%</span>'
      +     '<input type="range" id="tb-vol-slider" min="0" max="100" step="1" value="' + pct + '" data-vol-slider="1" />'
      +   '</label>'
      +   '<button type="button" class="text-btn" data-room-mute="1">' + (roomAudioMuted ? "Unmute" : "Mute") + '</button>'
      + '</div></span>';
  }
  function inviteThemPanel() {
    var url = shareInviteUrl();
    var subject = encodeURIComponent("Come hang out in Whirled2");
    var body = encodeURIComponent(
      "Hey! Join me in Whirled2 — a free social world revival (no payments). Not affiliated with whirled.club.\n\n"
      + "Open: " + url + "\n\n"
      + "Coins & Bars are play currency. See you in the loft!"
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
  function hangoutInvitePopup() {
    // How this works: after leaving loft, invite people you hung out with (real occupants only).
    if (!hangoutInvitePending || !hangoutInvitePending.length) return "";
    var rows = hangoutInvitePending.map(function (p) {
      return '<label class="hangout-row"><input type="checkbox" class="hangout-pick" data-hangout-id="' + esc(p.id) + '" data-hangout-name="' + esc(p.name || p.id) + '" checked /> '
        + esc(p.name || p.id) + '</label>';
    }).join("");
    return '<div class="modal-backdrop" id="hangout-invite-modal" data-hangout-skip="1">'
      + '<div class="modal-card" role="dialog" aria-label="Invite hangout friends" onclick="event.stopPropagation()">'
      +   '<h2>Invite people you hung out with?</h2>'
      +   '<p class="meta">Send friend requests to players from this loft visit. Skip if you prefer.</p>'
      +   '<div class="hangout-list">' + rows + '</div>'
      +   '<div class="invite-them-actions">'
      +     '<button type="button" class="action-btn" data-hangout-send="1">Invite selected</button>'
      +     '<button type="button" class="text-btn" data-hangout-skip="1">Skip</button>'
      +   '</div>'
      + '</div></div>';
  }
  function friendInvitePopup() {
    if (!friendInvitePending) return "";
    var t = friendInvitePending;
    return '<div class="modal-backdrop" id="buddy-invite-modal" data-buddy-cancel="1">'
      + '<div class="modal-card" role="dialog" aria-label="Let\'s be buddies!" onclick="event.stopPropagation()">'
      +   '<h2>Let\'s be buddies!</h2>'
      +   '<p class="meta">Invite <b>' + esc(t.name) + '</b> — optional message (sent as a mail note). Default classic text below.</p>'
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
      if (isPrivilegedName(msg.who) || isPrivilegedName(uid)) role = "admin";
    }
    var accent = role === "admin" ? " is-admin" : (role === "mod" ? " is-mod" : "");
    var text = String(msg.text || "");
    var emote = !!msg.emote;
    var thought = !!msg.thought;
    var shout = !!msg.shout;
    if (!emote && (/^\/me\s+/i.test(text) || /^\/emote\s+/i.test(text))) {
      emote = true;
      text = text.replace(/^\/(me|emote)\s+/i, "");
    }
    if (!thought && /^\/think\s+/i.test(text)) {
      thought = true;
      text = text.replace(/^\/think\s+/i, "");
    }
    if (!shout && /^\/shout\s+/i.test(text)) {
      shout = true;
      text = text.replace(/^\/shout\s+/i, "");
    }
    var awayCls = (uid && typeof isAway === "function" && isAway(uid)) ? " is-away" : "";
    var nameBtn = '<button type="button" class="chat-who' + awayCls + '" data-chat-who="' + esc(uid || msg.who || "") + '" data-chat-who-name="' + esc(msg.who || "") + '">' + esc(msg.who || "?") + '</button>';
    var body;
    if (emote) {
      body = '<div class="chat-bubble emote"><i>' + esc(msg.who) + " " + esc(text) + "</i></div>";
    } else if (thought) {
      body = '<div class="chat-bubble thought"><i>' + esc(text) + '</i></div>';
    } else if (shout) {
      body = '<div class="chat-bubble shout"><b>' + esc(text) + '</b></div>';
    } else {
      body = '<div class="chat-bubble">' + esc(text) + '</div>';
    }
    var mid = msg.id || "";
    return '<div class="chat-row' + accent + (emote ? " is-emote" : "") + (thought ? " is-thought" : "") + (shout ? " is-shout" : "") + '" data-msg-id="' + esc(mid) + '">'
      + (emote ? "" : (nameBtn + roleBadgeHtml(role) + ' <time>' + esc(stamp) + "</time>"))
      + body
      + (mid && typeof reactionPillsHtml === "function" ? reactionPillsHtml(mid) + reactionBarHtml(mid) : "")
      + "</div>";
  }
  function card(item) {
    var id = item.id || "";
    var isAv = itemCat(item) === "avatars";
    var worn = isAv && isWornStuffId(id);
    var thumb = item.thumb
      ? '<img class="stuff-thumb" src="' + item.thumb + '" alt="" />'
      : '<div class="swatch swatch-empty" aria-hidden="true"></div>';
    // How this works (20260906ak): classic My Avatars card — Wear / Remove + worn badge.
    var wearRow = "";
    if (isAv) {
      wearRow = '<div class="stuff-card-wear">'
        + (worn
          ? ('<span class="stuff-worn-badge" title="Currently worn">Worn</span>'
            + '<button type="button" class="stuff-wear-chip is-worn" data-stuff-unwear="' + esc(id) + '">'
            + happyFaceSvg(true) + ' Remove avatar</button>')
          : ('<button type="button" class="stuff-wear-chip" data-stuff-wear="' + esc(id) + '">'
            + happyFaceSvg(false) + ' Wear avatar</button>'))
        + '</div>';
    }
    return '<div class="card stuff-card' + (worn ? " is-worn" : "") + '">'
      + '<button type="button" class="stuff-card-open" data-stuff-item="' + esc(id) + '">'
      + thumb
      + (worn ? '<span class="stuff-worn-ribbon" aria-hidden="true">★</span>' : "")
      + '<div class="body"><h3>' + esc(item.name || "Item") + '</h3>'
      + '<p class="meta">' + esc(item.kind || itemCat(item)) + (item.creator ? (" · " + esc(item.creator)) : "") + '</p>'
      + '<div class="price">owned</div></div></button>'
      + wearRow
      + '</div>';
  }
  function findStuff(id) {
    var all = loadStuff();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  // ---------------------------------------------------------------------------
  // Avatar Upload Wizard (?v=20260906ar) — flexible creator path
  // Beginner: Stuff → Avatars → Upload… → multi-step wizard (not one rigid form).
  // Accept PNG/WebP sequences, folders, zip packs, .aseprite (store+note), optional .swf (lab).
  // ENGINE DEV: saved item.states matches cyan-hair pack schema for Pixi later.
  // ---------------------------------------------------------------------------
  var AVATAR_WIZARD_STATES = ["idle", "walk", "stand", "wave", "dance", "sit", "happy", "pose", "custom"];
  var avatarWizard = null; // null | wizard draft object
  var stuffModeAvatarWizard = false; // when true, stuffMode upload shows wizard

  function newAvatarWizardDraft(editItem) {
    // How this works: draft lives in memory until Save; remount/edit can reload from Stuff item.
    var draft = {
      step: 1,
      name: "",
      description: "",
      artFaces: "left",
      files: [], // { id, name, dataUrl, kind: image|aseprite|swf|other }
      mapping: {}, // state -> [fileId,...]
      fps: {},
      loopOnce: {}, // emotes default once
      thumbFileId: "",
      editItemId: editItem && editItem.id ? editItem.id : null,
      notes: []
    };
    AVATAR_WIZARD_STATES.forEach(function (s) {
      draft.mapping[s] = [];
      draft.fps[s] = (s === "walk" || s === "dance") ? 6 : 5;
      draft.loopOnce[s] = (s === "wave" || s === "sit" || s === "pose" || s === "happy" || s === "custom");
    });
    if (editItem) {
      draft.name = editItem.name || "";
      draft.description = editItem.description || "";
      draft.artFaces = editItem.artFaces || (editItem.pack && editItem.pack.artFaces) || "left";
      var states = editItem.states || (editItem.pack && editItem.pack.states) || {};
      Object.keys(states).forEach(function (st) {
        var fr = (states[st] && states[st].frames) || [];
        var durs = (states[st] && states[st].frameDurationsMs) || [];
        fr.forEach(function (url, i) {
          var fid = "ex" + st + i + Math.random().toString(36).slice(2, 6);
          draft.files.push({ id: fid, name: st + "_frame_" + i + ".png", dataUrl: url, kind: "image" });
          if (!draft.mapping[st]) draft.mapping[st] = [];
          draft.mapping[st].push(fid);
          if (durs[i] > 0) draft.fps[st] = Math.max(1, Math.round(1000 / durs[i]));
        });
      });
      if (draft.files[0]) draft.thumbFileId = draft.files[0].id;
      draft.step = 3;
    }
    return draft;
  }
  function guessStateFromName(name) {
    // Beginner: file/folder names like walk/frame_01.png or idle_00.png auto-suggest a state.
    var n = String(name || "").toLowerCase().replace(/\\/g, "/");
    var keys = ["walk", "idle", "stand", "wave", "dance", "sit", "happy", "pose", "custom"];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (n.indexOf("/" + k + "/") >= 0 || n.indexOf("_" + k) >= 0 || n.indexOf(k + "_") === 0 || n.indexOf(k + "/") >= 0) {
        return k;
      }
    }
    return "idle";
  }
  function avatarWizardFileById(id) {
    if (!avatarWizard) return null;
    for (var i = 0; i < avatarWizard.files.length; i++) {
      if (avatarWizard.files[i].id === id) return avatarWizard.files[i];
    }
    return null;
  }
  function msFromFps(fps) {
    fps = Number(fps) || 5;
    if (fps < 1) fps = 1;
    if (fps > 24) fps = 24;
    return Math.round(1000 / fps);
  }
  function buildStatesFromWizard(draft) {
    // ENGINE DEV: same shape as cyan-hair pack.json states.
    var states = {};
    AVATAR_WIZARD_STATES.forEach(function (st) {
      var ids = (draft.mapping[st] || []).slice();
      if (!ids.length) return;
      var frames = [];
      ids.forEach(function (id) {
        var f = null;
        for (var i = 0; i < draft.files.length; i++) if (draft.files[i].id === id) f = draft.files[i];
        if (f && f.kind === "image" && f.dataUrl) frames.push(f.dataUrl);
      });
      if (!frames.length) return;
      var ms = msFromFps(draft.fps[st]);
      states[st] = {
        frames: frames,
        frameDurationsMs: frames.map(function () { return ms; })
      };
    });
    return states;
  }
  function readBlobAsDataUrl(blob, maxBytes) {
    return new Promise(function (resolve, reject) {
      if (maxBytes && blob.size > maxBytes) {
        reject(new Error("File too large (~" + Math.round(blob.size / 1024) + "KB)."));
        return;
      }
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result || "")); };
      r.onerror = function () { reject(new Error("Could not read file.")); };
      r.readAsDataURL(blob);
    });
  }
  function inflateRaw(bytes) {
    // How this works: modern browsers expose DecompressionStream("deflate-raw") for zip DEFLATE.
    if (typeof DecompressionStream === "undefined") {
      return Promise.reject(new Error("This browser cannot unpack zip (no DecompressionStream). Unzip locally and upload the PNG folder."));
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }
  function parseZipImages(arrayBuffer) {
    // Beginner: pulls PNG/WebP/JPEG from a simple .zip pack (folder names become state hints).
    // ENGINE DEV: store-method + deflate; skips encrypted/unsupported entries.
    var u8 = new Uint8Array(arrayBuffer);
    var view = new DataView(arrayBuffer);
    var out = [];
    var i = 0;
    function u16(o) { return view.getUint16(o, true); }
    function u32(o) { return view.getUint32(o, true); }
    var chain = Promise.resolve();
    while (i + 30 < u8.length) {
      if (u32(i) !== 0x04034b50) break;
      var method = u16(i + 8);
      var compSize = u32(i + 18);
      var uncompSize = u32(i + 22);
      var nameLen = u16(i + 26);
      var extraLen = u16(i + 28);
      var nameBytes = u8.subarray(i + 30, i + 30 + nameLen);
      var name = "";
      try { name = new TextDecoder("utf-8").decode(nameBytes); } catch (e) { name = "file"; }
      var dataStart = i + 30 + nameLen + extraLen;
      var data = u8.subarray(dataStart, dataStart + compSize);
      i = dataStart + compSize;
      if (/\/$/.test(name)) continue;
      if (!/\.(png|webp|jpe?g|gif)$/i.test(name)) continue;
      (function (entryName, entryMethod, entryData, entryUncomp) {
        chain = chain.then(function () {
          var payload;
          if (entryMethod === 0) payload = Promise.resolve(entryData);
          else if (entryMethod === 8) payload = inflateRaw(entryData);
          else return null;
          return payload.then(function (raw) {
            var lower = entryName.toLowerCase();
            var mime = "image/png";
            if (/\.webp$/i.test(lower)) mime = "image/webp";
            else if (/\.jpe?g$/i.test(lower)) mime = "image/jpeg";
            else if (/\.gif$/i.test(lower)) mime = "image/gif";
            var b64 = btoa(Array.prototype.map.call(raw, function (c) { return String.fromCharCode(c); }).join(""));
            // Guard huge frames
            if (b64.length > 350000) return null;
            out.push({
              id: "z" + Math.random().toString(36).slice(2, 9),
              name: entryName,
              dataUrl: "data:" + mime + ";base64," + b64,
              kind: "image",
              suggested: guessStateFromName(entryName)
            });
          });
        });
      })(name, method, data, uncompSize);
    }
    return chain.then(function () { return out; });
  }
  function avatarWizardPresetsHtml() {
    return '<div class="avatar-wiz-presets" role="list">'
      + '<span class="avatar-wiz-chip" role="listitem">Aseprite → File → Export Sprite Sheet / PNG sequence</span>'
      + '<span class="avatar-wiz-chip" role="listitem">Photoshop / Pixelora → PNG frames</span>'
      + '<span class="avatar-wiz-chip" role="listitem">Flash / Animate → Publish SWF or export PNG</span>'
      + '<span class="avatar-wiz-chip" role="listitem">Plain folders: idle/ walk/ wave/</span>'
      + '</div>';
  }
  function avatarWizardHtml() {
    // Multi-step pale-blue wizard UI.
    if (!avatarWizard) avatarWizard = newAvatarWizardDraft(null);
    var d = avatarWizard;
    var step = d.step || 1;
    var head = '<div class="panel avatar-wiz-panel" id="avatar-wizard">'
      + '<div class="room-side-head"><h2>Avatar upload wizard</h2>'
      +   '<button type="button" class="text-btn" data-avatar-wiz-cancel="1">Cancel</button></div>'
      + '<p class="meta">Flexible creator path — map any frames to idle / walk / emotes. Remount anytime from the item. '
      + '<button type="button" class="text-btn" data-avatar-guide-open="1">How to make an avatar</button></p>'
      + avatarWizardPresetsHtml()
      + '<div class="avatar-wiz-steps" aria-label="Wizard steps">'
      +   [1,2,3,4].map(function (n) {
          var labels = { 1: "Files", 2: "Name", 3: "Map states", 4: "Preview" };
          return '<span class="avatar-wiz-step' + (step === n ? " is-on" : "") + (step > n ? " is-done" : "") + '">' + n + ". " + labels[n] + "</span>";
        }).join("")
      + '</div>';

    var body = "";
    if (step === 1) {
      body = '<div class="avatar-wiz-body">'
        + '<p class="meta">Drop in one file or many. Names like <code>walk/frame_00.png</code> auto-suggest states.</p>'
        + '<label class="avatar-wiz-drop">Images / frames (PNG WebP JPEG GIF)'
        +   '<input type="file" id="avatar-wiz-images" accept="image/png,image/webp,image/jpeg,image/gif" multiple /></label>'
        + '<label class="avatar-wiz-drop">Folder of frames'
        +   '<input type="file" id="avatar-wiz-folder" accept="image/png,image/webp,image/jpeg,image/gif" multiple webkitdirectory directory /></label>'
        + '<label class="avatar-wiz-drop">Zip pack (.zip of folders)'
        +   '<input type="file" id="avatar-wiz-zip" accept=".zip,application/zip" /></label>'
        + '<label class="avatar-wiz-drop">Aseprite source (stored + note — export PNGs for loft)'
        +   '<input type="file" id="avatar-wiz-ase" accept=".aseprite,.ase,application/octet-stream" multiple /></label>'
        + '<label class="avatar-wiz-drop">SWF (experimental Classic Flash — Wear with PNG states or Ruffle overlay)'
        +   '<input type="file" id="avatar-wiz-swf" accept=".swf,application/x-shockwave-flash" /></label>'
        + '<div class="avatar-wiz-filelist">' + (d.files.length
          ? d.files.map(function (f) {
              return '<div class="avatar-wiz-file' + (f.kind !== "image" ? " is-attach" : "") + '" data-wiz-file="' + esc(f.id) + '">'
                + (f.kind === "image" ? ('<img src="' + f.dataUrl + '" alt="" />') : '<span class="avatar-wiz-file-tag">' + esc(f.kind) + '</span>')
                + '<span class="avatar-wiz-file-name" title="' + esc(f.name) + '">' + esc(f.name) + '</span>'
                + '<button type="button" class="text-btn" data-wiz-remove-file="' + esc(f.id) + '">Remove</button></div>';
            }).join("")
          : '<p class="meta">No files yet.</p>')
        + '</div>'
        + '<p class="meta" id="avatar-wiz-msg"></p>'
        + '<div class="avatar-wiz-nav">'
        +   '<button type="button" class="action-btn" data-avatar-wiz-next="1"' + (d.files.some(function (f) { return f.kind === "image"; }) ? "" : " disabled") + '>Next — Name</button>'
        + '</div></div>';
    } else if (step === 2) {
      var imgs = d.files.filter(function (f) { return f.kind === "image"; });
      body = '<div class="avatar-wiz-body">'
        + '<label>Avatar name <input id="avatar-wiz-name" maxlength="80" required value="' + esc(d.name) + '" placeholder="My avatar" /></label>'
        + '<label>Description <textarea id="avatar-wiz-desc" rows="2" maxlength="400" placeholder="Optional notes">' + esc(d.description) + '</textarea></label>'
        + '<div class="section-label">Preview thumb (tap one)</div>'
        + '<div class="avatar-wiz-thumbs">' + imgs.map(function (f) {
            return '<button type="button" class="avatar-wiz-thumb' + (d.thumbFileId === f.id ? " is-on" : "") + '" data-wiz-thumb="' + esc(f.id) + '">'
              + '<img src="' + f.dataUrl + '" alt="" /></button>';
          }).join("") + '</div>'
        + '<label>Art faces which way? <select id="avatar-wiz-faces">'
        +   '<option value="left"' + (d.artFaces === "left" ? " selected" : "") + '>Left (flip when walking right)</option>'
        +   '<option value="right"' + (d.artFaces === "right" ? " selected" : "") + '>Right (flip when walking left)</option>'
        + '</select></label>'
        + '<div class="avatar-wiz-nav">'
        +   '<button type="button" class="text-btn" data-avatar-wiz-back="1">Back</button>'
        +   '<button type="button" class="action-btn" data-avatar-wiz-next="1">Next — Map states</button>'
        + '</div></div>';
    } else if (step === 3) {
      var imgs3 = d.files.filter(function (f) { return f.kind === "image"; });
      // Ensure every image is in some mapping (default suggested)
      imgs3.forEach(function (f) {
        var placed = AVATAR_WIZARD_STATES.some(function (st) { return (d.mapping[st] || []).indexOf(f.id) >= 0; });
        if (!placed) {
          var g = f.suggested || guessStateFromName(f.name);
          if (!d.mapping[g]) d.mapping[g] = [];
          d.mapping[g].push(f.id);
        }
      });
      body = '<div class="avatar-wiz-body">'
        + '<p class="meta">Assign each frame to a state. Reorder with ↑ ↓. Set FPS. Emotes can play once.</p>'
        + AVATAR_WIZARD_STATES.map(function (st) {
            var ids = d.mapping[st] || [];
            if (!ids.length && st !== "idle" && st !== "walk" && st !== "wave" && st !== "pose" && st !== "sit") {
              // collapse unused custom-ish empty rows except core
              if (st === "dance" || st === "happy" || st === "stand" || st === "custom") {
                /* still show so user can add */
              }
            }
            return '<div class="avatar-wiz-state" data-wiz-state="' + esc(st) + '">'
              + '<div class="avatar-wiz-state-head"><b>' + esc(st) + '</b>'
              +   '<label class="avatar-wiz-fps">FPS <input type="number" min="1" max="24" value="' + esc(String(d.fps[st] || 5)) + '" data-wiz-fps="' + esc(st) + '" /></label>'
              +   (st === "idle" || st === "walk" ? "" : ('<label class="check-row"><input type="checkbox" data-wiz-once="' + esc(st) + '"' + (d.loopOnce[st] ? " checked" : "") + ' /> Play once</label>'))
              + '</div>'
              + '<div class="avatar-wiz-state-frames">' + (ids.length ? ids.map(function (id, ix) {
                  var f = avatarWizardFileById(id);
                  if (!f) return "";
                  return '<div class="avatar-wiz-map-row" data-wiz-map="' + esc(st) + '" data-wiz-id="' + esc(id) + '">'
                    + '<img src="' + f.dataUrl + '" alt="" />'
                    + '<span>' + esc(f.name) + '</span>'
                    + '<button type="button" class="text-btn" data-wiz-up="' + esc(st) + '" data-wiz-id="' + esc(id) + '" ' + (ix === 0 ? "disabled" : "") + '>↑</button>'
                    + '<button type="button" class="text-btn" data-wiz-down="' + esc(st) + '" data-wiz-id="' + esc(id) + '" ' + (ix === ids.length - 1 ? "disabled" : "") + '>↓</button>'
                    + '<select data-wiz-reassign="' + esc(id) + '" data-wiz-from="' + esc(st) + '">'
                    +   AVATAR_WIZARD_STATES.map(function (s2) {
                          return '<option value="' + s2 + '"' + (s2 === st ? " selected" : "") + '>' + s2 + '</option>';
                        }).join("")
                    + '</select></div>';
                }).join("") : '<p class="meta">No frames — reassign from another state.</p>')
              + '</div></div>';
          }).join("")
        + '<div class="avatar-wiz-nav">'
        +   '<button type="button" class="text-btn" data-avatar-wiz-back="1">Back</button>'
        +   '<button type="button" class="action-btn" data-avatar-wiz-next="1">Next — Preview</button>'
        + '</div></div>';
    } else {
      var states = buildStatesFromWizard(d);
      var idle = states.idle || states.stand || states.pose;
      var walk = states.walk;
      var thumb = (avatarWizardFileById(d.thumbFileId) || {}).dataUrl || (idle && idle.frames[0]) || "";
      body = '<div class="avatar-wiz-body">'
        + '<div class="avatar-wiz-preview-grid">'
        +   '<div class="avatar-wiz-preview-card"><div class="section-label">Idle</div>'
        +     (idle ? '<img class="avatar-wiz-preview-img" id="avatar-wiz-prev-idle" src="' + (idle.frames[0] || "") + '" data-frames="' + esc(JSON.stringify(idle.frames)) + '" data-ms="' + esc(String((idle.frameDurationsMs && idle.frameDurationsMs[0]) || 200)) + '" alt="" />'
          : '<p class="meta">Add idle frames (required for Wear).</p>')
        +   '</div>'
        +   '<div class="avatar-wiz-preview-card"><div class="section-label">Walk</div>'
        +     (walk ? '<img class="avatar-wiz-preview-img" id="avatar-wiz-prev-walk" src="' + (walk.frames[0] || "") + '" data-frames="' + esc(JSON.stringify(walk.frames)) + '" data-ms="' + esc(String((walk.frameDurationsMs && walk.frameDurationsMs[0]) || 200)) + '" alt="" />'
          : '<p class="meta">Optional — without walk, loft still shows idle.</p>')
        +   '</div>'
        +   '<div class="avatar-wiz-preview-card"><div class="section-label">Emote sample</div>'
        +     (function () {
              var em = states.wave || states.pose || states.happy || states.sit;
              if (!em) return '<p class="meta">Optional emotes — click avatar in loft later.</p>';
              return '<img class="avatar-wiz-preview-img" id="avatar-wiz-prev-emote" src="' + (em.frames[0] || "") + '" data-frames="' + esc(JSON.stringify(em.frames)) + '" data-ms="' + esc(String((em.frameDurationsMs && em.frameDurationsMs[0]) || 220)) + '" alt="" />';
            })()
        +   '</div>'
        +   '<div class="avatar-wiz-preview-card"><div class="section-label">Thumb</div>'
        +     (thumb ? '<img src="' + thumb + '" alt="" class="avatar-wiz-preview-img" />' : '<p class="meta">—</p>')
        +   '</div>'
        + '</div>'
        + '<label class="check-row"><input type="checkbox" id="avatar-wiz-copyright" required /> I confirm I have the right to upload this (copyright).</label>'
        + '<p class="meta" id="avatar-wiz-msg"></p>'
        + '<div class="avatar-wiz-nav">'
        +   '<button type="button" class="text-btn" data-avatar-wiz-back="1">Back</button>'
        +   '<button type="button" class="action-btn" data-avatar-wiz-save="1">Save to Stuff</button>'
        + '</div></div>';
    }
    return head + body + '</div>';
  }
  function startAvatarWizardPreviewAnims() {
    // Flip preview cards like tiny GIFs.
    ["avatar-wiz-prev-idle", "avatar-wiz-prev-walk", "avatar-wiz-prev-emote"].forEach(function (id) {
      var img = document.getElementById(id);
      if (!img) return;
      var frames = [];
      try { frames = JSON.parse(img.getAttribute("data-frames") || "[]"); } catch (e) { frames = []; }
      var ms = parseInt(img.getAttribute("data-ms") || "200", 10) || 200;
      if (frames.length < 2) return;
      if (img._wizTimer) clearInterval(img._wizTimer);
      var i = 0;
      img._wizTimer = setInterval(function () {
        i = (i + 1) % frames.length;
        img.src = frames[i];
      }, ms);
    });
  }
  function saveAvatarWizardToStuff() {
    // Persist local Stuff item with absolutized data URL frames (Wear-ready).
    if (!avatarWizard || !session()) return;
    var d = avatarWizard;
    var states = buildStatesFromWizard(d);
    if (!(states.idle && states.idle.frames && states.idle.frames.length)) {
      var msg = document.getElementById("avatar-wiz-msg");
      if (msg) msg.textContent = "Map at least one idle frame before saving.";
      return;
    }
    var copy = document.getElementById("avatar-wiz-copyright");
    if (copy && !copy.checked) {
      var msg2 = document.getElementById("avatar-wiz-msg");
      if (msg2) msg2.textContent = "Please confirm the copyright checkbox.";
      return;
    }
    var thumb = (avatarWizardFileById(d.thumbFileId) || {}).dataUrl || states.idle.frames[0];
    var ases = d.files.filter(function (f) { return f.kind === "aseprite"; });
    var swfs = d.files.filter(function (f) { return f.kind === "swf"; });
    var items = loadStuff();
    var nid = d.editItemId || ("av" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    var row = {
      id: nid,
      name: (d.name || "Avatar").slice(0, 80),
      description: (d.description || "Uploaded via avatar wizard.").slice(0, 400),
      kind: "avatar",
      type: "avatar",
      category: "avatars",
      creator: session().user.name,
      ownerId: session().user.id,
      thumb: thumb,
      preview: thumb,
      frames: states.idle.frames.slice(),
      frameDurationsMs: states.idle.frameDurationsMs.slice(),
      states: states,
      artFaces: d.artFaces || "left",
      source: ases.length ? "aseprite+wizard" : "png-wizard",
      pack: {
        name: d.name || "Avatar",
        states: states,
        frames: states.idle.frames.slice(),
        displayFrames: states.idle.frames.slice(),
        frameDurationsMs: states.idle.frameDurationsMs.slice(),
        thumb: thumb,
        artFaces: d.artFaces || "left",
        source: "wizard",
        _engineDev: "Wizard pack — same states schema as cyan-hair for Pixi."
      },
      owned: true,
      at: new Date().toISOString()
    };
    if (ases[0]) {
      row.asepriteDataUrl = ases[0].dataUrl;
      row.asepriteName = ases[0].name;
      row.pack.sourceFile = ases[0].name;
    }
    if (swfs[0]) {
      // (?v=20260906ax): hybrid — PNG states for walk; SWF optional Experimental Flash on item detail.
      row.swfNote = "SWF attached — enable Classic Flash (experimental) on the item for Ruffle; loft walk uses PNG states.";
      row.swfName = swfs[0].name;
      row.classicFlashOptIn = true;
      row.mediaKind = "swf";
      if (swfs[0].dataUrl && swfs[0].dataUrl.length < 2.5e6) {
        row.swfDataUrl = swfs[0].dataUrl;
        row.swfUrl = swfs[0].dataUrl;
      }
      if (row.pack) row.pack.classicFlashOptIn = true;
    }
    var replaced = false;
    if (d.editItemId) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === d.editItemId) {
          items[i] = Object.assign({}, items[i], row, { id: d.editItemId });
          replaced = true;
          nid = d.editItemId;
          break;
        }
      }
    }
    if (!replaced) items.unshift(row);
    try {
      saveStuff(items);
    } catch (eSave) {
      var msg3 = document.getElementById("avatar-wiz-msg");
      if (msg3) msg3.textContent = "Could not save — frames may be too large for browser storage. Use fewer/smaller PNGs.";
      return;
    }
    // If currently worn, refresh wear from new mapping
    if (isWornStuffId(nid)) {
      wearStuffAvatar(findStuff(nid));
    }
    avatarWizard = null;
    stuffModeAvatarWizard = false;
    stuffMode = "detail";
    stuffItemId = nid;
    pushNotice("green", "Avatar saved. Wear it, then click the loft floor to walk / click avatar for emotes.", { transient: true });
    try { awardAction("upload"); } catch (eA) {}
    paint("stuff");
  }

  function stuffUploadForm(meta) {
    // How this works: Music = audio data URL. Avatars = PNG/WebP preview (+ optional .aseprite attachment).
    // Other categories stay image-thumb stubs. Copyright checkbox is always required.
    var isMusic = meta.id === "music";
    var isAvatar = meta.id === "avatars";
    var fileLabel;
    if (isMusic) {
      fileLabel = 'Audio file (MP3 / WAV / OGG / WebM) <input type="file" name="media" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/*" required />';
    } else if (isAvatar) {
      // Beginner (?v=20260906ar): full wizard replaces the rigid idle/walk-only form.
      // Keep a tiny legacy note; primary path is avatarWizardHtml().
      return avatarWizardHtml();
    } else {
      fileLabel = 'Thumbnail / image (optional) <input type="file" name="image" accept="image/png,image/jpeg,image/gif,image/webp" />';
    }
    var blurb;
    if (isMusic) {
      blurb = 'Wiki Music: upload an audio file you own or have rights to. Stored as a data URL in this browser (~2–4MB). Add tracks to the room playlist from Room menu. Do <b>not</b> upload copyrighted material you do not own.';
    } else if (isAvatar) {
      blurb = 'Wiki Create avatars (modern path): pick <b>idle</b> PNG(s) + optional <b>walk</b> PNG(s) (or .aseprite attachments) → one Stuff item with states. After save → <b>Wear</b> → click loft floor to walk. Classic SWF stays On hold — see STUFF-AVATARS.md. Each image ~200KB; each .aseprite ~1MB.';
    } else {
      blurb = 'Wiki-style stub: name + description + optional thumbnail. SWF / full media arrives with the engine later. Images only for this mock (png/jpg/gif/webp), ~200KB cap.';
    }
    var ph = isMusic ? "Track name" : (isAvatar ? "Avatar name" : "Item name");
    return '<div class="panel stuff-upload-panel">'
      + '<div class="room-side-head"><h2>Upload / Create — ' + esc(meta.label) + '</h2>'
      +   '<button type="button" class="text-btn" data-stuff-mode="browse">Cancel</button></div>'
      + '<p class="meta">' + blurb + '</p>'
      + '<form id="stuff-upload-form" class="stuff-upload-form">'
      +   '<label>Name <input name="name" maxlength="80" required placeholder="' + ph + '" /></label>'
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
      : '<div class="swatch swatch-empty" aria-hidden="true"></div>';
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
          + '<p class="meta">Listed at <b>' + esc(formatShopPrice(listing.coins != null ? listing.coins : listing.price || 0, false)) + '</b> (display-only).'
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
          +   '<p class="meta">Copies a listing into Shop with your seller id/name and thumb. Buy stays disabled — no payments; Bars are earn-only.</p>'
          + '</form>';
      } else {
        listBlock = '<div class="section-label">Shop</div>'
          + '<button type="button" class="action-btn" data-stuff-list-open="' + esc(item.id) + '">List Item</button>'
          + '<p class="meta">Creator loop: list a copy into Shop. Price is display-only.</p>';
      }
    }
    var isAvatar = itemCat(item) === "avatars";
    // How this works (20260906ak): avatars get a classic Avatar viewer (backdrop + scale + Wear).
    var viewerBlock = (!edit && isAvatar) ? avatarViewerHtml(item) : "";
    var headBlock = isAvatar
      ? ('<div class="stuff-detail-head stuff-detail-head-avatar"><div><h2>' + esc(item.name || "Item") + '</h2>'
        + (edit ? body : ('<p class="meta">by ' + esc(item.creator || "you") + ' · ' + esc(item.kind || "avatar") + '</p>'
          + '<p>' + esc(item.description || "No description.") + '</p>'))
        + '</div></div>')
      : ('<div class="stuff-detail-head">' + thumb + '<div><h2>' + esc(item.name || "Item") + '</h2>' + body + '</div></div>');
    return '<div class="panel stuff-detail-panel' + (isAvatar ? " stuff-detail-avatar" : "") + '">'
      + '<button type="button" class="text-btn" data-stuff-mode="browse">← Back to ' + esc(catMeta(stuffCat).label) + '</button>'
      + viewerBlock
      + headBlock
      + (edit ? "" : (
        '<div class="stuff-detail-actions">'
        + (isAvatar ? "" : "")
        + '<button type="button" class="action-btn" data-stuff-edit-open="' + esc(item.id) + '">Rename</button>'
        + '<button type="button" class="action-btn danger" data-stuff-delete="' + esc(item.id) + '">Delete Item</button>'
        + '</div>'
        + (isAvatar
          ? ('<p class="meta">Wear → loft <code>#avatar-wear-layer</code>. Hybrid (smooth) = PNG walk when idle/walk attached; Force Ruffle = SWF appearance (transparent, no black box). Scale applies to preview + loft.</p>'
            + '<div class="stuff-detail-actions">'
            +   '<button type="button" class="action-btn" data-avatar-wiz-remap="' + esc(item.id) + '">Remap states…</button>'
            +   '<button type="button" class="text-btn" data-avatar-guide-open="1">How to make an avatar</button>'
            + '</div>'
            + (function () {
                try {
                  if (window.WhirledClassicAvatar && WhirledClassicAvatar.classicDetailExtrasHtml) {
                    return WhirledClassicAvatar.classicDetailExtrasHtml(item) || "";
                  }
                } catch (e) {}
                return "";
              })())
          : "")
        + listBlock
        + '<div class="section-label">Send as Gift</div>'
        + (friends.length
          ? ('<form id="stuff-gift-form" data-stuff-gift="' + esc(item.id) + '" class="stuff-gift-form">'
            + '<select name="friendId" required><option value="">— pick a friend —</option>' + friendOpts + '</select>'
            + '<button type="submit">Send as Gift</button>'
            + '<p class="meta">Attaches this item to mail, removes it from your Stuff, and the friend claims it when they open the mail (once).</p>'
            + '</form>')
          : '<p class="meta">Add a friend first to send gifts.</p>')
      ))
      + '</div>';
  }
  // ---------------------------------------------------------------------------
  // Stuff tab — shelves, upload, avatar wizard, Wear
  // Beginner: Avatars category opens the multi-step wizard; Wear writes loft billboard.
  // ENGINE DEV: Wear uses #avatar-wear-layer sibling — not inside #stage-slot until Pixi owns avatars.
  // ---------------------------------------------------------------------------
  function stuffPage() {
    // What: Stuff tab inventory by category (Avatars, Furniture, …).
    // How: left teal rail picks category; main shows Your Stuff grid or upload/detail.
    // Why: matches classic Stuff tab — empty until the player uploads; nothing invented.
    // Avatar lab: Avatars category keeps stub thumbnail upload; SWF wardrobe is On hold unless ?avatarLab=1.
    var meta = catMeta(stuffCat);
    var all = loadStuff();
    var items = filterByCat(all, stuffCat);
    var how = '<div class="panel how-stuff-panel">'
      + '<h3>How do I get stuff?</h3>'
      + '<p class="meta">Create furniture and media yourself (wiki Upload), or earn/buy later. Coins & Bars are play currency — no payments. Nothing is invented for you.</p>'
      + '<button type="button" class="action-btn" data-stuff-mode="upload">' + (stuffCat === "avatars" ? "Upload avatar wizard…" : "Upload…") + '</button>'
      + (stuffCat === "avatars" ? ' <button type="button" class="text-btn" data-avatar-guide-open="1">How to make an avatar</button>' : "")
      + '</div>';
    // How this works: quiet On hold note (default) OR full Avatar lab (flag on) — only on Avatars browse.
    var avatarExtra = "";
    if (stuffCat === "avatars" && stuffMode === "browse") {
      // How this works (?v=20260906ax): classic Flash upload panel is first-class (Experimental).
      // Old IndexedDB wardrobe lab still gated by ?avatarLab=1. Whirl / PNG wizard unchanged.
      var classicPanel = "";
      try {
        if (window.WhirledClassicAvatar && WhirledClassicAvatar.classicUploadPanelHtml) {
          classicPanel = WhirledClassicAvatar.classicUploadPanelHtml();
        }
      } catch (eCp) { classicPanel = ""; }
      avatarExtra = ensureUserPackSeedButtonHtml()
        + classicPanel
        + (isAvatarLabOn() ? avatarLabPanelHtml() : avatarLabHoldPanelHtml());
    }
    var body;
    if (stuffMode === "upload") {
      // How this works (?v=20260906ar): Avatars open the multi-step wizard.
      if (meta.id === "avatars") {
        stuffModeAvatarWizard = true;
        if (!avatarWizard) avatarWizard = newAvatarWizardDraft(null);
      }
      body = stuffUploadForm(meta);
    } else if ((stuffMode === "detail" || stuffMode === "edit") && stuffItemId) {
      body = stuffDetail(findStuff(stuffItemId));
    } else if (!items.length) {
      body = how + avatarExtra + '<div class="panel"><p class="meta">' + esc(meta.empty) + (all.length ? "" : " Your inventory starts empty.") + '</p></div>';
    } else {
      body = how + avatarExtra + '<div class="grid">' + items.map(card).join("") + '</div>';
    }
    return '<section class="page stuff-page"><div class="page-head"><div><h1>Stuff</h1><p class="meta">Your Stuff — what you already own (wiki Stuff tab).</p></div></div>'
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
    var rawCoins = (item.coins != null ? item.coins : item.price) || 0;
    var priceLabel = formatShopPrice(rawCoins, false);
    return '<div class="shop-detail">'
      + '<button type="button" class="text-btn" data-shop-back="1">← Back to Shop</button>'
      + '<div class="panel shop-detail-panel">'
      +   '<h2>' + esc(item.name || "Item") + '</h2>'
      +   '<p class="meta">' + esc(item.kind || itemCat(item)) + " · by " + esc(item.creator || "member") + '</p>'
      +   '<p class="price">' + esc(priceLabel) + ' <span class="meta">(display only · 10,000 coins ≈ 1 bar)</span></p>'
      +   '<div class="shop-detail-actions">'
      +     '<button type="button" class="action-btn fav-btn' + (isFav ? " is-on" : "") + '" data-shop-fav="' + esc(id) + '">' + (isFav ? "♥ Favorited" : "♡ Favorite") + '</button>'
      +     '<button type="button" class="action-btn" disabled title="Buy disabled — no payments; Bars are earn-only">Buy — disabled (no payments)</button>'
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
        + '<p class="shop-banner">Coins & Bars are play currency — no real-money purchases on Whirled2.</p></div></div>'
        + shopItemDetail(found) + '</section>';
    }
    var meta = catMeta(shopCat);
    var all = loadShop();
    var items = sortShopItems(filterByCat(all, shopCat), shopSort);
    var body;
    if (!all.length) {
      body = '<div class="panel"><p class="meta">No listings yet. List items from Stuff → List Item. Coins & Bars play currency — no invented catalog.</p></div>';
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
      + '<p class="shop-banner">Coins & Bars are play currency — no real-money purchases on Whirled2.</p>'
      + '<p class="meta">Browse popular selections, then pick a category. Purchases stay disabled (no payments; Bars are earn-only).</p></div></div>'
      + popular
      + '<div class="stuff-layout">' + catRail("shop", shopCat)
      + '<div class="stuff-main"><h2 class="stuff-cat-title">' + esc(meta.label) + '</h2>' + sortUi + body + '</div></div></section>';
  }
  function catalog(title, blurb, items) {
    return '<section class="page"><div class="page-head"><div><h1>' + esc(title) + '</h1><p>' + esc(blurb) + '</p></div></div><div class="grid">' + items.map(card).join('') + '</div></section>';
  }
  function genreRail(active) {
    // Purpose: left genre rail for Games browse (desktop).
    // How: buttons with data-game-genre filter whirled2.games by genre id.
    // Why: classic Stuff-style rail; empty list stays honest (no invented titles).
    return '<aside class="stuff-rail games-genre-rail" aria-label="Genres"><ul class="stuff-cats">'
      + '<li><button type="button" class="stuff-cat' + (active === "all" ? " is-on" : "") + '" data-game-genre="all">All</button></li>'
      + GAME_GENRES.map(function (c) {
          return '<li><button type="button" class="stuff-cat' + (c.id === active ? " is-on" : "") + '" data-game-genre="' + c.id + '">' + esc(c.label) + '</button></li>';
        }).join("")
      + '</ul></aside>';
  }
  function genreChips(active) {
    // Purpose: mobile-friendly genre chip row under Games home.
    // How: same data-game-genre filters as the rail; pills highlight active genre.
    // Why: rail hides on narrow screens — chips keep browsing usable on phones.
    return '<div class="genre-chips" role="group" aria-label="Genres">'
      + '<button type="button" class="sort-btn' + (active === "all" ? " is-on" : "") + '" data-game-genre="all">All</button>'
      + GAME_GENRES.map(function (c) {
          return '<button type="button" class="sort-btn' + (c.id === active ? " is-on" : "") + '" data-game-genre="' + c.id + '">' + esc(c.label) + '</button>';
        }).join("")
      + '</div>';
  }
  function gameCard(g) {
    // Purpose: one real catalog card from localStorage whirled2.games.
    // How: button data-game-open → detail page. Never used for Coming Soon stubs.
    // Why: only show member-saved / local games — never invent live titles.
    var id = g.id || g.name || "";
    var coins = (g.coins != null ? g.coins : g.price);
    var price = coins != null ? formatShopPrice(coins, false) : "free";
    return '<button type="button" class="card shop-card game-card" data-game-open="' + esc(id) + '">'
      + '<div class="swatch swatch-empty" aria-hidden="true"></div><div class="body"><h3>' + esc(g.name || "Game") + '</h3>'
      + '<p class="meta">' + esc(gameGenreLabel(gameGenreOf(g))) + " · " + esc(g.creator || "member") + '</p>'
      + '<div class="price">' + esc(String(price)) + '</div></div></button>';
  }
  function gameGenreLabel(id) {
    // Purpose: human label for a genre id (Action/Arcade, Puzzle, …).
    // How: look up GAME_GENRES; fallback "Other".
    for (var i = 0; i < GAME_GENRES.length; i++) if (GAME_GENRES[i].id === id) return GAME_GENRES[i].label;
    return "Other";
  }
  function gamesLobbyPage() {
    // Purpose: Tables lobby — local multiplayer table list + create form.
    // How: loadGameTables(); Join/Leave/Start are local stubs until parlor engine.
    // Why: parlor = separate screen. ENGINE DEV: Start does not mount #stage-slot yet.
    var tables = loadGameTables();
    var s = session();
    var meId = s && s.user ? s.user.id : "";
    var rows;
    if (!tables.length) {
      rows = '<div class="panel"><p class="meta">No tables awaiting players. Create a game below — local only for now.</p>'
        + '<p class="meta">Create / list from real parlor games is <b>Coming Soon</b> with the engine.</p></div>';
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
            : '<button type="button" class="action-btn" data-table-join="' + esc(t.id) + '"' + (n >= max ? " disabled" : "") + '>Join table</button>')
          + '</div></div>';
      }).join("") + '</div>';
    }
    return '<section class="page games-page">'
      + gamesHomeNavHtml("lobby")
      + '<div class="featured">Games awaiting players</div>'
      + '<p class="shop-banner">Multiplayer lobby shell — not a real Pixi game. Tables are local-only.</p>'
      + parlorAvrExplainerHtml()
      + '<div class="section-label">Tables</div>'
      + rows
      + '<div class="section-label">Create Game</div>'
      + '<div class="panel"><form id="create-table-form">'
      +   '<input name="name" maxlength="60" placeholder="Table name" required />'
      +   '<label class="meta">Max players <input name="max" type="number" min="2" max="8" value="4" /></label>'
      +   '<label class="meta"><input name="rated" type="checkbox" /> Rated</label>'
      +   '<button type="submit">Create Game</button>'
      + '</form>'
      + '<p class="meta">Listing a published parlor game in the catalog is <b>Coming Soon</b>.</p></div></section>';
  }
  function gameDetailPage(g) {
    // Purpose: detail for one real whirled2.games entry (Play / Watch / Tables / Comments).
    // How: tabs switch gameDetailTab; Play → lobby; Watch = spectator stub; Tables = join UI.
    // Why: polish without inventing trophies. ENGINE DEV: Play does not mount engine yet.
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
    var price = coins != null ? formatShopPrice(coins, false) : "free";
    var tabs = [["play", "Play"], ["watch", "Watch"], ["tables", "Tables"], ["comments", "Comments"]].map(function (t) {
      return '<button type="button" class="sort-btn' + (gameDetailTab === t[0] ? " is-on" : "") + '" data-game-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join("");
    var body;
    if (gameDetailTab === "watch") {
      body = '<div class="panel"><p class="meta">Spectator / Watch mode is a shell — <b>Coming Soon</b> with the parlor engine. No live streams are invented.</p></div>';
    } else if (gameDetailTab === "tables") {
      var tables = loadGameTables().filter(function (t) {
        return !t.gameId || t.gameId === id || t.gameName === (g.name || "");
      });
      if (!tables.length) {
        body = '<div class="panel"><p class="meta">No open tables for this game. Open <b>Tables</b> to create one (local stub).</p>'
          + '<button type="button" class="action-btn" data-games-lobby="1">Open Tables lobby</button></div>';
      } else {
        body = '<div class="game-table-list">' + tables.map(function (t) {
          var n = (t.players || []).length;
          var max = Number(t.maxPlayers) || 4;
          return '<div class="game-table-row">'
            + '<div><h3>' + esc(t.name || "Table") + '</h3>'
            + '<p class="meta">' + n + '/' + max + ' players · Host: ' + esc(t.hostName || "member") + '</p></div>'
            + '<div class="game-table-actions">'
            + '<button type="button" class="action-btn" data-table-join="' + esc(t.id) + '"' + (n >= max ? " disabled" : "") + '>Join table</button>'
            + '</div></div>';
        }).join("") + '</div>';
      }
    } else if (gameDetailTab === "comments") {
      body = '<div class="panel"><div class="comment-list">' + commentRows + '</div>'
        + '<form id="game-comment-form" data-game-comment="' + esc(id) + '">'
        + '<textarea name="text" maxlength="400" rows="3" placeholder="Post a comment…" required></textarea>'
        + '<button type="submit">Post Comment</button></form></div>';
    } else {
      body = '<div class="panel">'
        + '<p class="meta">Open the multiplayer lobby to create or join a table. This is a shell — not a Pixi game.</p>'
        + '<p class="meta">Trophies / Passport play stamps: <b>Coming Soon</b>.</p>'
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
      +     '<div class="shop-sort game-detail-tabs" role="tablist">' + tabs + '</div>'
      +     body
      +   '</div></div></section>';
  }
  function gamesBrowsePage() {
    // Purpose: Games home — Browse catalog from whirled2.games only + honest empty state.
    // How: genre filter; favorites; Coming Soon placeholders (not fake catalog); explainers.
    // Why: never invent live titles. ENGINE DEV: parlor mount stays out of #stage-slot for now.
    var all = loadGames();
    var filtered = gameGenre === "all" ? all.slice() : all.filter(function (g) { return gameGenreOf(g) === gameGenre; });
    var favIds = loadGameFavorites();
    var favGames = all.filter(function (g) { return favIds.indexOf(g.id || g.name) >= 0; });
    var listBody;
    if (filtered.length) {
      listBody = '<div class="grid">' + filtered.map(gameCard).join("") + '</div>';
    } else if (!all.length) {
      listBody = '<div class="games-empty-state">'
        + '<h3>No games in your catalog yet</h3>'
        + '<p class="meta">Games come from localStorage <code>whirled2.games</code> only — nothing is invented.</p>'
        + '<div class="section-label">How games work</div>'
        + '<ul>'
        +   '<li><b>Parlor</b> — play on a <b>separate screen</b> (Tables lobby). Create/list is Coming Soon with the engine.</li>'
        +   '<li><b>AVR</b> — play as an <b>in-room overlay</b> while you hang out (Coming Soon).</li>'
        + '</ul></div>'
        + parlorAvrExplainerHtml()
        + '<div class="section-label">Coming Soon (placeholders — not live catalog)</div>'
        + gamesSoonCardsHtml();
    } else {
      listBody = '<div class="panel"><p class="meta">No games in this genre yet. Try All, or add entries under <code>whirled2.games</code>.</p></div>';
    }
    var favBody = favGames.length
      ? '<div class="grid tight">' + favGames.map(gameCard).join("") + '</div>'
      : '<p class="meta">No favorites yet.</p>';
    return '<section class="page games-page">'
      + gamesHomeNavHtml("browse")
      + '<div class="page-head"><div><h1>Games</h1>'
      + '<p class="shop-banner">Browse local catalog · Tables for parlor · AVR Coming Soon. Coins from games are play currency.</p></div></div>'
      + parlorAvrExplainerHtml()
      + '<div class="stuff-layout">' + genreRail(gameGenre)
      + '<div class="stuff-main">'
      +   genreChips(gameGenre)
      +   (all.length ? ('<div class="section-label">Coming Soon placeholders</div>' + gamesSoonCardsHtml()) : '')
      +   '<div class="section-label">My favorites</div>'
      +   '<div class="panel">' + favBody + '</div>'
      +   '<div class="section-label">Games</div>'
      +   listBody
      + '</div></div></section>';
  }
  function gamesPage() {
    // Purpose: Games tab router (browse / lobby / scores / avr / detail).
    // How: gamesMode picks which page HTML to return into #main.
    // Why: keep home nav consistent. ENGINE DEV: none of these mount #stage-slot.
    if (gamesMode === "lobby") return gamesLobbyPage();
    if (gamesMode === "scores") return gamesScoresPage();
    if (gamesMode === "avr") return gamesAvrPage();
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
  function roomOccupantChipsHtml(limit) {
    // How this works: show up to N real occupant names on lobby tiles / preview (never invent people).
    limit = limit || 3;
    var list = (liveOccupants || []).slice();
    if (!list.length && session() && session().user) {
      list = [{ id: session().user.id, name: session().user.name || "You", you: true }];
    }
    if (!list.length) return '<span class="meta room-occ-chips-empty">No one here yet</span>';
    var shown = list.slice(0, limit);
    var extra = list.length - shown.length;
    var chips = shown.map(function (p) {
      return '<span class="room-occ-chip' + (p.you ? " is-you" : "") + '">' + esc(displayNameForOccupant(p)) + '</span>';
    }).join("");
    if (extra > 0) chips += '<span class="room-occ-chip is-more">+' + extra + '</span>';
    return '<div class="room-occ-chips" aria-label="People in room">' + chips + '</div>';
  }
  function roomLockGlyphHtml(modeOrRoomId) {
    // How this works: lock glyph for lobby tiles / preview; pass mode string or room id.
    var mode = "unlocked";
    if (modeOrRoomId === "unlocked" || modeOrRoomId === "friends" || modeOrRoomId === "locked") {
      mode = modeOrRoomId;
    } else if (modeOrRoomId) {
      mode = (loadRoomLock(modeOrRoomId).mode || "unlocked");
    } else {
      mode = (loadRoomLock(currentRoomId || "loft").mode || "unlocked");
    }
    if (mode === "friends") return '<span class="room-lock-glyph" title="Friends only">👥</span>';
    if (mode === "locked") return '<span class="room-lock-glyph" title="Locked">🔒</span>';
    return '<span class="room-lock-glyph" title="Unlocked">🔓</span>';
  }
  function roomTile(opts) {
    // How this works: lobby tiles open a PREVIEW sheet (data-room-preview) — not instant enter.
    // Beginner: first click = peek (name/owner/lock/people); Enter inside the sheet actually joins.
    // ENGINE DEV: do not set inRoom here; preview is chrome-only before #stage-slot exists.
    opts = opts || {};
    var online = opts.online != null ? opts.online : 0;
    var enter = opts.enterable !== false;
    var rating = opts.rating || "Rating: new";
    var rid = opts.id || "loft";
    var lockMode = opts.lockMode || (loadRoomLock(rid).mode || "unlocked");
    var tag = enter ? "button" : "div";
    var attrs = enter
      ? (' type="button" class="room-tile" data-room-preview="' + esc(rid) + '"')
      : ' class="room-tile is-empty"';
    var chips = (enter && rid === "loft") ? roomOccupantChipsHtml(3) : (enter ? "" : "");
    return '<' + tag + attrs + '>'
      + '<div class="thumb room-thumb-ph" aria-hidden="true"></div>'
      + '<div class="body"><h3>' + roomLockGlyphHtml(lockMode) + ' ' + esc(opts.name || ROOM) + '</h3>'
      +   '<p class="meta">' + esc(opts.meta || "") + '</p>'
      +   '<div class="room-rating">' + esc(rating) + '</div>'
      +   '<div class="online">' + (online > 0 ? (online + " online now!") : "0 players") + '</div>'
      +   chips
      +   (enter ? '<span class="enter-label">Preview</span>' : '<span class="meta">—</span>')
      + '</div></' + tag + '>';
  }
  function closeRoomPreview() {
    // How this works: Cancel / backdrop — stay in lobby, never touched inRoom.
    roomPreviewOpen = false;
    roomPreviewId = null;
    try {
      var el = document.getElementById("room-preview-panel");
      if (el) el.remove();
    } catch (e) {}
  }
  function roomPreviewHtml(roomId) {
    // How this works: pre-enter sheet — name, owner, lock, rating, occupant chips, optional now-playing.
    roomId = roomId || "loft";
    var me = you();
    var room = getRoom(roomId) || { id: roomId, name: ROOM, ownerId: "", blurb: "" };
    var lock = loadRoomLock(roomId);
    var mode = (lock && lock.mode) || "unlocked";
    var lockLabel = mode === "friends" ? "Friends only" : (mode === "locked" ? "Locked" : "Unlocked");
    var online = (roomId === "loft")
      ? ((liveOccupants || []).length || (session() ? 1 : 0))
      : (session() ? 1 : 0);
    var ownerName = me.name;
    try {
      if (room.ownerId && session() && String(room.ownerId) === String(session().user.id)) ownerName = me.name;
      else if (room.ownerId) {
        var users = [];
        try { users = JSON.parse(localStorage.getItem("whirled2.users") || "[]"); } catch (eU) {}
        var hit = users.filter(function (u) { return u && String(u.id) === String(room.ownerId); })[0];
        if (hit && hit.name) ownerName = hit.name;
      }
    } catch (eO) {}
    var pl = loadPlaylist();
    var nowPlaying = "";
    if (roomId === "loft" && pl && pl.embedSrc && (pl.source === "youtube" || pl.source === "spotify")) {
      nowPlaying = '<p class="meta room-preview-music">♪ Now playing: <b>' + esc(pl.embedTitle || pl.source) + '</b></p>';
    } else if (roomId === "loft" && pl && pl.source === "local" && pl.tracks && pl.tracks[pl.current]) {
      nowPlaying = '<p class="meta room-preview-music">♪ Queue: <b>' + esc(pl.tracks[pl.current].name || "Track") + '</b></p>';
    }
    var syncNote = roomId === "loft"
      ? (isWhirledApiLive()
        ? '<p class="meta">Shared soundtrack sync is on (demo server).</p>'
        : '<p class="meta">Shared soundtrack syncs when the demo server is running; Pages alone is local-only.</p>')
      : '<p class="meta">Per-room soundtrack sync comes later — chrome uses the shared loft music dock for now.</p>';
    var rating = roomId === "loft" ? loftRatingLabel() : "Rating: new";
    var people = roomId === "loft" ? roomOccupantChipsHtml(8) : '<p class="meta">Occupants list for new rooms arrives with presence sync.</p>';
    return ''
      + '<div class="room-preview-modal" id="room-preview-panel" data-room-preview-backdrop="1" role="dialog" aria-modal="true" aria-label="Room preview">'
      +   '<div class="room-preview-card panel" data-room-preview-card="1">'
      +     '<div class="room-side-head"><h2>Room preview</h2>'
      +       '<button type="button" class="text-btn" data-room-preview-close="1">Cancel</button></div>'
      +     '<div class="room-preview-thumb" aria-hidden="true"></div>'
      +     '<h3 class="room-preview-name">' + roomLockGlyphHtml(mode) + ' ' + esc(room.name || ROOM) + '</h3>'
      +     '<p class="meta">owner: <b>' + esc(ownerName) + '</b>' + (room.blurb ? (" · " + esc(room.blurb)) : (roomId === "loft" ? " · home whirled" : "")) + '</p>'
      +     '<p class="meta">Lock: <b>' + esc(lockLabel) + '</b> · ' + esc(rating) + ' · ' + online + ' online</p>'
      +     '<div class="section-label">People here</div>'
      +     people
      +     nowPlaying
      +     syncNote
      +     '<p class="meta">' + (roomId === "loft"
          ? "Everyone in this loft hears the same loop (synced) after you enter (when sync is available)."
          : "Enter to open this room stage (same #stage-slot mount).") + '</p>'
      +     '<div class="room-preview-actions">'
      +       '<button type="button" class="action-btn room-preview-enter-btn" data-room-preview-enter="' + esc(roomId) + '">Enter</button>'
      +       '<button type="button" class="text-btn" data-room-preview-close="1">Cancel</button>'
      +     '</div>'
      +   '</div></div>';
  }
  function ensureRoomPreviewPanel() {
    var app = document.getElementById("app");
    var existing = document.getElementById("room-preview-panel");
    if (!app || !roomPreviewOpen || inRoom || !session()) {
      if (existing) existing.remove();
      return null;
    }
    var html = roomPreviewHtml(roomPreviewId || "loft");
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    var next = wrap.firstChild;
    if (!next) return null;
    if (existing && existing.parentNode) existing.parentNode.replaceChild(next, existing);
    else app.appendChild(next);
    return document.getElementById("room-preview-panel");
  }
  function openRoomPreview(roomId) {
    // How this works: lobby / recent-room click → preview only (inRoom stays false).
    // Beginner: you peek first; Enter in the sheet is the real join.
    if (!session()) return;
    if (inRoom) return;
    roomPreviewId = roomId || "loft";
    roomPreviewOpen = true;
    try { loadOccupants(); } catch (e) {}
    ensureRoomPreviewPanel();
  }
  function showEnterCurtain(roomName, thenFn) {
    // How this works: optional soft curtain before mounting the loft stage.
    // Beginner: short “Entering…” flash — not a fake loading bar.
    // ENGINE DEV: chrome overlay only; future engine can hook onRoomEnter after curtain clears.
    try {
      var old = document.getElementById("room-enter-curtain");
      if (old) old.remove();
    } catch (e0) {}
    var el = document.createElement("div");
    el.id = "room-enter-curtain";
    el.className = "room-enter-curtain";
    el.setAttribute("role", "status");
    el.innerHTML = '<div class="room-enter-curtain-card"><p>Entering <b>' + esc(roomName || ROOM) + '</b>…</p></div>';
    (document.getElementById("app") || document.body).appendChild(el);
    if (roomEnterCurtainTimer) {
      try { clearTimeout(roomEnterCurtainTimer); } catch (e1) {}
    }
    roomEnterCurtainTimer = setTimeout(function () {
      roomEnterCurtainTimer = null;
      try {
        var c = document.getElementById("room-enter-curtain");
        if (c) c.remove();
      } catch (e2) {}
      if (typeof thenFn === "function") thenFn();
    }, 420);
  }
  function confirmEnterFromPreview(roomId) {
    // How this works: preview Enter → soft curtain → tryEnterRoom → paint roomView.
    roomId = roomId || "loft";
    var r = getRoom(roomId);
    var nm = (r && r.name) || ROOM;
    closeRoomPreview();
    showEnterCurtain(nm, function () {
      if (!tryEnterRoom(roomId)) {
        paint("rooms");
        return;
      }
      beginRoomChatVisit(roomId);
      loftVisitOccupants = [];
      paint("rooms");
      loadOccupants();
      try { pollSharedRoomMusic(); } catch (eM) {}
      try { awardAction("enterRoom"); } catch (e) {}
    });
  }
  function roomsLobby() {
    // How this works (20260906af): Featured = Studio Loft seed; My Rooms = rooms you own + Create.
    // Beginner: never invent Hot New catalog rows — empty until a shared server publishes.
    var me = you();
    var sid = session() && session().user && session().user.id;
    var online = liveOccupants.length || 0;
    var loft = getRoom("loft") || defaultLoftRoom();
    var featured = roomTile({
      id: "loft",
      name: loft.name || ROOM,
      meta: "owner: " + me.name + " · home",
      online: online || (session() ? 1 : 0),
      rating: loftRatingLabel(),
      enterable: true,
      lockMode: (loft.lock && loft.lock.mode) || "unlocked"
    });
    var activeBody = online > 0
      ? roomTile({
          id: "loft",
          name: loft.name || ROOM,
          meta: "owner: " + me.name + " · active",
          online: online,
          rating: loftRatingLabel(),
          enterable: true,
          lockMode: (loft.lock && loft.lock.mode) || "unlocked"
        })
      : '<div class="panel"><p class="meta">No active rooms right now. Enter Studio Loft to open one.</p></div>';
    var tips = [
      "Me — profile, friends, mail, passport, and account live under the Me tab.",
      "Stuff — your inventory by category. Empty shelves stay empty until you own items.",
      "Rooms — Create Room from My Rooms (first free; later 10k coins or 1 bar).",
      "Mail — send notes to friends from profiles or the Mail sub-tab."
    ];
    var tip = tips[tourTip % tips.length];
    var createBlock = createRoomOpen
      ? createRoomPanelHtml({ closeable: true })
      : '<div class="rooms-lobby-links">'
        +   '<button type="button" class="action-btn" data-create-room-open="1">Create Room…</button>'
        +   '<button type="button" class="action-btn" data-tour-tip="1">Take the Whirled Tour</button>'
        + '</div>';
    return '<section class="page rooms-lobby">'
      + '<div class="featured">Featured Rooms</div>'
      + '<p class="lobby-blurb">Rooms are where you create your space and show it off. Tap a room tile to <b>preview</b> who is there, then Enter — engine mounts inside the room.</p>'
      + recentRoomsStripHtml()
      + '<div class="room-tiles">' + featured + '</div>'
      + '<div class="section-label">Active Rooms</div>'
      + (online > 0 ? '<div class="room-tiles">' + activeBody + '</div>' : activeBody)
      + '<div class="section-label">Hot New Rooms</div>'
      + '<div class="panel"><p class="meta">No hot new rooms yet. Public listings arrive when the shared server publishes them — we never invent catalog rooms.</p></div>'
      + '<div class="section-label">My Rooms</div>'
      + myRoomsTilesHtml(sid, { includeLoftFallback: true })
      + createBlock
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
    // How this works (?v=20260906at): chips show green door badge when doorTo is set.
    // Beginner: decorate mode = drag/select; outside = only doors capture clicks (travel).
    var x = Number(it.x) || 40;
    var y = Number(it.y) || 40;
    var isDoor = !!(it.doorTo);
    var selected = decorateMode && selectedDecId && selectedDecId === it.id;
    var thumb = it.thumb
      ? '<img src="' + it.thumb + '" alt="" />'
      : '<span class="dec-chip-label">' + esc((it.name || "?").slice(0, 12)) + '</span>';
    var title = it.name || "item";
    if (isDoor) title = (it.doorLabel || title) + " — door → " + (it.doorLabel || it.doorTo);
    var cls = "decorate-chip"
      + (isDoor ? " is-door" : "")
      + (selected ? " is-selected" : "")
      + (doorGlowPreview && isDoor ? " is-glowing" : "");
    return '<div class="' + cls + '" data-dec-id="' + esc(it.id) + '"'
      + (isDoor ? (' data-door-to="' + esc(it.doorTo) + '"') : "")
      + ' style="left:' + x + 'px;top:' + y + 'px" title="' + esc(title) + '" role="button" tabindex="0">'
      + thumb
      + (isDoor ? '<span class="dec-door-badge" aria-hidden="true" title="Door">🚪</span>' : "")
      + (decorateMode
        ? '<button type="button" class="dec-chip-x" data-dec-remove="' + esc(it.id) + '" title="Take from room">×</button>'
        : "")
      + '</div>';
  }
  function decorateLayerHtml() {
    // How this works: empty → aria-hidden; doors get has-doors so travel clicks work without decorate.
    var layout = loadRoomLayout();
    var hasDoors = (layout.items || []).some(function (it) { return it && it.doorTo; });
    if (!layout.items.length && !decorateMode) return '<div id="decorate-layer" class="decorate-layer" aria-hidden="true"></div>';
    var cls = "decorate-layer"
      + (decorateMode ? " is-active" : "")
      + (hasDoors && !decorateMode ? " has-doors" : "")
      + (doorGlowPreview ? " show-door-glow" : "");
    return '<div id="decorate-layer" class="' + cls + '" aria-label="Room decorations">'
      + layout.items.map(decorateChipHtml).join("")
      + '</div>';
  }

  // How this works: Room menu → View items lists decorate-layer chips + playlist track names (local data).
  // ENGINE DEV: chrome overlay only; not #stage-slot contents.
  function roomItemsPanel() {
    var layout = loadRoomLayout();
    var placed = layout.items || [];
    var pl = loadPlaylist();
    var tracks = (pl && pl.tracks) ? pl.tracks : [];
    var placedRows = placed.length
      ? '<ul class="room-items-list">' + placed.map(function (it) {
          var usage = it.doorTo ? ("doorway → " + (it.doorLabel || it.doorTo)) : "furniture";
          return '<li><span class="room-item-chip">' + esc(it.name || "Item") + '</span> <span class="meta">' + esc(usage) + ' · (' + Math.round(it.x || 0) + ',' + Math.round(it.y || 0) + ')</span></li>';
        }).join("") + '</ul>'
      : '<p class="meta">No decorate items placed yet.</p>';
    var trackRows = tracks.length
      ? '<ul class="room-items-list">' + tracks.map(function (t, i) {
          var nm = (t && (t.name || t.title)) || ("Track " + (i + 1));
          return '<li>♪ ' + esc(nm) + '</li>';
        }).join("") + '</ul>'
      : '<p class="meta">Playlist empty — add Music from Stuff.</p>';
    return '<div class="room-side-panel room-items-panel" id="room-items-panel">'
      + '<div class="panel">'
      +   '<div class="room-side-head"><h2>Room View items</h2>'
      +     '<button type="button" class="text-btn" data-room-items-close="1">Close</button></div>'
      +   '<p class="meta">Decorate-layer chips and playlist tracks from local data (no invented catalog).</p>'
      +   '<div class="section-label">Decorate items</div>' + placedRows
      +   '<div class="section-label">Playlist</div>' + trackRows
      + '</div></div>';
  }
  function decoratePanel() {
    // How this works (?v=20260906at): inventory + placed list + Make Door on selected chip.
    try { ensureDoorStubFurniture(); } catch (eStub) {}
    var inv = decorateInventory();
    var layout = loadRoomLayout();
    var placed = layout.items || [];
    var ridKey = roomLayoutStorageKey(currentRoomId || "loft");
    var invRows = inv.length
      ? inv.map(function (it) {
          var thumb = it.thumb ? '<img class="dec-inv-thumb" src="' + it.thumb + '" alt="" />' : '<span class="dec-inv-swatch"></span>';
          return '<div class="dec-inv-row">'
            + thumb
            + '<div class="dec-inv-meta"><b>' + esc(it.name || "Item") + '</b><span class="meta">' + esc(itemCat(it)) + '</span></div>'
            + '<button type="button" class="action-btn" data-dec-add="' + esc(it.id) + '">Add to room</button>'
            + '</div>';
        }).join("")
      : '<p class="meta">No furniture yet — a Doorframe stub will appear after refresh, or upload images.</p>';
    var placedRows = placed.length
      ? '<ul class="dec-placed-list">' + placed.map(function (it) {
          var doorNote = it.doorTo ? (' <span class="door-tag" title="Door">🚪 ' + esc(it.doorLabel || it.doorTo) + '</span>') : "";
          var sel = (selectedDecId === it.id) ? " is-selected" : "";
          return '<li class="dec-placed-row' + sel + '">'
            + '<button type="button" class="text-btn dec-select-btn" data-dec-select="' + esc(it.id) + '"><b>' + esc(it.name || "Item") + '</b></button>'
            + ' <span class="meta">(' + Math.round(it.x || 0) + ',' + Math.round(it.y || 0) + ')</span>'
            + doorNote
            + ' <button type="button" class="text-btn" data-dec-remove="' + esc(it.id) + '">Take</button>'
            + (it.doorTo
              ? (' <button type="button" class="text-btn" data-drop-door="' + esc(it.id) + '">Drop Door</button>')
              : (' <button type="button" class="text-btn" data-dec-select="' + esc(it.id) + '" data-open-make-door="1">Make Door…</button>'))
            + '</li>';
        }).join("") + '</ul>'
      : '<p class="meta">Nothing placed yet — Add to room, then Make Door.</p>';
    var selHint = selectedDecId
      ? '<p class="meta dec-sel-hint">Selected chip ready — open <b>Make Door</b> to create/link a room.</p>'
        + '<button type="button" class="action-btn" data-open-make-door="1">Make Door…</button>'
      : '<p class="meta">Tip: tap a chip on the stage (or a name below) to select it for Make Door.</p>';
    return '<div class="room-side-panel decorate-panel" id="decorate-panel">'
      + '<div class="panel">'
      +   '<div class="room-side-head"><h2>Decorate Room</h2>'
      +     '<button type="button" class="text-btn" data-decorate-close="1">Close</button></div>'
      +   '<p class="meta">Wiki Furniture — drag chips. Select → <b>Make Door</b> (create/link rooms). ENGINE DEV: layer sibling of #stage-slot.</p>'
      +   selHint
      +   '<div class="section-label">Your Stuff</div>'
      +   '<div class="dec-inv-list">' + invRows + '</div>'
      +   '<div class="section-label">View items (layout)</div>'
      +   placedRows
      +   '<div class="stuff-detail-actions">'
      +     '<button type="button" class="action-btn" data-dec-save="1">Save layout</button>'
      +     '<button type="button" class="text-btn" data-door-glow-toggle="1">' + (doorGlowPreview ? "Hide" : "Show") + ' door glow</button>'
      +   '</div>'
      +   '<p class="meta">Saved to <code>' + esc(ridKey) + '</code>.</p>'
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
      +   (mine ? (function () {
            var friends = loadFriends();
            if (!friends.length) return '<p class="meta">Add friends to invite them to this party (local).</p>';
            var rows = friends.slice(0, 12).map(function (f) {
              var already = (mine.members || []).some(function (m) { return String(m.id) === String(f.id); });
              var invited = (mine.invites || []).some(function (m) { return String(m.id) === String(f.id); });
              var act = already
                ? '<span class="meta">In party</span>'
                : (invited
                  ? '<span class="meta">Invited</span>'
                  : '<button type="button" class="action-btn" data-party-invite="' + esc(f.id) + '" data-party-invite-name="' + esc(f.name) + '">Invite</button>');
              return '<div class="party-invite-row"><b>' + esc(f.name) + '</b> ' + act + '</div>';
            }).join("");
            return '<div class="section-label">Invite friends</div><div class="party-invite-list">' + rows + '</div>'
              + '<p class="meta">Local invites — multi-account Accept later. Follow-the-leader is meta until shared server.</p>';
          })() : '')
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
      +   '<p>Features are <b>prototypes</b> and subject to change. <b>Coins &amp; Bars</b> are play currency (earn-only Bars) — no live payments on this mock.</p>'
      + '</div></section>';
  }

  function avatarGuidePage() {
    // Beginner in-site docs — mirrors AVATAR-CREATOR-GUIDE.md
    return '<section class="page help-page avatar-guide-page"><div class="page-head"><div><h1>How to make an avatar</h1>'
      + '<p>Plain-English creator guide for Whirled2 Stuff packs.</p></div>'
      + '<button type="button" class="text-btn" data-avatar-guide-close="1">Close</button></div>'
      + '<div class="panel"><h2>What you need</h2>'
      + '<ul class="help-tips">'
      + '<li><b>Idle</b> — calm standing loop (arms down). 1–4 frames is fine.</li>'
      + '<li><b>Walk</b> — 4–8 frames of a walk cycle (optional but recommended).</li>'
      + '<li><b>Emotes</b> — wave, sit, pose, happy, dance (optional). Click the avatar in the loft to play them.</li>'
      + '<li><b>Size</b> — classic loft feel ~64–128px wide, transparent PNG/WebP. Keep each frame under ~200KB.</li>'
      + '<li><b>Facing</b> — draw facing left <i>or</i> right, then set Art faces in the wizard so walk flip looks right.</li>'
      + '</ul></div>'
      + '<div class="panel"><h2>Tool paths (pick any)</h2>'
      + '<ul class="help-tips">'
      + '<li><b>Aseprite</b> — animate tags per state → Export PNG sequence (or sprite sheet then slice). Attach the .aseprite in the wizard for safekeeping; loft uses PNGs.</li>'
      + '<li><b>Photoshop / Pixelora / Piskel</b> — export frame PNGs into folders named idle, walk, wave…</li>'
      + '<li><b>Flash / Animate</b> — Publish <code>.swf</code> and upload via <b>Classic Flash / Whirled avatars</b> (Experimental Ruffle), <b>and/or</b> export PNG sequences for loft walk (recommended hybrid).</li>'
      + '<li><b>Zip pack</b> — zip folders <code>idle/</code> <code>walk/</code> <code>wave/</code> and upload the zip in the wizard.</li>'
      + '</ul></div>'
      + '<div class="panel"><h2>Wizard steps</h2>'
      + '<ol class="help-tips">'
      + '<li>Stuff → Avatars → <b>Upload avatar wizard</b>.</li>'
      + '<li>Add files (multi-select, folder, or zip).</li>'
      + '<li>Name + pick thumb + art facing.</li>'
      + '<li>Map frames to states (dropdown per frame). Set FPS.</li>'
      + '<li>Preview idle/walk/emote → copyright check → Save.</li>'
      + '<li>Open the card → <b>Wear</b> → Rooms → floor click walks, avatar click emotes.</li>'
      + '<li><b>Remap states…</b> anytime from the item detail.</li>'
      + '</ol></div>'
      + '<div class="panel" id="classic-flash-guide"><h2>Using old Whirled / Flash avatars</h2>'
      + '<ul class="help-tips">'
      + '<li><b>Upload</b> — Stuff → Avatars → <b>Classic Flash / Whirled avatars</b> panel. Accepts <code>.swf</code>, <code>.fla</code> (archive only), or zip with swf+thumb.</li>'
      + '<li><b>Analyze</b> — shows size + Flash header (FWS/CWS/ZWS). We cannot parse AvatarControl states in JS — honest limits.</li>'
      + '<li><b>Paths</b> — (a) Ruffle play-as-is Experimental, (b) attach PNG idle/walk, (c) hybrid both.</li>'
      + '<li><b>Wear</b> — no obscure flag required for your uploads; look for the Experimental badge. Loft: Ruffle if opted in, else PNG, else tofu.</li>'
      + '<li><b>FLA</b> — source only; publish SWF from Animate. Sketch extracts in fla-lab are Coming Soon reference.</li>'
      + '<li><b>ENGINE DEV</b> — Ruffle on <code>#avatar-ruffle-host</code> (chrome). Pixi keeps <code>#stage-slot</code>. Host shim later — no AGPL copy.</li>'
      + '</ul></div>'
      + '<div class="panel"><h2>Troubleshooting</h2>'
      + '<ul class="help-tips">'
      + '<li><b>Invisible in loft</b> — relative paths 404; wizard stores data URLs. Re-Wear after remap. Whirl uses absolutized <code>./assets/…</code> paths.</li>'
      + '<li><b>Constant waving</b> — idle mapped to wave art. Remap idle to calm frames; wave is an emote.</li>'
      + '<li><b>Walking backwards</b> — wrong Art faces setting; flip left/right in Remap / wizard step 2.</li>'
      + '<li><b>Save failed</b> — too many/large frames for browser storage; shrink PNGs.</li>'
      + '<li><b>.fla alone</b> — cannot play in browser. Publish SWF and/or export PNGs (see FLA-TEST-AVATAR.md).</li>'
      + '</ul>'
      + '<p class="meta">ENGINE DEV: pack <code>states</code> schema matches Whirl for Pixi. Bridge: <code>getWornAvatar</code>, <code>playAvatarEmote</code>, <code>artFaces</code>.</p>'
      + '</div></section>';
  }

  function helpPage() {
    return '<section class="page help-page"><div class="page-head"><div><h1>Help</h1>'
      + '<p>Starting Out — Whirled2 chrome tips.</p></div>'
      + '<button type="button" class="text-btn" data-help-close="1">Close Help</button></div>'
      + '<div class="panel"><h2>Starting Out</h2>'
      + '<ul class="help-tips">'
      + '<li><b>Me</b> — profile, friends, mail, passport stamps, account (permaname), Transactions (Coins &amp; Bars).</li>'
      + '<li><b>Sign-in</b> — username / password works everywhere. <b>Create account with Discord</b> works on the demo server / phone tunnel (not GitHub Pages — no secrets on a static host). Google Coming Soon. Facebook Connect removed.</li>'
      + '<li><b>Rooms</b> — tap a lobby tile to <b>preview</b> then Enter; <b>Create Room</b> from My Rooms (first free; later 10k coins or 1 bar). Phone landscape = immersive stage + corner chat.</li>'
      + '<li><b>Stuff upload</b> — furniture/media with Upload…; <b>Music</b> accepts MP3/WAV/OGG (copyright checkbox required). List Item copies into Shop.</li>'
      + '<li><b>Avatars</b> — Stuff → Avatars → <b>Upload avatar wizard</b> (PNG sequences, folders, zip, .aseprite). Wear → click floor to walk → click avatar for emotes. <button type="button" class="text-btn" data-avatar-guide-open="1">How to make an avatar</button></li>'
      + '<li><b>Room music</b> — ♪ Music / Room menu → View room music. Owner pastes a YouTube/Spotify link → <b>Set embed</b> → <b>Done</b>. <b>Everyone in this loft hears the same loop (synced)</b> when the demo server is running; Pages alone is local-only. Closing the sheet does <b>not</b> stop playback. On phones use <b>Open player</b> if the embed is hard to tap.</li>'
      + '<li><b>Themes</b> — Me → Themes for browser CSS presets; group managers get Edit Whirled theme shell (Coming Soon).</li>'
      + '<li><b>Profile look</b> — Me → My Profile → presets publish instantly; <b>Upload custom background</b> (image behind everything) or Edit look for font/corners/modules/banner.</li>'
      + '<li><b>Ctrl+K</b> — command palette to jump Me / Mail / Rooms / … Press <b>?</b> for shortcuts.</li>'
      + '<li><b>Mail</b> — header count; compose from Me → Mail or profiles.</li>'
      + '<li><b>Groups</b> — local clubs with discussion + Enter hall (lobby meta).</li>'
      + '<li><b>Games</b> — Browse / Tables / AVR Coming Soon / My scores. Catalog from <code>whirled2.games</code> only; Coming Soon cards are labeled stubs — never invented live titles.</li>'
      + '<li><b>Coins &amp; Bars</b> — classic dual currency. Daily login streak earns coins; Bars from streak milestones / weekly (earn-only). Buy stays disabled — no payments / no Buy Bars.</li>'
      + '<li><b>Transactions</b> — Me → Transactions (or click header balances / Ctrl+K). Filter All / Coins / Bars. Bling cash-out Coming Soon.</li>'
      + '<li><b>Parties</b> — toolbar party board: create/join/leave locally; follow-leader later on a shared server.</li>'
      + '<li><b>Decorate</b> — place Stuff furniture/backdrops/toys/images as chips; Save to room layout.</li>'
      + '</ul></div>'
      + '<div class="panel"><h2>Concept &amp; Status (spirit)</h2>'
      + '<p class="meta">Whirled = social network + virtual world. Tabs: Me, Stuff, Games, Rooms, Groups, Shop. Pale blue classic chrome — no gold/purple. Engine mounts only in <code>#stage-slot</code> via <code>window.WhirledChrome</code>. No fake NPCs or invented catalog. No private engine in this mock.</p>'
      + '<p class="meta">This pass: Stuff sprite avatars + Wear billboard (see STUFF-AVATARS.md). SWF lab On hold (<code>?avatarLab=1</code>). Cache <code>?v=20260906ax</code>. Press <b>?</b> or <b>Ctrl+K</b>.</p>'
      + '<p class="meta"><b>Club</b> — Me → Club shows Free / Supporter / Creator / Studio tier cards (Coming Soon, no payments). See <code>MEMBERSHIP.md</code>.</p>'
      + '<p class="meta"><button type="button" class="text-btn" data-legal-open="1">Legal / Disclaimer</button> — copyright uploads; not affiliated with whirled.club.</p>'
      + '<p class="meta">Live docs: CONCEPT.md / STATUS.md / DEV-NOTES.md / <button type="button" class="text-btn" data-dev-hub-open="1">Developers</button> — no external secrets.</p>'
      + '</div></section>';
  }

  // ---------------------------------------------------------------------------
  // Developer Information Hub (?v=20260906au)
  // Beginner: in-site index of chrome/engine docs — pale-blue cards with plain-English
  // summaries + links to full .md files. Open via Help → Developers, header Developers,
  // #dev / #docs, or ?page=dev. ENGINE DEV: chrome-only — never mounts Pixi / #stage-slot.
  // ---------------------------------------------------------------------------
  function devHubDocUrl(name) {
    // How this works: same-folder relative .md for local/static hosts.
    return "./" + name;
  }
  function devHubCard(title, anchor, summary, mdFile, engineNote) {
    // Beginner: one pale-blue card = one topic. Summary stays short; mdFile is the deep dive.
    return '<article class="dev-hub-card panel" id="' + esc(anchor) + '">'
      + '<h2>' + title + '</h2>'
      + '<p>' + summary + '</p>'
      + (engineNote ? ('<p class="meta engine-note"><b>ENGINE DEV:</b> ' + engineNote + '</p>') : '')
      + '<p class="meta"><a href="' + esc(devHubDocUrl(mdFile)) + '" target="_blank" rel="noopener">' + esc(mdFile) + '</a>'
      + ' · <a href="https://github.com/whirledclassic/whirled2/blob/main/whirled2/web-mock/' + esc(mdFile) + '" target="_blank" rel="noopener">GitHub</a></p>'
      + '</article>';
  }
  function devHubPage() {
    // What: Developer Information Hub — index of easy documentation for chrome + engine hires.
    // How: paint overlay like Help; cards summarize DEV-HUB.md sections.
    // Why: newbies need one place for #stage-slot, auth, avatars, cache versions.
    var ghPages = "https://whirledclassic.github.io/whirled2/whirled2/web-mock/";
    return '<section class="page help-page dev-hub-page"><div class="page-head"><div><h1>Developer Information Hub</h1>'
      + '<p>Plain-English index for chrome + engine work. Pale-blue classic only.</p></div>'
      + '<button type="button" class="text-btn" data-dev-hub-close="1">Close</button></div>'
      + '<div class="panel dev-hub-intro">'
      +   '<p><b>How to open this page:</b> Help → <b>Developers</b>, header <b>Developers</b>, hash <code>#dev</code> / <code>#docs</code>, or <code>?page=dev</code>. Mirror doc: <code>DEV-HUB.md</code>.</p>'
      +   '<p class="meta">Rules: coins/bars earn-only · never invent shop catalog · say <b>Profile look</b> (never the old social-network nickname) · engine mounts only in <code>#stage-slot</code>.</p>'
      +   '<nav class="dev-hub-toc" aria-label="Topics">'
      +     '<a href="#dev-flash">Flash / old Whirled</a>'
      +     '<a href="#dev-chrome">Chrome</a>'
      +     '<a href="#dev-engine">Engine bridge</a>'
      +     '<a href="#dev-avatars">PNG avatars</a>'
      +     '<a href="#dev-auth">Auth</a>'
      +     '<a href="#dev-rooms">Rooms / chat / music</a>'
      +     '<a href="#dev-cache">Cache / STATUS</a>'
      +     '<a href="#dev-fla">FLA / SWF lab</a>'
      +     '<a href="#dev-files">Code map</a>'
      +   '</nav>'
      + '</div>'

      + '<article class="dev-hub-card panel dev-hub-card-flash" id="dev-flash">'
      + '<h2>Using old Whirled / Flash avatars</h2>'
      + '<p><b>First-class path:</b> classic Flash/SWF avatars stay supported alongside modern PNG packs. '
      + 'Upload / analyze / Ruffle playback is in progress on this build — use the docs below now; lab UI unlocks with <code>?avatarLab=1</code>.</p>'
      + '<ul class="help-tips">'
      + '<li><b>Import notes</b> — how legacy Whirled SWFs map into Stuff / wardrobe: '
      + '<a href="' + esc(devHubDocUrl("AVATAR-IMPORT.md")) + '" target="_blank" rel="noopener">AVATAR-IMPORT.md</a></li>'
      + '<li><b>Creator guide</b> — Flash/Animate → Publish SWF <i>or</i> export PNG sequences for Wear: '
      + '<a href="' + esc(devHubDocUrl("AVATAR-CREATOR-GUIDE.md")) + '" target="_blank" rel="noopener">AVATAR-CREATOR-GUIDE.md</a>'
      + ' · <button type="button" class="text-btn" data-avatar-guide-open="1">In-site guide</button></li>'
      + '<li><b>FLA lab</b> — .fla alone cannot play in browser; publish SWF / export PNGs: '
      + '<a href="' + esc(devHubDocUrl("FLA-TEST-AVATAR.md")) + '" target="_blank" rel="noopener">FLA-TEST-AVATAR.md</a></li>'
      + '<li><b>Stub</b> — SWF upload → analyze → Ruffle preview (chrome lab; does not remount Pixi in <code>#stage-slot</code>).</li>'
      + '</ul>'
      + '<p class="meta engine-note"><b>ENGINE DEV:</b> Lab Wear / Ruffle stay on chrome layers — never force Flash into <code>#stage-slot</code>. Pixi owns the stage mount; SWF path is parallel.</p>'
      + '<p class="meta"><a href="https://github.com/whirledclassic/whirled2/blob/main/whirled2/web-mock/AVATAR-IMPORT.md" target="_blank" rel="noopener">GitHub AVATAR-IMPORT</a>'
      + ' · <a href="https://github.com/whirledclassic/whirled2/blob/main/whirled2/web-mock/FLA-TEST-AVATAR.md" target="_blank" rel="noopener">GitHub FLA lab</a></p>'
      + '</article>'

      + devHubCard(
          "How the chrome works",
          "dev-chrome",
          "One IIFE in <code>app.js</code>: gate → <code>shell()</code> tabs + chat bar → <code>paint(tab)</code> fills <code>#main</code>. State lives in <code>localStorage</code> keys <code>whirled2.*</code>. Click handlers on <code>#app</code> drive almost all UI.",
          "DEV-NOTES.md",
          "Do not rewrite chrome into Pixi. Read session/room/chat via <code>window.WhirledChrome</code>."
        )
      + devHubCard(
          "ENGINE-BRIDGE / mounting Pixi",
          "dev-engine",
          "Mount your Pixi app with <code>host.replaceChildren(app.canvas)</code> where <code>host = WhirledChrome.getStageEl()</code> (= <code>#stage-slot</code>). Wear billboard, decorate chips, and stage bubbles are chrome siblings — not inside your canvas until you own them.",
          "ENGINE-BRIDGE.md",
          "resizeTo: host. Never draw outside #stage-slot. Chrome walk yields when canvas / [data-whirled-engine] is present."
        )
      + devHubCard(
          "Avatar packs + upload wizard + creator guide",
          "dev-avatars",
          "Stuff → Avatars → multi-step wizard (PNG/WebP, folders, zip, .aseprite). Wear → loft floor click walks; avatar click plays emotes. Whirl is the reference pack (<code>states.idle/walk/…</code>, <code>artFaces</code>).",
          "AVATAR-CREATOR-GUIDE.md",
          "Bridge: getWornAvatar, setAvatarState, playAvatarEmote, listAvatarEmotes, getAvatarWalkTarget. See also STUFF-AVATARS.md."
        )
      + '<div class="panel meta" style="margin-top:-8px">Also: <button type="button" class="text-btn" data-avatar-guide-open="1">In-site How to make an avatar</button>'
      + ' · <a href="' + esc(devHubDocUrl("STUFF-AVATARS.md")) + '" target="_blank" rel="noopener">STUFF-AVATARS.md</a>'
      + ' · <a href="' + esc(devHubDocUrl("AVATAR-IMPORT.md")) + '" target="_blank" rel="noopener">AVATAR-IMPORT.md</a></div>'
      + devHubCard(
          "Auth / Discord / hybrid login",
          "dev-auth",
          "Username/password is primary (hybrid: API first, then offline localStorage). Discord OAuth needs demo <code>server/server.mjs</code> secrets — never in the client. Pages may set <code>WHIRLED_API</code> to the tunnel origin only.",
          "SOCIAL-LOGIN.md",
          "Auth is chrome session only — do not gate #stage-slot on OAuth."
        )
      + devHubCard(
          "Rooms, chat, music",
          "dev-rooms",
          "Rooms lobby → preview → Enter loft. Chat: bottom bar + Overlay/Slide modes; stage bubbles optional. Room music: owner YouTube/Spotify embed; shared sync needs demo server. Lock triad Unlocked/Friends/Locked is chrome gate only. Make Door links decorate chips across rooms.",
          "ROOMS-FIDELITY.md",
          "#stage-slot appears only in roomView(); music dock is outside #main so paint never kills the iframe."
        )
      + devHubCard(
          "Cache-bust versions / STATUS",
          "dev-cache",
          "Bump <code>LOGO_V</code> in <code>app.js</code> and matching <code>?v=</code> on <code>index.html</code> script/link tags whenever chrome assets change. Phones cache aggressively. Read <code>STATUS.md</code> for what each letter shipped.",
          "STATUS.md",
          "Current build: ?v=20260906ax (classic Flash upload + Ruffle experimental; chat visit-scope from av kept). Hard-refresh after pulls."
        )
      + devHubCard(
          "FLA / SWF lab notes",
          "dev-fla",
          "See also <a href='#dev-flash'>Using old Whirled / Flash avatars</a> (first-class). Unlock lab with <code>?avatarLab=1</code>. FLA alone cannot play — publish SWF and/or export PNG sequences. Extracted FLA sketches are not Wearable until converted.",
          "FLA-TEST-AVATAR.md",
          "Lab Wear writes wardrobe.activeId only — never mounts Ruffle into #stage-slot."
        )
      + '<article class="dev-hub-card panel" id="dev-files"><h2>Code map (beginner)</h2>'
      + '<ul class="help-tips">'
      + '<li><b>app.js</b> — boot, gate/auth, paint/routes, loft/stage, avatar wear/walk/emote, Stuff wizard, chat, rooms, Profile look, WhirledChrome.</li>'
      + '<li><b>src/api.js</b> — WhirledApi: hybrid login, chat, room music HTTP, Discord helpers.</li>'
      + '<li><b>src/styles.css</b> — pale-blue classic chrome; themes via CSS vars on #app[data-theme].</li>'
      + '<li><b>server/server.mjs</b> — optional demo API (chat, occupants, music, Discord callback).</li>'
      + '<li><b>index.html</b> — loads css + api.js + app.js with cache-bust; sets WHIRLED_API on Pages.</li>'
      + '</ul>'
      + '<p class="meta">Full mirror: <a href="' + esc(devHubDocUrl("DEV-HUB.md")) + '" target="_blank" rel="noopener">DEV-HUB.md</a>. Live site folder: <a href="' + ghPages + '" target="_blank" rel="noopener">GitHub Pages web-mock</a>.</p>'
      + '</article></section>';
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
    var rname = activeRoomName();
    var rid = currentRoomId || "loft";
    var room = getRoom(rid) || {};
    var here = liveOccupants.slice();
    if (!here.some(function (p) { return p.you || (session() && p.id === session().user.id); })) {
      here = [{ id: session() && session().user && session().user.id, name: me.name, initials: me.initials, online: true, room: rname, you: true }].concat(here);
    } else {
      here = here.map(function (p) {
        if (session() && p.id === session().user.id) return Object.assign({}, p, { you: true, initials: p.initials || me.initials });
        return p;
      });
    }
    here = sortOccupantsYouFirst(here);
    var empty = here.length === 0;
    var lock = loadRoomLock(rid);
    var lockMode = lock.mode || "unlocked";
    var ownerLabel = me.name;
    try {
      if (room.ownerId && session() && String(room.ownerId) === String(session().user.id)) ownerLabel = me.name;
      else if (room.ownerId) ownerLabel = String(room.ownerId).slice(0, 12);
    } catch (eOw) {}
    var ratingBadge = rid === "loft" ? loftRatingLabel() : "Rating: new";
    return ''
      + '<div class="workspace">'
      +   '<aside class="rail occ-rail">'
      +     occupantRailHtml(here)
      +   '</aside>'
      +   '<section class="stage-wrap">'
      +     '<div class="room-strip"><span class="room-name">' + esc(rname) + '</span>'
      +       '<span class="room-owner">owner: ' + esc(ownerLabel) + '</span>'
      +       '<span class="room-lock-badge" title="Enforced on this browser — friends/locked gate entry" data-lock="' + esc(lockMode) + '">🔒 ' + esc(lockLabel(lockMode)) + '</span>'
      +       '<span class="room-rating-badge">' + esc(ratingBadge) + '</span>'
      +       '<button type="button" class="text-btn room-immersive-exit" data-immersive-exit="1" hidden>Exit fullscreen</button></div>'
      +     '<div class="stage-body chat-mode-' + esc(loadChatUi().mode) + ' text-size-' + esc(loadChatUi().textSize) + (loadChatUi().hideHistory ? ' hide-history' : '') + '">'
      +     '<div class="stage-host">'
      // How this works (20260906ak): CSS loft backdrop placeholder so Wear looks intentional.
      // ENGINE DEV: when Pixi mounts, host.replaceChildren(canvas) clears this HTML.
      +       '<div id="stage-slot">' + stagePlaceholderHtml() + '</div>'
      +       decorateLayerHtml()
      // How this works: #avatar-wear-layer = worn Stuff avatar billboard (sprite pack, not SWF).
      // ENGINE DEV: chrome overlay; Pixi may later own the avatar sprite inside #stage-slot.
      +       avatarWearLayerHtml()
      // How this works: #stage-bubbles = temporary avatar speech/thought over the stage
      // (separate from Slide/Overlay history). ENGINE DEV: Pixi may later replace these.
      +       '<div id="stage-bubbles" class="stage-bubbles" aria-live="polite"></div>'
      // How this works (classic Whirled / wiki Chat): Overlay chat sits ON the left of the
      // room window (inside .stage-host). Slide chat uses sibling #chat-log as its own
      // dark panel. Bottom #chat-form input stays in the chrome either way.
      +       '<div class="chat-overlay is-empty" id="chat-overlay" aria-live="polite" hidden></div>'
      +     '</div>'
      // How this works: #room-embed-dock is NOT under the stage — shell() hosts it outside #main.
      // Beginner: Open player sheet is not wiped when mute / Room music taps re-paint the room.
      // ENGINE DEV: persistent shell dock + CSS fixed is-expanded; ensureRoomEmbedDock / ensurePlaylistPanel after paint.
      +     '<div class="chat-toolbar-row">'
      +       chatTabsHtml()
      +       '<button type="button" class="text-btn chat-clear-view-btn" data-chat-clear-view="1" title="Clear room chat for this visit">Clear chat</button>'
      +     '</div>'
      +     '<div class="chat-log" id="chat-log">' + activeChatMessages().map(chatRow).join('') + '</div>'
      +     '<div class="room-invite-row room-invite-desktop">'
      +       '<button type="button" class="text-btn" data-room-share="1">Share / embed room…</button>'
      +       '<button type="button" class="text-btn" data-copy-invite="room">Copy link</button>'
      +     '</div>'
      +     '</div>'
      +     (roomPanelOpen ? roomCommentsPanel() : '')
      +     (roomItemsPanelOpen ? roomItemsPanel() : '')
      +     (decorateMode ? decoratePanel() : '')
      +     (makeDoorPanelOpen ? makeDoorPanelHtml() : '')
      +     (partyPanelOpen ? partyPanel() : '')
      +     '<button type="button" class="music-gesture-fab" id="music-gesture-btn"' + (musicGestureNeeded ? "" : " hidden") + ' data-music-gesture="1">Click to play room music</button>'
      +   '</section>'
      + '</div>'
      + friendInvitePopup()
      + hangoutInvitePopup();
  }
  function rooms() {
    var html = inRoom ? roomView() : roomsLobby();
    if (!inRoom && hangoutInvitePending && hangoutInvitePending.length) {
      html += hangoutInvitePopup();
    }
    return html;
  }


  function wallKey(userId) { return WALL_KEY + (userId || "guest"); }
  function loadWall(userId) {
    try { return JSON.parse(localStorage.getItem(wallKey(userId)) || "[]"); } catch (e) { return []; }
  }
  function saveWall(userId, rows) {
    localStorage.setItem(wallKey(userId), JSON.stringify(rows.slice(-80)));
  }
  function newWallPostId() {
    // Beginner: every wall comment gets a small id so Delete can find it later.
    return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function wallPostKey(w) {
    // How this works: prefer stored id; legacy rows fall back to at|fromId|text fingerprint.
    if (!w) return "";
    if (w.id) return String(w.id);
    return String(w.at || "") + "|" + String(w.fromId || w.who || "") + "|" + String(w.text || "").slice(0, 80);
  }
  function canDeleteWallPost(wallOwnerId, post) {
    // How this works (20260906af): profile owner may delete any post on their wall;
    // authors may delete their own posts (classic comment wall).
    // Beginner: if it is your profile OR you wrote the comment, you see Delete.
    var s = session();
    if (!s || !s.user || !post) return false;
    var me = String(s.user.id);
    if (me === String(wallOwnerId || "")) return true;
    if (post.fromId && String(post.fromId) === me) return true;
    return false;
  }
  function wallRowHtml(w, wallOwnerId) {
    // How this works: one wall row + optional Delete for owner/author.
    // ENGINE DEV: delete is chrome localStorage only — never touches #stage-slot.
    var key = wallPostKey(w);
    var del = canDeleteWallPost(wallOwnerId, w)
      ? ('<button type="button" class="text-btn wall-delete-btn" data-wall-delete="' + esc(key)
        + '" data-wall-owner="' + esc(wallOwnerId || "") + '" title="Delete comment">Delete</button>')
      : "";
    return '<div class="wall-row" data-wall-post="' + esc(key) + '">'
      + '<span class="ava">' + esc(String(w.who || "?").slice(0, 1)) + '</span>'
      + '<div class="wall-row-body"><b>' + esc(w.who || "member") + '</b> ' + esc(w.text || "")
      + '<time>' + esc(String(w.at || "").slice(0, 16).replace("T", " ")) + '</time></div>'
      + del + '</div>';
  }
  function deleteWallPost(wallOwnerId, postKey) {
    // Beginner: removes one comment from that profile wall in this browser.
    if (!wallOwnerId || !postKey) return false;
    var rows = loadWall(wallOwnerId);
    var next = rows.filter(function (w) { return wallPostKey(w) !== String(postKey); });
    if (next.length === rows.length) return false;
    saveWall(wallOwnerId, next);
    return true;
  }
  function loadStatus(userId) {
    try { return localStorage.getItem(STATUS_KEY + userId) || ""; } catch (e) { return ""; }
  }
  function saveStatus(userId, text) {
    localStorage.setItem(STATUS_KEY + userId, String(text || "").slice(0, 140));
  }
  // ---------------------------------------------------------------------------
  // Profile skins (Whirled profile themes — background / accent) — chrome only, NO profile music
  // How this works: each user stores whirled2.profileSkin.{userId} JSON in localStorage.
  // Visitors see that skin when opening otherProfile. Room playlists already cover audio.
  // ENGINE DEV: profile chrome ≠ #stage-slot. The engine ignores profile skins entirely;
  // do not read these keys from Pixi / WhirledChrome.
  // ---------------------------------------------------------------------------
  // How this works: presets + schema for Profile look / Customize look (BG/modules/text/links).
  // ENGINE DEV: profile page chrome only; not #stage-slot — engine ignores profile skins.
  var PROFILE_SKIN_TILE_SOFT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Crect width='24' height='24' fill='%23e8f4fb'/%3E%3Ccircle cx='4' cy='4' r='1.5' fill='%23a8c8e0' opacity='0.55'/%3E%3Ccircle cx='16' cy='14' r='1.2' fill='%2390b8d8' opacity='0.4'/%3E%3C/svg%3E";
  // How this works: Profile look presets — always-visible buttons publish instantly.
  // Beginner: pick Ocean etc. to change BG/accent; Edit look for font/radius/module/header/banner.
  // ENGINE DEV: profile page chrome only; not #stage-slot — no profile music.
  var PROFILE_SKIN_PRESETS = {
    classic: {
      bgType: "gradient", bgColor: "#cfe6f5", bgColor2: "#ffffff", bgImage: "",
      bgRepeat: "cover", bgAttachment: "scroll",
      accent: "#1e6fa8", textColor: "#16324a", linkColor: "#1e6fa8",
      panelAlpha: 0.72, motto: "", tagline: "",
      fontScale: 1, radius: "soft", moduleStyle: "frosted", headerStyle: "band", bannerImage: ""
    },
    night: {
      bgType: "gradient", bgColor: "#1a2433", bgColor2: "#2c3e55", bgImage: "",
      bgRepeat: "cover", bgAttachment: "scroll",
      accent: "#7ec8f0", textColor: "#e8f0f8", linkColor: "#7ec8f0",
      panelAlpha: 0.60, motto: "", tagline: "",
      fontScale: 1, radius: "soft", moduleStyle: "solid", headerStyle: "minimal", bannerImage: ""
    },
    sunset: {
      bgType: "gradient", bgColor: "#ffb347", bgColor2: "#ff6b8a", bgImage: "",
      bgRepeat: "cover", bgAttachment: "scroll",
      accent: "#7a2410", textColor: "#2a120c", linkColor: "#6b1f0c",
      panelAlpha: 0.72, motto: "", tagline: "",
      fontScale: 1, radius: "round", moduleStyle: "frosted", headerStyle: "accent-bar", bannerImage: ""
    },
    paper: {
      bgType: "color", bgColor: "#f4efe6", bgColor2: "#ffffff", bgImage: "",
      bgRepeat: "cover", bgAttachment: "scroll",
      accent: "#6b5b4a", textColor: "#3a3228", linkColor: "#6b5b4a",
      panelAlpha: 0.88, motto: "", tagline: "",
      fontScale: 1, radius: "sharp", moduleStyle: "outline", headerStyle: "minimal", bannerImage: ""
    },
    tileSoft: {
      bgType: "image", bgColor: "#e8f4fb", bgColor2: "#ffffff", bgImage: PROFILE_SKIN_TILE_SOFT,
      bgRepeat: "repeat", bgAttachment: "scroll",
      accent: "#1e6fa8", textColor: "#16324a", linkColor: "#1e6fa8",
      panelAlpha: 0.72, motto: "", tagline: "",
      fontScale: 1, radius: "soft", moduleStyle: "frosted", headerStyle: "band", bannerImage: ""
    },
    clear: {
      bgType: "none", bgColor: "#cfe6f5", bgColor2: "#ffffff", bgImage: "",
      bgRepeat: "cover", bgAttachment: "scroll",
      accent: "#1e6fa8", textColor: "#16324a", linkColor: "#1e6fa8",
      panelAlpha: 0.72, motto: "", tagline: "",
      fontScale: 1, radius: "soft", moduleStyle: "frosted", headerStyle: "band", bannerImage: ""
    },
    ocean: {
      bgType: "gradient", bgColor: "#0b4f6c", bgColor2: "#01baef", bgImage: "",
      bgRepeat: "cover", bgAttachment: "scroll",
      accent: "#dff6ff", textColor: "#e8f7fc", linkColor: "#b8ecff",
      panelAlpha: 0.66, motto: "", tagline: "",
      fontScale: 1, radius: "round", moduleStyle: "frosted", headerStyle: "accent-bar", bannerImage: ""
    },
    forest: {
      bgType: "gradient", bgColor: "#1b4332", bgColor2: "#95d5b2", bgImage: "",
      bgRepeat: "cover", bgAttachment: "scroll",
      accent: "#d8f3dc", textColor: "#f1faee", linkColor: "#b7e4c7",
      panelAlpha: 0.70, motto: "", tagline: "",
      fontScale: 1, radius: "soft", moduleStyle: "solid", headerStyle: "band", bannerImage: ""
    },
    candy: {
      bgType: "gradient", bgColor: "#ffafcc", bgColor2: "#a2d2ff", bgImage: "",
      bgRepeat: "cover", bgAttachment: "scroll",
      accent: "#c9184a", textColor: "#3d0c20", linkColor: "#9d174d",
      panelAlpha: 0.78, motto: "", tagline: "",
      fontScale: 1.1, radius: "round", moduleStyle: "frosted", headerStyle: "accent-bar", bannerImage: ""
    },
    mono: {
      bgType: "gradient", bgColor: "#2b2d42", bgColor2: "#edf2f4", bgImage: "",
      bgRepeat: "cover", bgAttachment: "scroll",
      accent: "#111111", textColor: "#1a1a1a", linkColor: "#333333",
      panelAlpha: 0.88, motto: "", tagline: "",
      fontScale: 0.9, radius: "sharp", moduleStyle: "outline", headerStyle: "minimal", bannerImage: ""
    }
  };
  var PROFILE_BG_MAX_WARN = 400 * 1024;   // soft warn ~400KB
  var PROFILE_BG_MAX_HARD = 900 * 1024;   // reject huge uploads (file bytes before compress)
  var PROFILE_BG_TARGET = 700 * 1024;     // aim dataURL under ~700KB for localStorage
  var PROFILE_BG_MAX_DIM = 1600;          // longest side after resize
  // Beginner (?v=20260906ao): big phone photos often exceed ~900KB. We shrink/jpeg them so
  // Choose image can still save a custom profile background in this browser.
  // ENGINE DEV: chrome-only FileReader + canvas; never touches #stage-slot.
  function skinMsgSet(text) {
    var nodes = document.querySelectorAll("#skin-msg, #skin-msg-quick");
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = text || "";
  }
  function compressProfileImageFile(file, done) {
    // What: turn a picked File into a data URL small enough for whirled2.profileSkin.* localStorage.
    // How: FileReader → Image → canvas (max 1600px) → jpeg quality steps; gif stays as-is if small.
    // Why: hard-reject alone felt broken; compress when reasonable, then clear toast on fail.
    if (!file) { done({ ok: false, error: "No file selected." }); return; }
    var okType = /image\/(png|jpeg|jpg|gif|webp)/i.test(file.type) || /\.(png|jpe?g|gif|webp)$/i.test(file.name || "");
    if (!okType) { done({ ok: false, error: "Use png, jpg, gif, or webp." }); return; }
    // Absurdly huge files: do not even try (memory). Soft ceiling before decode.
    if (file.size > 8 * 1024 * 1024) {
      done({ ok: false, error: "Image too large (keep under ~8MB, or under ~900KB without compress)." });
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () { done({ ok: false, error: "Could not read that image." }); };
    reader.onload = function () {
      var rawUrl = String(reader.result || "");
      var isGif = /image\/gif/i.test(file.type) || /\.gif$/i.test(file.name || "");
      // Animated gif: keep bytes if under hard cap; do not flatten via canvas.
      if (isGif) {
        if (file.size > PROFILE_BG_MAX_HARD || rawUrl.length > 1200000) {
          done({ ok: false, error: "GIF too large for this demo (keep under ~900KB)." });
          return;
        }
        done({ ok: true, dataUrl: rawUrl, compressed: false });
        return;
      }
      // Already small enough — use original (png/webp/jpeg).
      if (file.size <= PROFILE_BG_MAX_WARN && rawUrl.length <= PROFILE_BG_TARGET) {
        done({ ok: true, dataUrl: rawUrl, compressed: false });
        return;
      }
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width || 1;
          var h = img.naturalHeight || img.height || 1;
          var scale = Math.min(1, PROFILE_BG_MAX_DIM / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          var ctx = canvas.getContext("2d");
          if (!ctx) {
            if (file.size > PROFILE_BG_MAX_HARD) {
              done({ ok: false, error: "Image too large for this demo (keep under ~900KB)." });
            } else {
              done({ ok: true, dataUrl: rawUrl, compressed: false });
            }
            return;
          }
          ctx.fillStyle = "#cfe6f5";
          ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          var qualities = [0.82, 0.72, 0.62, 0.52, 0.42];
          var best = "";
          for (var qi = 0; qi < qualities.length; qi++) {
            var out = canvas.toDataURL("image/jpeg", qualities[qi]);
            best = out;
            if (out.length <= PROFILE_BG_TARGET) break;
          }
          if (!best || best.length > 1200000) {
            done({ ok: false, error: "Could not shrink image enough for browser storage (~900KB). Try a smaller file." });
            return;
          }
          done({ ok: true, dataUrl: best, compressed: true, note: "Resized/compressed to fit localStorage." });
        } catch (eComp) {
          if (file.size > PROFILE_BG_MAX_HARD) {
            done({ ok: false, error: "Image too large for this demo (keep under ~900KB)." });
          } else {
            done({ ok: true, dataUrl: rawUrl, compressed: false });
          }
        }
      };
      img.onerror = function () { done({ ok: false, error: "Could not decode that image." }); };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  }
  function publishQuickProfileBg(dataUrl, meta) {
    // Beginner (?v=20260906ao): quick upload outside Edit look must SAVE, not only preview.
    // Root cause: old code set __skinBgPending, painted Edit look, and returned without saveProfileSkin —
    // so paint() re-applied the previous saved skin and the image disappeared.
    // How: merge bgType:image + bgImage into current skin → localStorage → applyProfileSkinDom.
    // ENGINE DEV: profile chrome only; not #stage-slot.
    if (!session()) return;
    var uid = session().user.id;
    var cur = loadProfileSkin(uid);
    var prevType = cur.bgType;
    cur.bgType = "image";
    cur.bgImage = String(dataUrl || "");
    // First time switching to an image look → cover + scroll (classic “wallpaper” feel).
    if (prevType !== "image") {
      cur.bgRepeat = "cover";
      cur.bgAttachment = "scroll";
    } else {
      cur.bgRepeat = normalizeBgRepeat(cur.bgRepeat || "cover");
      cur.bgAttachment = cur.bgAttachment === "fixed" ? "fixed" : "scroll";
    }
    var saved = saveProfileSkin(uid, cur);
    // If localStorage dropped the image (quota), surface that clearly.
    if (saved.bgType !== "image" || !saved.bgImage) {
      skinMsgSet("Could not save background — browser storage full. Clear an old look or use a smaller image.");
      try { pushNotice("orange", "Background not saved (storage full).", { transient: true }); } catch (eQ) {}
      return;
    }
    window.__skinBgPending = "";
    meSub = "profile";
    viewingId = null;
    var note = (meta && meta.compressed) ? "Background saved (compressed to fit)." : "Background saved — visitors see it on your profile.";
    skinMsgSet(note);
    try { pushNotice("green", note, { transient: true }); } catch (eN) {}
    paint("me");
    try { applyProfileSkinDom(uid, saved); } catch (eA) {}
    requestAnimationFrame(function () {
      try {
        if (document.querySelector(".page.profile-page")) applyProfileSkinDom(uid, saved);
      } catch (e2) {}
    });
  }
  function publishQuickProfileBanner(dataUrl, meta) {
    // Beginner: banner is the thin strip under Me subnav. Same compress + persist idea as BG.
    if (!session()) return;
    var uid = session().user.id;
    var cur = loadProfileSkin(uid);
    cur.bannerImage = String(dataUrl || "");
    var saved = saveProfileSkin(uid, cur);
    if (!saved.bannerImage) {
      skinMsgSet("Could not save banner — browser storage full or image too big.");
      try { pushNotice("orange", "Banner not saved.", { transient: true }); } catch (eQ) {}
      return;
    }
    window.__skinBannerPending = "";
    meSub = "profile";
    var note = (meta && meta.compressed) ? "Banner saved (compressed)." : "Banner saved.";
    skinMsgSet(note);
    try { pushNotice("green", note, { transient: true }); } catch (eN) {}
    if (!document.getElementById("skin-form")) profileEditSection = "skin";
    paint("me");
    try { applyProfileSkinDom(uid, saved); } catch (eA) {}
  }
  function normalizeFontScale(v) {
    v = Number(v);
    if (v === 0.9 || v === 1.1) return v;
    return 1;
  }
  function normalizeRadius(v) {
    v = String(v || "soft");
    if (v === "sharp" || v === "soft" || v === "round") return v;
    return "soft";
  }
  function normalizeModuleStyle(v) {
    v = String(v || "frosted");
    if (v === "frosted" || v === "solid" || v === "outline") return v;
    return "frosted";
  }
  function normalizeHeaderStyle(v) {
    v = String(v || "band");
    if (v === "band" || v === "minimal" || v === "accent-bar") return v;
    return "band";
  }
  function defaultProfileSkin() {
    // How this works: demos show Classic Blue so the page isn't blank; Clear preset → none.
    return {
      bgType: "gradient",
      bgColor: "#cfe6f5",
      bgColor2: "#ffffff",
      bgImage: "",
      bgRepeat: "cover",
      bgAttachment: "scroll",
      accent: "#1e6fa8",
      textColor: "#16324a",
      linkColor: "#1e6fa8",
      panelAlpha: 0.72,
      motto: "",
      tagline: "",
      fontScale: 1,
      radius: "soft",
      moduleStyle: "frosted",
      headerStyle: "band",
      bannerImage: ""
    };
  }
  function normalizeBgRepeat(v) {
    v = String(v || "cover");
    if (v === "cover" || v === "no-repeat" || v === "repeat" || v === "repeat-x" || v === "repeat-y") return v;
    return "cover";
  }
  function normalizeBgAttachment(v) {
    v = String(v || "scroll");
    return v === "fixed" ? "fixed" : "scroll";
  }
  function clampPanelAlpha(alpha, fallback) {
    alpha = Number(alpha);
    if (!(alpha >= 0.55 && alpha <= 1)) return fallback != null ? fallback : 0.72;
    return alpha;
  }
  function normalizeProfileSkin(s) {
    var d = defaultProfileSkin();
    s = s || {};
    var bgType = s.bgType || d.bgType;
    if (bgType !== "none" && bgType !== "color" && bgType !== "gradient" && bgType !== "image") bgType = "none";
    return {
      bgType: bgType,
      bgColor: String(s.bgColor || d.bgColor).slice(0, 32),
      bgColor2: String(s.bgColor2 || d.bgColor2).slice(0, 32),
      bgImage: String(s.bgImage || "").slice(0, 1200000),
      bgRepeat: normalizeBgRepeat(s.bgRepeat != null ? s.bgRepeat : d.bgRepeat),
      bgAttachment: normalizeBgAttachment(s.bgAttachment != null ? s.bgAttachment : d.bgAttachment),
      accent: String(s.accent || d.accent).slice(0, 32),
      textColor: String(s.textColor || d.textColor).slice(0, 32),
      linkColor: String(s.linkColor || d.linkColor).slice(0, 32),
      panelAlpha: clampPanelAlpha(s.panelAlpha, d.panelAlpha),
      motto: String(s.motto || "").slice(0, 80),
      tagline: String(s.tagline || "").slice(0, 100),
      fontScale: normalizeFontScale(s.fontScale != null ? s.fontScale : d.fontScale),
      radius: normalizeRadius(s.radius != null ? s.radius : d.radius),
      moduleStyle: normalizeModuleStyle(s.moduleStyle != null ? s.moduleStyle : d.moduleStyle),
      headerStyle: normalizeHeaderStyle(s.headerStyle != null ? s.headerStyle : d.headerStyle),
      bannerImage: String(s.bannerImage || "").slice(0, 1200000)
    };
  }
  function loadProfileSkin(userId) {
    // How this works: missing / bad JSON → Classic demo default (visible BG); Clear stores none.
    try {
      var raw = localStorage.getItem(PROFILE_SKIN_KEY + userId);
      if (!raw) return defaultProfileSkin();
      var s = JSON.parse(raw);
      if (!s || typeof s !== "object") return defaultProfileSkin();
      return normalizeProfileSkin(s);
    } catch (e) { return defaultProfileSkin(); }
  }
  function saveProfileSkin(userId, skin) {
    // How this works: normalize + cap motto/tagline; drop huge images if oversized.
    var out = normalizeProfileSkin(skin);
    if (out.bgType !== "image") out.bgImage = "";
    else out.bgImage = String(out.bgImage || "").slice(0, 1200000);
    out.bannerImage = String(out.bannerImage || "").slice(0, 1200000);
    try { localStorage.setItem(PROFILE_SKIN_KEY + userId, JSON.stringify(out)); } catch (e) {
      try {
        out.bgImage = "";
        out.bannerImage = "";
        if (out.bgType === "image") out.bgType = "color";
        localStorage.setItem(PROFILE_SKIN_KEY + userId, JSON.stringify(out));
      } catch (e2) {}
    }
    return out;
  }
  function applyProfileSkinDom(userId, draftSkin) {
    // What: paint a player's Profile look (BG, colors, font scale, corners) onto their profile page.
    // How: set CSS vars + full background shorthand on .page.profile-page / .profile-skin only.
    // Why: visitors see skins on profiles; other tabs must call clearProfileSkinDom so nothing leaks.
    // Beginner (?v=20260906ao): bgType:image + bgImage becomes CSS background url(...) cover/scroll.
    // Quick upload now saveProfileSkin BEFORE paint so this reads the real image (not a lost pending).
    // ENGINE DEV: profile page chrome only; not #stage-slot; not room music dock.
    var skin = draftSkin ? normalizeProfileSkin(draftSkin) : loadProfileSkin(userId);
    var page = document.querySelector(".page.profile-page");
    var wrap = document.querySelector(".profile-skin");
    if (!page && wrap) page = wrap;
    if (!page) return;
    var alpha = clampPanelAlpha(skin.panelAlpha, 0.72);
    var targets = [page];
    if (wrap && wrap !== page) targets.push(wrap);
    var has = skin.bgType && skin.bgType !== "none";
    var bgShorthand = "";
    if (skin.bgType === "color") {
      bgShorthand = String(skin.bgColor || "#cfe6f5");
    } else if (skin.bgType === "gradient") {
      bgShorthand = "linear-gradient(160deg," + String(skin.bgColor || "#cfe6f5") + "," + String(skin.bgColor2 || "#ffffff") + ")";
    } else if (skin.bgType === "image" && skin.bgImage) {
      var rawUrl = String(skin.bgImage).replace(/\\/g, "").replace(/"/g, "").replace(/'/g, "");
      var rep = normalizeBgRepeat(skin.bgRepeat);
      var attach = skin.bgAttachment === "fixed" ? "fixed" : "scroll";
      if (rep === "cover") {
        bgShorthand = String(skin.bgColor || "#cfe6f5") + ' url("' + rawUrl + '") center top / cover no-repeat ' + attach;
      } else {
        bgShorthand = String(skin.bgColor || "#cfe6f5") + ' url("' + rawUrl + '") center top / auto ' + rep + ' ' + attach;
      }
    }
    var radiusPx = skin.radius === "sharp" ? "2px" : (skin.radius === "round" ? "16px" : "8px");
    targets.forEach(function (el) {
      el.style.setProperty("--profile-accent", String(skin.accent || "#1e6fa8"));
      el.style.setProperty("--profile-panel", "rgba(255,255,255," + alpha + ")");
      el.style.setProperty("--profile-text", String(skin.textColor || "#16324a"));
      el.style.setProperty("--profile-link", String(skin.linkColor || "#1e6fa8"));
      el.style.setProperty("--profile-font-scale", String(normalizeFontScale(skin.fontScale)));
      el.style.setProperty("--profile-radius", radiusPx);
      el.classList.toggle("has-profile-skin", !!has);
      el.classList.remove("profile-radius-sharp", "profile-radius-soft", "profile-radius-round");
      el.classList.add("profile-radius-" + normalizeRadius(skin.radius));
      el.classList.remove("profile-mod-frosted", "profile-mod-solid", "profile-mod-outline");
      el.classList.add("profile-mod-" + normalizeModuleStyle(skin.moduleStyle));
      el.classList.remove("profile-header-band", "profile-header-minimal", "profile-header-accent-bar");
      el.classList.add("profile-header-" + normalizeHeaderStyle(skin.headerStyle));
      // Reset then apply full shorthand (beats .page background-color: var(--paper))
      el.style.background = "";
      el.style.backgroundColor = "";
      el.style.backgroundImage = "";
      el.style.backgroundSize = "";
      el.style.backgroundRepeat = "";
      el.style.backgroundAttachment = "";
      el.style.backgroundPosition = "";
      if (!has) return;
      el.style.background = bgShorthand;
    });
    // Thin banner under me-subnav / above profile header
    var banner = document.getElementById("profile-banner");
    if (banner) {
      if (skin.bannerImage) {
        banner.hidden = false;
        banner.style.backgroundImage = 'url("' + String(skin.bannerImage).replace(/\\/g, "").replace(/"/g, "").replace(/'/g, "") + '")';
      } else {
        banner.hidden = true;
        banner.style.backgroundImage = "";
      }
    }
  }
  function readSkinFormDraft(form) {
    // How this works: live preview draft from open Customize look form (not persisted until Save / preset).
    if (!form) return null;
    var prev = session() ? loadProfileSkin(session().user.id) : defaultProfileSkin();
    var bgType = String((form.bgType && form.bgType.value) || "none");
    var bgImage = "";
    if (bgType === "image") {
      if (window.__skinBgPending) bgImage = String(window.__skinBgPending);
      else if (form.keepImage && String(form.keepImage.value) === "1") bgImage = prev.bgImage || "";
    }
    var bannerImage = "";
    if (window.__skinBannerPending) bannerImage = String(window.__skinBannerPending);
    else if (form.keepBanner && String(form.keepBanner.value) === "1") bannerImage = prev.bannerImage || "";
    else if (form.clearBanner && form.clearBanner.checked) bannerImage = "";
    else bannerImage = prev.bannerImage || "";
    return normalizeProfileSkin({
      bgType: bgType,
      bgColor: form.bgColor ? form.bgColor.value : prev.bgColor,
      bgColor2: form.bgColor2 ? form.bgColor2.value : prev.bgColor2,
      bgImage: bgImage,
      bgRepeat: form.bgRepeat ? form.bgRepeat.value : prev.bgRepeat,
      bgAttachment: form.bgAttachment ? form.bgAttachment.value : prev.bgAttachment,
      accent: form.accent ? form.accent.value : prev.accent,
      textColor: form.textColor ? form.textColor.value : prev.textColor,
      linkColor: form.linkColor ? form.linkColor.value : prev.linkColor,
      panelAlpha: form.panelAlpha ? form.panelAlpha.value : prev.panelAlpha,
      motto: form.motto ? form.motto.value : prev.motto,
      tagline: form.tagline ? form.tagline.value : prev.tagline,
      fontScale: form.fontScale ? form.fontScale.value : prev.fontScale,
      radius: form.radius ? form.radius.value : prev.radius,
      moduleStyle: form.moduleStyle ? form.moduleStyle.value : prev.moduleStyle,
      headerStyle: form.headerStyle ? form.headerStyle.value : prev.headerStyle,
      bannerImage: bannerImage
    });
  }
  function fillSkinFormFromPreset(form, preset) {
    if (!form || !preset) return;
    form.bgType.value = preset.bgType;
    form.bgColor.value = preset.bgColor;
    form.bgColor2.value = preset.bgColor2;
    form.accent.value = preset.accent;
    if (form.textColor) form.textColor.value = preset.textColor || "#16324a";
    if (form.linkColor) form.linkColor.value = preset.linkColor || "#1e6fa8";
    if (form.bgColorPicker) form.bgColorPicker.value = preset.bgColor;
    if (form.bgColor2Picker) form.bgColor2Picker.value = preset.bgColor2;
    if (form.accentPicker) form.accentPicker.value = preset.accent;
    if (form.textColorPicker) form.textColorPicker.value = preset.textColor || "#16324a";
    if (form.linkColorPicker) form.linkColorPicker.value = preset.linkColor || "#1e6fa8";
    if (form.bgRepeat) form.bgRepeat.value = normalizeBgRepeat(preset.bgRepeat);
    if (form.bgAttachment) form.bgAttachment.value = normalizeBgAttachment(preset.bgAttachment);
    if (form.fontScale) form.fontScale.value = String(normalizeFontScale(preset.fontScale));
    if (form.radius) form.radius.value = normalizeRadius(preset.radius);
    if (form.moduleStyle) form.moduleStyle.value = normalizeModuleStyle(preset.moduleStyle);
    if (form.headerStyle) form.headerStyle.value = normalizeHeaderStyle(preset.headerStyle);
    if (form.tagline && preset.tagline != null) form.tagline.value = preset.tagline || "";
    var a = Number(preset.panelAlpha);
    if (form.panelAlpha) {
      if (a >= 0.95) form.panelAlpha.value = "1";
      else if (a >= 0.80) form.panelAlpha.value = "0.88";
      else if (a >= 0.68) form.panelAlpha.value = "0.72";
      else form.panelAlpha.value = "0.60";
    }
    if (preset.bgType === "image" && preset.bgImage) {
      window.__skinBgPending = preset.bgImage;
      if (form.keepImage) form.keepImage.value = "0";
      var hidP = document.getElementById("skin-bg-data");
      if (hidP) hidP.value = "pending";
    } else if (preset.bgType === "none" || preset.bgType !== "image") {
      window.__skinBgPending = "";
      if (form.keepImage) form.keepImage.value = "0";
      var hidC = document.getElementById("skin-bg-data");
      if (hidC) hidC.value = "";
    }
    window.__skinBannerPending = preset.bannerImage || "";
    if (form.keepBanner) form.keepBanner.value = preset.bannerImage ? "1" : "0";
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
      at: new Date().toISOString(),
      read: !!opts.read
    };
    if (opts.transient) { notice.transient = true; notice.read = true; }
    notices.unshift(notice);
    notices = notices.slice(0, 30);
    persistNotices();
    renderNotices();
    if (notice.transient) {
      var nid = notice.id;
      // Beginner (?v=20260906ax): toasts auto-hide in ≤2s — never block the loft mid-stage.
      setTimeout(function () { dismissNoticeId(nid); }, 2000);
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

  function unreadNoticesCount() {
    loadNotices();
    return notices.filter(function (n) { return n && !n.read && !isEphemeralNotice(n); }).length;
  }
  function markNoticeRead(id) {
    loadNotices();
    var changed = false;
    notices.forEach(function (n) {
      if (n && n.id === id && !n.read) { n.read = true; changed = true; }
    });
    if (changed) { persistNotices(); renderNotices(); }
  }
  function markAllNoticesRead() {
    loadNotices();
    notices.forEach(function (n) { if (n) n.read = true; });
    persistNotices();
    renderNotices();
  }
  // How this works: Me → Notices lists friend login, mail, friend request with mark-read.
  function meNotices() {
    loadNotices();
    var rows = notices.filter(function (n) { return n && !isEphemeralNotice(n); });
    var list = rows.length
      ? rows.map(function (n) {
          return '<div class="notice-page-row' + (n.read ? "" : " is-unread") + '" data-notice-mark="' + esc(n.id) + '">'
            + '<span class="notice-kind kind-' + esc(n.kind || "gray") + '">' + esc(n.kind || "notice") + '</span> '
            + '<span class="notice-text">' + esc(n.text) + '</span>'
            + '<time>' + esc((n.at || "").slice(0, 16).replace("T", " ")) + '</time>'
            + (n.read ? "" : ' <button type="button" class="text-btn" data-notice-mark="' + esc(n.id) + '">Mark read</button>')
            + '</div>';
        }).join("")
      : '<p class="meta">No notices yet. Friend logins, mail, and friend requests show up here.</p>';
    return '<section class="page me-page">' + meSubnav()
      + '<div class="panel"><h2>Notices</h2>'
      +   '<div class="mail-toolbar">'
      +     '<button type="button" class="action-btn" data-notices-mark-all="1">Mark all read</button>'
      +     '<button type="button" class="action-btn" data-notice-clear-all="1">Clear all</button>'
      +   '</div>'
      +   list + '</div></section>';
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
      + (opts.friendHtml ? opts.friendHtml : (opts.friend ? '<button type="button" class="profile-action" ' + opts.friend + '><span class="pa-ico">+</span><span>Add Friend</span></button>' : ''))
      + (opts.copyInvite ? '<button type="button" class="profile-action" ' + opts.copyInvite + '><span class="pa-ico">🔗</span><span>Copy invite</span></button>' : '')
      + (opts.photo ? '<label class="profile-action photo-label"><span class="pa-ico">▣</span><span>Photo</span><input type="file" id="photo-input" accept="image/*" hidden /></label>' : '')
      + '</div>';
  }

  function meSubnav() {
    return '<div class="me-subnav"><span class="me-title">Me</span><nav class="me-links">'
      + '<button type="button" class="me-link' + (meSub === "home" ? " is-on" : "") + '" data-me="home">Me</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "profile" ? " is-on" : "") + '" data-me="profile">My Profile</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "rooms" ? " is-on" : "") + '" data-me="rooms">My Rooms</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "friends" ? " is-on" : "") + '" data-me="friends">Friends'
      +   (incomingFriendRequestCount() ? (' <span class="me-badge">' + incomingFriendRequestCount() + '</span>') : '')
      + '</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "mail" ? " is-on" : "") + '" data-me="mail">Mail</button>'
      + '<span class="sep">|</span>'
      + '<button type="button" class="me-link' + (meSub === "notices" ? " is-on" : "") + '" data-me="notices">Notices'
      +   (unreadNoticesCount() ? (' <span class="me-badge">' + unreadNoticesCount() + '</span>') : '')
      + '</button>'
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
      var k = w.kind === "status" ? "status" : (w.kind === "friending" ? "friending" : "comment");
      items.push({ kind: k, text: w.text, who: w.who || "", at: w.at || "" });
    });
    loadFriends().forEach(function (f) {
      if (!f || !f.at) return;
      items.push({ kind: "friending", text: "You friended " + (f.name || f.id) + ".", who: f.name || "", at: f.at });
    });
    loadFriendRequests().forEach(function (r) {
      if (!r || r.status !== "accepted") return;
      if (String(r.toId) === String(sid)) {
        items.push({ kind: "friending", text: "Friend accepted — " + (r.fromName || r.fromId) + " is now your friend.", who: r.fromName || "", at: r.at || "" });
      } else if (String(r.fromId) === String(sid)) {
        items.push({ kind: "friending", text: (r.toName || r.toId) + " accepted your friend request.", who: r.toName || "", at: r.at || "" });
      }
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
          return '<div class="friend-row"><span class="ava">' + esc(p.initials || "?") + '</span>'
            + '<div><b>' + esc(p.name) + '</b><div class="sub">In ' + esc(p.room || ROOM) + '</div>'
            + '<button type="button" class="action-btn" data-join-them="1" data-join-name="' + esc(p.name) + '">Join them!</button>'
            + '</div></div>';
        }).join("")
      : '<p class="meta">None of your friends are online right now.</p>';
    var peopleNow = liveOccupants.length || (session() ? 1 : 0);
    var unread = unreadCount();
    return '<section class="page me-page">' + meSubnav()
      + '<div class="me-grid">'
      +   '<div class="me-main">'
      +     '<div class="panel invite-banner">Invite friends to Whirled2 — Coins & Bars are play currency (no payments).</div>'
      +     '<div class="panel"><h2>My News</h2>'
      +       (st ? '<p class="status-line"><b>Your status:</b> ' + esc(st) + '</p>' : '')
      +       myNewsSections() + '</div>'
      +   '</div>'
      +   '<aside class="me-side">'
      +     '<div class="panel links-panel">'
      +       '<div class="online-count">People Online Now: <b>' + peopleNow + '</b></div>'
      +       '<button type="button" class="text-btn" data-me="profile">My Profile</button>'
      +       '<button type="button" class="text-btn" data-me="rooms">My Rooms</button>'
      +       '<button type="button" class="text-btn" data-me="passport">My Passport</button>'
      +       '<button type="button" class="text-btn" data-me="mail">Mail' + (unread ? ' (' + unread + ')' : '') + '</button>'
      +       '<button type="button" class="text-btn" data-me="notices">Notices' + (unreadNoticesCount() ? ' (' + unreadNoticesCount() + ')' : '') + '</button>'
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
      +     '<div class="panel friendly-people-panel"><h2>Friendly People</h2>'
      +       '<p class="meta">Helpers who auto-accept friend requests (classic Me tab).</p>'
      +       friendlyPeopleStripHtml() + '</div>'
      +   '</aside>'
      + '</div></section>';
  }

  // ---------------------------------------------------------------------------
  // Me → My Profile (classic edit links: read-only until you click Edit)
  // profileEditSection: null | "status" | "photo" | "info" | "skin"
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
    // How this works: load this user's Profile look skin (background / accent / motto).
    // ENGINE DEV: profile skins stay in Me chrome — never applied to #stage-slot.
    var skin = loadProfileSkin(sid);
    var photoHtml = photo
      ? '<img class="profile-photo" src="' + photo + '" alt="Profile photo" width="80" height="60" />'
      : '<div class="profile-photo missing"><span>' + esc(me.initials) + '</span></div>';
    wall = wall.filter(function (w) { return !w.fromId || !isBlocked(w.fromId); });
    // How this works (20260906af): owner sees Delete on every wall post; authors on their own.
    var wallHtml = wall.length ? wall.map(function (w) {
      return wallRowHtml(w, sid);
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
    var editSkin = profileEditSection === "skin";
    function editToggle(sec, label) {
      var open = profileEditSection === sec;
      return '<button type="button" class="edit-link' + (open ? " is-open" : "") + '" data-profile-edit="' + sec + '">'
        + (open ? "Done" : ("Edit " + label)) + '</button>';
    }
    return '<section class="page me-page profile-page">' + meSubnav()
      + (skin.bannerImage ? ('<div id="profile-banner" class="profile-banner" style="background-image:url(\'' + String(skin.bannerImage).replace(/'/g, '') + '\')"></div>') : '<div id="profile-banner" class="profile-banner" hidden></div>')
      + '<div class="profile-skin">'
      + '<div class="classic-profile">'
      +   '<div class="cp-header">'
      +     '<div class="cp-photo">' + photoHtml
      +       '<div class="cp-edit-row">' + editToggle("photo", "photo") + '</div></div>'
      +     '<div class="cp-main">'
      +       '<div class="cp-name-row"><span class="cp-name">' + esc(me.name) + '</span>' + roleBadgeHtml(getRole(sid)) + '<span class="level-badge">Level 1</span></div>'
      +       (discordLinkedBadgeHtml(me) ? ('<div class="cp-discord-link">' + discordLinkedBadgeHtml(me) + '</div>') : '')
      +       '<div class="cp-status-block">'
      +         '<div class="cp-status">' + (st ? esc(st) : '<span class="meta">No status set</span>') + '</div>'
      +         (skin.motto ? ('<div class="cp-motto">' + esc(skin.motto) + '</div>') : '')
      +         (skin.tagline ? ('<div class="cp-tagline">' + esc(skin.tagline) + '</div>') : '')
      +         editToggle("status", "status")
      +       '</div>'
      +       profileActionRow({
            copyInvite: 'data-copy-invite="profile" data-copy-invite-id="' + esc(sid) + '"'
          })
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
      +   '<div class="cp-section cp-customize"><div class="cp-section-head"><h2>Customize look</h2>'
      +     editToggle("skin", "look") + '</div>'
      +     '<p class="meta">Whirled profile themes for visitors: background, modules, font scale, corners, header style, optional banner &amp; tagline. Presets publish instantly. Open Edit look for fine-tune, then Publish. No profile music — use room music.</p>'
      +     (skin.motto ? ('<p class="cp-motto-preview"><i>' + esc(skin.motto) + '</i></p>') : '')
      +     '<div class="section-label">Profile look presets (publish immediately)</div>'
      +     '<div class="skin-presets skin-presets-always">'
      +       '<button type="button" class="action-btn" data-skin-preset="classic">Classic</button>'
      +       '<button type="button" class="action-btn" data-skin-preset="night">Night</button>'
      +       '<button type="button" class="action-btn" data-skin-preset="sunset">Sunset</button>'
      +       '<button type="button" class="action-btn" data-skin-preset="paper">Paper</button>'
      +       '<button type="button" class="action-btn" data-skin-preset="tileSoft">Tile Soft</button>'
      +       '<button type="button" class="action-btn" data-skin-preset="ocean">Ocean</button>'
      +       '<button type="button" class="action-btn" data-skin-preset="forest">Forest</button>'
      +       '<button type="button" class="action-btn" data-skin-preset="candy">Candy</button>'
      +       '<button type="button" class="action-btn" data-skin-preset="mono">Mono</button>'
      +       '<button type="button" class="action-btn" data-skin-preset="clear">Clear</button>'
      +     '</div>'
      +     '<div class="skin-bg-upload-always">'
      +       '<strong>Upload custom background</strong>'
      +       '<p class="meta" style="margin:4px 0 8px">Image behind everything on your profile. Choosing a file <b>saves immediately</b> (large photos are compressed to fit this browser). Only upload images you have rights to.</p>'
      +       '<label class="skin-bg-file">Choose image (png/jpg/gif/webp)'
      +         '<input type="file" id="skin-bg-input-quick" accept="image/png,image/jpeg,image/gif,image/webp" /></label>'
      +       '<p class="meta" id="skin-msg-quick"></p>'
      +       (skin.bgImage
              ? ('<div class="skin-bg-thumb-wrap" style="margin-top:8px">'
                + '<img class="skin-bg-thumb" alt="Current background" src="' + esc(skin.bgImage) + '" />'
                + '<button type="button" class="text-btn" data-skin-clear-bg="1">Clear image</button></div>')
              : '')
      +     '</div>'
      +     (editSkin
            ? ('<div class="cp-edit-panel is-open" id="edit-skin-panel">'
              +   '<div class="cp-edit-head"><b>Profile look</b>'
              +     '<button type="button" class="text-btn" data-profile-edit-cancel="1">Cancel</button></div>'
              +   '<form class="skin-form" id="skin-form">'
              +     '<label>Background type <select name="bgType">'
              +       '<option value="none"' + (skin.bgType === "none" ? " selected" : "") + '>None</option>'
              +       '<option value="color"' + (skin.bgType === "color" ? " selected" : "") + '>Solid color</option>'
              +       '<option value="gradient"' + (skin.bgType === "gradient" ? " selected" : "") + '>Gradient</option>'
              +       '<option value="image"' + (skin.bgType === "image" ? " selected" : "") + '>Image</option>'
              +     '</select></label>'
              +     '<label>Background color <input type="color" name="bgColorPicker" value="' + esc(skin.bgColor || "#cfe6f5") + '" />'
              +       '<input name="bgColor" maxlength="32" value="' + esc(skin.bgColor || "#cfe6f5") + '" /></label>'
              +     '<label>Gradient end <input type="color" name="bgColor2Picker" value="' + esc(skin.bgColor2 || "#ffffff") + '" />'
              +       '<input name="bgColor2" maxlength="32" value="' + esc(skin.bgColor2 || "#ffffff") + '" /></label>'
              +     '<label>Background repeat <select name="bgRepeat">'
              +       '<option value="cover"' + (skin.bgRepeat === "cover" ? " selected" : "") + '>Cover</option>'
              +       '<option value="no-repeat"' + (skin.bgRepeat === "no-repeat" ? " selected" : "") + '>No repeat</option>'
              +       '<option value="repeat"' + (skin.bgRepeat === "repeat" ? " selected" : "") + '>Tile</option>'
              +       '<option value="repeat-x"' + (skin.bgRepeat === "repeat-x" ? " selected" : "") + '>Tile horizontal</option>'
              +       '<option value="repeat-y"' + (skin.bgRepeat === "repeat-y" ? " selected" : "") + '>Tile vertical</option>'
              +     '</select></label>'
              +     '<label>Background scroll <select name="bgAttachment">'
              +       '<option value="scroll"' + (skin.bgAttachment !== "fixed" ? " selected" : "") + '>Scroll with page</option>'
              +       '<option value="fixed"' + (skin.bgAttachment === "fixed" ? " selected" : "") + '>Fixed</option>'
              +     '</select></label>'
              +     '<label>Accent <input type="color" name="accentPicker" value="' + esc(skin.accent || "#1e6fa8") + '" />'
              +       '<input name="accent" maxlength="32" value="' + esc(skin.accent || "#1e6fa8") + '" /></label>'
              +     '<label>Text color <input type="color" name="textColorPicker" value="' + esc(skin.textColor || "#16324a") + '" />'
              +       '<input name="textColor" maxlength="32" value="' + esc(skin.textColor || "#16324a") + '" /></label>'
              +     '<label>Link color <input type="color" name="linkColorPicker" value="' + esc(skin.linkColor || "#1e6fa8") + '" />'
              +       '<input name="linkColor" maxlength="32" value="' + esc(skin.linkColor || "#1e6fa8") + '" /></label>'
              +     '<label>Panel opacity <select name="panelAlpha">'
              +       '<option value="1"' + (Number(skin.panelAlpha) >= 0.95 ? " selected" : "") + '>Solid</option>'
              +       '<option value="0.88"' + (Number(skin.panelAlpha) < 0.95 && Number(skin.panelAlpha) >= 0.80 ? " selected" : "") + '>Soft</option>'
              +       '<option value="0.72"' + (Number(skin.panelAlpha) < 0.80 && Number(skin.panelAlpha) >= 0.68 ? " selected" : "") + '>Airy (default)</option>'
              +       '<option value="0.60"' + (Number(skin.panelAlpha) < 0.68 ? " selected" : "") + '>Very clear</option>'
              +     '</select></label>'
              +     '<label>Motto <input name="motto" maxlength="80" placeholder="Short blurb under status" value="' + esc(skin.motto || "") + '" /></label>'
              +     '<label>Tagline <input name="tagline" maxlength="100" placeholder="Optional line (uses text color)" value="' + esc(skin.tagline || "") + '" /></label>'
              +     '<label>Font scale <select name="fontScale">'
              +       '<option value="0.9"' + (Number(skin.fontScale) === 0.9 ? " selected" : "") + '>Small (0.9)</option>'
              +       '<option value="1"' + (Number(skin.fontScale) !== 0.9 && Number(skin.fontScale) !== 1.1 ? " selected" : "") + '>Normal</option>'
              +       '<option value="1.1"' + (Number(skin.fontScale) === 1.1 ? " selected" : "") + '>Large (1.1)</option>'
              +     '</select></label>'
              +     '<label>Corners <select name="radius">'
              +       '<option value="sharp"' + (skin.radius === "sharp" ? " selected" : "") + '>Sharp</option>'
              +       '<option value="soft"' + (skin.radius !== "sharp" && skin.radius !== "round" ? " selected" : "") + '>Soft</option>'
              +       '<option value="round"' + (skin.radius === "round" ? " selected" : "") + '>Round</option>'
              +     '</select></label>'
              +     '<label>Module style <select name="moduleStyle">'
              +       '<option value="frosted"' + (skin.moduleStyle !== "solid" && skin.moduleStyle !== "outline" ? " selected" : "") + '>Frosted</option>'
              +       '<option value="solid"' + (skin.moduleStyle === "solid" ? " selected" : "") + '>Solid</option>'
              +       '<option value="outline"' + (skin.moduleStyle === "outline" ? " selected" : "") + '>Outline</option>'
              +     '</select></label>'
              +     '<label>Header style <select name="headerStyle">'
              +       '<option value="band"' + (skin.headerStyle !== "minimal" && skin.headerStyle !== "accent-bar" ? " selected" : "") + '>Band</option>'
              +       '<option value="minimal"' + (skin.headerStyle === "minimal" ? " selected" : "") + '>Minimal</option>'
              +       '<option value="accent-bar"' + (skin.headerStyle === "accent-bar" ? " selected" : "") + '>Accent bar</option>'
              +     '</select></label>'
              +     '<div class="skin-bg-upload-card">'
              +       '<div class="skin-bg-upload-copy">'
              +         '<strong>Upload custom background</strong>'
              +         '<span class="meta">Image behind everything. Picking a file sets Background type → Image (cover + scroll), live-previews, then click Publish look.</span>'
              +       '</div>'
              +       '<label class="skin-bg-file">Choose image'
              +         '<input type="file" id="skin-bg-input" accept="image/png,image/jpeg,image/gif,image/webp" /></label>'
              +       (skin.bgImage || window.__skinBgPending
                  ? ('<div class="skin-bg-thumb-wrap">'
                    + '<img class="skin-bg-thumb" alt="Current background" src="' + esc(window.__skinBgPending || skin.bgImage) + '" />'
                    + '<button type="button" class="text-btn" data-skin-clear-bg="1">Clear image</button></div>')
                  : '')
              +     '</div>'
              +     '<p class="meta">Rights: only upload images you own. Large photos are resized/compressed to fit; huge GIFs still reject ~900KB. Stored as a data URL in this browser (localStorage).</p>' 
              +     '<label class="skin-bg-file">Banner image (thin strip under Me nav)'
              +       '<input type="file" id="skin-banner-input" accept="image/png,image/jpeg,image/gif,image/webp" /></label>'
              +     '<label class="check-row"><input type="checkbox" name="clearBanner" /> Clear banner</label>'
              +     (skin.bannerImage ? '<p class="meta">Banner saved. Check Clear banner or publish a new one to replace.</p>' : '')
              +     '<input type="hidden" name="bgImage" id="skin-bg-data" value="" />'
              +     '<input type="hidden" name="keepImage" value="' + (skin.bgImage ? "1" : "0") + '" />'
              +     '<input type="hidden" name="keepBanner" value="' + (skin.bannerImage ? "1" : "0") + '" />'
              +     '<div class="cp-edit-actions"><button type="submit">Publish look</button>'
              +       '<button type="button" class="text-btn" data-profile-edit-cancel="1">Done</button></div>'
              +     '<p class="meta" id="skin-msg"></p>'
              +   '</form></div>')
            : '')
      +   '</div>'

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
      + '</div></div></section>';
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
    // How this works: include other local accounts in whirled2.users so multi-login friend requests work.
    try {
      var users = JSON.parse(localStorage.getItem("whirled2.users") || "{}");
      Object.keys(users).forEach(function (uid) {
        var u = users[uid];
        if (u) add({ id: u.id || uid, name: u.name || uid, online: false });
      });
    } catch (eU) {}
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
        + (isOn ? '<span class="dot on pulse friend-online-dot" title="Online"></span>' : '')
        + '<div class="friend-list-main">'
        +   '<button type="button" class="text-btn friend-list-name" data-profile="' + esc(f.id) + '"><b>' + esc(f.name) + '</b></button>' + roleBadgeHtml(getRole(f.id))
        +   '<div class="sub">' + (st ? esc(st) : '<span class="meta">No status</span>') + '</div>'
        +   '<div class="meta">' + (isOn ? "Online · " : "") + esc(loc) + '</div>'
        + '</div>'
        + '<div class="friend-list-actions">'
        +   (isOn ? '<button type="button" class="action-btn" data-join-them="1" data-join-name="' + esc(f.name) + '">Join them!</button>' : '')
        +   '<button type="button" class="action-btn" data-whisper="' + esc(f.id) + '" data-whisper-name="' + esc(f.name) + '">Whisper</button>'
        +   '<button type="button" class="action-btn" data-mail-to="' + esc(f.id) + '" data-mail-name="' + esc(f.name) + '">Send Mail</button>'
        +   '<button type="button" class="action-btn" data-enter-room="loft">Visit Home</button>'
        +   '<button type="button" class="action-btn" data-remove-friend="' + esc(f.id) + '">Remove</button>'
        + '</div></div>';
    }
    var incoming = loadFriendRequests().filter(function (r) {
      return r && r.status === "pending" && session() && String(r.toId) === String(session().user.id);
    });
    var outgoing = loadFriendRequests().filter(function (r) {
      return r && r.status === "pending" && session() && String(r.fromId) === String(session().user.id);
    });
    var reqSection = '<div class="section-label">Requests'
      + (incoming.length ? (' <span class="me-badge">' + incoming.length + '</span>') : '')
      + '</div>';
    if (incoming.length) {
      reqSection += incoming.map(function (r) {
        return '<div class="friend-list-row friend-request-row">'
          + '<span class="ava">' + esc(String(r.fromName || "?").slice(0, 1).toUpperCase()) + '</span>'
          + '<div class="friend-list-main">'
          +   '<button type="button" class="text-btn friend-list-name" data-profile="' + esc(r.fromId) + '"><b>' + esc(r.fromName) + '</b></button>'
          +   '<div class="meta">' + esc(r.message || "Let\'s be buddies!") + '</div>'
          + '</div>'
          + '<div class="friend-list-actions">'
          +   '<button type="button" class="action-btn" data-friend-accept="' + esc(r.id) + '">Accept</button>'
          +   '<button type="button" class="action-btn" data-friend-decline="' + esc(r.id) + '">Decline</button>'
          + '</div></div>';
      }).join("");
    } else {
      reqSection += '<p class="meta">No incoming requests. Multi-account tip: register/login as another local user on this browser to Accept an invite you sent.</p>';
    }
    if (outgoing.length) {
      reqSection += '<div class="section-label">Pending you sent</div>' + outgoing.map(function (r) {
        return '<div class="friend-list-row">'
          + '<div class="friend-list-main"><b>' + esc(r.toName) + '</b><div class="meta">Waiting…</div></div>'
          + '<div class="friend-list-actions">'
          +   '<button type="button" class="action-btn" data-friend-retract="' + esc(r.id) + '">Retract</button>'
          + '</div></div>';
      }).join("");
    }
    var rows = "";
    if (online.length) {
      rows += '<div class="section-label">Online</div>' + online.map(function (f) { return friendListRow(f, true); }).join("");
    }
    if (offline.length) {
      rows += '<div class="section-label">Recent</div>' + offline.map(function (f) { return friendListRow(f, false); }).join("");
    }
    if (!list.length) {
      rows = '<p class="meta">No friends yet. Search below or open someone\'s profile and hit Invite.</p>';
    }
    rows = reqSection + rows;
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
        var rel = friendRelation(p.id);
        var act = "";
        if (rel === "friends") act = '<span class="meta">Friend</span>';
        else if (rel === "pending_by_you") {
          var rq = findPendingRequest(session().user.id, p.id);
          act = '<span class="meta">Pending…</span>' + (rq ? ' <button type="button" class="action-btn" data-friend-retract="' + esc(rq.id) + '">Retract</button>' : '');
        } else if (rel === "pending_to_you") {
          var rq2 = findPendingRequest(p.id, session().user.id);
          act = (rq2 ? '<button type="button" class="action-btn" data-friend-accept="' + esc(rq2.id) + '">Accept</button><button type="button" class="action-btn" data-friend-decline="' + esc(rq2.id) + '">Decline</button>' : '');
        } else {
          act = '<button type="button" class="action-btn" data-add-friend="' + esc(p.id) + '" data-friend-name="' + esc(p.name) + '">Invite</button>';
        }
        return '<div class="friend-list-row' + (p.online ? " is-online" : "") + '">'
          + '<span class="ava">' + esc(String(p.name || "?").slice(0, 1).toUpperCase()) + '</span>'
          + '<div class="friend-list-main">'
          +   '<button type="button" class="text-btn friend-list-name" data-profile="' + esc(p.id) + '"><b>' + esc(p.name) + '</b></button>' + roleBadgeHtml(getRole(p.id))
          +   '<div class="meta">permaname ' + esc(p.id) + (p.online ? " · online" : "") + '</div>'
          + '</div>'
          + '<div class="friend-list-actions">'
          +   act
          +   '<button type="button" class="action-btn" data-mail-to="' + esc(p.id) + '" data-mail-name="' + esc(p.name) + '">Send Mail</button>'
          +   '<button type="button" class="action-btn" data-whisper="' + esc(p.id) + '" data-whisper-name="' + esc(p.name) + '">Whisper</button>'
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
    var preSubject = (composeTo && composeTo.subject) || "";
    var preBody = (composeTo && composeTo.body) || "";
    var listHtml = inbox.length ? inbox.map(function (m) {
      var mine = m.fromId === me.id;
      var unread = !m.read && m.toId === me.id;
      var replyBtn = mine ? "" : ('<button type="button" class="action-btn" data-mail-reply="' + esc(m.id) + '">Reply</button>'
        + '<button type="button" class="action-btn" data-mail-followup="' + esc(m.id) + '">Follow up</button>');
      var giftNote = "";
      if (m.giftItem) {
        giftNote = m.giftClaimed
          ? '<div class="meta">Gift: ' + esc(m.giftItem.name || "item") + ' (claimed)</div>'
          : '<div class="meta mail-gift-tag">🎁 Gift attached: ' + esc(m.giftItem.name || "item") + (mine ? "" : " — open to claim") + '</div>';
      }
      return '<div class="mail-row' + (unread ? " unread" : "") + '" data-mail-id="' + esc(m.id) + '">'
        + '<label class="mail-check"><input type="checkbox" class="mail-select" data-mail-select="' + esc(m.id) + '" /></label>'
        + '<div class="mail-meta"><b>' + esc(mine ? ("To " + m.toName) : ("From " + m.fromName)) + '</b>'
        + '<time>' + esc((m.at || "").slice(0, 16).replace("T", " ")) + '</time></div>'
        + '<div class="mail-subject">' + esc(m.subject) + (unread ? ' <span class="mail-unread-dot">●</span>' : '') + '</div>'
        + giftNote
        + '<div class="mail-body">' + esc(m.body) + '</div>'
        + '<div class="mail-row-actions">' + replyBtn
        +   '<button type="button" class="action-btn danger" data-mail-delete="' + esc(m.id) + '">Delete</button>'
        + '</div></div>';
    }).join("") : '<p class="meta">No mail yet.</p>';
    var friendOpts = friends.map(function (f) {
      return '<option value="' + esc(f.id) + '"' + (f.id === preTo ? " selected" : "") + '>' + esc(f.name) + '</option>';
    }).join("");
    return '<section class="page me-page">' + meSubnav()
      + '<div class="mail-layout">'
      +   '<div class="panel"><h2>Inbox</h2>'
      +     '<div class="mail-toolbar">'
      +       '<button type="button" class="action-btn" data-mail-select-all="1">Select All</button>'
      +       '<button type="button" class="action-btn danger" data-mail-delete-selected="1">Delete Selected</button>'
      +     '</div>'
      +     listHtml + '</div>'
      +   '<div class="panel"><h2>Compose</h2>'
      +     '<form class="mail-form" id="mail-form">'
      +       '<label>To friend <select name="friendId"><option value="">— pick a friend —</option>' + friendOpts + '</select></label>'
      +       '<label>Or free id <input name="toId" maxlength="40" placeholder="player id" value="' + esc(preTo && !friends.some(function(f){return f.id===preTo;}) ? preTo : "") + '" /></label>'
      +       '<label>Name <input name="toName" maxlength="40" placeholder="display name" value="' + esc(preName) + '" /></label>'
      +       '<label>Subject <input name="subject" maxlength="120" required value="' + esc(preSubject) + '" /></label>'
      +       '<label>Message <textarea name="body" rows="5" maxlength="2000" required>' + esc(preBody) + '</textarea></label>'
      +       '<button type="submit">Send Mail</button>'
      +       '<p class="meta" id="mail-msg">Stored in this browser (localStorage).</p>'
      +     '</form></div>'
      + '</div></section>';
  }
  function mePassport() {
    var sid = session().user.id;
    var me = you();
    var earned = loadPassport(sid);
    var have = {};
    earned.forEach(function (s) { if (s && s.id) have[s.id] = s; });
    var prog = loadPassportProg(sid);
    var earnedCount = STAMP_CATALOG.filter(function (st) { return !!have[st.id]; }).length;
    var totalCount = STAMP_CATALOG.length;
    var stampSections = PASSPORT_CATS.map(function (c) {
      var list = STAMP_CATALOG.filter(function (st) { return st.cat === c.id; });
      var grid = '<div class="stamp-grid">' + list.map(function (st) {
        var got = !!have[st.id];
        var cur = Number(prog[st.action]) || 0;
        var pct = Math.min(100, Math.round((cur / Math.max(1, st.need)) * 100));
        var tip = got ? ("Earned: " + st.tip) : ("Locked — " + st.tip + (st.need > 1 ? (" (" + Math.min(cur, st.need) + "/" + st.need + ")") : ""));
        // How this works (?v=20260906at): classic passport seal — pale-blue medal chip, no fake economy.
        var seal = got ? "★" : "○";
        return '<div class="stamp-cell' + (got ? " is-earned" : " is-locked") + '" title="' + esc(tip) + '">'
          + '<span class="stamp-seal" aria-hidden="true">' + seal + '</span>'
          + '<span class="stamp-name">' + esc(st.name) + '</span>'
          + '<span class="meta">' + (got ? "Earned" : "Locked") + '</span>'
          + (got ? "" : '<div class="stamp-prog" aria-hidden="true"><i style="width:' + pct + '%"></i></div>')
          + '<button type="button" class="action-btn stamp-go" data-passport-go="' + esc(st.id) + '">Go!</button>'
          + '</div>';
      }).join("") + '</div>';
      return '<div class="passport-cat">'
        + '<div class="passport-cat-head"><h3>' + esc(c.label) + '</h3></div>'
        + grid + '</div>';
    }).join("");
    return '<section class="page me-page passport-page">' + meSubnav()
      + '<div class="panel passport-shell">'
      +   '<div class="passport-head"><h1>My Passport</h1>'
      +     '<p class="meta">Earn stamps by mingling, playing, creating, and shopping. Each new stamp grants +25 coins (play currency). Progress is saved in this browser.</p>'
      +     '<p class="meta">Progress: <b>' + earnedCount + '</b> / ' + totalCount + ' stamps · keys <code>whirled2.passport.' + esc(sid) + '</code> + <code>whirled2.passportProg.' + esc(sid) + '</code></p>'
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
      // How this works (20260906af): Friendly People toggle — demo ignores Level 10 / 20-friends gate.
      // Beginner: turn on to appear on others' Me → Friendly People and auto-accept friend requests.
      // ENGINE DEV: flag is whirled2.friendly.{userId} only — no invented helpers.
      + '<div class="panel friendly-toggle-panel">'
      +   '<h2>Friendly People</h2>'
      +   '<p class="meta">Classic Whirled showed helpers who auto-accept friend requests. Whirled2 demo: toggle freely (no Level 10 gate).</p>'
      +   '<label class="check-row friendly-check">'
      +     '<input type="checkbox" data-friendly-toggle="1"' + (isFriendly(sid) ? " checked" : "") + ' /> '
      +     'I am a Friendly Person (auto-accept friend requests)</label>'
      +   '<p class="meta" id="friendly-toggle-msg">' + (isFriendly(sid) ? "You appear on Me → Friendly People for others on this browser." : "Off — you will not auto-accept.") + '</p>'
      + '</div>'
      + '<div class="panel">'
      +   '<h2>Other sign-in</h2>'
      +   '<p class="meta">Username / password is primary (no Meta App ID steps).</p>'
      +   (me.discord || me.discordId
            ? ('<p class="meta discord-account-row">Discord — <b>Linked</b> '
              + (me.discordUsername ? (' ' + discordLinkedBadgeHtml(me)) : '')
              + '</p>')
            : '<p class="meta">Discord — use <b>Continue with Discord</b> on the gate (demo server) to create/link your account.</p>')
      +   '<p class="meta">Google — <span class="club-badge-soon">Coming Soon</span></p>'
      +   '<p class="meta">GitHub / Apple OAuth also need a developer app — none are zero-setup on a static site.</p>'
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
    // How this works: visitors see this player's saved profile skin via applyProfileSkinDom after paint.
    // ENGINE DEV: profile page chrome only; not #stage-slot.
    var skin = loadProfileSkin(id);
    var photoHtml = photo
      ? '<img class="profile-photo" src="' + photo + '" alt="" width="80" height="60" />'
      : '<div class="profile-photo missing"><span>' + esc(initials) + '</span></div>';
    wall = wall.filter(function (w) { return !w.fromId || !isBlocked(w.fromId); });
    // How this works (20260906af): profile owner or comment author can Delete.
    var wallHtml = wall.length ? wall.map(function (w) {
      return wallRowHtml(w, id);
    }).join("") : '<p class="meta">No comments yet.</p>';
    var isSelf = session() && session().user.id === id;
    var member = "";
    try { member = localStorage.getItem("whirled2.since." + id) || ""; } catch (e) {}
    return '<section class="page me-page profile-page">' + meSubnav()
      + (skin.bannerImage ? ('<div id="profile-banner" class="profile-banner" style="background-image:url(\'' + String(skin.bannerImage).replace(/'/g, '') + '\')"></div>') : '<div id="profile-banner" class="profile-banner" hidden></div>')
      + '<div class="profile-skin">'
      + '<div class="classic-profile">'
      +   '<div class="cp-header">'
      +     '<div class="cp-photo">' + photoHtml + '</div>'
      +     '<div class="cp-main">'
      +       '<div class="cp-name-row"><span class="cp-name">' + esc(name) + '</span>' + roleBadgeHtml(getRole(id)) + '<span class="level-badge">Level 1</span></div>'
      +       '<div class="cp-status">' + (st ? esc(st) : '<span class="meta">No status set</span>') + '</div>'
      +       (skin.motto ? ('<div class="cp-motto">' + esc(skin.motto) + '</div>') : '')
      +       (skin.tagline ? ('<div class="cp-tagline">' + esc(skin.tagline) + '</div>') : '')
      +       profileActionRow({
            poke: isSelf ? '' : ('data-poke="' + esc(id) + '" data-poke-name="' + esc(name) + '"'),
            friendHtml: isSelf ? '' : friendActionButtonsHtml(id, name),
            copyInvite: 'data-copy-invite="profile" data-copy-invite-id="' + esc(id) + '"',
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
      + '</div></div></section>';
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
                : '<div class="swatch swatch-empty" aria-hidden="true"></div>';
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
    // How this works: ledger filter All / Coins / Bars. Bling cash-out stays Coming Soon.
    var rows = loadTransactions();
    var filt = txFilter || "all";
    if (filt === "coins") {
      rows = rows.filter(function (tx) { return (Number(tx.coins) || 0) !== 0; });
    } else if (filt === "bars") {
      rows = rows.filter(function (tx) { return (Number(tx.bars) || 0) !== 0; });
    }
    var snap = session() && session().user ? getWalletSnapshot(session().user.id) : { coins: 0, bars: 0, streakDays: 0 };
    function amtBits(tx) {
      var bits = [];
      if (tx.coins) bits.push((tx.coins > 0 ? "+" : "") + tx.coins + " coins");
      if (tx.bars) bits.push((tx.bars > 0 ? "+" : "") + tx.bars + " bars");
      return bits.length ? (' <span class="meta">(' + esc(bits.join(", ")) + ')</span>') : "";
    }
    var list = rows.length
      ? rows.map(function (tx) {
          return '<div class="tx-row">'
            + '<div><b>' + esc(tx.kind || "event") + '</b> — ' + esc(tx.label || "")
            + amtBits(tx)
            + '<div class="meta">' + esc(tx.note || "Coins & Bars are play currency — no real-money purchases on Whirled2.") + '</div></div>'
            + '<time class="meta">' + esc((tx.at || "").slice(0, 16).replace("T", " ")) + '</time>'
            + '</div>';
        }).join("")
      : '<p class="meta">No transactions yet. Daily login, passport stamps, status, and friend accepts append earn rows.</p>';
    var filters = [["all", "All"], ["coins", "Coins"], ["bars", "Bars"]].map(function (f) {
      return '<button type="button" class="sort-btn' + (filt === f[0] ? " is-on" : "") + '" data-tx-filter="' + f[0] + '">' + f[1] + '</button>';
    }).join(" ");
    return '<section class="page me-page">' + meSubnav()
      + '<div class="panel"><h2>My Transactions</h2>'
      + '<p class="shop-banner">Coins &amp; Bars are play currency — no real-money purchases on Whirled2.</p>'
      + '<p class="meta">Balances: <b>' + esc(String(snap.coins)) + ' coins</b> · <b class="bars-accent">' + esc(String(snap.bars)) + ' bars</b>'
      + ' · streak Day ' + esc(String(snap.streakDays || 0))
      + ' · ledger <code>whirled2.transactions</code> + wallet <code>whirled2.wallet.{userId}</code></p>'
      + '<p class="meta">Bling cash-out: <span class="club-badge-soon">Coming Soon</span> — no PayPal / no cash-out yet.</p>'
      + '<div class="tx-filters" role="group" aria-label="Filter transactions">' + filters + '</div>'
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
    // How this works: Me → Club shows 2026 tier cards (Free / Supporter / Creator / Studio).
    // Beginner: nothing to buy — every paid card is Coming Soon. Notify-me is localStorage only.
    // ENGINE DEV: chrome preview only — see MEMBERSHIP.md; never gate #stage-slot on a tier.
    var sid = session() && session().user ? session().user.id : "guest";
    var note = "";
    try { note = localStorage.getItem("whirled2.clubNotify." + sid) || ""; } catch (e) {}
    var interested = false;
    try { interested = localStorage.getItem("whirled2.clubInterested." + sid) === "1"; } catch (e2) {}

    function tierCard(opts) {
      // How this works: one visual card per tier. Free is current; others show Coming Soon CTAs.
      opts = opts || {};
      var soon = !!opts.soon;
      var current = !!opts.current;
      return ''
        + '<article class="club-tier-card club-tier-' + esc(opts.id || "free")
        + (current ? " is-current" : "")
        + (soon ? " is-soon" : "") + '">'
        +   (soon ? '<span class="club-badge-soon">Coming Soon</span>' : '<span class="club-badge-free">Your plan</span>')
        +   '<div class="club-tier-icon" aria-hidden="true">' + (opts.icon || "★") + '</div>'
        +   '<h3 class="club-tier-name">' + esc(opts.name || "") + '</h3>'
        +   '<p class="club-tier-price meta">' + esc(opts.price || "") + '</p>'
        +   '<p class="club-tier-blurb">' + esc(opts.blurb || "") + '</p>'
        +   '<ul class="club-tier-perks">'
        +     (opts.perks || []).map(function (p) {
          return '<li>' + esc(p) + '</li>';
        }).join("")
        +   '</ul>'
        +   (soon
          ? '<button type="button" class="action-btn club-tier-cta" disabled title="No payments on this mock">Coming Soon</button>'
          : '<button type="button" class="action-btn club-tier-cta is-on" disabled>Free — active</button>')
        + '</article>';
    }

    var cards = ''
      + tierCard({
          id: "free",
          name: "Free",
          icon: "⌂",
          price: "$0 forever",
          blurb: "Hang out, make friends, make stuff — the whole social world stays open.",
          current: true,
          soon: false,
          perks: [
            "Home loft + Rooms lobby preview",
            "Chat, Stuff, Games, Groups, Shop browse",
            "Earn Coins & Bars via daily streaks (play currency)",
            "Profile look + browser themes"
          ]
        })
      + tierCard({
          id: "supporter",
          name: "Supporter",
          icon: "✦",
          price: "Optional tip / soft sub later",
          blurb: "Thank-you flair for fans who keep the lights on — cosmetics first, never pay-to-win.",
          soon: true,
          perks: [
            "Club mark / name flair (classic star vibe)",
            "Modest coin-earn bonus (may)",
            "Free party create + member comment tint",
            "Early chrome cosmetics"
          ]
        })
      + tierCard({
          id: "creator",
          name: "Creator",
          icon: "✎",
          price: "Sell stuff · small platform cut",
          blurb: "For avatar & furniture makers. You sell; Whirled2 takes a small published cut later.",
          soon: true,
          perks: [
            "Sell avatars & Stuff in Shop",
            "Small platform cut (target ~10–15% — TBD, not live)",
            "Creator badge + listing tools",
            "Sales stub / analytics later"
          ]
        })
      + tierCard({
          id: "studio",
          name: "Studio",
          icon: "◈",
          price: "Teams / group managers later",
          blurb: "Classic “themed Whirled” energy — extra rooms, theme tools, manager seats.",
          soon: true,
          perks: [
            "Extra room slots beyond home loft",
            "Themed Whirled / group theme tools",
            "Manager seats + Studio mark",
            "Reduced theme / room costs (may)"
          ]
        });

    return '<section class="page me-page club-page">' + meSubnav()
      + '<div class="panel club-hero">'
      +   '<div class="club-badge-soon">Coming Soon</div>'
      +   '<h2>Club / Membership</h2>'
      +   '<p>Four clear tiers for Whirled2 — researched from classic Whirled / Club Whirled lessons. '
      +     '<b>Nothing to buy today.</b> Full design notes: <code>MEMBERSHIP.md</code>.</p>'
      +   '<p class="meta">Coins &amp; Bars stay play currency (earn-only Bars). <b>No live payments</b> / no Buy Bars on this mock.</p>'
      + '</div>'
      + '<div class="club-tier-grid" role="list">' + cards + '</div>'
      + '<div class="panel">'
      +   '<h2>Why these tiers?</h2>'
      +   '<p class="meta">Three Rings-era Whirled kept play free and sold optional bars/support. Community <b>Club Whirled</b> added a star, monthly bars, and listing perks — but one VIP tier + Buy Bars was confusing. '
      +     'Whirled2 splits <b>Supporter</b> (flair) from <b>Creator</b> (sell avatars with a small platform cut) and <b>Studio</b> (group managers). All may / subject to change.</p>'
      +   '<ul class="club-may-list">'
      +     '<li>Free core must stay fun without paying</li>'
      +     '<li>Creator cut will be published before any real checkout</li>'
      +     '<li>No fake member counts or live prices on Pages</li>'
      +   '</ul>'
      + '</div>'
      + '<div class="panel club-disclaimer">'
      +   '<h2>Disclaimer</h2>'
      +   '<p><b>Whirled2</b> is <b>not affiliated</b> with Three Rings Design, the operators of whirled.club, or any official Whirled commercial entity. We do not claim to be official whirled.club.</p>'
      +   '<p>Whirled2 is a same-game-spirit revival on a <b>new engine</b>, informed by public research, community docs, and the open-source <a href="https://github.com/greyhavens/msoy" target="_blank" rel="noopener">greyhavens/msoy</a> reference (BSD) — not a Flash/msoy port and not a private-engine dump.</p>'
      +   '<p>Features you see here are <b>prototypes</b>. Tiers, cuts, and perks may appear or disappear before any launch. <b>Nothing is final.</b></p>'
      +   '<p class="meta">Full IP / upload rules: <button type="button" class="text-btn" data-legal-open="1">Legal / Disclaimer</button>. Coins &amp; Bars — no payments.</p>'
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
      + '<p class="meta">Copy the Pages URL and invite a friend. Coins & Bars are play currency.</p>'
      + '<label class="invite-link-label">Pages URL'
      +   '<input id="share-whirled-url" readonly value="' + esc(url) + '" />'
      + '</label>'
      + '<div class="invite-them-actions">'
      +   '<button type="button" class="action-btn" data-share-copy="1">Copy URL</button>'
      + '</div>'
      + '<p class="meta" id="share-copy-msg"></p>'
      + '</div></section>';
  }


  function meRooms() {
    // How this works (20260906af): Me → My Rooms — owned room tiles + Create Room (classic pay path).
    // Beginner: first room free; later 10,000 coins OR 1 bar from earn-only wallet.
    // ENGINE DEV: create only writes whirled2.rooms; Enter still mounts via #stage-slot later.
    var sid = session() && session().user && session().user.id;
    var owned = ownedRoomsFor(sid);
    var createBlock = createRoomOpen || owned.length === 0
      ? createRoomPanelHtml({ closeable: owned.length > 0 })
      : '<button type="button" class="action-btn" data-create-room-open="1">Create Room…</button>';
    return '<section class="page me-page me-rooms-page">' + meSubnav()
      + '<div class="page-head"><div><h1>My Rooms</h1>'
      + '<p>Rooms you own on this browser. Create a new home-like room (classic Me → My Rooms).</p></div></div>'
      + '<div class="section-label">Your rooms (' + owned.length + ')</div>'
      + myRoomsTilesHtml(sid, { includeLoftFallback: false })
      + (owned.length ? '' : '<p class="meta">Studio Loft stays in the Rooms lobby Featured seed — create below for your own My Rooms list.</p>')
      + createBlock
      + '<p class="meta">Doors / Make Door from decorate — Coming Soon. Snapshot lobby thumbs — Coming Soon.</p>'
      + '</section>';
  }

  // ---------------------------------------------------------------------------
  // Me tab — profile, mail, friends, Profile look, Club, Transactions
  // Beginner: Profile look = BG/font/modules on your profile page (not room stage).
  // ENGINE DEV: profile skins never apply to #stage-slot.
  // ---------------------------------------------------------------------------
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
    if (meSub === "notices") return meNotices();
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
    if (meSub === "rooms") return meRooms();
    return meHome();
  }



  // ---------------------------------------------------------------------------
  // Gate (logged out) + Shell (logged in chrome) + paint(tab) redraw
  // How this works: paint("rooms"|"me"|...) replaces #main innerHTML from state.

  // Facebook Connect removed (?v=20260906ac): Meta App ID setup was required for a static
  // Pages deploy, so Continue with Facebook / Account link-unlink / SDK load paths are gone.
  // Username/password stays primary. Local Discord OAuth when demo server env is set (?v=20260906af).
  // Google remains Coming Soon. ENGINE DEV: auth is chrome session only — do not break #stage-slot.

  function gate() {
    // How this works: Sign Up / Logon with username + password (primary). Discord button fills after status fetch.
    // Beginner (?v=20260906ao): Pages may set WHIRLED_API to tunnel → Discord CTA; hybrid password auth falls back offline.
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
      +   '<div id="gate-discord" class="gate-discord">'
      +     '<p class="meta">Discord — checking demo server…</p>'
      +   '</div>'
      +   '<p class="meta">Username / password is the primary sign-in. Google — Coming Soon (need OAuth app setup).</p>'
      +   '<p class="meta">Offline preview stays in this browser. Shared chat + shared soundtrack need server/server.mjs.</p>'
      +   '<p class="gate-legal meta">By continuing you agree not to upload copyrighted material you do not own. '
      +     '<button type="button" class="text-btn" data-legal-open="1">Legal / Disclaimer</button></p>'
      + '</div></section>';
  }
  // ---------------------------------------------------------------------------
  // Shell — topbar tabs + persistent chat bar + room music dock
  // Beginner: Help | Developers | Legal live in the who-links row.
  // ENGINE DEV: #room-embed-dock stays outside #main so paint never kills music iframe.
  // ---------------------------------------------------------------------------
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
      // How this works (20260906ai): SVG mail + bell — avoid high-codepoint emoji tofu on phones.
      // Beginner: same buttons as before; icons are tiny inline SVGs (pale-blue ink).
      +       '<button type="button" class="mail mail-btn" data-me="mail" title="Mail">'
      +         '<svg class="who-ico" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">'
      +           '<path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"/>'
      +         '</svg> <u>(' + unreadCount() + ')</u></button>'
      +       '<button type="button" class="notice-bell-btn" data-me="notices" title="Notices">'
      +         '<svg class="who-ico" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">'
      +           '<path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z"/>'
      +         '</svg>'
      +         (unreadNoticesCount() ? (' <u>(' + unreadNoticesCount() + ')</u>') : '')
      +       '</button>'
      +       '<b>' + esc(me.name) + '</b>'
      +       '<span class="sep">|</span>'
      +       '<button type="button" class="text-btn" data-me="club" title="Membership">Club</button>'
      +       '<span class="sep">|</span>'
      +       '<button type="button" class="text-btn" data-help-open="1">Help</button>'
      +       '<span class="sep">|</span>'
      +       '<button type="button" class="text-btn" data-dev-hub-open="1" title="Developer Information Hub">Developers</button>'
      +       '<span class="sep">|</span>'
      +       '<button type="button" class="text-btn" data-legal-open="1">Legal</button>'
      +       '<span class="sep">|</span>'
      +       '<button type="button" id="logout-btn" class="text-btn">Logoff</button>'
      +     '</div>'
      +     '<div class="row who-stats">'
      +       '<button type="button" class="stat coins wallet-coins" data-me="transactions" title="Coins — open Transactions">' + esc(String(me.coins)) + ' <span class="stat-label">coins</span></button>'
      +       '<button type="button" class="stat bars wallet-bars" data-me="transactions" title="Bars — open Transactions">' + esc(String(me.bars || 0)) + ' <span class="stat-label">bars</span></button>'
      +       '<span class="stat level" title="Level">Lv 1</span>'
      +     '</div>'
      +   '</div>'
      + '</header>'
      + '<div id="main"></div>'
      // How this works: persistent room music dock OUTSIDE #main so paint("rooms") never wipes the iframe.
      // Beginner: Open / Close player keep working after expand — dock stays inside #app for click handlers.
      // ENGINE DEV: do not put #room-embed-dock under .stage-body; do not move it to document.body.
      + '<div id="room-embed-dock" class="room-embed-dock" hidden></div>'
      // How this works (20260906ak): bottom chat bar — crisp SVG icons (no black squares / emoji tofu).
      + '<form class="bar" id="chat-form">'
      +   '<div class="chat-opts-wrap">'
      +   '<button type="button" class="chat-opts" id="chat-opts-btn" title="Chat options" aria-label="Chat options" data-chat-opts="1">'
      +     tbIconSvg("chatopts")
      +   '</button>'
      +   '<div class="chat-opts-menu" id="chat-opts-menu" hidden></div>'
      +   '</div>'
      +   (function () {
            var sm = loadChatUi().speakMode || "speak";
            var label = sm === "think" ? "Think" : (sm === "shout" ? "Shout" : "Speak");
            var ph = sm === "think" ? "Think something…" : (sm === "shout" ? "Shout to the room…" : "Type here to chat!");
            return '<button type="button" class="chat-speak-mode" id="chat-speak-mode" data-chat-speak-cycle="1" title="Cycle Speak / Think / Shout (or use /think /shout)" aria-label="Chat mode">' + label + '</button>'
              + '<input id="chat-input" maxlength="240" placeholder="' + ph + '" autocomplete="off" data-speak-mode="' + sm + '" />';
          })()
      +   '<button class="send" type="submit">send</button>'
      +   '<span class="toolbar">'
      +     volToolbarHtml()
      +     '<span class="tb-go-wrap">'
      +       '<button type="button" class="tb tb-go" title="Go" aria-label="Go" data-tb="go">' + tbIconSvg("go") + '</button>'
      +       goMenuHtml()
      +     '</span>'
      +     '<span class="tb-friends-wrap">'
      +       '<button type="button" class="tb tb-friends" title="Friends" aria-label="Friends" data-tb="friends">' + tbIconSvg("friends") + '</button>'
      +       friendsToolbarPopupHtml()
      +     '</span>'
      +     '<button type="button" class="tb tb-party" title="Parties" aria-label="Parties" data-tb="party">' + tbIconSvg("party") + '</button>'
      +     '<span class="tb-go-wrap tb-room-wrap">'
      +       '<button type="button" class="tb tb-room" title="Room" aria-label="Room" data-tb="room">' + tbIconSvg("room") + '</button>'
      +       '<div class="go-menu room-menu" id="room-menu" hidden>'
      +         '<button type="button" data-room-menu="comment">Comment or rate</button>'
      +         '<button type="button" data-room-menu="decorate">Decorate Room</button>'
      +         '<button type="button" data-room-menu="view-items">View items</button>'
      +         '<button type="button" data-room-menu="clickable">View clickable furniture</button>'
      +         '<button type="button" data-room-menu="snapshot">Take snapshot (stub)</button>'
      +         '<button type="button" data-room-menu="zoom">Zoom (stub)</button>'
      +         '<button type="button" data-room-menu="playlist">View room music</button>'
      +         '<button type="button" data-room-share="1">Share / embed room…</button>'
      +         '<button type="button" data-copy-invite="room">Copy room invite link</button>'
      // How this works (20260906af): wiki Room lock triad — Unlocked / Friends / Locked (owner only).
      // Beginner: room owner picks who may enter. Guests see the current mode but cannot change it.
      // ENGINE DEV: chrome gate via canEnterRoom; does not touch #stage-slot.
      +         '<div class="room-lock-row meta">Room lock (owner)' + (canSetRoomLock(currentRoomId) ? "" : " — view only") + '</div>'
      +         '<button type="button" data-room-lock="unlocked"' + ((loadRoomLock(currentRoomId).mode || "unlocked") === "unlocked" ? ' class="is-on"' : '') + (canSetRoomLock(currentRoomId) ? "" : " disabled") + '>🔓 Unlocked</button>'
      +         '<button type="button" data-room-lock="friends"' + ((loadRoomLock(currentRoomId).mode || "") === "friends" ? ' class="is-on"' : '') + (canSetRoomLock(currentRoomId) ? "" : " disabled") + '>👥 Friends</button>'
      +         '<button type="button" data-room-lock="locked"' + ((loadRoomLock(currentRoomId).mode || "") === "locked" ? ' class="is-on"' : '') + (canSetRoomLock(currentRoomId) ? "" : " disabled") + '>🔒 Locked</button>'
      +         '<button type="button" data-room-menu="lobby">' + (inRoom ? "Leave to lobby" : "Rooms lobby") + '</button>'
      +       '</div>'
      +     '</span>'
      +     '<button type="button" class="tb tb-music" data-open-room-music="1" title="Room music" aria-label="Room music">'
      +       '<svg class="tb-music-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">'
      +         '<path fill="currentColor" d="M9.5 3v11.05A3.5 3.5 0 1 0 12 17.5V8h5V3h-7.5z"/>'
      +       '</svg>'
      +     '</button>'
      +   '</span>'
      + '</form>';
  }
  // ---------------------------------------------------------------------------
  // paint / routes — redraw #main (Me/Stuff/Games/Rooms/Groups/Shop + Help/Dev/Legal)
  // Beginner: one paint path; overlays (help/dev/legal/avatar guide) take priority.
  // ENGINE DEV: #stage-slot only appears inside rooms() roomView — never on Me/Stuff.
  // ---------------------------------------------------------------------------
  function paint(tab) {
    // What: redraw the logged-in shell's #main (or gate) for the chosen tab.
    // How: set data-tab, applyBrowserTheme, replace main HTML, then profile skin or clearProfileSkinDom.
    // Why: one paint path keeps Me→Rooms→Stuff from flashing wrong theme/skin vars.
    // ENGINE DEV: #room-embed-dock stays outside #main; #stage-slot only appears in rooms().
    if (!session()) {
      applyBrowserTheme();
      try { clearProfileSkinDom(); } catch (eGateSkin) {}
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
      // Beginner (?v=20260906ao): always bind Sign Up / Logon when gate is shown.
      try { bindGate(); } catch (eBind) {
        var gePaint = document.getElementById("gate-err");
        if (gePaint) gePaint.textContent = (eBind && eBind.message) ? eBind.message : "Gate buttons failed to bind.";
      }
      try { window.__whirledBoot = true; } catch (e) {}
      return;
    }
    bootstrapRoles(); // ensure admin badges for test / first user before first paint
    // How this works: daily login claim once per calendar day, then shell can show balances.
    try { claimDailyLogin(); } catch (eDaily) {}
    // 20260906q: phones force Overlay chat so Slide never opens a black slab under the stage.
    try { ensureMobileChatOverlay(); } catch (eMob) {}
    // 20260906af: landscape immersion (inRoom + phone landscape) — chrome only around #stage-slot.
    try { bindLandscapeImmersionListeners(); updateLandscapeImmersion(); } catch (eImm) {}
    if (!document.getElementById("main")) {
      // How this works (?v=20260906ao): shell paint must not leave a blank app after login.
      try {
        document.getElementById("app").innerHTML = shell();
      } catch (eShellPaint) {
        throw eShellPaint;
      }
    }
    var tabAttr = tab || "rooms";
    if (tabAttr === "rooms" && !inRoom) tabAttr = "rooms-lobby";
    if (tabAttr === "rooms" && inRoom) tabAttr = "rooms";
    document.getElementById("app").setAttribute("data-tab", tabAttr);
    document.querySelectorAll(".tab").forEach(function (btn) { btn.classList.toggle("is-on", btn.getAttribute("data-tab") === tab); });
    var main = document.getElementById("main");
    if (!main) return;
    applyBrowserTheme();
    // How this works: #room-embed-dock is outside #main — no park needed before innerHTML.
    // Beginner: Open player stays open when you mute or switch YouTube/Spotify in Room music.
    // ENGINE DEV: syncRoomAudio → ensureRoomEmbedDock; ensurePlaylistPanel remounts only when playlistPanelDirty (never while paste field focused; clears dirty instead).
    if (legalOpen || tab === "legal") { legalOpen = true; helpOpen = false; devHubOpen = false; avatarGuideOpen = false; main.innerHTML = legalPage(); }
    else if (devHubOpen || tab === "dev" || tab === "docs") { devHubOpen = true; helpOpen = false; legalOpen = false; avatarGuideOpen = false; main.innerHTML = devHubPage(); }
    else if (avatarGuideOpen) { helpOpen = false; legalOpen = false; devHubOpen = false; main.innerHTML = avatarGuidePage(); }
    else if (helpOpen || tab === "help") { helpOpen = true; legalOpen = false; avatarGuideOpen = false; devHubOpen = false; main.innerHTML = helpPage(); }
    // How this works (QA 20260906ai): rooms-lobby is a CSS state on #app, not a paint tab.
    // Beginner: if something still calls paint("rooms-lobby"), show the Rooms lobby — never the old Groups stub.
    else if (tab === "rooms" || tab === "rooms-lobby") main.innerHTML = rooms();
    else if (tab === "me") main.innerHTML = mePage();
    else if (tab === "stuff") main.innerHTML = stuffPage();
    else if (tab === "shop") main.innerHTML = shopPage();
    else if (tab === "games") main.innerHTML = gamesPage();
    else if (tab === "groups") main.innerHTML = groupsPage();
    else main.innerHTML = rooms();
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
      var lk = (loadRoomLock().mode || "unlocked");
      document.querySelectorAll("[data-room-lock]").forEach(function (btn) {
        btn.classList.toggle("is-on", btn.getAttribute("data-room-lock") === lk);
      });
    } catch (e) {}
    try { ensureStagePlaceholder(); } catch (e) {}
    try { if (decorateMode) bindDecorateDrag(); } catch (e) {}
    try { bindDoorLayerClicks(); } catch (eDoorBind) {}
    try { syncRoomAudio(); } catch (e) {}
    try { ensurePlaylistPanel(); } catch (ePl) {}
    try { if (roomPreviewOpen && !inRoom) ensureRoomPreviewPanel(); } catch (eRp) {}
    // What/How/Why: Profile look only on profile views; every other tab clears leftover skin styles
    // so Me→Rooms→Stuff never flashes a custom BG. ENGINE DEV: chrome only — not #stage-slot.
    try {
      var skinUid = null;
      if (tab === "me" && session()) {
        if (viewingId && viewingId !== session().user.id) skinUid = viewingId;
        else if (meSub === "profile") skinUid = session().user.id;
      }
      if (skinUid) {
        applyProfileSkinDom(skinUid);
        // How this works: double rAF re-apply beats layout flash / competing CSS.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            try {
              // Bail if user already left profile (avoids painting skin onto a gone node).
              if (!document.querySelector(".page.profile-page")) return;
              applyProfileSkinDom(skinUid);
            } catch (e2) {}
          });
        });
      } else {
        clearProfileSkinDom();
      }
    } catch (eSkin) {}
    try { syncHashRoute(tab); } catch (eHash) {}
    try { applyChatInputTint(); } catch (eTint) {}
    try { refreshWalletChrome(); } catch (eWal) {}
    try { ensureDailyRewardModal(); } catch (eMod) {}
    try {
      if (friendsPopupOpen) {
        var fw2 = document.querySelector(".tb-friends-wrap");
        if (fw2 && !document.getElementById("friends-toolbar-pop")) {
          var tmp2 = document.createElement("div");
          tmp2.innerHTML = friendsToolbarPopupHtml();
          if (tmp2.firstChild) fw2.appendChild(tmp2.firstChild);
        }
      }
    } catch (ePop) {}
    // How this works: after room paint, flip multi-frame Worn avatar sprites on #avatar-wear-layer.
    try { startAvatarWearAnim(); } catch (eWearAnim) {}
    try { if (stuffMode === "upload" && stuffCat === "avatars") startAvatarWizardPreviewAnims(); } catch (eWizPrev) {}
    try { applyWearBillboardScale(); } catch (eWearSc) {}
    // Beginner (?v=20260906ao): click loft floor → chrome walk (yields when Pixi mounts).
    try { bindChromeClickToWalk(); } catch (eWalk) {}
    try { bindAvatarEmoteClicks(); } catch (eEmBind) {}
    // Stuff Avatar viewer preview play (when detail is open).
    try { startAvatarViewerAnim(); } catch (eViewAnim) {}
    // ---- MERGE NOTE (?v=20260906ax): mount Ruffle in chrome slots via classic-avatar.js ----
    // Beginner: Experimental Flash preview in Stuff / loft. Never touches chat visit-since.
    // ENGINE DEV: #avatar-ruffle-host only — not #stage-slot.
    try {
      if (window.WhirledClassicAvatar && WhirledClassicAvatar.afterPaint) {
        WhirledClassicAvatar.afterPaint();
      }
    } catch (eClassicPaint) {}
  }
  function ensureStagePlaceholder() {
    // How this works (20260906ak): keep loft backdrop if engine has not mounted yet.
    // Never re-inject the old developer-y stage-copy void text.
    var slot = document.getElementById("stage-slot");
    if (!slot) return;
    var hasEngine = !!(slot.querySelector("canvas") || slot.querySelector("[data-whirled-engine]"));
    if (hasEngine) return;
    if (!slot.querySelector(".loft-backdrop")) {
      slot.innerHTML = stagePlaceholderHtml();
    }
    var host = slot.parentElement;
    if (host && host.classList.contains("stage-host") && !document.getElementById("decorate-layer")) {
      host.insertAdjacentHTML("beforeend", decorateLayerHtml());
    }
    if (host && host.classList.contains("stage-host") && !document.getElementById("avatar-wear-layer")) {
      // How this works: re-attach Wear billboard if room chrome was rebuilt without a full paint.
      host.insertAdjacentHTML("beforeend", avatarWearLayerHtml());
    }
    try { ensureStageBubblesEl(); } catch (e) {}
    try { startAvatarWearAnim(); } catch (eWear) {}
    try { applyWearBillboardScale(); } catch (eSc) {}
    try { bindChromeClickToWalk(); } catch (eWalk2) {}
    try { bindAvatarEmoteClicks(); } catch (eEmBind2) {}
  }
  // Information: refreshChatLog writes both #chat-log (slide) and #chat-overlay (overlay).
  // How this works: active tab (Room vs PM) picks which message array to render.
  function refreshChatLog() {
    var ui = loadChatUi();
    var tabs = loadChatTabs();
    var msgs = activeChatMessages();
    var html = msgs.map(chatRow).join("");
    var body = document.querySelector(".stage-body");
    if (body) {
      body.classList.toggle("chat-mode-slide", ui.mode === "slide");
      body.classList.toggle("chat-mode-overlay", ui.mode === "overlay");
      body.classList.toggle("hide-history", !!ui.hideHistory);
      body.classList.remove("text-size-sm", "text-size-md", "text-size-lg");
      body.classList.add("text-size-" + (ui.textSize || "md"));
      body.classList.toggle("pm-tab-active", !!(tabs.activeTabId && tabs.activeTabId.indexOf("pm:") === 0));
    }
    var tabsEl = document.getElementById("chat-tabs");
    if (tabsEl) {
      var wrap = document.createElement("div");
      wrap.innerHTML = chatTabsHtml();
      if (wrap.firstChild) tabsEl.replaceWith(wrap.firstChild);
    }
    var log = document.getElementById("chat-log");
    if (log) {
      var nearBottom = (log.scrollHeight - log.scrollTop - log.clientHeight) < 48;
      var stick = !chatPinnedScroll || nearBottom;
      log.innerHTML = html;
      // 20260906q: hide empty slide panel (no black void under stage)
      var logEmpty = !msgs.length || !String(html || "").trim();
      log.classList.toggle("is-empty", logEmpty);
      if (stick) log.scrollTop = log.scrollHeight;
    }
    var ov = document.getElementById("chat-overlay");
    if (ov) {
      // How this works (wiki Chat — Slide vs Overlay):
      // Overlay = history on the LEFT of the room window (#chat-overlay in .stage-host).
      // Slide = dark #chat-log panel beside/under the stage. Hide history (F9) is
      // overlay-only. Bottom input bar is always separate chrome.
      // PM tabs always use slide/log path; overlay shows room only when Room tab active.
      var isPm = !!(tabs.activeTabId && tabs.activeTabId.indexOf("pm:") === 0);
      var showOv = !isPm && ui.mode === "overlay" && !ui.hideHistory && msgs.length > 0;
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
    applyChatInputTint();
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
  function pushSystemChat(text, opts) {
    // How this works (?v=20260906ax): optional ephemeral system lines auto-drop so they cannot stick mid-stage.
    opts = opts || {};
    var sid = "sys" + Date.now() + Math.random().toString(36).slice(2, 5);
    chat.push({ id: sid, system: true, text: text, at: new Date().toISOString(), ephemeral: !!opts.ephemeral });
    if (opts.ephemeral) {
      setTimeout(function () {
        try {
          chat = chat.filter(function (m) { return !m || m.id !== sid; });
          refreshChatLog();
        } catch (eEp) {}
      }, opts.ttlMs || 1800);
    }
    if (chat.length > 120) chat = chat.slice(-100);
    refreshChatLog();
  }
  // How this works: room chat is visit-scoped on this mock. Leaving the room,
  // logging off, or a fresh page load wipes history so old sessions don't linger.
  // Chat Options → Clear all chat does the same. clearStorage defaults to true.
  function chatStorageKey(roomId) {
    // How this works: offline fallback key per room (demo API uses in-memory server log).
    roomId = String(roomId || currentRoomId || "loft");
    return "whirled2.chat." + roomId;
  }
  function beginRoomChatVisit(roomId) {
    // How this works (?v=20260906ax): Enter room = clean slate. Stamp visit time; wipe display.
    // Beginner: you will NOT see other people's old demo messages from hours ago.
    roomId = String(roomId || currentRoomId || "loft");
    roomChatRoomId = roomId;
    roomChatVisitSince = new Date().toISOString();
    chat = [];
    try { clearStageBubbles(); } catch (eB) {}
    try { localStorage.removeItem(chatStorageKey(roomId)); } catch (e) {}
    // Also clear legacy loft key so Pages offline cannot resurrect cemetery lines.
    try { localStorage.removeItem("whirled2.chat.loft"); } catch (e2) {}
    try { refreshChatLog(); } catch (e3) {}
    try {
      pushSystemChat("Room chat — fresh for this visit. Older shared log stays on the server until you tap Load earlier.");
    } catch (e4) {}
  }
  function filterMsgsSinceVisit(messages) {
    // How this works: keep only messages at/after this visit (and never resurrect pre-visit cemetery).
    var since = roomChatVisitSince || "";
    var list = Array.isArray(messages) ? messages : [];
    if (!since) return [];
    return list.filter(function (m) {
      if (!m) return false;
      if (m.system) return true; // local system lines already in chat; remote rarely has system
      var at = String(m.at || "");
      return at >= since;
    });
  }
  function mergeVisitChat(incoming) {
    // How this works: merge by id — never replace the whole log with a server dump.
    incoming = filterMsgsSinceVisit(incoming || []);
    if (!incoming.length) return false;
    var have = {};
    chat.forEach(function (m) { if (m && m.id) have[m.id] = true; });
    var added = [];
    incoming.forEach(function (m) {
      if (!m || !m.id || have[m.id]) return;
      // Skip pure seed ghosts with empty text
      if (!m.system && !String(m.text || "").trim()) return;
      chat.push(m);
      have[m.id] = true;
      added.push(m);
    });
    if (chat.length > 120) chat = chat.slice(-100);
    return added;
  }
  function clearRoomChatDisplay(clearStorage) {
    // How this works (?v=20260906ax): Clear my view — empty display + bump visit since so poll cannot refill old lines.
    if (clearStorage === undefined) clearStorage = true;
    roomChatVisitSince = new Date().toISOString();
    if (inRoom) roomChatRoomId = String(currentRoomId || "loft");
    chat = [];
    try { refreshChatLog(); } catch (eR) {}
    try { clearStageBubbles(); } catch (eB) {}
    if (clearStorage) {
      try { localStorage.removeItem(chatStorageKey(roomChatRoomId || currentRoomId || "loft")); } catch (e) {}
      try { localStorage.removeItem("whirled2.chat.loft"); } catch (e2) {}
    }
  }
  function leaveRoomResetChat() {
    // Baby step: leaving a room ends this visit — empty chat and stop visit scoping until next Enter.
    clearRoomChatDisplay(true);
    roomChatVisitSince = "";
    roomChatRoomId = "";
    occFilterQ = "";
    roomEmbedExpanded = false;
    try { removeRoomEmbedDock(); } catch (eD) {}
    try {
      var a = document.getElementById("room-audio");
      if (a) a.pause();
    } catch (eA) {}
  }
  // ---------------------------------------------------------------------------
  // Gate / auth binding — Sign Up, Logon, Discord CTA
  // Beginner: username/password primary; Discord when WHIRLED_API + server secrets.
  // ENGINE DEV: chrome session only — never touches #stage-slot.
  // ---------------------------------------------------------------------------
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
    // How this works: if demo API is live, ask server whether Discord OAuth env is set.
    // Beginner: enabled → Continue with Discord link; else keep Coming Soon (Pages offline too).
    // ENGINE DEV: chrome-only — never touches #stage-slot.
    refreshGateDiscord();
  }
  function refreshGateDiscord() {
    var el = document.getElementById("gate-discord");
    if (!el) return;
    // Beginner (?v=20260906ao): without WHIRLED_API, Pages cannot hold Discord secrets — Coming Soon.
    // With WHIRLED_API (tunnel) + OAuth env → Create account with Discord (creates discord-<id> user).
    var soonPages = '<p class="meta">Discord — <span class="club-badge-soon">Coming Soon</span> on GitHub Pages '
      + '(needs the demo server; secrets cannot sit on a static host).</p>';
    var soonOff = '<p class="meta">Discord — <span class="club-badge-soon">Coming Soon</span> '
      + '(demo server OAuth not configured yet).</p>';
    if (!isDemoApi() || !window.WhirledApi || !window.WhirledApi.discordAuthStatus) {
      el.innerHTML = soonPages;
      return;
    }
    window.WhirledApi.discordAuthStatus().then(function (st) {
      if (!el.isConnected) return;
      if (st && st.enabled) {
        var href = window.WhirledApi.discordAuthStartUrl();
        el.innerHTML = '<p class="gate-discord-row">'
          + '<a class="action-btn gate-discord-btn" href="' + href + '">Create account with Discord</a>'
          + '</p>'
          + '<p class="meta">Creates / links a Whirled2 account via Discord. Your Discord handle shows as a linked badge — not your display name.</p>';
      } else {
        el.innerHTML = soonOff;
      }
    }).catch(function () {
      if (el.isConnected) el.innerHTML = soonOff;
    });
  }
  var _decDrag = null;
  function bindDecorateDrag() {
    // How this works (?v=20260906at): decorate drag + click-select for Make Door.
    var layer = document.getElementById("decorate-layer");
    if (!layer) return;
    if (layer._decBound) return;
    layer._decBound = true;
    layer.addEventListener("pointerdown", function (ev) {
      if (!decorateMode) return;
      if (ev.target.closest("[data-dec-remove]")) return;
      var chip = ev.target.closest(".decorate-chip");
      if (!chip) return;
      ev.preventDefault();
      ev.stopPropagation();
      var id = chip.getAttribute("data-dec-id");
      selectedDecId = id;
      _decDrag = {
        id: id,
        chip: chip,
        ox: ev.clientX - chip.offsetLeft,
        oy: ev.clientY - chip.offsetTop,
        layer: layer,
        startX: ev.clientX,
        startY: ev.clientY,
        moved: false
      };
      try { chip.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    layer.addEventListener("pointermove", function (ev) {
      if (!_decDrag) return;
      if (Math.abs(ev.clientX - _decDrag.startX) > 4 || Math.abs(ev.clientY - _decDrag.startY) > 4) {
        _decDrag.moved = true;
      }
      var x = ev.clientX - _decDrag.ox;
      var y = ev.clientY - _decDrag.oy;
      var maxX = Math.max(0, _decDrag.layer.clientWidth - 56);
      var maxY = Math.max(0, _decDrag.layer.clientHeight - 56);
      x = Math.max(0, Math.min(maxX, x));
      y = Math.max(0, Math.min(maxY, y));
      _decDrag.chip.style.left = x + "px";
      _decDrag.chip.style.top = y + "px";
    });
    function endDrag(ev) {
      if (!_decDrag) return;
      var id = _decDrag.id;
      var moved = _decDrag.moved;
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
      // Tap without drag → select chip (highlight + enable Make Door).
      if (!moved) {
        selectedDecId = id;
        try {
          layer.querySelectorAll(".decorate-chip.is-selected").forEach(function (el) {
            el.classList.remove("is-selected");
          });
          var c = layer.querySelector('.decorate-chip[data-dec-id="' + id + '"]');
          if (c) c.classList.add("is-selected");
        } catch (eSel) {}
      }
    }
    layer.addEventListener("pointerup", endDrag);
    layer.addEventListener("pointercancel", endDrag);
  }
  function bindDoorLayerClicks() {
    // How this works: outside decorate mode, door chips travel on click/tap.
    // Beginner: green 🚪 chips = doors. ENGINE DEV: does not steal floor walk (only .is-door).
    var layer = document.getElementById("decorate-layer");
    if (!layer) return;
    if (layer._doorBound) return;
    layer._doorBound = true;
    layer.addEventListener("click", function (ev) {
      if (decorateMode) return;
      var chip = ev.target.closest(".decorate-chip.is-door");
      if (!chip) return;
      ev.preventDefault();
      ev.stopPropagation();
      var id = chip.getAttribute("data-dec-id");
      travelThroughDoor(id);
    });
  }
  // ---------------------------------------------------------------------------
  // Stage avatar bubbles (#stage-bubbles) — temporary chrome until Pixi nametags
  // How this works: history stays in Slide/Overlay. These float near the bottom
  // "avatar area" for speech / thought (/think) / emote (/me). Not system lines.
  // ENGINE DEV: you may later replace this with Pixi nametag bubbles; until then
  // chrome owns #stage-bubbles. Read getChatUi().bubbleDuration for timing.
  // ---------------------------------------------------------------------------
  var _stageBubbleSeen = {};
  var _stageBubbleTimers = [];
  function bubbleDurationMs() {
    // Purpose: how long stage speech bubbles stay visible.
    // How: short≈2.5s / medium≈4s / long≈7s from chat options.
    // ENGINE DEV: chrome #stage-bubbles timing until Pixi nametags own speech.
    var d = (loadChatUi().bubbleDuration || "medium");
    if (d === "short") return 2500;
    if (d === "long") return 7000;
    return 4000; // medium default ~4s
  }
  function ensureStageBubblesEl() {
    var host = document.querySelector(".stage-host");
    if (!host) return null;
    var el = document.getElementById("stage-bubbles");
    if (el) return el;
    el = document.createElement("div");
    el.id = "stage-bubbles";
    el.className = "stage-bubbles";
    el.setAttribute("aria-live", "polite");
    var overlay = document.getElementById("chat-overlay");
    if (overlay && overlay.parentElement === host) host.insertBefore(el, overlay);
    else host.appendChild(el);
    return el;
  }
  function clearStageBubbles() {
    _stageBubbleSeen = {};
    while (_stageBubbleTimers.length) {
      try { clearTimeout(_stageBubbleTimers.pop()); } catch (e) {}
    }
    var el = document.getElementById("stage-bubbles");
    if (el) el.innerHTML = "";
  }
  function spawnStageBubble(msg) {
    if (!msg || msg.system) return;
    var id = msg.id || ("b" + Date.now() + Math.random());
    if (_stageBubbleSeen[id]) return;
    _stageBubbleSeen[id] = true;
    var host = ensureStageBubblesEl();
    if (!host) return;
    var raw = String(msg.text || "");
    var kind = "speech";
    var text = raw;
    if (msg.emote || /^\/me\s+/i.test(raw) || /^\/emote\s+/i.test(raw)) {
      kind = "emote";
      text = raw.replace(/^\/(me|emote)\s+/i, "");
      text = (msg.who || "?") + " " + text;
    } else if (msg.thought || /^\/think\s+/i.test(raw)) {
      kind = "thought";
      text = raw.replace(/^\/think\s+/i, "");
    } else if (msg.shout || /^\/shout\s+/i.test(raw)) {
      kind = "shout";
      text = raw.replace(/^\/shout\s+/i, "");
    }
    text = String(text || "").trim();
    if (!text) return;
    var bub = document.createElement("div");
    bub.className = "stage-bubble stage-bubble--" + kind;
    bub.setAttribute("data-bubble-id", id);
    // Slightly randomized above bottom-center avatar area
    var leftPct = 42 + (Math.random() * 16 - 8); // ~34–50%
    var bottomPct = 18 + (Math.random() * 10); // ~18–28%
    bub.style.left = leftPct + "%";
    bub.style.bottom = bottomPct + "%";
    if (kind === "thought") {
      bub.innerHTML = '<div class="stage-bubble-cloud">' + esc(text) + "</div>";
    } else if (kind === "emote") {
      bub.innerHTML = "<i>" + esc(text) + "</i>";
    } else if (kind === "shout") {
      bub.innerHTML = '<div class="stage-bubble-speech stage-bubble-shout"><b>' + esc(text) + '</b></div><span class="stage-bubble-pointer" aria-hidden="true"></span>';
    } else {
      bub.innerHTML = '<div class="stage-bubble-speech">' + esc(text) + '</div><span class="stage-bubble-pointer" aria-hidden="true"></span>';
    }
    if (kind !== "emote" && msg.who) {
      var who = document.createElement("div");
      who.className = "stage-bubble-who";
      who.textContent = String(msg.who);
      bub.insertBefore(who, bub.firstChild);
    }
    host.appendChild(bub);
    // Cap visible bubbles
    while (host.children.length > 6) host.removeChild(host.firstChild);
    var ms = bubbleDurationMs();
    var t = setTimeout(function () {
      if (bub.parentNode) bub.parentNode.removeChild(bub);
    }, ms);
    _stageBubbleTimers.push(t);
  }
  function noteStageBubblesFromChat(list) {
    // How this works: when poll/history brings new messages, spawn bubbles for unseen ones.
    (list || []).forEach(function (m) { spawnStageBubble(m); });
  }

  // ---------------------------------------------------------------------------
  // WhirledChrome bridge — engine mounts only via getStageEl() → #stage-slot
  // ---------------------------------------------------------------------------
  // ENGINE DEV: Contract for private WhirledClassicGame (Pixi). Read ENGINE-BRIDGE.md.
  // You (engine developer) mount with mountWhirledEngine(host) where
  //   host = WhirledChrome.getStageEl() === #stage-slot
  //   resizeTo: host — canvas ONLY inside that element.
  // API (version "0.4"):
  //   version, getStageEl(), getSession(), getRoom(), onChat(fn), sendChat(text),
  //   onOccupants(fn), getChatUi() → { mode, hideHistory, textSize, bubbleDuration },
  //   getWornAvatar() (+states), setAvatarState(name), getAvatarWalkTarget(), isChromeWalkActive()
  // Listen for document event "whirled:ready" if bridge is not ready yet (detail = this object).
  // Do NOT draw outside #stage-slot. Do NOT rebuild login. Coins+Bars earn-only (no payments). No Flash.
  // #decorate-layer, #avatar-wear-layer, and #stage-bubbles are chrome siblings above your canvas.
  // ENGINE DEV: Wear billboard is temporary until Pixi owns avatars inside #stage-slot. No Ruffle.
  // Chrome may show temporary #stage-bubbles until you own Pixi nametag bubbles.
  // ---------------------------------------------------------------------------
  function exposeBridge() {
    // ENGINE DEV: wallet is chrome localStorage; getWallet() is optional read-only for engine.
    // Avatar lab wardrobe APIs are experimental read helpers — activeId is NOT applied to #stage-slot.
    window.WhirledChrome = {
      version: "0.4",
      getStageEl: function () { return document.getElementById("stage-slot"); },
      getSession: function () { return session(); },
      getRoom: function () { return { id: "loft", name: ROOM }; },
      onChat: function (fn) { listeners.chat.push(fn); },
      sendChat: function (text) { return window.WhirledApi.postChat(String(currentRoomId || roomChatRoomId || "loft"), text); },
      onOccupants: function (fn) { listeners.occupants.push(fn); fn(occupants()); },
      getChatUi: function () { return loadChatUi(); },
      getWallet: function () {
        var s = session();
        if (!s || !s.user) return { coins: 0, bars: 0, streakDays: 0 };
        return getWalletSnapshot(s.user.id);
      },
      // Experimental (avatar lab): manifest only — never mounts SWF / Ruffle.
      getWardrobe: function () { return loadWardrobe(); },
      getActiveAvatarId: function () {
        var w = loadWardrobe();
        return w && w.activeId ? w.activeId : null;
      },
      // Stuff sprite Wear (modern path): chrome billboard on #avatar-wear-layer — not #stage-slot.
      // ENGINE DEV (?v=20260906ao): worn row may include states{idle,walk,stand,pose}; chrome walk
      // uses setAvatarState / getAvatarWalkTarget until mountWhirledEngine owns #stage-slot.
      getWornAvatar: function () {
        var w = loadWornAvatar();
        if (!w) return null;
        // Ensure states is visible for engine consumers even on legacy worn rows.
        if (!w.states) {
          try { w.states = resolveAvatarStates(w); } catch (e) {}
        }
        return w;
      },
      setAvatarState: function (name) { return setAvatarState(name); },
      playAvatarEmote: function (name) { return playAvatarEmote(name); },
      listAvatarEmotes: function () { return listAvatarEmotes(); },
      getAvatarWalkTarget: function () { return getAvatarWalkTarget(); },
      isChromeWalkActive: function () { return !isEngineMountedOnStage() && !!document.querySelector(".stage-host.chrome-walk-ready"); }
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
      // Wiki /clear — wipe active tab; Room tab also bumps visit since (?v=20260906ax).
      var tabsClr = loadChatTabs();
      if (!tabsClr.activeTabId || tabsClr.activeTabId === "room") clearRoomChatDisplay(true);
      else clearActiveChatTab(true);
      pushNotice("blue", "Chat cleared.", { transient: true });
      return;
    }
    if (/^\/away$/i.test(text)) {
      setAway(true);
      pushSystemChat("You are now away. (Yellow name tint · PM auto-reply note)");
      refreshChatLog();
      return;
    }
    if (/^\/back$/i.test(text)) {
      setAway(false);
      pushSystemChat("You are back.");
      refreshChatLog();
      return;
    }
    if (/^\/speak\s+/i.test(text) || /^\/sp\s+/i.test(text)) {
      text = text.replace(/^\/(speak|sp)\s+/i, "");
    }
    var tabs = loadChatTabs();
    var isPm = !!(tabs.activeTabId && tabs.activeTabId.indexOf("pm:") === 0);
    var now = Date.now();
    chatSendTimes = chatSendTimes.filter(function (t) { return now - t < 3000; });
    if (chatSendTimes.length >= 5) {
      pushSystemChat("You're being too chatty…", { ephemeral: true });
      return;
    }
    chatSendTimes.push(now);
    var emote = false;
    var thought = false;
    var shout = false;
    var sendText = text;
    if (/^\/me\s+/i.test(text) || /^\/emote\s+/i.test(text)) {
      emote = true;
      sendText = text;
    } else if (/^\/think\s+/i.test(text) || /^\/th\s+/i.test(text)) {
      thought = true;
      sendText = text.replace(/^\/(think|th)\s+/i, "/think ");
    } else if (/^\/shout\s+/i.test(text) || /^\/sh\s+/i.test(text)) {
      shout = true;
      sendText = text.replace(/^\/(shout|sh)\s+/i, "");
    } else {
      // Apply compose mode when no slash command.
      var smode = (loadChatUi().speakMode || "speak");
      if (smode === "think") { thought = true; sendText = "/think " + text; }
      else if (smode === "shout") { shout = true; sendText = text; }
    }
    var isGroup = !!(tabs.activeTabId && tabs.activeTabId.indexOf("group:") === 0);
    if (isPm) {
      var oid = tabs.activeTabId.slice(3);
      var s = session();
      var msg = {
        id: "pm" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        who: s && s.user ? s.user.name : "Guest",
        userId: s && s.user ? s.user.id : "guest",
        text: String(sendText).slice(0, 240),
        at: new Date().toISOString(),
        pm: true
      };
      if (emote) msg.emote = true;
      if (thought) msg.thought = true;
      if (shout) msg.shout = true;
      var pmList = loadPmChat(oid);
      pmList.push(msg);
      savePmChat(oid, pmList);
      // Away auto-reply note (stub) when whispering someone who is away.
      if (isAway(oid)) {
        pmList.push({
          id: "sys" + Date.now(),
          system: true,
          text: "(auto-reply) They are away right now.",
          at: new Date().toISOString()
        });
        savePmChat(oid, pmList);
      }
      refreshChatLog();
      try { awardAction("chat"); } catch (e) {}
      return;
    }
    if (isGroup) {
      var gidChat = tabs.activeTabId.slice(6);
      var sG = session();
      var msgG = {
        id: "gc" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        who: sG && sG.user ? sG.user.name : "Guest",
        userId: sG && sG.user ? sG.user.id : "guest",
        text: String(sendText).slice(0, 240),
        at: new Date().toISOString(),
        group: true
      };
      if (emote) msgG.emote = true;
      if (thought) msgG.thought = true;
      if (shout) msgG.shout = true;
      var gList = loadGroupChat(gidChat);
      gList.push(msgG);
      saveGroupChat(gidChat, gList);
      refreshChatLog();
      try { awardAction("chat"); } catch (eG) {}
      return;
    }
    var result = await window.WhirledApi.postChat(String(currentRoomId || roomChatRoomId || "loft"), sendText);
    var msg2 = result.message || result;
    if (emote) msg2.emote = true;
    if (thought) msg2.thought = true;
    if (shout) msg2.shout = true;
    if (!chat.some(function (m) { return m.id === msg2.id; })) chat.push(msg2);
    refreshChatLog();
    spawnStageBubble(msg2);
    listeners.chat.forEach(function (fn) { try { fn(msg2); } catch (e) {} });
    try { awardAction("chat"); } catch (e) {}
  }
  function renderChatOptsMenu() {
    // Purpose: chat options popover (Overlay/Slide, text size, bubble duration, clear).
    // How: fill #chat-opts-menu from loadChatUi(); F9 hide-history is Overlay-only.
    // Why: tidy phone-readable layout. ENGINE DEV: bubble duration drives #stage-bubbles.
    var menu = document.getElementById("chat-opts-menu");
    if (!menu) return;
    var ui = loadChatUi();
    menu.innerHTML = ''
      + '<div class="chat-opts-title">Chat options</div>'
      + '<label class="chat-opts-row" data-chat-mode="overlay"><input type="radio" name="chat-mode" value="overlay"' + (ui.mode === "overlay" ? " checked" : "") + ' /> Overlay chat <span class="meta">(left of room window)</span></label>'
      + '<label class="chat-opts-row" data-chat-mode="slide"><input type="radio" name="chat-mode" value="slide"' + (ui.mode === "slide" ? " checked" : "") + ' /> Slide chat <span class="meta">(own dark panel)</span></label>'
      + '<label class="chat-opts-row' + (ui.mode !== "overlay" ? " is-disabled" : "") + '" data-chat-hide-row="1"><input type="checkbox" data-chat-hide="1"' + (ui.hideHistory ? " checked" : "") + (ui.mode !== "overlay" ? " disabled" : "") + ' /> Hide chat history <span class="meta">(F9)</span></label>'
      + '<div class="chat-opts-title">Text size</div>'
      + '<div class="chat-opts-sizes">'
      +   '<button type="button" class="action-btn' + (ui.textSize === "sm" ? " is-on" : "") + '" data-chat-size="sm">S</button>'
      +   '<button type="button" class="action-btn' + (ui.textSize === "md" ? " is-on" : "") + '" data-chat-size="md">M</button>'
      +   '<button type="button" class="action-btn' + (ui.textSize === "lg" ? " is-on" : "") + '" data-chat-size="lg">L</button>'
      + '</div>'
      + '<div class="chat-opts-title">Chat settings</div>'
      + '<div class="chat-opts-sizes" title="How long stage speech bubbles stay">'
      +   '<button type="button" class="action-btn' + (ui.bubbleDuration === "short" ? " is-on" : "") + '" data-chat-bubble-dur="short">Short</button>'
      +   '<button type="button" class="action-btn' + ((ui.bubbleDuration || "medium") === "medium" ? " is-on" : "") + '" data-chat-bubble-dur="medium">Medium</button>'
      +   '<button type="button" class="action-btn' + (ui.bubbleDuration === "long" ? " is-on" : "") + '" data-chat-bubble-dur="long">Long</button>'
      + '</div>'
      + '<p class="meta" style="margin:4px 8px 8px;font-size:11px">Stage bubble duration (above avatars)</p>'
      + '<div class="chat-opts-title">Groups</div>';
    var joined = myJoinedGroups();
    if (joined.length) {
      menu.innerHTML += joined.map(function (g) {
        return '<button type="button" class="action-btn chat-opts-group" data-open-group-chat="' + esc(g.id) + '" data-group-chat-name="' + esc(g.name || g.id) + '">' + esc(g.name || g.id) + '</button>';
      }).join("");
    } else {
      menu.innerHTML += '<p class="meta" style="margin:4px 8px 8px;font-size:11px">Join a local group to open a group chat tab.</p>';
    }
    menu.innerHTML += '<button type="button" class="action-btn chat-opts-clear" data-chat-clear-view="1">Clear my view</button>'
      + '<button type="button" class="action-btn chat-opts-clear" data-chat-clear="1">Clear all chat</button>'
      + '<button type="button" class="text-btn" data-chat-load-earlier="1">Load earlier messages…</button>';
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
    // How this works (?v=20260906at): classic name-click — Profile / Add friend / Whisper / Block / Complain stub.
    // Beginner: underlined chat names open this pale-blue menu (wiki Chat).
    menu.innerHTML = ''
      + '<div class="chat-name-menu-head">' + esc(name || "Player") + '</div>'
      + '<button type="button" data-profile="' + esc(id) + '">Profile</button>'
      + (self ? '' : '<button type="button" data-add-friend="' + esc(id) + '" data-friend-name="' + esc(name) + '">Add friend</button>')
      + (self ? '' : '<button type="button" data-whisper="' + esc(id) + '" data-whisper-name="' + esc(name) + '">Whisper</button>')
      + (self ? '' : '<button type="button" data-block-chat="' + esc(id) + '" data-block-name="' + esc(name) + '">Block</button>')
      + (self ? '' : '<button type="button" data-complain-stub="' + esc(id) + '" title="Report — Coming Soon">Complain…</button>');
    document.body.appendChild(menu);
  }
  async function loadHistory(opts) {
    // How this works (?v=20260906ax): NEVER dump the full demo cemetery into the UI.
    // Beginner: by default only fetch messages since this room visit. Optional loadEarlier for history.
    // ENGINE DEV: display merge only — music polling unchanged.
    opts = opts || {};
    if (!session()) return;
    if (!inRoom && !opts.force) return;
    var rid = String(currentRoomId || roomChatRoomId || "loft");
    var since = opts.loadEarlier ? "" : (roomChatVisitSince || "");
    if (!since && !opts.loadEarlier) {
      // No active visit stamp → keep clean (do not rehydrate).
      return;
    }
    try {
      var result = await window.WhirledApi.history(rid, since || undefined);
      var msgs = result.messages || [];
      if (opts.loadEarlier) {
        // One-shot: show older shared lines, but still cap; user asked explicitly.
        var older = (msgs || []).slice(-60);
        var have = {};
        chat.forEach(function (m) { if (m && m.id) have[m.id] = true; });
        older.forEach(function (m) {
          if (m && m.id && !have[m.id]) chat.unshift(m);
        });
        if (chat.length > 120) chat = chat.slice(-100);
        refreshChatLog();
        return;
      }
      var added = mergeVisitChat(msgs);
      if (added && added.length) {
        refreshChatLog();
        added.forEach(function (m) { try { spawnStageBubble(m); } catch (eS) {} });
      }
    } catch (e) {}
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
        if (session() && p.id === session().user.id) return Object.assign({}, p, { you: true, initials: p.initials || me.initials });
        return p;
      });
    }
    here = sortOccupantsYouFirst(here);
    rail.classList.add("occ-rail");
    rail.innerHTML = occupantRailHtml(here);
    listeners.occupants.forEach(function (fn) { try { fn(here); } catch (e) {} });
  }
  async function loadOccupants() {
    if (!session()) { liveOccupants = []; return; }
    var result = await window.WhirledApi.heartbeat("loft");
    liveOccupants = (result.occupants || []).map(function (p) {
      var isYou = !!(session() && session().user && p.id === session().user.id);
      var nm = isYou
        ? sanitizeDisplayName(session().user.name, p.name)
        : sanitizeDisplayName(p.name, p.id);
      return {
        id: p.id,
        name: nm,
        initials: (p.initials && !/NaN/i.test(String(p.initials)))
          ? String(p.initials).slice(0, 2)
          : String(nm).slice(0, 1).toUpperCase(),
        online: true,
        room: p.room || ROOM,
        you: isYou
      };
    });
    liveOccupants.forEach(function (p) { rememberProfile({ id: p.id, name: p.name }); });
    // How this works: remember real session occupants for optional leave-loft friend invites.
    try {
      if (inRoom && session()) {
        var meIdV = session().user.id;
        loftVisitOccupants = loftVisitOccupants || [];
        liveOccupants.forEach(function (p) {
          if (!p || !p.id || p.id === meIdV || p.you) return;
          if (!loftVisitOccupants.some(function (x) { return x.id === p.id; })) {
            loftVisitOccupants.push({ id: p.id, name: p.name || p.id });
          }
        });
      }
    } catch (eV) {}
    refreshOccupantRail();
    try { presenceCheckNotices(); } catch (eP) {}
  }
  function startOccPoll() {
    if (occTimer) clearInterval(occTimer);
    loadOccupants();
    occTimer = setInterval(function () { if (session()) loadOccupants(); }, 5000);
  }

  function startPoll() {
    // How this works (?v=20260906ax): ~2.5s poll for NEW room chat since this visit + soundtrack.
    // Beginner: poll MUST pass since=roomChatVisitSince or old demo names (e.g. qjeczg) haunt every Enter.
    // ENGINE DEV: music poll unchanged; chat merge never replaces the whole log.
    if (pollTimer) clearInterval(pollTimer);
    try { bindRoomMusicStorageListener(); } catch (eBind) {}
    pollTimer = setInterval(async function () {
      if (!session()) return;
      try {
        if (inRoom && roomChatVisitSince) {
          var rid = String(currentRoomId || roomChatRoomId || "loft");
          var result = await window.WhirledApi.pollChat(rid, roomChatVisitSince);
          var added = mergeVisitChat(result.messages || []);
          if (added && added.length) {
            refreshChatLog();
            added.forEach(function (m) {
              try { spawnStageBubble(m); } catch (eS) {}
            });
          }
        }
      } catch (eChat) {}
      try { await pollSharedRoomMusic(); } catch (eMusic) {}
    }, 2500);
  }
  // ---------------------------------------------------------------------------
  // Boot + presence / chat polling timers
  // ---------------------------------------------------------------------------

  // How this works: deep links #me/profile, #rooms, #mail etc. — read on boot, update on tab change.
  // ENGINE DEV: chrome navigation only; hash does not mount the engine.
  function syncHashRoute(tab) {
    if (!session()) return;
    var hash = "";
    if (devHubOpen || tab === "dev" || tab === "docs") hash = "dev";
    else if (helpOpen || tab === "help") hash = "help";
    else if (legalOpen || tab === "legal") hash = "legal";
    else if (tab === "me") {
      if (viewingId) hash = "me/player/" + encodeURIComponent(viewingId);
      else if (meSub && meSub !== "home") hash = "me/" + meSub;
      else hash = "me";
    } else if (tab === "rooms") hash = inRoom ? "rooms/loft" : "rooms";
    else if (tab === "stuff") hash = "stuff";
    else if (tab === "shop") hash = "shop";
    else if (tab === "games") hash = "games";
    else if (tab === "groups") hash = "groups";
    else hash = tab || "rooms";
    try {
      var next = "#" + hash;
      if (location.hash !== next) history.replaceState(null, "", next);
    } catch (e) {}
  }
  function applyHashRoute() {
    if (!session()) return false;
    var raw = "";
    try { raw = String(location.hash || "").replace(/^#/, ""); } catch (e) { return false; }
    if (!raw) return false;
    var parts = raw.split("/").filter(Boolean);
    var head = (parts[0] || "").toLowerCase();
    helpOpen = false;
    legalOpen = false;
    devHubOpen = false;
    avatarGuideOpen = false;
    if (head === "dev" || head === "docs" || head === "developers") { devHubOpen = true; paint("dev"); return true; }
    if (head === "help") { helpOpen = true; paint("help"); return true; }
    if (head === "legal") { legalOpen = true; paint("legal"); return true; }
    if (head === "me") {
      var sub = (parts[1] || "home").toLowerCase();
      if (sub === "player" && parts[2]) {
        viewingId = decodeURIComponent(parts[2]);
        meSub = "home";
      } else {
        viewingId = null;
        meSub = sub === "profile" || sub === "mail" || sub === "friends" || sub === "passport"
          || sub === "account" || sub === "themes" || sub === "club" || sub === "notices"
          || sub === "blocklist" || sub === "galleries" || sub === "transactions"
          || sub === "contests" || sub === "share" ? sub : "home";
      }
      paint("me");
      return true;
    }
    if (head === "mail") { meSub = "mail"; viewingId = null; paint("me"); return true; }
    if (head === "rooms") {
      if ((parts[1] || "") === "loft") {
        if (tryEnterLoft()) {
          beginRoomChatVisit("loft");
          loftVisitOccupants = [];
          paint("rooms");
          loadOccupants();
        } else paint("rooms");
      } else {
        inRoom = false;
        paint("rooms");
      }
      return true;
    }
    if (head === "stuff" || head === "shop" || head === "games" || head === "groups") {
      paint(head);
      return true;
    }
    return false;
  }
  function stripDiscordTokenFromUrl() {
    try {
      var u = new URL(location.href);
      if (!u.searchParams.has("discord_token")) return;
      u.searchParams.delete("discord_token");
      var qs = u.searchParams.toString();
      history.replaceState({}, "", u.pathname + (qs ? "?" + qs : "") + u.hash);
    } catch (e) {}
  }
  function consumeDiscordTokenFromUrl() {
    // How this works: Discord callback redirects to /?discord_token=TOKEN — save session, strip query, enter shell.
    // Beginner: same Bearer session token as password login. ENGINE DEV: chrome-only.
    try {
      var u = new URL(location.href);
      return u.searchParams.get("discord_token");
    } catch (e) { return null; }
  }
  function boot() {
    // How this works: ?avatarLab=1 unlocks the deferred SWF wardrobe lab for side work only.
    // Discord: if URL has discord_token, accept it before paint (async me fetch).
    // Beginner (?v=20260906au): ?page=dev|docs|developers opens Developer Information Hub after login.
    syncAvatarLabFlagFromUrl();
    // ---- MERGE NOTE (?v=20260906ax): wire classic-avatar.js hooks (additive) ----
    try {
      if (window.WhirledClassicAvatar && WhirledClassicAvatar.bindEvents) {
        WhirledClassicAvatar.bindEvents({
          findStuff: findStuff,
          saveStuff: saveStuff,
          loadStuff: loadStuff,
          session: session,
          paint: paint,
          pushNotice: pushNotice,
          wearStuffAvatar: wearStuffAvatar,
          awardAction: typeof awardAction === "function" ? awardAction : function () {}
        });
        WhirledClassicAvatar.setOpenStuffDetail(function (id) {
          stuffCat = "avatars";
          stuffMode = "detail";
          stuffItemId = id;
          stuffModeAvatarWizard = false;
          avatarWizard = null;
          paint("stuff");
        });
      }
    } catch (eClassicBind) {}
    try {
      var pageQ = new URL(location.href).searchParams.get("page");
      if (pageQ && /^(dev|docs|developers)$/i.test(pageQ)) devHubOpen = true;
    } catch (ePage) {}
    applyBrowserTheme();
    var discordTok = consumeDiscordTokenFromUrl();
    if (discordTok && window.WhirledApi && window.WhirledApi.acceptDiscordToken) {
      try {
        window.WhirledApi.acceptDiscordToken(discordTok);
        stripDiscordTokenFromUrl();
        window.WhirledApi.me().then(function () {
          finishBootAfterSession();
        }).catch(function (err) {
          try { window.WhirledApi.logout(); } catch (eL) {}
          stripDiscordTokenFromUrl();
          paint("");
          var ge = document.getElementById("gate-err");
          if (ge) ge.textContent = (err && err.message) ? err.message : "Discord sign-in failed.";
          try { window.__whirledBoot = true; } catch (e) {}
        });
        return;
      } catch (eDisc) {
        stripDiscordTokenFromUrl();
      }
    }
    finishBootAfterSession();
  }
  function finishBootAfterSession() {
    // How this works (?v=20260906ao): after a successful session, wrap shell/paint so a UI throw
    // still shows #gate-err or a recoverable shell — never a stuck gate with an empty error.
    // Beginner: login may succeed in WhirledApi while shell() fails; keep the session and recover.
    // ENGINE DEV: chrome-only — never touches #stage-slot mount contract.
    var hasUser = !!(session() && session().user);
    try {
      if (hasUser) {
        try { stripStuckPokeNotices(); } catch (eSp) {}
        try { syncFriendsFromPerUser(); } catch (eSF) {}
        try { awayMode = isAway(session().user.id); } catch (eAw) {}
        try { renameCyanHairRowsToWhirl(); } catch (eRn) {}
        try {
          // Starter Whirl — auto-add + auto-Wear for new / tofu users (async, non-blocking).
          ensureStarterAvatar({ wearIfEmpty: true, quiet: true }).catch(function () {});
        } catch (eSt) {}
        try { pushNotice("green", you().name + " logged on.", { transient: true }); } catch (eN) {}
      }
      // How this works (?v=20260906ax): fresh page = no room visit yet — wipe leftover display.
      // Do not loadHistory() on boot (demo API cemetery). Enter room calls beginRoomChatVisit.
      try {
        roomChatVisitSince = "";
        roomChatRoomId = "";
        clearRoomChatDisplay(true);
      } catch (eClr) {}
      try {
        paint(hasUser ? "rooms" : "");
      } catch (ePaint) {
        showBootRecover(hasUser, ePaint);
      }
      // Ensure gate handlers exist whenever the gate is visible (paint usually binds; recover too).
      if (!session() || !session().user) {
        try {
          if (document.getElementById("gate-err") || document.querySelector(".gate")) bindGate();
        } catch (eBg) {}
      }
      if (session() && session().user) {
        try { startPoll(); } catch (eP) {}
        try { startOccPoll(); } catch (eO) {}
        try { ensureNoticeBar(); } catch (eNb) {}
        try {
          if (!applyHashRoute() && devHubOpen) paint("dev");
        } catch (eH) {}
      }
    } catch (eBoot) {
      showBootRecover(!!(session() && session().user), eBoot);
    }
    try { window.__whirledBoot = true; } catch (e) {}
  }
  function showBootRecover(hasUser, err) {
    // Purpose: surface paint/shell failures after auth instead of an empty stuck gate.
    var msg = (err && err.message) ? err.message : String(err || "Chrome hit a snag after sign-in.");
    try {
      var appEl = document.getElementById("app");
      if (!appEl) return;
      if (hasUser && session() && session().user) {
        try {
          appEl.innerHTML = shell();
          var main = document.getElementById("main");
          if (main) {
            main.innerHTML = '<section class="panel"><h2>Almost in</h2>'
              + '<p class="gate-err" id="gate-err">' + esc(msg) + '</p>'
              + '<p class="meta">Your session is saved. Open Rooms or reload if the chrome looks empty.</p>'
              + '<p><button type="button" class="action-btn" data-tab="rooms">Open Rooms</button></p></section>';
          }
          appEl.setAttribute("data-tab", "rooms");
        } catch (eShell) {
          appEl.innerHTML = gate();
          appEl.setAttribute("data-tab", "gate");
          bindGate();
          var ge2 = document.getElementById("gate-err");
          if (ge2) ge2.textContent = msg + " (shell recover failed — try reload.)";
        }
      } else {
        appEl.innerHTML = gate();
        appEl.setAttribute("data-tab", "gate");
        bindGate();
        var ge = document.getElementById("gate-err");
        if (ge) ge.textContent = msg;
      }
    } catch (eRec) {
      try {
        var el = document.getElementById("app");
        if (el) {
          el.innerHTML = '<section class="gate"><div class="gate-card"><h1>Chrome error</h1>'
            + '<p class="gate-err" id="gate-err"></p></div></section>';
          var g = document.getElementById("gate-err");
          if (g) g.textContent = msg;
          try { bindGate(); } catch (eB) {}
        }
      } catch (eFinal) {}
    }
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
    // How this works (?v=20260906ax): resume poll/occupants; do NOT loadHistory() full dump.
    if (inRoom && roomChatVisitSince) {
      try { loadHistory(); } catch (eH) {}
    }
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
    // Visit-scoped: ignore raw chat key writes from other tabs (would resurrect cemetery).
    // Live lines arrive via pollChat(?since=visit).
  });

  var app = document.getElementById("app");
  try {
    window.addEventListener("hashchange", function () {
      if (session()) applyHashRoute();
    });
  } catch (eHc) {}
  boot();
  // ---------------------------------------------------------------------------
  // Event delegation: one click listener + one submit listener on #app
  // Information: buttons use data-* attributes (data-tab, data-me, data-profile-edit, …).
  // ---------------------------------------------------------------------------
  // How this works: Esc closes daily reward even when modal is on document.body.
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (!document.getElementById("daily-reward-modal")) return;
    dismissDailyRewardModal();
  }, true);
  // How this works: document capture backup for Open/Close player + Room music panel on phones.
  // Beginner: even if a tap does not bubble to #app the way we expect, these still fire.
  // ENGINE DEV: once; stopPropagation so #app handlers do not double-run. Dock stays under #app.
  (function bindEmbedDockCaptureOnce() {
    // How this works: document capture for embed dock + Room music modal (Set embed / Close / backdrop).
    // Beginner: even if a tap does not bubble to #app, Set embed and Close still fire.
    // ENGINE DEV: once; stopPropagation so #app handlers do not double-run. Modal z > dock.
    if (window.__whirledEmbedCapture) return;
    window.__whirledEmbedCapture = true;
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var setEmbed = t.closest("[data-playlist-set-embed]");
      var closePl = t.closest("[data-playlist-close]");
      var card = t.closest("[data-playlist-card]");
      var expand = t.closest("[data-embed-expand]");
      var collapse = t.closest("[data-embed-collapse]");
      var focusBtn = t.closest("[data-embed-focus]");
      var openPanel = t.closest("[data-playlist-open-panel]");
      // Backdrop: click on modal root (dim area), not the card.
      var isBackdrop = !!(t.id === "room-playlist-panel" || (t.getAttribute && t.getAttribute("data-playlist-backdrop") === "1" && !card));
      // Only handle modal chrome + embed dock here. Other card controls (source tabs, mute, …)
      // must reach the #app bubble handler — do not stopPropagation on every card tap.
      if (!setEmbed && !closePl && !isBackdrop && !expand && !collapse && !focusBtn && !openPanel) return;
      if (setEmbed && session()) {
        ev.preventDefault();
        ev.stopPropagation();
        applyPlaylistEmbedFromUi(ev);
        return;
      }
      if (closePl && session()) {
        ev.preventDefault();
        ev.stopPropagation();
        closePlaylistPanel();
        try { paint("rooms"); } catch (ePc) {}
        return;
      }
      if (isBackdrop && session()) {
        ev.preventDefault();
        ev.stopPropagation();
        closePlaylistPanel();
        try { paint("rooms"); } catch (ePb) {}
        return;
      }
      if (expand) {
        ev.preventDefault();
        ev.stopPropagation();
        roomEmbedExpanded = true;
        var d1 = document.getElementById("room-embed-dock");
        if (d1) {
          applyRoomEmbedExpanded(d1);
          try { d1.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e1) {}
          var f1 = d1.querySelector("iframe.room-embed-frame");
          if (f1) { try { f1.focus(); } catch (eF1) {} }
        }
        return;
      }
      if (collapse) {
        ev.preventDefault();
        ev.stopPropagation();
        roomEmbedExpanded = false;
        var d2 = document.getElementById("room-embed-dock");
        if (d2) applyRoomEmbedExpanded(d2);
        return;
      }
      if (focusBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        roomEmbedExpanded = true;
        var d3 = document.getElementById("room-embed-dock");
        if (d3) {
          applyRoomEmbedExpanded(d3);
          try { d3.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e3) {}
          var f3 = d3.querySelector("iframe.room-embed-frame");
          if (f3) { try { f3.focus(); } catch (eF3) {} }
        }
        return;
      }
      if (openPanel && session()) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!inRoom) inRoom = true;
        playlistPanelOpen = true;
        playlistPanelDirty = true;
        collapseRoomEmbedSheet();
        roomPanelOpen = false;
        decorateMode = false;
        partyPanelOpen = false;
        paint("rooms");
        try { syncRoomAudio(); } catch (eS) {}
        try { ensurePlaylistPanel(); } catch (eP) {}
        focusPlaylistEmbedUrl();
      }
    }, true);
    // How this works: Set embed is type=button (mobile-reliable); Enter in the paste field still applies.
    // Beginner: paste link → press Enter or tap Set embed.
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      var t = ev.target;
      if (!t || !t.closest) return;
      if (!t.closest("#room-playlist-panel")) return;
      if (!t.classList || !t.classList.contains("playlist-embed-url")) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (session()) applyPlaylistEmbedFromUi(ev);
    }, true);
  })();
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
    if (ev.target.closest("[data-chat-speak-cycle]")) {
      var uiSp = loadChatUi();
      var order = ["speak", "think", "shout"];
      var ix = order.indexOf(uiSp.speakMode || "speak");
      uiSp.speakMode = order[(ix + 1) % order.length];
      saveChatUi(uiSp);
      var btn = document.getElementById("chat-speak-mode");
      var cin = document.getElementById("chat-input");
      var sm2 = uiSp.speakMode;
      if (btn) btn.textContent = sm2 === "think" ? "Think" : (sm2 === "shout" ? "Shout" : "Speak");
      if (cin) {
        cin.placeholder = sm2 === "think" ? "Think something…" : (sm2 === "shout" ? "Shout to the room…" : "Type here to chat!");
        cin.setAttribute("data-speak-mode", sm2);
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
    if (ev.target.closest("[data-chat-bubble-dur]")) {
      var uiB = loadChatUi();
      var bd = ev.target.closest("[data-chat-bubble-dur]").getAttribute("data-chat-bubble-dur") || "medium";
      uiB.bubbleDuration = (bd === "short" || bd === "long") ? bd : "medium";
      saveChatUi(uiB);
      renderChatOptsMenu();
      return;
    }
    if (ev.target.closest("[data-chat-clear-view]")) {
      // How this works (?v=20260906ax): Clear my view — empty room display + bump visit since (poll cannot refill cemetery).
      // Beginner: Private tabs are left alone; only Room chat on screen clears.
      clearRoomChatDisplay(true);
      try { pushNotice("blue", "Chat cleared for this visit.", { transient: true }); } catch (e) {}
      chatOptsOpen = false;
      var comV = document.getElementById("chat-opts-menu");
      if (comV) comV.hidden = true;
      pushNotice("green", "Room chat cleared.", { transient: true });
      return;
    }
    if (ev.target.closest("[data-chat-load-earlier]")) {
      // Optional: pull older shared demo/server lines once (user asked).
      chatOptsOpen = false;
      var comE = document.getElementById("chat-opts-menu");
      if (comE) comE.hidden = true;
      loadHistory({ loadEarlier: true, force: true }).then(function () {
        pushNotice("orange", "Loaded earlier shared messages (optional). Clear my view anytime.", { transient: true });
      });
      return;
    }
    if (ev.target.closest("[data-chat-clear]")) {
      // Wiki: Clear all chat — wipe Room + open PM tabs.
      if (confirm("Clear all chat (Room + private tabs)?")) {
        clearRoomChatDisplay(true);
        var ct = loadChatTabs();
        (ct.openPMs || []).forEach(function (p) { savePmChat(p.userId, []); });
        ct.unread = {};
        saveChatTabs(ct);
        refreshChatLog();
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
    // --- Fidelity upgrade handlers (friend requests, chat tabs, palette, gifts) ---
    var chatTabCloseG = ev.target.closest("[data-chat-tab-close-group]");
    if (chatTabCloseG) {
      ev.preventDefault();
      ev.stopPropagation();
      closeGroupChatTab(chatTabCloseG.getAttribute("data-chat-tab-close-group"));
      refreshChatLog();
      return;
    }
    var chatTabClose = ev.target.closest("[data-chat-tab-close]");
    if (chatTabClose) {
      ev.preventDefault();
      ev.stopPropagation();
      closePmTab(chatTabClose.getAttribute("data-chat-tab-close"));
      refreshChatLog();
      return;
    }
    var chatTabBtn = ev.target.closest("[data-chat-tab]");
    if (chatTabBtn && !ev.target.closest("[data-chat-tab-close]") && !ev.target.closest("[data-chat-tab-close-group]")) {
      setActiveChatTab(chatTabBtn.getAttribute("data-chat-tab") || "room");
      refreshChatLog();
      return;
    }
    var openGChat = ev.target.closest("[data-open-group-chat]");
    if (openGChat && session()) {
      openGroupChatTab(openGChat.getAttribute("data-open-group-chat"), openGChat.getAttribute("data-group-chat-name"));
      var comG = document.getElementById("chat-opts-menu");
      if (comG) { comG.hidden = true; chatOptsOpen = false; }
      if (!inRoom) {
        if (tryEnterLoft()) {
          clearRoomChatDisplay(true);
          paint("rooms");
          loadOccupants();
        }
      } else {
        refreshChatLog();
      }
      return;
    }
    var whisperBtn = ev.target.closest("[data-whisper]");
    if (whisperBtn && session()) {
      var wid = whisperBtn.getAttribute("data-whisper");
      var wname = whisperBtn.getAttribute("data-whisper-name") || wid;
      openPmTab(wid, wname);
      friendsPopupOpen = false;
      var fpop = document.getElementById("friends-toolbar-pop");
      if (fpop) fpop.remove();
      var cnmW = document.getElementById("chat-name-menu");
      if (cnmW) cnmW.remove();
      if (!inRoom) {
        if (tryEnterLoft()) {
          clearRoomChatDisplay(true);
          paint("rooms");
          loadOccupants();
        }
      } else {
        refreshChatLog();
        applyChatInputTint();
        var cin = document.getElementById("chat-input");
        if (cin) cin.focus();
      }
      return;
    }
    if (ev.target.closest("[data-friends-pop-close]")) {
      friendsPopupOpen = false;
      var fp2 = document.getElementById("friends-toolbar-pop");
      if (fp2) fp2.remove();
      return;
    }
    var frAcc = ev.target.closest("[data-friend-accept]");
    if (frAcc && session()) {
      acceptFriendRequest(frAcc.getAttribute("data-friend-accept"));
      meSub = "friends"; viewingId = null; paint("me");
      return;
    }
    var frDec = ev.target.closest("[data-friend-decline]");
    if (frDec && session()) {
      declineFriendRequest(frDec.getAttribute("data-friend-decline"));
      meSub = "friends"; viewingId = null; paint("me");
      return;
    }
    var frRet = ev.target.closest("[data-friend-retract]");
    if (frRet && session()) {
      retractFriendRequest(frRet.getAttribute("data-friend-retract"));
      meSub = viewingId ? "profile" : "friends";
      paint("me");
      return;
    }
    var copyInv = ev.target.closest("[data-copy-invite]");
    if (copyInv && session()) {
      copyInviteLink(copyInv.getAttribute("data-copy-invite"), copyInv.getAttribute("data-copy-invite-id"));
      return;
    }
    // Beginner (?v=20260906aq): emote menu buttons on the loft avatar.
    if (ev.target.closest("[data-avatar-emote-close]")) {
      closeAvatarEmoteMenu();
      return;
    }
    var emoteBtn = ev.target.closest("[data-avatar-emote]");
    if (emoteBtn) {
      var em = emoteBtn.getAttribute("data-avatar-emote");
      playAvatarEmote(em);
      return;
    }
    if (chromeEmoteMenuOpen && !ev.target.closest(".avatar-emote-menu, [data-avatar-hit]")) {
      closeAvatarEmoteMenu();
    }

    if (ev.target.closest("[data-room-share]") && session()) {
      // How this works: open Share / embed modal (URL + iframe snippet).
      try {
        var rmenuShare = document.getElementById("room-menu");
        if (rmenuShare) rmenuShare.hidden = true;
      } catch (eRmS) {}
      openRoomSharePopup();
      return;
    }
    // How this works: backdrop outside the card, or ×, closes Share/embed.
    if ((ev.target.closest("[data-room-share-backdrop]") && !ev.target.closest("[data-room-share-card]"))
        || ev.target.closest("[data-room-share-close]")) {
      closeRoomSharePopup();
      return;
    }
    if (ev.target.closest("[data-room-share-copy-url]") && session()) {
      var urlEl = document.getElementById("room-share-url");
      var urlVal = urlEl ? urlEl.value : roomShareUrl();
      var msgU = document.getElementById("room-share-msg");
      function doneUrl() { if (msgU) msgU.textContent = "Link copied."; pushNotice("green", "Room link copied.", { transient: true }); }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(urlVal).then(doneUrl).catch(function () { window.prompt("Copy room link:", urlVal); doneUrl(); });
        } else { window.prompt("Copy room link:", urlVal); doneUrl(); }
      } catch (eCu) { try { window.prompt("Copy room link:", urlVal); doneUrl(); } catch (e2) {} }
      return;
    }
    if (ev.target.closest("[data-room-share-copy-embed]") && session()) {
      var embEl = document.getElementById("room-share-embed");
      var embVal = embEl ? embEl.value : roomEmbedSnippet();
      var msgE = document.getElementById("room-share-msg");
      function doneEmb() { if (msgE) msgE.textContent = "Embed snippet copied."; pushNotice("green", "Embed snippet copied.", { transient: true }); }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(embVal).then(doneEmb).catch(function () { window.prompt("Copy embed snippet:", embVal); doneEmb(); });
        } else { window.prompt("Copy embed snippet:", embVal); doneEmb(); }
      } catch (eCe) { try { window.prompt("Copy embed snippet:", embVal); doneEmb(); } catch (e3) {} }
      return;
    }
    var wallDel = ev.target.closest("[data-wall-delete]");
    if (wallDel && session()) {
      // How this works: Delete for profile owner or comment author.
      var wOwner = wallDel.getAttribute("data-wall-owner") || session().user.id;
      var wKey = wallDel.getAttribute("data-wall-delete");
      if (deleteWallPost(wOwner, wKey)) {
        pushNotice("gray", "Comment deleted.", { transient: true });
        if (String(wOwner) === String(session().user.id)) { viewingId = null; meSub = "profile"; }
        else viewingId = wOwner;
        paint("me");
      }
      return;
    }
    // Friendly checkbox is handled on the change listener (keeps checked state honest).
    var reactBtn = ev.target.closest("[data-react]");
    if (reactBtn && session()) {
      toggleChatReaction(reactBtn.getAttribute("data-react-msg"), reactBtn.getAttribute("data-react"));
      refreshChatLog();
      return;
    }
    var cmdClose = ev.target.closest("[data-cmd-close]");
    if (cmdClose && !ev.target.closest(".cmd-palette")) {
      cmdPaletteOpen = false;
      var cp = document.getElementById("cmd-palette");
      if (cp) cp.remove();
      return;
    }
    var cmdItem = ev.target.closest("[data-cmd]");
    if (cmdItem) {
      runCommand(cmdItem.getAttribute("data-cmd"));
      return;
    }
    if (ev.target.closest("[data-shortcuts-close]")) {
      shortcutsOpen = false;
      var so = document.getElementById("shortcuts-overlay");
      if (so) so.remove();
      return;
    }
    if (ev.target.closest("[data-mail-select-all]") && session()) {
      var boxes = document.querySelectorAll(".mail-select");
      var allOn = Array.prototype.every.call(boxes, function (b) { return b.checked; });
      boxes.forEach(function (b) { b.checked = !allOn; });
      return;
    }
    if (ev.target.closest("[data-mail-delete-selected]") && session()) {
      var ids = [];
      document.querySelectorAll(".mail-select:checked").forEach(function (b) {
        ids.push(b.getAttribute("data-mail-select"));
      });
      if (!ids.length) { pushNotice("gray", "No mail selected."); return; }
      if (!confirm("Delete " + ids.length + " selected message(s)?")) return;
      saveMail(loadMail().filter(function (m) { return ids.indexOf(m.id) < 0; }));
      meSub = "mail"; paint("me");
      return;
    }
    var goRoom = ev.target.closest("[data-go-room]");
    if (goRoom && session()) {
      goMenuOpen = false;
      var gmR = document.getElementById("go-menu");
      if (gmR) gmR.hidden = true;
      var goRid = goRoom.getAttribute("data-go-room") || "loft";
      if (tryEnterRoom(goRid)) {
        clearRoomChatDisplay(true);
        paint("rooms");
        loadOccupants();
      } else paint("rooms");
      return;
    }
    var goFriend = ev.target.closest("[data-go-friend]");
    if (goFriend && session()) {
      goMenuOpen = false;
      var gmF = document.getElementById("go-menu");
      if (gmF) gmF.hidden = true;
      openPmTab(goFriend.getAttribute("data-go-friend"), goFriend.getAttribute("data-go-friend-name"));
      if (!inRoom && tryEnterLoft()) {
        clearRoomChatDisplay(true);
        paint("rooms");
        loadOccupants();
      } else if (inRoom) refreshChatLog();
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
      var byeName = you().name;
      window.WhirledApi.logout();
      leaveRoomResetChat();
      liveOccupants = []; inRoom = false; roomImmersiveForcedOff = false; currentRoomId = "loft"; createRoomOpen = false;
      try { updateLandscapeImmersion(); } catch (eOutImm) {}
      viewingId = null; meSub = "home";
      shopItemId = null; groupViewId = null; groupThreadId = null; roomPanelOpen = false; roomMenuOpen = false;
      gamesMode = "browse"; gameViewId = null; gameDetailTab = "play"; gameGenre = "all"; friendSearchQ = "";
      decorateMode = false; partyPanelOpen = false; playlistPanelOpen = false; roomPreviewOpen = false; roomPreviewId = null; helpOpen = false; legalOpen = false; galleryViewId = null; stuffListMode = false;
      friendsPopupOpen = false; cmdPaletteOpen = false; shortcutsOpen = false; awayMode = false;
      dailyRewardPending = null;
      txFilter = "all";
      try {
        var dmOut = document.getElementById("daily-reward-modal");
        if (dmOut) dmOut.remove();
      } catch (eDm) {}
      clearStrayUI();
      paint("");
      return;
    }
    // How this works (20260906af): Create Room panel open/close + pay Coins/Bars/free.
    // Beginner: first owned room is free; later deduct 10k coins OR 1 bar honestly.
    if (ev.target.closest("[data-create-room-open]") && session()) {
      createRoomOpen = true;
      if (meSub === "rooms") paint("me");
      else paint("rooms");
      return;
    }
    if (ev.target.closest("[data-create-room-close]") && session()) {
      createRoomOpen = false;
      if (meSub === "rooms") paint("me");
      else paint("rooms");
      return;
    }
    var createPay = ev.target.closest("[data-create-room-pay]");
    if (createPay && session()) {
      ev.preventDefault();
      var nameEl = document.getElementById("create-room-name");
      var blurbEl = document.getElementById("create-room-blurb");
      var lockEl = document.querySelector('input[name="create-room-lock"]:checked');
      var result = createOwnedRoom({
        name: nameEl ? nameEl.value : "Home",
        blurb: blurbEl ? blurbEl.value : "",
        lockMode: lockEl ? lockEl.value : "unlocked",
        payWith: createPay.getAttribute("data-create-room-pay") || "coins"
      });
      if (!result.ok) {
        pushNotice("orange", result.error || "Could not create room.");
        return;
      }
      createRoomOpen = false;
      var payNote = result.free ? "free first room" : ("paid with " + result.payWith);
      pushNotice("green", "Created “" + result.room.name + "” (" + payNote + ").", { transient: true });
      try { awardAction("decorate"); } catch (eAw) {}
      // Open preview for the new room so player can Enter.
      roomPreviewId = result.room.id;
      roomPreviewOpen = true;
      if (meSub === "rooms") {
        // Stay on Me rooms list after create; also show preview overlay.
        paint("me");
        try { ensureRoomPreviewPanel(); } catch (ePr) {}
      } else {
        paint("rooms");
        try { ensureRoomPreviewPanel(); } catch (ePr2) {}
      }
      return;
    }
    if (ev.target.closest("[data-immersive-exit]")) {
      exitLandscapeImmersion();
      return;
    }
    // How this works: lobby tile / recent chip → preview sheet (NOT inRoom yet).
    // Beginner: Cancel stays in lobby; Enter in the sheet joins (with soft curtain).
    if (ev.target.closest("[data-room-preview-close]") || (ev.target.closest("[data-room-preview-backdrop]") && !ev.target.closest("[data-room-preview-card]"))) {
      closeRoomPreview();
      return;
    }
    var previewEnter = ev.target.closest("[data-room-preview-enter]");
    if (previewEnter && session()) {
      ev.preventDefault();
      confirmEnterFromPreview(previewEnter.getAttribute("data-room-preview-enter") || "loft");
      return;
    }
    var previewOpen = ev.target.closest("[data-room-preview]");
    if (previewOpen && session() && !inRoom) {
      ev.preventDefault();
      openRoomPreview(previewOpen.getAttribute("data-room-preview") || "loft");
      return;
    }
    var enter = ev.target.closest("[data-enter-room]");
    if (enter && session()) {
      // How this works: Visit Home / Join them / hash — enter room id (default loft).
      // Beginner: profile Visit Home skips the lobby sheet for speed; lock still gates.
      var enterId = enter.getAttribute("data-enter-room") || "loft";
      if (!tryEnterRoom(enterId)) {
        paint("rooms");
        return;
      }
      clearRoomChatDisplay(true);
      loftVisitOccupants = [];
      paint("rooms");
      loadOccupants();
      try { pollSharedRoomMusic(); } catch (eM2) {}
      try { awardAction("enterRoom"); } catch (e) {}
      return;
    }
    if (ev.target.closest("[data-leave-room]")) {
      var leavePeople = (loftVisitOccupants || []).slice();
      inRoom = false;
      roomImmersiveForcedOff = false;
      try { updateLandscapeImmersion(); } catch (eLvImm) {}
      decorateMode = false;
      roomPanelOpen = false;
      playlistPanelOpen = false;
      roomItemsPanelOpen = false;
      leaveRoomResetChat();
      loftVisitOccupants = [];
      // How this works: optional batch invite after hanging out — only real visit occupants.
      if (leavePeople.length) hangoutInvitePending = leavePeople;
      else hangoutInvitePending = null;
      paint("rooms");
      return;
    }
    var roomsLobbyBtn = ev.target.closest("[data-rooms-lobby]");
    if (roomsLobbyBtn && session()) {
      inRoom = false;
      roomImmersiveForcedOff = false;
      try { updateLandscapeImmersion(); } catch (eLbImm) {}
      decorateMode = false;
      roomPanelOpen = false;
      leaveRoomResetChat();
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
        // How this works: Go home / Recent also respect room lock.
        if (!tryEnterLoft()) {
          paint("rooms");
          return;
        }
        clearRoomChatDisplay(true);
        paint("rooms");
        loadOccupants();
        try { awardAction("enterRoom"); } catch (e) {}
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
        var wrapGo = document.querySelector(".tb-go-wrap");
        if (menu && !menu.hidden) {
          menu.hidden = true; goMenuOpen = false;
        } else if (wrapGo) {
          // How this works: rebuild Go menu each open so recentRooms stay fresh.
          if (menu) menu.remove();
          var tmpG = document.createElement("div");
          tmpG.innerHTML = goMenuHtml();
          var goNode = tmpG.firstChild;
          if (goNode) {
            wrapGo.appendChild(goNode);
            goNode.hidden = false;
            goMenuOpen = true;
          }
        }
        return;
      }
      if (kind === "friends") {
        // How this works: Friends toolbar opens online-friends popup (Whisper / Profile / Join).
        friendsPopupOpen = !friendsPopupOpen;
        var pop = document.getElementById("friends-toolbar-pop");
        if (friendsPopupOpen) {
          if (!pop) {
            var fw = document.querySelector(".tb-friends-wrap");
            if (fw) {
              var tmp = document.createElement("div");
              tmp.innerHTML = friendsToolbarPopupHtml();
              if (tmp.firstChild) fw.appendChild(tmp.firstChild);
            }
          }
        } else if (pop) pop.remove();
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
    if (ev.target.closest("[data-daily-dismiss]")) {
      dismissDailyRewardModal();
      return;
    }
    var txFilt = ev.target.closest("[data-tx-filter]");
    if (txFilt && session()) {
      txFilter = txFilt.getAttribute("data-tx-filter") || "all";
      meSub = "transactions";
      paint("me");
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
    // How this works: seed converted Aseprite packs into Stuff inventory (kind=avatar).
    if (ev.target.closest("[data-seed-user-packs-parts]") && session()) {
      seedUserAvatarPacks({ includeParts: true });
      return;
    }
    if (ev.target.closest("[data-seed-user-packs]") && session()) {
      seedUserAvatarPacks({ includeParts: false });
      return;
    }
    // How this works: Wear / Take off Stuff avatars → loft #avatar-wear-layer billboard (not Ruffle).
    if (ev.target.closest("[data-stuff-wear]") && session()) {
      ev.preventDefault();
      ev.stopPropagation();
      var wearStuffId = ev.target.closest("[data-stuff-wear]").getAttribute("data-stuff-wear");
      var wearItem = findStuff(wearStuffId);
      if (!wearItem || itemCat(wearItem) !== "avatars") {
        pushNotice("status", "Avatar not found in Stuff.");
        return;
      }
      var classicOk = false;
      try {
        classicOk = !!(window.WhirledClassicAvatar && WhirledClassicAvatar.canWearWithoutPng
          && WhirledClassicAvatar.canWearWithoutPng(wearItem));
      } catch (eCo) { classicOk = false; }
      if (!wearItem.thumb && !wearItem.preview && !(wearItem.frames && wearItem.frames.length) && !classicOk) {
        pushNotice("status", "This avatar needs a preview image (or Classic Flash opt-in + SWF) before Wear.");
        return;
      }
      wearStuffAvatar(wearItem);
      var wearMsg = "Wearing “" + (wearItem.name || "Avatar") + "” — visible in Stuff preview and your loft.";
      try {
        if (window.WhirledClassicAvatar && WhirledClassicAvatar.itemIsHybrid && WhirledClassicAvatar.itemIsHybrid(wearItem)
          && !(wearItem.forceRuffleInLoft || (wearItem.pack && wearItem.pack.forceRuffleInLoft))) {
          wearMsg = "Wearing “" + (wearItem.name || "Avatar") + "” — Hybrid (smooth): click loft floor to walk. SWF stays for Stuff Ruffle preview.";
        } else if (window.WhirledClassicAvatar && WhirledClassicAvatar.itemHasClassicSwf && WhirledClassicAvatar.itemHasClassicSwf(wearItem)
          && !(wearItem.frames && wearItem.frames.length) && !wearItem.preview) {
          wearMsg = "Wearing Flash “" + (wearItem.name || "Avatar") + "” — click floor to move. Attach PNG idle+walk for Hybrid smooth walk (SWF anim needs AvatarControl).";
        }
      } catch (eWm) {}
      pushNotice("green", wearMsg, { transient: true });
      // How this works: refresh the tab you’re on (don’t yank out of Rooms if Stuff detail was stale).
      var curTabW = document.querySelector(".tab.is-on");
      var tabW = curTabW ? curTabW.getAttribute("data-tab") : "stuff";
      paint(tabW || "stuff");
      return;
    }
    if (ev.target.closest("[data-stuff-unwear]") && session()) {
      ev.preventDefault();
      ev.stopPropagation();
      saveWornAvatar(null);
      pushNotice("green", "Avatar taken off — loft shows default tofu.", { transient: true });
      var curTabU = document.querySelector(".tab.is-on");
      var tabU = curTabU ? curTabU.getAttribute("data-tab") : "stuff";
      paint(tabU || "stuff");
      return;
    }
    // How this works: Wear classic default tofu (blank avatar).
    if (ev.target.closest("[data-wear-tofu]") && session()) {
      ev.preventDefault();
      saveWornAvatar(makeTofuWornRow());
      pushNotice("green", "Wearing default tofu.", { transient: true });
      var curTabT = document.querySelector(".tab.is-on");
      paint(curTabT ? curTabT.getAttribute("data-tab") : "stuff");
      return;
    }
    // How this works: room self-menu → Change avatar… expands recent list.
    if (ev.target.closest("[data-change-avatar]") && session()) {
      var ca = document.getElementById("occ-change-avatar");
      if (ca) ca.hidden = !ca.hidden;
      return;
    }
    if (ev.target.closest("[data-goto-stuff-avatars]") && session()) {
      stuffCat = "avatars";
      stuffMode = "browse";
      stuffItemId = null;
      inRoom = false;
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-avatar-states-soon]") && session()) {
      pushNotice("status", "States / custom actions: Coming Soon for SWF. Sprite packs already preview-play frames in the viewer.", { transient: true });
      return;
    }

    // ---- Avatar wizard (?v=20260906ar) ----
    if (ev.target.closest("[data-avatar-guide-open]") && session()) {
      avatarGuideOpen = true; helpOpen = false; legalOpen = false; devHubOpen = false;
      paint("help");
      return;
    }
    if (ev.target.closest("[data-avatar-guide-close]") && session()) {
      avatarGuideOpen = false;
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-avatar-wiz-cancel]") && session()) {
      avatarWizard = null; stuffModeAvatarWizard = false; stuffMode = "browse";
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-avatar-wiz-remap]") && session()) {
      var rid = ev.target.closest("[data-avatar-wiz-remap]").getAttribute("data-avatar-wiz-remap");
      var it = findStuff(rid);
      if (!it) return;
      avatarWizard = newAvatarWizardDraft(it);
      stuffMode = "upload"; stuffModeAvatarWizard = true; stuffCat = "avatars";
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-avatar-wiz-back]") && avatarWizard) {
      // sync name fields if on step 2
      var nm = document.getElementById("avatar-wiz-name");
      var ds = document.getElementById("avatar-wiz-desc");
      var fc = document.getElementById("avatar-wiz-faces");
      if (nm) avatarWizard.name = nm.value;
      if (ds) avatarWizard.description = ds.value;
      if (fc) avatarWizard.artFaces = fc.value;
      avatarWizard.step = Math.max(1, (avatarWizard.step || 1) - 1);
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-avatar-wiz-next]") && avatarWizard) {
      var nm2 = document.getElementById("avatar-wiz-name");
      var ds2 = document.getElementById("avatar-wiz-desc");
      var fc2 = document.getElementById("avatar-wiz-faces");
      if (nm2) avatarWizard.name = nm2.value.trim();
      if (ds2) avatarWizard.description = ds2.value;
      if (fc2) avatarWizard.artFaces = fc2.value;
      if (avatarWizard.step === 2 && !avatarWizard.name) {
        alert("Give your avatar a name.");
        return;
      }
      if (avatarWizard.step === 2 && !avatarWizard.thumbFileId) {
        var firstImg = avatarWizard.files.filter(function (f) { return f.kind === "image"; })[0];
        if (firstImg) avatarWizard.thumbFileId = firstImg.id;
      }
      avatarWizard.step = Math.min(4, (avatarWizard.step || 1) + 1);
      paint("stuff");
      try { startAvatarWizardPreviewAnims(); } catch (eP) {}
      return;
    }
    if (ev.target.closest("[data-avatar-wiz-save]") && avatarWizard) {
      var nm3 = document.getElementById("avatar-wiz-name");
      if (nm3) avatarWizard.name = nm3.value.trim();
      saveAvatarWizardToStuff();
      return;
    }
    if (ev.target.closest("[data-wiz-remove-file]") && avatarWizard) {
      var rm = ev.target.closest("[data-wiz-remove-file]").getAttribute("data-wiz-remove-file");
      avatarWizard.files = avatarWizard.files.filter(function (f) { return f.id !== rm; });
      AVATAR_WIZARD_STATES.forEach(function (st) {
        avatarWizard.mapping[st] = (avatarWizard.mapping[st] || []).filter(function (id) { return id !== rm; });
      });
      if (avatarWizard.thumbFileId === rm) avatarWizard.thumbFileId = "";
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-wiz-thumb]") && avatarWizard) {
      avatarWizard.thumbFileId = ev.target.closest("[data-wiz-thumb]").getAttribute("data-wiz-thumb");
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-wiz-up]") && avatarWizard) {
      var upBtn = ev.target.closest("[data-wiz-up]");
      var stU = upBtn.getAttribute("data-wiz-up");
      var idU = upBtn.getAttribute("data-wiz-id");
      var arrU = avatarWizard.mapping[stU] || [];
      var ixU = arrU.indexOf(idU);
      if (ixU > 0) {
        var t = arrU[ixU - 1]; arrU[ixU - 1] = arrU[ixU]; arrU[ixU] = t;
        avatarWizard.mapping[stU] = arrU;
        paint("stuff");
      }
      return;
    }
    if (ev.target.closest("[data-wiz-down]") && avatarWizard) {
      var dnBtn = ev.target.closest("[data-wiz-down]");
      var stD = dnBtn.getAttribute("data-wiz-down");
      var idD = dnBtn.getAttribute("data-wiz-id");
      var arrD = avatarWizard.mapping[stD] || [];
      var ixD = arrD.indexOf(idD);
      if (ixD >= 0 && ixD < arrD.length - 1) {
        var t2 = arrD[ixD + 1]; arrD[ixD + 1] = arrD[ixD]; arrD[ixD] = t2;
        avatarWizard.mapping[stD] = arrD;
        paint("stuff");
      }
      return;
    }

    var stuffModeBtn = ev.target.closest("[data-stuff-mode]");
    if (stuffModeBtn && session()) {
      stuffMode = stuffModeBtn.getAttribute("data-stuff-mode") || "browse";
      if (stuffMode === "browse") { stuffItemId = null; stuffListMode = false; avatarWizard = null; stuffModeAvatarWizard = false; }
      if (stuffMode === "upload") { stuffItemId = null; stuffListMode = false; }
      paint("stuff");
      return;
    }
    // How this works: Avatar lab buttons (only meaningful when flag on). Wear never touches #stage-slot.
    if (ev.target.closest("[data-lab-wear]") && session() && isAvatarLabOn()) {
      var wearId = ev.target.closest("[data-lab-wear]").getAttribute("data-lab-wear");
      var ww = loadWardrobe();
      var found = false;
      for (var wi = 0; wi < ww.avatars.length; wi++) {
        if (ww.avatars[wi].id === wearId) { found = true; break; }
      }
      if (!found) {
        pushNotice("status", "Lab avatar not found.");
        return;
      }
      ww.activeId = wearId;
      saveWardrobe(ww);
      // ENGINE DEV: activeId stored only — room chrome / #stage-slot unchanged.
      pushNotice("green", "Lab wear saved (does not change room avatar yet).", { transient: true });
      paint("stuff");
      return;
    }
    if (ev.target.closest("[data-lab-export]") && session() && isAvatarLabOn()) {
      var pack = loadWardrobe();
      var blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
      var aEl = document.createElement("a");
      aEl.href = URL.createObjectURL(blob);
      aEl.download = "wardrobe.json";
      document.body.appendChild(aEl);
      aEl.click();
      setTimeout(function () {
        try { URL.revokeObjectURL(aEl.href); } catch (eR) {}
        if (aEl.parentNode) aEl.parentNode.removeChild(aEl);
      }, 500);
      var tmsg = document.getElementById("avatar-lab-tools-msg");
      if (tmsg) tmsg.textContent = "Downloaded wardrobe.json (manifest). SWF bytes stay in IndexedDB whirled2-media — re-upload SWFs after import if needed.";
      return;
    }
    if (ev.target.closest("[data-lab-clear]") && session() && isAvatarLabOn()) {
      if (!confirm("Clear all Avatar lab wardrobe data on this browser? (SWF blobs + manifest)")) return;
      saveWardrobe(emptyWardrobe());
      idbClearAllBlobs().then(function () {
        pushNotice("gray", "Avatar lab data cleared.", { transient: true });
        paint("stuff");
      }).catch(function () {
        pushNotice("gray", "Wardrobe cleared (IndexedDB clear skipped).", { transient: true });
        paint("stuff");
      });
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
      devHubOpen = false;
      avatarGuideOpen = false;
      partyPanelOpen = false;
      paint("help");
      return;
    }
    if (ev.target.closest("[data-help-close]") && session()) {
      helpOpen = false;
      paint("rooms");
      return;
    }
    // Developer Information Hub (?v=20260906au) — Help → Developers / #dev / ?page=dev
    if (ev.target.closest("[data-dev-hub-open]") && session()) {
      devHubOpen = true;
      helpOpen = false;
      legalOpen = false;
      avatarGuideOpen = false;
      partyPanelOpen = false;
      paint("dev");
      return;
    }
    if (ev.target.closest("[data-dev-hub-close]") && session()) {
      devHubOpen = false;
      paint("rooms");
      return;
    }
    // Legal works logged-in or from the gate.
    if (ev.target.closest("[data-legal-open]")) {
      legalOpen = true;
      helpOpen = false;
      devHubOpen = false;
      avatarGuideOpen = false;
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
      makeDoorPanelOpen = false;
      selectedDecId = null;
      paint("rooms");
      try { bindDoorLayerClicks(); } catch (e) {}
      return;
    }
    if (ev.target.closest("[data-make-door-close]") && session()) {
      makeDoorPanelOpen = false;
      paint("rooms");
      return;
    }
    var decSel = ev.target.closest("[data-dec-select]");
    if (decSel && session()) {
      selectedDecId = decSel.getAttribute("data-dec-select");
      if (decSel.getAttribute("data-open-make-door") === "1") makeDoorPanelOpen = true;
      decorateMode = true;
      paint("rooms");
      bindDecorateDrag();
      return;
    }
    if (ev.target.closest("[data-open-make-door]") && session()) {
      if (!selectedDecId) {
        pushNotice("orange", "Select a furniture chip first (tap it on the stage).", { transient: true });
        return;
      }
      makeDoorPanelOpen = true;
      decorateMode = true;
      paint("rooms");
      return;
    }
    if (ev.target.closest("[data-door-glow-toggle]") && session()) {
      doorGlowPreview = !doorGlowPreview;
      paint("rooms");
      return;
    }
    var dropD = ev.target.closest("[data-drop-door]");
    if (dropD && session()) {
      var did = dropD.getAttribute("data-drop-door");
      if (dropDoor(did)) {
        pushNotice("green", "Door dropped — furniture stays; room still exists.", { transient: true });
        makeDoorPanelOpen = false;
        paint("rooms");
        if (decorateMode) bindDecorateDrag();
      }
      return;
    }
    var mkLink = ev.target.closest("[data-make-door-link]");
    if (mkLink && session()) {
      if (!selectedDecId) {
        pushNotice("orange", "Select furniture first.", { transient: true });
        return;
      }
      var sel = document.getElementById("make-door-target");
      var target = sel ? sel.value : "";
      var linked = makeDoorLink(selectedDecId, target);
      if (!linked.ok) {
        pushNotice("orange", linked.error || "Could not link door.");
        return;
      }
      pushNotice("green", "Door linked → “" + linked.doorLabel + "”. Leave Decorate and tap the green door to travel.", { transient: true });
      makeDoorPanelOpen = true;
      paint("rooms");
      bindDecorateDrag();
      return;
    }
    var mkCreate = ev.target.closest("[data-make-door-create]");
    if (mkCreate && session()) {
      if (!selectedDecId) {
        pushNotice("orange", "Select furniture first.", { transient: true });
        return;
      }
      var nameEl = document.getElementById("make-door-name");
      var nm = nameEl ? nameEl.value : "Home";
      var created = makeDoorCreateRoom(selectedDecId, {
        name: nm,
        payWith: mkCreate.getAttribute("data-make-door-create") || "coins"
      });
      if (!created.ok) {
        pushNotice("orange", created.error || "Could not create room.");
        return;
      }
      pushNotice("green", "Room “" + (created.room && created.room.name) + "” created + door linked"
        + (created.free ? " (free home)." : "."), { transient: true });
      makeDoorPanelOpen = false;
      paint("rooms");
      bindDecorateDrag();
      refreshWalletChrome();
      return;
    }
    if (ev.target.closest("[data-complain-stub]") && session()) {
      var cnmC = document.getElementById("chat-name-menu");
      if (cnmC) cnmC.remove();
      pushNotice("orange", "Complain / report — Coming Soon (moderation).", { transient: true });
      return;
    }
    if (ev.target.closest("[data-open-avatar-emotes]") && session()) {
      occMenuId = null;
      paint("rooms");
      var bill = document.querySelector("[data-avatar-hit]") || document.querySelector(".avatar-wear-billboard") || document.querySelector("#avatar-wear-layer .avatar-billboard");
      if (bill) openAvatarEmoteMenu(bill);
      else pushNotice("orange", "Wear an avatar with emotes first (Stuff → Wear).", { transient: true });
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
      try { awardAction("decorate"); } catch (e) {}
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
    var partyInv = ev.target.closest("[data-party-invite]");
    if (partyInv && session()) {
      var pidInv = loadMyPartyId();
      var pty = pidInv ? findParty(pidInv) : null;
      if (!pty) { pushNotice("orange", "Join or create a party first.", { transient: true }); return; }
      var fid = partyInv.getAttribute("data-party-invite");
      var fname = partyInv.getAttribute("data-party-invite-name") || fid;
      var plistI = loadParties();
      for (var pi2 = 0; pi2 < plistI.length; pi2++) {
        if (plistI[pi2].id === pty.id) {
          plistI[pi2].invites = plistI[pi2].invites || [];
          if (!plistI[pi2].invites.some(function (m) { return String(m.id) === String(fid); })) {
            plistI[pi2].invites.push({ id: fid, name: fname, at: new Date().toISOString() });
          }
          break;
        }
      }
      saveParties(plistI);
      pushNotice("blue", "Invited " + fname + " to party “" + (pty.name || "Party") + "”.", { transient: true });
      partyPanelOpen = true;
      if (inRoom) paint("rooms"); else paint("rooms");
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
      // How this works: Add Friend opens the Let's be buddies! customize-message
      // modal (same path as invite-buddy). Instant add only if already friends.
      var fid = addF.getAttribute("data-add-friend");
      var fname = addF.getAttribute("data-friend-name") || fid;
      if (loadFriends().some(function (f) { return f.id === fid; })) {
        pushNotice("gray", fname + " is already on your friends list.");
        return;
      }
      friendInvitePending = { id: fid, name: fname };
      occMenuId = null;
      var chatMenu = document.getElementById("chat-name-menu");
      if (chatMenu) chatMenu.remove();
      if (!document.getElementById("buddy-invite-modal")) {
        var wrapAdd = document.createElement("div");
        wrapAdd.innerHTML = friendInvitePopup();
        if (wrapAdd.firstChild) document.getElementById("app").appendChild(wrapAdd.firstChild);
      }
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
    // How this works: ♥ Favorite must run before opening the card (fav sits inside data-shop-item).
    var shopFav = ev.target.closest("[data-shop-fav]");
    if (shopFav && session()) {
      toggleFavorite(shopFav.getAttribute("data-shop-fav"));
      paint("shop");
      return;
    }
    var shopItemBtn = ev.target.closest("[data-shop-item]");
    if (shopItemBtn && session()) {
      shopItemId = shopItemBtn.getAttribute("data-shop-item") || null;
      paint("shop");
      try { awardAction("shopView"); } catch (e) {}
      return;
    }
    if (ev.target.closest("[data-shop-back]") && session()) {
      shopItemId = null;
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
    var gamesHomeBtn = ev.target.closest("[data-games-home]");
    if (gamesHomeBtn && session()) {
      // Purpose: Games home nav (Browse / Tables / AVR / My scores).
      // How: data-games-home sets gamesMode; clears detail view.
      // Why: one consistent landing without inventing catalog.
      var gh = gamesHomeBtn.getAttribute("data-games-home") || "browse";
      if (gh === "lobby") gamesMode = "lobby";
      else if (gh === "scores") gamesMode = "scores";
      else if (gh === "avr") gamesMode = "avr";
      else gamesMode = "browse";
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
      leaveRoomResetChat();
      pushNotice("blue", "Group hall → Rooms lobby / Studio Loft (shared halls later).");
      paint("rooms");
      return;
    }
    var openMusic = ev.target.closest("[data-open-room-music]");
    if (openMusic && session()) {
      // How this works: one-tap Room music on mobile (toolbar was hard to find).
      // Beginner: collapses Open player so it does not cover the paste link box.
      // ENGINE DEV: dirty + collapseRoomEmbedSheet before paint; focus paste field after mount.
      if (!inRoom) {
        pushNotice("gray", "Enter a room first to play music.", { transient: true });
        return;
      }
      roomMenuOpen = false;
      var rmM = document.getElementById("room-menu");
      if (rmM) rmM.hidden = true;
      playlistPanelOpen = true;
      playlistPanelDirty = true;
      collapseRoomEmbedSheet();
      roomPanelOpen = false;
      roomItemsPanelOpen = false;
      decorateMode = false;
      partyPanelOpen = false;
      paint("rooms");
      focusPlaylistEmbedUrl();
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
        roomImmersiveForcedOff = false;
        try { updateLandscapeImmersion(); } catch (eRmImm) {}
        roomPanelOpen = false;
        playlistPanelOpen = false;
        decorateMode = false;
        leaveRoomResetChat();
        paint("rooms");
      } else if (rm === "comment") {
        if (!inRoom) { inRoom = true; }
        roomPanelOpen = true;
        playlistPanelOpen = false;
        paint("rooms");
        loadOccupants();
      } else if (rm === "decorate") {
        if (!inRoom) { inRoom = true; }
        try { ensureDoorStubFurniture(); } catch (eSt) {}
        decorateMode = true;
        roomPanelOpen = false;
        playlistPanelOpen = false;
        partyPanelOpen = false;
        makeDoorPanelOpen = false;
        paint("rooms");
        loadOccupants();
        bindDecorateDrag();
      } else if (rm === "playlist") {
        if (!inRoom) { inRoom = true; }
        playlistPanelOpen = true;
        playlistPanelDirty = true;
        collapseRoomEmbedSheet();
        roomPanelOpen = false;
        decorateMode = false;
        partyPanelOpen = false;
        paint("rooms");
        loadOccupants();
        syncRoomAudio();
        focusPlaylistEmbedUrl();
      } else if (rm === "view-items") {
        if (!inRoom) { inRoom = true; }
        roomItemsPanelOpen = true;
        decorateMode = false;
        roomPanelOpen = false;
        playlistPanelOpen = false;
        partyPanelOpen = false;
        paint("rooms");
        loadOccupants();
      } else if (rm === "clickable") {
        // How this works (?v=20260906at): wiki green glow for doors (clickable furniture).
        doorGlowPreview = !doorGlowPreview;
        pushNotice("green", doorGlowPreview
          ? "Door glow on — green chips are doors. Tap a door to travel."
          : "Door glow off.", { transient: true });
        if (inRoom) paint("rooms");
        try { bindDoorLayerClicks(); } catch (eGl) {}
      } else if (rm === "snapshot") {
        pushNotice("orange", "Snapshot stub — engine will capture the stage later.");
      } else if (rm === "zoom") {
        pushNotice("orange", "Zoom stub — engine camera later.");
      }
      return;
    }
    var roomLockBtn = ev.target.closest("[data-room-lock]");
    if (roomLockBtn && session()) {
      // How this works: three click choices — Unlocked / Friends / Locked (wiki). Owner only.
      if (!canSetRoomLock(currentRoomId || "loft")) {
        pushNotice("orange", "Only the room owner can change the lock.", { transient: true });
        return;
      }
      saveRoomLock(roomLockBtn.getAttribute("data-room-lock") || "unlocked", currentRoomId || "loft");
      pushNotice("green", "Room lock: " + (roomLockBtn.getAttribute("data-room-lock") || "unlocked") + ".", { transient: true });
      var rmenu2 = document.getElementById("room-menu");
      if (rmenu2) rmenu2.hidden = true;
      roomMenuOpen = false;
      if (inRoom) paint("rooms");
      else {
        paint(document.querySelector(".tab.is-on") ? document.querySelector(".tab.is-on").getAttribute("data-tab") : "rooms");
      }
      return;
    }
    if (ev.target.closest("[data-room-panel-close]") && session()) {
      roomPanelOpen = false;
      paint("rooms");
      return;
    }
    if (ev.target.closest("[data-room-items-close]") && session()) {
      roomItemsPanelOpen = false;
      paint("rooms");
      return;
    }
    if (ev.target.closest("[data-playlist-close]") && session()) {
      // How this works: explicit Close only (also backdrop via capture binder).
      closePlaylistPanel();
      paint("rooms");
      return;
    }
    // Backdrop tap: target is the modal root itself (not the card).
    if (ev.target && ev.target.id === "room-playlist-panel" && session()) {
      closePlaylistPanel();
      paint("rooms");
      return;
    }
    // Card taps must never dismiss — stopPropagation so stage/chat behind do not steal the gesture.
    var plCard = ev.target.closest("[data-playlist-card]");
    if (plCard && session()) {
      ev.stopPropagation();
      // fall through to specific playlist controls below
    }
    var setEmbedBtn = ev.target.closest("[data-playlist-set-embed]");
    if (setEmbedBtn && session()) {
      ev.preventDefault();
      ev.stopPropagation();
      applyPlaylistEmbedFromUi(ev);
      return;
    }
    // How this works: mobile embed controls live OUTSIDE the iframe (iOS often blocks tiny YT taps).
    // Beginner: Open player = bigger sheet; Tap play = scroll/focus iframe; Open on YouTube/Spotify = real browser tab.
    // ENGINE DEV: dock stays under #app (shell). Document capture listener is backup for weird mobile bubbling.
    var embedExpand = ev.target.closest("[data-embed-expand]");
    if (embedExpand) {
      roomEmbedExpanded = true;
      var dockEx = document.getElementById("room-embed-dock");
      if (dockEx) {
        applyRoomEmbedExpanded(dockEx);
        try { dockEx.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (eSc) {}
        var fr = dockEx.querySelector("iframe.room-embed-frame");
        if (fr) { try { fr.focus(); } catch (eF) {} }
      }
      return;
    }
    var embedCollapse = ev.target.closest("[data-embed-collapse]");
    if (embedCollapse) {
      roomEmbedExpanded = false;
      var dockCol = document.getElementById("room-embed-dock");
      if (dockCol) applyRoomEmbedExpanded(dockCol);
      return;
    }
    var embedFocus = ev.target.closest("[data-embed-focus]");
    if (embedFocus) {
      roomEmbedExpanded = true;
      var dockFo = document.getElementById("room-embed-dock");
      if (dockFo) {
        applyRoomEmbedExpanded(dockFo);
        try { dockFo.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (eSc2) {}
        var fr2 = dockFo.querySelector("iframe.room-embed-frame");
        // How this works: focus only — do NOT fr.click() (that could dismiss / steal the gesture on some mobiles).
        if (fr2) { try { fr2.focus(); } catch (eF2) {} }
      }
      return;
    }
    // How this works: taps inside Room music side panel must not dismiss it (only Close / leave / clearStrayUI).
    if (ev.target.closest("#room-playlist-panel") && !ev.target.closest("[data-playlist-close]") && session()) {
      // Fall through to specific playlist controls below — do not treat as outside-dismiss.
    }
    if (ev.target.closest("[data-playlist-open-panel]") && session()) {
      // How this works: compact dock button opens Room music side panel.
      // Beginner: collapses Open player first so paste UI is not covered (sheet z=100 vs panel).
      if (!inRoom) inRoom = true;
      playlistPanelOpen = true;
      playlistPanelDirty = true;
      collapseRoomEmbedSheet();
      roomPanelOpen = false;
      decorateMode = false;
      partyPanelOpen = false;
      paint("rooms");
      syncRoomAudio();
      focusPlaylistEmbedUrl();
      return;
    }
    var plSrcBtn = ev.target.closest("[data-playlist-source]");
    if (plSrcBtn && session()) {
      // Hard rule: canControlRoomMusic gates source tabs (loft owner OR claimed playlist.ownerId).
      if (!canControlRoomMusic()) {
        pushNotice("orange", "Owner controls room music.");
        return;
      }
      var nextSrc = normalizePlaylistSource(plSrcBtn.getAttribute("data-playlist-source"));
      var plS = loadPlaylist();
      plS.source = nextSrc;
      plS.ownerControlsMusic = true;
      claimPlaylistOwnerIfNeeded(plS);
      // When switching to embeds, keep local tracks but prefer owner-only adds.
      if (nextSrc !== "local" && typeof plS.ownerOnlyAdd !== "boolean") plS.ownerOnlyAdd = true;
      // How this works: local source tears down embed dock — clear expanded sheet flag.
      if (nextSrc === "local") roomEmbedExpanded = false;
      savePlaylist(plS);
      playlistPanelOpen = true;
      playlistPanelDirty = true; // source tabs change body → allow one remount
      paint("rooms");
      syncRoomAudio();
      focusPlaylistEmbedUrl();
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
      // How this works (20260906af): toggle mute, persist, then mute-safe sync (unload when muted).
      // Beginner: Mute remembers on this browser and does not leave a broken half-loaded track.
      // ENGINE DEV: muted → remove embed dock / clear local audio src; unmute remounts from playlist.
      roomAudioMuted = !roomAudioMuted;
      saveRoomMutedPref(roomAudioMuted);
      var aMute = document.getElementById("room-audio");
      if (aMute) {
        aMute.muted = roomAudioMuted;
        try { aMute.volume = roomAudioMuted ? 0 : roomAudioVolume; } catch (eV) {}
      }
      try {
        document.querySelectorAll("#room-embed-dock [data-room-mute], #room-playlist-panel [data-room-mute], .tb-vol-pop [data-room-mute]").forEach(function (b) {
          b.textContent = roomAudioMuted ? "Unmute" : "Mute";
        });
        var volWrap = document.querySelector(".tb-vol-wrap");
        if (volWrap) {
          if (roomAudioMuted) volWrap.classList.add("is-muted");
          else volWrap.classList.remove("is-muted");
        }
        var volBtn = document.querySelector(".tb.tb-vol");
        if (volBtn) volBtn.title = roomAudioMuted ? "Unmute room music" : "Mute room music";
      } catch (eMuteLbl) {}
      try { syncRoomAudio(); } catch (eSyncMute) {}
      if (playlistPanelOpen && inRoom) {
        playlistPanelDirty = true;
        paint("rooms");
      }
      return;
    }
    if (ev.target.closest("[data-vol-toggle]") && session()) {
      // How this works: open/close the volume slider popover next to the toolbar speaker.
      volPopoverOpen = !volPopoverOpen;
      var pop = document.getElementById("tb-vol-pop");
      var wrap = document.querySelector(".tb-vol-wrap");
      if (pop) pop.hidden = !volPopoverOpen;
      if (wrap) {
        if (volPopoverOpen) wrap.classList.add("is-open");
        else wrap.classList.remove("is-open");
      }
      return;
    }
    var volSlider = ev.target.closest("[data-vol-slider]");
    if (volSlider && session()) {
      // input event handled separately — click path no-op
      return;
    }
    if (ev.target.closest("[data-playlist-next]") && session() && canControlRoomMusic()) {
      // playlistNext already increments once + paints/syncs — do not double-increment or double-paint.
      playlistNext(false);
      return;
    }
    var plPlay = ev.target.closest("[data-playlist-play]");
    if (plPlay && session() && canControlRoomMusic()) {
      var pl = loadPlaylist();
      pl.current = Math.max(0, Number(plPlay.getAttribute("data-playlist-play")) || 0);
      savePlaylist(pl);
      playlistPanelDirty = true;
      paint("rooms");
      syncRoomAudio();
      return;
    }
    var plRem = ev.target.closest("[data-playlist-remove]");
    if (plRem && session() && canControlRoomMusic()) {
      var pl2 = loadPlaylist();
      var ri = Number(plRem.getAttribute("data-playlist-remove"));
      if (ri >= 0 && ri < pl2.tracks.length) {
        pl2.tracks.splice(ri, 1);
        if (pl2.current >= pl2.tracks.length) pl2.current = Math.max(0, pl2.tracks.length - 1);
        savePlaylist(pl2);
      }
      playlistPanelDirty = true;
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
    var joinThem = ev.target.closest("[data-join-them]");
    if (joinThem && session()) {
      // How this works: Join them! drops you into Studio Loft with your friend (local occupants).
      var jname = joinThem.getAttribute("data-join-name") || "friend";
      if (!tryEnterLoft()) {
        paint("rooms");
        return;
      }
      clearRoomChatDisplay(true);
      paint("rooms");
      loadOccupants();
      pushNotice("blue", "Joined " + jname + " in Studio Loft.");
      try { awardAction("enterRoom"); } catch (e) {}
      return;
    }
    var passGo = ev.target.closest("[data-passport-go]");
    if (passGo && session()) {
      goPassportStamp(findStamp(passGo.getAttribute("data-passport-go")));
      return;
    }
    var mailReply = ev.target.closest("[data-mail-reply]");
    if (mailReply && session()) {
      ev.stopPropagation();
      var rid = mailReply.getAttribute("data-mail-reply");
      var rmsg = loadMail().filter(function (m) { return m.id === rid; })[0];
      if (rmsg) {
        var subj = String(rmsg.subject || "");
        if (!/^re:\s/i.test(subj)) subj = "Re: " + subj;
        // How this works: window.__mailCompose prefills Me→Mail compose (to / subject / optional quote).
        window.__mailCompose = {
          id: rmsg.fromId,
          name: rmsg.fromName || rmsg.fromId,
          subject: subj,
          body: "\n\n---\n" + (rmsg.fromName || "Them") + " wrote:\n" + String(rmsg.body || "")
        };
        meSub = "mail";
        viewingId = null;
        paint("me");
      }
      return;
    }
    var mailFollow = ev.target.closest("[data-mail-followup]");
    if (mailFollow && session()) {
      ev.stopPropagation();
      var fid = mailFollow.getAttribute("data-mail-followup");
      var fmsg = loadMail().filter(function (m) { return m.id === fid; })[0];
      if (fmsg) {
        var fsubj = String(fmsg.subject || "");
        if (!/^follow\s*up:/i.test(fsubj) && !/^re:\s/i.test(fsubj)) fsubj = "Follow up: " + fsubj;
        else if (!/^follow\s*up:/i.test(fsubj)) fsubj = "Follow up: " + fsubj.replace(/^re:\s*/i, "");
        // How this works: Follow up prefills compose like Reply (classic mail).
        window.__mailCompose = {
          id: fmsg.fromId,
          name: fmsg.fromName || fmsg.fromId,
          subject: fsubj,
          body: "\n\n---\n" + (fmsg.fromName || "Them") + " wrote:\n" + String(fmsg.body || "")
        };
        meSub = "mail";
        viewingId = null;
        paint("me");
      }
      return;
    }
    var mailDel = ev.target.closest("[data-mail-delete]");
    if (mailDel && session()) {
      ev.stopPropagation();
      var did = mailDel.getAttribute("data-mail-delete");
      if (did && confirm("Delete this mail?")) {
        deleteMail(did);
        meSub = "mail";
        paint("me");
      }
      return;
    }
    var mailRow = ev.target.closest("[data-mail-id]");
    if (mailRow && session() && !ev.target.closest("form") && !ev.target.closest("[data-mail-reply]") && !ev.target.closest("[data-mail-followup]") && !ev.target.closest("[data-mail-delete]") && !ev.target.closest(".mail-check")) {
      var midOpen = mailRow.getAttribute("data-mail-id");
      markMailRead(midOpen);
      claimGiftFromMail(midOpen);
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
    // How this works: Clear image removes custom profile BG (pending + saved keep flag).
    // Beginner: Upload custom background → preview → Publish; Clear image removes it.
    if (ev.target.closest("[data-skin-clear-bg]") && session()) {
      window.__skinBgPending = "";
      var keepClr = document.querySelector('#skin-form [name="keepImage"]');
      if (keepClr) keepClr.value = "0";
      var hidClr = document.getElementById("skin-bg-data");
      if (hidClr) hidClr.value = "";
      var typeClr = document.querySelector('#skin-form [name="bgType"]');
      if (typeClr && typeClr.value === "image") typeClr.value = "color";
      var uidClr = session().user.id;
      var cur = loadProfileSkin(uidClr);
      cur.bgImage = "";
      if (cur.bgType === "image") cur.bgType = "color";
      saveProfileSkin(uidClr, cur);
      try {
        var formClr = document.getElementById("skin-form");
        if (formClr) {
          var draftClr = readSkinFormDraft(formClr);
          if (draftClr) applyProfileSkinDom(uidClr, draftClr);
          else applyProfileSkinDom(uidClr, cur);
        } else applyProfileSkinDom(uidClr, cur);
      } catch (eClr) {}
      meSub = "profile";
      paint("me");
      pushNotice("green", "Custom background cleared.", { transient: true });
      return;
    }
    var skinPreset = ev.target.closest("[data-skin-preset]");
    if (skinPreset && session()) {
      // How this works: preset click = Publish immediately (save + repaint), Profile look.
      // ENGINE DEV: profile page chrome only; not #stage-slot.
      var pid = skinPreset.getAttribute("data-skin-preset");
      var preset = PROFILE_SKIN_PRESETS[pid];
      if (preset) {
        var formP = document.getElementById("skin-form");
        if (formP) fillSkinFormFromPreset(formP, preset);
        var prevLook = loadProfileSkin(session().user.id);
        var published = saveProfileSkin(session().user.id, Object.assign({}, preset, {
          motto: formP && formP.motto ? String(formP.motto.value || "").trim().slice(0, 80) : (prevLook.motto || ""),
          tagline: formP && formP.tagline ? String(formP.tagline.value || "").trim().slice(0, 100) : (prevLook.tagline || "")
        }));
        window.__skinBgPending = "";
        window.__skinBannerPending = "";
        meSub = "profile";
        viewingId = null;
        profileEditSection = "skin";
        pushNotice("green", "Look published.", { transient: true });
        paint("me");
        try { applyProfileSkinDom(session().user.id, published); } catch (eP) {}
        try {
          var sm = document.getElementById("skin-msg");
          if (sm) sm.textContent = "Look published.";
        } catch (eMsg) {}
      }
      return;
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
    var nMark = ev.target.closest("[data-notice-mark]");
    if (nMark && session()) {
      markNoticeRead(nMark.getAttribute("data-notice-mark"));
      if (meSub === "notices") paint("me");
      return;
    }
    if (ev.target.closest("[data-notices-mark-all]") && session()) {
      markAllNoticesRead();
      if (meSub === "notices") paint("me");
      return;
    }
    if (ev.target.closest("[data-notice-clear-all]") && session()) {
      loadNotices();
      notices = [];
      persistNotices();
      renderNotices();
      if (meSub === "notices") paint("me");
      return;
    }
    var hangSkip = ev.target.closest("[data-hangout-skip]");
    if (hangSkip) {
      hangoutInvitePending = null;
      var hm = document.getElementById("hangout-invite-modal");
      if (hm) hm.remove();
      return;
    }
    var hangSend = ev.target.closest("[data-hangout-send]");
    if (hangSend && session()) {
      var picks = document.querySelectorAll(".hangout-pick:checked");
      var n = 0;
      picks.forEach(function (cb) {
        var hid = cb.getAttribute("data-hangout-id");
        var hname = cb.getAttribute("data-hangout-name") || hid;
        if (hid) {
          createFriendRequest(hid, hname, "Hey — we hung out in the loft. Let's be buddies!");
          n++;
        }
      });
      hangoutInvitePending = null;
      var hm2 = document.getElementById("hangout-invite-modal");
      if (hm2) hm2.remove();
      pushNotice("friending", n ? ("Sent " + n + " friend request" + (n === 1 ? "" : "s") + ".") : "No one selected.");
      return;
    }
    var pokeSelfBtn = ev.target.closest("#poke-self-demo");
    if (pokeSelfBtn) {
      // Own profile must never poke self — leftover demo id is a no-op.
      return;
    }
    // How this works (QA 20260906ai): #app also has data-tab="rooms-lobby" for CSS (hide chat bar).
    // Beginner: closest("[data-tab]") used to match #app → paint("rooms-lobby") → wrong Groups stub.
    // Only real nav buttons/links with known tab ids may switch pages.
    var tab = ev.target.closest("button[data-tab], a[data-tab]");
    if (tab && tab.getAttribute("data-tab") && session()) {
      var t = tab.getAttribute("data-tab");
      if (t !== "me" && t !== "stuff" && t !== "games" && t !== "rooms" && t !== "groups" && t !== "shop") return;
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
  // How this works: live preview while typing hex / motto in Customize look (draft, not saved).
  // ENGINE DEV: profile page chrome only; not #stage-slot.
  app.addEventListener("input", function (ev) {
    if (!session() || !ev.target || !ev.target.closest) return;
    // How this works (20260906af): live volume slider — persist + apply to local <audio>.
    // Beginner: drag the slider; music gets quieter/louder. Mute still unloads media safely.
    if (ev.target.getAttribute && ev.target.getAttribute("data-vol-slider") === "1") {
      var pct = Math.max(0, Math.min(100, Number(ev.target.value) || 0));
      roomAudioVolume = pct / 100;
      saveRoomVolumePref(roomAudioVolume);
      var pctEl = document.getElementById("tb-vol-pct");
      if (pctEl) pctEl.textContent = pct + "%";
      var aVol = document.getElementById("room-audio");
      if (aVol && !roomAudioMuted) {
        try { aVol.volume = roomAudioVolume; } catch (eAv) {}
      }
      // Dragging volume up while muted → unmute + remount (classic slider feel).
      if (roomAudioMuted && pct > 0) {
        roomAudioMuted = false;
        saveRoomMutedPref(false);
        try { syncRoomAudio(); } catch (eUnmute) {}
        var volWrap = document.querySelector(".tb-vol-wrap");
        if (volWrap) volWrap.classList.remove("is-muted");
      }
      return;
    }
    // How this works (20260906ak): Avatar viewer scale slider — persist per item + live preview.
    // Beginner: drag Scale; preview grows/shrinks. Same value sizes the loft Wear billboard.
    if (ev.target.getAttribute && ev.target.hasAttribute("data-avatar-scale")) {
      var aid = ev.target.getAttribute("data-avatar-scale");
      var spct = Math.max(50, Math.min(200, Number(ev.target.value) || 100));
      var s = saveAvatarScale(aid, spct / 100);
      var spEl = document.getElementById("avatar-scale-pct");
      if (spEl) spEl.textContent = Math.round(s * 100) + "%";
      var vBill = document.querySelector("#avatar-viewer .avatar-viewer-billboard");
      if (vBill) vBill.style.setProperty("--avatar-scale", String(s));
      var wornNow = loadWornAvatar();
      if (wornNow && wornNow.stuffId === aid) {
        try { applyWearBillboardScale(); } catch (eWs) {}
      }
      return;
    }
    if (ev.target.getAttribute && ev.target.getAttribute("data-occ-filter") === "1") {
      occFilterQ = String(ev.target.value || "").slice(0, 40);
      try { refreshOccupantRail(); } catch (eOcc) {}
      var fi = document.getElementById("occ-filter-input");
      if (fi) { try { fi.focus(); fi.selectionStart = fi.selectionEnd = fi.value.length; } catch (eF) {} }
      return;
    }
    var formIn = ev.target.closest("#skin-form");
    if (!formIn) return;
    var n = ev.target.name || "";
    if (n === "bgColor" || n === "bgColor2" || n === "accent" || n === "textColor" || n === "linkColor" || n === "motto" || n === "tagline") {
      // sync pickers when hex typed
      if (n === "bgColor" && formIn.bgColorPicker) formIn.bgColorPicker.value = ev.target.value;
      if (n === "bgColor2" && formIn.bgColor2Picker) formIn.bgColor2Picker.value = ev.target.value;
      if (n === "accent" && formIn.accentPicker) formIn.accentPicker.value = ev.target.value;
      if (n === "textColor" && formIn.textColorPicker) formIn.textColorPicker.value = ev.target.value;
      if (n === "linkColor" && formIn.linkColorPicker) formIn.linkColorPicker.value = ev.target.value;
      try {
        var draftIn = readSkinFormDraft(formIn);
        if (draftIn) applyProfileSkinDom(session().user.id, draftIn);
      } catch (eIn) {}
    }
  });
  app.addEventListener("change", function (ev) {
    // How this works: import wardrobe.json manifest into whirled2.wardrobe (blobs stay in IDB separately).
    if (ev.target.id === "avatar-lab-import-file" && session() && isAvatarLabOn()) {
      var ifile = ev.target.files && ev.target.files[0];
      var imsg = document.getElementById("avatar-lab-tools-msg");
      if (!ifile) return;
      var ireader = new FileReader();
      ireader.onload = function () {
        try {
          var parsed = JSON.parse(String(ireader.result || ""));
          if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.avatars)) {
            throw new Error("Need a wardrobe.json with an avatars array.");
          }
          var cur = loadWardrobe();
          var byId = {};
          cur.avatars.forEach(function (x) { byId[x.id] = x; });
          parsed.avatars.forEach(function (x) {
            if (!x || !x.id) return;
            byId[x.id] = {
              id: String(x.id),
              name: String(x.name || "Avatar").slice(0, 80),
              sha1: String(x.sha1 || ""),
              mime: String(x.mime || "application/x-shockwave-flash"),
              scale: Number(x.scale) > 0 ? Number(x.scale) : 1,
              thumbDataUrl: x.thumbDataUrl ? String(x.thumbDataUrl) : "",
              createdAt: x.createdAt || new Date().toISOString()
            };
          });
          cur.avatars = Object.keys(byId).map(function (k) { return byId[k]; }).slice(0, 100);
          if (parsed.activeId) cur.activeId = parsed.activeId;
          saveWardrobe(cur);
          if (imsg) imsg.textContent = "Imported manifest. Re-upload any missing SWFs so IndexedDB has matching SHA-1 blobs.";
          pushNotice("green", "Wardrobe manifest imported.", { transient: true });
          paint("stuff");
        } catch (eImp) {
          if (imsg) imsg.textContent = eImp.message || "Import failed.";
        }
        try { ev.target.value = ""; } catch (eClr) {}
      };
      ireader.onerror = function () { if (imsg) imsg.textContent = "Could not read JSON file."; };
      ireader.readAsText(ifile);
      return;
    }
    if (ev.target.matches("[data-playlist-owner-only]") && session() && canControlRoomMusic()) {
      var plO = loadPlaylist();
      plO.ownerOnlyAdd = !!ev.target.checked;
      savePlaylist(plO);
      return;
    }
    // How this works (20260906af): Account → Friendly People checkbox.
    // Beginner: when checked, you auto-accept friend requests and appear on Me → Friendly People.
    if (ev.target.matches && ev.target.matches("[data-friendly-toggle]") && session()) {
      setFriendly(session().user.id, !!ev.target.checked);
      var fmsg = document.getElementById("friendly-toggle-msg");
      if (fmsg) {
        fmsg.textContent = ev.target.checked
          ? "You appear on Me → Friendly People for others on this browser."
          : "Off — you will not auto-accept.";
      }
      pushNotice("green", ev.target.checked ? "Friendly Person on." : "Friendly Person off.", { transient: true });
      return;
    }
    // How this works: color pickers sync hex fields + live preview on .profile-page (no Save needed).
    if (ev.target.name === "bgColorPicker" || ev.target.name === "bgColor2Picker" || ev.target.name === "accentPicker"
        || ev.target.name === "textColorPicker" || ev.target.name === "linkColorPicker") {
      var formSync = ev.target.closest("#skin-form");
      if (formSync) {
        var mapName = {
          bgColorPicker: "bgColor", bgColor2Picker: "bgColor2", accentPicker: "accent",
          textColorPicker: "textColor", linkColorPicker: "linkColor"
        };
        var field = formSync.querySelector('[name="' + mapName[ev.target.name] + '"]');
        if (field) field.value = ev.target.value;
        try {
          var draftC = readSkinFormDraft(formSync);
          if (draftC && session()) applyProfileSkinDom(session().user.id, draftC);
        } catch (ePrev) {}
      }
      return;
    }
    // How this works: live preview when selects / text colors change while Customize form is open.
    if (ev.target.closest && ev.target.closest("#skin-form") && session()) {
      var formLive = ev.target.closest("#skin-form");
      if (formLive && (ev.target.name === "bgType" || ev.target.name === "bgRepeat" || ev.target.name === "bgAttachment"
          || ev.target.name === "panelAlpha" || ev.target.name === "bgColor" || ev.target.name === "bgColor2"
          || ev.target.name === "accent" || ev.target.name === "textColor" || ev.target.name === "linkColor"
          || ev.target.name === "fontScale" || ev.target.name === "radius" || ev.target.name === "moduleStyle"
          || ev.target.name === "headerStyle" || ev.target.name === "clearBanner")) {
        try {
          var draftL = readSkinFormDraft(formLive);
          if (draftL) applyProfileSkinDom(session().user.id, draftL);
        } catch (eL) {}
      }
    }
    // How this works (?v=20260906ao): profile background → compress if needed → data URL.
    // Quick (#skin-bg-input-quick): auto-publish via saveProfileSkin so Choose image alone persists.
    // Edit look (#skin-bg-input): still live-previews; Publish look saves fine-tune fields.
    // Beginner: without auto-save, paint() wiped __skinBgPending preview. ENGINE DEV: chrome only.
    if ((ev.target.id === "skin-bg-input" || ev.target.id === "skin-bg-input-quick") && session()) {
      var sfile = ev.target.files && ev.target.files[0];
      var isQuick = ev.target.id === "skin-bg-input-quick";
      if (!sfile) return;
      skinMsgSet("Reading image…");
      compressProfileImageFile(sfile, function (res) {
        if (!res || !res.ok) {
          var err = (res && res.error) || "Could not use that image.";
          skinMsgSet(err);
          try { pushNotice("orange", err, { transient: true }); } catch (eE) {}
          return;
        }
        var dataUrl = String(res.dataUrl || "");
        window.__skinBgPending = dataUrl;
        if (isQuick) {
          // Persist immediately (root-cause fix for missing #skin-form path).
          publishQuickProfileBg(dataUrl, res);
          return;
        }
        // Edit-look path: wire form + live preview; user can still hit Publish look.
        var hid = document.getElementById("skin-bg-data");
        if (hid) hid.value = "pending";
        var keep = document.querySelector('#skin-form [name="keepImage"]');
        if (keep) keep.value = "0";
        var typeSel = document.querySelector('#skin-form [name="bgType"]');
        if (typeSel) typeSel.value = "image";
        var repSel = document.querySelector('#skin-form [name="bgRepeat"]');
        if (repSel) repSel.value = "cover";
        var attSel = document.querySelector('#skin-form [name="bgAttachment"]');
        if (attSel) attSel.value = "scroll";
        var readyMsg = res.compressed
          ? "Image ready (compressed) — previewing; click Publish look to save fine-tune."
          : "Image ready — previewing behind modules; click Publish look to save.";
        skinMsgSet(readyMsg);
        try {
          var formImg = document.getElementById("skin-form");
          var draftImg = readSkinFormDraft(formImg);
          if (draftImg && session()) applyProfileSkinDom(session().user.id, draftImg);
          var thumbs = document.querySelectorAll(".skin-bg-thumb");
          for (var ti = 0; ti < thumbs.length; ti++) thumbs[ti].src = dataUrl;
        } catch (eImg) {}
        pushNotice("green", "Background preview on — Publish look to save.", { transient: true });
      });
      return;
    }
    // How this works (?v=20260906ao): banner compress + auto-save (thin strip under Me nav).
    if (ev.target.id === "skin-banner-input" && session()) {
      var bfile = ev.target.files && ev.target.files[0];
      if (!bfile) return;
      skinMsgSet("Reading banner…");
      compressProfileImageFile(bfile, function (bres) {
        if (!bres || !bres.ok) {
          var berr = (bres && bres.error) || "Could not use that banner.";
          skinMsgSet(berr);
          try { pushNotice("orange", berr, { transient: true }); } catch (eBe) {}
          return;
        }
        var bUrl = String(bres.dataUrl || "");
        window.__skinBannerPending = bUrl;
        var keepB = document.querySelector('#skin-form [name="keepBanner"]');
        if (keepB) keepB.value = "0";
        var clearB = document.querySelector('#skin-form [name="clearBanner"]');
        if (clearB) clearB.checked = false;
        // Persist banner immediately so Cancel / leave Edit look does not lose it.
        publishQuickProfileBanner(bUrl, bres);
      });
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
    if (ev.target.id === "skin-form" && session()) {
      // How this works: Publish look → whirled2.profileSkin.{userId}, then repaint + applyProfileSkinDom.
      // ENGINE DEV: profile page chrome only; not #stage-slot.
      var sd = new FormData(ev.target);
      var sidSkin = session().user.id;
      var prevSkin = loadProfileSkin(sidSkin);
      var bgType = String(sd.get("bgType") || "none");
      var bgImage = "";
      if (bgType === "image") {
        if (window.__skinBgPending) bgImage = String(window.__skinBgPending);
        else if (String(sd.get("keepImage") || "") === "1") bgImage = prevSkin.bgImage || "";
      }
      var bannerImage = "";
      if (sd.get("clearBanner")) bannerImage = "";
      else if (window.__skinBannerPending) bannerImage = String(window.__skinBannerPending);
      else if (String(sd.get("keepBanner") || "") === "1") bannerImage = prevSkin.bannerImage || "";
      var nextSkin = {
        bgType: bgType,
        bgColor: String(sd.get("bgColor") || "#cfe6f5").slice(0, 32),
        bgColor2: String(sd.get("bgColor2") || "#ffffff").slice(0, 32),
        bgImage: bgImage,
        bgRepeat: String(sd.get("bgRepeat") || "cover"),
        bgAttachment: String(sd.get("bgAttachment") || "scroll"),
        accent: String(sd.get("accent") || "#1e6fa8").slice(0, 32),
        textColor: String(sd.get("textColor") || "#16324a").slice(0, 32),
        linkColor: String(sd.get("linkColor") || "#1e6fa8").slice(0, 32),
        panelAlpha: Number(sd.get("panelAlpha") || 0.82),
        motto: String(sd.get("motto") || "").trim().slice(0, 80),
        tagline: String(sd.get("tagline") || "").trim().slice(0, 100),
        fontScale: Number(sd.get("fontScale") || 1),
        radius: String(sd.get("radius") || "soft"),
        moduleStyle: String(sd.get("moduleStyle") || "frosted"),
        headerStyle: String(sd.get("headerStyle") || "band"),
        bannerImage: bannerImage
      };
      if (bgType === "image" && !nextSkin.bgImage) {
        var sm = document.getElementById("skin-msg");
        if (sm) sm.textContent = "Pick an image or choose another background type.";
        return;
      }
      var savedSkin = saveProfileSkin(sidSkin, nextSkin);
      window.__skinBgPending = "";
      window.__skinBannerPending = "";
      meSub = "profile";
      viewingId = null;
      profileEditSection = null;
      pushNotice("green", "Look published — visitors see this on your profile.", { transient: true });
      paint("me");
      try { applyProfileSkinDom(sidSkin, savedSkin); } catch (eSav) {}
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
        try { awardAction("status"); } catch (e) {}
        try { tryStatusCoinGrant(session().user.id); refreshWalletChrome(); } catch (eSt) {}
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
      // Beginner: each new comment gets an id so the owner (or you) can Delete it later.
      wall2.unshift({ id: newWallPostId(), who: you().name, text: text3, at: new Date().toISOString(), kind: "comment", fromId: session().user.id });
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
      try { awardAction("mail"); } catch (e) {}
      pushNotice("blue", "Mail sent.");
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
      // How this works: Send request creates PENDING only — Accept adds mutual friends.
      var bid = ev.target.getAttribute("data-buddy-id");
      var bname = ev.target.getAttribute("data-buddy-name") || bid;
      var bfd = new FormData(ev.target);
      var bmsg = String(bfd.get("message") || "").trim().slice(0, 400) || "Let's be buddies!";
      createFriendRequest(bid, bname, bmsg);
      try { awardAction("friend"); } catch (e) {}
      friendInvitePending = null;
      occMenuId = null;
      meSub = "friends";
      viewingId = null;
      paint("me");
      return;
    }
    // How this works: Avatar lab SWF upload — SHA-1 + IndexedDB blob + wardrobe JSON entry.
    // ENGINE DEV: does not mount Ruffle / does not change #stage-slot.
    if (ev.target.id === "avatar-lab-upload-form" && session() && isAvatarLabOn()) {
      var lfd = new FormData(ev.target);
      var lmsg = document.getElementById("avatar-lab-upload-msg");
      var lname = String(lfd.get("name") || "").trim().slice(0, 80);
      var lscale = Number(lfd.get("scale"));
      if (!(lscale > 0)) lscale = 1;
      if (!lname) { if (lmsg) lmsg.textContent = "Name required."; return; }
      if (!lfd.get("rights")) { if (lmsg) lmsg.textContent = "Rights confirmation required."; return; }
      var swfInput = ev.target.querySelector('input[name="swf"]');
      var thumbInput = ev.target.querySelector('input[name="thumb"]');
      var swfFile = swfInput && swfInput.files && swfInput.files[0];
      var thumbFile = thumbInput && thumbInput.files && thumbInput.files[0];
      if (!swfFile) { if (lmsg) lmsg.textContent = "Pick a .swf file."; return; }
      var looksSwf = /\.swf$/i.test(swfFile.name || "") || /flash|shockwave/i.test(swfFile.type || "");
      if (!looksSwf) { if (lmsg) lmsg.textContent = "File should be a .swf avatar."; return; }
      if (swfFile.size > AVATAR_SWF_MAX_BYTES) {
        if (lmsg) lmsg.textContent = "SWF over classic ~10MB cap for this lab.";
        return;
      }
      if (lmsg) lmsg.textContent = "Hashing + saving…";
      function finishLab(thumbDataUrl) {
        fileToArrayBuffer(swfFile).then(function (buf) {
          return sha1OfArrayBuffer(buf).then(function (sha1) {
            var b64 = arrayBufferToBase64(buf);
            var record = {
              sha1: sha1,
              mime: "application/x-shockwave-flash",
              name: swfFile.name || (lname + ".swf"),
              base64: b64,
              size: swfFile.size,
              storedAt: new Date().toISOString()
            };
            function afterStore() {
              var w = loadWardrobe();
              var id = "av" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
              w.avatars.unshift({
                id: id,
                name: lname,
                sha1: sha1,
                mime: "application/x-shockwave-flash",
                scale: lscale,
                thumbDataUrl: thumbDataUrl || "",
                createdAt: new Date().toISOString()
              });
              saveWardrobe(w);
              // Optional demo server mirror (Pages ignores — lab works local-only).
              try {
                if (window.WhirledApi && typeof window.WhirledApi.postMedia === "function") {
                  window.WhirledApi.postMedia({ sha1: sha1, mime: record.mime, base64: b64, name: record.name }).catch(function () {});
                }
                if (window.WhirledApi && typeof window.WhirledApi.putWardrobe === "function" && session().user) {
                  window.WhirledApi.putWardrobe(session().user.id, w).catch(function () {});
                }
              } catch (eApi) {}
              if (lmsg) lmsg.textContent = "Saved. SHA-1 " + sha1.slice(0, 12) + "… (lab only — room unchanged).";
              pushNotice("green", "Lab avatar “" + lname + "” saved.", { transient: true });
              paint("stuff");
            }
            return idbPutBlob(sha1, record).then(afterStore).catch(function (err) {
              // Fallback: tiny SWFs may sit in localStorage media map if IDB fails.
              try {
                var map = JSON.parse(localStorage.getItem("whirled2.media.fallback") || "{}");
                if (b64.length < 400000) {
                  map[sha1] = record;
                  localStorage.setItem("whirled2.media.fallback", JSON.stringify(map));
                  afterStore();
                  return;
                }
              } catch (eFb) {}
              if (lmsg) lmsg.textContent = (err && err.message) || "Could not store SWF in IndexedDB.";
            });
          });
        }).catch(function (err) {
          if (lmsg) lmsg.textContent = (err && err.message) || "Read/hash failed.";
        });
      }
      if (thumbFile) {
        if (thumbFile.size > 200000) {
          if (lmsg) lmsg.textContent = "Thumb over ~200KB — shrink it.";
          return;
        }
        var tr = new FileReader();
        tr.onload = function () { finishLab(String(tr.result || "")); };
        tr.onerror = function () { if (lmsg) lmsg.textContent = "Could not read thumb."; };
        tr.readAsDataURL(thumbFile);
      } else {
        finishLab("");
      }
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
      function finishSave(thumb, dataUrl, extra) {
        var items = loadStuff();
        var nid = "st" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        var kind = stype === "avatars" ? "avatar" : stype;
        var row = {
          id: nid,
          name: sname,
          description: sdesc,
          kind: kind,
          type: kind,
          category: stype,
          creator: session().user.name,
          ownerId: session().user.id,
          thumb: thumb || "",
          owned: true,
          at: new Date().toISOString()
        };
        if (dataUrl) row.dataUrl = dataUrl;
        if (stype === "avatars") {
          // Beginner: preview / idle frames are what Wear shows; states enable click-to-walk.
          row.preview = thumb || "";
          row.frames = (extra && extra.frames && extra.frames.length) ? extra.frames.slice() : (thumb ? [thumb] : []);
          row.frameDurationsMs = (extra && extra.frameDurationsMs) || [];
          row.states = (extra && extra.states) || { idle: { frames: row.frames.slice(), frameDurationsMs: row.frameDurationsMs.slice() } };
          row.source = (extra && extra.source) || ((extra && extra.asepriteName) ? "aseprite" : "png");
          row.pack = (extra && extra.pack) || {
            name: sname,
            frames: row.frames.slice(),
            thumb: thumb || "",
            states: row.states,
            source: row.source
          };
          if (extra && extra.asepriteDataUrl) {
            row.asepriteDataUrl = extra.asepriteDataUrl;
            row.asepriteName = extra.asepriteName || "avatar.aseprite";
            row.pack.sourceFile = row.asepriteName;
          }
          if (extra && extra.asepriteAttachments) row.asepriteAttachments = extra.asepriteAttachments;
        }
        if (extra) {
          Object.keys(extra).forEach(function (k) {
            if (k === "asepriteDataUrl" || k === "asepriteName" || k === "asepriteAttachments" || k === "pack" || k === "states" || k === "frames" || k === "frameDurationsMs" || k === "source") return;
            row[k] = extra[k];
          });
        }
        items.unshift(row);
        saveStuff(items);
        stuffItemId = nid;
        stuffMode = "detail";
        appendTransaction({ kind: "upload", label: "Uploaded Stuff “" + sname + "” (" + kind + ")", coins: 0 });
        pushNotice("green", "Saved “" + sname + "” to Stuff." + (stype === "avatars" ? " Open it and Wear to show in your loft." : ""), { transient: true });
        try { awardAction("upload"); } catch (e) {}
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
      // Avatar uploads (?v=20260906ao): multi idle + walk PNGs → one item with states; optional .aseprite.
      if (stype === "avatars") {
        var idleInput = ev.target.querySelector('input[name="image"]');
        var walkInput = ev.target.querySelector('input[name="walk"]');
        var aseInput = ev.target.querySelector('input[name="aseprite"]');
        var idleFiles = idleInput && idleInput.files ? Array.prototype.slice.call(idleInput.files, 0) : [];
        var walkFiles = walkInput && walkInput.files ? Array.prototype.slice.call(walkInput.files, 0) : [];
        var aseFiles = aseInput && aseInput.files ? Array.prototype.slice.call(aseInput.files, 0) : [];
        var okTypes = { "image/png":1, "image/jpeg":1, "image/jpg":1, "image/gif":1, "image/webp":1 };
        function readFileList(files, maxBytes, label) {
          return new Promise(function (resolve, reject) {
            if (!files.length) { resolve([]); return; }
            var out = [];
            var i = 0;
            function next() {
              if (i >= files.length) { resolve(out); return; }
              var f = files[i++];
              if (!okTypes[f.type] && label !== "aseprite") {
                reject(new Error(label + " must be PNG/WebP/JPEG/GIF (" + (f.name || "file") + ")."));
                return;
              }
              if (label === "aseprite") {
                var looksAse = /\.aseprite$/i.test(f.name || "") || /\.ase$/i.test(f.name || "");
                if (!looksAse) { reject(new Error("Attachment must be .aseprite / .ase (" + (f.name || "") + ").")); return; }
                if (f.size > 1000000) { reject(new Error("Aseprite over ~1MB: " + (f.name || ""))); return; }
              } else if (f.size > maxBytes) {
                reject(new Error(label + " image over ~200KB: " + (f.name || "")));
                return;
              }
              var r = new FileReader();
              r.onload = function () {
                var dataUrl = String(r.result || "");
                if (label === "aseprite" && dataUrl.length > 1400000) {
                  reject(new Error("Encoded .aseprite too large: " + (f.name || "")));
                  return;
                }
                if (label !== "aseprite" && dataUrl.length > 280000) {
                  reject(new Error("Encoded image too large: " + (f.name || "")));
                  return;
                }
                out.push({ name: f.name || (label + out.length), dataUrl: dataUrl });
                next();
              };
              r.onerror = function () { reject(new Error("Could not read " + (f.name || label))); };
              r.readAsDataURL(f);
            }
            next();
          });
        }
        if (!idleFiles.length && !aseFiles.length) {
          if (msgEl) msgEl.textContent = "Add idle/preview PNG(s) so Wear can show the avatar (walk PNGs optional).";
          return;
        }
        if (!idleFiles.length && aseFiles.length) {
          if (msgEl) msgEl.textContent = "Add at least one idle PNG/WebP preview. .aseprite is stored as an attachment only.";
          return;
        }
        Promise.all([
          readFileList(idleFiles, 200000, "Idle"),
          readFileList(walkFiles, 200000, "Walk"),
          readFileList(aseFiles, 1000000, "aseprite")
        ]).then(function (parts) {
          var idles = parts[0];
          var walks = parts[1];
          var ases = parts[2];
          var idleFrames = idles.map(function (x) { return x.dataUrl; });
          var walkFrames = walks.map(function (x) { return x.dataUrl; });
          var thumbUrl = idleFrames[0] || "";
          var states = {
            idle: { frames: idleFrames.slice(), frameDurationsMs: idleFrames.map(function () { return 200; }) }
          };
          if (walkFrames.length) {
            states.walk = { frames: walkFrames.slice(), frameDurationsMs: walkFrames.map(function () { return 200; }) };
          }
          var extra = {
            states: states,
            frames: idleFrames.slice(),
            frameDurationsMs: states.idle.frameDurationsMs.slice(),
            source: ases.length ? "aseprite" : "png",
            pack: {
              name: sname,
              frames: idleFrames.slice(),
              displayFrames: idleFrames.slice(),
              frameDurationsMs: states.idle.frameDurationsMs.slice(),
              states: states,
              thumb: thumbUrl,
              source: ases.length ? "aseprite" : "png"
            }
          };
          if (ases.length) {
            extra.asepriteDataUrl = ases[0].dataUrl;
            extra.asepriteName = ases[0].name || "avatar.aseprite";
            extra.pack.sourceFile = extra.asepriteName;
            if (ases.length > 1) {
              extra.asepriteAttachments = ases.map(function (a) { return { name: a.name, dataUrl: a.dataUrl }; });
            }
          }
          finishSave(thumbUrl, "", extra);
        }).catch(function (err) {
          if (msgEl) msgEl.textContent = String(err && err.message || err);
        });
        return;
      }
      if (!file) {
        finishSave("", "");
        return;
      }
      var okTypesImg = { "image/png":1, "image/jpeg":1, "image/jpg":1, "image/gif":1, "image/webp":1 };
      if (!okTypesImg[file.type]) {
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
      try { awardAction("shopList"); } catch (e) {}
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
      try { awardAction("party"); } catch (e) {}
      if (inRoom) paint("rooms");
      else paint(document.querySelector(".tab.is-on") ? document.querySelector(".tab.is-on").getAttribute("data-tab") : "rooms");
      renderNotices();
      return;
    }
    if (ev.target.id === "stuff-gift-form" && session()) {
      // How this works: gift removes item from sender Stuff and attaches snapshot to mail.
      var gidItem = ev.target.getAttribute("data-stuff-gift");
      var itemG = findStuff(gidItem);
      var gd = new FormData(ev.target);
      var fidG = String(gd.get("friendId") || "").trim();
      var frG = loadFriends().filter(function (f) { return f.id === fidG; })[0];
      if (!itemG || !frG) return;
      var giftSnap = Object.assign({}, itemG);
      saveStuff(loadStuff().filter(function (it) { return it.id !== gidItem; }));
      sendMail({
        toId: frG.id,
        toName: frG.name,
        subject: "Gift: " + (itemG.name || "item"),
        body: session().user.name + " sent you “" + (itemG.name || "an item") + "” as a gift. Open this mail to claim it into Stuff.",
        giftItem: giftSnap,
        giftClaimed: false
      });
      pushNotice("blue", "Gift sent to " + frG.name + " — item left your Stuff.");
      stuffItemId = null;
      stuffMode = "browse";
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
    if ((ev.target.id === "playlist-embed-form" || ev.target.id === "playlist-smart-embed-form") && session()) {
      // How this works: form submit (Enter) shares applyPlaylistEmbedFromUi with Set embed button.
      // Beginner: Enter after paste also sets the embed; modal stays open.
      applyPlaylistEmbedFromUi(ev);
      return;
    }
    if (ev.target.id === "playlist-add-form" && session()) {
      var plAdd = new FormData(ev.target);
      var stuffId = String(plAdd.get("stuffId") || "");
      var item = findStuff(stuffId);
      if (!item) return;
      var plA = loadPlaylist();
      if (normalizePlaylistSource(plA.source) !== "local") {
        pushNotice("orange", "Switch to My uploads to add local tracks.");
        return;
      }
      if (!canControlRoomMusic() && plA.ownerOnlyAdd) {
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
      if (plA.tracks.length === 1) plA.current = 0;
      savePlaylist(plA);
      playlistPanelOpen = true;
      playlistPanelDirty = true;
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
      var appEl = document.getElementById("app");
      if (!appEl || appEl.getAttribute("data-tab") !== "rooms" || !inRoom) return;
      var ui = loadChatUi();
      if (ui.mode !== "overlay") return;
      ui.hideHistory = !ui.hideHistory;
      saveChatUi(ui);
      refreshChatLog();
      ev.preventDefault();
      return;
    }
    // How this works: Ctrl/Cmd+K opens the command palette (Pages-safe chrome jump).
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === "k" || ev.key === "K") && session()) {
      ev.preventDefault();
      cmdPaletteOpen = true;
      shortcutsOpen = false;
      ensureModernOverlays();
      return;
    }
    if (ev.key === "Escape") {
      if (cmdPaletteOpen) { cmdPaletteOpen = false; var cpE = document.getElementById("cmd-palette"); if (cpE) cpE.remove(); return; }
      if (shortcutsOpen) { shortcutsOpen = false; var soE = document.getElementById("shortcuts-overlay"); if (soE) soE.remove(); return; }
      if (friendsPopupOpen) { friendsPopupOpen = false; var fpE = document.getElementById("friends-toolbar-pop"); if (fpE) fpE.remove(); return; }
      return;
    }
    if (ev.key === "?" && session() && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      var tag = (ev.target && ev.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (ev.target && ev.target.isContentEditable)) return;
      ev.preventDefault();
      shortcutsOpen = true;
      cmdPaletteOpen = false;
      ensureModernOverlays();
      return;
    }
    if (ev.key === "/" && session() && inRoom && !ev.ctrlKey && !ev.metaKey) {
      var tag2 = (ev.target && ev.target.tagName) || "";
      if (tag2 === "INPUT" || tag2 === "TEXTAREA") return;
      var cin2 = document.getElementById("chat-input");
      if (cin2) { ev.preventDefault(); cin2.focus(); }
    }
  });
  // How this works (?v=20260906aq): desktop hover shows reaction bar.
  // Beginner (mobile): hover-show was leaving floating emoji pills on the room floor.
  // Phones use long-press on a message instead; picker stays hidden until then.
  function isCoarsePointer() {
    try {
      return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    } catch (e) { return false; }
  }
  document.addEventListener("mouseover", function (ev) {
    if (isCoarsePointer()) return;
    var row = ev.target.closest && ev.target.closest(".chat-row[data-msg-id]");
    if (!row) return;
    var bar = row.querySelector(".react-bar");
    if (bar) { bar.hidden = false; row.classList.add("is-react-open"); }
  }, true);
  document.addEventListener("mouseout", function (ev) {
    if (isCoarsePointer()) return;
    var row = ev.target.closest && ev.target.closest(".chat-row[data-msg-id]");
    if (!row) return;
    var to = ev.relatedTarget;
    if (to && row.contains(to)) return;
    var bar = row.querySelector(".react-bar");
    if (bar) { bar.hidden = true; row.classList.remove("is-react-open"); }
  }, true);
  // Long-press (~450ms) on mobile chat row → tidy reaction picker under that message.
  var reactPressTimer = 0;
  var reactPressRow = null;
  document.addEventListener("touchstart", function (ev) {
    if (!isCoarsePointer()) return;
    var row = ev.target.closest && ev.target.closest(".chat-row[data-msg-id]");
    if (!row) return;
    reactPressRow = row;
    if (reactPressTimer) clearTimeout(reactPressTimer);
    reactPressTimer = setTimeout(function () {
      reactPressTimer = 0;
      document.querySelectorAll(".chat-row.is-react-open").forEach(function (r) {
        r.classList.remove("is-react-open");
        var b = r.querySelector(".react-bar");
        if (b) b.hidden = true;
      });
      if (!reactPressRow) return;
      var bar = reactPressRow.querySelector(".react-bar");
      if (bar) { bar.hidden = false; reactPressRow.classList.add("is-react-open"); }
    }, 450);
  }, { passive: true, capture: true });
  document.addEventListener("touchend", function () {
    if (reactPressTimer) { clearTimeout(reactPressTimer); reactPressTimer = 0; }
  }, { passive: true, capture: true });
  document.addEventListener("touchmove", function () {
    if (reactPressTimer) { clearTimeout(reactPressTimer); reactPressTimer = 0; }
  }, { passive: true, capture: true });
  document.addEventListener("scroll", function (ev) {
    var t = ev.target;
    if (!t || !t.id) return;
    if (t.id === "chat-log" || t.id === "chat-overlay") {
      chatPinnedScroll = (t.scrollHeight - t.scrollTop - t.clientHeight) > 48;
    }
  }, true);

  // Avatar wizard file inputs + remap selects (?v=20260906ar)
  document.addEventListener("change", function (ev) {
    if (!avatarWizard || !session()) return;
    var t = ev.target;
    if (!t) return;
    if (t.id === "avatar-wiz-images" || t.id === "avatar-wiz-folder") {
      var files = Array.prototype.slice.call(t.files || [], 0);
      var msg = document.getElementById("avatar-wiz-msg");
      var chain = Promise.resolve();
      files.forEach(function (file) {
        chain = chain.then(function () {
          var pathName = file.webkitRelativePath || file.name || "frame.png";
          if (file.size > 220000) throw new Error("Image too large: " + pathName);
          return readBlobAsDataUrl(file, 220000).then(function (dataUrl) {
            if (dataUrl.length > 300000) throw new Error("Encoded image too large: " + pathName);
            var sug = guessStateFromName(pathName);
            var id = "f" + Math.random().toString(36).slice(2, 9);
            avatarWizard.files.push({ id: id, name: pathName, dataUrl: dataUrl, kind: "image", suggested: sug });
            if (!avatarWizard.mapping[sug]) avatarWizard.mapping[sug] = [];
            avatarWizard.mapping[sug].push(id);
            if (!avatarWizard.thumbFileId) avatarWizard.thumbFileId = id;
          });
        });
      });
      chain.then(function () { paint("stuff"); }).catch(function (err) {
        if (msg) msg.textContent = String(err && err.message || err);
      });
      return;
    }
    if (t.id === "avatar-wiz-zip") {
      var zf = t.files && t.files[0];
      var msgZ = document.getElementById("avatar-wiz-msg");
      if (!zf) return;
      if (zf.size > 8 * 1024 * 1024) {
        if (msgZ) msgZ.textContent = "Zip over ~8MB — unzip locally and upload the folder.";
        return;
      }
      zf.arrayBuffer().then(function (ab) {
        return parseZipImages(ab);
      }).then(function (imgs) {
        imgs.forEach(function (im) {
          avatarWizard.files.push(im);
          var sug = im.suggested || "idle";
          if (!avatarWizard.mapping[sug]) avatarWizard.mapping[sug] = [];
          avatarWizard.mapping[sug].push(im.id);
          if (!avatarWizard.thumbFileId) avatarWizard.thumbFileId = im.id;
        });
        if (msgZ) msgZ.textContent = imgs.length ? ("Added " + imgs.length + " images from zip.") : "No PNG/WebP/JPEG found in zip.";
        paint("stuff");
      }).catch(function (err) {
        if (msgZ) msgZ.textContent = String(err && err.message || err);
      });
      return;
    }
    if (t.id === "avatar-wiz-ase") {
      var ases = Array.prototype.slice.call(t.files || [], 0);
      var msgA = document.getElementById("avatar-wiz-msg");
      var cA = Promise.resolve();
      ases.forEach(function (file) {
        cA = cA.then(function () {
          if (file.size > 1000000) throw new Error("Aseprite over ~1MB: " + file.name);
          return readBlobAsDataUrl(file, 1000000).then(function (dataUrl) {
            avatarWizard.files.push({
              id: "a" + Math.random().toString(36).slice(2, 9),
              name: file.name || "avatar.aseprite",
              dataUrl: dataUrl,
              kind: "aseprite"
            });
            avatarWizard.notes = avatarWizard.notes || [];
            avatarWizard.notes.push("Aseprite stored as attachment — export PNG sequence for loft frames.");
          });
        });
      });
      cA.then(function () {
        if (msgA) msgA.textContent = "Aseprite attached. Still add PNG frames for Wear/idle/walk.";
        paint("stuff");
      }).catch(function (err) {
        if (msgA) msgA.textContent = String(err && err.message || err);
      });
      return;
    }
    if (t.id === "avatar-wiz-swf") {
      var sw = t.files && t.files[0];
      var msgS = document.getElementById("avatar-wiz-msg");
      if (!sw) return;
      if (!isAvatarLabOn()) {
        if (msgS) msgS.textContent = "SWF will be stored. Add PNG idle/walk for loft walk; enable Classic Flash on the item for Ruffle.";
      }
      readBlobAsDataUrl(sw, 5 * 1024 * 1024).then(function (dataUrl) {
        avatarWizard.files.push({
          id: "s" + Math.random().toString(36).slice(2, 9),
          name: sw.name || "avatar.swf",
          dataUrl: dataUrl,
          kind: "swf"
        });
        if (msgS) msgS.textContent = "SWF attached (Experimental). Add PNG idle/walk for loft walk — or Wear SWF-only with Classic Flash.";
        paint("stuff");
      }).catch(function (err) {
        if (msgS) msgS.textContent = String(err && err.message || err);
      });
      return;
    }
    if (t.getAttribute && t.getAttribute("data-wiz-reassign") && avatarWizard) {
      var fid = t.getAttribute("data-wiz-reassign");
      var from = t.getAttribute("data-wiz-from");
      var to = t.value;
      if (from === to) return;
      avatarWizard.mapping[from] = (avatarWizard.mapping[from] || []).filter(function (id) { return id !== fid; });
      if (!avatarWizard.mapping[to]) avatarWizard.mapping[to] = [];
      avatarWizard.mapping[to].push(fid);
      paint("stuff");
      return;
    }
    if (t.getAttribute && t.getAttribute("data-wiz-fps") && avatarWizard) {
      var stF = t.getAttribute("data-wiz-fps");
      avatarWizard.fps[stF] = Math.max(1, Math.min(24, parseInt(t.value, 10) || 5));
      return;
    }
    if (t.getAttribute && t.getAttribute("data-wiz-once") && avatarWizard) {
      avatarWizard.loopOnce[t.getAttribute("data-wiz-once")] = !!t.checked;
      return;
    }
  }, true);


})();