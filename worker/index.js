/* Gatefall on Cloudflare: one Worker serves the website (build/web, as static assets) and the online rooms.
   Each room is a Durable Object (one small instance per room code), holding the same relay as server.mjs:
   POST /api/rooms/:room/(join|poll|messages|leave). Rooms live in memory: a room nobody polls for a while is
   simply dropped, like a server restart. Deploy: see PUBLISHING.md ("Website and APK from GitHub"). */

const CLIENT_MS = 90_000;
const roomOK = id => /^gf-[a-z0-9]{4}$/.test(id);
const cleanPeer = v => typeof v === "string" && /^[a-z0-9]{10}$/.test(v) ? v : null;
const cleanText = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
const json = (status, body, extra = {}) => new Response(JSON.stringify(body), {status, headers:{"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", ...extra}});

export class Room {
  constructor(state, env){ this.state = state; this.seq = 0; this.messages = []; this.clients = new Map(); }
  prune(){ const now = Date.now(); for (const [id, c] of this.clients) if (now - c.lastSeen > CLIENT_MS) this.clients.delete(id); }
  client(id){ const c = typeof id === "string" && this.clients.get(id); if (!c) return null; c.lastSeen = Date.now(); return c; }
  async fetch(req){
    const [, , , , action] = new URL(req.url).pathname.split("/");
    let body = {};
    try { const t = await req.text(); if (t.length > 32 * 1024) return json(413, {error:"Too large"}); body = t ? JSON.parse(t) : {}; } catch (e) { body = {}; }
    if (!body || typeof body !== "object") body = {};
    if (action === "leave"){ if (typeof body.clientId === "string") this.clients.delete(body.clientId); return json(200, {ok:true}); }
    if (action === "join"){
      const peerId = cleanPeer(body.peerId); if (!peerId) return json(400, {error:"Invalid player"});
      this.prune();
      for (const [old, c] of this.clients) if (c.peerId === peerId) this.clients.delete(old);
      const clientId = crypto.randomUUID();
      this.clients.set(clientId, {id:clientId, peerId, lastSeen:Date.now(), presence:{}});
      return json(200, {clientId, since:this.seq});
    }
    const c = this.client(body.clientId);
    if (!c) return json(401, {error:"Rejoin required"});
    if (action === "poll"){
      const p = body.presence;
      if (p && typeof p === "object") c.presence = {role:cleanText(p.role, 8), name:cleanText(p.name, 24), id:cleanPeer(p.id) || c.peerId};
      this.prune();
      const since = Number.isSafeInteger(body.since) ? Math.max(0, body.since) : this.seq;
      const oldest = this.messages.length ? this.messages[0].seq : this.seq + 1;
      const reset = since + 1 < oldest;
      const from = reset ? Math.max(oldest, this.seq - 199) : since + 1;
      return json(200, {messages:this.messages.filter(m => m.seq >= from), peers:[...this.clients.values()].map(x => ({clientId:x.id, presence:x.presence})), seq:this.seq, reset});
    }
    if (action === "messages"){
      const data = body.data;
      if (!data || typeof data !== "object" || Array.isArray(data)) return json(400, {error:"Invalid message"});
      if (JSON.stringify(data).length > 12_000) return json(413, {error:"Message too large"});
      this.messages.push({seq:++this.seq, from:c.id, data});
      if (this.messages.length > 3000) this.messages.splice(0, this.messages.length - 3000);
      return json(200, {seq:this.seq});
    }
    return json(404, {error:"Not Found"});
  }
}

// the apps (Android, desktop) load the game from their own origin; requests carry no cookies, so any origin may use the rooms
const CORS = {"Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET, POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type", "Access-Control-Max-Age":"86400"};
const withCors = res => { const r = new Response(res.body, res); for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v); return r; };

export default {
  async fetch(req, env){
    const url = new URL(req.url), p = url.pathname;
    if (p.startsWith("/api/")){
      if (req.method === "OPTIONS") return new Response(null, {status:204, headers:CORS});
      if (p === "/api/health") return withCors(json(200, {ok:true, game:"gatefall", version:env.GAME_VERSION || "?"}));
      const m = p.match(/^\/api\/rooms\/([^/]+)\/(join|poll|messages|leave)$/);
      if (!m || req.method !== "POST") return withCors(json(404, {error:"Not Found"}));
      if (m[2] !== "leave" && !roomOK(m[1])) return withCors(json(400, {error:"Invalid room"}));
      if (!roomOK(m[1])) return withCors(json(200, {ok:true}));
      const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
      return withCors(await stub.fetch(req));
    }
    if (p === "/privacy") return env.ASSETS.fetch(new Request(new URL("/privacy.html", url), req));
    const res = await env.ASSETS.fetch(req);
    // link previews (WhatsApp, Telegram, ...) need absolute addresses for the preview picture and page
    if (typeof HTMLRewriter !== "undefined" && (res.headers.get("Content-Type") || "").includes("text/html") && !p.startsWith("/privacy")){
      const abs = v => v && !/^https?:/.test(v) ? new URL(v.replace(/^\.?\//, "/"), url.origin).href : v;
      return new HTMLRewriter().on('meta[property^="og:"], meta[name^="twitter:"]', {element(el){
        const c = el.getAttribute("content"), k = el.getAttribute("property") || el.getAttribute("name");
        if (/og:url$/.test(k)) el.setAttribute("content", url.origin + "/");
        else if (/image(:secure_url)?$/.test(k) && c) el.setAttribute("content", abs(c));
      }}).transform(res);
    }
    return res;
  }
};
