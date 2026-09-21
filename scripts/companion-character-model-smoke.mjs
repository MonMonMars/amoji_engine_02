#!/usr/bin/env node
/**
 * Verify selected character loads matching VRM/GLB (not default fallback).
 *
 * Usage:
 *   node scripts/companion-character-model-smoke.mjs --url <companion-full-url> --character nova
 */
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";
import { normalizeLegacyRosterCharacterId } from "../amoji-engine/engine/companion/companionLegacyRosterIds.js";
import { rosterVrmBasename } from "../amoji-engine/engine/companion/rosterVrmAssets.mjs";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

/**
 * @param {string} characterId
 */
export function expectedForCharacter(characterId) {
  const canonicalId = normalizeLegacyRosterCharacterId(characterId);
  return {
    canonicalId,
    kind: "vrm3d",
    model: rosterVrmBasename(canonicalId),
  };
}

/**
 * @param {{ baseUrl: string, characterId: string }} opts
 */
export async function runCompanionCharacterModelSmoke(opts) {
  const characterId = opts.characterId || "nova";
  const expected = expectedForCharacter(characterId);

  const url = new URL(opts.baseUrl);
  url.searchParams.set("character", characterId);
  url.searchParams.set("automic", "0");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });

  const loadedModels = [];
  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("/prototypes/assets/") && /\.(vrm|glb)/i.test(u)) {
      loadedModels.push(u);
    }
  });

  /** @type {Record<string, unknown>} */
  let report = {};
  try {
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 120000 });
    await beginStartPickerSession(page, {
      characterId: expected.canonicalId,
      cardTimeout: 20000,
      dismissTimeout: 60000,
    });

    await page.waitForFunction(
      () => {
        const kind = window.__amojiAvatarKind;
        return kind && kind !== "loading" && kind !== "webgl3d" && kind !== "canvas2d";
      },
      undefined,
      { timeout: 60000 },
    );

    report = await page.evaluate(() => ({
      build: window.__amojiBuild,
      avatarKind: window.__amojiAvatarKind,
      characterId: window.localStorage?.getItem("amoji.companion.characterId"),
      loadedModelUrl: window.__amojiLoadedModelUrl || null,
      loadedCharacterId: window.__amojiLoadedCharacterId || null,
    }));
  } finally {
    await browser.close().catch(() => {});
  }

  const hitExpected = loadedModels.some((u) => u.includes(expected.model));
  const urlMatches = String(report.loadedModelUrl || "").includes(expected.model);
  const idMatches =
    report.characterId === expected.canonicalId &&
    report.loadedCharacterId === expected.canonicalId;

  const ok =
    report.avatarKind === expected.kind &&
    idMatches &&
    urlMatches &&
    (hitExpected || urlMatches);

  return {
    ok,
    characterId,
    expected,
    report,
    loadedModels: [...new Set(loadedModels)],
    hitExpected,
    hitDefaultGirl: loadedModels.some((u) => u.includes("companion-girl.vrm")),
  };
}

async function main() {
  const baseUrl = parseArg(
    "--url",
    "http://127.0.0.1:5174/prototypes/amoji-companion.html?lang=yue",
  );
  const characterId = parseArg("--character", "nova");
  const result = await runCompanionCharacterModelSmoke({ baseUrl, characterId });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
