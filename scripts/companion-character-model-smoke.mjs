#!/usr/bin/env node
/**
 * Verify selected character loads matching VRM/GLB (not default fallback).
 *
 * Usage:
 *   node scripts/companion-character-model-smoke.mjs --url <companion-full-url> --character nova
 */
import { chromium } from "playwright";

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  return fallback;
}

const CHARACTERS = {
  alicia: { kind: "vrm3d", model: "companion-alicia.vrm" },
  nova: { kind: "vrm3d", model: "companion-nova.vrm" },
  ember: { kind: "vrm3d", model: "companion-ember.vrm" },
  chibi: { kind: "vrm3d", model: "companion-chibi.vrm" },
  quinn: { kind: "gltf3d", model: "companion-quinn.glb" },
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
    if (u.includes("/prototypes/assets/companion-")) {
      loadedModels.push(u);
    }
  });

  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector(
    `#start-character-picker [data-character-id="${characterId}"]`,
    { timeout: 20000 },
  );
  await page.click(`#start-character-picker [data-character-id="${characterId}"]`);

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
  }));

  await browser.close();

  const hitExpected = loadedModels.some((u) => u.includes(expected.model));

  const ok =
    report.avatarKind === expected.kind &&
    hitExpected &&
    report.characterId === characterId;

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
