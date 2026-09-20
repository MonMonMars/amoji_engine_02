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
import { CHARACTER_IDS } from "../amoji-engine/engine/companion/companionCharacterCatalog.js";

const ROSTER_SIZE = CHARACTER_IDS.length;
import {
  beginStartPickerSession,
  openInSessionCompanionPicker,
  switchCompanionInSession,
} from "./companion-picker-smoke-util.mjs";
import { waitForPageFn } from "./playwrightPageUtil.mjs";

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

const verifyLang = parseArg("--lang", "en") === "yue" ? "yue" : "en";
const defaultUrl = `http://127.0.0.1:5174/play?lang=${verifyLang}&pick=1&automic=0`;
const url = parseArg("--url", defaultUrl);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });

await waitForPageFn(
  page,
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
).catch(() => null);

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

await waitForPageFn(
  page,
  () => {
    if (window.__amojiModuleBooted === true) return true;
    const btn = document.querySelector("#start-character-picker .picker-begin-btn");
    return Boolean(btn && !btn.disabled);
  },
  { timeout: 120000 },
);
await page.waitForSelector("#start-character-picker .picker-begin-btn:not([disabled])", {
  timeout: 90000,
});

await waitForPageFn(
  page,
  () => {
    const imgs = document.querySelectorAll(
      "#start-character-picker .companion-card-portrait img",
    );
    if (!imgs.length) return false;
    return [...imgs].every((img) => img.complete && img.naturalWidth > 0);
  },
  { timeout: 20000 },
).catch(() => null);

const boot = await page.evaluate(() => {
  const picker = document.getElementById("start-character-picker");
  const showcaseLayout = picker?.classList.contains("companion-picker--showcase");
  return {
    build: window.__amojiBuild,
    open: Boolean(picker && !picker.classList.contains("hide")),
    showcaseLayout,
    heroStage: Boolean(picker?.querySelector(".picker-showcase-stage")),
    hero: Boolean(picker?.querySelector(".picker-hero-name")),
    featured: picker?.querySelectorAll(".picker-featured-row .companion-card").length ?? 0,
    roster: picker?.querySelectorAll(".companion-picker-grid .companion-card").length ?? 0,
    stripCards: picker?.querySelectorAll(".companion-card--start-strip").length ?? 0,
    rosterDock: Boolean(picker?.querySelector(".picker-roster-dock")),
    horizontalRoster: Boolean(
      picker?.querySelector(".companion-picker-grid--roster"),
    ),
    filters: picker?.querySelectorAll(".picker-filter-chip").length ?? 0,
    toolbar: Boolean(picker?.querySelector(".picker-toolbar")),
    begin: Boolean(picker?.querySelector(".picker-begin-btn")),
    sceneChips: picker?.querySelectorAll(".picker-scene-chip").length ?? 0,
    sceneSection: Boolean(picker?.querySelector(".picker-scene-section")),
    sceneInBackgroundRow: Boolean(
      picker?.querySelector(".picker-background-row .picker-scene-section"),
    ),
    stackedLayout: Boolean(picker?.classList.contains("companion-picker--stacked-layout")),
  };
});

record("build matches repo", boot.build === AMOJI_BUILD, `${boot.build}`);
record("start picker open", boot.open);
record("showcase start layout", boot.showcaseLayout);
record("hero stage section", boot.heroStage);
record("hero preview", boot.hero);
record("roster dock", boot.rosterDock);
record("roster grid class", boot.horizontalRoster);
record(
  `full roster grid (${ROSTER_SIZE})`,
  boot.roster === ROSTER_SIZE,
  String(boot.roster),
);
record(
  "strip roster cards",
  boot.stripCards >= Math.min(8, ROSTER_SIZE),
  String(boot.stripCards),
);
record("no search toolbar", !boot.toolbar);
record("no filter chips", boot.filters === 0, String(boot.filters));
record("no featured row", boot.featured === 0, String(boot.featured));
record("begin CTA", boot.begin);
record("stacked start layout", boot.stackedLayout);
record(
  "background row on start picker",
  boot.sceneSection && boot.sceneInBackgroundRow && boot.sceneChips >= 18,
  String(boot.sceneChips),
);

const pickerChrome = await page.evaluate(() => {
  const tb = document.querySelector(".topbar");
  const comp = document.querySelector(".composer-wrap");
  const tbs = tb ? getComputedStyle(tb) : null;
  const cs = comp ? getComputedStyle(comp) : null;
  const atm = document.querySelector(".atmosphere");
  const bg = atm ? getComputedStyle(atm).backgroundImage : "";
  const arrows = document.querySelectorAll(
    "#start-character-picker .scroll-affordance-btn",
  ).length;
  const stage = document.querySelector(".stage");
  const stageW = stage?.getBoundingClientRect().width ?? 0;
  return {
    topbarHidden:
      !tb ||
      (tbs.visibility === "hidden" && Number(tbs.opacity) <= 0.01) ||
      tbs.display === "none",
    composerHidden:
      !comp ||
      (cs.visibility === "hidden" && Number(cs.opacity) <= 0.01) ||
      Number(cs.zIndex) <= 1,
    atmosphereUsesPng: /\.png/i.test(bg),
    scrollArrows: arrows,
    stageMaxWidthOk: stageW <= window.innerWidth + 2 && stageW >= 280,
    bodyPickerOpen: document.body.classList.contains("companion-picker-open"),
  };
});
record(
  "topbar hidden during start picker",
  pickerChrome.bodyPickerOpen && pickerChrome.topbarHidden,
  JSON.stringify(pickerChrome),
);
record(
  "composer hidden during start picker",
  pickerChrome.bodyPickerOpen && pickerChrome.composerHidden,
  JSON.stringify(pickerChrome),
);
record(
  "scene atmosphere uses PNG art",
  pickerChrome.atmosphereUsesPng,
  String(pickerChrome.atmosphereUsesPng),
);
record(
  "roster scroll arrows wired",
  pickerChrome.scrollArrows >= 2,
  String(pickerChrome.scrollArrows),
);
record(
  "unified app max width on stage",
  pickerChrome.stageMaxWidthOk,
  String(pickerChrome.stageMaxWidthOk),
);

const layout = await page.evaluate((minRoster) => {
  const footer = document.querySelector("#start-character-picker .picker-footer");
  const wrap = document.querySelector("#start-character-picker .start-picker-grid-wrap");
  const scene = document.querySelector(
    "#start-character-picker .picker-background-row .picker-scene-section",
  );
  const grid = document.querySelector("#start-character-picker .companion-picker-grid--start");
  const begin = document.querySelector("#start-character-picker .picker-begin-btn");
  const cards = document.querySelectorAll(
    "#start-character-picker .companion-picker-grid--start .companion-card",
  );
  const imgs = document.querySelectorAll(
    "#start-character-picker .companion-card-portrait img",
  );
  if (!footer || !wrap || !grid || !cards.length) {
    return { ok: false, reason: "missing footer, grid, or cards" };
  }
  const footerTop = footer.getBoundingClientRect().top;
  const wrapBottom = wrap.getBoundingClientRect().bottom;
  const gridBottom = grid.getBoundingClientRect().bottom;
  const sceneTop = scene?.getBoundingClientRect().top ?? gridBottom;
  const sceneBottom = scene?.getBoundingClientRect().bottom ?? wrapBottom;
  let visibleOverlap = 0;
  for (const card of cards) {
    const portrait = card.querySelector(".companion-card-portrait");
    if (!portrait) continue;
    const b = portrait.getBoundingClientRect();
    if (b.top >= footerTop - 1) continue;
    if (b.bottom > footerTop + 2) visibleOverlap += 1;
  }
  const beginTop = begin?.getBoundingClientRect().top ?? footerTop;
  const brokenImgs = Array.from(imgs).filter(
    (img) => !img.complete || img.naturalWidth === 0,
  ).length;
  const gridStyle = getComputedStyle(grid);
  const columnCount = gridStyle.gridTemplateColumns.split(" ").filter(Boolean).length;
  const horizontalRoster =
    gridStyle.gridAutoFlow === "column" ||
    gridStyle.overflowX === "auto" ||
    grid.scrollWidth > grid.clientWidth + 4;
  const cardNumbers = Array.from(
    document.querySelectorAll(
      "#start-character-picker .companion-card--start-strip .companion-card-number",
    ),
  ).map((el) => el.textContent?.trim());
  let minPortraitW = 999;
  for (const card of cards) {
    const portrait = card.querySelector(".companion-card-portrait");
    if (!portrait) continue;
    minPortraitW = Math.min(minPortraitW, portrait.getBoundingClientRect().width);
  }
  const cardsLargeEnough = Number.isFinite(minPortraitW) && minPortraitW >= 56;
  return {
    ok:
      sceneBottom <= footerTop + 2 &&
      wrapBottom <= sceneTop + 6 &&
      visibleOverlap === 0 &&
      brokenImgs === 0 &&
      grid.clientHeight >= 72 &&
      horizontalRoster &&
      cards.length >= minRoster &&
      cardsLargeEnough &&
      Boolean(scene),
    horizontalRoster,
    columnCount,
    minPortraitW,
    cardsLargeEnough,
    cardNumbers,
    visibleOverlap,
    wrapBottom,
    gridBottom,
    sceneTop,
    sceneBottom,
    footerTop,
    beginTop,
    gridH: grid.clientHeight,
    brokenImgs,
    cardCount: cards.length,
    imgCount: imgs.length,
  };
}, ROSTER_SIZE);
record(
  "begin btn not over thumbnails",
  layout.ok,
  layout.reason ||
    `visibleOverlap=${layout.visibleOverlap} gridH=${layout.gridH} broken=${layout.brokenImgs}`,
);
record(
  "horizontal roster with readable cards",
  layout.horizontalRoster &&
    layout.cardsLargeEnough &&
    layout.cardCount >= ROSTER_SIZE,
  `flow=${layout.horizontalRoster} cards=${layout.cardCount} minW=${layout.minPortraitW}`,
);
record(
  `strip cards numbered 1-${ROSTER_SIZE}`,
  Array.isArray(layout.cardNumbers) &&
    layout.cardNumbers.includes(String(ROSTER_SIZE)) &&
    layout.cardNumbers.includes("5"),
  JSON.stringify(layout.cardNumbers),
);

await page.setViewportSize({ width: 390, height: 580 });
await page.waitForTimeout(200);
const shortLayout = await page.evaluate(() => {
  const footer = document.querySelector("#start-character-picker .picker-footer");
  const wrap = document.querySelector("#start-character-picker .start-picker-grid-wrap");
  const cards = document.querySelectorAll(
    "#start-character-picker .companion-picker-grid--start .companion-card",
  );
  if (!footer || !wrap || !cards.length) return { ok: false, reason: "missing nodes" };
  const footerTop = footer.getBoundingClientRect().top;
  let visibleOverlap = 0;
  for (const card of cards) {
    const portrait = card.querySelector(".companion-card-portrait");
    if (!portrait) continue;
    const b = portrait.getBoundingClientRect();
    if (b.top >= footerTop - 1) continue;
    if (b.bottom > footerTop + 2) visibleOverlap += 1;
  }
  return {
    ok: wrap.getBoundingClientRect().bottom <= footerTop + 2 && visibleOverlap === 0,
    visibleOverlap,
    viewportH: window.innerHeight,
  };
});
record(
  "short viewport no footer overlap",
  shortLayout.ok,
  shortLayout.reason ||
    `overlap=${shortLayout.visibleOverlap} vh=${shortLayout.viewportH}`,
);
await page.setViewportSize({ width: 720, height: 844 });
await page.waitForTimeout(200);
const tabletHero = await page.evaluate(() => {
  const hero = document.querySelector("#start-character-picker .picker-hero");
  if (!hero) return { ok: false, reason: "no hero" };
  const style = getComputedStyle(hero);
  return {
    ok: style.flexDirection === "row" || style.flexDirection === "row-reverse",
    flexDirection: style.flexDirection,
    width: window.innerWidth,
  };
});
record(
  "tablet hero side-by-side",
  tabletHero.ok,
  tabletHero.reason || `${tabletHero.flexDirection} @ ${tabletHero.width}px`,
);
await page.setViewportSize({ width: 390, height: 844 });

await page.screenshot({
  path: join(outDir, `picker_verify_start_${verifyLang}.png`),
  fullPage: true,
});

await page.click('#start-character-picker [data-character-id="kizuna"]');
const heroUpdated = await page
  .waitForFunction(
    () => {
      const hero = document.querySelector("#start-character-picker .picker-hero-name");
      const text = String(hero?.textContent || "").trim();
      return /Kizuna|絆|绊/i.test(text);
    },
    undefined,
    { timeout: 12000 },
  )
  .then(() => true)
  .catch(() => false);
record("hero updates on select", heroUpdated);

if (boot.showcaseLayout || boot.stripCards > 0) {
  await page.click('#start-character-picker [data-character-id="ember"]');
  const emberSelected = await page.evaluate(() =>
    document
      .querySelector('#start-character-picker [data-character-id="ember"]')
      ?.classList.contains("is-selected"),
  );
  record("strip selection updates card", emberSelected);
} else if (boot.toolbar) {
  await page.fill("#start-character-picker .picker-search", "zzznope");
  await page.waitForSelector("#start-character-picker .picker-empty", {
    timeout: 5000,
  });
  record("empty filter state", true);
  await page.fill("#start-character-picker .picker-search", "");
} else {
  record("grid selection path", false, "no showcase strip or search toolbar");
}
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

await page
  .waitForFunction(
    () => window.__amojiAvatarKind === "vrm3d" && window.__amojiAvatar?.vrm,
    undefined,
    { timeout: 120000 },
  )
  .catch(() => null);
await page.waitForTimeout(2500);

const idleLimbs = await page.evaluate(async () => {
  const avatar = window.__amojiAvatar;
  avatar?.setTalking?.(false);
  avatar?.stopAction?.();
  const vrm = avatar?.vrm;
  const bone = (name) => {
    const node = vrm?.humanoid?.getNormalizedBoneNode?.(name);
    if (!node) return null;
    return {
      x: Number(node.rotation?.x) || 0,
      y: Number(node.rotation?.y) || 0,
      z: Number(node.rotation?.z) || 0,
    };
  };
  await new Promise((r) => setTimeout(r, 800));
  const leftFoot = bone("leftFoot");
  const rightFoot = bone("rightFoot");
  const leftUpperArm = bone("leftUpperArm");
  const rightUpperArm = bone("rightUpperArm");
  const leftLowerLeg = bone("leftLowerLeg");
  const rightLowerLeg = bone("rightLowerLeg");
  const footDy =
    leftFoot && rightFoot ? Math.abs(leftFoot.y - rightFoot.y) : null;
  const armsForward =
    leftUpperArm &&
    rightUpperArm &&
    leftUpperArm.x > 0.55 &&
    rightUpperArm.x > 0.55;
  const legsStride =
    leftLowerLeg &&
    rightLowerLeg &&
    Math.abs(leftLowerLeg.x - rightLowerLeg.x) > 0.35;
  const vrmaPlaying = Boolean(
    avatar?.getMotionStatus?.()?.animating ||
      avatar?.getMotionStatus?.()?.libraryOwnsBody,
  );
  return {
    footDy,
    armsForward,
    legsStride,
    vrmaPlaying,
    leftUpperArmZ: leftUpperArm?.z,
    rightUpperArmZ: rightUpperArm?.z,
  };
});
record(
  "idle limbs planted (no VRMA body blend)",
  !idleLimbs.vrmaPlaying &&
    !idleLimbs.armsForward &&
    !idleLimbs.legsStride &&
    (idleLimbs.footDy == null || idleLimbs.footDy < 0.12),
  JSON.stringify(idleLimbs),
);

const springGravity = await page.evaluate(() => {
  return (
    window.__amojiAvatar?.auditSpringGravity?.({ tune: true }) || {
      ok: false,
      count: 0,
      maxY: null,
      reason: "no-audit",
    }
  );
});
record(
  "spring gravity points down (no wind from below)",
  springGravity.ok,
  JSON.stringify(springGravity),
);

await waitForPageFn(page, () => !!document.getElementById("activity-rail"), {
  timeout: 30000,
});
record("activity rail mounted", true);

await openInSessionCompanionPicker(page);
const sessionAaa = await page.evaluate(() => {
  const picker = document.getElementById("companion-character-picker");
  return {
    aaa: picker?.classList.contains("companion-picker--aaa-theme"),
    session: picker?.classList.contains("companion-picker--session"),
  };
});
record("in-session AAA theme", sessionAaa.aaa && sessionAaa.session);

const sessionFeatured = await page.evaluate(() => {
  const picker = document.getElementById("companion-character-picker");
  return picker?.querySelectorAll(".picker-featured-row .companion-card").length ?? 0;
});
record("in-session featured row (4+)", sessionFeatured >= 4, String(sessionFeatured));
const sessionScene = await page.evaluate(() => {
  const picker = document.getElementById("companion-character-picker");
  return {
    section: Boolean(picker?.querySelector(".picker-roster-panel .picker-scene-section")),
    chips: picker?.querySelectorAll(".picker-scene-chip").length ?? 0,
  };
});
record(
  "in-session background row",
  sessionScene.section && sessionScene.chips >= 8,
  String(sessionScene.chips),
);

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
