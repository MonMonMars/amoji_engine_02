#!/usr/bin/env node
import { chromium } from "playwright";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";

async function test(label, url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page
    .waitForFunction(() => window.__amojiModuleBooted === true, {
      timeout: 120000,
    })
    .catch(() => {});

  const hasBegin = await page.locator("#start-character-picker .picker-begin-btn").count();
  const hasOldPicker = await page.locator("#start-character-picker .companion-card").count();
  if (hasBegin) {
    await beginStartPickerSession(page, { dismissTimeout: 120000 });
  } else if (hasOldPicker) {
    await page.click("#start-character-picker .companion-card:not([disabled])");
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(2000);

  const snap = await page.evaluate(() => ({
    build: window.__amojiBuild,
    sessionStarted: window.__amojiStart?.sessionStarted,
    avatarKind: window.__amojiAvatarKind,
    chatShell: (() => {
      const el = document.querySelector(".chat-shell");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { display: cs.display, opacity: cs.opacity, visibility: cs.visibility };
    })(),
    composer: (() => {
      const el = document.getElementById("composer");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, hidden: el.classList.contains("hidden") };
    })(),
    transcript: (() => {
      const el = document.getElementById("transcript");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        w: r.width,
        h: r.height,
        bubbles: el.querySelectorAll(".bubble").length,
      };
    })(),
    canvas: (() => {
      const c = document.getElementById("avatar-canvas");
      if (!c) return null;
      const cs = getComputedStyle(c);
      return { w: c.width, h: c.height, z: cs.zIndex, opacity: cs.opacity };
    })(),
    bodyClasses: document.body.className,
    visibleText: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 120),
  }));

  await page.screenshot({
    path: `/opt/cursor/artifacts/after-start-${label}.png`,
    fullPage: true,
  });
  await browser.close();
  console.log(JSON.stringify({ label, snap, errors: errors.slice(0, 5) }, null, 2));
}

await test("local-v240", "http://127.0.0.1:5174/play?lang=en&pick=1&automic=0");
await test(
  "prod-v212",
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=en&pick=1&automic=0",
);
