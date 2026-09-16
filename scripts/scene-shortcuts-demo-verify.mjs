#!/usr/bin/env node
/**
 * E2E verify: minimal composer + scene/chat/speaker shortcuts.
 * Usage:
 *   node scripts/scene-shortcuts-demo-verify.mjs
 *   node scripts/scene-shortcuts-demo-verify.mjs --url https://temporary-rushing-oxygen-ok5jzhd.vercel.app/companion-full?lang=en
 */
import { chromium } from "playwright";
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

await page.waitForSelector(
  "#start-character-picker .companion-card:not([disabled])",
  { timeout: 90000 },
);

const novaCard = page.locator(
  '#start-character-picker .companion-card[data-character-id="nova"]',
);
if (await novaCard.count()) {
  await novaCard.first().click();
} else {
  await page.click("#start-character-picker .companion-card:not([disabled])");
}

await page.waitForFunction(
  () => {
    const picker = document.getElementById("start-character-picker");
    return !picker || picker.classList.contains("hide");
  },
  { timeout: 60000 },
);

record("session started", true);

const ui = await page.evaluate(() => ({
  chatBtn: !!document.getElementById("btn-toggle-chat"),
  sceneBtn: !!document.getElementById("btn-open-scene"),
  speakerBtn: !!document.getElementById("btn-speaker"),
  menuBtn: !!document.getElementById("btn-open-setup"),
  composer: !!document.getElementById("input"),
}));
record("chat shortcut", ui.chatBtn);
record("scene shortcut", ui.sceneBtn);
record("speaker shortcut", ui.speakerBtn);
record("menu shortcut", ui.menuBtn);
record("composer visible", ui.composer);

const starterVisible = await page.evaluate(() => {
  const el = document.getElementById("starter-prompts");
  return !!el && !el.hidden && el.querySelectorAll(".starter-chip").length >= 2;
});
record("starter prompts visible", starterVisible);

await page.click("#btn-open-scene");
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

await page.click("#scene-sheet-close");

const statusDotListening = await page.evaluate(() => {
  const dot = document.getElementById("status-dot");
  return dot?.dataset?.state === "typing" || dot?.dataset?.state === "listening";
});
record("voice status dot active", statusDotListening);

await page.click("#btn-toggle-chat");
await page.waitForTimeout(300);
const chatHidden = await page.evaluate(() =>
  document.body.classList.contains("chat-panel-hidden"),
);
record("chat panel toggles", chatHidden);
await page.screenshot({
  path: `${artifacts}/demo-stage-clean.png`,
  fullPage: false,
});

await page.click("#btn-speaker");
await page.waitForTimeout(200);
const speakerMuted = await page.evaluate(
  () => document.getElementById("btn-speaker")?.getAttribute("aria-pressed") === "false",
);
record("speaker mutes", speakerMuted);

await page.evaluate(() => {
  document.body.classList.add("mic-blocked");
  const input = document.getElementById("input");
  const form = document.getElementById("composer");
  if (input && form) {
    input.value = "Hello Nova";
    form.requestSubmit();
  }
});
await page.waitForSelector(".msg-row.user .bubble", { timeout: 10000 });
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

await page.waitForFunction(
  () =>
    document.querySelectorAll(".msg-row.assistant.has-actions .msg-action-btn").length >=
    2,
  { timeout: 30000 },
);

const copyWorks = await page.evaluate(async () => {
  const row = document.querySelector(".msg-row.assistant.has-actions");
  const buttons = row ? [...row.querySelectorAll(".msg-action-btn")] : [];
  if (buttons.length < 2) return false;
  buttons[0].click();
  await new Promise((r) => setTimeout(r, 120));
  return true;
});
record("message actions on assistant", copyWorks);

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
