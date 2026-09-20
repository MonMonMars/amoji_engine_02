#!/usr/bin/env node
/**
 * Generate anime-style SVG scene backgrounds for every companion preset.
 * Output: prototypes/assets/scene-bg/{id}.svg
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENE_BACKGROUND_PRESETS } from "../amoji-engine/engine/companion/companionScenePresets.js";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../prototypes/assets/scene-bg");
mkdirSync(outDir, { recursive: true });

/** @type {Record<string, (w: number, h: number) => string>} */
const SCENE_ART = {
  "night-city": (w, h) => {
    const buildings = Array.from({ length: 14 }, (_, i) => {
      const bw = 28 + (i % 5) * 12;
      const bh = 80 + (i * 37) % 220;
      const x = 20 + i * 52;
      const y = h - 40 - bh;
      const windows = Array.from({ length: Math.floor(bh / 22) }, (_, r) => {
        const wy = y + 12 + r * 22;
        return Array.from({ length: Math.floor(bw / 14) }, (_, c) => {
          const lit = (i + r + c) % 3 !== 0;
          return `<rect x="${x + 6 + c * 14}" y="${wy}" width="8" height="10" rx="1" fill="${lit ? "#ffe4a8" : "#1a2438"}" opacity="${lit ? 0.85 : 0.4}"/>`;
        }).join("");
      }).join("");
      return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#0f1628"/><rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="url(#bld)" opacity="0.5"/>${windows}`;
    }).join("");
    return `<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1040"/><stop offset="45%" stop-color="#2d2860"/><stop offset="100%" stop-color="#0a0e18"/></linearGradient>
      <linearGradient id="bld" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3d4a6a"/><stop offset="1" stop-color="#0a1020"/></linearGradient>
      <radialGradient id="moon" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="#fff8e8"/><stop offset="100%" stop-color="#fff8e800"/></radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <circle cx="${w * 0.78}" cy="${h * 0.14}" r="36" fill="url(#moon)" opacity="0.95"/>
    <circle cx="${w * 0.78}" cy="${h * 0.14}" r="28" fill="#f5f0dc"/>
    ${buildings}
    <rect x="0" y="${h - 40}" width="${w}" height="40" fill="#080c14"/>`;
  },
  rooftop: (w, h) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a6a8a"/><stop offset="60%" stop-color="#283848"/><stop offset="100%" stop-color="#101820"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="#1a2028"/>
    <rect x="0" y="${h * 0.52}" width="${w}" height="8" fill="#3a4550"/>
    ${Array.from({ length: 8 }, (_, i) => `<rect x="${40 + i * 90}" y="${h * 0.35}" width="${30 + (i % 3) * 15}" height="${h * 0.17}" fill="#152028" opacity="0.9"/>`).join("")}
    <circle cx="${w * 0.2}" cy="${h * 0.2}" r="40" fill="#ffd0a0" opacity="0.35"/>`,
  park: (w, h) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#87ceeb"/><stop offset="100%" stop-color="#5a9888"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <ellipse cx="${w * 0.5}" cy="${h * 0.72}" rx="${w * 0.7}" ry="${h * 0.35}" fill="#4a8a52"/>
    ${Array.from({ length: 9 }, (_, i) => {
      const x = 30 + i * 75;
      const th = 60 + (i % 4) * 25;
      return `<ellipse cx="${x}" cy="${h * 0.68}" rx="38" ry="48" fill="#2d6a38"/><rect x="${x - 6}" y="${h * 0.68}" width="12" height="${th}" fill="#4a3828"/>`;
    }).join("")}`,
  beach: (w, h) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6ec8ff"/><stop offset="55%" stop-color="#4aa8e8"/><stop offset="100%" stop-color="#f0d898"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="#e8c878"/>
    <path d="M0 ${h * 0.58} Q${w * 0.25} ${h * 0.54} ${w * 0.5} ${h * 0.58} T${w} ${h * 0.56} L${w} ${h * 0.65} L0 ${h * 0.65}Z" fill="#3a98c8" opacity="0.85"/>
    <ellipse cx="${w * 0.85}" cy="${h * 0.12}" rx="50" ry="50" fill="#fff8e0" opacity="0.9"/>`,
  sunset: (w, h) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff6b4a"/><stop offset="35%" stop-color="#c44a88"/><stop offset="70%" stop-color="#482868"/><stop offset="100%" stop-color="#180818"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <circle cx="${w * 0.5}" cy="${h * 0.42}" r="55" fill="#ffb060" opacity="0.95"/>
    <rect x="0" y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="#120818"/>`,
  aurora: (w, h) => `<rect width="${w}" height="${h}" fill="#060810"/>
    <path d="M0 ${h * 0.35} Q${w * 0.3} ${h * 0.15} ${w * 0.5} ${h * 0.32} T${w} ${h * 0.28} L${w} ${h * 0.55} Q${w * 0.6} ${h * 0.4} ${w * 0.3} ${h * 0.5} T0 ${h * 0.48}Z" fill="#5eead4" opacity="0.45"/>
    <path d="M0 ${h * 0.38} Q${w * 0.4} ${h * 0.22} ${w * 0.7} ${h * 0.35} L${w} ${h * 0.5} Q${w * 0.5} ${h * 0.42} 0 ${h * 0.52}Z" fill="#a78bfa" opacity="0.4"/>
    ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % w}" cy="${(i * 53) % (h * 0.5)}" r="1.2" fill="#fff" opacity="0.7"/>`).join("")}`,
  "rain-street": (w, h) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#283848"/><stop offset="100%" stop-color="#0a1018"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${25 + i * 55}" y="${h * 0.4}" width="35" height="${h * 0.45}" fill="#1a2838"/>`).join("")}
    <rect x="0" y="${h * 0.82}" width="${w}" height="${h * 0.18}" fill="#0c1420"/>
    ${Array.from({ length: 80 }, (_, i) => `<line x1="${(i * 13) % w}" y1="${(i * 17) % h}" x2="${((i * 13) % w) + 2}" y2="${((i * 17) % h) + 18}" stroke="#88aacc" stroke-width="1" opacity="0.25"/>`).join("")}`,
  "cherry-blossom": (w, h) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd0e8"/><stop offset="100%" stop-color="#886888"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${60 + i * 110}" cy="${h * 0.55}" rx="55" ry="70" fill="#c84888" opacity="0.7"/><rect x="${55 + i * 110}" y="${h * 0.55}" width="10" height="80" fill="#483028"/>`).join("")}
    ${Array.from({ length: 35 }, (_, i) => `<circle cx="${(i * 41) % w}" cy="${(i * 29) % (h * 0.6)}" r="3" fill="#ffb8d8" opacity="0.8"/>`).join("")}`,
  mountain: (w, h) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#98c8f0"/><stop offset="100%" stop-color="#688898"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <polygon points="${w * 0.1},${h * 0.75} ${w * 0.35},${h * 0.35} ${w * 0.55},${h * 0.75}" fill="#506878"/>
    <polygon points="${w * 0.35},${h * 0.75} ${w * 0.62},${h * 0.28} ${w * 0.9},${h * 0.75}" fill="#7898a8"/>
    <polygon points="${w * 0.55},${h * 0.75} ${w * 0.72},${h * 0.42} ${w * 0.95},${h * 0.75}" fill="#607080"/>`,
  harbor: (w, h) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#88b8e0"/><stop offset="100%" stop-color="#486878"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <rect x="0" y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="#2a5878"/>
    ${Array.from({ length: 4 }, (_, i) => `<path d="M${80 + i * 180} ${h * 0.58} L${110 + i * 180} ${h * 0.45} L${140 + i * 180} ${h * 0.58}Z" fill="#1a2838"/>`).join("")}
    <rect x="0" y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="#182028"/>`,
  meadow: (w, h) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a8d8ff"/><stop offset="100%" stop-color="#88c868"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <ellipse cx="${w * 0.5}" cy="${h * 0.78}" rx="${w * 0.8}" ry="${h * 0.28}" fill="#68a848"/>
    ${Array.from({ length: 15 }, (_, i) => `<line x1="${20 + i * 55}" y1="${h * 0.72}" x2="${20 + i * 55}" y2="${h * 0.62 - (i % 3) * 8}" stroke="#88d858" stroke-width="2"/>`).join("")}`,
  studio: (w, h) => indoorRoom(w, h, "#e8e8f0", "#888898", "studio"),
  "cozy-room": (w, h) => indoorRoom(w, h, "#f0d8c8", "#8a6858", "cozy"),
  cafe: (w, h) => indoorRoom(w, h, "#e8d0b0", "#6a5040", "cafe"),
  library: (w, h) => indoorRoom(w, h, "#d8e0d0", "#4a5848", "library"),
  minimal: (w, h) => `<rect width="${w}" height="${h}" fill="#0a0c12"/>
    <rect x="${w * 0.15}" y="${h * 0.2}" width="${w * 0.7}" height="${h * 0.55}" fill="#121820" stroke="#2a3540" stroke-width="2"/>
    <line x1="${w * 0.15}" y1="${h * 0.45}" x2="${w * 0.85}" y2="${h * 0.45}" stroke="#2a3540"/>`,
  bedroom: (w, h) => indoorRoom(w, h, "#d8c8e0", "#685878", "bedroom"),
  office: (w, h) => indoorRoom(w, h, "#d0d8e8", "#485868", "office"),
  classroom: (w, h) => indoorRoom(w, h, "#e8e0c8", "#686048", "classroom"),
  greenhouse: (w, h) => `<rect width="${w}" height="${h}" fill="#88c898"/>
    ${Array.from({ length: 8 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${h}" stroke="#fff" stroke-width="2" opacity="0.3"/>`).join("")}
    <rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="#48a858"/>
    ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${60 + i * 120}" cy="${h * 0.75}" rx="40" ry="25" fill="#68c878"/>`).join("")}`,
  loft: (w, h) => indoorRoom(w, h, "#e0c8a8", "#685040", "loft"),
  kitchen: (w, h) => indoorRoom(w, h, "#f0e0c8", "#786048", "kitchen"),
};

function indoorRoom(w, h, wall, accent, kind) {
  const window = `<rect x="${w * 0.55}" y="${h * 0.12}" width="${w * 0.35}" height="${h * 0.35}" fill="#87ceeb" opacity="0.9"/>
    <rect x="${w * 0.55}" y="${h * 0.12}" width="${w * 0.35}" height="${h * 0.35}" fill="none" stroke="${accent}" stroke-width="4"/>`;
  const shelf = kind === "library"
    ? Array.from({ length: 5 }, (_, i) => `<rect x="${w * 0.08}" y="${h * 0.25 + i * 45}" width="${w * 0.35}" height="38" fill="${accent}" opacity="0.5"/>`).join("")
    : "";
  const table = kind === "cafe" || kind === "kitchen"
    ? `<rect x="${w * 0.2}" y="${h * 0.65}" width="${w * 0.45}" height="12" fill="${accent}"/><rect x="${w * 0.35}" y="${h * 0.77}" width="8" height="40" fill="${accent}"/>`
    : "";
  const bed = kind === "bedroom"
    ? `<rect x="${w * 0.1}" y="${h * 0.62}" width="${w * 0.45}" height="${h * 0.2}" rx="8" fill="${accent}" opacity="0.6"/>`
    : "";
  return `<rect width="${w}" height="${h}" fill="${wall}"/>
    <rect x="0" y="${h * 0.75}" width="${w}" height="${h * 0.25}" fill="${accent}" opacity="0.35"/>
    ${window}${shelf}${table}${bed}
    <rect x="0" y="0" width="${w}" height="${h * 0.08}" fill="#000" opacity="0.15"/>`;
}

const W = 960;
const H = 540;

let written = 0;
for (const preset of SCENE_BACKGROUND_PRESETS) {
  const draw = SCENE_ART[preset.id];
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

const cssPath = join(dirname(fileURLToPath(import.meta.url)), "../prototypes/companion-scene-backgrounds.css");
const build = process.env.AMOJI_BUILD || "dev";
const overlay =
  "linear-gradient(180deg, rgba(7, 10, 16, 0.1) 0%, rgba(5, 7, 12, 0.42) 55%, rgba(3, 5, 10, 0.75) 100%)";

const lines = [
  "/** Auto-generated scene background art — run: node scripts/generate-scene-backgrounds.mjs */",
  `/* build: ${build} */`,
  "",
  ".atmosphere {",
  "  background-color: #070a10 !important;",
  "  background-image:",
  `    ${overlay},`,
  "    url(\"/prototypes/assets/scene-bg/night-city.svg\") !important;",
  "  background-size: cover, cover !important;",
  "  background-position: center, center !important;",
  "  background-repeat: no-repeat !important;",
  "}",
  "",
];

for (const preset of SCENE_BACKGROUND_PRESETS) {
  if (!SCENE_ART[preset.id]) continue;
  lines.push(
    `.atmosphere[data-scene-bg="${preset.id}"] {`,
    "  background-image:",
    `    ${overlay},`,
    `    url("/prototypes/assets/scene-bg/${preset.id}.svg") !important;`,
    "  background-size: cover, cover !important;",
    "  background-position: center, center !important;",
    "}",
    "",
  );
  lines.push(
    `.scene-preset__swatch--${preset.id} {`,
    "  background-image:",
    "    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.38)),",
    `    url("/prototypes/assets/scene-bg/${preset.id}.svg");`,
    "  background-size: cover;",
    "  background-position: center;",
    "  background-repeat: no-repeat;",
    "}",
    "",
  );
}

for (const preset of SCENE_BACKGROUND_PRESETS) {
  if (!SCENE_ART[preset.id]) continue;
  lines.push(
    `.theme-grok-ani .atmosphere[data-scene-bg="${preset.id}"] {`,
    "  background-image:",
    "    linear-gradient(180deg, rgba(3, 3, 10, 0.08) 0%, rgba(2, 2, 8, 0.38) 48%, rgba(2, 2, 8, 0.78) 100%),",
    `    url("/prototypes/assets/scene-bg/${preset.id}.svg") !important;`,
    "}",
    "",
  );
}

writeFileSync(cssPath, lines.join("\n"));
console.log("wrote", cssPath);
console.log(`\n✅ ${written} scene backgrounds → ${outDir}`);
