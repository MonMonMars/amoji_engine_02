#!/usr/bin/env node
/**
 * Screenshot VRM companion arms-at-rest pose.
 *
 * Usage:
 *   node scripts/lab-serve.mjs --port 5173 &
 *   node scripts/companion-arms-smoke.mjs --url http://127.0.0.1:5173/prototypes/amoji-companion.html
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_URL =
  "http://127.0.0.1:5173/prototypes/vrm-arm-test.html";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

async function main() {
  const url = parseArg("--url", DEFAULT_URL);
  const outDir = parseArg("--out", join(__dirname, "../../artifacts"));
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#avatar-canvas", { timeout: 20000 });
  await page.waitForFunction(
    () => window.__armTest?.ready === true,
    undefined,
    { timeout: 45000 },
  );
  await page.waitForTimeout(1500);

  const armRotations = await page.evaluate(() => ({
    leftUpperArmZ: window.__armTest?.readArmZ?.() ?? null,
  }));

  const shotPath = join(outDir, "companion-arms-rest.png");
  await page.locator("#avatar-canvas").screenshot({ path: shotPath });

  const report = {
    ok: armRotations.leftUpperArmZ !== null && armRotations.leftUpperArmZ < -0.5,
    url,
    screenshot: shotPath,
    leftUpperArmZ: armRotations.leftUpperArmZ,
  };
  await writeFile(
    join(outDir, "companion-arms-smoke.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
