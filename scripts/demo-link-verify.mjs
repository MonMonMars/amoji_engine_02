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
  companionFullDirectUrl,
  companionLiteDemoUrl,
  companionLiteDirectUrl,
  DEMO_BASE_URL,
  formatDemoLinkBlock,
  secretaryDemoUrl,
} from "../amoji-engine/engine/companion/deployUrls.mjs";
import { rewriteCompanionServePath, buildPlayRedirectLocation } from "../amoji-engine/engine/companion/companionFreshBoot.js";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";

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

/** @param {string} base */
async function probePlayEntry(base) {
  try {
    const res = await fetch(`${base}/play`, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.status === 200 || res.status === 303 || res.status === 307;
  } catch {
    return false;
  }
}

/** Wait for /play client redirect to land on lite or full shell. */
async function gotoCompanionEntry(page, url, timeout = 90000) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout });
  await page
    .waitForFunction(
      () =>
        Boolean(
          window.__amojiBuild &&
            (window.__amojiLite?.ready ||
              document.body.classList.contains("conversation-ui") ||
              window.__amojiModuleBooted ||
              document.getElementById("start-character-picker") ||
              document.getElementById("panel-today")),
        ),
      { timeout },
    )
    .catch(() => null);
}

async function verifySecretary(page, label) {
  await gotoCompanionEntry(page, secretaryUrl);
  await verifyBootPaint(page, `${label} secretary`);

  await page
    .waitForFunction(() => window.__amojiModuleBooted === true, {
      timeout: 120000,
    })
    .catch(() => null);

  await page
    .waitForSelector("#activity-rail", { state: "attached", timeout: 30000 })
    .catch(() => null);

  const build = await page.evaluate(() => window.__amojiBuild);
  record(`${label} page loads`, Boolean(build), build);

  const buildMatch = build === AMOJI_BUILD;
  record(
    `${label} build matches repo`,
    buildMatch,
    `page=${build} repo=${AMOJI_BUILD}`,
    !useLocal && !buildMatch,
  );

  const state = await page.evaluate(() => ({
    conversationUi: document.body.classList.contains("conversation-ui"),
    roleSecretary: document.body.classList.contains("companion-role-secretary"),
    roleReadout: !!document.getElementById("settings-role-readout"),
    companionPicker: !!document.getElementById("settings-btn-companions"),
    hasActivityRail: !!document.getElementById("activity-rail"),
    hasCanvas: !!document.getElementById("avatar-canvas"),
    hasComposer: !!document.getElementById("composer"),
  }));

  record(`${label} conversation-ui`, state.conversationUi);
  record(`${label} unified secretary role`, state.roleSecretary);
  record(`${label} character function readout`, state.roleReadout);
  record(`${label} 3D canvas`, state.hasCanvas);
  record(`${label} activity rail`, state.hasActivityRail);

  await page.click("#btn-open-setup").catch(() => null);
  await page
    .waitForSelector("#settings-role-readout", { timeout: 15000 })
    .catch(() => null);
  record(`${label} companion function menu`, state.roleReadout && state.companionPicker);

  await page.click("#settings-btn-secretary-today").catch(() => null);
  await page
    .waitForSelector(".secretary-overlay.is-open", { timeout: 15000 })
    .catch(() => null);

  const panelOpen = await page.evaluate(
    () => document.querySelector(".secretary-overlay.is-open") != null,
  );
  record(`${label} Today panel in 3D app`, panelOpen);

  await page.screenshot({
    path: join(outDir, `demo-verify-secretary-${label}.png`),
    fullPage: true,
  });
}

async function verifyBootPaint(page, label) {
  await page
    .waitForFunction(
      () => {
        const splash = document.getElementById("amoji-boot-splash");
        const picker = document.getElementById("start-character-picker");
        const pickerOpen =
          picker &&
          (picker.classList.contains("is-open") ||
            (!picker.classList.contains("hide") &&
              picker.getAttribute("aria-hidden") !== "true"));
        return Boolean(splash || pickerOpen);
      },
      { timeout: 15000 },
    )
    .catch(() => null);

  const boot = await page.evaluate(() => {
    const canvas = document.getElementById("avatar-canvas");
    const splash = document.getElementById("amoji-boot-splash");
    const picker = document.getElementById("start-character-picker");
    const pickerOpen =
      picker &&
      (picker.classList.contains("is-open") ||
        (!picker.classList.contains("hide") &&
          picker.getAttribute("aria-hidden") !== "true"));
    const canvasOpacity = canvas ? getComputedStyle(canvas).opacity : null;
    return {
      splash: Boolean(splash),
      pickerOpen: Boolean(pickerOpen),
      canvasOpacity,
      bodyText: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 80),
    };
  });

  record(
    `${label} boot splash or picker visible`,
    boot.splash || boot.pickerOpen,
    boot.splash ? "splash" : boot.pickerOpen ? "picker" : boot.bodyText,
  );
  record(
    `${label} canvas hidden before avatar`,
    boot.canvasOpacity === "0" || boot.canvasOpacity === "0.02" || boot.canvasOpacity === "0.04",
    `opacity=${boot.canvasOpacity ?? "missing"}`,
    boot.canvasOpacity === "1",
  );

  await page.screenshot({
    path: join(outDir, `demo-verify-boot-${label}.png`),
    fullPage: true,
  });
}

async function verifyFullCompanion(page, label) {
  await gotoCompanionEntry(page, fullUrl);

  await verifyBootPaint(page, label);

  await page
    .waitForFunction(() => window.__amojiModuleBooted === true, {
      timeout: 120000,
    })
    .catch(() => null);

  const pickerOpen = await page.evaluate(() => {
    const picker = document.getElementById("start-character-picker");
    return Boolean(
      picker &&
        !picker.classList.contains("hide") &&
        picker.getAttribute("aria-hidden") !== "true",
    );
  });

  if (pickerOpen) {
    const pickerChrome = await page.evaluate(() => {
      const picker = document.getElementById("start-character-picker");
      return {
        hero: Boolean(picker?.querySelector(".picker-hero")),
        showcase: picker?.classList.contains("companion-picker--showcase"),
        heroStage: Boolean(picker?.querySelector(".picker-showcase-stage")),
        rosterStrip: Boolean(picker?.querySelector(".companion-picker-grid--roster")),
        stripCards:
          picker?.querySelectorAll(".companion-card--start-strip").length ?? 0,
        featured: Boolean(picker?.querySelector(".picker-featured-row")),
        begin: Boolean(picker?.querySelector(".picker-begin-btn")),
        filters: Boolean(picker?.querySelector(".picker-filters")),
      };
    });
    record(`${label} picker v4 hero`, pickerChrome.hero);
    record(`${label} picker showcase layout`, pickerChrome.showcase);
    record(`${label} picker hero stage`, pickerChrome.heroStage);
    record(
      `${label} picker roster strip`,
      pickerChrome.rosterStrip && pickerChrome.stripCards >= 8,
      String(pickerChrome.stripCards),
    );
    record(`${label} picker begin CTA`, pickerChrome.begin);
    record(`${label} picker no search toolbar`, !pickerChrome.filters);
    record(`${label} picker no featured row`, !pickerChrome.featured);
    await page.screenshot({
      path: join(outDir, `demo-verify-picker-${label}.png`),
      fullPage: true,
    });
    await beginStartPickerSession(page, {
      cardTimeout: 90000,
      dismissTimeout: 120000,
    });
    record(`${label} picker begin chat`, true);
  }

  await page
    .waitForSelector("#activity-rail", { state: "attached", timeout: 30000 })
    .catch(() => null);

  const state = await page.evaluate(() => ({
    build: window.__amojiBuild,
    conversationUi: document.body.classList.contains("conversation-ui"),
    micMode: document.querySelector(".stage")?.classList.contains("mic-mode"),
    hasActivityRail: !!document.getElementById("activity-rail"),
    hasTranscript: !!document.getElementById("transcript"),
    moduleBooted: window.__amojiModuleBooted === true,
    sessionStarted: window.__amojiStart?.sessionStarted === true,
  }));

  record(`${label} page loads`, Boolean(state.build), state.build);

  const buildMatch = state.build === AMOJI_BUILD;
  record(
    `${label} build matches repo`,
    buildMatch,
    `page=${state.build} repo=${AMOJI_BUILD}`,
    !useLocal && !buildMatch,
  );

  record(`${label} module booted`, state.moduleBooted);
  if (pickerOpen) {
    record(`${label} session started`, state.sessionStarted);
  }
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
let deployedBuild = AMOJI_BUILD;
let playEntryOk = true;

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
  secretaryUrl = `${baseUrl}/play?role=secretary&lang=en&pick=0&autostart=1&tab=today`;
  fullUrl = `${baseUrl}/play?lang=en&pick=1&automic=0`;
} else {
  try {
    const health = await fetchHealth(baseUrl);
    record("production /api/health", health.ok === true, JSON.stringify(health));
    deployedBuild = health.build || "unknown";
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
  playEntryOk = await probePlayEntry(baseUrl);
  record(
    "production /play entry",
    playEntryOk,
    playEntryOk ? "ok" : "404 — using /companion-full fallback",
    !playEntryOk,
  );
  if (playEntryOk) {
    secretaryUrl = secretaryDemoUrl({ build: AMOJI_BUILD, lang: "en" });
    fullUrl = companionFullDemoUrl({ build: AMOJI_BUILD, lang: "en" });
  } else {
    secretaryUrl = `${baseUrl}/companion?lang=en&tab=today&build=${encodeURIComponent(deployedBuild)}&_cb=${Date.now()}`;
    fullUrl = companionFullDirectUrl({
      lang: "en",
      build: deployedBuild,
      cacheBust: Date.now(),
    }).replace(DEMO_BASE_URL, baseUrl);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err)));

try {
  await verifySecretary(page, useLocal ? "local" : "prod");
  await verifyFullCompanion(page, useLocal ? "local" : "prod");
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
