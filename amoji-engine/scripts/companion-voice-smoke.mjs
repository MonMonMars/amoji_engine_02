#!/usr/bin/env node
/**
 * Playwright smoke: companion voice — tap start, verify TTS fetch + audio play.
 *
 * Usage:
 *   node scripts/companion-voice-smoke.mjs --url https://temporary-rushing-oxygen-ok5jzhd.vercel.app/prototypes/amoji-companion.html
 */
import { chromium } from "playwright-core";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

async function main() {
  const url =
    parseArg(
      "--url",
      "http://127.0.0.1:5173/prototypes/amoji-companion.html?automic=0",
    );

  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();

  const logs = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#start-character-picker .companion-card", { timeout: 20000 });

  await page.evaluate(() => {
    window.__voiceProbe = {
      ttsCalls: 0,
      audioPlays: 0,
      audioErrors: [],
      speakResults: [],
    };
    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const u = String(args[0] || "");
      if (u.includes("/api/tts")) window.__voiceProbe.ttsCalls += 1;
      return origFetch(...args);
    };
    const OrigAudio = window.Audio;
    window.Audio = function (...a) {
      const el = new OrigAudio(...a);
      const origPlay = el.play.bind(el);
      el.play = async () => {
        window.__voiceProbe.audioPlays += 1;
        try {
          return await origPlay();
        } catch (err) {
          window.__voiceProbe.audioErrors.push(err?.message || String(err));
          throw err;
        }
      };
      return el;
    };
  });

  await page.click("#start-character-picker .companion-card");

  await page.waitForFunction(
    () => {
      const btn = document.getElementById("start-character-picker");
      return (
        !btn ||
        btn.classList.contains("hide") ||
        btn.disabled ||
        btn.getAttribute("aria-hidden") === "true"
      );
    },
    undefined,
    { timeout: 5000 },
  );

  await page.waitForTimeout(8000);

  const probe = await page.evaluate(() => window.__voiceProbe || {});
  const systemBubbles = await page.evaluate(() =>
    [...document.querySelectorAll(".bubble.system")].map((el) => el.textContent),
  );
  const voicePill = await page.textContent("#voice-pill");

  const result = {
    ok:
      probe.ttsCalls >= 1 &&
      probe.audioPlays >= 1 &&
      probe.audioErrors.length === 0,
    url,
    probe,
    voicePill,
    systemBubbles: systemBubbles.filter((t) => /voice|tts|mic/i.test(t)),
    logs: logs.filter((l) => /voice|tts|audio|speak/i.test(l)).slice(0, 20),
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
