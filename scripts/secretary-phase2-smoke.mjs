#!/usr/bin/env node
/**
 * End-to-end smoke for Secretary Phase 2 (production or local static).
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const BASE =
  process.env.SECRETARY_URL ||
  `https://temporary-rushing-oxygen-ok5jzhd.vercel.app/companion?lang=yue&build=${AMOJI_BUILD}`;

const checks = [];

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  const build = await page.evaluate(() => window.__amojiBuild);
  record("page loads", Boolean(build), build);

  const todayVisible = await page.isVisible("#panel-today:not(.hidden)");
  record("Today tab visible", todayVisible);

  await page.fill("#quick-task-input", "Smoke test task");
  await page.click("#quick-task-submit");
  await page.waitForTimeout(400);
  await page.click('[data-tab="tasks"]');
  await page.waitForSelector("#panel-tasks:not(.hidden)");
  const taskTitle = await page.textContent(".task-row-title");
  record("quick task appears on Tasks", taskTitle?.includes("Smoke test task"));

  const pin = page.locator('[data-testid="pin-priority-btn"]').first();
  await pin.waitFor({ state: "visible", timeout: 5000 });
  await pin.click();
  await page.click('[data-tab="today"]');
  await page.waitForSelector("#top3-card:not(.hidden)", { timeout: 5000 });
  const top3 = await page.textContent("#top3-list");
  record("pin shows Top 3 on Today", top3?.includes("Smoke test task"));

  for (const filter of ["全部", "工作", "生活", "個人"]) {
    await page.click('[data-tab="tasks"]');
    await page.click(`.filter-chip:has-text("${filter}")`);
    record(`filter ${filter}`, true);
  }

  await page.click('[data-tab="chat"]');
  await page.click("#start-btn");
  await page.waitForSelector("#composer:not(.hidden)");
  await page.fill("#input", "記住我唔食香菜");
  await page.click("#send-btn");
  await page.waitForSelector(".memory-card", { timeout: 5000 });
  record("memory confirm card", true);

  await page.fill("#input", "今晚提醒我打電話");
  await page.click("#send-btn");
  await page.waitForSelector(".task-card", { timeout: 5000 });
  record("task confirm card", true);

  await page.click('[data-tab="me"]');
  await page.fill("#memory-input", "QA memory fact");
  await page.click("#memory-save-btn");
  await page.waitForSelector(".memory-row", { timeout: 3000 });
  const memText = await page.textContent(".memory-row");
  record("memory saved on Me", memText?.includes("QA memory fact"));

  await page.click("#btn-voice");
  await page.waitForSelector(".companion-voice-picker:not([hidden])", {
    timeout: 3000,
  });
  const voiceCount = await page.locator(".companion-voice-option").count();
  record("voice picker opens", voiceCount >= 10, `${voiceCount} voices`);

  await page.screenshot({
    path: join(outDir, "secretary-phase2-smoke-final.png"),
    fullPage: true,
  });
} catch (err) {
  record("unexpected error", false, err.message);
  await page.screenshot({
    path: join(outDir, "secretary-phase2-smoke-error.png"),
    fullPage: true,
  });
} finally {
  await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  console.error("Failed:", failed);
  process.exitCode = 1;
}
