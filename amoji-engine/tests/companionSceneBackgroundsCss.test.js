import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AMOJI_BUILD } from "../engine/companion/buildVersion.mjs";
import { SCENE_BACKGROUND_PRESETS } from "../engine/companion/companionScenePresets.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const htmlPath = join(root, "prototypes/amoji-companion.html");
const cssPath = join(root, "prototypes/companion-scene-backgrounds.css");

describe("companion scene backgrounds css", () => {
  it("links scene background stylesheet from companion html", () => {
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("companion-scene-backgrounds.css");
    expect(html).toContain(AMOJI_BUILD);
  });

  it("css references PNG art for each preset", () => {
    const css = readFileSync(cssPath, "utf8");
    for (const preset of SCENE_BACKGROUND_PRESETS) {
      if (preset.id === "night-city") {
        expect(css).toContain("companion-bg-anime.png");
        continue;
      }
      expect(css).toContain(`scene-bg/${preset.id}.png`);
    }
  });

  it("ships png files on disk", () => {
    const dir = join(root, "prototypes/assets/scene-bg");
    const missing = SCENE_BACKGROUND_PRESETS.filter(
      (p) => !existsSync(join(dir, `${p.id}.png`)),
    ).map((p) => p.id);
    expect(missing).toEqual([]);
  });
});
