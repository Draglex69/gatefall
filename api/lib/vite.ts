import type { Context, Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

const escapeAttribute = (value: string) => value.replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[ch]!));

// Social crawlers need absolute URLs. Resolve them from the public request so
// the same build works on the preview address and any published custom domain.
function publicOrigin(c: Context<{ Bindings: HttpBindings }>) {
  const requestUrl = new URL(c.req.url);
  const forwardedProto = c.req.header("x-forwarded-proto")?.split(",")[0].trim();
  const forwardedHost = c.req.header("x-forwarded-host")?.split(",")[0].trim();
  const protocol = forwardedProto === "https" || forwardedProto === "http" ? forwardedProto : requestUrl.protocol.slice(0, -1);
  const host = forwardedHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost) ? forwardedHost : requestUrl.host;
  return `${protocol}://${host}`;
}

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.resolve(distPath, "index.html");
  const indexHtml = (c: Context<{ Bindings: HttpBindings }>) => {
    const origin = escapeAttribute(publicOrigin(c));
    const content = fs.readFileSync(indexPath, "utf-8")
      .replaceAll('"/gatefall-preview.png"', `"${origin}/gatefall-preview.png"`)
      .replace('property="og:url" content="/"', `property="og:url" content="${origin}/"`);
    c.header("Cache-Control", "no-cache");
    return c.html(content);
  };

  app.use("*", async (c, next) => {
    await next();
    if (c.req.path === "/sw.js" || c.req.path === "/manifest.webmanifest") {
      c.header("Cache-Control", "no-cache");
    }
  });

  app.get("/", indexHtml);
  app.get("/index.html", indexHtml);
  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    return indexHtml(c);
  });
}
