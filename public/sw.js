/* Gatefall app shell: local modes work offline; /api/* always stays on the network. */
const CACHE_NAME = "gatefall-v51-shell-r1";
// the folder this worker was served from: "/" on the game's own server, "/games/gatefall/" on a static host
const BASE = new URL("./", self.location.href).pathname;
const SHELL = [
  "",
  "index.html",
  "manifest.webmanifest",
  "gatefall-preview.png",
  "gatefall-mobile.png",
  "gatefall-icon.svg",
  "fonts/fonts.css",
  "fonts/Jersey10-Regular.woff",
  "fonts/PixelifySans-Variable.woff",
  "icons/gatefall-192.png",
  "icons/gatefall-512.png",
  "icons/gatefall-maskable-192.png",
  "icons/gatefall-maskable-512.png",
  "icons/gatefall-apple-touch.png"
].map(path => BASE + path);
const CACHED_ASSETS = new Set(SHELL.filter(path => path !== BASE));

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith("gatefall-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith(BASE + "api/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          await cache.put(BASE + "index.html", response.clone());
          await cache.put(BASE, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await cache.match(BASE + "index.html") || await cache.match(BASE);
        if (cached) return cached;
        return new Response("Gatefall is not available offline yet. Reconnect once to finish setting it up.", {
          status: 503,
          headers: {"Content-Type": "text/plain; charset=utf-8"}
        });
      }
    })());
    return;
  }

  if (!CACHED_ASSETS.has(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(url.pathname);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url.pathname, response.clone());
    }
    return response;
  })());
});
