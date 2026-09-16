#!/usr/bin/env node
/**
 * Smoke test: conversation-driven UI (no tab buttons needed).
 * Requires lab-serve: cd amoji-engine && node scripts/lab-serve.mjs --port 5173
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const baseUrl =
  process.env.LITE_URL ||
  "http://127.0.0.1:5174/prototypes/amoji-lite.html?lang=en";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

const chromeHidden = await page.evaluate(() => {
  const tabbar = document.querySelector(".tabbar");
  const modeRow = document.querySelector(".mode-row");
  const style = tabbar ? getComputedStyle(tabbar) : null;
  const modeStyle = modeRow ? getComputedStyle(modeRow) : null;
  return {
    conversationUi: document.body.classList.contains("conversation-ui"),
    tabbarHidden: style?.display === "none",
    modeRowHidden: modeStyle?.display === "none",
    build: window.__amojiBuild,
  };
});

if (!chromeHidden.conversationUi || !chromeHidden.tabbarHidden) {
  console.error("FAIL: manual chrome not hidden", chromeHidden);
  process.exit(1);
}

await page.waitForSelector("#composer:not(.hidden)", { timeout: 10000 });

await page.evaluate(() => {
  const input = document.getElementById("input");
  const form = document.getElementById("composer");
  if (input && form) {
    input.value = "show my tasks";
    form.requestSubmit();
  }
});

await page.waitForFunction(
  () => {
    const tasks = document.getElementById("panel-tasks");
    const today = document.getElementById("panel-today");
    const pill = document.getElementById("ui-context-pill");
    return (
      tasks &&
      !tasks.classList.contains("hidden") &&
      today?.classList.contains("hidden") &&
      pill &&
      !pill.hidden &&
      pill.textContent?.length > 0
    );
  },
  { timeout: 15000 },
);

const afterTasks = await page.evaluate(() => ({
  activeTab: document.querySelector(".tabbar button.active")?.dataset?.tab,
  tasksVisible: !document.getElementById("panel-tasks")?.classList.contains("hidden"),
  pill: document.getElementById("ui-context-pill")?.textContent?.trim(),
}));

await page.screenshot({ path: join(outDir, "conversation-ui-tasks.png"), fullPage: true });

await page.evaluate(() => {
  const input = document.getElementById("input");
  const form = document.getElementById("composer");
  if (input && form) {
    input.value = "let's chill";
    form.requestSubmit();
  }
});

await page.waitForFunction(
  () => document.querySelector('.mode-row button[data-mode="chill"]')?.classList.contains("active"),
  { timeout: 15000 },
);

const afterChill = await page.evaluate(() => ({
  chillActive: document
    .querySelector('.mode-row button[data-mode="chill"]')
    ?.classList.contains("active"),
  pill: document.getElementById("ui-context-pill")?.textContent?.trim(),
}));

await page.screenshot({ path: join(outDir, "conversation-ui-chill.png"), fullPage: true });

await browser.close();

console.log(
  JSON.stringify(
    {
      ok: true,
      build: chromeHidden.build,
      afterTasks,
      afterChill,
      pageErrors: errors,
    },
    null,
    2,
  ),
);

if (!afterTasks.tasksVisible || !afterChill.chillActive) {
  console.error("FAIL: UI did not switch via conversation");
  process.exit(1);
}
