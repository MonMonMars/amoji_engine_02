#!/usr/bin/env node
/** Quick smoke: start button must be top element even when engine imports fail. */
import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, statSync } from "fs";
import { extname, join } from "path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

const root = join(import.meta.dirname, "..");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".vrm": "application/octet-stream",
};

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  let path = url.pathname === "/" ? "/prototypes/amoji-companion.html" : url.pathname;
  const file = join(root, path.replace(/^\//, ""));
  try {
    const data = readFileSync(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((r) => server.listen(8766, r));
const PAGE_URL = "http://127.0.0.1:8766/prototypes/amoji-companion.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.route("**/amoji-engine/**", (route) => route.abort("failed"));
await page.goto(PAGE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
const snap = await page.evaluate(() => {
  const start = document.getElementById("start-character-picker");
  if (!start) {
    return {
      build: window.__amojiBuild,
      overlayCount: document.querySelectorAll(".avatar-loading").length,
      startPresent: false,
      startVisible: false,
      topIsStart: false,
      startZ: null,
    };
  }
  const r = start.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return {
    build: window.__amojiBuild,
    overlayCount: document.querySelectorAll(".avatar-loading").length,
    startPresent: true,
    startVisible: getComputedStyle(start).visibility !== "hidden",
    topIsStart: top?.id === "start-character-picker",
    startZ: getComputedStyle(start).zIndex,
  };
});
console.log(JSON.stringify(snap, null, 2));
const buildOk = snap.build === AMOJI_BUILD;
const overlayOk = snap.overlayCount === 0;
const pickerOk = !snap.startPresent || (snap.topIsStart && snap.startVisible);
if (!buildOk || !overlayOk || !pickerOk) {
  process.exitCode = 1;
}
await browser.close();
server.close();
