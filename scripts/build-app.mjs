#!/usr/bin/env node
/* Builds a self-contained copy of the game for an app store or static web host. No dependencies.

     node scripts/build-app.mjs --platform android --server https://rooms.example.com [--web https://play.example.com]

   --platform  web | android | ios | desktop   (default: web)
   --server    https address of a running server.mjs, used for online rooms. Without it, apps play offline only
               (solo, hunts, free-for-all, 2v2 against bots). You can also set GATEFALL_SERVER instead.
   --web       public address of the web version, used in invite links from apps (optional; GATEFALL_WEB)
   --out       output folder (defaults: web → build/web, android/ios → platforms/mobile/www,
               desktop → platforms/desktop/app)

   What it does: copies index.html and public/, makes every asset path relative, and writes window.GATEFALL_CONFIG so the
   game knows its platform and server. App builds drop the web-only parts (service worker, web manifest).
   The fonts are bundled in public/fonts, so builds work offline and contact no other site. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).join(" ").split(/\s+--/).map(s => s.replace(/^--/, "").split(/[ =]/)).filter(a => a[0]).map(([k, ...v]) => [k, v.join(" ")]));
const platform = args.platform || "web";
if (!["web", "android", "ios", "desktop"].includes(platform)) throw new Error("--platform must be web, android, ios or desktop");
const server = (args.server || process.env.GATEFALL_SERVER || "").replace(/\/+$/, "");
const webUrl = (args.web || process.env.GATEFALL_WEB || "").replace(/\/+$/, "");
if (server && !/^https:\/\//.test(server) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(server)) throw new Error("--server must be an https:// address");
const defaults = { web: "build/web", android: "platforms/mobile/www", ios: "platforms/mobile/www", desktop: "platforms/desktop/app" };
const OUT = path.resolve(ROOT, args.out || defaults[platform]);
const native = platform !== "web";

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, "public"), OUT, { recursive: true, filter: src => !(native && /(sw\.js|manifest\.webmanifest)$/.test(src)) });

let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const config = { platform, server, webUrl, sw: native ? "" : "sw.js" };
const CHARSET = '<meta charset="utf-8">';
if (!html.includes(CHARSET)) throw new Error("index.html has no <meta charset> line");
const afterCharset = extra => { html = html.replace(CHARSET, CHARSET + "\n" + extra); };
afterCharset(`<script>window.GATEFALL_CONFIG = ${JSON.stringify(config)};</script>`);
// relative asset paths, so the build works from any folder, file:// (desktop) or an app's local web server
html = html.replace(/(href|src|content)="\/(?=[a-z])/g, '$1="');
if (native){
  html = html.replace(/<link rel="manifest"[^>]*>\n?/, "");
  // apps: content may not load other websites; links still open outside
  afterCharset(`<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'${server ? " " + server : ""};">`);
}
fs.writeFileSync(path.join(OUT, "index.html"), html);
console.log(`Built Gatefall for ${platform} in ${path.relative(ROOT, OUT)}/` +
  `\n  online rooms: ${server || (native ? "off (offline modes only)" : "the server this copy is hosted on (none on a plain static host)")}`);
