#!/usr/bin/env node
/**
 * Playwright diagnostic for amoji-companion loading state.
 */
import { chromium, devices } from "playwright";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";

const URL =
  process.env.COMPANION_URL ||
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/prototypes/amoji-companion.html";

async function diagnose(page, label) {
  const consoleLogs = [];
  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") consoleErrors.push(text);
    else consoleLogs.push(`[${msg.type()}] ${text}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`PAGE: ${err.message}`));
  page.on("requestfailed", (req) => {
    failedRequests.push(`${req.failure()?.errorText || "failed"} ${req.url()}`);
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  const snap = async (when) => {
    return page.evaluate((tag) => {
      const overlayEls = [...document.querySelectorAll(".avatar-loading")];
      const start = document.getElementById("start-character-picker");
      const startRect = start?.getBoundingClientRect();
      const overlayRects = overlayEls.map((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          id: el.id,
          hide: el.classList.contains("hide"),
          opacity: style.opacity,
          visibility: style.visibility,
          pointerEvents: style.pointerEvents,
          zIndex: style.zIndex,
          w: r.width,
          h: r.height,
        };
      });
      const startStyle = start ? getComputedStyle(start) : null;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight * 0.72;
      const topEl = document.elementFromPoint(centerX, centerY);
      return {
        tag,
        build: window.__amojiBuild,
        ready: window.__amojiStart?.ready,
        sessionStarted: window.__amojiStart?.sessionStarted,
        overlayCount: overlayEls.length,
        overlays: overlayRects,
        start: start
          ? {
              text: start.textContent?.trim(),
              hide: start.classList.contains("hide"),
              disabled: start.disabled,
              opacity: startStyle?.opacity,
              visibility: startStyle?.visibility,
              pointerEvents: startStyle?.pointerEvents,
              zIndex: startStyle?.zIndex,
              rect: { w: startRect?.width, h: startRect?.height },
            }
          : null,
        elementAtStartPoint: topEl
          ? { tag: topEl.tagName, id: topEl.id, className: topEl.className }
          : null,
      };
    }, when);
  };

  const immediate = await snap("immediate");
  await page.waitForTimeout(3000);
  const at3s = await snap("3s");
  await page.waitForTimeout(6000);
  const at9s = await snap("9s");

  let clickResult = null;
  try {
    const start = page.locator("#start-character-picker .companion-card");
    if (await start.isVisible({ timeout: 500 })) {
      await beginStartPickerSession(page, { dismissTimeout: 60000 });
      clickResult = "begin-chat";
    } else {
      clickResult = "not visible";
    }
  } catch (e) {
    clickResult = `click failed: ${e.message}`;
  }

  await page.waitForTimeout(1500);
  const afterClick = await snap("after-click");

  return {
    label,
    immediate,
    at3s,
    at9s,
    clickResult,
    afterClick,
    consoleErrors: consoleErrors.slice(0, 20),
    failedRequests: failedRequests.slice(0, 20),
  };
}

const browser = await chromium.launch({ headless: true });

for (const [label, ctx] of [
  ["desktop", {}],
  ["iphone", devices["iPhone 13"]],
]) {
  const context = await browser.newContext(ctx);
  const page = await context.newPage();
  const result = await diagnose(page, label);
  console.log(JSON.stringify(result, null, 2));
  await context.close();
}

await browser.close();
