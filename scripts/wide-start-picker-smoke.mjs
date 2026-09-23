#!/usr/bin/env node
/** Smoke: start picker full-screen on wide desktop — Menu must not cover roster. */
import { chromium } from "playwright";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { waitForPageFn } from "./playwrightPageUtil.mjs";

const base =
  process.env.BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:5174";
const url = `${base}/play?lang=en&pick=force&automic=0&build=${encodeURIComponent(AMOJI_BUILD)}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });

await waitForPageFn(
  page,
  () => {
    const picker = document.getElementById("start-character-picker");
    const card = document.querySelector(
      "#start-character-picker [data-character-id]:not([disabled])",
    );
    if (!picker || picker.classList.contains("hide")) return false;
    const sheet = picker.querySelector(".companion-picker-sheet");
    const rect = sheet?.getBoundingClientRect();
    return Boolean(card && rect && rect.width > 200 && rect.height > 200);
  },
  { timeout: 90_000 },
);

const layout = await page.evaluate(() => {
    const picker = document.getElementById("start-character-picker");
    const sheet = picker?.querySelector(".companion-picker-sheet");
    const settings = document.querySelector(".settings");
    const hero = document.querySelector(".picker-hero-portrait img");
    const pr = sheet?.getBoundingClientRect();
    const sr = settings?.getBoundingClientRect();
    const hr = hero?.getBoundingClientRect();
    const settingsVisible =
      settings &&
      !settings.hidden &&
      window.getComputedStyle(settings).display !== "none" &&
      window.getComputedStyle(settings).opacity !== "0" &&
      sr &&
      sr.width > 40 &&
      sr.height > 40;
    return {
      pickerOpen: Boolean(
        picker &&
          !picker.classList.contains("hide") &&
          (picker.classList.contains("is-open") || pr),
      ),
      ok: Boolean(
        picker &&
          pr &&
          pr.width >= window.innerWidth * 0.98 &&
          pr.height >= window.innerHeight * 0.95 &&
          !settingsVisible &&
          hr &&
          hr.height > 80,
      ),
      sheetW: pr?.width,
      vw: window.innerWidth,
      settingsVisible,
      heroH: hr?.height,
    };
});

await page.screenshot({
  path: "/opt/cursor/artifacts/wide-start-picker-1440.png",
  fullPage: false,
});

await browser.close();

if (!layout.ok) {
  console.error("FAIL wide start picker", layout);
  process.exit(1);
}
console.log("OK wide start picker", layout);
