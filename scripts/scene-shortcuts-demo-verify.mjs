#!/usr/bin/env node
/**
 * E2E verify: minimal composer + scene/chat/speaker shortcuts.
 * Usage:
 *   node scripts/scene-shortcuts-demo-verify.mjs
 *   node scripts/scene-shortcuts-demo-verify.mjs --url https://temporary-rushing-oxygen-ok5jzhd.vercel.app/companion-full?lang=en
 */
import { chromium } from "playwright";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";
import { mkdirSync } from "fs";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const artifacts = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(artifacts, { recursive: true });

const baseUrl = parseArg(
  "--url",
  "http://127.0.0.1:5174/prototypes/amoji-companion.html?lang=en&automic=0&pick=1",
);

/** @type {{ name: string, ok: boolean, detail?: string }[]} */
const checks = [];
const record = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err)));

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__amojiModuleBooted === true, {
  timeout: 120000,
});

const build = await page.evaluate(() => window.__amojiBuild);
record("module booted", true, build);
record(
  "build matches repo",
  build === AMOJI_BUILD,
  `page=${build} repo=${AMOJI_BUILD}`,
);

await beginStartPickerSession(page, {
  characterId: "nova",
  cardTimeout: 90000,
  dismissTimeout: 60000,
});

const sessionReady = await page
  .waitForFunction(
    () => window.__amojiStart?.sessionStarted === true,
    { timeout: 30000 },
  )
  .then(() => true)
  .catch(() => false);
record("session started", sessionReady);

await page
  .waitForFunction(
    () => {
      const el = document.getElementById("starter-prompts");
      return el && !el.hidden && el.querySelectorAll(".starter-chip").length >= 2;
    },
    { timeout: 20000 },
  )
  .catch(() => null);

const ui = await page.evaluate(() => ({
  chatMenu: !!document.getElementById("settings-btn-chat"),
  sceneMenu: !!document.getElementById("settings-btn-scene"),
  speakerBtn: !!document.getElementById("settings-btn-speaker"),
  composerSpeakerBtn: !!document.getElementById("btn-speaker"),
  menuBtn: !!document.getElementById("btn-open-setup"),
  composer: !!document.getElementById("input"),
  legacyChatBtn: !!document.getElementById("btn-toggle-chat"),
  legacySceneBtn: !!document.getElementById("btn-open-scene"),
}));
record("chat in menu", ui.chatMenu);
record("scene in menu", ui.sceneMenu);
record("speaker in menu", ui.speakerBtn);
record("composer speaker hidden", !ui.composerSpeakerBtn);
record("menu shortcut", ui.menuBtn);
record("composer visible", ui.composer);
record("legacy topbar removed", !ui.legacyChatBtn && !ui.legacySceneBtn);

const starterVisible = await page.evaluate(() => {
  const el = document.getElementById("starter-prompts");
  return !!el && !el.hidden && el.querySelectorAll(".starter-chip").length >= 2;
});
record("starter prompts visible", starterVisible);

await page.click("#btn-open-setup");
await page.waitForSelector("#settings.open", { timeout: 5000 });
await page.click("#settings-btn-scene");
await page.waitForSelector("#scene-sheet.open", { timeout: 5000 });
record("scene sheet opens", true);
await page.screenshot({
  path: `${artifacts}/demo-scene-sheet-open.png`,
  fullPage: false,
});

await page.click('.scene-preset__swatch--aurora');
await page.waitForTimeout(400);
const aurora = await page.evaluate(
  () => document.querySelector(".atmosphere")?.dataset?.sceneBg === "aurora",
);
record("aurora background applies", aurora);
const casualOutfit = page.locator(
  '#scene-outfit-grid .scene-preset:not([disabled]):has(.scene-preset__swatch--outfit-casual)',
);
if (await casualOutfit.count()) {
  await casualOutfit.first().click();
  await page.waitForTimeout(300);
  const casualApplied = await page.evaluate(
    () => document.querySelector(".stage")?.dataset?.sceneOutfit === "casual",
  );
  record("casual outfit applies", casualApplied);
} else {
  record("casual outfit applies", false, "no outfit button");
}

await page.evaluate(() => {
  document.getElementById("settings")?.classList.remove("open");
  document.getElementById("settings-backdrop")?.classList.remove("is-open");
  document.body.classList.remove("settings-open");
});
await page.click("#scene-sheet-close");

const statusDotReady = await page.evaluate(() => {
  const mic = document.getElementById("btn-mic");
  const hasCanvas = Boolean(mic?.querySelector("canvas.companion-chip__dot-canvas"));
  const micState = mic?.getAttribute("data-mic-state") || "";
  const textMode = document.body.classList.contains("composer-text-mode");
  return (
    hasCanvas &&
    (textMode ||
      micState === "idle" ||
      micState === "listening" ||
      micState === "speaking")
  );
});
record("voice status dot ready", statusDotReady);

const closeSettingsPanel = async () => {
  await page.evaluate(() => {
    document.getElementById("settings-close")?.click();
    document.getElementById("settings")?.classList.remove("open");
    document.getElementById("settings-backdrop")?.classList.remove("is-open");
    document.body.classList.remove("settings-open");
  });
  await page.waitForTimeout(350);
};

await page.click("#btn-open-setup");
await page.waitForSelector("#settings.open", { timeout: 5000 });
await page.click("#settings-btn-chat");
await page.waitForTimeout(300);
const chatHidden = await page.evaluate(() =>
  document.body.classList.contains("chat-panel-hidden"),
);
record("chat panel toggles", chatHidden);
await closeSettingsPanel();
await page.screenshot({
  path: `${artifacts}/demo-stage-clean.png`,
  fullPage: false,
});

await page.click("#btn-open-setup");
await page.waitForSelector("#settings.open", { timeout: 5000 });
await page.click("#settings-btn-speaker");
await page.waitForTimeout(200);
const speakerMuted = await page.evaluate(
  () => document.getElementById("settings-btn-speaker")?.getAttribute("aria-pressed") === "false",
);
record("speaker mutes", speakerMuted);
await closeSettingsPanel();

await page.evaluate(() => {
  document.body.classList.remove("chat-panel-hidden");
  document.body.classList.add("mic-blocked");
  const input = document.getElementById("input");
  const form = document.getElementById("composer");
  if (input && form) {
    input.value = "Hello Nova";
    form.requestSubmit();
  }
});
await page.waitForSelector(".msg-row.user .bubble:not(.hidden)", { timeout: 15000 }).catch(() =>
  page.waitForSelector(".msg-row.user .bubble", { timeout: 5000, state: "attached" }),
);
record("text send works", true);

await page.waitForFunction(
  () => {
    const rows = document.querySelectorAll(".msg-row.assistant .bubble");
    const last = rows[rows.length - 1];
    return (
      last &&
      !last.classList.contains("thinking") &&
      !last.classList.contains("typing") &&
      last.textContent?.length > 2
    );
  },
  { timeout: 60000 },
);
record("assistant reply received", true);

const noLegacyMsgActions = await page.evaluate(
  () => document.querySelectorAll(".msg-action-btn").length === 0,
);
record("no legacy message action buttons", noLegacyMsgActions);

const starterHidden = await page.evaluate(() => {
  const el = document.getElementById("starter-prompts");
  return !!el && el.hidden;
});
record("starter prompts hide after chat", starterHidden);

await page.screenshot({
  path: `${artifacts}/demo-chat-reply.png`,
  fullPage: false,
});

record("no page JS errors", pageErrors.length === 0, pageErrors[0] || "");

await browser.close();

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error("\n❌ Scene shortcuts demo verify FAILED");
  process.exit(1);
}
console.log("\n✅ Scene shortcuts demo verify PASSED");
console.log(`Demo URL tested: ${baseUrl}`);
