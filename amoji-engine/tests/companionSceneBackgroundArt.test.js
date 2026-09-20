import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENE_BACKGROUND_PRESETS } from "../engine/companion/companionScenePresets.js";

const assetsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../prototypes/assets/scene-bg",
);

describe("companion scene background art", () => {
  it("ships SVG or PNG art for every background preset", () => {
    const missing = SCENE_BACKGROUND_PRESETS.filter(
      (p) =>
        !existsSync(join(assetsDir, `${p.id}.svg`)) &&
        !existsSync(join(assetsDir, `${p.id}.png`)),
    ).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it("ships raster PNG for every preset (HQ backgrounds)", () => {
    const missingPng = SCENE_BACKGROUND_PRESETS.filter(
      (p) => !existsSync(join(assetsDir, `${p.id}.png`)),
    ).map((p) => p.id);
    expect(missingPng).toEqual([]);
  });
});
