#!/usr/bin/env node
/**
 * Capture roster card preview PNGs from the live 3D stage (skips picker).
 * Usage: node scripts/render-roster-previews.mjs [--url http://127.0.0.1:5174/...] [--ids poly,jennifer]
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { CHARACTER_IDS } from "../amoji-engine/engine/companion/companionCharacterCatalog.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "prototypes/assets");

const DEFAULT_TARGETS = [
  "amoji",
  "poly",
  "aesthe",
  "shiro",
  "jennifer",
  "yuki",
  "hina",
  "mio",
  "chad",
  "david",
  "hugo",
  "rex",
  "vroidm",
  "vroidf",
  "robert",
  "mikel",
];

/** Copy existing art when the model share a reference portrait. */
const COPY_FROM = {
  rex: "kai",
};

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

function previewPath(id) {
  return join(outDir, `companion-char-${id}.png`);
}

async function captureCharacter(page, characterId, baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set("build", AMOJI_BUILD);
  url.searchParams.set("character", characterId);
  url.searchParams.set("autostart", "1");
  url.searchParams.set("pick", "0");
  url.searchParams.set("automic", "0");
  url.searchParams.set("lang", "en");

  await page.goto(url.toString(), {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForFunction(
    () =>
      window.__amojiAvatarKind === "vrm3d" &&
      window.__amojiAvatar?.vrm &&
      window.__amojiStart?.sessionStarted !== false,
    { timeout: 120000 },
  );
  await page.waitForTimeout(3200);
  const out = previewPath(characterId);
  await page.locator("#avatar-canvas").screenshot({ path: out });
  return out;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const idsArg = parseArg("--ids", "");
  const targets = idsArg
    ? idsArg.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_TARGETS.filter((id) => !existsSync(previewPath(id)));

  const base = parseArg(
    "--url",
    "http://127.0.0.1:5174/prototypes/amoji-companion.html",
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 720, height: 960 },
    deviceScaleFactor: 2,
  });

  const results = [];
  for (const id of targets) {
    const dest = previewPath(id);
    if (existsSync(dest)) {
      results.push({ id, ok: true, path: dest, skipped: true });
      console.log(`SKIP ${id} (exists)`);
      continue;
    }
    const copyFrom = COPY_FROM[id];
    if (copyFrom && existsSync(previewPath(copyFrom))) {
      copyFileSync(previewPath(copyFrom), dest);
      results.push({ id, ok: true, path: dest, copied: copyFrom });
      console.log(`COPY ${id} ← ${copyFrom}`);
      continue;
    }
    try {
      const path = await captureCharacter(page, id, base);
      results.push({ id, ok: true, path });
      console.log(`OK   ${id} → ${path}`);
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
