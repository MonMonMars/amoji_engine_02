#!/usr/bin/env node
/**
 * E2E: TTS lip-sync drive reaches VRM visemes (voice → onMouth → setMouthOpen).
 *
 * Usage:
 *   node scripts/companion-lipsync-verify.mjs
 *   node scripts/companion-lipsync-verify.mjs --url http://127.0.0.1:5174/play?lang=en&autostart=1
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { waitForPageFn } from "./playwrightPageUtil.mjs";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const defaultUrl = `http://127.0.0.1:5174/play?lang=en&autostart=1&automic=0&build=${encodeURIComponent(AMOJI_BUILD)}`;
const url = parseArg("--url", defaultUrl);

/** @type {{ name: string, ok: boolean, detail?: string }[]} */
const checks = [];
function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await waitForPageFn(page, () => window.__amojiAvatar?.setMouthOpen, { timeout: 120000 });

const build = await page.evaluate(() => window.__amojiBuild);
record("build matches repo", build === AMOJI_BUILD, String(build));

/** Simulate companionVoice onMouth bursts (cloud TTS timer path). */
const mouthDrive = await page.evaluate(async () => {
  const avatar = window.__amojiAvatar;
  const samples = [];
  avatar.setTalking(true);
  const levels = [0.12, 0.48, 0.62, 0.38, 0.55, 0.22, 0.5, 0.41];
  for (const open of levels) {
    avatar.setMouthShape?.("aa");
    avatar.setMouthOpen?.(open);
    await new Promise((r) => setTimeout(r, 90));
    const expr = avatar.vrm?.expressionManager;
    const aa = Number(expr?.getValue?.("aa") ?? expr?.getValue?.("A") ?? 0);
    const jaw = avatar.vrm?.humanoid?.getNormalizedBoneNode?.("jaw");
    const face = avatar.getFaceDebug?.() || {};
    samples.push({
      open: Number(face.mouthOpen ?? avatar.mouthOpen ?? 0),
      target: Number(face.mouthTarget ?? 0),
      aa,
      jawX: Number(jaw?.rotation?.x ?? 0),
    });
  }
  avatar.setTalking(false);
  avatar.setMouthOpen?.(0);
  return samples;
});

const peak = mouthDrive.reduce(
  (best, s) => (s.aa > best.aa ? s : best),
  { aa: 0, open: 0, target: 0, jawX: 0 },
);
record(
  "voice-style mouth drive opens visemes",
  peak.aa > 0.18 && peak.open > 0.2 && peak.target > 0.2,
  JSON.stringify(peak),
);

await page.screenshot({ path: `${outDir}/lipsync_verify_peak.png` });

await browser.close();

const failed = checks.filter((c) => !c.ok);
const report = { build: AMOJI_BUILD, url, checks };
console.log(JSON.stringify(report, null, 2));
process.exit(failed.length ? 1 : 0);
