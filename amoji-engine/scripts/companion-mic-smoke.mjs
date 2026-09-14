#!/usr/bin/env node
/**
 * Smoke: mic module loads and supports browser STT on Chromium.
 */
import { chromium } from "playwright-core";

const url =
  process.argv.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=") ||
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/companion?v=lite-v3";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    permissions: ["microphone"],
  });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.click("#start-btn");
  await page.waitForSelector("#composer:not(.hidden)", { timeout: 8000 });

  const probe = await page.evaluate(async () => {
    const mod = await import("/amoji-engine/engine/companion/companionMicCapture.js");
    const mic = mod.createMicCapture({
      lang: "zh-HK",
      cloudSttUrl: "/api/stt",
      onText: () => {},
      onState: () => {},
      onError: () => {},
    });
    const primed = await mic.primePermission();
    const started = await mic.start();
    mic.stop();
    return {
      supportsMic: mic.supportsMic,
      usesCloudStt: mic.usesCloudStt,
      primed,
      started,
      hasSpeechRec: Boolean(
        window.SpeechRecognition || window.webkitSpeechRecognition,
      ),
    };
  });

  console.log(JSON.stringify({ ok: probe.supportsMic && probe.primed && probe.started, url, probe }, null, 2));
  await browser.close();
  if (!probe.supportsMic || !probe.primed || !probe.started) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
