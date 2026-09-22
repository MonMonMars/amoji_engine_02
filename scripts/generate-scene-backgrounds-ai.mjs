#!/usr/bin/env node
/**
 * Optional: regenerate scene PNGs with OpenAI Images (gpt-image-1 / dall-e-3).
 * Requires OPENAI_API_KEY or AMOJI_LLM_KEY. Falls back to procedural npm run scene-bg.
 *
 * Usage:
 *   node scripts/generate-scene-backgrounds-ai.mjs [--force] [--only=bedroom,cozy-room]
 *   npm run scene-bg:ai
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENE_AI_PROMPT_LIST } from "./scene-bg-ai-prompts.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "../prototypes/assets/scene-bg");
mkdirSync(outDir, { recursive: true });

const apiKey =
  process.env.OPENAI_API_KEY?.trim() ||
  process.env.AMOJI_LLM_KEY?.trim() ||
  "";
const force = process.argv.includes("--force");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlySet = onlyArg
  ? new Set(
      onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

const MODEL = process.env.AMOJI_SCENE_BG_AI_MODEL?.trim() || "gpt-image-1";
const SIZE = process.env.AMOJI_SCENE_BG_AI_SIZE?.trim() || "1536x1024";

/**
 * @param {string} prompt
 */
async function generateOne(prompt) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: SIZE,
      n: 1,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI images ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = await res.json();
  const item = json?.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item?.url) {
    const img = await fetch(item.url);
    if (!img.ok) throw new Error(`fetch image url ${img.status}`);
    return Buffer.from(await img.arrayBuffer());
  }
  throw new Error("OpenAI response missing image data");
}

if (!apiKey) {
  console.error(
    "❌ OPENAI_API_KEY (or AMOJI_LLM_KEY) not set — run procedural: npm run scene-bg",
  );
  process.exit(1);
}

let ok = 0;
for (const entry of SCENE_AI_PROMPT_LIST) {
  if (onlySet && !onlySet.has(entry.id)) continue;
  const pngPath = join(outDir, `${entry.id}.png`);
  if (!force && existsSync(pngPath)) {
    console.log("skip (exists)", entry.id);
    continue;
  }
  console.log("ai", entry.id, "…");
  try {
    const buf = await generateOne(entry.prompt);
    writeFileSync(pngPath, buf);
    ok += 1;
    console.log("wrote", entry.id, buf.length);
  } catch (err) {
    console.error("fail", entry.id, err instanceof Error ? err.message : err);
  }
  await new Promise((r) => setTimeout(r, 1200));
}

console.log(`\n✅ AI scene PNGs written: ${ok}`);
console.log("Next: node scripts/generate-scene-backgrounds.mjs && node scripts/sync-build-version.mjs");
