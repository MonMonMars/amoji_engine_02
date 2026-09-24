#!/usr/bin/env node
/**
 * Sync AMOJI_BUILD into companion HTML (window.__amojiBuild + ?v= cache bust).
 * Run before deploy and in CI so demo pages always match buildVersion.mjs.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { PICKER_SCENE_ART_REVISION } from "../amoji-engine/engine/companion/companionPickerAssets.mjs";
import { OUTDOOR_SCENE_BACKGROUND_IDS } from "../amoji-engine/engine/companion/companionScenePresets.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML_FILES = [
  join(root, "prototypes/amoji-companion.html"),
  join(root, "prototypes/amoji-lite.html"),
];

let changed = 0;

for (const file of HTML_FILES) {
  let content = readFileSync(file, "utf8");
  const before = content;

  content = content.replace(
    /window\.__amojiBuild\s*=\s*"[^"]*"/g,
    `window.__amojiBuild = "${AMOJI_BUILD}"`,
  );
  content = content.replace(/\?v=[^"'\s&<>]+/g, `?v=${AMOJI_BUILD}`);

  const earlyBootTag = `<script src="/amoji-engine/engine/companion/companionEarlyFreshBoot.js?v=${AMOJI_BUILD}"></script>`;
  if (!content.includes("companionEarlyFreshBoot.js")) {
    content = content.replace(
      /(<script>\s*window\.__amojiBuild\s*=\s*"[^"]*";?\s*<\/script>)/,
      `$1\n    ${earlyBootTag}`,
    );
  } else {
    content = content.replace(
      /<script src="\/amoji-engine\/engine\/companion\/companionEarlyFreshBoot\.js\?v=[^"]*"><\/script>/,
      earlyBootTag,
    );
  }

  if (content !== before) {
    writeFileSync(file, content);
    changed += 1;
    console.log(`sync-build-version: updated ${file}`);
  }
}

const earlyBootPath = join(
  root,
  "amoji-engine/engine/companion/companionEarlyFreshBoot.js",
);
let earlyBoot = readFileSync(earlyBootPath, "utf8");
const outdoorToken = ` ${OUTDOOR_SCENE_BACKGROUND_IDS.join(" ")} `;
const earlyBefore = earlyBoot;
earlyBoot = earlyBoot.replace(
  /var SCENE_ART_V = "[^"]+";/,
  `var SCENE_ART_V = "${PICKER_SCENE_ART_REVISION}";`,
);
earlyBoot = earlyBoot.replace(
  /var OUTDOOR_SCENE =\s*"[^"]*";/,
  `var OUTDOOR_SCENE = "${outdoorToken}";`,
);
if (earlyBoot !== earlyBefore) {
  writeFileSync(earlyBootPath, earlyBoot);
  console.log(`sync-build-version: updated ${earlyBootPath}`);
}

const sceneCssPath = join(root, "prototypes/companion-scene-backgrounds.css");
if (existsSync(sceneCssPath)) {
  let css = readFileSync(sceneCssPath, "utf8");
  const cssBefore = css;
  css = css.replace(/\?v=[^")\s]+/g, `?v=${PICKER_SCENE_ART_REVISION}`);
  css = css.replace(/\/\* build: [^*]+ \*\//, `/* build: ${AMOJI_BUILD} */`);
  if (css !== cssBefore) {
    writeFileSync(sceneCssPath, css);
    console.log(`sync-build-version: updated ${sceneCssPath}`);
  }
}

if (changed === 0) {
  console.log(`sync-build-version: HTML already at ${AMOJI_BUILD}`);
} else {
  console.log(`sync-build-version: synced ${changed} file(s) to ${AMOJI_BUILD}`);
}
