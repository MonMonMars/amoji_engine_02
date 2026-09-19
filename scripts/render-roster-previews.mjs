#!/usr/bin/env node
/**
 * Capture roster card preview PNGs from the live 3D stage (skips picker).
 * Usage:
 *   node scripts/render-roster-previews.mjs [--url http://127.0.0.1:5178/...]
 *   node scripts/render-roster-previews.mjs --force --ids poly,jennifer
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { CHARACTER_IDS } from "../amoji-engine/engine/companion/companionCharacterCatalog.js";
import {
  BLACK_LOADER_BYTES,
  MIN_PREVIEW_BYTES,
  isBadPreviewCapture,
} from "../amoji-engine/engine/companion/companionPreviewAssets.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "prototypes/assets");

const MIN_GOOD_BYTES = MIN_PREVIEW_BYTES;

const DEFAULT_TARGETS = [
  "nova",
  "kizuna",
  "alicia",
  "ember",
  "sky",
  "yuki",
  "hina",
  "mio",
  "amoji",
  "rex",
  "shiro",
  "jennifer",
  "poly",
  "aesthe",
  "chad",
  "david",
  "hugo",
];

/** Copy existing art when models share a reference portrait. */
const COPY_FROM = {
  rex: "kai",
  amoji: "girl-ref",
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

function isBadCapture(filePath) {
  return isBadPreviewCapture(filePath);
}

function copyPreview(fromId, toId) {
  const fromPath =
    fromId === "girl-ref"
      ? join(outDir, "companion-girl-ref.png")
      : previewPath(fromId);
  const dest = previewPath(toId);
  copyFileSync(fromPath, dest);
  return dest;
}

async function hideUiForCapture(page) {
  await page.evaluate(() => {
    document.getElementById("amoji-boot-splash")?.remove();
    document.getElementById("start-character-picker")?.remove();
    document.querySelector(".avatar-stage-preview")?.setAttribute("hidden", "");
    document.querySelector(".stage")?.classList.remove("has-stage-preview");
    document.body.classList.remove(
      "companion-picker-open",
      "companion-start-pending",
      "settings-open",
      "scene-sheet-open",
    );
    for (const el of document.querySelectorAll("body > *")) {
      if (el.classList?.contains("stage")) continue;
      const tag = el.tagName;
      if (tag === "SCRIPT" || tag === "LINK" || tag === "STYLE") continue;
      /** @type {HTMLElement} */ (el).style.visibility = "hidden";
    }
  });
}

async function waitForStageReady(page, characterId) {
  await page.waitForFunction(() => window.__amojiStart?.ready === true, {
    timeout: 120000,
  });
  await page.waitForFunction(
    (id) =>
      window.localStorage?.getItem("amoji.companion.characterId") === id &&
      window.__amojiAvatarKind === "vrm3d" &&
      Boolean(window.__amojiAvatar?.vrm),
    characterId,
    { timeout: 120000 },
  );
  await page
    .waitForFunction(
      () => document.querySelector(".stage.avatar-ready") != null,
      undefined,
      { timeout: 90000 },
    )
    .catch(() => null);
  await page.waitForTimeout(8000);
  await hideUiForCapture(page);
  await page.waitForTimeout(400);
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
    waitUntil: "commit",
    timeout: 120000,
  });
  await waitForStageReady(page, characterId);
  const out = previewPath(characterId);
  const dataUrl = await page.evaluate(() => {
    const canvas = document.getElementById("avatar-canvas");
    if (!canvas) return "";
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return "";
    }
  });
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("canvas toDataURL failed");
  }
  const png = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  writeFileSync(out, png);
  if (isBadCapture(out)) {
    try {
      const { unlinkSync } = await import("node:fs");
      unlinkSync(out);
    } catch {
      /* ignore */
    }
    throw new Error(`capture too small or black loader (${statSync(out).size} bytes)`);
  }
  return out;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const force = process.argv.includes("--force");
  const idsArg = parseArg("--ids", "");
  const targets = idsArg
    ? idsArg.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_TARGETS.filter((id) => force || isBadCapture(previewPath(id)));

  const base = parseArg(
    "--url",
    "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/prototypes/amoji-companion.html",
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 720, height: 960 },
    deviceScaleFactor: 2,
  });

  const results = [];
  for (const id of targets) {
    const dest = previewPath(id);
    if (!force && existsSync(dest) && !isBadCapture(dest)) {
      results.push({ id, ok: true, path: dest, skipped: true });
      console.log(`SKIP ${id} (exists)`);
      continue;
    }
    const copyFrom = COPY_FROM[id];
    if (copyFrom) {
      try {
        copyPreview(copyFrom, id);
        results.push({ id, ok: true, path: dest, copied: copyFrom });
        console.log(`COPY ${id} ← ${copyFrom}`);
        continue;
      } catch (err) {
        console.log(`COPY fail ${id} — ${err.message}`);
      }
    }
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const path = await captureCharacter(page, id, base);
        results.push({ id, ok: true, path, attempt });
        console.log(`OK   ${id} → ${path} (${statSync(path).size} bytes)`);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        console.log(`FAIL ${id} attempt ${attempt} — ${err?.message || err}`);
        await page.waitForTimeout(1500);
      }
    }
    if (lastErr) {
      results.push({ id, ok: false, error: String(lastErr?.message || lastErr) });
    }
  }
  await browser.close();

  writeFileSync(
    join(outDir, "_preview-capture-report.json"),
    JSON.stringify({ build: AMOJI_BUILD, results }, null, 2),
  );

  const missing = CHARACTER_IDS.filter((id) => !existsSync(previewPath(id)));
  if (missing.length) {
    console.log(`Missing previews: ${missing.join(", ")}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
