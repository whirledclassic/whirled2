/**
 * Tiny client for the demo server.
 * If WHIRLED_API is empty or the server is down, the page falls back
 * to localStorage so index.html still works offline.
 */
(function (root) {
  "use strict";

  var KEY = "whirled2.session";
  var USERS_KEY = "whirled2.users";
  var CHAT_KEY = "whirled2.chat.loft";

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

  function hashGuess(password) {
    return "local:" + password;
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

    logout: function () { saveSession(null); },

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
    return {
      id: row.id,
      name: row.name,
      initials: initials(row.name),
      bio: row.bio || "",
      room: row.room || "Studio Loft",
      coins: row.coins || 0
    };
  }

  function initials(name) {
    return String(name).split(/\s+/).map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
  }
})(window);
