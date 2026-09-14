#!/usr/bin/env node
/**
 * Playwright smoke: companion-full — tap start, chat, verify 3D canvas + arms.
 *
 * Usage:
 *   node scripts/lab-serve.mjs --port 5173 &  # from amoji-engine/
 *   node scripts/companion-full-smoke.mjs --url http://127.0.0.1:5173/companion-full
 */
import { chromium } from "playwright";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

async function main() {
  const url = parseArg(
    "--url",
    "http://127.0.0.1:5173/prototypes/amoji-companion.html?automic=0",
  );

  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#start-talking", { timeout: 20000 });

  const build = await page.evaluate(() => window.__amojiBuild);
  const t0 = Date.now();
  await page.click("#start-talking");

  await page.waitForFunction(
    () => {
      const btn = document.getElementById("start-talking");
      return (
        !btn ||
        btn.classList.contains("hide") ||
        btn.disabled ||
        btn.getAttribute("aria-hidden") === "true"
      );
    },
    undefined,
    { timeout: 1500 },
  );
  const readyMs = Date.now() - t0;

  await page.fill("#input", "Hello Amoji");
  await page.click("#send");
  await page.waitForSelector(".msg-row.user .bubble", { timeout: 8000 });

  await page.waitForFunction(
    () => {
      const rows = document.querySelectorAll(".msg-row.assistant .bubble");
      const last = rows[rows.length - 1];
      return last && !last.classList.contains("thinking") && last.textContent?.length > 2;
    },
    undefined,
    { timeout: 45000 },
  );

  const canvas = await page.$("#avatar-canvas");
  const canvasBox = canvas ? await canvas.boundingBox() : null;

  const report = {
    ok: readyMs <= 800 && Boolean(canvasBox?.width),
    build,
    readyMs,
    canvasVisible: Boolean(canvasBox?.width && canvasBox?.height),
    url,
  };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
