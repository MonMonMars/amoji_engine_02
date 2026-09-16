#!/usr/bin/env node
/**
 * Playwright smoke test for amoji-lite.html (conversation-ui / voice-first).
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { readFileSync, statSync } from "fs";
import { extname } from "path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const LIVE =
  process.env.LITE_URL ||
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/companion";
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
    srv.listen(port, "127.0.0.1", () => resolve({ srv, url: `http://127.0.0.1:${port}/companion?lang=en` }));
  });
}

const baseUrl = USE_LOCAL
  ? (await startStaticServer()).url
  : LIVE;

const browser = await chromium.launch({ headless: true });
const cases = [
  ["desktop", {}],
  ["iphone14", devices["iPhone 14"]],
];

const results = [];

for (const [label, ctx] of cases) {
  const page = await browser.newPage(ctx);
  const ttsUrls = [];
  const chatUrls = [];
  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("/api/tts")) ttsUrls.push(u);
    if (u.includes("/api/chat")) chatUrls.push(u);
  });

  const t0 = Date.now();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  const paintMs = Date.now() - t0;

  const instant = await page.evaluate(() => ({
    build: window.__amojiBuild,
    title: document.querySelector("h1")?.textContent?.trim(),
    conversationUi: document.body.classList.contains("conversation-ui"),
    composerVisible: !document.getElementById("composer")?.classList.contains("hidden"),
    hasListenHint: !!document.getElementById("listen-hint"),
    tabbarHidden:
      getComputedStyle(document.querySelector(".tabbar")).display === "none",
  }));

  const shotInstant = join(outDir, `lite-v1-${label}-instant.png`);
  await page.screenshot({ path: shotInstant, fullPage: true });

  await page.waitForSelector("#composer:not(.hidden)", { timeout: 10000 });

  await page.evaluate(() => {
    const input = document.getElementById("input");
    const form = document.getElementById("composer");
    if (input && form) {
      input.value = "hello";
      form.requestSubmit();
    }
  });

  await page.waitForFunction(
    () => document.querySelectorAll(".bubble.bot:not(.thinking)").length >= 2,
    { timeout: 90000 },
  );

  await page.waitForTimeout(2000);

  const final = await page.evaluate(() => ({
    build: window.__amojiBuild,
    chatCalls: window.__amojiLite?.chatCalls ?? 0,
    ttsCalls: window.__amojiLite?.ttsCalls ?? 0,
    bubbles: [...document.querySelectorAll(".bubble")].map((b) => b.textContent?.trim()),
    error: document.getElementById("error-box")?.classList.contains("show")
      ? document.getElementById("error-box")?.textContent
      : null,
  }));

  const shotFinal = join(outDir, `lite-v1-${label}-reply.png`);
  await page.screenshot({ path: shotFinal, fullPage: true });

  results.push({
    label,
    url: baseUrl,
    paintMs,
    instant,
    final,
    ttsRequests: ttsUrls.length,
    chatRequests: chatUrls.length,
    shots: [shotInstant, shotFinal],
  });
  await page.close();
}

await browser.close();

console.log(JSON.stringify(results, null, 2));

const ok = results.every(
  (r) =>
    r.paintMs < 2000 &&
    r.instant.build === AMOJI_BUILD &&
    r.instant.title?.includes("Amoji") &&
    r.instant.conversationUi &&
    r.instant.composerVisible &&
    r.instant.hasListenHint &&
    r.instant.tabbarHidden &&
    r.final.chatCalls >= 1 &&
    (r.final.ttsCalls >= 1 || r.ttsRequests >= 1) &&
    r.final.bubbles.some((b) => b && b !== "…" && b.length > 2) &&
    !r.final.error,
);

if (!ok) process.exitCode = 1;
