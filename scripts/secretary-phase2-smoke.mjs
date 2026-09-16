#!/usr/bin/env node
/**
 * End-to-end smoke for Secretary conversation-ui (production or local static).
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

async function submitChat(page, text) {
  await waitChatReady(page);
  await page.evaluate((msg) => {
    const input = document.getElementById("input");
    const form = document.getElementById("composer");
    if (input && form) {
      input.value = msg;
      form.requestSubmit();
    }
  }, text);
}

async function waitChatReady(page) {
  await page.waitForFunction(
    () => !document.querySelector(".bubble.thinking"),
    { timeout: 90000 },
  );
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  const boot = await page.evaluate(() => ({
    build: window.__amojiBuild,
    conversationUi: document.body.classList.contains("conversation-ui"),
    composerVisible: !document.getElementById("composer")?.classList.contains("hidden"),
    tabbarHidden:
      getComputedStyle(document.querySelector(".tabbar")).display === "none",
  }));
  record("page loads", Boolean(boot.build), boot.build);
  record("conversation-ui mode", boot.conversationUi);
  record("composer visible on chat tab", boot.composerVisible);
  record("manual tabbar hidden", boot.tabbarHidden);

  await page.evaluate(() => {
    const speaker = document.getElementById("speaker-btn");
    if (speaker && !speaker.classList.contains("off")) {
      speaker.click();
    }
  });

  await submitChat(page, "今晚提醒我打電話");
  await page.waitForSelector(".bubble.receipt", { timeout: 60000 });
  const taskReceipt = await page.textContent(".bubble.receipt");
  record("task auto-saved from chat", taskReceipt?.includes("任務") || taskReceipt?.includes("Task"));

  await submitChat(page, "睇下任務");
  await page.waitForFunction(
    () => !document.getElementById("panel-tasks")?.classList.contains("hidden"),
    { timeout: 15000 },
  );
  const taskTitle = await page.textContent(".task-row-title");
  record("tasks panel via conversation", taskTitle?.includes("電話"));

  await submitChat(page, "記住我唔食香菜");
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".bubble.receipt")].some((el) =>
        el.textContent?.includes("記憶"),
      ),
    { timeout: 60000 },
  );
  record("memory auto-saved from chat", true);

  await submitChat(page, "閒聊模式");
  await page.waitForFunction(
    () =>
      document.querySelector('.mode-row button[data-mode="chill"]')?.classList.contains("active"),
    { timeout: 15000 },
  );
  record("chill mode via conversation", true);

  const listenHint = await page.textContent("#listen-hint");
  record("listen hint visible", Boolean(listenHint?.length));

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
