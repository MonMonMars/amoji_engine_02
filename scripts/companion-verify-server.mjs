#!/usr/bin/env node
/**
 * Static companion host for Playwright verifiers (must run in its own process).
 * Usage: node scripts/companion-verify-server.mjs --port 5174
 */
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { extname, join as pathJoin } from "node:path";
import { fileURLToPath } from "node:url";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import {
  rewriteCompanionServePath,
  buildPlayRedirectLocation,
} from "../amoji-engine/engine/companion/companionFreshBoot.js";

const root = pathJoin(fileURLToPath(new URL(".", import.meta.url)), "..");

function parsePort() {
  const idx = process.argv.indexOf("--port");
  if (idx >= 0 && process.argv[idx + 1]) return Number(process.argv[idx + 1]);
  return Number(process.env.LOCAL_PORT || 5174);
}

function mime(p) {
  const m = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".vrm": "application/octet-stream",
    ".glb": "application/octet-stream",
    ".woff2": "font/woff2",
  };
  return m[extname(p)] || "application/octet-stream";
}

const port = parsePort();

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
      "Clear-Site-Data": '"cache"',
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
  p = rewriteCompanionServePath(p);
  const file = pathJoin(root, p.replace(/^\//, ""));
  try {
    statSync(file);
    res.writeHead(200, {
      "Content-Type": mime(file),
      "Cache-Control": "no-store",
    });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404).end("not found");
  }
});

srv.listen(port, "127.0.0.1", () => {
  process.stdout.write(`verify-server:${port}\n`);
});

function shutdown() {
  srv.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
