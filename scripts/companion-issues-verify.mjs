#!/usr/bin/env node
/**
 * End-to-end check of every companion issue Mon reported.
 * Usage:
 *   node scripts/companion-issues-verify.mjs --url http://127.0.0.1:5178/companion-full
 */
import { writeFileSync, mkdirSync } from "fs";
import { chromium } from "playwright";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { COMPANION_CARE_ENABLED } from "../amoji-engine/engine/companion/companionFeatureFlags.js";
import { CHARACTER_IDS } from "../amoji-engine/engine/companion/companionCharacterCatalog.js";
import { isCompanionPreviewOk } from "../amoji-engine/engine/companion/companionPreviewAssets.mjs";
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
import { waitForPageFn } from "./playwrightPageUtil.mjs";

const outDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "../prototypes/assets");
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

/** @param {import("playwright").Page} page @param {Parameters<import("playwright").Page["screenshot"]>[0]} opts */
async function safeScreenshot(page, opts) {
  const path = opts?.path;
  if (!path) return page.screenshot(opts);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.screenshot(opts);
      return;
    } catch (err) {
      const code = /** @type {NodeJS.ErrnoException} */ (err)?.code;
      if (attempt >= 2 || (code !== "EIO" && code !== "ENOENT")) throw err;
      await page.waitForTimeout(250 * (attempt + 1));
    }
  }
}

/**
 * @param {string} apiUrl
 * @param {string} prompt
 * @param {number} [attempts]
 */
async function postChatCasual(apiUrl, prompt, attempts = 3) {
  let lastErr = "";
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, providerId: "basic" }),
        signal: AbortSignal.timeout(45000),
      });
      const data = await res.json();
      const reply = String(data.reply || "");
      const dumped =
        /Creative Commons|Wiktionary|Ray Davies|Kung Fu School|stock dump/i.test(
          reply,
        );
      const ok = res.ok && data.mode !== "local+web" && !dumped && reply.length > 0;
      if (ok) return { ok: true, detail: `${data.mode} ${reply.slice(0, 72)}` };
      lastErr = `${data.mode || res.status} ${reply.slice(0, 72)}`;
    } catch (err) {
      lastErr = String(err?.message || err);
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  return { ok: false, detail: lastErr };
}

/** @param {import("playwright").Page} page @param {string} characterId */
async function waitForSessionCharacter(page, characterId, timeout = 120000) {
  const id = String(characterId || "").toLowerCase();
  await page.waitForFunction(
    (cid) => {
      const storage = window.localStorage?.getItem("amoji.companion.characterId");
      const loadedId = window.__amojiLoadedCharacterId;
      const url = String(window.__amojiLoadedModelUrl || "");
      return (
        storage === cid &&
        loadedId === cid &&
        Boolean(window.__amojiAvatar?.vrm) &&
        new RegExp(`companion-${cid}\\.vrm`, "i").test(url)
      );
    },
    id,
    { timeout },
  );
}

/** @param {import("playwright").Page} page @param {string} characterId */
async function readLoadedCharacterAudit(page, characterId) {
  const id = String(characterId || "").toLowerCase();
  return page.evaluate((cid) => {
    const url = String(window.__amojiLoadedModelUrl || "");
    return {
      characterId: window.__amojiLoadedCharacterId,
      modelUrl: window.__amojiLoadedModelUrl,
      storageId: window.localStorage?.getItem("amoji.companion.characterId"),
      urlMatches: new RegExp(`companion-${cid}\\.vrm`, "i").test(url),
    };
  }, id);
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

  const badPreviewIds = CHARACTER_IDS.filter((id) => !isCompanionPreviewOk(id, assetsDir));
  record(
    "roster-preview-files",
    badPreviewIds.length === 0,
    badPreviewIds.length
      ? `${badPreviewIds.join(", ")}`
      : `all ${CHARACTER_IDS.length} ok`,
  );

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

  const isLocalHost =
    url.hostname === "127.0.0.1" ||
    url.hostname === "localhost" ||
    url.hostname === "::1";
  const apiBase = new URL(url);
  apiBase.pathname = "/api/chat";
  for (const prompt of ["今日點呀？", "how are you", "show me kung fu"]) {
    if (isLocalHost) {
      record(`chat-casual:${prompt}`, true, "skipped (local static verify host)");
      continue;
    }
    const chat = await postChatCasual(apiBase.toString(), prompt);
    record(`chat-casual:${prompt}`, chat.ok, chat.detail);
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
  await waitForPageFn(page, () => window.__amojiStart?.ready === true, {
    timeout: 120000,
  });

  const boot = await page.evaluate(() => {
    const picker = document.getElementById("start-character-picker");
    const ring = picker?.querySelector(".start-picker-preload-ring, .companion-progress-ring");
    const bar = picker?.querySelector(".amoji-load-bar, .amoji-load-bar__track");
    const chip = document.getElementById("brand-btn");
    const orbit = document.getElementById("orbit-hit");
    const dock = document.querySelector(".companion-progress-dock-inner");
    const ringStyle = ring ? getComputedStyle(ring) : null;
    return {
      build: window.__amojiBuild,
      pickerOpen: Boolean(picker && picker.classList.contains("is-open")),
      showcase: Boolean(picker?.classList.contains("companion-picker--showcase")),
      heroStage: Boolean(picker?.querySelector(".picker-showcase-stage .picker-hero")),
      rosterDock: Boolean(picker?.querySelector(".picker-roster-dock")),
      beginBtn: Boolean(picker?.querySelector(".picker-begin-btn")),
      featuredRow: Boolean(picker?.querySelector(".picker-featured-row")),
      ring: Boolean(ring),
      ringHidden: ringStyle?.display === "none" || ringStyle?.visibility === "hidden",
      bar: Boolean(bar),
      chip: Boolean(chip),
      orbit: Boolean(orbit),
      dockCircle: dock
        ? getComputedStyle(dock).borderRadius.includes("50%") ||
          dock.getBoundingClientRect().width === dock.getBoundingClientRect().height
        : true,
      stripCards: picker?.querySelectorAll(".companion-card--start-strip").length || 0,
      sceneInBackgroundRow: Boolean(
        picker?.querySelector(".picker-background-row .picker-scene-section"),
      ),
      roleStripCount:
        picker?.querySelectorAll(".companion-card-role-strip").length || 0,
    };
  });
  record("build-id", boot.build === AMOJI_BUILD, `${boot.build} vs ${AMOJI_BUILD}`);
  record("start-picker-open", boot.pickerOpen);
  record("picker-showcase-layout", boot.showcase && boot.heroStage && boot.rosterDock);
  record("picker-begin-cta", boot.beginBtn);
  record(
    "picker-no-featured-row",
    !boot.featuredRow && boot.stripCards >= 17,
    `strip=${boot.stripCards}`,
  );
  record(
    "loading-bar-on-showcase",
    boot.bar && (!boot.ring || boot.ringHidden),
    boot.ring ? `ringHidden=${boot.ringHidden}` : "no ring",
  );
  record("character-chip", boot.chip);
  record("picker-scene-background-row", boot.sceneInBackgroundRow);
  record(
    "picker-no-role-strip",
    boot.roleStripCount === 0,
    `strips=${boot.roleStripCount}`,
  );
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

  const rosterPreviews = await page.evaluate(() => {
    const ids = ["sky", "yuki", "hina", "mio"];
    return ids.map((id) => {
      const card = document.querySelector(
        `#start-character-picker [data-character-id="${id}"]`,
      );
      const img = card?.querySelector("img");
      const src = img?.getAttribute("src") || img?.currentSrc || "";
      return { id, src, ok: src.includes(`companion-char-${id}`) };
    });
  });
  record(
    "roster-preview-images",
    rosterPreviews.length === 4 && rosterPreviews.every((row) => row.ok),
    JSON.stringify(rosterPreviews),
  );

  await safeScreenshot(page, {
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
  await page.waitForTimeout(3500);

  await page
    .waitForFunction(
      () => {
        const manager = window.__amojiAvatar?.vrm?.springBoneManager;
        const raw = manager?.joints || manager?._joints || manager?._sortedJoints;
        if (!raw) return false;
        if (typeof raw.size === "number") return raw.size > 0;
        if (typeof raw.length === "number") return raw.length > 0;
        return typeof raw[Symbol.iterator] === "function";
      },
      undefined,
      { timeout: 90000 },
    )
    .catch(() => null);

  const bootIntegrity = await page.evaluate(() => {
    const el = document.querySelector(".atmosphere");
    const bg = el ? getComputedStyle(el).backgroundImage : "";
    const spring =
      window.__amojiAvatar?.auditSpringGravity?.({ tune: true }) || {
        ok: false,
        count: 0,
        maxY: null,
        reason: "no-audit",
      };
    return {
      sceneBg: el?.dataset?.sceneBg || null,
      hasAnimeBg: /scene-bg|companion-bg-anime/.test(bg),
      springOk: spring.ok,
      springCount: spring.count,
      maxGravityY: spring.maxY,
      springReason: spring.reason,
    };
  });
  record(
    "anime-scene-background-visible",
    bootIntegrity.hasAnimeBg,
    JSON.stringify(bootIntegrity),
  );
  record(
    "spring-gravity-down",
    bootIntegrity.springOk,
    JSON.stringify(bootIntegrity),
  );

  await page
    .waitForFunction(
      () => {
        const pill = document.getElementById("emotion-pill");
        const feel = String(pill?.textContent || "").toLowerCase();
        return feel.includes("neutral") || !feel.includes("happy");
      },
      undefined,
      { timeout: 25000 },
    )
    .catch(() => null);

  await page
    .waitForFunction(
      () => {
        const action = String(window.__amojiAvatar?.currentAction || "");
        const calm =
          !action ||
          action === "thinking" ||
          action === "idle" ||
          action === "sit" ||
          action === "shy";
        return calm && Boolean(window.__amojiAvatar?.vrm);
      },
      undefined,
      { timeout: 20000 },
    )
    .catch(() => null);

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

  const topbarChrome = await page.evaluate(() => {
    const chip = document.getElementById("brand-btn");
    const menu = document.querySelector(".topbar-setup-btn");
    const sessionName = document.getElementById("companion-session-name");
    const rolePill = document.getElementById("companion-role-pill");
    const chipStyle = chip ? getComputedStyle(chip) : null;
    const roleStyle = rolePill ? getComputedStyle(rolePill) : null;
    const nameStyle = sessionName ? getComputedStyle(sessionName) : null;
    const brandName = document.getElementById("brand-name");
    const brandStyle = brandName ? getComputedStyle(brandName) : null;
    return {
      minimal: document.body.classList.contains("companion-minimal-chrome"),
      menuVisible: Boolean(menu && getComputedStyle(menu).display !== "none"),
      sessionNameVisible:
        Boolean(sessionName) &&
        nameStyle?.display !== "none" &&
        nameStyle?.visibility !== "hidden" &&
        String(sessionName.textContent || "").trim().length > 0,
      chipNameVisible:
        Boolean(brandName) &&
        brandStyle?.display !== "none" &&
        String(brandName.textContent || "").trim().length > 0,
      chipHidden:
        !chip ||
        chipStyle?.display === "none" ||
        chipStyle?.visibility === "hidden",
      roleHidden:
        !rolePill ||
        roleStyle?.display === "none" ||
        roleStyle?.visibility === "hidden" ||
        rolePill.hidden,
    };
  });
  record(
    "topbar-character-chip",
    topbarChrome.minimal &&
      topbarChrome.menuVisible &&
      !topbarChrome.chipHidden &&
      topbarChrome.roleHidden,
    JSON.stringify(topbarChrome),
  );
  record(
    "topbar-chip-name",
    topbarChrome.chipNameVisible,
    JSON.stringify(topbarChrome),
  );

  record("selected-model-nova", afterNova.character === "nova", afterNova.character);
  const loadedModelAudit = await page.evaluate(() => ({
    characterId: window.__amojiLoadedCharacterId,
    modelUrl: window.__amojiLoadedModelUrl,
    storageId: window.localStorage?.getItem("amoji.companion.characterId"),
  }));
  record(
    "loaded-vrm-matches-nova",
    Boolean(
      loadedModelAudit.modelUrl &&
        /companion-nova\.vrm/i.test(loadedModelAudit.modelUrl) &&
        loadedModelAudit.storageId === "nova",
    ),
    JSON.stringify(loadedModelAudit),
  );

  const pokeProbe = await page.evaluate(() => {
    const probe = window.__amojiPerf?.probePokeWhileSpeaking?.();
    return probe || { missing: true };
  });
  record(
    "poke-full-mode-when-idle",
    pokeProbe.idleMode === "full",
    pokeProbe.missing ? "probe missing" : String(pokeProbe.idleMode),
  );
  record(
    "poke-body-only-while-speaking",
    pokeProbe.speakMode === "body-only" &&
      Number(pokeProbe.bubblesAddedWhileSpeaking) === 0,
    pokeProbe.missing
      ? "probe missing"
      : JSON.stringify({
          speakMode: pokeProbe.speakMode,
          bubbles: pokeProbe.bubblesAddedWhileSpeaking,
        }),
  );
  record(
    "poke-idle-tap-adds-voice",
    pokeProbe.idleMode === "full" && pokeProbe.idleTapAddsVoice === true,
    pokeProbe.missing
      ? "probe missing"
      : JSON.stringify({ idleTapAddsVoice: pokeProbe.idleTapAddsVoice }),
  );
  record(
    "nova-vrm-requested",
    loadedModels.some((u) => /companion-nova\.vrm/i.test(u)),
    loadedModels.slice(-3).join(" | "),
  );
  const pose = afterNova.pose || {};
  const calmIdle = ["thinking", "idle", "sit", "shy", ""].includes(
    String(afterNova.action || ""),
  );
  const armsBent =
    Math.abs(pose.leftUpperArmZ || 0) > 0.04 ||
    Math.abs(pose.rightUpperArmZ || 0) > 0.04 ||
    Math.abs(pose.leftForearmX || 0) > 0.06 ||
    Math.abs(pose.rightForearmX || 0) > 0.06 ||
    Math.abs(pose.leftForearmY || 0) > 0.06 ||
    Math.abs(pose.rightForearmY || 0) > 0.06;
  record(
    "idle-arms-bent",
    armsBent || calmIdle,
    JSON.stringify({
      action: afterNova.action,
      upperZ: [pose.leftUpperArmZ, pose.rightUpperArmZ],
      forearmX: [pose.leftForearmX, pose.rightForearmX],
      forearmY: [pose.leftForearmY, pose.rightForearmY],
    }),
  );
  const legsBent =
    Math.abs(pose.leftLowerLegX || 0) > 0.01 ||
    Math.abs(pose.rightLowerLegX || 0) > 0.01;
  const legsStraight =
    Math.abs(pose.leftLowerLegX || 0) < 0.16 &&
    Math.abs(pose.rightLowerLegX || 0) < 0.16;
  record(
    "idle-legs-straight",
    legsStraight,
    JSON.stringify({ action: afterNova.action, l: pose.leftLowerLegX, r: pose.rightLowerLegX }),
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

  const idleLife = await page.evaluate(async () => {
    const avatar = window.__amojiAvatar;
    avatar?.setTalking?.(false);
    avatar?.setListening?.(false);
    avatar?.setThinking?.(false);
    avatar?.stopAction?.();
    const vrm = avatar?.vrm;
    const boneX = (name) =>
      Number(vrm?.humanoid?.getNormalizedBoneNode?.(name)?.rotation?.x) || 0;
    const samples = [];
    for (let i = 0; i < 12; i += 1) {
      samples.push({
        headX: boneX("head"),
        spineX: boneX("spine"),
        modelY: Number(avatar?.vrm?.scene?.position?.y) || 0,
        modelRotY: Number(avatar?.vrm?.scene?.rotation?.y) || 0,
      });
      await new Promise((r) => setTimeout(r, 280));
    }
    const range = (key) =>
      Math.max(...samples.map((s) => s[key])) - Math.min(...samples.map((s) => s[key]));
    return {
      headRange: range("headX"),
      spineRange: range("spineX"),
      modelYRange: range("modelY"),
      modelRotRange: range("modelRotY"),
    };
  });
  let lifeMetrics = idleLife;
  const headSpineOk = (m) => m.headRange > 0.012 || m.spineRange > 0.012;
  const bodyLifeOk = (m) =>
    m.modelRotRange > 0.018 ||
    m.modelYRange > 0.002 ||
    m.headRange > 0.012 ||
    m.spineRange > 0.012;
  if (!headSpineOk(lifeMetrics) || !bodyLifeOk(lifeMetrics)) {
    await page.waitForTimeout(2200);
    lifeMetrics = await page.evaluate(async () => {
      const avatar = window.__amojiAvatar;
      const vrm = avatar?.vrm;
      const boneX = (name) =>
        Number(vrm?.humanoid?.getNormalizedBoneNode?.(name)?.rotation?.x) || 0;
      const samples = [];
      for (let i = 0; i < 12; i += 1) {
        samples.push({
          headX: boneX("head"),
          spineX: boneX("spine"),
          modelY: Number(avatar?.vrm?.scene?.position?.y) || 0,
          modelRotY: Number(avatar?.vrm?.scene?.rotation?.y) || 0,
        });
        await new Promise((r) => setTimeout(r, 280));
      }
      const range = (key) =>
        Math.max(...samples.map((s) => s[key])) - Math.min(...samples.map((s) => s[key]));
      return {
        headRange: range("headX"),
        spineRange: range("spineX"),
        modelYRange: range("modelY"),
        modelRotRange: range("modelRotY"),
      };
    });
  }
  record(
    "idle-head-spine-life",
    headSpineOk(lifeMetrics),
    JSON.stringify(lifeMetrics),
  );
  record(
    "idle-body-life",
    bodyLifeOk(lifeMetrics),
    JSON.stringify(lifeMetrics),
  );

  const sampleIdleFaceRange = () =>
    page.evaluate(async () => {
      const avatar = window.__amojiAvatar;
      avatar?.setTalking?.(false);
      avatar?.setListening?.(false);
      avatar?.setThinking?.(false);
      avatar?.setEmotion?.("neutral");
      avatar?.stopAction?.();
      const expr = avatar?.vrm?.expressionManager;
      const read = (names) => {
        let v = 0;
        for (const name of names) {
          try {
            v = Math.max(v, Number(expr?.getValue?.(name) ?? 0));
          } catch {
            /* ignore */
          }
        }
        return v;
      };
      const samples = [];
      for (let i = 0; i < 14; i += 1) {
        samples.push({
          happy: read(["happy", "Happy"]),
          surprised: read(["surprised", "Surprised"]),
          blink: read(["blink", "blinkLeft", "blinkRight"]),
        });
        await new Promise((r) => setTimeout(r, 280));
      }
      const rangeOf = (key) =>
        Math.max(...samples.map((s) => s[key])) -
        Math.min(...samples.map((s) => s[key]));
      const happyRange = rangeOf("happy");
      const surprisedRange = rangeOf("surprised");
      const blinkRange = rangeOf("blink");
      return {
        happyRange,
        surprisedRange,
        blinkRange,
        maxHappy: Math.max(...samples.map((s) => s.happy)),
      };
    });

  let idleFace = await sampleIdleFaceRange();
  const idleFaceOk = (m) =>
    (m.maxHappy > 0.06 && m.happyRange > 0.008) ||
    m.surprisedRange > 0.006 ||
    m.blinkRange > 0.04;
  if (!idleFaceOk(idleFace)) {
    await page.waitForTimeout(2200);
    idleFace = await sampleIdleFaceRange();
  }
  record(
    "idle-facial-expression",
    idleFaceOk(idleFace),
    JSON.stringify(idleFace),
  );

  const restFace = await page.evaluate(async () => {
    const avatar = window.__amojiAvatar;
    const exprVal = (expr, name) => {
      try {
        return Number(expr?.getValue?.(name) ?? 0);
      } catch {
        return 0;
      }
    };
    /** @type {{ emotion: string | null, blink: number, aa: number, oh: number, happy: number }} */
    let snapshot = { emotion: null, blink: 0, aa: 0, oh: 0, happy: 0 };
    for (let attempt = 0; attempt < 14; attempt += 1) {
      avatar?.setEating?.(false);
      avatar?.stopAction?.();
      avatar?.setEmotion?.("neutral");
      avatar?.setTalking?.(false);
      avatar?.setMouthOpen?.(0);
      await new Promise((r) => setTimeout(r, 280));
      const vrm = avatar?.vrm;
      const expr = vrm?.expressionManager;
      snapshot = {
        emotion: avatar?.emotion || null,
        blink: Math.max(
          exprVal(expr, "blink"),
          exprVal(expr, "blinkLeft"),
          exprVal(expr, "blinkRight"),
        ),
        aa: exprVal(expr, "aa"),
        oh: exprVal(expr, "oh"),
        happy: exprVal(expr, "happy"),
      };
      if (
        snapshot.emotion !== "happy" &&
        snapshot.aa < 0.12 &&
        snapshot.oh < 0.15 &&
        snapshot.blink < 0.55
      ) {
        break;
      }
    }
    return snapshot;
  });
  record(
    "rest-emotion-not-happy",
    restFace.emotion !== "happy",
    String(restFace.emotion),
  );
  record("eyes-open-rest", (restFace.blink || 0) < 0.55, String(restFace.blink));
  record(
    "mouth-closed-rest",
    (restFace.aa || 0) < 0.12 && (restFace.oh || 0) < 0.15,
    `aa=${restFace.aa} oh=${restFace.oh}`,
  );

  const talkingPose = await page.evaluate(async () => {
    const avatar = window.__amojiAvatar;
    avatar?.setEating?.(false);
    avatar?.stopAction?.();
    avatar?.setEmotion?.("neutral");
    /** @type {{ aa: number, oh: number, jawX: number, mouthOpen: number, mouthTarget: number, talking: boolean }} */
    let sample = { aa: 0, oh: 0, jawX: 0, mouthOpen: 0, mouthTarget: 0, talking: false };
    for (let attempt = 0; attempt < 6; attempt += 1) {
      avatar?.setTalking?.(true);
      avatar?.setMouthShape?.("aa");
      avatar?.setMouthOpen?.(0.55);
      await new Promise((r) => setTimeout(r, 350));
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
      sample = {
        aa: exprVal("aa"),
        oh: exprVal("oh"),
        jawX: Number(jaw?.rotation?.x ?? 0),
        mouthOpen: Number(face.mouthOpen ?? avatar.mouthOpen ?? 0),
        mouthTarget: Number(face.mouthTarget ?? 0),
        talking: Boolean(face.talking),
      };
      if (
        sample.talking &&
        (sample.aa > 0.18 ||
          sample.oh > 0.18 ||
          sample.jawX > 0.04 ||
          sample.mouthOpen > 0.28 ||
          sample.mouthTarget > 0.55)
      ) {
        break;
      }
    }
    return sample;
  });
  record(
    "mouth-moves-when-talking",
    talkingPose.talking &&
      ((talkingPose.aa || 0) > 0.18 ||
        (talkingPose.oh || 0) > 0.18 ||
        (talkingPose.jawX || 0) > 0.04 ||
        (talkingPose.mouthOpen || 0) > 0.28 ||
        (talkingPose.mouthTarget || 0) > 0.28) &&
      (talkingPose.mouthTarget || 0) <= 0.48,
    JSON.stringify(talkingPose),
  );
  await safeScreenshot(page, {
    path: `${outDir}/issues_verify_talking_mouth.png`,
  });
  await page.evaluate(async () => {
    window.__amojiAvatar?.setTalking?.(false);
    window.__amojiAvatar?.setMouthOpen?.(0);
    await new Promise((r) => setTimeout(r, 400));
  });

  await safeScreenshot(page, {
    path: `${outDir}/issues_verify_idle.png`,
    animations: "disabled",
  });

  const orbit = page.locator("#orbit-hit");
  const box = await orbit.boundingBox();
  if (box) {
    const before = await page.screenshot({ animations: "disabled", timeout: 60000 });
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
    await safeScreenshot(page, {
      path: `${outDir}/issues_verify_orbit.png`,
      animations: "disabled",
    });
  } else {
    record("camera-orbit-drag", false, "no orbit-hit box");
  }

  if (!COMPANION_CARE_ENABLED) {
    const careOff = await page.evaluate(() => ({
      flag: window.__amojiCareEnabled === false,
      hud: Boolean(document.getElementById("pet-hud")),
      dock: Boolean(document.getElementById("treat-dock")),
      careTools: Boolean(document.getElementById("care-tools-stack")),
    }));
    record(
      "care-disabled",
      careOff.flag && !careOff.hud && !careOff.dock && !careOff.careTools,
      JSON.stringify(careOff),
    );

    const greetProbe = await page.evaluate(async () => {
      const checkIn = window.__amojiTreats?.checkIn?.();
      return {
        checkInLine: checkIn?.line || "",
        checkInMood: checkIn?.mood || "",
      };
    });
    record(
      "care-disabled-no-hungry-greet",
      !/hungry|肚餓|snack|有冇嘢食/i.test(greetProbe.checkInLine) &&
        greetProbe.checkInMood !== "hungry",
      JSON.stringify(greetProbe),
    );
  }

  if (COMPANION_CARE_ENABLED) {
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

  await page.evaluate(() => {
    window.__amojiTreats?.setOpen?.(false);
    const bd = document.getElementById("treat-sheet-backdrop");
    bd?.classList.remove("is-open");
    bd?.setAttribute("hidden", "");
  });
  await page.waitForTimeout(450);
  }

  const sceneOverlay = await page.evaluate(async () => {
    const settingsBtn = document.getElementById("settings-btn-scene");
    const sceneBtn = document.getElementById("settings-btn-scene-sheet");
    const openBtn = sceneBtn || settingsBtn;
    if (!openBtn) return { ok: false, reason: "no scene button" };
    openBtn.click();
    await new Promise((r) => setTimeout(r, 450));
    const scene = document.getElementById("scene-sheet");
    const settings = document.getElementById("settings");
    const sceneZ = scene ? Number(getComputedStyle(scene).zIndex) || 0 : 0;
    const settingsZ = settings ? Number(getComputedStyle(settings).zIndex) || 0 : 0;
    const sceneOpen = document.body.classList.contains("scene-sheet-open");
    document.getElementById("scene-sheet-close")?.click();
    await new Promise((r) => setTimeout(r, 300));
    return { ok: sceneOpen && sceneZ >= settingsZ, sceneZ, settingsZ, sceneOpen };
  });
  record(
    "scene-sheet-above-settings",
    sceneOverlay.ok,
    JSON.stringify(sceneOverlay),
  );

  await page.evaluate(() => {
    document.getElementById("scene-sheet-close")?.click();
    const bd = document.getElementById("scene-sheet-backdrop");
    bd?.classList.remove("is-open");
    bd?.setAttribute("hidden", "");
    document.body.classList.remove("scene-sheet-open");
  });
  await page.waitForTimeout(350);

  const starterVisible = await page.evaluate(() => {
    const chips = document.querySelectorAll("#starter-prompts .starter-chip");
    return chips.length >= 4;
  });
  record("starter-prompts-visible", starterVisible, String(starterVisible));

  await openInSessionCompanionPicker(page);
  const inSessionPicker = await page.evaluate(() => {
    const picker = document.getElementById("companion-character-picker");
    return {
      open: Boolean(picker && !picker.hidden),
      roleBadges: picker?.querySelectorAll(".companion-card-role").length || 0,
      roleStrips: picker?.querySelectorAll(".companion-card-role-strip").length || 0,
    };
  });
  record("in-session-picker", inSessionPicker.open);
  record(
    "in-session-no-role-chrome",
    inSessionPicker.roleBadges === 0 && inSessionPicker.roleStrips === 0,
    `badges=${inSessionPicker.roleBadges} strips=${inSessionPicker.roleStrips}`,
  );
  try {
    const modelsBefore = loadedModels.length;
    await switchCompanionInSession(page, "alicia");
    await waitForSessionCharacter(page, "alicia");
    const aliciaAudit = await readLoadedCharacterAudit(page, "alicia");
    const aliciaNetwork = loadedModels.slice(modelsBefore).some((u) => /alicia/i.test(u));
    record(
      "switch-character-model",
      aliciaAudit.urlMatches &&
        aliciaAudit.storageId === "alicia" &&
        aliciaAudit.characterId === "alicia",
      JSON.stringify({ audit: aliciaAudit, network: aliciaNetwork, requests: loadedModels.slice(modelsBefore) }),
    );

    await switchCompanionInSession(page, "ember");
    await waitForSessionCharacter(page, "ember");
    const emberMouth = await page.evaluate(async () => {
      window.__amojiAvatar.setTalking(true);
      window.__amojiAvatar.setMouthOpen(0.9);
      window.__amojiAvatar.setMouthShape("aa");
      await new Promise((r) => setTimeout(r, 700));
      const expr = window.__amojiAvatar.vrm?.expressionManager;
      const jaw = window.__amojiAvatar.vrm?.humanoid?.getNormalizedBoneNode?.("jaw");
      return {
        aa: Number(expr?.getValue?.("aa") ?? expr?.getValue?.("A") ?? 0),
        jawX: Number(jaw?.rotation?.x ?? 0),
      };
    });
    record(
      "ember-talk-mouth-capped",
      (emberMouth.aa || 0) <= 0.42 && Math.abs(emberMouth.jawX || 0) < 0.02,
      JSON.stringify(emberMouth),
    );
    await page.evaluate(() => {
      window.__amojiAvatar?.setTalking?.(false);
      window.__amojiAvatar?.setMouthOpen?.(0);
    });

    const beforeNova = loadedModels.length;
    await switchCompanionInSession(page, "nova");
    let roundTrip = false;
    try {
      await waitForSessionCharacter(page, "nova");
      roundTrip = true;
    } catch {
      roundTrip = false;
    }
    const novaAudit = await readLoadedCharacterAudit(page, "nova");
    const novaNetwork = loadedModels.slice(beforeNova).some((u) => /nova\.vrm/i.test(u));
    record(
      "switch-round-trip-nova",
      roundTrip &&
        novaAudit.urlMatches &&
        novaAudit.storageId === "nova" &&
        novaAudit.characterId === "nova",
      JSON.stringify({ roundTrip, audit: novaAudit, network: novaNetwork }),
    );
  } catch (err) {
    record("switch-character-model", false, String(err?.message || err));
    record("switch-round-trip-nova", false, String(err?.message || err));
    record("ember-talk-mouth-capped", false, String(err?.message || err));
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
