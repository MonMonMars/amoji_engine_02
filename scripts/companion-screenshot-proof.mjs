#!/usr/bin/env node
/** Playwright screenshot proof — desktop + iPhone 14, normal + ?lite=1 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const base =
  process.env.COMPANION_URL ||
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/prototypes/amoji-companion.html";
const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const cases = [
  ["desktop", {}, ""],
  ["iphone14", devices["iPhone 14"], ""],
  ["desktop-lite", {}, "?lite=1"],
  ["iphone14-lite", devices["iPhone 14"], "?lite=1"],
];

const results = [];
for (const [label, ctx, qs] of cases) {
  const page = await browser.newPage(ctx);
  const failed = [];
  page.on("requestfailed", (req) => failed.push(req.url()));
  const url = base + (qs || "");
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);
  const shot = join(outDir, `companion-v5-${label}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  const snap = await page.evaluate(() => ({
    build: window.__amojiBuild,
    brand: document.querySelector(".brand")?.textContent?.trim(),
    startText: document.getElementById("start-talking")?.textContent?.trim(),
    startVisible: (() => {
      const el = document.getElementById("start-talking");
      if (!el) return false;
      const s = getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
    })(),
    composerVisible: !!document.querySelector(".composer"),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bootFallback: document.getElementById("amoji-boot-fallback")?.classList.contains("show"),
  }));
  results.push({ label, url, shot, snap, failed: failed.slice(0, 5) });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
const ok = results.every(
  (r) =>
    r.snap.build === "2026-09-14-v5" &&
    r.snap.brand?.includes("Amoji") &&
    r.snap.startVisible &&
    r.snap.composerVisible &&
    !r.snap.bootFallback,
);
if (!ok) process.exitCode = 1;
