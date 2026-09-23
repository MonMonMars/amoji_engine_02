#!/usr/bin/env node
/**
 * Picker → select Kizuna (#2) → Begin → assert vrm3d loads (no hotSwap race).
 */
import { chromium } from "playwright";
import { startLocalStaticServer } from "./local-static-server.mjs";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

const host = await startLocalStaticServer(0);
const base = `${host.baseUrl}/play?lang=en&pick=1&automic=0&build=${encodeURIComponent(AMOJI_BUILD)}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

try {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.click('#start-character-picker [data-character-id="kizuna"]');
  await beginStartPickerSession(page, {
    characterId: "kizuna",
    dismissTimeout: 180000,
  });
  await page.waitForFunction(
    () =>
      window.__amojiAvatarKind === "vrm3d" &&
      window.__amojiLoadedCharacterId === "kizuna" &&
      /companion-kizuna\.vrm/i.test(String(window.__amojiLoadedModelUrl || "")),
    undefined,
    { timeout: 180000 },
  );
  console.log("PASS  kizuna picker begin → vrm3d");
  if (errors.length) {
    console.error("WARN  page errors:", errors.slice(0, 3));
    process.exit(1);
  }
} catch (err) {
  console.error("FAIL ", err?.message || err);
  process.exit(1);
} finally {
  await browser.close();
  await host.close();
}
