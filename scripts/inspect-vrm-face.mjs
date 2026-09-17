#!/usr/bin/env node
/**
 * Inspect companion VRM/GLB assets: triangle count, morph targets, VRM expressions.
 *
 * Usage: node scripts/inspect-vrm-face.mjs [model.vrm ...]
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../prototypes/assets");

const EMOTION_PRESETS = new Set([
  "happy",
  "relaxed",
  "sad",
  "surprised",
  "angry",
  "neutral",
]);
const VISEME_RE = /^(aa|ih|ou|ee|oh|a|i|u|e|o)$/i;

function countTrianglesFromGlb(buffer) {
  let triangles = 0;
  let morphTargets = 0;
  const morphNames = new Set();
  const jsonStart = buffer.indexOf("{".charCodeAt(0));
  if (jsonStart < 0) return { triangles, morphTargets, morphNames: [] };
  const jsonEnd = buffer.indexOf("}".charCodeAt(0), jsonStart);
  let json;
  try {
    const chunkLen = buffer.readUInt32LE(12);
    const type = buffer.toString("utf8", 16, 20);
    if (type === "JSON") {
      json = JSON.parse(buffer.toString("utf8", 20, 20 + chunkLen));
    } else {
      json = JSON.parse(buffer.toString("utf8", jsonStart, jsonEnd + 1));
    }
  } catch {
    return { triangles, morphTargets, morphNames: [] };
  }
  const accessors = json.accessors || [];
  const meshes = json.meshes || [];
  for (const mesh of meshes) {
    for (const prim of mesh.primitives || []) {
      const mode = prim.mode ?? 4;
      if (mode !== 4) continue;
      const idx = prim.indices;
      if (idx != null) {
        const acc = accessors[idx];
        triangles += Math.floor((acc?.count || 0) / 3);
      } else {
        const pos = prim.attributes?.POSITION;
        if (pos != null) {
          const acc = accessors[pos];
          triangles += Math.floor((acc?.count || 0) / 3);
        }
      }
      const targets = prim.targets || [];
      morphTargets += targets.length;
      const extras = prim.extras?.targetNames || mesh.extras?.targetNames;
      if (Array.isArray(extras)) {
        for (const name of extras) morphNames.add(String(name));
      }
    }
  }
  return { triangles, morphTargets, morphNames: [...morphNames] };
}

function parseVrmExpressions(buffer) {
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 2_000_000));
  const names = new Set();
  const re = /"expressionName"\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(text))) {
    names.add(m[1].replace(/^VRMExpression_/, ""));
  }
  const presetRe = /"presetName"\s*:\s*"([^"]+)"/g;
  while ((m = presetRe.exec(text))) {
    names.add(m[1]);
  }
  return [...names];
}

async function inspectFile(filePath) {
  const buffer = await readFile(filePath);
  const base = path.basename(filePath);
  const { triangles, morphTargets, morphNames } = countTrianglesFromGlb(buffer);
  const expressions = parseVrmExpressions(buffer);
  const visemes = expressions.filter((n) => VISEME_RE.test(n));
  const emotions = expressions.filter((n) => EMOTION_PRESETS.has(String(n).toLowerCase()));
  const blink = expressions.filter((n) => /blink/i.test(n));
  return {
    file: base,
    bytes: buffer.length,
    triangles,
    morphTargets,
    morphNames: morphNames.slice(0, 12),
    expressionCount: expressions.length,
    visemes,
    emotions,
    blink,
    expressions: expressions.slice(0, 30),
    score:
      triangles * 0.001 +
      expressions.length * 500 +
      visemes.length * 2000 +
      morphTargets * 10,
  };
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
