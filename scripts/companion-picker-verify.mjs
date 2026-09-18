#!/usr/bin/env node
/**
 * E2E verify character picker v4 — hero, featured row, filters, begin flow.
 *
 * Usage:
 *   node scripts/companion-picker-verify.mjs
 *   node scripts/companion-picker-verify.mjs --url http://127.0.0.1:5174/play?lang=en&pick=1&automic=0
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import {
  beginStartPickerSession,
  openInSessionCompanionPicker,
  switchCompanionInSession,
} from "./companion-picker-smoke-util.mjs";

const SESSION_ROOT = "#companion-character-picker";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

/** @type {{ name: string, ok: boolean, detail?: string }[]} */
const checks = [];
function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const url = parseArg(
  "--url",
  "http://127.0.0.1:5174/play?lang=en&pick=1&automic=0",
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });

await page
  .waitForFunction(
    () => {
      const splash = document.getElementById("amoji-boot-splash");
      const picker = document.getElementById("start-character-picker");
      return Boolean(
        splash ||
          (picker &&
            (picker.classList.contains("is-open") ||
              !picker.classList.contains("hide"))),
      );
    },
    { timeout: 15000 },
  )
  .catch(() => null);

const earlyBoot = await page.evaluate(() => {
  const canvas = document.getElementById("avatar-canvas");
  return {
    splash: Boolean(document.getElementById("amoji-boot-splash")),
    picker: Boolean(document.getElementById("start-character-picker")),
    canvasOpacity: canvas ? getComputedStyle(canvas).opacity : null,
  };
});
record("early boot splash or picker", earlyBoot.splash || earlyBoot.picker);
record(
  "canvas hidden at boot",
  earlyBoot.canvasOpacity === "0" ||
    earlyBoot.canvasOpacity === "0.02" ||
    earlyBoot.canvasOpacity === "0.04",
  `opacity=${earlyBoot.canvasOpacity ?? "missing"}`,
);

await page.waitForFunction(() => window.__amojiModuleBooted === true, {
  timeout: 120000,
});
await page.waitForSelector("#start-character-picker .picker-begin-btn:not([disabled])", {
  timeout: 90000,
});

const boot = await page.evaluate(() => {
  const picker = document.getElementById("start-character-picker");
  return {
    build: window.__amojiBuild,
    open: Boolean(picker && !picker.classList.contains("hide")),
    hero: Boolean(picker?.querySelector(".picker-hero-name")),
    featured: picker?.querySelectorAll(".picker-featured-row .companion-card").length ?? 0,
    roster: picker?.querySelectorAll(".companion-picker-grid .companion-card").length ?? 0,
    filters: picker?.querySelectorAll(".picker-filter-chip").length ?? 0,
    begin: Boolean(picker?.querySelector(".picker-begin-btn")),
  };
});

record("build matches repo", boot.build === AMOJI_BUILD, `${boot.build}`);
record("start picker open", boot.open);
record("hero preview", boot.hero);
record("featured row (4+)", boot.featured >= 4, String(boot.featured));
record("roster strip", boot.roster >= 8, String(boot.roster));
record("filter chips", boot.filters >= 4, String(boot.filters));
record("begin CTA", boot.begin);

await page.screenshot({
  path: join(outDir, "picker_verify_start.png"),
  fullPage: true,
});

await page.click('#start-character-picker [data-character-id="kizuna"]');
await page.waitForFunction(
  () => {
    const hero = document.querySelector("#start-character-picker .picker-hero-name");
    return hero?.textContent?.includes("Kizuna");
  },
  undefined,
  { timeout: 5000 },
);
record("hero updates on select", true);

await page.fill("#start-character-picker .picker-search", "zzznope");
await page.waitForSelector("#start-character-picker .picker-empty", {
  timeout: 5000,
});
record("empty filter state", true);

await page.fill("#start-character-picker .picker-search", "");
await beginStartPickerSession(page, {
  characterId: "nova",
  dismissTimeout: 120000,
});
record("begin chat dismisses picker", true);

await page.waitForFunction(
  () => window.__amojiStart?.sessionStarted === true,
  undefined,
  { timeout: 30000 },
);
record("session started", true);

await page.waitForFunction(() => !!document.getElementById("activity-rail"), {
  timeout: 30000,
});
record("activity rail mounted", true);

await openInSessionCompanionPicker(page);
const sessionFeatured = await page.evaluate(() => {
  const picker = document.getElementById("companion-character-picker");
  return picker?.querySelectorAll(".picker-featured-row .companion-card").length ?? 0;
});
record("in-session featured row (4+)", sessionFeatured >= 4, String(sessionFeatured));

await page.click(`${SESSION_ROOT} [data-character-id="ember"]`);
await page.click(`${SESSION_ROOT} .picker-switch-btn`);
await page.waitForFunction(
  () => !document.getElementById("companion-character-picker")?.classList.contains("is-open"),
  undefined,
  { timeout: 120000 },
);
record("in-session switch confirm", true);

await page.screenshot({
  path: join(outDir, "picker_verify_session.png"),
  fullPage: true,
});

record("no page errors", errors.length === 0, errors[0] || "");

await browser.close();

const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ build: AMOJI_BUILD, url, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
process.exit(failed.length ? 1 : 0);
