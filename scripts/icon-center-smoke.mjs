#!/usr/bin/env node
/**
 * Measure round-button glyph centers vs button centers.
 * Fails if any icon is offset by more than 2px.
 */
import { chromium } from "playwright";
import { createServer } from "http";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { extname, join } from "path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

const root = join(import.meta.dirname, "..");
const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  let path = url.pathname === "/" ? "/prototypes/amoji-companion.html" : url.pathname;
  if (path === "/companion-full") path = "/prototypes/amoji-companion.html";
  const file = join(root, path.replace(/^\//, ""));
  try {
    if (statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("dir");
      return;
    }
    const data = readFileSync(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((r) => server.listen(8768, r));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(
  "http://127.0.0.1:8768/prototypes/amoji-companion.html?lang=en&automic=0",
  { waitUntil: "domcontentloaded", timeout: 30000 },
);
await page.waitForSelector("#send", { timeout: 15000 });
await page.evaluate(() => {
  const picker = document.getElementById("start-character-picker");
  if (picker) {
    picker.classList.add("hide");
    picker.style.display = "none";
  }
  document.body.classList.add("conversation-ui", "composer-always-visible");
});

const MAX_OFFSET = 2.2;
const selectors = [
  "#btn-toggle-chat",
  "#btn-open-scene",
  "#btn-open-setup",
  "#btn-speaker",
  "#btn-mic",
  "#send",
];

const report = await page.evaluate((sels) => {
  const rows = [];
  for (const sel of sels) {
    const btn = document.querySelector(sel);
    if (!btn) {
      rows.push({ sel, present: false });
      continue;
    }
    const br = btn.getBoundingClientRect();
    const glyph =
      btn.querySelector(".btn-icon:not([style*='display: none'])") ||
      btn.querySelector(".mic-btn__icon") ||
      btn.querySelector("svg") ||
      btn.firstElementChild;
    const gr = glyph?.getBoundingClientRect?.();
    const dx = gr ? (gr.left + gr.width / 2) - (br.left + br.width / 2) : null;
    const dy = gr ? (gr.top + gr.height / 2) - (br.top + br.height / 2) : null;
    const cs = getComputedStyle(btn);
    rows.push({
      sel,
      present: true,
      width: Math.round(br.width * 10) / 10,
      height: Math.round(br.height * 10) / 10,
      dx: dx == null ? null : Math.round(dx * 10) / 10,
      dy: dy == null ? null : Math.round(dy * 10) / 10,
      display: cs.display,
      alignItems: cs.alignItems,
      justifyContent: cs.justifyContent,
    });
  }
  return {
    build: window.__amojiBuild,
    rows,
  };
}, selectors);

const shotPath = join(outDir, "icon_center_composer.png");
await page.screenshot({ path: shotPath, fullPage: false });

const failures = report.rows.filter((row) => {
  if (!row.present) return true;
  if (row.dx == null || row.dy == null) return true;
  return Math.abs(row.dx) > MAX_OFFSET || Math.abs(row.dy) > MAX_OFFSET;
});

const ok =
  report.build === AMOJI_BUILD &&
  failures.length === 0 &&
  report.rows.length === selectors.length;

const summary = { ok, build: report.build, maxOffset: MAX_OFFSET, rows: report.rows, shotPath };
console.log(JSON.stringify(summary, null, 2));
writeFileSync(join(outDir, "icon_center_smoke.json"), JSON.stringify(summary, null, 2));

await browser.close();
server.close();
if (!ok) process.exit(1);
