/**
 * WhirledApi — tiny client for accounts + room chat + shared room music.
 *
 * How this works:
 * - If window.WHIRLED_API is set and the server is up, requests go to server/server.mjs.
 * - If not (GitHub Pages default), everything falls back to localStorage so the chrome
 *   still works offline in one browser.
 * - Session: localStorage key "whirled2.session" { token, user }.
 * - Offline users: "whirled2.users". First register also sets "whirled2.firstUserId".
 * - Offline loft chat: "whirled2.chat.loft" (array of messages).
 * - Shared soundtrack: getRoomMusic / setRoomMusic — HTTP when server; else localStorage
 *   key "whirled2.roomMusic.loft" (same-tab + multi-tab via storage event only on Pages).
 * - ENGINE DEV: chrome HTTP / localStorage only — never mounts players in #stage-slot.
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
      name = String(name || "").trim();
      password = String(password || "");
      if (name.length < 2) throw new Error("Name needs at least 2 characters.");
      if (password.length < 4) throw new Error("Password needs at least 4 characters.");
      try {
        var body = await request("/api/register", {
          method: "POST",
          body: JSON.stringify({ name: name, password: password })
        });
        saveSession(body);
        return body;
      } catch (err) {
        if (apiBase() && err.message !== "no-api") throw err;
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
      }
    },

    async login(name, password) {
      name = String(name || "").trim();
      password = String(password || "");
      try {
        var body = await request("/api/login", {
          method: "POST",
          body: JSON.stringify({ name: name, password: password })
        });
        saveSession(body);
        return body;
      } catch (err) {
        if (apiBase() && err.message !== "no-api") throw err;
        var users = localUsers();
        var row = users[name.toLowerCase()];
        if (!row || row.password !== hashGuess(password)) {
          throw new Error("Name or password is wrong.");
        }
        var session = { token: "local-" + row.id, user: publicUser(row) };
        saveSession(session);
        return session;
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
    if (row.facebookId) out.facebookId = row.facebookId;
    if (row.facebookName) out.facebookName = row.facebookName;
    if (row.email) out.email = row.email;
    return out;
  }

  function initials(name) {
    return String(name).split(/\s+/).map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
  }
})(window);
