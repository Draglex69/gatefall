#!/usr/bin/env node
/* Gatefall standalone server — no dependencies, no build step.
   Serves the game (index.html + public/) and the multiplayer room relay at /api/rooms,
   mirroring api/routes/rooms.ts. Run:  node server.mjs   (PORT defaults to 3000)
   Suitable for any Node 18+ host (Render, Railway, Fly, Glitch, a home PC).
   App builds (Android, iOS, desktop; see PUBLISHING.md) call the room relay cross-origin. Requests carry no
   cookies, so any origin may use it by default, exactly like the public web page. To narrow it, set
   ALLOWED_ORIGINS, e.g. ALLOWED_ORIGINS="https://localhost,capacitor://localhost,app://gatefall,https://play.example.com". */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const INDEX = path.join(ROOT, "index.html");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const ALLOWED = (process.env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim()).filter(Boolean);
const VERSION = (/const GAME_VERSION = (\d+);/.exec(fs.existsSync(INDEX) ? fs.readFileSync(INDEX, "utf8") : "") || [])[1] || "?";
function corsHeaders(req){
  const origin = req.headers.origin || "";
  const allow = ALLOWED.includes("*") ? "*" : ALLOWED.includes(origin) ? origin : "";
  if (!allow) return {};
  return {"Access-Control-Allow-Origin":allow, "Access-Control-Allow-Methods":"GET, POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type",
    "Access-Control-Max-Age":"86400", ...(allow === "*" ? {} : {"Vary":"Origin"})};
}

/* ---------- rooms (same rules as api/routes/rooms.ts) ---------- */
const rooms = new Map();
const CLIENT_MS = 90_000, ROOM_MS = 6 * 60 * 60 * 1000;
const roomOK = id => /^gf-[a-z0-9]{4}$/.test(id);
const cleanPeer = v => typeof v === "string" && /^[a-z0-9]{10}$/.test(v) ? v : null;
const cleanText = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
function roomFor(id, create = false){
  let room = rooms.get(id);
  if (!room && create){ room = {seq:0, messages:[], clients:new Map(), active:Date.now()}; rooms.set(id, room); }
  return room;
}
function prune(room){ const now = Date.now(); for (const [id, c] of room.clients) if (now - c.lastSeen > CLIENT_MS) room.clients.delete(id); }
function clientFor(room, id){
  if (!room || typeof id !== "string") return null;
  const c = room.clients.get(id); if (!c) return null;
  c.lastSeen = Date.now(); room.active = Date.now(); return c;
}
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms){ prune(room); if (!room.clients.size && now - room.active > ROOM_MS) rooms.delete(id); }
}, 60_000).unref();

function roomApi(action, id, body){
  if (action === "leave"){
    const room = roomFor(id);
    if (room && typeof body.clientId === "string") room.clients.delete(body.clientId);
    return [200, {ok:true}];
  }
  if (!roomOK(id)) return [400, {error:"Invalid room"}];
  if (action === "join"){
    const peerId = cleanPeer(body.peerId);
    if (!peerId) return [400, {error:"Invalid player"}];
    const room = roomFor(id, true); prune(room);
    for (const [oldId, old] of room.clients) if (old.peerId === peerId) room.clients.delete(oldId);
    const clientId = crypto.randomUUID();
    room.clients.set(clientId, {id:clientId, peerId, lastSeen:Date.now(), presence:{}});
    return [200, {clientId, since:room.seq}];
  }
  const room = roomFor(id), client = clientFor(room, body.clientId);
  if (!room || !client) return [401, {error:"Rejoin required"}];
  if (action === "poll"){
    const p = body.presence;
    if (p && typeof p === "object") client.presence = {role:cleanText(p.role, 8), name:cleanText(p.name, 24), id:cleanPeer(p.id) || client.peerId};
    prune(room);
    const since = Number.isSafeInteger(body.since) ? Math.max(0, body.since) : room.seq;
    const oldest = room.messages.length ? room.messages[0].seq : room.seq + 1;
    const reset = since + 1 < oldest;
    const from = reset ? Math.max(oldest, room.seq - 199) : since + 1;
    const messages = room.messages.filter(m => m.seq >= from).map(m => ({seq:m.seq, data:m.data, from:m.from}));
    const peers = [...room.clients.values()].map(x => ({clientId:x.id, presence:x.presence}));
    return [200, {messages, peers, seq:room.seq, reset}];
  }
  if (action === "messages"){
    const data = body.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return [400, {error:"Invalid message"}];
    if (JSON.stringify(data).length > 12_000) return [413, {error:"Message too large"}];
    room.messages.push({seq:++room.seq, from:client.id, data});
    if (room.messages.length > 3000) room.messages.splice(0, room.messages.length - 3000);
    return [200, {seq:room.seq}];
  }
  return [404, {error:"Not Found"}];
}

/* ---------- static files ---------- */
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".mjs":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8", ".webmanifest":"application/manifest+json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml",
  ".ico":"image/x-icon", ".txt":"text/plain; charset=utf-8", ".woff2":"font/woff2", ".woff":"font/woff", ".mp3":"audio/mpeg", ".ogg":"audio/ogg", ".wav":"audio/wav"};
const escapeAttr = v => v.replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
function publicOrigin(req){
  const proto = (req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const fwdHost = (req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = fwdHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(fwdHost) ? fwdHost : (req.headers.host || `localhost:${PORT}`);
  return `${proto === "https" || proto === "http" ? proto : "http"}://${host}`;
}
function sendIndex(req, res){
  let html;
  try { html = fs.readFileSync(INDEX, "utf8"); } catch (e){ res.writeHead(500, {"Content-Type":"text/plain"}); return res.end("index.html is missing"); }
  const origin = escapeAttr(publicOrigin(req));
  html = html.replaceAll('"/gatefall-preview.png"', `"${origin}/gatefall-preview.png"`).replace('property="og:url" content="/"', `property="og:url" content="${origin}/"`);
  res.writeHead(200, {"Content-Type":TYPES[".html"], "Cache-Control":"no-cache"});
  res.end(html);
}
function sendFile(res, file){
  const ext = path.extname(file).toLowerCase();
  const noCache = file.endsWith("sw.js") || ext === ".webmanifest";
  res.writeHead(200, {"Content-Type":TYPES[ext] || "application/octet-stream", "Cache-Control":noCache ? "no-cache" : "public, max-age=3600"});
  fs.createReadStream(file).pipe(res);
}
function readJson(req, limit = 32 * 1024){
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > limit){ reject(Object.assign(new Error("too large"), {status:413})); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch (e){ resolve({}); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  if (p.startsWith("/api/")){
    const cors = corsHeaders(req);
    if (req.method === "OPTIONS"){ res.writeHead(204, cors); return res.end(); }
    if (p === "/api/health" && req.method === "GET"){ res.writeHead(200, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", ...cors}); return res.end(JSON.stringify({ok:true, game:"gatefall", version:VERSION, rooms:rooms.size})); }
    const m = p.match(/^\/api\/rooms\/([^/]+)\/(join|poll|messages|leave)$/);
    if (!m || req.method !== "POST"){ res.writeHead(404, {"Content-Type":"application/json", ...cors}); return res.end('{"error":"Not Found"}'); }
    let body;
    try { body = await readJson(req); } catch (e){ res.writeHead(e.status || 400, cors); return res.end(); }
    const [status, out] = roomApi(m[2], m[1], body && typeof body === "object" ? body : {});
    res.writeHead(status, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", ...cors});
    return res.end(JSON.stringify(out));
  }
  if (req.method !== "GET" && req.method !== "HEAD"){ res.writeHead(405); return res.end(); }
  if (p === "/" || p === "/index.html") return sendIndex(req, res);
  const file = path.normalize(path.join(PUBLIC, p));
  if (file.startsWith(PUBLIC + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(res, file);
  // short pages: /privacy serves public/privacy.html
  if (/^\/[a-z-]+$/.test(p) && fs.existsSync(file + ".html")) return sendFile(res, file + ".html");
  const accept = req.headers.accept || "";
  if (accept.includes("text/html")) return sendIndex(req, res);
  res.writeHead(404, {"Content-Type":"application/json"}); res.end('{"error":"Not Found"}');
});
server.listen(PORT, HOST, () => console.log(`Gatefall is running at http://localhost:${PORT}  (rooms relay at /api/rooms)`));
