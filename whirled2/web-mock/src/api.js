/**
 * WhirledApi — tiny client for accounts + room chat.
 *
 * How this works:
 * - If window.WHIRLED_API is set and the server is up, requests go to server/server.mjs.
 * - If not (GitHub Pages default), everything falls back to localStorage so the chrome
 *   still works offline in one browser.
 * - Session: localStorage key "whirled2.session" { token, user }.
 * - Offline users: "whirled2.users". First register also sets "whirled2.firstUserId".
 * - Offline loft chat: "whirled2.chat.loft" (array of messages).
 * - Facebook Connect (client SDK only): App ID in "whirled2.facebookAppId" (or window.WHIRLED2_FB_APP_ID).
 *   loginWithFacebookProfile / linkFacebook / unlinkFacebook — never invent users without SDK success.
 */
(function (root) {
  "use strict";

  var KEY = "whirled2.session";
  var USERS_KEY = "whirled2.users";
  var CHAT_KEY = "whirled2.chat.loft";
  var FB_APP_ID_KEY = "whirled2.facebookAppId";

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

  // How this works: Meta App ID is digits only. Pages deploy owner pastes it once (Account / gate).
  function getFacebookAppId() {
    try {
      var fromLs = localStorage.getItem(FB_APP_ID_KEY);
      if (fromLs != null && String(fromLs).trim() !== "") {
        var a = String(fromLs).trim();
        if (/^\d+$/.test(a)) return a;
      }
    } catch (e) {}
    try {
      if (root.WHIRLED2_FB_APP_ID != null && String(root.WHIRLED2_FB_APP_ID).trim() !== "") {
        var b = String(root.WHIRLED2_FB_APP_ID).trim();
        if (/^\d+$/.test(b)) return b;
      }
    } catch (e2) {}
    return "";
  }

  function setFacebookAppId(appId) {
    appId = String(appId || "").trim();
    if (appId && !/^\d+$/.test(appId)) throw new Error("Facebook App ID must be digits only.");
    if (appId) localStorage.setItem(FB_APP_ID_KEY, appId);
    else localStorage.removeItem(FB_APP_ID_KEY);
    return appId;
  }

  function hashGuess(password) {
    return "local:" + password;
  }

  function findUserByFacebookId(users, fbId) {
    fbId = String(fbId || "");
    if (!fbId) return null;
    var direct = users["fb_" + fbId];
    if (direct) return direct;
    for (var k in users) {
      if (!Object.prototype.hasOwnProperty.call(users, k)) continue;
      var row = users[k];
      if (row && String(row.facebookId || "") === fbId) return row;
    }
    return null;
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

    // How this works: called only after FB.login + FB.api('/me') succeed — never invent profiles.
    // ENGINE DEV: session shape matches register/login; engine may later read session only.
    async loginWithFacebookProfile(profile) {
      profile = profile || {};
      var fbId = String(profile.id || "").trim();
      var name = String(profile.name || "").trim().slice(0, 40);
      var email = profile.email ? String(profile.email).trim().slice(0, 120) : "";
      if (!fbId) throw new Error("Facebook login failed — no user id from Facebook.");
      if (!name) name = "Facebook " + fbId.slice(-6);
      var localId = "fb_" + fbId.replace(/[^a-zA-Z0-9_-]/g, "");
      if (localId === "fb_") throw new Error("Facebook login failed — invalid user id.");

      // Server path not implemented for FB yet — always localStorage (GitHub Pages).
      var users = localUsers();
      var row = findUserByFacebookId(users, fbId);
      if (row) {
        row.name = name;
        row.facebookId = fbId;
        row.facebookName = name;
        if (email) row.email = email;
        row.authProvider = row.authProvider || "facebook";
        users[row.id] = row;
        saveLocalUsers(users);
        var sessionExisting = { token: "local-" + row.id, user: publicUser(row) };
        saveSession(sessionExisting);
        return sessionExisting;
      }

      users[localId] = {
        id: localId,
        name: name,
        password: "fb-oauth",
        authProvider: "facebook",
        facebookId: fbId,
        facebookName: name,
        email: email,
        bio: "Home room is the profile.",
        room: "Studio Loft",
        coins: 0
      };
      saveLocalUsers(users);
      try {
        if (!localStorage.getItem("whirled2.firstUserId")) {
          localStorage.setItem("whirled2.firstUserId", localId);
        }
      } catch (eFirst) {}
      var sessionNew = { token: "local-" + localId, user: publicUser(users[localId]) };
      saveSession(sessionNew);
      return sessionNew;
    },

    // How this works: logged-in user links FB id onto their existing whirled2.users row.
    async linkFacebook(profile) {
      var session = loadSession();
      if (!session || !session.user) throw new Error("Sign in first.");
      profile = profile || {};
      var fbId = String(profile.id || "").trim();
      var name = String(profile.name || "").trim().slice(0, 40);
      var email = profile.email ? String(profile.email).trim().slice(0, 120) : "";
      if (!fbId) throw new Error("Facebook link failed — no user id from Facebook.");
      var users = localUsers();
      var row = users[session.user.id];
      if (!row) throw new Error("Missing local profile.");
      var taken = findUserByFacebookId(users, fbId);
      if (taken && taken.id !== row.id) {
        throw new Error("That Facebook account is already linked to another Whirled2 user on this browser.");
      }
      row.facebookId = fbId;
      row.facebookName = name || row.name;
      if (email) row.email = email;
      users[row.id] = row;
      saveLocalUsers(users);
      session.user = publicUser(row);
      saveSession(session);
      return session;
    },

    async unlinkFacebook() {
      var session = loadSession();
      if (!session || !session.user) throw new Error("Sign in first.");
      var users = localUsers();
      var row = users[session.user.id];
      if (!row) throw new Error("Missing local profile.");
      delete row.facebookId;
      delete row.facebookName;
      // Keep authProvider if they registered via FB (id starts with fb_) — unlink just clears link fields.
      if (row.authProvider === "facebook" && String(row.id).indexOf("fb_") !== 0) {
        delete row.authProvider;
      }
      users[row.id] = row;
      saveLocalUsers(users);
      session.user = publicUser(row);
      saveSession(session);
      return session;
    },

    getFacebookAppId: getFacebookAppId,
    setFacebookAppId: setFacebookAppId,

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
