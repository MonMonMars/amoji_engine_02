#!/usr/bin/env node
/**
 * Minimal static host for companion + /app + /api/health (local CI smoke).
 */
import { createServer } from "node:http";
import { readFileSync, statSync, existsSync } from "node:fs";
import { extname, join as pathJoin } from "node:path";
import { fileURLToPath } from "node:url";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { rewriteCompanionServePath, buildPlayRedirectLocation } from "../amoji-engine/engine/companion/companionFreshBoot.js";

const root = pathJoin(fileURLToPath(new URL(".", import.meta.url)), "..");

function mime(p) {
  const m = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".webp": "image/webp",
    ".vrm": "application/octet-stream",
    ".webmanifest": "application/manifest+json",
  };
  return m[extname(p)] || "application/octet-stream";
}

/**
 * @param {number} [port=0] 0 = OS-assigned free port
 */
export function startLocalStaticServer(port = 0) {
  return new Promise((resolve, reject) => {
    const srv = createServer((req, res) => {
      let p = req.url?.split("?")[0] || "/";
      if (p === "/play" || p === "/play/" || p === "/go") {
        const search = req.url?.includes("?")
          ? req.url.slice(req.url.indexOf("?"))
          : "";
        const loc = buildPlayRedirectLocation(search, { build: AMOJI_BUILD });
        res.writeHead(303, {
          Location: loc,
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        });
        res.end();
        return;
      }
      if (p === "/api/health") {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(
          JSON.stringify({
            ok: true,
            service: "amoji-companion",
            build: AMOJI_BUILD,
          }),
        );
        return;
      }
      if (p === "/app") {
        p = "/app/";
      }
      p = rewriteCompanionServePath(p);
      let file = pathJoin(root, p.replace(/^\//, ""));
      try {
        if (!existsSync(file)) {
          res.writeHead(404).end("not found");
          return;
        }
        const st = statSync(file);
        if (st.isDirectory()) {
          file = pathJoin(file, "index.html");
          if (!existsSync(file)) {
            res.writeHead(404).end("not found");
            return;
          }
        }
        const body = readFileSync(file);
        res.writeHead(200, {
          "Content-Type": mime(file),
          "Cache-Control": "no-store",
        });
        res.end(body);
      } catch {
        if (!res.headersSent) {
          res.writeHead(404).end("not found");
        }
      }
    });
    srv.once("error", reject);
    srv.listen(port, "127.0.0.1", () => {
      srv.off("error", reject);
      const addr = srv.address();
      const boundPort = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        srv,
        port: boundPort,
        baseUrl: `http://127.0.0.1:${boundPort}`,
        close: () =>
          new Promise((done) => {
            srv.close(() => done());
          }),
      });
    });
  });
}
