#!/usr/bin/env node
/**
 * Inspect companion VRM/GLB assets: triangle count, morph targets, VRM expressions.
 *
 * Usage: node scripts/inspect-vrm-face.mjs [model.vrm ...]
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectVrmBuffer } from "../amoji-engine/engine/companion/companionVrmInspect.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../prototypes/assets");

async function inspectFile(filePath) {
  const buffer = await readFile(filePath);
  return inspectVrmBuffer(buffer, path.basename(filePath));
}

async function main() {
  const args = process.argv.slice(2);
  let files = args.map((f) => path.resolve(f));
  if (!files.length) {
    const all = await readdir(assetsDir);
    files = all
      .filter((f) => /\.(vrm|glb)$/i.test(f))
      .map((f) => path.join(assetsDir, f));
  }
  const reports = [];
  for (const file of files) {
    try {
      reports.push(await inspectFile(file));
    } catch (err) {
      reports.push({ file: path.basename(file), error: err.message });
    }
  }
  reports.sort((a, b) => (b.score || 0) - (a.score || 0));
  console.log(JSON.stringify(reports, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
