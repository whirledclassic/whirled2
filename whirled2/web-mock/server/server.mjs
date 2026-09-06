/**
 * Optional tiny Node demo server for shared chat / occupants.
 *
 * How this works:
 * - Run locally (see README). Point the page at it with window.WHIRLED_API = "http://localhost:PORT".
 * - GitHub Pages may set WHIRLED_API to the demo tunnel (origin only). Hybrid auth falls back to offline localStorage.
 * - Discord success can redirect to CLIENT_RETURN_ORIGIN (Pages) while DISCORD_REDIRECT_URI stays the tunnel callback.
 * - In-memory users + loft chat; not a production database.
 * - Endpoints used by src/api.js: /api/register, /api/login, /api/me,
 *   /api/auth/discord (+ /status, /callback), /api/rooms/:id/chat, occupants,
 *   music (+ optional music/resync).
 *   Experimental avatar lab: POST /api/media, GET /api/media/:sha1, GET/PUT /api/wardrobe/:memberId
 *   (optional — Pages/lab work without these; not wired to room stage).
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

// ---------------------------------------------------------------------------
// Discord OAuth (local demo) — chrome-only; never touches #stage-slot.
// How this works: Discord redirects back with ?code&state; we exchange code for
// a token server-side (client secret stays on the server), then create a session.
// Beginner: set DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET, then open 127.0.0.1:8787.
// ENGINE DEV: auth is chrome session only — do not break #stage-slot / Pixi.
// ---------------------------------------------------------------------------
function loadEnvFile(filePath) {
  // Merge KEY=VALUE lines into process.env without overriding existing values.
  // Never log secret values.
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = val;
      }
    }
  } catch {
    // optional file — ignore missing
  }
}
loadEnvFile("/home/box/.config/whirled2/discord.env");
loadEnvFile(path.join(__dirname, ".env.local"));

function discordEnabled() {
  return !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}
function discordRedirectUri() {
  // Purpose: Discord requires an exact redirect match.
  // How: set DISCORD_REDIRECT_URI for phone tunnels (https://….trycloudflare.com/api/auth/discord/callback).
  // Why: 127.0.0.1 only works on the same device — iPhone needs the public tunnel URL in Discord + here.
  if (process.env.DISCORD_REDIRECT_URI) return String(process.env.DISCORD_REDIRECT_URI).trim();
  return "http://" + HOST + ":" + PORT + "/api/auth/discord/callback";
}
function publicOrigin() {
  // Purpose: browser return URL after Discord when staying on the tunnel (carries ?discord_token=).
  // How: PUBLIC_ORIGIN for tunnels; else local host:port.
  if (process.env.PUBLIC_ORIGIN) return String(process.env.PUBLIC_ORIGIN).replace(/\/$/, "");
  return "http://" + HOST + ":" + PORT;
}
function clientReturnOrigin() {
  // Purpose (?v=20260906al): after Discord callback, optionally send the browser to main Pages
  // instead of only the tunnel. Discord portal Redirect URI stays DISCORD_REDIRECT_URI (tunnel).
  // Beginner: set CLIENT_RETURN_ORIGIN=https://whirledclassic.github.io/whirled2/whirled2/web-mock
  // (or DISCORD_SUCCESS_ORIGIN). Never put secrets here — origin path only.
  const a = process.env.CLIENT_RETURN_ORIGIN || process.env.DISCORD_SUCCESS_ORIGIN || "";
  return String(a).replace(/\/$/, "").trim();
}
function normalizeReturnCandidate(raw) {
  // Accept full origin+pathname from Pages (?return=) or env; strip trailing slash / query / hash.
  try {
    const u = new URL(String(raw || "").trim());
    let path = u.pathname || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return (u.origin + path).replace(/\/$/, "") || u.origin;
  } catch {
    return "";
  }
}
function isAllowlistedReturnOrigin(candidate) {
  // Allow: CLIENT_RETURN_ORIGIN / DISCORD_SUCCESS_ORIGIN, PUBLIC_ORIGIN / tunnel, local, github.io whirledclassic web-mock.
  const c = normalizeReturnCandidate(candidate);
  if (!c) return false;
  const allowed = new Set();
  const cro = clientReturnOrigin();
  if (cro) allowed.add(normalizeReturnCandidate(cro));
  allowed.add(normalizeReturnCandidate(publicOrigin()));
  allowed.add(normalizeReturnCandidate("http://" + HOST + ":" + PORT));
  allowed.add(normalizeReturnCandidate("https://whirledclassic.github.io/whirled2/whirled2/web-mock"));
  if (allowed.has(c)) return true;
  try {
    const u = new URL(c);
    if (
      u.hostname === "whirledclassic.github.io" &&
      u.pathname.indexOf("/whirled2/") !== -1 &&
      u.pathname.indexOf("web-mock") !== -1
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
function discordSuccessRedirectBase(stateRow) {
  // Prefer per-login ?return= (allowlisted), else CLIENT_RETURN_ORIGIN, else PUBLIC_ORIGIN (tunnel).
  const fromState = stateRow && stateRow.returnOrigin ? String(stateRow.returnOrigin) : "";
  if (fromState && isAllowlistedReturnOrigin(fromState)) return normalizeReturnCandidate(fromState);
  const cro = clientReturnOrigin();
  if (cro && isAllowlistedReturnOrigin(cro)) return normalizeReturnCandidate(cro);
  return publicOrigin();
}
// In-memory OAuth state → { at, returnOrigin? } with 5 min TTL (CSRF protection).
const oauthStates = new Map();
function pruneOauthStates() {
  const now = Date.now();
  for (const [k, v] of oauthStates) {
    if (!v || now - v.at > 5 * 60 * 1000) oauthStates.delete(k);
  }
}
function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS"
  });
  res.end();
}

const MEDIA_DIR = path.join(__dirname, "media");
function ensureMediaDir() {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}
function sha1OfBuffer(buf) {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

// DB shape kept in server/data.json (created on first write).
function emptyDb() {
  // How this works: roomMusic[roomId] holds the shared loft soundtrack timeline.
  // Beginner: startedAt is when the current embed began — clients seek to (now - startedAt).
  // wardrobes[memberId] + media index; blob files under server/media/<sha1>
  return { users: {}, sessions: {}, messages: [], presence: {}, roomMusic: {}, wardrobes: {}, mediaIndex: {} };
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
function discordHandleFrom(discordUser) {
  // Purpose: Discord login name for a linked-account badge (NOT the Whirled2 display name).
  const un = String((discordUser && discordUser.username) || "").trim();
  const disc = discordUser && discordUser.discriminator != null ? String(discordUser.discriminator) : "";
  if (un && disc && disc !== "0") return un + "#" + disc;
  if (un) return "@" + un;
  const gn = String((discordUser && discordUser.global_name) || "").trim();
  return gn || "";
}
function publicUser(row) {
  // How this works: never expose password hash / client secrets. discord:true = linked.
  const out = {
    id: row.id,
    name: row.name,
    initials: row.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
    bio: row.bio || "",
    room: row.room || "Studio Loft",
    coins: row.coins || 0
  };
  if (row.discordId) {
    out.discord = true;
    out.discordId = row.discordId;
  }
  if (row.discordUsername) out.discordUsername = String(row.discordUsername).slice(0, 64);
  if (row.authProvider) out.authProvider = row.authProvider;
  return out;
}
function uniqueDisplayName(db, base) {
  // Unique-ify display name if another user already has it.
  let name = String(base || "Discord User").trim().slice(0, 24) || "Discord User";
  let candidate = name;
  let n = 2;
  const taken = (nm) =>
    Object.values(db.users || {}).some(
      (u) => String(u.name || "").toLowerCase() === nm.toLowerCase()
    );
  while (taken(candidate)) {
    const suffix = " " + n;
    candidate = (name.slice(0, Math.max(1, 24 - suffix.length)) + suffix).slice(0, 24);
    n += 1;
    if (n > 9999) break;
  }
  return candidate;
}
function findUserByDiscordId(db, discordId) {
  const id = "discord-" + discordId;
  if (db.users[id]) return db.users[id];
  for (const u of Object.values(db.users || {})) {
    if (u && u.discordId === discordId) return u;
  }
  return null;
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


    // -------------------------------------------------------------------------
    // Avatar lab experimental media + wardrobe (optional; Pages works without)
    // How this works: POST /api/media stores bytes by SHA-1; GET returns metadata + base64.
    // GET/PUT /api/wardrobe/:memberId stores the JSON manifest. Not wired to #stage-slot.
    // Beginner: only used when the Avatar lab flag is on in the chrome.
    // -------------------------------------------------------------------------
    if (req.method === "POST" && url.pathname === "/api/media") {
      const user = authUser(db, req);
      if (!user) return send(res, 401, { error: "Sign in first." });
      const body = await readBody(req);
      const b64 = String(body.base64 || body.dataBase64 || "");
      if (!b64) return send(res, 400, { error: "base64 required." });
      let buf;
      try { buf = Buffer.from(b64, "base64"); } catch (e) {
        return send(res, 400, { error: "Invalid base64." });
      }
      if (!buf.length) return send(res, 400, { error: "Empty media." });
      if (buf.length > 10 * 1024 * 1024) return send(res, 400, { error: "Media over 10MB lab cap." });
      const sha1 = body.sha1 && /^[a-f0-9]{40}$/i.test(String(body.sha1))
        ? String(body.sha1).toLowerCase()
        : sha1OfBuffer(buf);
      // Verify client sha1 when provided
      const computed = sha1OfBuffer(buf);
      if (body.sha1 && String(body.sha1).toLowerCase() !== computed) {
        return send(res, 400, { error: "sha1 mismatch." });
      }
      ensureMediaDir();
      const filePath = path.join(MEDIA_DIR, computed);
      fs.writeFileSync(filePath, buf);
      if (!db.mediaIndex) db.mediaIndex = {};
      db.mediaIndex[computed] = {
        sha1: computed,
        mime: String(body.mime || "application/octet-stream").slice(0, 120),
        name: String(body.name || "").slice(0, 180),
        size: buf.length,
        ownerId: user.id,
        at: new Date().toISOString()
      };
      save(db);
      return send(res, 201, { sha1: computed, size: buf.length, mime: db.mediaIndex[computed].mime });
    }
    const mediaGet = url.pathname.match(/^\/api\/media\/([a-fA-F0-9]{40})$/);
    if (mediaGet && req.method === "GET") {
      const sha1 = mediaGet[1].toLowerCase();
      const meta = (db.mediaIndex && db.mediaIndex[sha1]) || { sha1: sha1, mime: "application/octet-stream" };
      const filePath = path.join(MEDIA_DIR, sha1);
      if (!fs.existsSync(filePath)) return send(res, 404, { error: "Media not found." });
      const buf = fs.readFileSync(filePath);
      return send(res, 200, {
        sha1: sha1,
        mime: meta.mime || "application/octet-stream",
        name: meta.name || "",
        size: buf.length,
        base64: buf.toString("base64")
      });
    }
    const wardrobeMatch = url.pathname.match(/^\/api\/wardrobe\/([^/]+)$/);
    if (wardrobeMatch) {
      const memberId = decodeURIComponent(wardrobeMatch[1]);
      if (!db.wardrobes) db.wardrobes = {};
      if (req.method === "GET") {
        const row = db.wardrobes[memberId] || { version: 1, avatars: [], activeId: null };
        return send(res, 200, row);
      }
      if (req.method === "PUT") {
        const user = authUser(db, req);
        if (!user) return send(res, 401, { error: "Sign in first." });
        // How this works: only the signed-in member may PUT their own wardrobe in this demo.
        if (user.id !== memberId) return send(res, 403, { error: "Can only edit your own wardrobe." });
        const body = await readBody(req);
        const next = {
          version: Number(body.version) || 1,
          avatars: Array.isArray(body.avatars) ? body.avatars.slice(0, 100) : [],
          activeId: body.activeId || null,
          updatedAt: Date.now(),
          ownerId: memberId
        };
        db.wardrobes[memberId] = next;
        save(db);
        return send(res, 200, next);
      }
    }


    // -------------------------------------------------------------------------
    // Discord OAuth (local)
    // How this works: status → authorize redirect → callback code exchange → session.
    // Beginner: button on gate only shows when both env vars are set (see start-local.sh).
    // ENGINE DEV: chrome-only auth — never touches #stage-slot.
    // -------------------------------------------------------------------------
    if (req.method === "GET" && url.pathname === "/api/auth/discord/status") {
      return send(res, 200, { enabled: discordEnabled() });
    }
    if (req.method === "GET" && url.pathname === "/api/auth/discord") {
      if (!discordEnabled()) {
        return send(res, 503, { error: "Discord OAuth disabled (missing DISCORD_CLIENT_ID/SECRET)." });
      }
      pruneOauthStates();
      const state = crypto.randomBytes(16).toString("hex");
      // How this works (?v=20260906al): optional ?return= from Pages — honor if allowlisted.
      // Discord portal still uses DISCORD_REDIRECT_URI (tunnel callback). Success may land on Pages.
      let returnOrigin = "";
      const retRaw = url.searchParams.get("return") || "";
      if (retRaw && isAllowlistedReturnOrigin(retRaw)) {
        returnOrigin = normalizeReturnCandidate(retRaw);
      } else if (clientReturnOrigin()) {
        returnOrigin = normalizeReturnCandidate(clientReturnOrigin());
      }
      oauthStates.set(state, { at: Date.now(), returnOrigin });
      const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        response_type: "code",
        scope: "identify",
        redirect_uri: discordRedirectUri(),
        state
      });
      return redirect(res, "https://discord.com/api/oauth2/authorize?" + params.toString());
    }
    if (req.method === "GET" && url.pathname === "/api/auth/discord/callback") {
      if (!discordEnabled()) {
        return send(res, 503, { error: "Discord OAuth disabled (missing DISCORD_CLIENT_ID/SECRET)." });
      }
      const code = url.searchParams.get("code") || "";
      const state = url.searchParams.get("state") || "";
      pruneOauthStates();
      const st = oauthStates.get(state);
      if (!code || !state || !st) {
        return send(res, 400, { error: "Invalid or expired OAuth state." });
      }
      oauthStates.delete(state);
      // Exchange authorization code for access token (form-urlencoded).
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: discordRedirectUri()
        }).toString()
      });
      const tokenBody = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenBody.access_token) {
        return send(res, 502, { error: "Discord token exchange failed." });
      }
      const meRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: "Bearer " + tokenBody.access_token }
      });
      const discordUser = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !discordUser.id) {
        return send(res, 502, { error: "Discord profile fetch failed." });
      }
      // Create or find user: stable id = discord-<discordId>
      let user = findUserByDiscordId(db, String(discordUser.id));
      // Linked Discord handle for badge (icon + @user) — Whirled2 display name stays separate.
      const discordHandle = discordHandleFrom(discordUser);
      if (!user) {
        const id = "discord-" + discordUser.id;
        const display =
          (discordUser.global_name && String(discordUser.global_name).trim()) ||
          (discordUser.username && String(discordUser.username).trim()) ||
          "Discord User";
        const unusable = hashPassword(crypto.randomBytes(32).toString("hex"));
        user = {
          id,
          name: uniqueDisplayName(db, display),
          bio: "Signed in with Discord.",
          room: "Studio Loft",
          coins: 0,
          discordId: String(discordUser.id),
          discordUsername: discordHandle,
          authProvider: "discord",
          ...unusable
        };
        db.users[id] = user;
      } else {
        // Refresh Discord link only — do not overwrite Whirled2 display name.
        user.discordId = String(discordUser.id);
        if (discordHandle) user.discordUsername = discordHandle;
        user.authProvider = user.authProvider || "discord";
        db.users[user.id] = user;
      }
      const token = crypto.randomBytes(18).toString("hex");
      db.sessions[token] = { userId: user.id, at: Date.now() };
      touchPresence(db, user, "loft");
      save(db);
      // Strip code from URL via redirect — client reads ?discord_token= and enters shell.
      // Beginner (?v=20260906al): may return to Pages (CLIENT_RETURN_ORIGIN / ?return=) or tunnel.
      const successBase = discordSuccessRedirectBase(st);
      return redirect(
        res,
        successBase + "/?discord_token=" + encodeURIComponent(token) + "&v=20260906al"
      );
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
    // When this server serves the page, force WHIRLED_API to this origin (tunnel or local).
    // Pages ships a tunnel default string; replace any WHIRLED_API || … assignment.
    raw = Buffer.from(String(raw).replace(
      /window\.WHIRLED_API\s*=\s*window\.WHIRLED_API\s*\|\|\s*[^;]+;/,
      'window.WHIRLED_API = window.WHIRLED_API || location.origin;'
    ));
  }
  res.writeHead(200, { "Content-Type": mime(filePath) });
  res.end(raw);
});

server.listen(PORT, HOST, () => {
  console.log("Whirled 2 demo server");
  console.log("  page   http://" + HOST + ":" + PORT + "/");
  console.log("  data   " + DATA);
  // Never print secret values — only enabled/disabled.
  if (discordEnabled()) console.log("Discord OAuth: enabled");
  else console.log("Discord OAuth: disabled (missing DISCORD_CLIENT_ID/SECRET)");
});
