#!/usr/bin/env node
/**
 * Playwright smoke: companion tap-to-start must unlock chat within ~500ms
 * even when greeting TTS is artificially slow.
 *
 * Usage (from amoji-engine/):
 *   node scripts/lab-serve.mjs --port 5173 &
 *   node scripts/companion-start-smoke.mjs --url http://127.0.0.1:5173/prototypes/amoji-companion.html
 */
import { spawn } from "node:child_process";
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

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(
    "#start-character-picker .companion-card",
    { timeout: 15000 },
  );
  await page.waitForFunction(
    () => {
      const card = document.querySelector(
        "#start-character-picker .companion-card:not([disabled])",
      );
      return Boolean(card);
    },
    undefined,
    { timeout: 15000 },
  );

  const t0 = Date.now();
  await page.click("#start-character-picker .companion-card:not([disabled])");

  await page.waitForFunction(
    () => window.__amojiStart?.sessionStarted === true,
    undefined,
    { timeout: 3000 },
  );
  const readyMs = Date.now() - t0;

  await page.evaluate(() => {
    document.body.classList.add("mic-blocked");
  });
  await page.fill("#input", "你好", { force: true });
  await page.click("#send", { force: true });
  await page.waitForSelector(".msg-row.user .bubble", { timeout: 5000 });

  const stillStarting = await page.evaluate(() => {
    const picker = document.getElementById("start-character-picker");
    return Boolean(picker?.classList.contains("is-starting"));
  });

  console.log(
    JSON.stringify(
      {
        ok: readyMs <= 700 && !stillStarting,
        readyMs,
        stillStarting,
        url,
      },
      null,
      2,
    ),
  );

  await browser.close();
  if (readyMs > 700 || stillStarting) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
