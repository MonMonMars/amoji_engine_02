#!/usr/bin/env node
/**
 * Smoke test: unified 3D secretary conversation UI (voice-first, no legacy tabbar).
 * Requires lab-serve: cd amoji-engine && node scripts/lab-serve.mjs --port 5174
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const baseUrl =
  process.env.LITE_URL ||
  "http://127.0.0.1:5174/play?role=secretary&lang=en&pick=1&automic=0";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
await page
  .waitForFunction(() => window.__amojiModuleBooted === true, { timeout: 120000 })
  .catch(() => null);

const chrome = await page.evaluate(() => ({
  conversationUi: document.body.classList.contains("conversation-ui"),
  roleSecretary: document.body.classList.contains("companion-role-secretary"),
  legacyTabbar: !!document.querySelector(".tabbar"),
  hasActivityRail: !!document.getElementById("activity-rail"),
  hasComposer: !!document.getElementById("composer"),
  quickBar: document.getElementById("secretary-quick-bar")?.textContent?.trim(),
  build: window.__amojiBuild,
}));

if (!chrome.conversationUi || !chrome.roleSecretary) {
  console.error("FAIL: unified secretary chrome missing", chrome);
  process.exit(1);
}

await page.click("#btn-open-setup").catch(() => null);
await page.waitForSelector("#settings-role-grid", { timeout: 15000 }).catch(() => null);

await page.click("#settings-btn-secretary-today").catch(() => null);
await page
  .waitForSelector(".secretary-overlay.is-open", { timeout: 15000 })
  .catch(() => null);

const panelOpen = await page.evaluate(
  () => document.querySelector(".secretary-overlay.is-open") != null,
);

await page.screenshot({ path: join(outDir, "conversation-ui-secretary-today.png"), fullPage: true });

await browser.close();

console.log(
  JSON.stringify(
    {
      ok: panelOpen,
      build: chrome.build,
      chrome,
      panelOpen,
      pageErrors: errors,
    },
    null,
    2,
  ),
);

if (!panelOpen || chrome.build !== AMOJI_BUILD) {
  console.error("FAIL: unified secretary conversation UI smoke");
  process.exit(1);
}
