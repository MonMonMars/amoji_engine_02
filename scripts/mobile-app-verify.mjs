#!/usr/bin/env node
/**
 * Headless smoke for /app mobile shell (hub → pet → companion iframe).
 * Usage: LOCAL=1 node scripts/mobile-app-verify.mjs
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const local = process.env.LOCAL === "1";
const base =
  process.env.MOBILE_VERIFY_BASE ||
  (local ? "http://127.0.0.1:5178" : "https://temporary-rushing-oxygen-ok5jzhd.vercel.app");

async function probeBase() {
  try {
    const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(8000) });
    if (health.ok) return true;
  } catch {
    /* static lab may not expose /api/health */
  }
  try {
    const app = await fetch(`${base}/app/`, { signal: AbortSignal.timeout(8000) });
    return app.ok;
  } catch {
    return false;
  }
}

const checks = [];

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

if (!(await probeBase())) {
  console.error(`Mobile app verify: ${base} not reachable. Run lab-serve or set MOBILE_VERIFY_BASE.`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message || e)));

await page.addInitScript(() => {
  try {
    localStorage.setItem(
      "amoji.mobile.auth.v1",
      JSON.stringify({ token: "mobile-verify", userId: "mobile-verify-guest" }),
    );
  } catch {
    /* ignore */
  }
});

try {
  await page.goto(`${base}/app?lang=en`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-screen="hub"]', { timeout: 20000 });

  record("hub-loaded", true);

  const petCard = page.getByRole("button", { name: /Pet Care|寵物照顧/ });
  record("hub-pet-card", await petCard.count() > 0);
  await petCard.click();
  await page.waitForSelector('[data-screen="pet"]', { timeout: 8000 });
  record("pet-screen", true);
  await page.getByRole("button", { name: "←" }).click();
  await page.waitForSelector('[data-screen="hub"]', { timeout: 8000 });

  const companionBtn = page.locator('.hub-card[data-go="companion"]').first();
  await companionBtn.click();
  await page.waitForSelector('[data-screen="companion"]', { timeout: 8000 });
  const iframeSrc = await page.locator(".companion-frame").getAttribute("src");
  record(
    "companion-iframe-mobile",
    Boolean(iframeSrc?.includes("mobile=1") && iframeSrc?.includes("pick=0")),
    iframeSrc || "",
  );

  await page.goto(`${base}/play?mobile=1&pick=0&character=nova&automic=0&lang=en`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForFunction(
    () => document.body.classList.contains("companion-mobile-shell"),
    { timeout: 45000 },
  );
  record("play-mobile-shell-class", true);
  record("no-page-errors", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
}

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error("\nMobile app verify FAILED:", failed.length);
  process.exit(1);
}
console.log("\n✅ Mobile app verify PASSED —", checks.length, "checks");
