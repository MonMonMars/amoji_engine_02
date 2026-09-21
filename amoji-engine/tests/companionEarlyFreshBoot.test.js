import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { startAppUpdateWatcher } from "../engine/companion/companionFreshBoot.js";
import { PICKER_SCENE_ART_REVISION } from "../engine/companion/companionPickerAssets.mjs";
import { OUTDOOR_SCENE_BACKGROUND_IDS } from "../engine/companion/companionScenePresets.js";

const earlyBoot = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../engine/companion/companionEarlyFreshBoot.js",
  ),
  "utf8",
);

describe("companionEarlyFreshBoot", () => {
  it("redirects sticky cached pathnames to /play without reload loops on picker", () => {
    expect(earlyBoot).toMatch(/fetch\s*\(\s*["']\/api\/health/);
    expect(earlyBoot).toMatch(/companion-full/);
    expect(earlyBoot).toMatch(/location\.replace\("\/play"/);
    expect(earlyBoot).toMatch(/__amojiActiveBuild/);
    expect(earlyBoot).toMatch(/paintAtmosphereEarly/);
    expect(earlyBoot).toContain("scene-bg/");
    expect(earlyBoot).toContain('".svg?v="');
    expect(earlyBoot).not.toMatch(/pick=1&automic=0/);
    expect(earlyBoot).toContain(PICKER_SCENE_ART_REVISION);
    for (const id of OUTDOOR_SCENE_BACKGROUND_IDS) {
      expect(earlyBoot).toContain(id);
    }
  });
});

describe("startAppUpdateWatcher", () => {
  it("listens for persisted pageshow so BFCache cannot keep a stale build", () => {
    const listeners = [];
    const originalAdd = globalThis.addEventListener;
    globalThis.addEventListener = (type, fn) => {
      listeners.push({ type, fn });
    };
    try {
      startAppUpdateWatcher({ intervalMs: 0, fetchImpl: async () => ({ ok: false }) });
      expect(listeners.some((row) => row.type === "pageshow")).toBe(true);
    } finally {
      if (originalAdd) globalThis.addEventListener = originalAdd;
      else delete globalThis.addEventListener;
    }
  });
});
