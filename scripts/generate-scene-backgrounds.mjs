#!/usr/bin/env node
/**
 * Generate Japanese anime / VN style SVG scene backgrounds for every companion preset.
 * Default + night-city use companion-bg-anime.png in CSS (SVG still generated for swatch fallback / tests).
 * Output: prototypes/assets/scene-bg/{id}.svg, prototypes/companion-scene-backgrounds.css
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENE_BACKGROUND_PRESETS } from "../amoji-engine/engine/companion/companionScenePresets.js";
import { PICKER_SCENE_ART_REVISION } from "../amoji-engine/engine/companion/companionPickerAssets.mjs";
import { SCENE_ANIME_ART, animeSceneFinisher } from "./scene-bg-anime-art.mjs";

/** Regenerate every preset when art revision bumps (no skips). */
const PRESERVE_SCENE_SVG = new Set();

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "../prototypes/assets/scene-bg");
mkdirSync(outDir, { recursive: true });

const ANIME_PNG = "/prototypes/assets/companion-bg-anime.png";
const ANIME_PNG_PATH = join(root, "../prototypes/assets/companion-bg-anime.png");
/** @deprecated HQ PNG when present; otherwise SVG art is used */
const PNG_SCENE_IDS = new Set(["night-city"]);
const ART_Q = `?v=${encodeURIComponent(PICKER_SCENE_ART_REVISION)}`;

/** Cinematic grade — keeps avatar readable without muddy crush. */
const overlayDefault =
  "linear-gradient(180deg, rgba(8, 12, 20, 0) 0%, rgba(8, 12, 20, 0.06) 48%, rgba(4, 6, 12, 0.26) 100%)";
const overlayScene =
  "linear-gradient(180deg, rgba(8, 12, 20, 0) 0%, rgba(6, 10, 18, 0.05) 52%, rgba(3, 5, 10, 0.2) 100%)";
const overlayGrok =
  "linear-gradient(180deg, rgba(4, 4, 12, 0) 0%, rgba(2, 2, 10, 0.1) 50%, rgba(2, 2, 10, 0.36) 100%)";

/** @param {string} presetId */
function sceneArtFile(presetId) {
  const pngPath = join(outDir, `${presetId}.png`);
  const svgPath = join(outDir, `${presetId}.svg`);
  if (PNG_SCENE_IDS.has(presetId) && existsSync(ANIME_PNG_PATH)) {
    return `${ANIME_PNG}${ART_Q}`;
  }
  if (existsSync(pngPath)) {
    return `/prototypes/assets/scene-bg/${presetId}.png${ART_Q}`;
  }
  if (existsSync(svgPath)) {
    return `/prototypes/assets/scene-bg/${presetId}.svg${ART_Q}`;
  }
  if (existsSync(ANIME_PNG_PATH)) return `${ANIME_PNG}${ART_Q}`;
  return `/prototypes/assets/scene-bg/bedroom.svg${ART_Q}`;
}

/** @param {string} presetId */
function sceneArtUrl(presetId) {
  return `url("${sceneArtFile(presetId)}")`;
}

/** @param {string} presetId */
function atmosphereArtLayers(presetId) {
  const layers = [sceneArtUrl(presetId)];
  const svgPath = join(outDir, `${presetId}.svg`);
  const primary = sceneArtFile(presetId);
  if (existsSync(svgPath) && !primary.includes(`${presetId}.svg`)) {
    layers.push(`url("/prototypes/assets/scene-bg/${presetId}.svg${ART_Q}")`);
  }
  return layers.join(",\n    ");
}

/** @param {string} presetId */
function atmosphereLayers(presetId) {
  const overlay = PNG_SCENE_IDS.has(presetId) || presetId === "__default__" ? overlayDefault : overlayScene;
  const id = presetId === "__default__" ? "bedroom" : presetId;
  return `${overlay},\n    ${atmosphereArtLayers(id)} !important;`;
}

/** @param {string} presetId */
function atmosphereSizeLayers(presetId) {
  const id = presetId === "__default__" ? "bedroom" : presetId;
  const svgPath = join(outDir, `${id}.svg`);
  const pngPath = join(outDir, `${id}.png`);
  let layers = 2;
  if (existsSync(pngPath) && existsSync(svgPath) && !PNG_SCENE_IDS.has(id)) {
    layers = 3;
  }
  return `${Array(layers).fill("cover").join(", ")} !important`;
}

/** Match companion stage PNG resolution (avoid upscaling soft 960×540 art). */
const W = 1920;
const H = 1080;

let written = 0;
for (const preset of SCENE_BACKGROUND_PRESETS) {
  const draw = SCENE_ANIME_ART[preset.id];
  if (!draw) {
    console.warn("missing art", preset.id);
    continue;
  }
  const path = join(outDir, `${preset.id}.svg`);
  if (PRESERVE_SCENE_SVG.has(preset.id) && existsSync(path)) {
    console.log("preserve", preset.id);
    written += 1;
    continue;
  }
  const finisherMode =
    preset.environment === "indoor"
      ? preset.id === "minimal"
        ? "minimal"
        : "interior"
      : "standard";
  const body = draw(W, H) + animeSceneFinisher(W, H, finisherMode);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${body}
</svg>`;
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
  `  background-size: ${atmosphereSizeLayers("__default__")};`,
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
    `  background-size: ${atmosphereSizeLayers(preset.id)};`,
    "  background-position: center, center !important;",
    "}",
    "",
  );
  const swatchArt = `url("${sceneArtFile(preset.id)}")`;
  lines.push(
    `.scene-preset__swatch--${preset.id} {`,
    "  background-image:",
    "    linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.28)),",
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
    : `url("${sceneArtFile(preset.id)}") center center / cover no-repeat !important;`;
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
