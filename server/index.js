import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { analyze, validatePhotos } from "./vision.js";
const root = path.resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const port = Number(process.env.PORT || 3001),
  host = process.env.HOST || "127.0.0.1";
const key = process.env.OPENAI_API_KEY,
  token = process.env.APP_ACCESS_TOKEN,
  model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const configured = Boolean(key && token && token.length >= 32);
let running = false;
const calls = [];
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".gz": "application/gzip",
};
function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}
function authorized(req) {
  const value = req.headers.authorization || "",
    expected = `Bearer ${token}`;
  return (
    value.length === expected.length &&
    timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  );
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/capabilities") {
      send(res, 200, { vision: configured, publication: false });
      return;
    }
    if (url.pathname === "/api/vision") {
      if (req.method !== "POST") {
        send(res, 405, { error: "Méthode non autorisée" });
        return;
      }
      if (!configured) {
        send(res, 503, {
          error:
            "Analyse IA non configurée. Ajoutez OPENAI_API_KEY et APP_ACCESS_TOKEN côté serveur.",
        });
        return;
      }
      if (!authorized(req)) {
        send(res, 401, {
          error: "Code d’accès au serveur manquant ou incorrect.",
        });
        return;
      }
      const origin = req.headers.origin;
      const allowed = process.env.APP_ORIGIN || `http://${req.headers.host}`;
      if (origin && origin !== allowed) {
        send(res, 403, { error: "Origine non autorisée" });
        return;
      }
      const now = Date.now();
      while (calls.length && calls[0] < now - 3600000) calls.shift();
      if (running || calls.length >= 20) {
        send(res, 429, {
          error:
            "Analyse déjà en cours ou limite de 20 analyses par heure atteinte.",
        });
        return;
      }
      if (!req.headers["content-type"]?.startsWith("application/json")) {
        send(res, 415, { error: "JSON requis" });
        return;
      }
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 29000000) {
          send(res, 413, { error: "Photos trop volumineuses" });
          return;
        }
        chunks.push(chunk);
      }
      let photos;
      try {
        photos = validatePhotos(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        send(res, 400, {
          error: "Envoyez exactement un recto et un verso valides.",
        });
        return;
      }
      running = true;
      calls.push(now);
      try {
        send(res, 200, await analyze(photos, { key, model }));
      } catch (e) {
        send(res, 502, { error: e.message });
      } finally {
        running = false;
      }
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      send(res, 404, { error: "Service inconnu" });
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      send(res, 405, { error: "Méthode non autorisée" });
      return;
    }
    let filename = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (!filename.startsWith(root + path.sep) && filename !== root) {
      send(res, 403, { error: "Accès interdit" });
      return;
    }
    if (filename === root || url.pathname.endsWith("/"))
      filename = path.join(root, "index.html");
    try {
      if (!(await stat(filename)).isFile()) throw new Error();
    } catch {
      send(res, 404, { error: "Fichier absent. Exécutez npm run build." });
      return;
    }
    res.writeHead(200, {
      "Content-Type":
        mime[path.extname(filename)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control":
        path.extname(filename) === ".html"
          ? "no-cache"
          : "public, max-age=3600",
    });
    res.end(req.method === "HEAD" ? undefined : await readFile(filename));
  } catch {
    send(res, 500, {
      error: "Erreur serveur. Aucune donnée sensible n’a été journalisée.",
    });
  }
});
server.requestTimeout = 120000;
server.headersTimeout = 10000;
server.listen(port, host, () =>
  console.log(
    `Poke Scan Sell : http://${host}:${server.address().port} · analyse IA ${configured ? "configurée" : "désactivée"}`,
  ),
);
