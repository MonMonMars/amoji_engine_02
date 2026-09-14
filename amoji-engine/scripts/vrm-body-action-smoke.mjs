#!/usr/bin/env node
/**
 * Verify VRM body rig moves during scripted actions (not just root motion).
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "http://127.0.0.1:5173";

async function probe(modelUrl, label) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage();
  await page.goto(`${BASE}/prototypes/vrm-action-body-test.html?model=${encodeURIComponent(modelUrl)}`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.waitForFunction(
    () => window.__bodyActionTest?.ready || window.__bodyActionTest?.error,
    undefined,
    { timeout: 90000 },
  );
  const data = await page.evaluate(() => window.__bodyActionTest);
  await browser.close();
  return { label, modelUrl, ...data };
}

async function main() {
  const models = [
    ["/prototypes/assets/companion-girl.vrm", "companion-girl"],
    ["/prototypes/assets/kizuna-kamatte.vrm", "kizuna"],
  ];
  const results = [];
  for (const [url, label] of models) {
    results.push(await probe(url, label));
  }
  const out = { ok: results.every((r) => r.ok), results };
  console.log(JSON.stringify(out, null, 2));
  if (!out.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
