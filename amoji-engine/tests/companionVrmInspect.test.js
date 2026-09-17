import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectVrmBuffer,
  sortModelUrlsForPreload,
} from "../engine/companion/companionVrmInspect.js";

const assets = join(dirname(fileURLToPath(import.meta.url)), "../../prototypes/assets");

describe("companionVrmInspect", () => {
  it("reports Kizuna as highest triangle count in roster", () => {
    const kizuna = inspectVrmBuffer(
      readFileSync(join(assets, "kizuna-kamatte.vrm")),
      "kizuna-kamatte.vrm",
    );
    const nova = inspectVrmBuffer(
      readFileSync(join(assets, "companion-nova.vrm")),
      "companion-nova.vrm",
    );
    expect(kizuna.triangles).toBeGreaterThan(60000);
    expect(kizuna.triangles).toBeGreaterThan(nova.triangles);
    const alicia = inspectVrmBuffer(
      readFileSync(join(assets, "companion-alicia.vrm")),
      "companion-alicia.vrm",
    );
    expect(alicia.visemes).toEqual(
      expect.arrayContaining(["a", "i", "u", "e", "o"]),
    );
  });

  it("prioritizes high-poly face models in preload order", () => {
    const sorted = sortModelUrlsForPreload([
      "/prototypes/assets/companion-chibi.vrm",
      "/prototypes/assets/kizuna-kamatte.vrm",
      "/prototypes/assets/companion-nova.vrm",
    ]);
    expect(sorted[0]).toContain("kizuna-kamatte");
    expect(sorted[1]).toContain("companion-nova");
  });
});
