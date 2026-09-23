import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AMOJI_BUILD } from "../engine/companion/buildVersion.mjs";
import { SCENE_BACKGROUND_PRESETS } from "../engine/companion/companionScenePresets.js";
import { PICKER_SCENE_ART_REVISION } from "../engine/companion/companionPickerAssets.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const htmlPath = join(root, "prototypes/amoji-companion.html");
const cssPath = join(root, "prototypes/companion-scene-backgrounds.css");

describe("companion scene backgrounds css", () => {
  it("links scene background stylesheet from companion html", () => {
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("companion-scene-backgrounds.css");
    expect(html).toContain(AMOJI_BUILD);
  });

  it("css references SVG art for each preset", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain(PICKER_SCENE_ART_REVISION);
    for (const preset of SCENE_BACKGROUND_PRESETS) {
      expect(css).toContain(`scene-bg/${preset.id}.svg`);
    }
  });

  it("scene picker swatches use the same cache-bust tag as atmosphere PNGs", () => {
    const css = readFileSync(cssPath, "utf8");
    const swatchBlocks = css.match(/\.scene-preset__swatch--[\w-]+\s*\{[\s\S]*?\}/g) || [];
    expect(swatchBlocks.length).toBeGreaterThan(10);
    for (const block of swatchBlocks) {
      expect(block).toContain(PICKER_SCENE_ART_REVISION);
    }
  });

  it("ships svg scene files on disk", () => {
    const dir = join(root, "prototypes/assets/scene-bg");
    const missing = SCENE_BACKGROUND_PRESETS.filter(
      (p) => !existsSync(join(dir, `${p.id}.svg`)),
    ).map((p) => p.id);
    expect(missing).toEqual([]);
  });
});
