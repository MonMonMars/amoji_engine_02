#!/usr/bin/env node
/**
 * End-to-end check of every companion issue Mon reported.
 * Usage:
 *   node scripts/companion-issues-verify.mjs --url http://127.0.0.1:5178/companion-full
 */
import { writeFileSync, mkdirSync } from "fs";
import { chromium } from "playwright";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import {
  needsWebSearch,
  shouldTryWebSearch,
} from "../amoji-engine/engine/companion/companionWebSearch.mjs";
import { localCompanionReply } from "../amoji-engine/engine/companion/companionLocalReply.mjs";

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

const checks = [];
function record(name, ok, detail = "") {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const base = parseArg(
    "--url",
    "http://127.0.0.1:5178/companion-full?lang=yue&automic=0",
  );
  const url = new URL(base);
  url.searchParams.set("lang", url.searchParams.get("lang") || "yue");
  url.searchParams.set("automic", "0");
  url.searchParams.set("build", AMOJI_BUILD);

  record(
    "search-gating-casual",
    !needsWebSearch("今日點呀？") &&
      !needsWebSearch("how are you") &&
      !needsWebSearch("show me kung fu") &&
      !shouldTryWebSearch("今日點呀？", { basicMode: true }),
  );
  record(
    "search-gating-facts",
    needsWebSearch("今日香港天氣點呀？") && needsWebSearch("what is AI?"),
  );
  const junk = localCompanionReply(
    "今日點呀？",
    [],
    "Optional web snapshot.\nBreaking: random English stock dump",
  );
  record("local-reply-no-web-dump", !/Breaking: random English stock dump/i.test(junk));

  const apiBase = new URL(url);
  apiBase.pathname = "/api/chat";
  for (const prompt of ["今日點呀？", "how are you", "show me kung fu"]) {
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, providerId: "basic" }),
      });
      const data = await res.json();
      const reply = String(data.reply || "");
      const dumped =
        /Creative Commons|Wiktionary|Ray Davies|Kung Fu School|stock dump/i.test(
          reply,
        );
      record(
        `chat-casual:${prompt}`,
        res.ok && data.mode !== "local+web" && !dumped && reply.length > 0,
        `${data.mode} ${reply.slice(0, 72)}`,
      );
    } catch (err) {
      record(`chat-casual:${prompt}`, false, err.message);
    }
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const loadedModels = [];
  page.on("request", (req) => {
    const href = req.url();
    if (/\.(vrm|glb)(\?|$)/i.test(href)) loadedModels.push(href);
  });

  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => window.__amojiStart?.ready === true, null, {
    timeout: 90000,
  });

  const boot = await page.evaluate(() => {
    const picker = document.getElementById("start-character-picker");
    const ring = picker?.querySelector(".start-picker-preload-ring, .companion-progress-ring");
    const bar = picker?.querySelector(".start-picker-preload-track, .companion-switch-bar");
    const chip = document.getElementById("brand-btn");
    const orbit = document.getElementById("orbit-hit");
    const dock = document.querySelector(".companion-progress-dock-inner");
    return {
      build: window.__amojiBuild,
      pickerOpen: Boolean(picker && picker.classList.contains("is-open")),
      ring: Boolean(ring),
      bar: Boolean(bar),
      chip: Boolean(chip),
      orbit: Boolean(orbit),
      dockCircle: dock
        ? getComputedStyle(dock).borderRadius.includes("50%") ||
          dock.getBoundingClientRect().width === dock.getBoundingClientRect().height
        : true,
      progressBarClass: Boolean(document.querySelector(".start-picker-preload-track")),
    };
  });
  record("build-id", boot.build === AMOJI_BUILD, `${boot.build} vs ${AMOJI_BUILD}`);
  record("start-picker-open", boot.pickerOpen);
  record("loading-ring-not-bar", boot.ring && !boot.bar && !boot.progressBarClass);
  record("character-chip", boot.chip);
  record("orbit-hit", boot.orbit);
  record("progress-dock-circle", boot.dockCircle);

  await page.screenshot({
    path: `${outDir}/issues_verify_picker.png`,
    animations: "disabled",
  });

  const novaCard = page.locator('#start-character-picker [data-character-id="nova"]');
  await novaCard.waitFor({ timeout: 30000 });
  await novaCard.scrollIntoViewIfNeeded();
  await novaCard.click();

  await page.waitForFunction(
    () => window.__amojiAvatarKind === "vrm3d" && window.__amojiAvatar?.vrm,
    null,
    { timeout: 120000 },
  );
  await page.waitForTimeout(2500);

  const afterNova = await page.evaluate(() => {
    const vrm = window.__amojiAvatar?.vrm;
    const bone = (name) => {
      const node = vrm?.humanoid?.getNormalizedBoneNode?.(name);
      if (!node) return null;
      return {
        x: Number(node.rotation?.x) || 0,
        y: Number(node.position?.y) || 0,
      };
    };
    const expr = vrm?.expressionManager;
    const exprVal = (name) => {
      try {
        return Number(expr?.getValue?.(name) ?? 0);
      } catch {
        return 0;
      }
    };
    const leftFoot = bone("leftFoot");
    const rightFoot = bone("rightFoot");
    return {
      kind: window.__amojiAvatarKind,
      character: window.localStorage?.getItem("amoji.companion.characterId"),
      pose: {
        leftForearmX: bone("leftLowerArm")?.x,
        rightForearmX: bone("rightLowerArm")?.x,
        leftLowerLegX: bone("leftLowerLeg")?.x,
        rightLowerLegX: bone("rightLowerLeg")?.x,
        footDy: leftFoot && rightFoot ? Math.abs(leftFoot.y - rightFoot.y) : null,
        blink: Math.max(exprVal("blink"), exprVal("blinkLeft"), exprVal("blinkRight")),
        aa: exprVal("aa"),
        oh: exprVal("oh"),
        happy: exprVal("happy"),
      },
    };
  });

  record("selected-model-nova", afterNova.character === "nova", afterNova.character);
  record(
    "nova-vrm-requested",
    loadedModels.some((u) => /companion-nova\.vrm/i.test(u)),
    loadedModels.slice(-3).join(" | "),
  );
  const pose = afterNova.pose || {};
  record(
    "idle-arms-bent",
    Math.abs(pose.leftForearmX || 0) > 0.08 || Math.abs(pose.rightForearmX || 0) > 0.08,
    JSON.stringify({ l: pose.leftForearmX, r: pose.rightForearmX }),
  );
  record(
    "idle-legs-bent",
    Math.abs(pose.leftLowerLegX || 0) > 0.04 || Math.abs(pose.rightLowerLegX || 0) > 0.04,
    JSON.stringify({ l: pose.leftLowerLegX, r: pose.rightLowerLegX }),
  );
  record("feet-planted", pose.footDy == null || pose.footDy < 0.08, String(pose.footDy));
  record("eyes-open-rest", (pose.blink || 0) < 0.55, String(pose.blink));
  record("mouth-closed-rest", (pose.aa || 0) < 0.12 && (pose.oh || 0) < 0.12, `aa=${pose.aa} oh=${pose.oh}`);

  await page.screenshot({
    path: `${outDir}/issues_verify_idle.png`,
    animations: "disabled",
  });

  const orbit = page.locator("#orbit-hit");
  const box = await orbit.boundingBox();
  if (box) {
    const before = await page.screenshot({ animations: "disabled" });
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.28);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.28, {
      steps: 18,
    });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await page.screenshot({ animations: "disabled" });
    const changed = Buffer.compare(before, after) !== 0;
    record("camera-orbit-drag", changed, changed ? "pixels changed" : "no visual change");
    await page.screenshot({
      path: `${outDir}/issues_verify_orbit.png`,
      animations: "disabled",
    });
  } else {
    record("camera-orbit-drag", false, "no orbit-hit box");
  }

  await page.click("#brand-btn");
  await page.waitForSelector("#companion-character-picker.is-open", {
    timeout: 8000,
  });
  record("in-session-picker", true);
  const alicia = page.locator('#companion-character-picker [data-character-id="alicia"]');
  if (await alicia.count()) {
    const modelsBefore = loadedModels.length;
    await alicia.click();
    await page.waitForTimeout(4000);
    const switched = loadedModels.slice(modelsBefore).some((u) => /alicia/i.test(u));
    record("switch-character-model", switched, loadedModels.slice(modelsBefore).join(" | "));
  } else {
    record("switch-character-model", false, "alicia card missing");
  }

  await browser.close();

  const failed = checks.filter((c) => !c.ok);
  const report = {
    build: AMOJI_BUILD,
    url: url.toString(),
    passed: checks.filter((c) => c.ok).length,
    failed: failed.length,
    checks,
  };
  writeFileSync(`${outDir}/issues_verify_report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
