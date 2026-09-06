/**
 * Optional tiny Node demo server for shared chat / occupants.
 *
 * How this works:
 * - Run locally (see README). Point the page at it with window.WHIRLED_API = "http://localhost:PORT".
 * - On GitHub Pages, WHIRLED_API is empty — app.js uses WhirledApi offline localStorage instead.
 * - In-memory users + loft chat; not a production database.
 * - Endpoints used by src/api.js: /api/register, /api/login, /api/me,
 *   /api/rooms/:id/chat, occupants, music (+ optional music/resync).
 *
 * Shared room soundtrack (chrome sync protocol):
 * - GitHub Pages alone cannot sync two phones. Run this demo server so clients
 *   poll GET /api/rooms/:id/music and the owner PUTs embed + startedAt.
 * - ENGINE DEV: music sync is chrome HTTP only — never touches #stage-slot / Pixi.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(__dirname, "data.json");
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";

// DB shape kept in server/data.json (created on first write).
function emptyDb() {
  // How this works: roomMusic[roomId] holds the shared loft soundtrack timeline.
  // Beginner: startedAt is when the current embed began — clients seek to (now - startedAt).
  return { users: {}, sessions: {}, messages: [], presence: {}, roomMusic: {} };
}
function load() {
  try { return Object.assign(emptyDb(), JSON.parse(fs.readFileSync(DATA, "utf8"))); }
  catch { return emptyDb(); }
}
function save(db) {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(db, null, 2));
}
function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, useSalt, 32).toString("hex");
  return { salt: useSalt, hash };
}
function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    initials: row.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
    bio: row.bio || "",
    room: row.room || "Studio Loft",
    coins: row.coins || 0
  };
}
function slug(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (err) { reject(err); }
    });
    req.on("error", reject);
  });
}
function send(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS"
  });
  res.end(JSON.stringify(body));
}
function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".md": "text/plain; charset=utf-8" })[ext] || "application/octet-stream";
}
// How this works: Authorization Bearer <token> → session → user row.
function authUser(db, req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = db.sessions[token];
  if (!session) return null;
  return db.users[session.userId] || null;
}


// Presence map: who is "in" a room (heartbeat from the client).
function touchPresence(db, user, room) {
  if (!user) return;
  const roomId = room || user.room || "loft";
  if (!db.presence) db.presence = {};
  if (!db.presence[roomId]) db.presence[roomId] = {};
  db.presence[roomId][user.id] = Date.now();
  user.room = roomId === "loft" ? "Studio Loft" : roomId;
  db.users[user.id] = user;
}
function occupantsInRoom(db, room) {
  const roomId = room === "Studio Loft" ? "loft" : room;
  const STALE_MS = 45000;
  const now = Date.now();
  if (!db.presence) db.presence = {};
  const map = db.presence[roomId] || {};
  // also count active sessions whose user.room matches
  const activeUserIds = new Set();
  for (const [token, sess] of Object.entries(db.sessions || {})) {
    const u = db.users[sess.userId];
    if (!u) continue;
    const uRoom = (u.room === "Studio Loft" || !u.room) ? "loft" : u.room;
    if (uRoom === roomId) {
      // refresh from session activity window (15 min)
      if (now - (sess.at || 0) < 15 * 60 * 1000) {
        map[u.id] = Math.max(map[u.id] || 0, sess.at || now);
      }
    }
  }
  db.presence[roomId] = map;
  const list = [];
  for (const [uid, seen] of Object.entries(map)) {
    if (now - seen > STALE_MS) {
      delete map[uid];
      continue;
    }
    const u = db.users[uid];
    if (!u) continue;
    list.push({ id: u.id, name: u.name, initials: publicUser(u).initials, online: true, room: u.room || "Studio Loft" });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

// Information: HTTP server entry — routes /api/* JSON, else static files from web-mock root.
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "OPTIONS") return send(res, 204, {});
  const db = load();
  try {
    if (req.method === "POST" && url.pathname === "/api/register") {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const password = String(body.password || "");
      if (name.length < 2) return send(res, 400, { error: "Name needs at least 2 characters." });
      if (password.length < 4) return send(res, 400, { error: "Password needs at least 4 characters." });
      const id = slug(name);
      if (!id) return send(res, 400, { error: "Name is not usable." });
      if (db.users[id]) return send(res, 409, { error: "That name is taken." });
      const secret = hashPassword(password);
      db.users[id] = { id, name, bio: "Home room is the profile.", room: "Studio Loft", coins: 0, ...secret };
      const token = crypto.randomBytes(18).toString("hex");
      db.sessions[token] = { userId: id, at: Date.now() };
      touchPresence(db, db.users[id], "loft");
      save(db);
      return send(res, 201, { token, user: publicUser(db.users[id]) });
    }
    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = await readBody(req);
      const id = slug(body.name || "");
      const row = db.users[id];
      if (!row) return send(res, 401, { error: "Name or password is wrong." });
      const check = hashPassword(String(body.password || ""), row.salt);
      if (check.hash !== row.hash) return send(res, 401, { error: "Name or password is wrong." });
      const token = crypto.randomBytes(18).toString("hex");
      db.sessions[token] = { userId: id, at: Date.now() };
      touchPresence(db, row, "loft");
      save(db);
      return send(res, 200, { token, user: publicUser(row) });
    }
    if (url.pathname === "/api/me") {
      const user = authUser(db, req);
      if (!user) return send(res, 401, { error: "Sign in first." });
      if (req.method === "GET") return send(res, 200, { user: publicUser(user) });
      if (req.method === "PATCH") {
        const body = await readBody(req);
        if (body.name) user.name = String(body.name).trim().slice(0, 24);
        if (body.bio != null) user.bio = String(body.bio).slice(0, 180);
        db.users[user.id] = user;
        save(db);
        return send(res, 200, { user: publicUser(user) });
      }
    }
    const chatMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/chat$/);
    if (chatMatch) {
      const room = decodeURIComponent(chatMatch[1]);
      if (req.method === "GET") {
        let messages = db.messages.filter((m) => m.room === room);
        const since = url.searchParams.get("since");
        if (since) messages = messages.filter((m) => m.at > since);
        return send(res, 200, { messages: messages.slice(-80) });
      }
      if (req.method === "POST") {
        const user = authUser(db, req);
        if (!user) return send(res, 401, { error: "Sign in first." });
        const body = await readBody(req);
        const text = String(body.text || "").trim().slice(0, 240);
        if (!text) return send(res, 400, { error: "Empty message." });
        const message = { id: "m" + Date.now() + crypto.randomBytes(3).toString("hex"), room, who: user.name, userId: user.id, text, at: new Date().toISOString() };
        db.messages.push(message);
        db.messages = db.messages.slice(-500);
        save(db);
        return send(res, 201, { message });
      }
    }

    const occMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/occupants$/);
    if (occMatch) {
      const room = decodeURIComponent(occMatch[1]);
      if (req.method === "GET") {
        const user = authUser(db, req);
        if (user) {
          touchPresence(db, user, room === "Studio Loft" ? "loft" : room);
          // bump session activity
          const header = req.headers.authorization || "";
          const token = header.startsWith("Bearer ") ? header.slice(7) : "";
          if (token && db.sessions[token]) db.sessions[token].at = Date.now();
          save(db);
        }
        return send(res, 200, { occupants: occupantsInRoom(db, room) });
      }
      if (req.method === "POST") {
        const user = authUser(db, req);
        if (!user) return send(res, 401, { error: "Sign in first." });
        touchPresence(db, user, room === "Studio Loft" ? "loft" : room);
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        if (token && db.sessions[token]) db.sessions[token].at = Date.now();
        save(db);
        return send(res, 200, { occupants: occupantsInRoom(db, room) });
      }
    }

    // -------------------------------------------------------------------------
    // Shared room soundtrack (owner embeds once → all clients hear the same loop)
    // How this works: owner PUT sets embed + startedAt (resets timeline when URL changes).
    // Guests GET + poll every ~2–3s. Optional POST .../music/resync bumps startedAt only.
    // Beginner: without this server, Pages localStorage is same-browser / multi-tab only.
    // ENGINE DEV: chrome protocol only — do not mount players in #stage-slot.
    // -------------------------------------------------------------------------
    const musicMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/music$/);
    if (musicMatch) {
      const room = decodeURIComponent(musicMatch[1]);
      if (!db.roomMusic) db.roomMusic = {};
      if (req.method === "GET") {
        const row = db.roomMusic[room] || {
          source: "",
          embedUrl: "",
          embedSrc: "",
          embedTitle: "",
          startedAt: 0,
          loop: true,
          ownerId: "",
          updatedAt: 0
        };
        return send(res, 200, row);
      }
      if (req.method === "PUT") {
        const user = authUser(db, req);
        if (!user) return send(res, 401, { error: "Sign in first." });
        const body = await readBody(req);
        const prev = db.roomMusic[room] || {};
        const ownerId = String(prev.ownerId || "");
        // canControl: first setter claims owner; later only that owner (or loft claim) may change.
        if (ownerId && ownerId !== user.id) {
          return send(res, 403, { error: "Owner controls room music." });
        }
        const source = String(body.source || prev.source || "").toLowerCase();
        const embedUrl = String(body.embedUrl != null ? body.embedUrl : (prev.embedUrl || "")).trim();
        const embedSrc = String(body.embedSrc != null ? body.embedSrc : (prev.embedSrc || "")).trim();
        const embedTitle = String(body.embedTitle != null ? body.embedTitle : (prev.embedTitle || "")).slice(0, 120);
        const loop = body.loop === false ? false : true;
        const urlChanged = embedSrc !== String(prev.embedSrc || "") || embedUrl !== String(prev.embedUrl || "");
        let startedAt = Number(prev.startedAt || 0) || 0;
        if (urlChanged || !startedAt) {
          // Reset timeline when the embed URL changes so everyone seeks from the same start.
          startedAt = Date.now();
        } else if (body.startedAt != null && Number(body.startedAt) > 0) {
          startedAt = Number(body.startedAt);
        }
        const next = {
          source: source === "spotify" || source === "youtube" || source === "local" ? source : (prev.source || "youtube"),
          embedUrl,
          embedSrc,
          embedTitle,
          startedAt,
          loop,
          ownerId: ownerId || user.id,
          updatedAt: Date.now()
        };
        db.roomMusic[room] = next;
        save(db);
        return send(res, 200, next);
      }
    }
    const musicResync = url.pathname.match(/^\/api\/rooms\/([^/]+)\/music\/resync$/);
    if (musicResync && req.method === "POST") {
      const room = decodeURIComponent(musicResync[1]);
      const user = authUser(db, req);
      if (!user) return send(res, 401, { error: "Sign in first." });
      if (!db.roomMusic) db.roomMusic = {};
      const prev = db.roomMusic[room];
      if (!prev || !prev.embedSrc) return send(res, 404, { error: "No room music set." });
      if (prev.ownerId && prev.ownerId !== user.id) {
        return send(res, 403, { error: "Owner controls room music." });
      }
      prev.startedAt = Date.now();
      prev.updatedAt = Date.now();
      db.roomMusic[room] = prev;
      save(db);
      return send(res, 200, prev);
    }

    // logout clears session presence
    if (req.method === "POST" && url.pathname === "/api/logout") {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      const sess = token && db.sessions[token];
      if (sess) {
        const uid = sess.userId;
        delete db.sessions[token];
        if (db.presence) {
          for (const roomId of Object.keys(db.presence)) {
            if (db.presence[roomId]) delete db.presence[roomId][uid];
          }
        }
        save(db);
      }
      return send(res, 200, { ok: true });
    }

    if (url.pathname.startsWith("/api/")) return send(res, 404, { error: "Unknown endpoint." });
  } catch (err) {
    return send(res, 400, { error: err.message || "Bad request." });
  }
  let filePath = path.join(ROOT, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(ROOT)) return send(res, 403, { error: "Nope." });
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return send(res, 404, { error: "Not found." });
  let raw = fs.readFileSync(filePath);
  if (filePath.endsWith("index.html")) {
    raw = Buffer.from(String(raw).replace('window.WHIRLED_API = window.WHIRLED_API || "";', 'window.WHIRLED_API = window.WHIRLED_API || location.origin;'));
  }
  res.writeHead(200, { "Content-Type": mime(filePath) });
  res.end(raw);
});

server.listen(PORT, HOST, () => {
  console.log("Whirled 2 demo server");
  console.log("  page   http://" + HOST + ":" + PORT + "/");
  console.log("  data   " + DATA);
});
