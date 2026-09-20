#!/usr/bin/env node
/**
 * Generate Japanese anime / VN style SVG scene backgrounds for every companion preset.
 * Default + night-city use companion-bg-anime.png in CSS (SVG still generated for swatch fallback / tests).
 * Output: prototypes/assets/scene-bg/{id}.svg, prototypes/companion-scene-backgrounds.css
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENE_BACKGROUND_PRESETS } from "../amoji-engine/engine/companion/companionScenePresets.js";
import { PICKER_SCENE_ART_REVISION } from "../amoji-engine/engine/companion/companionPickerAssets.mjs";
import { SCENE_ANIME_ART } from "./scene-bg-anime-art.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "../prototypes/assets/scene-bg");
mkdirSync(outDir, { recursive: true });

const ANIME_PNG = "/prototypes/assets/companion-bg-anime.png";
const PNG_SCENE_IDS = new Set(["night-city"]);
const ART_Q = `?v=${encodeURIComponent(PICKER_SCENE_ART_REVISION)}`;

const overlayDefault =
  "linear-gradient(180deg, rgba(7, 10, 16, 0.25) 0%, rgba(7, 10, 16, 0.55) 55%, rgba(5, 7, 12, 0.82) 100%)";
const overlayScene =
  "linear-gradient(180deg, rgba(7, 10, 16, 0.12) 0%, rgba(5, 7, 12, 0.38) 55%, rgba(3, 5, 10, 0.72) 100%)";
const overlayGrok =
  "linear-gradient(180deg, rgba(3, 3, 10, 0.08) 0%, rgba(2, 2, 8, 0.38) 48%, rgba(2, 2, 8, 0.78) 100%)";

/** @param {string} presetId */
function sceneArtUrl(presetId) {
  if (PNG_SCENE_IDS.has(presetId)) return `url("${ANIME_PNG}${ART_Q}")`;
  return `url("/prototypes/assets/scene-bg/${presetId}.svg${ART_Q}")`;
}

/** @param {string} presetId */
function atmosphereLayers(presetId) {
  const overlay = PNG_SCENE_IDS.has(presetId) || presetId === "__default__" ? overlayDefault : overlayScene;
  return `${overlay},\n    ${sceneArtUrl(presetId === "__default__" ? "night-city" : presetId)} !important;`;
}

const W = 960;
const H = 540;

let written = 0;
for (const preset of SCENE_BACKGROUND_PRESETS) {
  const draw = SCENE_ANIME_ART[preset.id];
  if (!draw) {
    console.warn("missing art", preset.id);
    continue;
  }
  const body = draw(W, H);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${body}
</svg>`;
  const path = join(outDir, `${preset.id}.svg`);
  writeFileSync(path, svg);
  written += 1;
  console.log("wrote", preset.id);
}

const cssPath = join(root, "../prototypes/companion-scene-backgrounds.css");
const build = process.env.AMOJI_BUILD || "dev";

const lines = [
  "/** Auto-generated scene background art — run: node scripts/generate-scene-backgrounds.mjs */",
  `/* build: ${build} */`,
  "",
  ".atmosphere {",
  "  background-color: #070a10 !important;",
  "  background-image:",
  `    ${atmosphereLayers("__default__")}`,
  "  background-size: cover, cover !important;",
  "  background-position: center, center !important;",
  "  background-repeat: no-repeat !important;",
  "}",
  "",
];

for (const preset of SCENE_BACKGROUND_PRESETS) {
  if (!SCENE_ANIME_ART[preset.id]) continue;
  lines.push(
    `.atmosphere[data-scene-bg="${preset.id}"] {`,
    "  background-image:",
    `    ${atmosphereLayers(preset.id)}`,
    "  background-size: cover, cover !important;",
    "  background-position: center, center !important;",
    "}",
    "",
  );
  const swatchArt = PNG_SCENE_IDS.has(preset.id)
    ? `url("${ANIME_PNG}")`
    : `url("/prototypes/assets/scene-bg/${preset.id}.svg")`;
  lines.push(
    `.scene-preset__swatch--${preset.id} {`,
    "  background-image:",
    "    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.38)),",
    `    ${swatchArt};`,
    "  background-size: cover;",
    "  background-position: center;",
    "  background-repeat: no-repeat;",
    "}",
    "",
  );
}

for (const preset of SCENE_BACKGROUND_PRESETS) {
  if (!SCENE_ANIME_ART[preset.id]) continue;
  const art = PNG_SCENE_IDS.has(preset.id)
    ? `url("${ANIME_PNG}") center 20% / cover no-repeat !important;`
    : `url("/prototypes/assets/scene-bg/${preset.id}.svg") !important;`;
  lines.push(
    `.theme-grok-ani .atmosphere[data-scene-bg="${preset.id}"] {`,
    "  background-image:",
    `    ${overlayGrok},`,
    `    ${art}`,
    "}",
    "",
  );
}

writeFileSync(cssPath, lines.join("\n"));
console.log("wrote", cssPath);
console.log(`\n✅ ${written} scene backgrounds → ${outDir}`);
