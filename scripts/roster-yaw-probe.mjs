#!/usr/bin/env node
/** Probe roster yaw variants for one character (debug facing). */
import { chromium } from "playwright";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

const id = process.argv[2] || "yuki";
const base =
  process.argv[3] || "http://127.0.0.1:5174/play?lang=en&pick=0&autostart=1&automic=0";

async function main() {
  const url = new URL(base);
  url.searchParams.set("build", AMOJI_BUILD);
  url.searchParams.set("character", id);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#avatar-canvas", { timeout: 90000 });
  await page.waitForFunction(
    () => document.querySelector(".stage.avatar-ready") != null,
    undefined,
    { timeout: 90000 },
  );
  await page.waitForTimeout(4000);
  const rows = await page.evaluate(() => window.__amojiAvatar?.debugScoreRosterYawGrid?.());
  console.log(JSON.stringify({ id, rows }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
