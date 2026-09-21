#!/usr/bin/env node
/**
 * Rasterize scene SVG art to 1920×1080 PNG for crisp companion backgrounds.
 * Requires: playwright (repo root). Run after generate-scene-backgrounds.mjs
 */
import { mkdirSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { SCENE_BACKGROUND_PRESETS } from "../amoji-engine/engine/companion/companionScenePresets.js";

const root = dirname(fileURLToPath(import.meta.url));
const svgDir = join(root, "../prototypes/assets/scene-bg");
const pngDir = svgDir;
const W = 1920;
const H = 1080;

mkdirSync(pngDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });

const PRESERVE_SCENE_PNG = new Set(["bedroom"]);

let written = 0;
for (const preset of SCENE_BACKGROUND_PRESETS) {
  const svgPath = join(svgDir, `${preset.id}.svg`);
  if (!existsSync(svgPath)) {
    console.warn("skip (no svg)", preset.id);
    continue;
  }
  if (PRESERVE_SCENE_PNG.has(preset.id) && existsSync(join(pngDir, `${preset.id}.png`))) {
    console.log("preserve png", preset.id);
    continue;
  }
  const svg = readFileSync(svgPath, "utf8");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    *{margin:0;padding:0} html,body{width:${W}px;height:${H}px;overflow:hidden;background:#070a10}
    svg{display:block;width:${W}px;height:${H}px}
  </style></head><body>${svg}</body></html>`;
  await page.setContent(html, { waitUntil: "load" });
  const pngPath = join(pngDir, `${preset.id}.png`);
  await page.locator("svg").screenshot({ path: pngPath, type: "png" });
  written += 1;
  console.log("png", preset.id);
}

await browser.close();

const assetsDir = join(root, "../prototypes/assets");
const nightCityPng = join(pngDir, "night-city.png");
const pickerSrc = join(pngDir, "rain-street.png");
if (existsSync(nightCityPng)) {
  copyFileSync(nightCityPng, join(assetsDir, "companion-bg-anime.png"));
  console.log("companion-bg-anime.png ← night-city");
}
if (existsSync(pickerSrc)) {
  copyFileSync(pickerSrc, join(assetsDir, "picker-aaa-bg.png"));
  console.log("picker-aaa-bg.png ← rain-street");
}

console.log(`\n✅ ${written} PNG scene backgrounds → ${pngDir}`);
