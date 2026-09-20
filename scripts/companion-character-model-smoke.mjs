#!/usr/bin/env node
/**
 * Verify selected character loads matching VRM/GLB (not default fallback).
 *
 * Usage:
 *   node scripts/companion-character-model-smoke.mjs --url <companion-full-url> --character nova
 */
import { chromium } from "playwright";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

const CHARACTERS = {
  kizuna: { kind: "vrm3d", model: "companion-kizuna.vrm" },
  rex: { kind: "vrm3d", model: "companion-rex.vrm" },
  alicia: { kind: "vrm3d", model: "companion-alicia.vrm" },
  nova: { kind: "vrm3d", model: "companion-nova.vrm" },
  ember: { kind: "vrm3d", model: "companion-ember.vrm" },
  nana: { kind: "vrm3d", model: "companion-nana.vrm" },
  yuki: { kind: "vrm3d", model: "companion-yuki.vrm" },
};

async function main() {
  const baseUrl = parseArg(
    "--url",
    "http://127.0.0.1:5174/prototypes/amoji-companion.html?lang=yue",
  );
  const characterId = parseArg("--character", "nova");
  const expected = CHARACTERS[characterId];
  if (!expected) {
    console.error(`Unknown character: ${characterId}`);
    process.exit(2);
  }

  const url = new URL(baseUrl);
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

  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 120000 });
  await beginStartPickerSession(page, {
    characterId,
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

  const report = await page.evaluate(() => ({
    build: window.__amojiBuild,
    avatarKind: window.__amojiAvatarKind,
    characterId: window.localStorage?.getItem("amoji.companion.characterId"),
    loadedModelUrl: window.__amojiLoadedModelUrl || null,
    loadedCharacterId: window.__amojiLoadedCharacterId || null,
  }));

  await browser.close();

  const hitExpected = loadedModels.some((u) => u.includes(expected.model));
  const urlMatches = String(report.loadedModelUrl || "").includes(expected.model);
  const idMatches =
    report.characterId === characterId && report.loadedCharacterId === characterId;

  const ok =
    report.avatarKind === expected.kind &&
    idMatches &&
    urlMatches &&
    (hitExpected || urlMatches);

  console.log(
    JSON.stringify(
      {
        ok,
        characterId,
        expected,
        report,
        loadedModels: [...new Set(loadedModels)],
        hitExpected,
        hitDefaultGirl: loadedModels.some((u) => u.includes("companion-girl.vrm")),
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
