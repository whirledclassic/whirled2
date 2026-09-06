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
  var LOGO_V = "20260906r";
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
  var WALLET_KEY = "whirled2.wallet."; // + userId
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
  // playlist panel. Tracks live in localStorage whirled2.playlist.loft.
  // source: local | youtube | spotify. Local uses HTML5 <audio id="room-audio">;
  // embeds use #room-embed-dock iframe (chrome sibling under stage — not #stage-slot).
  // ENGINE DEV: keep embed dock outside Pixi mount so stage stays clear.
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
    // How this works: current = track index (legacy currentIndex migrated on load).
    // ownerControlsMusic: only loft owner may switch source / paste embeds (hard).
    // ownerOnlyAdd: guests may add local tracks only when false; never change yt/spotify.
    return {
      source: "local",
      tracks: [],
      current: 0,
      ownerOnlyAdd: true,
      ownerControlsMusic: true,
      embedUrl: "",
      embedSrc: "",
      embedTitle: ""
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
      p.source = normalizePlaylistSource(p.source);
      p.embedUrl = String(p.embedUrl || "");
      p.embedSrc = String(p.embedSrc || "");
      p.embedTitle = String(p.embedTitle || "").slice(0, 120);
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
  function myMusicStuff() {
    return loadStuff().filter(function (it) {
      var k = String(it.kind || it.type || it.category || "").toLowerCase();
      return k === "music" && (it.dataUrl || it.audio || it.thumb);
    });
  }
  // How this works: parse pasted YouTube / Spotify URLs into safe nocookie / embed iframe src.
  // Only https youtube / youtu.be / youtube-nocookie and open.spotify.com hosts allowed.
  function parseYouTubeEmbed(raw) {
    raw = String(raw || "").trim();
    if (!raw) return { ok: false, error: "Paste a YouTube video or playlist URL." };
    var u;
    try { u = new URL(raw); } catch (e) { return { ok: false, error: "That does not look like a valid URL." }; }
    if (u.protocol !== "https:") return { ok: false, error: "Use https:// YouTube links only." };
    var host = (u.hostname || "").toLowerCase().replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be" && host !== "youtube-nocookie.com") {
      return { ok: false, error: "Only youtube.com / youtu.be links are allowed." };
    }
    var list = u.searchParams.get("list") || "";
    var vid = "";
    if (host === "youtu.be") {
      vid = (u.pathname || "").replace(/^\//, "").split("/")[0] || "";
    } else if ((u.pathname || "").indexOf("/embed/") === 0) {
      vid = (u.pathname || "").split("/")[2] || "";
      if (!list && u.searchParams.get("list")) list = u.searchParams.get("list");
    } else if ((u.pathname || "").indexOf("/playlist") === 0) {
      list = list || u.searchParams.get("list") || "";
    } else {
      vid = u.searchParams.get("v") || "";
      if (!vid && (u.pathname || "").indexOf("/shorts/") === 0) {
        vid = (u.pathname || "").split("/")[2] || "";
      }
      if (!vid && (u.pathname || "").indexOf("/live/") === 0) {
        vid = (u.pathname || "").split("/")[2] || "";
      }
    }
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(vid || "x") && vid) {
      return { ok: false, error: "Could not read a YouTube video id." };
    }
    if (list && !/^[A-Za-z0-9_-]{6,64}$/.test(list)) {
      return { ok: false, error: "Could not read a YouTube playlist id." };
    }
    var src = "";
    var title = "YouTube";
    if (list && (!vid || (u.pathname || "").indexOf("/playlist") === 0)) {
      src = "https://www.youtube-nocookie.com/embed/videoseries?list=" + encodeURIComponent(list);
      title = "YouTube playlist";
    } else if (vid) {
      src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(vid);
      title = "YouTube video";
    } else if (list) {
      src = "https://www.youtube-nocookie.com/embed/videoseries?list=" + encodeURIComponent(list);
      title = "YouTube playlist";
    } else {
      return { ok: false, error: "Need a watch, youtu.be, or playlist URL." };
    }
    return { ok: true, embedUrl: raw, embedSrc: src, embedTitle: title };
  }
  function parseSpotifyEmbed(raw) {
    raw = String(raw || "").trim();
    if (!raw) return { ok: false, error: "Paste a Spotify track, album, playlist, or episode URL." };
    var u;
    try { u = new URL(raw); } catch (e) { return { ok: false, error: "That does not look like a valid URL." }; }
    if (u.protocol !== "https:") return { ok: false, error: "Use https:// open.spotify.com links only." };
    var host = (u.hostname || "").toLowerCase().replace(/^www\./, "");
    if (host !== "open.spotify.com") {
      return { ok: false, error: "Only open.spotify.com links are allowed." };
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
      embedSrc: "https://open.spotify.com/embed/" + type + "/" + encodeURIComponent(id),
      embedTitle: "Spotify " + type
    };
  }
  function parseRoomEmbed(source, raw) {
    if (source === "youtube") return parseYouTubeEmbed(raw);
    if (source === "spotify") return parseSpotifyEmbed(raw);
    return { ok: false, error: "Pick YouTube or Spotify." };
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
    // How this works: hide/clear dock (placeholder may stay in roomView HTML). Leaving room pauses embed.
    var dock = document.getElementById("room-embed-dock");
    if (!dock) return;
    dock.hidden = true;
    dock.innerHTML = "";
    dock.removeAttribute("data-embed-src");
  }
  function ensureRoomEmbedDock(pl) {
    // How this works: compact iframe dock under the stage (sibling of #stage-slot host).
    // ENGINE DEV: not inside #stage-slot — Pixi stays clear. User presses play in embed (autoplay policy).
    if (!inRoom || !pl || (pl.source !== "youtube" && pl.source !== "spotify") || !pl.embedSrc) {
      removeRoomEmbedDock();
      return null;
    }
    var host = document.querySelector(".stage-wrap .stage-body") || document.querySelector(".stage-wrap");
    if (!host) return null;
    var dock = document.getElementById("room-embed-dock");
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "room-embed-dock";
      dock.className = "room-embed-dock";
      var after = document.querySelector(".stage-wrap .stage-host");
      if (after && after.parentNode === host) {
        if (after.nextSibling) host.insertBefore(dock, after.nextSibling);
        else host.appendChild(dock);
      } else {
        host.appendChild(dock);
      }
    }
    dock.hidden = false;
    dock.className = "room-embed-dock";
    var title = esc(pl.embedTitle || (pl.source === "spotify" ? "Spotify" : "YouTube"));
    var src = String(pl.embedSrc || "");
    if (dock.getAttribute("data-embed-src") !== src) {
      dock.setAttribute("data-embed-src", src);
      dock.innerHTML = '<div class="room-embed-head"><span class="meta">Room music · ' + title + '</span>'
        + '<button type="button" class="text-btn" data-playlist-open-panel="1">Room music</button></div>'
        + '<iframe class="room-embed-frame" title="' + title + '" src="' + esc(src) + '" '
        + 'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" '
        + 'allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>'
        + '<p class="meta room-embed-note">Press play in the embed. Spotify playlists must be public; YouTube must allow embedding.</p>';
    }
    return dock;
  }
  function syncRoomAudio() {
    // How this works: local → <audio>; youtube/spotify → #room-embed-dock iframe; pause local when not local.
    var a = ensureRoomAudioEl();
    a.muted = !!roomAudioMuted;
    var pl = loadPlaylist();
    var src = normalizePlaylistSource(pl.source);
    if (!inRoom) {
      try { a.pause(); } catch (e) {}
      removeRoomEmbedDock();
      return;
    }
    if (src !== "local") {
      try { a.pause(); a.removeAttribute("src"); a.removeAttribute("data-track-id"); } catch (eHide) {}
      a.style.display = "none";
      ensureRoomEmbedDock(pl);
      musicGestureNeeded = false;
      var btnHide = document.getElementById("music-gesture-btn");
      if (btnHide) btnHide.hidden = true;
      return;
    }
    removeRoomEmbedDock();
    a.style.display = "none";
    var track = pl.tracks[pl.current];
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
    if (normalizePlaylistSource(pl.source) !== "local") return;
    if (!pl.tracks.length) return;
    pl.current = (pl.current + 1) % pl.tracks.length;
    savePlaylist(pl);
    if (playlistPanelOpen && inRoom) paint("rooms");
    else syncRoomAudio();
  }
  function playlistPanel() {
    // How this works: Room music panel — My uploads / YouTube / Spotify.
    // Hard rule: only loft owner switches source / pastes embeds / locks. Guests may listen;
    // optional guest local-track adds when ownerOnlyAdd is false. Never guest yt/spotify edits.
    var pl = loadPlaylist();
    var owner = isLoftOwner();
    var canAddLocal = owner || !pl.ownerOnlyAdd;
    var src = normalizePlaylistSource(pl.source);
    var music = myMusicStuff();
    var rows = pl.tracks.length
      ? pl.tracks.map(function (t, i) {
          var now = i === pl.current;
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
    var sourceTabs = '<div class="section-label">Music source</div>'
      + '<div class="playlist-source-tabs" role="tablist">'
      +   '<button type="button" class="action-btn' + (src === "local" ? " is-on" : "") + '" data-playlist-source="local"' + (owner ? "" : " disabled") + '>My uploads</button>'
      +   '<button type="button" class="action-btn' + (src === "youtube" ? " is-on" : "") + '" data-playlist-source="youtube"' + (owner ? "" : " disabled") + '>YouTube</button>'
      +   '<button type="button" class="action-btn' + (src === "spotify" ? " is-on" : "") + '" data-playlist-source="spotify"' + (owner ? "" : " disabled") + '>Spotify</button>'
      + '</div>'
      + (owner
          ? ""
          : '<p class="meta owner-music-note">Owner controls room music — you can listen, but only the loft owner changes source or embeds.</p>');
    var localBody = ''
      +   '<div class="playlist-now">'
      +     (pl.tracks[pl.current]
            ? ('Now playing: <b>' + esc(pl.tracks[pl.current].name || "Track") + '</b>')
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
          ? ('<label class="check-row"><input type="checkbox" data-playlist-owner-only="1"' + (pl.ownerOnlyAdd ? " checked" : "") + ' /> Only owner may add local tracks</label>'
            + '<p class="meta">YouTube / Spotify source &amp; URLs stay owner-only even if guests may add uploads.</p>')
          : ('<p class="meta">' + (pl.ownerOnlyAdd ? "Owner locked local adds." : "Guests may add local tracks (uploads only).") + '</p>'))
      +   (canAddLocal && src === "local"
          ? ('<div class="section-label">Add from My Music</div>'
            + (music.length
              ? ('<form id="playlist-add-form" class="playlist-add-form">'
                + '<select name="stuffId" required><option value="">— pick a track —</option>' + addOpts + '</select>'
                + '<button type="submit">Add to playlist</button></form>')
              : '<p class="meta">No Music in Stuff yet. Stuff → Music → Upload… (MP3/WAV/OGG; copyright checkbox required).</p>'))
          : (src === "local" ? '<p class="meta">Local adds locked to loft owner.</p>' : ""));
    var embedBody = ''
      + '<p class="meta">' + (src === "youtube"
          ? "Paste a youtube.com watch / youtu.be / playlist URL. Embeds use youtube-nocookie. Video must allow embedding."
          : "Paste an open.spotify.com track / album / playlist / episode URL. Playlists must be <b>public</b>.") + '</p>'
      + (owner
          ? ('<form id="playlist-embed-form" class="playlist-embed-form">'
            + '<input name="embedUrl" type="url" required placeholder="' + (src === "youtube" ? "https://www.youtube.com/watch?v=…" : "https://open.spotify.com/playlist/…") + '" value="' + esc(pl.embedUrl || "") + '" />'
            + '<button type="submit">Set embed</button></form>')
          : '<p class="meta">Owner controls room music — embed URL is read-only for guests.</p>')
      + (pl.embedSrc
          ? ('<div class="playlist-embed-preview">'
            + '<p class="meta">Preview · ' + esc(pl.embedTitle || src) + ' — press play in the player.</p>'
            + '<iframe class="room-embed-frame" title="' + esc(pl.embedTitle || "embed") + '" src="' + esc(pl.embedSrc) + '" '
            + 'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" '
            + 'allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>')
          : '<p class="meta">No embed set yet.</p>')
      + '<p class="meta legal-embed-note">Embedded players use YouTube/Spotify’s own embeds. Respect their ToS; Whirled2 does not host that audio. Local uploads still require you own the rights.</p>';
    return '<div class="room-side-panel" id="room-playlist-panel">'
      + '<div class="panel">'
      +   '<div class="room-side-head"><h2>Room music</h2>'
      +     '<button type="button" class="text-btn" data-playlist-close="1">Close</button></div>'
      +   '<p class="meta">Classic wiki Music vibe, plus optional YouTube / Spotify embeds. Offline localStorage — no shared server yet.</p>'
      +   sourceTabs
      +   (src === "local" ? localBody : embedBody)
      + '</div></div>';
  }

  var STUFF_CATS = [
    // How this works: wiki Stuff rail categories. howBlurb = empty-state “How do I get stuff?”
    { id: "avatars", label: "Avatars", empty: "You have no avatars yet.", how: "Avatars are how you look in rooms. Upload a stub avatar thumbnail here, or earn/list later — never invent demo avatars." },
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
  var occFilterQ = ""; // optional occupant rail filter when >5 people
  var roomItemsPanelOpen = false; // Room menu → View items
  var decorateMode = false;
  var partyPanelOpen = false;
  var hangoutInvitePending = null; // [{id,name},…] after leave loft (real occupants only)
  var loftVisitOccupants = []; // session occupants seen this loft visit
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
  var PROFILE_SKIN_KEY = "whirled2.profileSkin."; // + userId — Profile look / Whirled profile themes (no music)
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

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
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
    roomItemsPanelOpen = false;
    roomSharePanelOpen = false;
    helpOpen = false;
    legalOpen = false;
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
  // ---------------------------------------------------------------------------
  // Room lock (wiki Room) — enforced locally on this browser mock
  // How this works: whirled2.roomLock.loft stores { mode, ownerId }.
  //   unlocked → anyone may enter Studio Loft
  //   friends  → lock owner, loft first-user, or mutual friends (loadFriends)
  //   locked   → only the lock owner (and loft first-user) may enter
  // ENGINE DEV: lock is chrome/lobby gate only — does not change #stage-slot.
  // Migrate: old builds stored a bare string ("unlocked"|"friends"|"locked").
  // ---------------------------------------------------------------------------
  function defaultRoomLock() {
    return { mode: "unlocked", ownerId: "" };
  }
  function loadRoomLock() {
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
      var mode = obj.mode || "unlocked";
      if (mode !== "unlocked" && mode !== "friends" && mode !== "locked") mode = "unlocked";
      return { mode: mode, ownerId: String(obj.ownerId || "") };
    } catch (e) { return defaultRoomLock(); }
  }
  function saveRoomLock(mode) {
    // How this works: whoever sets the lock becomes ownerId (session user, else firstUserId).
    mode = mode || "unlocked";
    if (mode !== "unlocked" && mode !== "friends" && mode !== "locked") mode = "unlocked";
    var ownerId = "";
    try {
      if (session() && session().user && session().user.id) ownerId = String(session().user.id);
      else ownerId = localStorage.getItem(FIRST_USER_KEY) || "";
    } catch (e) {}
    try {
      localStorage.setItem(ROOM_LOCK_KEY, JSON.stringify({ mode: mode, ownerId: ownerId }));
    } catch (e2) {}
  }
  function canEnterLoft(viewerId) {
    // How this works: gate [data-enter-room] / Join them / Go home before setting inRoom.
    var lock = loadRoomLock();
    var mode = (lock && lock.mode) || "unlocked";
    if (mode === "unlocked") return true;
    viewerId = String(viewerId || "");
    if (!viewerId) return false;
    var ownerId = String((lock && lock.ownerId) || "");
    var first = "";
    try { first = localStorage.getItem(FIRST_USER_KEY) || ""; } catch (e) {}
    // Owner of the lock + loft first-user always enter.
    if (viewerId === ownerId || (first && viewerId === first)) return true;
    if (mode === "locked") return false;
    if (mode === "friends") {
      var friends = loadFriends();
      // Allow if viewer↔owner friendship appears on this browser's friends list.
      if (ownerId && friends.some(function (f) { return String(f.id) === ownerId; })) return true;
      if (viewerId && friends.some(function (f) { return String(f.id) === viewerId; })) return true;
      return false;
    }
    return true;
  }
  function tryEnterLoft() {
    // How this works: shared enter path — block → notice + stay lobby; else enter loft.
    var sid = session() && session().user && session().user.id;
    if (!canEnterLoft(sid)) {
      var mode = (loadRoomLock().mode || "locked");
      var msg = mode === "friends"
        ? "Studio Loft is friends-only right now. You cannot enter."
        : "Studio Loft is locked. Only the room owner can enter.";
      pushNotice("orange", msg);
      inRoom = false;
      return false;
    }
    inRoom = true;
    try { trackRecentRoom({ id: "loft", name: ROOM }); } catch (eR) {}
    return true;
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
        return {
          mode: raw.mode,
          hideHistory: !!raw.hideHistory,
          textSize: raw.textSize === "sm" || raw.textSize === "lg" ? raw.textSize : "md",
          // How this works: wiki Chat Settings — how long stage speech/thought bubbles stay up.
          bubbleDuration: dur
        };
      }
    } catch (e) {}
    return { mode: "overlay", hideHistory: false, textSize: "md", bubbleDuration: "medium" };
  }
  function saveChatUi(cfg) {
    try { localStorage.setItem(CHAT_UI_KEY, JSON.stringify(cfg || loadChatUi())); } catch (e) {}
  }
  // How this works (20260906q): on phones, Slide's dark panel eats the green stage.
  // Auto-switch to Overlay once for the session preference so the black slab never returns.
  function ensureMobileChatOverlay() {
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
    var id = item.id || item.name || "";
    var tone = item.kind === "backdrop" || itemCat(item) === "backdrops" ? "night" : (item.kind === "avatar" || itemCat(item) === "avatars") ? "fox" : "";
    var price = formatShopPrice(item.coins != null ? item.coins : item.price, item.owned);
    var visual = item.thumb
      ? '<img class="stuff-thumb" src="' + item.thumb + '" alt="" />'
      : '<div class="swatch ' + tone + '"></div>';
    return '<button type="button" class="card shop-card" data-shop-item="' + esc(id) + '">'
      + visual + '<div class="body"><h3>' + esc(item.name || "Item") + '</h3>'
      + '<p class="meta">' + esc(item.kind || itemCat(item)) + " · " + esc(item.creator || item.sellerName || "member") + '</p>'
      + '<div class="price">' + esc(String(price)) + '</div></div></button>';
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
      clearRoomChatDisplay(true);
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
  var liveOccupants = [];
  var meSub = "home"; // home | profile | friends | mail | passport | account | themes | club | blocklist | galleries | transactions | contests | share
  var newsFilter = "all"; // all | comments | friendings | status | stamps | rooms
  var roomSharePanelOpen = false; // Room menu → Share / Embed
  var profileEditSection = null; // null | status | photo | info | skin
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
  // Fidelity + dual currency / streaks (?v=20260906r)
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
    var t = loadChatTabs();
    var roomUnread = !!(t.unread && t.unread.room);
    var html = '<div class="chat-tabs" id="chat-tabs" role="tablist">'
      + '<button type="button" class="chat-tab chat-tab-room' + (t.activeTabId === "room" || !t.activeTabId ? " is-on" : "") + (roomUnread ? " has-unread" : "") + '" data-chat-tab="room" role="tab">Room</button>';
    (t.openPMs || []).forEach(function (p) {
      var tid = "pm:" + p.userId;
      var un = !!(t.unread && t.unread[tid]);
      html += '<button type="button" class="chat-tab chat-tab-pm' + (t.activeTabId === tid ? " is-on" : "") + (un ? " has-unread" : "") + '" data-chat-tab="' + esc(tid) + '" role="tab">'
        + '<span>' + esc(p.name || p.userId) + '</span>'
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
          return '<button type="button" class="recent-room-chip" data-enter-room="' + esc(r.id || "loft") + '">' + esc(r.name || "Room") + '</button>';
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
      +     '<li><b>/think</b> <b>/me</b> <b>/speak</b> — chat modes</li>'
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
    if (cmd === "help") { helpOpen = true; paint("help"); return; }
    if (cmd === "shortcuts") { shortcutsOpen = true; ensureModernOverlays(); return; }
    if (cmd === "clear-chat") {
      clearActiveChatTab(true);
      pushSystemChat("Chat cleared.");
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
  function you() {
    var s = session();
    if (s && s.user) {
      var snap = getWalletSnapshot(s.user.id);
      return {
        name: s.user.name,
        initials: s.user.initials || s.user.name.slice(0, 1).toUpperCase(),
        bio: s.user.bio || "",
        coins: snap.coins,
        bars: snap.bars,
        streakDays: snap.streakDays,
        room: s.user.room || ROOM
      };
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
    var menu;
    if (p.you) {
      menu = '<div class="occ-menu" role="menu">'
        + '<button type="button" class="occ-menu-item" data-profile="' + esc(id) + '">View Profile</button>'
        + '<button type="button" class="occ-menu-item" data-me="profile">Edit profile</button>'
        + '</div>';
    } else {
      menu = '<div class="occ-menu" role="menu">'
        + '<button type="button" class="occ-menu-item" data-profile="' + esc(id) + '">View Profile</button>'
        + '<button type="button" class="occ-menu-item" data-whisper="' + esc(id) + '" data-whisper-name="' + esc(p.name || id) + '">Whisper</button>'
        + '<button type="button" class="occ-menu-item" data-invite-buddy="' + esc(id) + '" data-friend-name="' + esc(p.name || id) + '">Invite to be your friend</button>'
        + '<button type="button" class="occ-menu-item" data-mail-to="' + esc(id) + '" data-mail-name="' + esc(p.name || id) + '">Send Mail</button>'
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
      + '<button type="button" class="person" data-occ-menu="' + esc(id) + '" title="' + esc(p.name || id) + '">'
      + '<span class="' + presenceDotClass(p) + '" aria-hidden="true"></span>'
      + '<span class="ava' + (p.you ? " you" : "") + (isOwner ? " owner" : "") + '">' + esc(p.initials || "?") + '</span>'
      + '<span class="person-meta">'
      +   '<span class="person-name">' + esc(p.name)
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
    return "https://whirledclassic.github.io/whirled2/whirled2/web-mock/?v=20260906r";
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
    if (!emote && (/^\/me\s+/i.test(text) || /^\/emote\s+/i.test(text))) {
      emote = true;
      text = text.replace(/^\/(me|emote)\s+/i, "");
    }
    if (!thought && /^\/think\s+/i.test(text)) {
      thought = true;
      text = text.replace(/^\/think\s+/i, "");
    }
    var awayCls = (uid && typeof isAway === "function" && isAway(uid)) ? " is-away" : "";
    var nameBtn = '<button type="button" class="chat-who' + awayCls + '" data-chat-who="' + esc(uid || msg.who || "") + '" data-chat-who-name="' + esc(msg.who || "") + '">' + esc(msg.who || "?") + '</button>';
    var body;
    if (emote) {
      body = '<div class="chat-bubble emote"><i>' + esc(msg.who) + " " + esc(text) + "</i></div>";
    } else if (thought) {
      body = '<div class="chat-bubble thought"><i>' + esc(text) + '</i></div>';
    } else {
      body = '<div class="chat-bubble">' + esc(text) + '</div>';
    }
    var mid = msg.id || "";
    return '<div class="chat-row' + accent + (emote ? " is-emote" : "") + (thought ? " is-thought" : "") + '" data-msg-id="' + esc(mid) + '">'
      + (emote ? "" : (nameBtn + roleBadgeHtml(role) + ' <time>' + esc(stamp) + "</time>"))
      + body
      + (mid && typeof reactionPillsHtml === "function" ? reactionPillsHtml(mid) + reactionBarHtml(mid) : "")
      + "</div>";
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
            + '<p class="meta">Attaches this item to mail, removes it from your Stuff, and the friend claims it when they open the mail (once).</p>'
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
      + '<p class="meta">Create furniture and media yourself (wiki Upload), or earn/buy later. Coins & Bars are play currency — no payments. Nothing is invented for you.</p>'
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
    var price = coins != null ? formatShopPrice(coins, false) : "free";
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
    var price = coins != null ? formatShopPrice(coins, false) : "free";
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
      + '<p class="shop-banner">Parlor games mount later with the engine track. Coins from games are play currency (labels / earn later).</p></div>'
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
      + recentRoomsStripHtml()
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

  // How this works: Room menu → View items lists decorate-layer chips + playlist track names (local data).
  // ENGINE DEV: chrome overlay only; not #stage-slot contents.
  function roomItemsPanel() {
    var layout = loadRoomLayout();
    var placed = layout.items || [];
    var pl = loadPlaylist();
    var tracks = (pl && pl.tracks) ? pl.tracks : [];
    var placedRows = placed.length
      ? '<ul class="room-items-list">' + placed.map(function (it) {
          return '<li><span class="room-item-chip">' + esc(it.name || "Item") + '</span> <span class="meta">(' + Math.round(it.x || 0) + ',' + Math.round(it.y || 0) + ')</span></li>';
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
      +   '<p>Features are <b>prototypes</b> and subject to change. <b>Coins &amp; Bars</b> are play currency (earn-only Bars) — no live payments on this mock.</p>'
      + '</div></section>';
  }
function helpPage() {
    return '<section class="page help-page"><div class="page-head"><div><h1>Help</h1>'
      + '<p>Starting Out — Whirled2 chrome tips.</p></div>'
      + '<button type="button" class="text-btn" data-help-close="1">Close Help</button></div>'
      + '<div class="panel"><h2>Starting Out</h2>'
      + '<ul class="help-tips">'
      + '<li><b>Me</b> — profile, friends, mail, passport stamps, account (permaname), Transactions (Coins &amp; Bars).</li>'
      + '<li><b>Rooms</b> — enter Studio Loft; chat in the bar; Room menu for comment/rate, decorate, lock (visual).</li>'
      + '<li><b>Stuff upload</b> — furniture/media with Upload…; <b>Music</b> accepts MP3/WAV/OGG (copyright checkbox required). List Item copies into Shop.</li>'
      + '<li><b>Room music</b> — Room menu → View room music. Owner picks My uploads / YouTube / Spotify. Guests listen; owner controls embeds. Soft autoplay for local.</li>'
      + '<li><b>Themes</b> — Me → Themes for browser CSS presets; group managers get Edit Whirled theme shell (Coming Soon).</li>'
      + '<li><b>Profile look</b> — Me → My Profile → presets (Classic / Night / Ocean / Forest / Candy / Mono…) publish instantly; Edit look for font/corners/modules/banner.</li>'
      + '<li><b>Ctrl+K</b> — command palette to jump Me / Mail / Rooms / … Press <b>?</b> for shortcuts.</li>'
      + '<li><b>Mail</b> — header count; compose from Me → Mail or profiles.</li>'
      + '<li><b>Groups</b> — local clubs with discussion + Enter hall (lobby meta).</li>'
      + '<li><b>Games lobby</b> — genre filters and local tables from <code>whirled2.games</code> only — never invented titles.</li>'
      + '<li><b>Coins &amp; Bars</b> — classic dual currency. Daily login streak earns coins; Bars from streak milestones / weekly (earn-only). Buy stays disabled — no payments / no Buy Bars.</li>'
      + '<li><b>Transactions</b> — Me → Transactions (or click header balances / Ctrl+K). Filter All / Coins / Bars. Bling cash-out Coming Soon.</li>'
      + '<li><b>Parties</b> — toolbar party board: create/join/leave locally; follow-leader later on a shared server.</li>'
      + '<li><b>Decorate</b> — place Stuff furniture/backdrops/toys/images as chips; Save to room layout.</li>'
      + '</ul></div>'
      + '<div class="panel"><h2>Concept &amp; Status (spirit)</h2>'
      + '<p class="meta">Whirled = social network + virtual world. Tabs: Me, Stuff, Games, Rooms, Groups, Shop. Pale blue classic chrome — no gold/purple. Engine mounts only in <code>#stage-slot</code> via <code>window.WhirledChrome</code>. No fake NPCs or invented catalog. No private engine in this mock.</p>'
      + '<p class="meta">This pass: mobile room layout (full stage, Overlay chat on phones, thin occupant strip). Cache <code>?v=20260906r</code>. Press <b>?</b> or <b>Ctrl+K</b>.</p>'
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
    here = sortOccupantsYouFirst(here);
    var empty = here.length === 0;
    var lock = loadRoomLock();
    var lockMode = lock.mode || "unlocked";
    return ''
      + '<div class="workspace">'
      +   '<aside class="rail occ-rail">'
      +     occupantRailHtml(here)
      +   '</aside>'
      +   '<section class="stage-wrap">'
      +     '<div class="room-strip"><span class="room-name">' + esc(ROOM) + '</span>'
      +       '<span class="room-owner">owner: ' + esc(me.name) + '</span>'
      +       '<span class="room-lock-badge" title="Enforced on this browser — friends/locked gate entry" data-lock="' + esc(lockMode) + '">🔒 ' + esc(lockLabel(lockMode)) + '</span>'
      +       '<span class="room-rating-badge">' + esc(loftRatingLabel()) + '</span></div>'
      +     '<div class="stage-body chat-mode-' + esc(loadChatUi().mode) + ' text-size-' + esc(loadChatUi().textSize) + (loadChatUi().hideHistory ? ' hide-history' : '') + '">'
      +     '<div class="stage-host">'
      +       '<div id="stage-slot"><div class="stage-copy"><strong>Your room — engine mounts here</strong>Empty classic stage for now. Decorate with Room menu — click-to-walk arrives with the engine track.<code>#stage-slot</code></div></div>'
      +       decorateLayerHtml()
      // How this works: #stage-bubbles = temporary avatar speech/thought over the stage
      // (separate from Slide/Overlay history). ENGINE DEV: Pixi may later replace these.
      +       '<div id="stage-bubbles" class="stage-bubbles" aria-live="polite"></div>'
      // How this works (classic Whirled / wiki Chat): Overlay chat sits ON the left of the
      // room window (inside .stage-host). Slide chat uses sibling #chat-log as its own
      // dark panel. Bottom #chat-form input stays in the chrome either way.
      +       '<div class="chat-overlay is-empty" id="chat-overlay" aria-live="polite" hidden></div>'
      +     '</div>'
      // How this works: #room-embed-dock is chrome UI under the stage (sibling of .stage-host), not inside #stage-slot.
      // ENGINE DEV: prefer this dock so Pixi stays clear; syncRoomAudio fills/removes it for yt/spotify.
      +     '<div id="room-embed-dock" class="room-embed-dock" hidden></div>'
      +     chatTabsHtml()
      +     '<div class="chat-log" id="chat-log">' + activeChatMessages().map(chatRow).join('') + '</div>'
      +     '<div class="room-invite-row"><button type="button" class="text-btn" data-copy-invite="room">Copy room invite link</button></div>'
      +     '</div>'
      +     (roomPanelOpen ? roomCommentsPanel() : '')
      +     (playlistPanelOpen ? playlistPanel() : '')
      +     (roomItemsPanelOpen ? roomItemsPanel() : '')
      +     (decorateMode ? decoratePanel() : '')
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
  var PROFILE_BG_MAX_HARD = 900 * 1024;   // reject huge uploads
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
    // How this works: set full background shorthand + CSS vars on .page.profile-page (and .profile-skin).
    // ENGINE DEV: profile page chrome only; not #stage-slot.
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
      + '<button type="button" class="me-link" data-enter-room="loft">My Rooms</button>'
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
      +       '<button type="button" class="text-btn" data-enter-room="loft">My Rooms</button>'
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
              +     '<label class="skin-bg-file">Background image (png/jpg/gif/webp)'
              +       '<input type="file" id="skin-bg-input" accept="image/png,image/jpeg,image/gif,image/webp" /></label>'
              +     '<p class="meta">Only upload images you have rights to (same spirit as Stuff). ~400KB warn; huge files rejected. Stored as a data URL in this browser.</p>'
              +     (skin.bgImage ? '<p class="meta">Current image saved. Choose Clear or Background type → None to remove.</p>' : '')
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
        return '<div class="stamp-cell' + (got ? " is-earned" : " is-locked") + '" title="' + esc(tip) + '">'
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
    var wallHtml = wall.length ? wall.map(function (w) {
      return '<div class="wall-row"><b>' + esc(w.who) + '</b> ' + esc(w.text) + '<time>' + esc((w.at || "").slice(0, 16).replace("T", " ")) + '</time></div>';
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
      +   '<p class="meta"><b>Coins &amp; Bars</b> are play currency (Bars earn-only via streaks). There are <b>no live payments</b> and no Buy Bars on this mock.</p>'
      + '</div>'
      + '<div class="panel club-disclaimer">'
      +   '<h2>Disclaimer</h2>'
      +   '<p><b>Whirled2</b> is <b>not affiliated</b> with Three Rings Design, the operators of whirled.club, or any official Whirled commercial entity. We do not claim to be official whirled.club.</p>'
      +   '<p>Whirled2 is a same-game-spirit revival on a <b>new engine</b>, informed by public research, community docs, and the open-source <a href="https://github.com/greyhavens/msoy" target="_blank" rel="noopener">greyhavens/msoy</a> reference (BSD) — not a Flash/msoy port and not a private-engine dump.</p>'
      +   '<p>Features you see here are <b>prototypes</b>. Items, pages, and perks may appear or disappear before any launch. <b>Nothing is final.</b></p>'
      +   '<p class="meta">Full IP / upload rules: <button type="button" class="text-btn" data-legal-open="1">Legal / Disclaimer</button>. Coins & Bars — no payments.</p>'
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
      +       '<button type="button" class="notice-bell-btn" data-me="notices" title="Notices">&#128276;'
      +         (unreadNoticesCount() ? (' <u>(' + unreadNoticesCount() + ')</u>') : '')
      +       '</button>'
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
      +       '<button type="button" class="stat coins wallet-coins" data-me="transactions" title="Coins — open Transactions">' + esc(String(me.coins)) + ' <span class="stat-label">coins</span></button>'
      +       '<button type="button" class="stat bars wallet-bars" data-me="transactions" title="Bars — open Transactions">' + esc(String(me.bars || 0)) + ' <span class="stat-label">bars</span></button>'
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
      +       goMenuHtml()
      +     '</span>'
      +     '<span class="tb-friends-wrap">'
      +       '<button type="button" class="tb tb-friends" title="Friends" aria-label="Friends" data-tb="friends"></button>'
      +       friendsToolbarPopupHtml()
      +     '</span>'
      +     '<button type="button" class="tb tb-party" title="Parties" aria-label="Parties" data-tb="party"></button>'
      +     '<span class="tb-go-wrap tb-room-wrap">'
      +       '<button type="button" class="tb tb-room" title="Room" aria-label="Room" data-tb="room"></button>'
      +       '<div class="go-menu room-menu" id="room-menu" hidden>'
      +         '<button type="button" data-room-menu="comment">Comment or rate</button>'
      +         '<button type="button" data-room-menu="decorate">Decorate Room</button>'
      +         '<button type="button" data-room-menu="view-items">View items</button>'
      +         '<button type="button" data-room-menu="snapshot">Take snapshot (stub)</button>'
      +         '<button type="button" data-room-menu="zoom">Zoom (stub)</button>'
      +         '<button type="button" data-room-menu="playlist">View room music</button>'
      +         '<button type="button" data-copy-invite="room">Copy room invite link</button>'
      +         '<div class="room-lock-row meta">Lock (enforced locally)</div>'
      +         '<button type="button" data-room-lock="unlocked"' + ((loadRoomLock().mode || "unlocked") === "unlocked" ? ' class="is-on"' : '') + '>🔓 Unlocked</button>'
      +         '<button type="button" data-room-lock="friends"' + ((loadRoomLock().mode || "") === "friends" ? ' class="is-on"' : '') + '>👥 Friends</button>'
      +         '<button type="button" data-room-lock="locked"' + ((loadRoomLock().mode || "") === "locked" ? ' class="is-on"' : '') + '>🔒 Locked</button>'
      +         '<button type="button" data-room-menu="lobby">' + (inRoom ? "Leave to lobby" : "Rooms lobby") + '</button>'
      +       '</div>'
      +     '</span>'
      +     '<button type="button" class="tb-music" data-open-room-music="1" title="Room music" aria-label="Room music"></button>'
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
    // How this works: daily login claim once per calendar day, then shell can show balances.
    try { claimDailyLogin(); } catch (eDaily) {}
    // 20260906q: phones force Overlay chat so Slide never opens a black slab under the stage.
    try { ensureMobileChatOverlay(); } catch (eMob) {}
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
      var lk = (loadRoomLock().mode || "unlocked");
      document.querySelectorAll("[data-room-lock]").forEach(function (btn) {
        btn.classList.toggle("is-on", btn.getAttribute("data-room-lock") === lk);
      });
    } catch (e) {}
    try { ensureStagePlaceholder(); } catch (e) {}
    try { if (decorateMode) bindDecorateDrag(); } catch (e) {}
    try { syncRoomAudio(); } catch (e) {}
    // How this works: after paint, apply profile skin on .page.profile-page via DOM styles.
    // ENGINE DEV: profile page chrome only; not #stage-slot.
    try {
      if (tab === "me" && session()) {
        var skinUid = null;
        if (viewingId && viewingId !== session().user.id) skinUid = viewingId;
        else if (meSub === "profile") skinUid = session().user.id;
        if (skinUid) {
          applyProfileSkinDom(skinUid);
          // How this works: double rAF re-apply beats layout flash / competing CSS.
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              try { applyProfileSkinDom(skinUid); } catch (e2) {}
            });
          });
        }
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
    try { ensureStageBubblesEl(); } catch (e) {}
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
  function pushSystemChat(text) {
    chat.push({ id: "sys" + Date.now(), system: true, text: text, at: new Date().toISOString() });
    if (chat.length > 120) chat = chat.slice(-100);
    refreshChatLog();
  }
  // How this works: room chat is visit-scoped on this mock. Leaving the room,
  // logging off, or a fresh page load wipes history so old sessions don't linger.
  // Chat Options → Clear all chat does the same. clearStorage defaults to true.
  function clearRoomChatDisplay(clearStorage) {
    if (clearStorage === undefined) clearStorage = true;
    chat = [];
    refreshChatLog();
    clearStageBubbles();
    if (clearStorage) {
      try { localStorage.removeItem("whirled2.chat.loft"); } catch (e) {}
    }
  }
  function leaveRoomResetChat() {
    // Baby step: exiting Studio Loft ends this room visit → empty the chat.
    clearRoomChatDisplay(true);
    occFilterQ = "";
    try { removeRoomEmbedDock(); } catch (eD) {}
    try {
      var a = document.getElementById("room-audio");
      if (a) a.pause();
    } catch (eA) {}
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
  // Stage avatar bubbles (#stage-bubbles) — temporary chrome until Pixi nametags
  // How this works: history stays in Slide/Overlay. These float near the bottom
  // "avatar area" for speech / thought (/think) / emote (/me). Not system lines.
  // ENGINE DEV: you may later replace this with Pixi nametag bubbles; until then
  // chrome owns #stage-bubbles. Read getChatUi().bubbleDuration for timing.
  // ---------------------------------------------------------------------------
  var _stageBubbleSeen = {};
  var _stageBubbleTimers = [];
  function bubbleDurationMs() {
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
  //   onOccupants(fn), getChatUi() → { mode, hideHistory, textSize, bubbleDuration }
  // Listen for document event "whirled:ready" if bridge is not ready yet (detail = this object).
  // Do NOT draw outside #stage-slot. Do NOT rebuild login. Coins+Bars earn-only (no payments). No Flash.
  // #decorate-layer and #stage-bubbles are chrome siblings above your canvas (see z-index in ENGINE-BRIDGE.md).
  // Chrome may show temporary #stage-bubbles until you own Pixi nametag bubbles.
  // ---------------------------------------------------------------------------
  function exposeBridge() {
    // ENGINE DEV: wallet is chrome localStorage; getWallet() is optional read-only for engine.
    window.WhirledChrome = {
      version: "0.4",
      getStageEl: function () { return document.getElementById("stage-slot"); },
      getSession: function () { return session(); },
      getRoom: function () { return { id: "loft", name: ROOM }; },
      onChat: function (fn) { listeners.chat.push(fn); },
      sendChat: function (text) { return window.WhirledApi.postChat("loft", text); },
      onOccupants: function (fn) { listeners.occupants.push(fn); fn(occupants()); },
      getChatUi: function () { return loadChatUi(); },
      getWallet: function () {
        var s = session();
        if (!s || !s.user) return { coins: 0, bars: 0, streakDays: 0 };
        return getWalletSnapshot(s.user.id);
      }
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
      // Wiki /clear — wipe active tab only (Room or current PM).
      clearActiveChatTab(true);
      pushSystemChat("Chat cleared.");
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
    if (/^\/speak\s+/i.test(text)) {
      text = text.replace(/^\/speak\s+/i, "");
    }
    var tabs = loadChatTabs();
    var isPm = !!(tabs.activeTabId && tabs.activeTabId.indexOf("pm:") === 0);
    var now = Date.now();
    chatSendTimes = chatSendTimes.filter(function (t) { return now - t < 3000; });
    if (chatSendTimes.length >= 5) {
      pushSystemChat("You're being too chatty…");
      return;
    }
    chatSendTimes.push(now);
    var emote = false;
    var thought = false;
    var sendText = text;
    if (/^\/me\s+/i.test(text) || /^\/emote\s+/i.test(text)) {
      emote = true;
      sendText = text;
    } else if (/^\/think\s+/i.test(text)) {
      thought = true;
      sendText = text;
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
      var gList = loadGroupChat(gidChat);
      gList.push(msgG);
      saveGroupChat(gidChat, gList);
      refreshChatLog();
      try { awardAction("chat"); } catch (eG) {}
      return;
    }
    var result = await window.WhirledApi.postChat("loft", sendText);
    var msg2 = result.message || result;
    if (emote) msg2.emote = true;
    if (thought) msg2.thought = true;
    if (!chat.some(function (m) { return m.id === msg2.id; })) chat.push(msg2);
    refreshChatLog();
    spawnStageBubble(msg2);
    listeners.chat.forEach(function (fn) { try { fn(msg2); } catch (e) {} });
    try { awardAction("chat"); } catch (e) {}
  }
  function renderChatOptsMenu() {
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
    menu.innerHTML += '<button type="button" class="action-btn chat-opts-clear" data-chat-clear="1">Clear all chat</button>';
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
    // How this works: classic chat name context menu — Profile / Whisper / Invite friend / Block.
    menu.innerHTML = ''
      + '<button type="button" data-profile="' + esc(id) + '">Profile</button>'
      + (self ? '' : '<button type="button" data-whisper="' + esc(id) + '" data-whisper-name="' + esc(name) + '">Whisper</button>')
      + (self ? '' : '<button type="button" data-add-friend="' + esc(id) + '" data-friend-name="' + esc(name) + '">Invite friend</button>')
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
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async function () {
      if (!session()) return;
      var result = await window.WhirledApi.pollChat("loft");
      var next = result.messages || [];
      if (next.length !== chat.length) {
        var prevIds = {};
        chat.forEach(function (m) { if (m && m.id) prevIds[m.id] = true; });
        chat = next;
        refreshChatLog();
        next.forEach(function (m) {
          if (m && m.id && !prevIds[m.id]) spawnStageBubble(m);
        });
      }
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
    if (helpOpen || tab === "help") hash = "help";
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
          clearRoomChatDisplay(true);
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
  function boot() {
    applyBrowserTheme();
    if (session()) {
      stripStuckPokeNotices();
      try { syncFriendsFromPerUser(); } catch (eSF) {}
      try { awayMode = isAway(session().user.id); } catch (eAw) {}
      pushNotice("green", you().name + " logged on.", { transient: true });
    }
    // How this works: a new page load is a new session visit — wipe leftover loft
    // chat from earlier. Do not loadHistory() on boot (that rehydrated old chats).
    clearRoomChatDisplay(true);
    paint(session() ? "rooms" : "");
    if (session()) {
      startPoll();
      startOccPoll();
      ensureNoticeBar();
      try { applyHashRoute(); } catch (eH) {}
    }
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
    if (ev.target.closest("[data-chat-bubble-dur]")) {
      var uiB = loadChatUi();
      var bd = ev.target.closest("[data-chat-bubble-dur]").getAttribute("data-chat-bubble-dur") || "medium";
      uiB.bubbleDuration = (bd === "short" || bd === "long") ? bd : "medium";
      saveChatUi(uiB);
      renderChatOptsMenu();
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
      if (tryEnterLoft()) {
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
      liveOccupants = []; inRoom = false; viewingId = null; meSub = "home";
      shopItemId = null; groupViewId = null; groupThreadId = null; roomPanelOpen = false; roomMenuOpen = false;
      gamesMode = "browse"; gameViewId = null; gameDetailTab = "play"; gameGenre = "all"; friendSearchQ = "";
      decorateMode = false; partyPanelOpen = false; playlistPanelOpen = false; helpOpen = false; legalOpen = false; galleryViewId = null; stuffListMode = false;
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
    var enter = ev.target.closest("[data-enter-room]");
    if (enter && session()) {
      // How this works: room lock gates entry — blocked visitors stay in lobby.
      if (!tryEnterLoft()) {
        paint("rooms");
        return;
      }
      // Fresh visit: empty room chat (old sessions stay wiped).
      clearRoomChatDisplay(true);
      loftVisitOccupants = [];
      paint("rooms");
      loadOccupants();
      try { awardAction("enterRoom"); } catch (e) {}
      return;
    }
    if (ev.target.closest("[data-leave-room]")) {
      var leavePeople = (loftVisitOccupants || []).slice();
      inRoom = false;
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
      leaveRoomResetChat();
      pushNotice("blue", "Group hall → Rooms lobby / Studio Loft (shared halls later).");
      paint("rooms");
      return;
    }
    var openMusic = ev.target.closest("[data-open-room-music]");
    if (openMusic && session()) {
      // How this works: one-tap Room music on mobile (toolbar was hard to find).
      if (!inRoom) {
        pushNotice("gray", "Enter a room first to play music.", { transient: true });
        return;
      }
      roomMenuOpen = false;
      var rmM = document.getElementById("room-menu");
      if (rmM) rmM.hidden = true;
      playlistPanelOpen = true;
      roomPanelOpen = false;
      roomItemsPanelOpen = false;
      decorateMode = false;
      partyPanelOpen = false;
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
      } else if (rm === "view-items") {
        if (!inRoom) { inRoom = true; }
        roomItemsPanelOpen = true;
        decorateMode = false;
        roomPanelOpen = false;
        playlistPanelOpen = false;
        partyPanelOpen = false;
        paint("rooms");
        loadOccupants();
      } else if (rm === "snapshot") {
        pushNotice("orange", "Snapshot stub — engine will capture the stage later.");
      } else if (rm === "zoom") {
        pushNotice("orange", "Zoom stub — engine camera later.");
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
    if (ev.target.closest("[data-room-items-close]") && session()) {
      roomItemsPanelOpen = false;
      paint("rooms");
      return;
    }
    if (ev.target.closest("[data-playlist-close]") && session()) {
      playlistPanelOpen = false;
      paint("rooms");
      return;
    }
    if (ev.target.closest("[data-playlist-open-panel]") && session()) {
      // How this works: compact dock button opens Room music side panel.
      if (!inRoom) inRoom = true;
      playlistPanelOpen = true;
      roomPanelOpen = false;
      decorateMode = false;
      partyPanelOpen = false;
      paint("rooms");
      syncRoomAudio();
      return;
    }
    var plSrcBtn = ev.target.closest("[data-playlist-source]");
    if (plSrcBtn && session()) {
      // Hard rule: only loft owner may switch music source (local / youtube / spotify).
      if (!isLoftOwner()) {
        pushNotice("orange", "Owner controls room music.");
        return;
      }
      var nextSrc = normalizePlaylistSource(plSrcBtn.getAttribute("data-playlist-source"));
      var plS = loadPlaylist();
      plS.source = nextSrc;
      plS.ownerControlsMusic = true;
      // When switching to embeds, keep local tracks but prefer owner-only adds.
      if (nextSrc !== "local" && typeof plS.ownerOnlyAdd !== "boolean") plS.ownerOnlyAdd = true;
      savePlaylist(plS);
      playlistPanelOpen = true;
      paint("rooms");
      syncRoomAudio();
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
      pl.current = Math.max(0, Number(plPlay.getAttribute("data-playlist-play")) || 0);
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
        if (pl2.current >= pl2.tracks.length) pl2.current = Math.max(0, pl2.tracks.length - 1);
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
  // How this works: live preview while typing hex / motto in Customize look (draft, not saved).
  // ENGINE DEV: profile page chrome only; not #stage-slot.
  app.addEventListener("input", function (ev) {
    if (!session() || !ev.target || !ev.target.closest) return;
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
    if (ev.target.matches("[data-playlist-owner-only]") && session() && isLoftOwner()) {
      var plO = loadPlaylist();
      plO.ownerOnlyAdd = !!ev.target.checked;
      savePlaylist(plO);
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
    // How this works: profile background image → data URL (cap ~400KB warn / reject huge).
    if (ev.target.id === "skin-bg-input" && session()) {
      var sfile = ev.target.files && ev.target.files[0];
      var smsg = document.getElementById("skin-msg");
      if (!sfile) return;
      var okType = /image\/(png|jpeg|jpg|gif|webp)/i.test(sfile.type) || /\.(png|jpe?g|gif|webp)$/i.test(sfile.name || "");
      if (!okType) {
        if (smsg) smsg.textContent = "Use png, jpg, gif, or webp.";
        return;
      }
      if (sfile.size > PROFILE_BG_MAX_HARD) {
        if (smsg) smsg.textContent = "Image too large for this demo (keep under ~900KB).";
        alert("Background image too large. Keep under ~900KB.");
        return;
      }
      if (sfile.size > PROFILE_BG_MAX_WARN) {
        if (smsg) smsg.textContent = "Warning: large image (~400KB+). Saving may fill browser storage.";
      }
      var sreader = new FileReader();
      sreader.onload = function () {
        var dataUrl = String(sreader.result || "");
        window.__skinBgPending = dataUrl;
        var hid = document.getElementById("skin-bg-data");
        if (hid) hid.value = "pending";
        var keep = document.querySelector('#skin-form [name="keepImage"]');
        if (keep) keep.value = "0";
        var typeSel = document.querySelector('#skin-form [name="bgType"]');
        if (typeSel) typeSel.value = "image";
        if (smsg) smsg.textContent = "Image ready — previewing; click Publish look to save.";
        try {
          var formImg = document.getElementById("skin-form");
          var draftImg = readSkinFormDraft(formImg);
          if (draftImg && session()) applyProfileSkinDom(session().user.id, draftImg);
        } catch (eImg) {}
      };
      sreader.readAsDataURL(sfile);
      return;
    }
    // How this works: optional thin banner image (same size caps as BG) under me-subnav.
    if (ev.target.id === "skin-banner-input" && session()) {
      var bfile = ev.target.files && ev.target.files[0];
      var bmsg = document.getElementById("skin-msg");
      if (!bfile) return;
      var okB = /image\/(png|jpeg|jpg|gif|webp)/i.test(bfile.type) || /\.(png|jpe?g|gif|webp)$/i.test(bfile.name || "");
      if (!okB) {
        if (bmsg) bmsg.textContent = "Use png, jpg, gif, or webp for banner.";
        return;
      }
      if (bfile.size > PROFILE_BG_MAX_HARD) {
        if (bmsg) bmsg.textContent = "Banner too large (keep under ~900KB).";
        alert("Banner image too large. Keep under ~900KB.");
        return;
      }
      if (bfile.size > PROFILE_BG_MAX_WARN && bmsg) bmsg.textContent = "Warning: large banner (~400KB+).";
      var breader = new FileReader();
      breader.onload = function () {
        window.__skinBannerPending = String(breader.result || "");
        var keepB = document.querySelector('#skin-form [name="keepBanner"]');
        if (keepB) keepB.value = "0";
        var clearB = document.querySelector('#skin-form [name="clearBanner"]');
        if (clearB) clearB.checked = false;
        if (bmsg) bmsg.textContent = "Banner ready — previewing; click Publish look to save.";
        try {
          var formB = document.getElementById("skin-form");
          var draftB = readSkinFormDraft(formB);
          if (draftB && session()) applyProfileSkinDom(session().user.id, draftB);
        } catch (eB) {}
      };
      breader.readAsDataURL(bfile);
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
    if (ev.target.id === "playlist-embed-form" && session()) {
      // Hard rule: only loft owner may paste/change YouTube or Spotify embed URLs.
      if (!isLoftOwner()) {
        pushNotice("orange", "Owner controls room music.");
        return;
      }
      var em = new FormData(ev.target);
      var plE = loadPlaylist();
      var srcE = normalizePlaylistSource(plE.source);
      if (srcE !== "youtube" && srcE !== "spotify") {
        pushNotice("orange", "Switch Music source to YouTube or Spotify first.");
        return;
      }
      var parsed = parseRoomEmbed(srcE, String(em.get("embedUrl") || ""));
      if (!parsed.ok) {
        pushNotice("orange", parsed.error || "Invalid embed URL.");
        return;
      }
      plE.embedUrl = parsed.embedUrl;
      plE.embedSrc = parsed.embedSrc;
      plE.embedTitle = parsed.embedTitle;
      plE.ownerControlsMusic = true;
      if (typeof plE.ownerOnlyAdd !== "boolean") plE.ownerOnlyAdd = true;
      savePlaylist(plE);
      playlistPanelOpen = true;
      paint("rooms");
      syncRoomAudio();
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
      if (plA.tracks.length === 1) plA.current = 0;
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
  // How this works: long-press / hover shows reaction bar on chat rows.
  document.addEventListener("mouseover", function (ev) {
    var row = ev.target.closest && ev.target.closest(".chat-row[data-msg-id]");
    if (!row) return;
    var bar = row.querySelector(".react-bar");
    if (bar) bar.hidden = false;
  }, true);
  document.addEventListener("mouseout", function (ev) {
    var row = ev.target.closest && ev.target.closest(".chat-row[data-msg-id]");
    if (!row) return;
    var to = ev.relatedTarget;
    if (to && row.contains(to)) return;
    var bar = row.querySelector(".react-bar");
    if (bar) bar.hidden = true;
  }, true);
  document.addEventListener("scroll", function (ev) {
    var t = ev.target;
    if (!t || !t.id) return;
    if (t.id === "chat-log" || t.id === "chat-overlay") {
      chatPinnedScroll = (t.scrollHeight - t.scrollTop - t.clientHeight) > 48;
    }
  }, true);
})();
