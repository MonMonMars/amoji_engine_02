#!/usr/bin/env node
/**
 * E2E: speech emotion reaches VRM expression presets during assistant talk.
 *
 * Usage:
 *   node scripts/companion-emotion-sync-verify.mjs
 */
import { chromium } from "playwright";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { waitForPageFn } from "./playwrightPageUtil.mjs";

const url = `http://127.0.0.1:5175/play?lang=en&autostart=1&automic=0&build=${encodeURIComponent(AMOJI_BUILD)}`;

/** @type {{ name: string, ok: boolean, detail?: string }[]} */
const checks = [];
function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await waitForPageFn(page, () => window.__amojiAvatar?.applyExpressionProfile, {
  timeout: 120000,
});

const result = await page.evaluate(async () => {
  const avatar = window.__amojiAvatar;
  const expr = avatar.vrm?.expressionManager;
  const preset = (name) =>
    Number(expr?.getValue?.(name) ?? expr?.getValue?.(name.toLowerCase()) ?? 0);
  avatar.setTalking(true);
  avatar.applyExpressionProfile?.({
    emotion: "happy",
    nuance: "excited",
    snapStrength: 0.92,
  });
  await new Promise((r) => setTimeout(r, 150));
  const happy = preset("Happy");
  avatar.applyExpressionProfile?.({
    emotion: "sad",
    nuance: "none",
    snapStrength: 0.88,
  });
  await new Promise((r) => setTimeout(r, 150));
  const sad = preset("Sad");
  avatar.setTalking(false);
  return { happy, sad, emotion: avatar.emotion };
});

record(
  "happy snap while talking",
  result.happy > 0.1,
  JSON.stringify({ happy: result.happy }),
);
record(
  "expression switches to sad",
  result.sad > 0.08 && result.emotion === "sad",
  JSON.stringify(result),
);

await browser.close();
process.exit(checks.some((c) => !c.ok) ? 1 : 0);
