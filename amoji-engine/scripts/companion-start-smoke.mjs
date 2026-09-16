#!/usr/bin/env node
/**
 * Playwright smoke: companion must unlock chat within ~700ms of module boot
 * (instant chat — no character picker required).
 *
 * Usage (from amoji-engine/):
 *   node scripts/lab-serve.mjs --port 5173 &
 *   node scripts/companion-start-smoke.mjs --url http://127.0.0.1:5173/prototypes/amoji-companion.html
 */
import { chromium } from "playwright-core";

const DEFAULT_URL =
  "http://127.0.0.1:5173/prototypes/amoji-companion.html?automic=0";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

async function main() {
  const url = parseArg("--url", DEFAULT_URL);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.addInitScript(() => {
    const origSpeak = window.SpeechSynthesisUtterance;
    if (!origSpeak) return;
    window.__slowTtsInstalled = true;
    const RealSynth = window.speechSynthesis;
    if (RealSynth) {
      RealSynth.speak = function slowSpeak(utter) {
        utter.onstart?.(new Event("start"));
        setTimeout(() => {
          utter.onend?.(new Event("end"));
        }, 8000);
      };
      RealSynth.cancel = () => {};
    }
  });

  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  await page.waitForFunction(
    () => window.__amojiStart?.sessionStarted === true,
    undefined,
    { timeout: 8000 },
  );
  const readyMs = Date.now() - t0;

  await page.evaluate(() => {
    document.body.classList.add("mic-blocked");
  });
  await page.fill("#input", "你好", { force: true });
  await page.click("#send", { force: true });
  await page.waitForSelector(".msg-row.user .bubble", { timeout: 5000 });

  const pickerVisible = await page.evaluate(() => {
    const picker = document.getElementById("start-character-picker");
    return Boolean(
      picker &&
        !picker.classList.contains("hide") &&
        picker.getAttribute("aria-hidden") !== "true",
    );
  });

  console.log(
    JSON.stringify(
      {
        ok: readyMs <= 5000 && !pickerVisible,
        readyMs,
        pickerVisible,
        url,
      },
      null,
      2,
    ),
  );

  await browser.close();
  if (readyMs > 5000 || pickerVisible) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
