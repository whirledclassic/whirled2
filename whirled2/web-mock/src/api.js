/**
 * WhirledApi — tiny client for accounts + room chat + shared room music.
 *
 * How this works:
 * - If window.WHIRLED_API is set and the server is up, requests go to server/server.mjs.
 * - GitHub Pages can also set WHIRLED_API to the demo tunnel origin (no secrets — origin only)
 *   so Discord + shared chat work from Pages while password auth stays hybrid.
 * - Hybrid login/register (?v=20260906al): prefer API when apiBase() is set; on credential/taken
 *   OR network failure, fall back to offline localStorage users so Pages-created accounts still
 *   Logon on the demo/tunnel. API success uses the API session.
 * - If WHIRLED_API is empty, everything is offline localStorage in one browser.
 * - Session: localStorage key "whirled2.session" { token, user }.
 * - Discord: discordAuthStatus / discordAuthStartUrl (?return= Pages origin); callback ?discord_token=.
 * - Offline users: "whirled2.users". First register also sets "whirled2.firstUserId".
 * - Offline loft chat: "whirled2.chat.loft" (array of messages).
 * - Shared soundtrack: getRoomMusic / setRoomMusic — HTTP when server; else localStorage
 *   key "whirled2.roomMusic.loft" (same-tab + multi-tab via storage event only on Pages).
 * - ENGINE DEV: chrome HTTP / localStorage only — never mounts players in #stage-slot.
 * - Avatar lab (experimental, gated in app.js): optional POST /api/media, GET /api/media/:sha1,
 *   GET/PUT /api/wardrobe/:memberId — Pages works without these (local IndexedDB only).
 */
(function (root) {
  "use strict";

  var KEY = "whirled2.session";
  var USERS_KEY = "whirled2.users";
  var CHAT_KEY = "whirled2.chat.loft";
  var ROOM_MUSIC_KEY = "whirled2.roomMusic.loft";

  function apiBase() {
    return (root.WHIRLED_API || "").replace(/\/$/, "");
  }

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch (e) { return null; }
  }

  function saveSession(session) {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }

  function localUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function saveLocalUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Beginner (?v=20260906al): Pages offline accounts live in localStorage; the demo tunnel
  // hits the Node API first. If the API says wrong password / name taken, OR the network
  // fails, we still try offline users so a Pages Sign Up can Logon on the tunnel.
  // ENGINE DEV: chrome session only — never touches #stage-slot.
  function isHybridAuthFallback(err) {
    if (!err) return false;
    var msg = String(err.message || err || "");
    if (msg === "no-api") return true;
    if (err.name === "TypeError") return true; // Failed to fetch / CORS / offline
    if (/Failed to fetch|NetworkError|network|Load failed|fetch/i.test(msg)) return true;
    if (/Name or password is wrong/i.test(msg)) return true;
    if (/That name is taken/i.test(msg)) return true;
    if (/^http 401\b/i.test(msg) || /^http 409\b/i.test(msg) || /^http 5\d\d\b/i.test(msg)) return true;
    return false;
  }

  async function request(path, opts) {
    var base = apiBase();
    if (!base) throw new Error("no-api");
    var headers = Object.assign({ "Content-Type": "application/json" }, (opts && opts.headers) || {});
    var session = loadSession();
    if (session && session.token) headers.Authorization = "Bearer " + session.token;
    var res = await fetch(base + path, Object.assign({}, opts, { headers: headers }));
    var body = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(body.error || ("http " + res.status));
    return body;
  }

  root.WhirledApi = {
    session: loadSession,

    async register(name, password) {
      // How this works (?v=20260906al): prefer demo API when WHIRLED_API is set; on taken/network
      // failure, create offline localStorage user so Pages + tunnel both work for beginners.
      name = String(name || "").trim();
      password = String(password || "");
      if (name.length < 2) throw new Error("Name needs at least 2 characters.");
      if (password.length < 4) throw new Error("Password needs at least 4 characters.");
      var apiErr = null;
      if (apiBase()) {
        try {
          var body = await request("/api/register", {
            method: "POST",
            body: JSON.stringify({ name: name, password: password })
          });
          saveSession(body);
          return body;
        } catch (err) {
          apiErr = err;
          if (!isHybridAuthFallback(err)) throw err;
        }
      }
      try {
        var users = localUsers();
        var id = name.toLowerCase();
        if (users[id]) throw new Error("That name is taken on this browser.");
        users[id] = {
          id: id,
          name: name,
          password: hashGuess(password),
          bio: "Home room is the profile.",
          room: "Studio Loft",
          coins: 0
        };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        // Information: remember the very first account on this browser (admin bootstrap in app.js).
        try {
          if (!localStorage.getItem("whirled2.firstUserId")) {
            localStorage.setItem("whirled2.firstUserId", id);
          }
        } catch (eFirst) {}
        var session = { token: "local-" + id, user: publicUser(users[id]) };
        saveSession(session);
        return session;
      } catch (offErr) {
        if (apiErr) {
          throw new Error(
            (offErr && offErr.message ? offErr.message : "Could not create offline account.")
            + " Demo server also said: " + (apiErr.message || String(apiErr))
            + " — offline and demo accounts can differ; try another name or Logon on this server."
          );
        }
        throw offErr;
      }
    },

    async login(name, password) {
      // How this works (?v=20260906al): try API first when set; if wrong password / network,
      // fall back to whirled2.users so a Pages Sign Up still Logons on the demo tunnel.
      name = String(name || "").trim();
      password = String(password || "");
      var apiErr = null;
      if (apiBase()) {
        try {
          var body = await request("/api/login", {
            method: "POST",
            body: JSON.stringify({ name: name, password: password })
          });
          saveSession(body);
          return body;
        } catch (err) {
          apiErr = err;
          if (!isHybridAuthFallback(err)) throw err;
        }
      }
      try {
        var users = localUsers();
        var row = users[name.toLowerCase()];
        if (!row || row.password !== hashGuess(password)) {
          throw new Error("Name or password is wrong.");
        }
        var session = { token: "local-" + row.id, user: publicUser(row) };
        saveSession(session);
        return session;
      } catch (offErr) {
        if (apiErr) {
          throw new Error(
            "Name or password is wrong on the demo server and in this browser. "
            + "If you signed up on GitHub Pages (offline), try Sign Up again on this server — "
            + "offline and demo accounts may differ."
          );
        }
        throw offErr;
      }
    },

    logout: function () {
      var session = loadSession();
      var base = apiBase();
      if (base && session && session.token) {
        try {
          fetch(base + "/api/logout", {
            method: "POST",
            headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" }
          }).catch(function () {});
        } catch (e) {}
      }
      saveSession(null);
    },

    async saveProfile(patch) {
      var session = loadSession();
      if (!session) throw new Error("Sign in first.");
      try {
        var body = await request("/api/me", {
          method: "PATCH",
          body: JSON.stringify(patch)
        });
        session.user = body.user;
        saveSession(session);
        return session;
      } catch (err) {
        if (apiBase() && err.message !== "no-api") throw err;
        var users = localUsers();
        var row = users[session.user.id];
        if (!row) throw new Error("Missing local profile.");
        if (patch.bio != null) row.bio = String(patch.bio).slice(0, 180);
        if (patch.name) row.name = String(patch.name).slice(0, 24);
        users[row.id] = row;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        session.user = publicUser(row);
        saveSession(session);
        return session;
      }
    },

    async history(room) {
      try {
        return await request("/api/rooms/" + encodeURIComponent(room) + "/chat");
      } catch (err) {
        var raw = [];
        try { raw = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); } catch (e) {}
        return { messages: raw };
      }
    },

    // How this works: try server POST; on failure append to whirled2.chat.loft locally.
    async postChat(room, text) {
      var session = loadSession();
      var msg = {
        id: "m" + Date.now(),
        room: room,
        who: session && session.user ? session.user.name : "Guest",
        userId: session && session.user ? session.user.id : "guest",
        text: String(text).slice(0, 240),
        at: new Date().toISOString()
      };
      try {
        return await request("/api/rooms/" + encodeURIComponent(room) + "/chat", {
          method: "POST",
          body: JSON.stringify({ text: msg.text })
        });
      } catch (err) {
        var raw = [];
        try { raw = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); } catch (e) {}
        raw.push(msg);
        localStorage.setItem(CHAT_KEY, JSON.stringify(raw.slice(-80)));
        return { message: msg };
      }
    },


    async occupants(room) {
      try {
        return await request("/api/rooms/" + encodeURIComponent(room) + "/occupants");
      } catch (err) {
        // offline: only the local signed-in user counts as present
        var session = loadSession();
        if (!session || !session.user) return { occupants: [] };
        return {
          occupants: [{
            id: session.user.id,
            name: session.user.name,
            initials: session.user.initials || String(session.user.name).slice(0, 1).toUpperCase(),
            online: true,
            room: session.user.room || "Studio Loft",
            you: true
          }]
        };
      }
    },

    async heartbeat(room) {
      try {
        return await request("/api/rooms/" + encodeURIComponent(room) + "/occupants", { method: "POST", body: "{}" });
      } catch (err) {
        return this.occupants(room);
      }
    },

    // How this works: shared loft soundtrack. Server = real multi-phone sync; Pages = local only.
    // Beginner: owner Set embed → setRoomMusic; everyone polls getRoomMusic ~2–3s.
    // ENGINE DEV: returns { source, embedUrl, embedSrc, embedTitle, startedAt, loop, ownerId, updatedAt }.
    async getRoomMusic(room) {
      room = room || "loft";
      try {
        return await request("/api/rooms/" + encodeURIComponent(room) + "/music");
      } catch (err) {
        var raw = null;
        try { raw = JSON.parse(localStorage.getItem(ROOM_MUSIC_KEY) || "null"); } catch (e) {}
        if (!raw || typeof raw !== "object") {
          return {
            source: "",
            embedUrl: "",
            embedSrc: "",
            embedTitle: "",
            startedAt: 0,
            loop: true,
            ownerId: "",
            updatedAt: 0
          };
        }
        return raw;
      }
    },

    // How this works: owner publishes embed. Server resets startedAt when URL changes.
    // Pages fallback writes whirled2.roomMusic.loft (other tabs hear via storage event only).
    async setRoomMusic(room, payload) {
      room = room || "loft";
      payload = payload || {};
      try {
        return await request("/api/rooms/" + encodeURIComponent(room) + "/music", {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } catch (err) {
        if (apiBase() && err.message !== "no-api") throw err;
        var prev = null;
        try { prev = JSON.parse(localStorage.getItem(ROOM_MUSIC_KEY) || "null"); } catch (e) {}
        prev = prev && typeof prev === "object" ? prev : {};
        var embedSrc = String(payload.embedSrc != null ? payload.embedSrc : (prev.embedSrc || ""));
        var embedUrl = String(payload.embedUrl != null ? payload.embedUrl : (prev.embedUrl || ""));
        var urlChanged = embedSrc !== String(prev.embedSrc || "") || embedUrl !== String(prev.embedUrl || "");
        var startedAt = Number(prev.startedAt || 0) || 0;
        if (urlChanged || !startedAt) startedAt = Date.now();
        else if (payload.startedAt != null && Number(payload.startedAt) > 0) startedAt = Number(payload.startedAt);
        var session = loadSession();
        var ownerId = String(prev.ownerId || (session && session.user && session.user.id) || "");
        var next = {
          source: String(payload.source || prev.source || "youtube"),
          embedUrl: embedUrl,
          embedSrc: embedSrc,
          embedTitle: String(payload.embedTitle != null ? payload.embedTitle : (prev.embedTitle || "")).slice(0, 120),
          startedAt: startedAt,
          loop: payload.loop === false ? false : true,
          ownerId: ownerId,
          updatedAt: Date.now()
        };
        try { localStorage.setItem(ROOM_MUSIC_KEY, JSON.stringify(next)); } catch (eW) {}
        return next;
      }
    },

    // How this works: optional owner bump of startedAt so everyone re-seeks together.
    async resyncRoomMusic(room) {
      room = room || "loft";
      try {
        return await request("/api/rooms/" + encodeURIComponent(room) + "/music/resync", {
          method: "POST",
          body: "{}"
        });
      } catch (err) {
        if (apiBase() && err.message !== "no-api") throw err;
        var cur = null;
        try { cur = JSON.parse(localStorage.getItem(ROOM_MUSIC_KEY) || "null"); } catch (e) {}
        if (!cur || !cur.embedSrc) throw new Error("No room music set.");
        cur.startedAt = Date.now();
        cur.updatedAt = Date.now();
        try { localStorage.setItem(ROOM_MUSIC_KEY, JSON.stringify(cur)); } catch (e2) {}
        return cur;
      }
    },

    async pollChat(room, since) {
      try {
        var q = since ? ("?since=" + encodeURIComponent(since)) : "";
        return await request("/api/rooms/" + encodeURIComponent(room) + "/chat" + q);
      } catch (err) {
        return this.history(room);
      }
    },

    // -------------------------------------------------------------------------
    // Avatar lab experimental APIs (optional). Lab works local-only without server.
    // How this works: when WHIRLED_API is set, chrome may mirror wardrobe/media here.
    // Beginner: GitHub Pages has no server — ignore failures. ENGINE DEV: not wired to stage.
    // -------------------------------------------------------------------------
    async postMedia(payload) {
      // payload: { base64, mime, name } or { dataBase64: ... }
      payload = payload || {};
      try {
        return await request("/api/media", {
          method: "POST",
          body: JSON.stringify({
            base64: payload.base64 || payload.dataBase64 || "",
            mime: payload.mime || "application/octet-stream",
            name: payload.name || "",
            sha1: payload.sha1 || ""
          })
        });
      } catch (err) {
        if (apiBase() && err.message !== "no-api") throw err;
        return { sha1: payload.sha1 || "", offline: true };
      }
    },

    async getMedia(sha1) {
      try {
        return await request("/api/media/" + encodeURIComponent(sha1));
      } catch (err) {
        if (apiBase() && err.message !== "no-api") throw err;
        return null;
      }
    },

    async getWardrobe(memberId) {
      try {
        return await request("/api/wardrobe/" + encodeURIComponent(memberId));
      } catch (err) {
        if (apiBase() && err.message !== "no-api") throw err;
        return { version: 1, avatars: [], activeId: null, offline: true };
      }
    },

    async putWardrobe(memberId, wardrobe) {
      try {
        return await request("/api/wardrobe/" + encodeURIComponent(memberId), {
          method: "PUT",
          body: JSON.stringify(wardrobe || {})
        });
      } catch (err) {
        if (apiBase() && err.message !== "no-api") throw err;
        return wardrobe || { version: 1, avatars: [], activeId: null, offline: true };
      }
    },

    // -------------------------------------------------------------------------
    // Discord OAuth helpers (local demo server). Pages alone cannot finish OAuth.
    // How this works: status → gate button; start URL is full origin + /api/auth/discord.
    // Beginner: after Discord redirects back with ?discord_token=, boot saves session via me().
    // ENGINE DEV: chrome-only — never touches #stage-slot.
    // -------------------------------------------------------------------------
    async discordAuthStatus() {
      try {
        return await request("/api/auth/discord/status");
      } catch (err) {
        return { enabled: false };
      }
    },

    discordAuthStartUrl: function () {
      // How this works (?v=20260906al): when the page is on Pages (or any host ≠ API),
      // pass ?return= so the server can redirect back to Pages with ?discord_token=.
      // Beginner: Discord portal redirect URI stays the tunnel callback; return is allowlisted.
      var base = apiBase();
      if (!base) return "";
      var url = base + "/api/auth/discord";
      try {
        var pageBase = location.origin + location.pathname;
        if (location.origin.replace(/\/$/, "") !== base.replace(/\/$/, "")) {
          url += "?return=" + encodeURIComponent(pageBase);
        }
      } catch (eRet) {}
      return url;
    },

    async me() {
      // How this works: refresh public user with Bearer token (used after Discord callback).
      var body = await request("/api/me");
      var session = loadSession() || {};
      if (body && body.user) {
        session.user = body.user;
        saveSession(session);
      }
      return body;
    },

    acceptDiscordToken: function (token) {
      // Save raw token; caller then awaits me() to fill user.
      token = String(token || "");
      if (!token) throw new Error("Missing discord token.");
      saveSession({ token: token, user: null });
      return token;
    }
  };

  function publicUser(row) {
    var out = {
      id: row.id,
      name: row.name,
      initials: initials(row.name),
      bio: row.bio || "",
      room: row.room || "Studio Loft",
      coins: row.coins || 0
    };
    if (row.authProvider) out.authProvider = row.authProvider;
    if (row.discordId || row.discord) {
      out.discord = true;
      if (row.discordId) out.discordId = row.discordId;
    }
    if (row.facebookId) out.facebookId = row.facebookId;
    if (row.facebookName) out.facebookName = row.facebookName;
    if (row.email) out.email = row.email;
    return out;
  }

  // How this works: lightweight offline password digests (not for production auth).
  function hashGuess(password) {
    var s = String(password || "");
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "hg" + (h >>> 0).toString(16);
  }

  function initials(name) {
    return String(name).split(/\s+/).map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
  }
})(window);
