#!/usr/bin/env node
/**
 * Capture roster preview PNGs from the live 3D stage (skips picker).
 * - companion-char-<id>.png — full-body (roster strip)
 * - companion-char-<id>-hero.png — bust close-up (picker hero top)
 *
 * Usage:
 *   node scripts/render-roster-previews.mjs [--url http://127.0.0.1:5174/play?lang=en]
 *   node scripts/render-roster-previews.mjs --force --ids nova,orion
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
  isBadHeroPreviewCapture,
  isBadPreviewCapture,
  isSuspectPreviewCapture,
} from "../amoji-engine/engine/companion/companionPreviewAssets.mjs";
import { waitForPageFn } from "./playwrightPageUtil.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "prototypes/assets");

const PORTRAIT_ASPECT = 3 / 4;

const DEFAULT_TARGETS = [
  "nova",
  "kizuna",
  "alicia",
  "ember",
  "mei",
  "atlas",
  "sky",
  "yuki",
  "hina",
  "mio",
  "amoji",
  "orion",
  "kael",
  "mira",
  "sumire",
  "rin",
  "dex",
  "niko",
  "yara",
  "thorn",
  "vesper",
  "ash",
  "cleo",
  "shino",
  "luna",
  "juno",
  "elio",
  "hana",
  "zane",
  "priya",
  "cyrus",
];

/** Legacy alias slots only — never copy for primary roster picker cards. */
const COPY_FROM = {
  rex: "kai",
  aria: "mei",
  noah: "atlas",
  rika: "celeste",
  vega: "yume",
};

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

function cardPreviewPath(id) {
  return join(outDir, `companion-char-${id}.png`);
}

function heroPreviewPath(id) {
  return join(outDir, `companion-char-${id}-hero.png`);
}

function isBadCardCapture(filePath) {
  return isBadPreviewCapture(filePath);
}

function isBadHeroCapture(filePath) {
  return isBadHeroPreviewCapture(filePath);
}

function needsCapture(id, force) {
  if (force) return true;
  return (
    isBadCardCapture(cardPreviewPath(id)) || isBadHeroCapture(heroPreviewPath(id))
  );
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {"body" | "hero"} kind
 */
function portraitClip(box, kind) {
  if (kind === "hero") {
    let clipH = box.height * 0.4;
    let clipW = clipH * PORTRAIT_ASPECT;
    if (clipW > box.width * 0.86) {
      clipW = box.width * 0.86;
      clipH = clipW / PORTRAIT_ASPECT;
    }
    return {
      x: box.x + (box.width - clipW) / 2,
      y: box.y + box.height * 0.05,
      width: clipW,
      height: clipH,
    };
  }
  let clipW = box.width * 0.9;
  let clipH = clipW / PORTRAIT_ASPECT;
  if (clipH > box.height * 0.92) {
    clipH = box.height * 0.92;
    clipW = clipH * PORTRAIT_ASPECT;
  }
  return {
    x: box.x + (box.width - clipW) / 2,
    y: box.y + (box.height - clipH) / 2,
    width: clipW,
    height: clipH,
  };
}

function copyPreview(fromId, toId) {
  copyFileSync(cardPreviewPath(fromId), cardPreviewPath(toId));
  if (existsSync(heroPreviewPath(fromId))) {
    copyFileSync(heroPreviewPath(fromId), heroPreviewPath(toId));
  }
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
  await waitForPageFn(page, () => window.__amojiStart?.ready === true, {
    timeout: 120000,
  });
  await page.waitForFunction(
    () =>
      window.__amojiAvatarKind === "vrm3d" && Boolean(window.__amojiAvatar?.vrm),
    undefined,
    { timeout: 120000 },
  );
  await page
    .waitForFunction(
      () => document.querySelector(".stage.avatar-ready") != null,
      undefined,
      { timeout: 90000 },
    )
    .catch(() => null);

  for (let attempt = 0; attempt < 18; attempt += 1) {
    await page.evaluate(() => {
      window.__amojiAvatar?.warmPresentFrame?.();
      window.__amojiAvatar?.resetCameraView?.();
    });
    await page.waitForTimeout(1500);
    const ready = await page.evaluate(() => {
      const facing = window.__amojiAvatar?.getPortraitFacing?.();
      const limbs = window.__amojiAvatar?.auditPlantedLimbs?.({
        maxDeltaRad: 0.018,
      });
      return (
        facing?.facingCamera === true &&
        (Number(facing.visibleScore) || 0) > 0.1 &&
        limbs?.ok !== false
      );
    });
    if (ready) break;
  }

  await hideUiForCapture(page);
  await page.waitForTimeout(400);
}

/**
 * @param {import("playwright").Page} page
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {"body" | "hero"} kind
 * @param {string} out
 */
async function screenshotPortrait(page, box, kind, out) {
  const clip = portraitClip(box, kind);
  await page.screenshot({
    path: out,
    type: "png",
    animations: "disabled",
    clip,
  });
  const bad =
    kind === "hero" ? isBadHeroCapture(out) : isBadCardCapture(out);
  if (bad) {
    const badBytes = statSync(out).size;
    throw new Error(`${kind} capture too small or black (${badBytes} bytes)`);
  }
  if (kind === "body" && isSuspectPreviewCapture(out)) {
    const suspectBytes = statSync(out).size;
    throw new Error(`${kind} capture suspect (sparse canvas, ${suspectBytes} bytes)`);
  }
}

async function captureCharacter(page, characterId, baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set("build", AMOJI_BUILD);
  url.searchParams.set("pick", "0");
  url.searchParams.set("autostart", "1");
  url.searchParams.set("character", characterId);
  url.searchParams.set("automic", "0");
  if (!url.searchParams.get("lang")) url.searchParams.set("lang", "en");

  await page.goto(url.toString(), {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await waitForStageReady(page, characterId);
  const canvas = page.locator("#avatar-canvas");
  await canvas.waitFor({ state: "visible", timeout: 15000 });
  const box = await canvas.boundingBox();
  if (!box?.width || !box?.height) {
    throw new Error("avatar canvas has no layout box");
  }
  const cardOut = cardPreviewPath(characterId);
  const heroOut = heroPreviewPath(characterId);
  await screenshotPortrait(page, box, "body", cardOut);
  await screenshotPortrait(page, box, "hero", heroOut);
  return { cardOut, heroOut };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const force = process.argv.includes("--force");
  const idsArg = parseArg("--ids", "");
  const targets = idsArg
    ? idsArg.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_TARGETS.filter((id) => needsCapture(id, force));

  const base = parseArg(
    "--url",
    "http://127.0.0.1:5174/play?lang=en&automic=0",
  );

  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({
    viewport: { width: 900, height: 1200 },
    deviceScaleFactor: 2,
  });

  const results = [];
  for (const id of targets) {
    if (!force && !needsCapture(id, false)) {
      results.push({ id, ok: true, skipped: true });
      console.log(`SKIP ${id} (exists)`);
      continue;
    }
    const copyFrom = COPY_FROM[id];
    if (copyFrom) {
      try {
        copyPreview(copyFrom, id);
        results.push({ id, ok: true, copied: copyFrom });
        console.log(`COPY ${id} ← ${copyFrom}`);
        continue;
      } catch (err) {
        console.log(`COPY fail ${id} — ${err.message}`);
      }
    }
    let lastErr = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const paths = await captureCharacter(page, id, base);
        results.push({ id, ok: true, ...paths, attempt });
        console.log(
          `OK   ${id} → card ${statSync(paths.cardOut).size}B, hero ${statSync(paths.heroOut).size}B`,
        );
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

  const missingCard = CHARACTER_IDS.filter((id) => !existsSync(cardPreviewPath(id)));
  const missingHero = CHARACTER_IDS.filter((id) => !existsSync(heroPreviewPath(id)));
  if (missingCard.length) console.log(`Missing card previews: ${missingCard.join(", ")}`);
  if (missingHero.length) console.log(`Missing hero previews: ${missingHero.join(", ")}`);

  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
