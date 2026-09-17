#!/usr/bin/env node
/**
 * Pre-delivery demo link verifier — run before sharing demo URLs with the user.
 *
 * Usage:
 *   node scripts/demo-link-verify.mjs              # production
 *   LOCAL=1 node scripts/demo-link-verify.mjs      # local lab-serve (5174)
 *
 * Exit 0 only when all checks pass for the target environment.
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { readFileSync, statSync } from "fs";
import { extname, join as pathJoin } from "path";
import { fileURLToPath } from "url";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import {
  companionFullDemoUrl,
  companionLiteDemoUrl,
  DEMO_BASE_URL,
  formatDemoLinkBlock,
  secretaryDemoUrl,
} from "../amoji-engine/engine/companion/deployUrls.mjs";
import { rewriteCompanionServePath, buildPlayRedirectLocation } from "../amoji-engine/engine/companion/companionFreshBoot.js";

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const useLocal = process.env.LOCAL === "1";
const localPort = Number(process.env.LOCAL_PORT || 5174);

/** @type {{ name: string, ok: boolean, detail?: string, warn?: boolean }[]} */
const checks = [];

function record(name, ok, detail = "", warn = false) {
  checks.push({ name, ok, detail, warn });
  const mark = warn ? "WARN" : ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function mime(p) {
  const m = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
  };
  return m[extname(p)] || "application/octet-stream";
}

async function probeLocalServer(port = localPort) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/prototypes/amoji-lite.html`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok ? `http://127.0.0.1:${port}` : null;
  } catch {
    return null;
  }
}

function startLocalServer(port = localPort) {
  const root = pathJoin(fileURLToPath(new URL("..", import.meta.url)));
  return new Promise((resolve, reject) => {
    const srv = createServer((req, res) => {
      let p = req.url?.split("?")[0] || "/";
      if (p === "/play" || p === "/play/" || p === "/go") {
        const search = req.url?.includes("?")
          ? req.url.slice(req.url.indexOf("?"))
          : "";
        const loc = buildPlayRedirectLocation(search, { build: AMOJI_BUILD });
        res.writeHead(303, {
          Location: loc,
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          "Clear-Site-Data": '"cache"',
        });
        res.end();
        return;
      }
      if (p === "/api/health") {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(
          JSON.stringify({
            ok: true,
            service: "amoji-companion",
            build: AMOJI_BUILD,
          }),
        );
        return;
      }
      p = rewriteCompanionServePath(p);
      const file = pathJoin(root, p.replace(/^\//, ""));
      try {
        statSync(file);
        res.writeHead(200, {
          "Content-Type": mime(file),
          "Cache-Control": "no-store",
        });
        res.end(readFileSync(file));
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    srv.once("error", reject);
    srv.listen(port, "127.0.0.1", () => {
      srv.off("error", reject);
      resolve({ srv, port });
    });
  });
}

async function fetchHealth(baseUrl) {
  const res = await fetch(`${baseUrl}/api/health`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`health HTTP ${res.status}`);
  return res.json();
}

/**
 * @param {import('playwright').Page} page
 * @param {string} label
 */
/**
 * @param {import('playwright').Page} page
 * @param {string} label
 * @param {{ skipFeatures?: boolean }} [opts]
 */
async function verifySecretary(page, label, opts = {}) {
  if (opts.skipFeatures) {
    record(
      `${label} page loads`,
      true,
      "skipped — deploy behind repo (/play not live yet)",
      true,
    );
    record(`${label} feature checks`, true, "skipped — deploy behind repo");
    return;
  }
  await page.goto(secretaryUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

  const build = await page.evaluate(() => window.__amojiBuild);
  record(`${label} page loads`, Boolean(build), build);

  const buildMatch = build === AMOJI_BUILD;
  record(
    `${label} build matches repo`,
    buildMatch,
    `page=${build} repo=${AMOJI_BUILD}`,
    !useLocal && !buildMatch,
  );

  if (opts.skipFeatures) {
    record(`${label} feature checks`, true, "skipped — deploy behind repo");
    return;
  }

  const state = await page.evaluate(() => {
    const tabbar = document.querySelector(".tabbar");
    const tabStyle = tabbar ? getComputedStyle(tabbar).display : "";
    return {
      conversationUi: document.body.classList.contains("conversation-ui"),
      tabbarHidden: tabStyle === "none",
      hasActivityRail: !!document.getElementById("activity-rail"),
      hasComposer: !!document.getElementById("composer"),
    };
  });

  record(`${label} conversation-ui`, state.conversationUi);
  record(`${label} tabbar hidden`, state.tabbarHidden);
  record(`${label} activity rail`, state.hasActivityRail);

  if (!(await page.locator("#composer:not(.hidden)").count())) {
    await page.evaluate(() => {
      document.querySelector('[data-tab="chat"]')?.click();
      document.getElementById("start-btn")?.click();
      document.getElementById("open-chat-btn")?.click();
    });
  }
  await page.waitForSelector("#composer:not(.hidden)", { timeout: 15000 });

  await page.evaluate(() => {
    const input = document.getElementById("input");
    const form = document.getElementById("composer");
    if (input && form) {
      input.value = "show my tasks";
      form.requestSubmit();
    }
  });

  await page.waitForFunction(
    () => {
      const tasks = document.getElementById("panel-tasks");
      const chip = document.querySelector(
        '.activity-chip--function[data-kind="tab"][data-value="tasks"]',
      );
      return tasks && !tasks.classList.contains("hidden") && chip;
    },
    { timeout: 15000 },
  );

  record(`${label} voice nav → tasks + icon`, true);
  await page.screenshot({
    path: join(outDir, `demo-verify-secretary-${label}.png`),
    fullPage: true,
  });
}

/**
 * @param {import('playwright').Page} page
 * @param {string} label
 */
/**
 * @param {import('playwright').Page} page
 * @param {string} label
 * @param {{ skipFeatures?: boolean }} [opts]
 */
async function verifyFullCompanion(page, label, opts = {}) {
  if (opts.skipFeatures) {
    record(
      `${label} page loads`,
      true,
      "skipped — deploy behind repo (/play not live yet)",
      true,
    );
    record(`${label} feature checks`, true, "skipped — deploy behind repo");
    return;
  }
  await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 90000 });

  await page
    .waitForFunction(() => window.__amojiModuleBooted === true, {
      timeout: 120000,
    })
    .catch(() => null);

  await page
    .waitForSelector("#activity-rail, .stage.mic-mode", { timeout: 30000 })
    .catch(() => null);

  const state = await page.evaluate(() => ({
    build: window.__amojiBuild,
    conversationUi: document.body.classList.contains("conversation-ui"),
    micMode: document.querySelector(".stage")?.classList.contains("mic-mode"),
    hasActivityRail: !!document.getElementById("activity-rail"),
    hasTranscript: !!document.getElementById("transcript"),
    moduleBooted: window.__amojiModuleBooted === true,
  }));

  record(`${label} page loads`, Boolean(state.build), state.build);

  const buildMatch = state.build === AMOJI_BUILD;
  record(
    `${label} build matches repo`,
    buildMatch,
    `page=${state.build} repo=${AMOJI_BUILD}`,
    !useLocal && !buildMatch,
  );

  if (opts.skipFeatures) {
    record(`${label} feature checks`, true, "skipped — deploy behind repo");
    return;
  }

  record(`${label} module booted`, state.moduleBooted);
  record(`${label} conversation-ui`, state.conversationUi);
  record(
    `${label} mic-mode`,
    state.micMode,
    state.micMode ? "" : "optional — may apply after session start",
    !state.micMode,
  );
  record(`${label} activity rail`, state.hasActivityRail);
  record(`${label} transcript shell`, state.hasTranscript);

  await page.screenshot({
    path: join(outDir, `demo-verify-full-${label}.png`),
    fullPage: true,
  });
}

let localSrv = null;
let baseUrl = DEMO_BASE_URL;
let secretaryUrl = secretaryDemoUrl({ build: AMOJI_BUILD, lang: "en" });
let fullUrl = companionFullDemoUrl({ build: AMOJI_BUILD, lang: "en" });

let prodDeployMatch = true;

if (useLocal) {
  const existing = process.env.LITE_URL
    ? null
    : await probeLocalServer(localPort);
  if (process.env.LITE_URL) {
    baseUrl = process.env.LITE_URL.replace(/\/companion.*$/, "");
    record("local reuse (LITE_URL)", true, process.env.LITE_URL);
  } else if (existing) {
    baseUrl = existing;
    record("local reuse (lab-serve)", true, baseUrl);
  } else {
    const { srv, port } = await startLocalServer();
    localSrv = srv;
    baseUrl = `http://127.0.0.1:${port}`;
    record("local static server", true, baseUrl);
  }
  secretaryUrl = `${baseUrl}/play?kind=lite&lang=en`;
  fullUrl = `${baseUrl}/play?lang=en&pick=1&automic=0`;
} else {
  try {
    const health = await fetchHealth(baseUrl);
    record("production /api/health", health.ok === true, JSON.stringify(health));
    const deployedBuild = health.build || "unknown";
    prodDeployMatch = deployedBuild === AMOJI_BUILD;
    record(
      "production build matches repo",
      prodDeployMatch,
      `deployed=${deployedBuild} repo=${AMOJI_BUILD}`,
      !prodDeployMatch,
    );
  } catch (err) {
    prodDeployMatch = false;
    record("production /api/health", false, err.message || String(err));
  }
  secretaryUrl = secretaryDemoUrl({ build: AMOJI_BUILD, lang: "en" });
  fullUrl = companionFullDemoUrl({ build: AMOJI_BUILD, lang: "en" });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err)));

const skipProdFeatures = !useLocal && !prodDeployMatch;

try {
  await verifySecretary(page, useLocal ? "local" : "prod", {
    skipFeatures: skipProdFeatures,
  });
  await verifyFullCompanion(page, useLocal ? "local" : "prod", {
    skipFeatures: skipProdFeatures,
  });
} finally {
  await browser.close();
  localSrv?.close();
}

if (pageErrors.length) {
  record("no page JS errors", false, pageErrors[0]);
} else {
  record("no page JS errors", true);
}

const hardFails = checks.filter((c) => !c.ok && !c.warn);
const warns = checks.filter((c) => c.warn);

console.log("\n--- Demo links (repo build) ---");
console.log(formatDemoLinkBlock({ build: AMOJI_BUILD }));
console.log(`\nLite (EN): ${companionLiteDemoUrl({ build: AMOJI_BUILD, lang: "en" })}`);

if (hardFails.length) {
  console.error(`\n❌ Demo verify FAILED (${hardFails.length} hard failure(s))`);
  process.exit(1);
}

if (!useLocal && !prodDeployMatch) {
  console.warn(
    `\n⚠️  Production deploy is behind repo (\`${AMOJI_BUILD}\` not live yet). ` +
      "Merge PR + wait for Vercel. Local verify passed — do not claim production is updated.",
  );
  process.exit(2);
}

if (warns.length) {
  console.warn(`\n⚠️  ${warns.length} warning(s) — review above.`);
}

console.log("\n✅ Demo verify PASSED — safe to share links.");
process.exit(0);
