import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

type Presence = { role?: string; name?: string; id?: string };
type Client = { id: string; peerId: string; lastSeen: number; presence: Presence };
type Message = { seq: number; from: string; data: Record<string, unknown> };
type Room = { seq: number; messages: Message[]; clients: Map<string, Client>; active: number };

const rooms = new Map<string, Room>();
const CLIENT_MS = 90_000;
const ROOM_MS = 6 * 60 * 60 * 1000;
const roomOK = (id: string) => /^gf-[a-z0-9]{4}$/.test(id);
const cleanPeer = (value: unknown) => typeof value === "string" && /^[a-z0-9]{10}$/.test(value) ? value : null;
const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : "";

function roomFor(id: string, create = false) {
  let room = rooms.get(id);
  if (!room && create) {
    room = { seq: 0, messages: [], clients: new Map(), active: Date.now() };
    rooms.set(id, room);
  }
  return room;
}

function prune(room: Room) {
  const now = Date.now();
  for (const [id, client] of room.clients) if (now - client.lastSeen > CLIENT_MS) room.clients.delete(id);
}

function clientFor(room: Room | undefined, id: unknown) {
  if (!room || typeof id !== "string") return null;
  const client = room.clients.get(id);
  if (!client) return null;
  client.lastSeen = Date.now();
  room.active = Date.now();
  return client;
}

export const roomRoutes = new Hono();
// App builds (Android, iOS, desktop) load the game from their own origin and call this relay cross-origin.
// Requests carry no cookies, so any origin may use it, like the public web page; ALLOWED_ORIGINS narrows it.
const ALLOWED = (process.env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim()).filter(Boolean);
roomRoutes.use("*", async (c, next) => {
  const origin = c.req.header("Origin") || "";
  const allow = ALLOWED.includes("*") ? "*" : ALLOWED.includes(origin) ? origin : "";
  if (allow) {
    c.header("Access-Control-Allow-Origin", allow);
    c.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type");
    c.header("Access-Control-Max-Age", "86400");
    if (allow !== "*") c.header("Vary", "Origin");
  }
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});
roomRoutes.use("*", bodyLimit({ maxSize: 32 * 1024, onError: c => c.body(null, 413) }));

roomRoutes.post("/:room/join", async c => {
  const id = c.req.param("room");
  if (!roomOK(id)) return c.json({ error: "Invalid room" }, 400);
  const body = await c.req.json().catch(() => ({}));
  const peerId = cleanPeer(body.peerId);
  if (!peerId) return c.json({ error: "Invalid player" }, 400);
  const room = roomFor(id, true)!;
  prune(room);
  for (const [oldId, old] of room.clients) if (old.peerId === peerId) room.clients.delete(oldId);
  const clientId = crypto.randomUUID();
  room.clients.set(clientId, { id: clientId, peerId, lastSeen: Date.now(), presence: {} });
  return c.json({ clientId, since: room.seq });
});

roomRoutes.post("/:room/poll", async c => {
  const id = c.req.param("room");
  if (!roomOK(id)) return c.json({ error: "Invalid room" }, 400);
  const body = await c.req.json().catch(() => ({}));
  const room = roomFor(id);
  const client = clientFor(room, body.clientId);
  if (!room || !client) return c.json({ error: "Rejoin required" }, 401);
  const p = body.presence;
  if (p && typeof p === "object") client.presence = {
    role: cleanText(p.role, 8), name: cleanText(p.name, 24), id: cleanPeer(p.id) || client.peerId,
  };
  prune(room);
  const since = Number.isSafeInteger(body.since) ? Math.max(0, body.since) : room.seq;
  const oldest = room.messages.length ? room.messages[0].seq : room.seq + 1;
  const reset = since + 1 < oldest;
  const from = reset ? Math.max(oldest, room.seq - 199) : since + 1;
  const messages = room.messages.filter(m => m.seq >= from).map(m => ({ seq: m.seq, data: m.data, from: m.from }));
  const peers = [...room.clients.values()].map(x => ({ clientId: x.id, presence: x.presence }));
  return c.json({ messages, peers, seq: room.seq, reset });
});

roomRoutes.post("/:room/messages", async c => {
  const id = c.req.param("room");
  if (!roomOK(id)) return c.json({ error: "Invalid room" }, 400);
  const body = await c.req.json().catch(() => ({}));
  const room = roomFor(id);
  const client = clientFor(room, body.clientId);
  if (!room || !client) return c.json({ error: "Rejoin required" }, 401);
  const data = body.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return c.json({ error: "Invalid message" }, 400);
  if (JSON.stringify(data).length > 12_000) return c.json({ error: "Message too large" }, 413);
  room.messages.push({ seq: ++room.seq, from: client.id, data });
  if (room.messages.length > 3000) room.messages.splice(0, room.messages.length - 3000);
  return c.json({ seq: room.seq });
});

roomRoutes.post("/:room/leave", async c => {
  const id = c.req.param("room");
  const body = await c.req.json().catch(() => ({}));
  const room = roomFor(id);
  if (room && typeof body.clientId === "string") room.clients.delete(body.clientId);
  return c.json({ ok: true });
});

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    prune(room);
    if (!room.clients.size && now - room.active > ROOM_MS) rooms.delete(id);
  }
}, 60_000).unref();
