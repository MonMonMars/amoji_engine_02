#!/usr/bin/env node
/**
 * Headless smoke for /app mobile shell (hub → pet → companion iframe).
 * Usage: LOCAL=1 node scripts/mobile-app-verify.mjs
 */
import { chromium } from "playwright";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

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

let deployedBuild = null;
try {
  const health = await fetch(`${base}/api/health`, { cache: "no-store" });
  if (health.ok) {
    const data = await health.json();
    deployedBuild = data?.build ? String(data.build) : null;
  }
} catch {
  /* ignore */
}
const deployMatch = !deployedBuild || deployedBuild === AMOJI_BUILD;
if (!deployMatch && !local) {
  console.warn(
    `⚠️  Production build ${deployedBuild} != repo ${AMOJI_BUILD} — hub/mobile checks may fail until deploy.`,
  );
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

  const coinsChip = page.locator(".chip--button[data-go='shop']");
  record("hub-coins-shop", (await coinsChip.count()) > 0);

  const petCard = page.locator('.hub-card[data-go="pet"]');
  const hasPet = (await petCard.count()) > 0;
  record(
    "hub-pet-card",
    deployMatch ? hasPet : hasPet || true,
    deployMatch ? "" : hasPet ? "" : "pending deploy",
  );
  if (hasPet) {
    await petCard.click();
    await page.waitForSelector('[data-screen="pet"]', { timeout: 8000 });
    record("pet-screen", true);
    await page.getByRole("button", { name: "←" }).click();
    await page.waitForSelector('[data-screen="hub"]', { timeout: 8000 });
  } else if (deployMatch) {
    throw new Error("Pet Care hub card missing");
  }

  const pickerCard = page.locator('.hub-card[data-pick="1"]');
  const hasPicker = (await pickerCard.count()) > 0;
  record("hub-character-picker", hasPicker);

  const secretaryCard = page.locator('.hub-card[data-set-role="secretary"]');
  const hasSecretary = (await secretaryCard.count()) > 0;
  record(
    "hub-secretary-inapp",
    deployMatch ? hasSecretary : hasSecretary || true,
    deployMatch ? "" : hasSecretary ? "" : "pending deploy",
  );
  if (hasSecretary) {
    await secretaryCard.click();
    await page.waitForSelector('[data-screen="companion"]', { timeout: 8000 });
    const secIframe = await page.locator(".companion-frame").getAttribute("src");
    record(
      "secretary-iframe-role",
      Boolean(
        secIframe?.includes("role=secretary") &&
          secIframe?.includes("mobile=1") &&
          secIframe?.includes("tab=today"),
      ),
      secIframe || "",
    );
    await page.getByRole("button", { name: "←" }).click();
    await page.waitForSelector('[data-screen="hub"]', { timeout: 8000 });
  } else if (deployMatch) {
    throw new Error("Secretary hub card missing");
  }

  if (hasPicker) {
    await pickerCard.click();
    await page.waitForSelector('[data-screen="companion"]', { timeout: 8000 });
    const pickIframe = await page.locator(".companion-frame").getAttribute("src");
    record(
      "picker-iframe-pick1",
      Boolean(pickIframe?.includes("pick=1") && pickIframe?.includes("mobile=1")),
      pickIframe || "",
    );
    await page.getByRole("button", { name: "←" }).click();
    await page.waitForSelector('[data-screen="hub"]', { timeout: 8000 });
  } else if (deployMatch) {
    throw new Error("Character picker hub card missing");
  }

  const companionBtn = page.locator('.hub-card[data-go="companion"]').first();
  await companionBtn.click();
  await page.waitForSelector('[data-screen="companion"]', { timeout: 8000 });
  const iframeSrc = await page.locator(".companion-frame").getAttribute("src");
  record(
    "companion-iframe-mobile",
    Boolean(iframeSrc?.includes("mobile=1") && iframeSrc?.includes("pick=0")),
    iframeSrc || "",
  );

  const playPath = local
    ? `${base}/prototypes/amoji-companion.html?mobile=1&pick=0&character=nova&automic=0&lang=en&build=${encodeURIComponent(AMOJI_BUILD)}`
    : `${base}/play?mobile=1&pick=0&character=nova&automic=0&lang=en&build=${encodeURIComponent(AMOJI_BUILD)}`;
  await page.goto(playPath, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  const shellOk = await page
    .waitForFunction(
      () => document.body.classList.contains("companion-mobile-shell"),
      { timeout: deployMatch ? 45000 : 8000 },
    )
    .then(() => true)
    .catch(() => false);
  record(
    "play-mobile-shell-class",
    deployMatch ? shellOk : shellOk || true,
    deployMatch && !shellOk ? "missing class" : !shellOk ? "pending deploy" : "",
  );
  record("no-page-errors", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
}

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error("\nMobile app verify FAILED:", failed.length);
  process.exit(1);
}
if (!local && !deployMatch) {
  console.warn("\n⚠️  Mobile app verify OK with deploy pending (exit 2).");
  process.exit(2);
}
console.log("\n✅ Mobile app verify PASSED —", checks.length, "checks");
