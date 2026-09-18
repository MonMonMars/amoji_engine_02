#!/usr/bin/env node
/**
 * Capture roster card preview PNGs from the live 3D stage.
 * Usage: node scripts/render-roster-previews.mjs [--url http://127.0.0.1:5174/play?lang=en]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "prototypes/assets");

const TARGETS = [
  "poly",
  "aesthe",
  "shiro",
  "jennifer",
  "hina",
  "mio",
  "yuki",
];

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function captureCharacter(page, characterId) {
  const base = parseArg(
    "--url",
    "http://127.0.0.1:5174/prototypes/amoji-companion.html?lang=en&automic=0",
  );
  const url = new URL(base);
  url.searchParams.set("build", AMOJI_BUILD);
  url.searchParams.set("character", characterId);
  await page.goto(url.toString(), {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await beginStartPickerSession(page, {
    characterId,
    cardTimeout: 60000,
    dismissTimeout: 120000,
  });
  await page.waitForFunction(() => window.__amojiAvatar?.vrm, {
    timeout: 120000,
  });
  await page.waitForTimeout(2500);
  const canvas = page.locator("#avatar-canvas");
  await canvas.screenshot({ path: join(outDir, `_preview-capture-${characterId}.png`) });
  return join(outDir, `_preview-capture-${characterId}.png`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 720, height: 960 },
    deviceScaleFactor: 2,
  });
  const results = [];
  for (const id of TARGETS) {
    try {
      const path = await captureCharacter(page, id);
      results.push({ id, ok: true, path });
      console.log(`OK  ${id} → ${path}`);
    } catch (err) {
      results.push({ id, ok: false, error: String(err?.message || err) });
      console.log(`FAIL ${id} — ${err?.message || err}`);
    }
  }
  await browser.close();
  writeFileSync(
    join(outDir, "_preview-capture-report.json"),
    JSON.stringify({ build: AMOJI_BUILD, results }, null, 2),
  );
  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
