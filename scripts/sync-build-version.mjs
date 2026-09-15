#!/usr/bin/env node
/**
 * Sync AMOJI_BUILD into companion HTML (window.__amojiBuild + ?v= cache bust).
 * Run before deploy and in CI so demo pages always match buildVersion.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

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

if (changed === 0) {
  console.log(`sync-build-version: HTML already at ${AMOJI_BUILD}`);
} else {
  console.log(`sync-build-version: synced ${changed} file(s) to ${AMOJI_BUILD}`);
}
