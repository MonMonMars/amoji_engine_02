#!/usr/bin/env node
/**
 * Smoke test: legacy /companion and amoji-lite.html redirect into unified 3D secretary.
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { readFileSync, statSync } from "fs";
import { extname } from "path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { buildPlayRedirectLocation } from "../amoji-engine/engine/companion/companionFreshBoot.js";
import { waitForPageFn } from "./playwrightPageUtil.mjs";

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const LIVE =
  process.env.LITE_URL ||
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?role=secretary&lang=en&pick=1&automic=0";
const USE_LOCAL = process.env.LOCAL_LITE === "1";

function mime(p) {
  const m = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
  return m[extname(p)] || "application/octet-stream";
}

function startStaticServer(port = 8767) {
  const root = new URL("..", import.meta.url).pathname;
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      let p = req.url?.split("?")[0] || "/";
      const search = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      if (p === "/play" || p === "/play/") {
        const loc = buildPlayRedirectLocation(search, { build: AMOJI_BUILD });
        res.writeHead(303, { Location: loc, "Cache-Control": "no-store" });
        res.end();
        return;
      }
      if (p === "/") p = "/prototypes/amoji-lite.html";
      if (p === "/companion") p = "/prototypes/amoji-lite.html";
      const file = join(root, p.replace(/^\//, ""));
      try {
        statSync(file);
        res.writeHead(200, { "Content-Type": mime(file), "Cache-Control": "no-store" });
        res.end(readFileSync(file));
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    srv.listen(port, "127.0.0.1", () =>
      resolve({ srv, url: `http://127.0.0.1:${port}/companion?lang=en` }),
    );
  });
}

const local = USE_LOCAL ? await startStaticServer() : null;
const baseUrl = USE_LOCAL ? local.url : LIVE;

const browser = await chromium.launch({ headless: true });
const cases = [
  ["desktop", {}],
  ["iphone14", devices["iPhone 14"]],
];

const results = [];

for (const [label, ctx] of cases) {
  const page = await browser.newPage(ctx);
  const chatUrls = [];
  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("/api/chat")) chatUrls.push(u);
  });

  const t0 = Date.now();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await waitForPageFn(
    page,
    () =>
      window.__amojiModuleBooted === true ||
      Boolean(document.getElementById("start-character-picker")),
    { timeout: 120000 },
  ).catch(() => null);

  const pickerOpen = await page.evaluate(() => {
    const picker = document.getElementById("start-character-picker");
    return Boolean(
      picker &&
        !picker.classList.contains("hide") &&
        picker.getAttribute("aria-hidden") !== "true",
    );
  });
  if (pickerOpen) {
    await page
      .click(
        '#start-character-picker [data-character-id="nova"], #start-character-picker .picker-begin-btn, [data-character-id="kate"], button[data-begin-chat]',
      )
      .catch(() => null);
    await page
      .click("#start-character-picker .picker-begin-btn:not([disabled])")
      .catch(() => null);
    await page.waitForTimeout(1500);
  }

  const paintMs = Date.now() - t0;

  const state = await page.evaluate(() => ({
    build: window.__amojiBuild,
    conversationUi: document.body.classList.contains("conversation-ui"),
    roleSecretary: document.body.classList.contains("companion-role-secretary"),
    hasCanvas: !!document.getElementById("avatar-canvas"),
    hasComposer: !!document.getElementById("composer"),
    quickBar: !!document.getElementById("secretary-quick-bar"),
    secretaryMenuSection: !!document.getElementById("settings-secretary-section"),
  }));

  const shot = join(outDir, `unified-secretary-${label}.png`);
  await page.screenshot({ path: shot, fullPage: true });

  results.push({ label, url: baseUrl, paintMs, state, chatRequests: chatUrls.length, shot });
  await page.close();
}

await browser.close();
local?.srv?.close();

console.log(JSON.stringify(results, null, 2));

const ok = results.every(
  (r) =>
    r.state.build === AMOJI_BUILD &&
    r.state.conversationUi &&
    r.state.roleSecretary &&
    r.state.hasCanvas &&
    r.state.hasComposer,
);

if (!ok) process.exitCode = 1;
