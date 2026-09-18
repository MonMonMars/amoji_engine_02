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
  beginStartPickerSession,
  openInSessionCompanionPicker,
  switchCompanionInSession,
} from "./companion-picker-smoke-util.mjs";
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
    "http://127.0.0.1:5178/prototypes/amoji-companion.html?lang=yue&automic=0",
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
    const bar = picker?.querySelector(".start-picker-preload-track");
    const chip = document.getElementById("brand-btn");
    const orbit = document.getElementById("orbit-hit");
    const dock = document.querySelector(".companion-progress-dock-inner");
    return {
      build: window.__amojiBuild,
      pickerOpen: Boolean(picker && picker.classList.contains("is-open")),
      hero: Boolean(picker?.querySelector(".picker-hero")),
      beginBtn: Boolean(picker?.querySelector(".picker-begin-btn")),
      featuredRow: Boolean(picker?.querySelector(".picker-featured-row")),
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
  record("picker-v4-hero", boot.hero);
  record("picker-begin-cta", boot.beginBtn);
  record("picker-featured-row", boot.featuredRow);
  record("loading-ring-and-bar", boot.ring && boot.bar && boot.progressBarClass);
  record("character-chip", boot.chip);
  record("orbit-hit", boot.orbit);
  record("progress-dock-circle", boot.dockCircle);

  const numbered = await page.evaluate(() => {
    const cards = [
      ...document.querySelectorAll("#start-character-picker [data-character-id]"),
    ];
    return cards.slice(0, 3).map((card) => ({
      id: card.getAttribute("data-character-id"),
      number: card.getAttribute("data-character-number"),
      label: card.getAttribute("aria-label") || "",
      text: (card.textContent || "").replace(/\s+/g, " ").trim(),
    }));
  });
  record(
    "picker-cards-numbered",
    numbered.length >= 3 &&
      numbered[0].id === "nova" &&
      numbered[0].number === "1" &&
      numbered[1].number === "2" &&
      numbered.every((card) => /^\d+\./.test(card.label)),
    JSON.stringify(numbered),
  );

  await page.screenshot({
    path: `${outDir}/issues_verify_picker.png`,
    animations: "disabled",
  });

  await beginStartPickerSession(page, {
    characterId: "nova",
    cardTimeout: 30000,
    dismissTimeout: 120000,
  });

  await page.waitForFunction(
    () => window.__amojiAvatarKind === "vrm3d" && window.__amojiAvatar?.vrm,
    null,
    { timeout: 120000 },
  );
  await page.waitForTimeout(2500);

  const treatUi = await page.evaluate(() => {
    const dock = document.getElementById("treat-dock");
    const fab = document.getElementById("treat-fab");
    window.__amojiTreats?.setOpen?.(true);
    const sheet = document.getElementById("treat-sheet");
    const bagCard = sheet?.querySelector(".treat-card--bag[data-treat-id='cake']");
    const shopTab = sheet?.querySelector("[data-treat-tab='shop']");
    shopTab?.click();
    const shopCards = [...(sheet?.querySelectorAll(".treat-card--shop") || [])].map(
      (el) => el.getAttribute("data-treat-id"),
    );
    window.__amojiTreats?.setOpen?.(false);
    return {
      dock: Boolean(dock),
      fab: Boolean(fab),
      coins: (document.getElementById("treat-coins")?.textContent || "").includes("🪙"),
      shop: shopCards.includes("cake") && shopCards.includes("milk-tea"),
      cakeInBag: Boolean(bagCard),
      feed: typeof window.__amojiTreats?.feed === "function",
    };
  });
  record(
    "treat-shop-bag",
    treatUi.dock && treatUi.fab && treatUi.coins && treatUi.shop && treatUi.cakeInBag && treatUi.feed,
    JSON.stringify(treatUi),
  );

  const fed = await page.evaluate(() => {
    const ok = window.__amojiTreats?.feed?.("cake", 200, 280);
    return {
      ok,
      action: String(window.__amojiAvatar?.currentAction || ""),
      eating: Boolean(window.__amojiAvatar?.eating),
    };
  });
  record(
    "treat-feed-eat-action",
    fed.ok && (fed.action === "eat" || fed.eating),
    JSON.stringify(fed),
  );

  const petLoop = await page.evaluate(() => {
    const hud = document.getElementById("pet-hud");
    const hungerFill = document.getElementById("pet-hunger-fill");
    const heartsFill = document.getElementById("pet-hearts-fill");
    const beforeCoins = Number(window.__amojiTreats?.state?.coins || 0);
    window.__amojiTreats?.applyChat?.();
    const afterChat = Number(window.__amojiTreats?.state?.coins || 0);
    window.__amojiTreats?.buy?.("cookie");
    window.__amojiTreats?.setNeeds?.({ hunger: 96, hearts: 70 });
    const refused = window.__amojiTreats?.feed?.("cookie", 200, 280);
    const outcome = window.__amojiTreats?.lastOutcome || {};
    const sheet = document.getElementById("treat-sheet");
    return {
      hud: Boolean(hud),
      hungerBar: Boolean(hungerFill),
      heartsBar: Boolean(heartsFill),
      wallet: Boolean(document.getElementById("pet-wallet")),
      kitchen:
        (document.getElementById("treat-fab")?.textContent || "").includes("廚房") ||
        (document.getElementById("treat-fab")?.textContent || "").toLowerCase().includes("kitchen"),
      pips: document.querySelectorAll("#pet-hunger-pips .pet-pip").length,
      fridgeTab: Boolean(sheet?.querySelector("[data-treat-tab='bag']")),
      shopStats: Boolean(sheet?.querySelector(".treat-card-stats")),
      chatEarn: afterChat === beforeCoins + 3,
      refused: refused === false && outcome.reason === "full",
      cookieKept: (window.__amojiTreats?.state?.bag?.cookie || 0) >= 1,
      action: String(window.__amojiAvatar?.currentAction || ""),
    };
  });
  record(
    "pet-hud-meters",
    petLoop.hud && petLoop.hungerBar && petLoop.heartsBar,
    JSON.stringify(petLoop),
  );
  record(
    "pet-pou-ui",
    petLoop.wallet && petLoop.kitchen && petLoop.pips === 5 && petLoop.fridgeTab && petLoop.shopStats,
    JSON.stringify({
      wallet: petLoop.wallet,
      kitchen: petLoop.kitchen,
      pips: petLoop.pips,
      fridgeTab: petLoop.fridgeTab,
      shopStats: petLoop.shopStats,
    }),
  );
  record(
    "pet-chat-earn",
    petLoop.chatEarn,
    JSON.stringify({ chatEarn: petLoop.chatEarn }),
  );
  record(
    "pet-refuse-full",
    petLoop.refused && petLoop.cookieKept,
    JSON.stringify(petLoop),
  );

  await page.evaluate(async () => {
    window.__amojiTreats?.setOpen?.(false);
    window.__amojiAvatar?.setEating?.(false);
    window.__amojiAvatar?.stopAction?.();
    await new Promise((r) => setTimeout(r, 3800));
  });

  await page
    .waitForFunction(
      () => {
        const action = String(window.__amojiAvatar?.currentAction || "");
        return !action || action === "thinking" || action === "idle";
      },
      { timeout: 12000 },
    )
    .catch(() => null);
  await page.waitForTimeout(1500);

  const afterNova = await page.evaluate(() => {
    const vrm = window.__amojiAvatar?.vrm;
    const bone = (name) => {
      const node = vrm?.humanoid?.getNormalizedBoneNode?.(name);
      if (!node) return null;
      return {
        x: Number(node.rotation?.x) || 0,
        y: Number(node.position?.y) || 0,
        z: Number(node.rotation?.z) || 0,
        ry: Number(node.rotation?.y) || 0,
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
      action: window.__amojiAvatar?.currentAction || null,
      emotion: window.__amojiAvatar?.emotion || null,
      pose: {
        leftUpperArmZ: bone("leftUpperArm")?.z,
        rightUpperArmZ: bone("rightUpperArm")?.z,
        leftForearmY: bone("leftLowerArm")?.ry,
        rightForearmY: bone("rightLowerArm")?.ry,
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
    Math.abs(pose.leftUpperArmZ || 0) > 0.4 ||
      Math.abs(pose.rightUpperArmZ || 0) > 0.4 ||
      Math.abs(pose.leftForearmY || 0) > 0.2 ||
      Math.abs(pose.rightForearmY || 0) > 0.2,
    JSON.stringify({
      upperZ: [pose.leftUpperArmZ, pose.rightUpperArmZ],
      forearmY: [pose.leftForearmY, pose.rightForearmY],
    }),
  );
  record(
    "idle-legs-bent",
    Math.abs(pose.leftLowerLegX || 0) > 0.04 || Math.abs(pose.rightLowerLegX || 0) > 0.04,
    JSON.stringify({ l: pose.leftLowerLegX, r: pose.rightLowerLegX }),
  );
  record(
    "idle-legs-not-stride",
    Math.abs((pose.leftLowerLegX || 0) - (pose.rightLowerLegX || 0)) < 0.22,
    JSON.stringify({ l: pose.leftLowerLegX, r: pose.rightLowerLegX }),
  );
  record("feet-planted", pose.footDy == null || pose.footDy < 0.08, String(pose.footDy));
  record(
    "idle-not-walk",
    !["walk", "run", "dance", "moonwalk"].includes(String(afterNova.action || "")),
    String(afterNova.action),
  );
  record(
    "rest-emotion-not-happy",
    afterNova.emotion !== "happy",
    String(afterNova.emotion),
  );
  record("eyes-open-rest", (pose.blink || 0) < 0.55, String(pose.blink));
  record("mouth-closed-rest", (pose.aa || 0) < 0.12 && (pose.oh || 0) < 0.12, `aa=${pose.aa} oh=${pose.oh}`);

  const talkingPose = await page.evaluate(async () => {
    const avatar = window.__amojiAvatar;
    avatar.setEating?.(false);
    avatar.stopAction?.();
    avatar.setTalking?.(true);
    avatar.setMouthShape?.("aa");
    avatar.setMouthOpen?.(0.9);
    await new Promise((r) => setTimeout(r, 700));
    const face = avatar.getFaceDebug?.() || {};
    const vrm = avatar.vrm;
    const jaw =
      vrm?.humanoid?.getNormalizedBoneNode?.("jaw") ||
      vrm?.humanoid?.getRawBoneNode?.("jaw");
    const expr = vrm?.expressionManager;
    const exprVal = (name) => {
      try {
        return Number(expr?.getValue?.(name) ?? 0);
      } catch {
        return 0;
      }
    };
    return {
      aa: exprVal("aa"),
      oh: exprVal("oh"),
      jawX: Number(jaw?.rotation?.x ?? 0),
      mouthOpen: Number(face.mouthOpen ?? avatar.mouthOpen ?? 0),
      mouthTarget: Number(face.mouthTarget ?? 0),
      talking: Boolean(face.talking),
    };
  });
  record(
    "mouth-moves-when-talking",
    talkingPose.talking &&
      ((talkingPose.aa || 0) > 0.2 ||
        (talkingPose.oh || 0) > 0.2 ||
        (talkingPose.jawX || 0) > 0.06 ||
        (talkingPose.mouthOpen || 0) > 0.35 ||
        (talkingPose.mouthTarget || 0) > 0.75),
    JSON.stringify(talkingPose),
  );
  await page.screenshot({
    path: `${outDir}/issues_verify_talking_mouth.png`,
  });
  await page.evaluate(async () => {
    window.__amojiAvatar?.setTalking?.(false);
    window.__amojiAvatar?.setMouthOpen?.(0);
    await new Promise((r) => setTimeout(r, 400));
  });

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

  await page.evaluate(() => {
    window.__amojiTreats?.setOpen?.(false);
    const bd = document.getElementById("treat-sheet-backdrop");
    bd?.classList.remove("is-open");
    bd?.setAttribute("hidden", "");
  });
  await page.waitForTimeout(450);

  await openInSessionCompanionPicker(page);
  record("in-session-picker", true);
  try {
    const modelsBefore = loadedModels.length;
    await switchCompanionInSession(page, "alicia");
    await page.waitForTimeout(4000);
    const switched = loadedModels.slice(modelsBefore).some((u) => /alicia/i.test(u));
    record("switch-character-model", switched, loadedModels.slice(modelsBefore).join(" | "));
  } catch (err) {
    record("switch-character-model", false, String(err?.message || err));
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
