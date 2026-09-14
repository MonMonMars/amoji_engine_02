#!/usr/bin/env node
/**
 * Verify loading overlay dismisses within 8s and chat works without 3D.
 */
import { chromium } from "playwright-core";

const url =
  process.argv.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=") ||
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/prototypes/amoji-companion.html?automic=0";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message)));

  await page.route("**/companion-girl.vrm", (route) =>
    route.abort("failed"),
  );
  await page.route("**/*.glb", (route) => route.abort("failed"));

  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  await page.waitForFunction(
    () => {
      const el = document.querySelector(".avatar-loading");
      if (!el) return true;
      return el.classList.contains("hide");
    },
    undefined,
    { timeout: 9000 },
  );
  const overlayDismissMs = Date.now() - t0;

  const ready = await page.evaluate(() => window.__amojiStart?.ready === true);

  await page.click("#start-talking");
  await page.waitForTimeout(500);
  await page.fill("#input", "test");
  await page.click("#send");
  await page.waitForSelector(".msg-row.user .bubble", { timeout: 8000 });

  const chatOk = await page.evaluate(
    () => document.querySelectorAll(".msg-row.user .bubble").length >= 1,
  );

  const result = {
    ok: overlayDismissMs <= 8000 && ready && chatOk && errors.length === 0,
    overlayDismissMs,
    ready,
    chatOk,
    errors,
    url,
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (!result.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
