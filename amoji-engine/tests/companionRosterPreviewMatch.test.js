import { describe, expect, it } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTER_IDS } from "../engine/companion/companionCharacterCatalog.js";
import {
  isCompanionHeroPreviewOk,
  isCompanionPreviewOk,
} from "../engine/companion/companionPreviewAssets.mjs";

const assetsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../prototypes/assets",
);

describe("roster picker previews match on-disk assets", () => {
  it("every roster id has a 3D-captured card PNG (not tiny/black placeholder)", () => {
    const bad = CHARACTER_IDS.filter((id) => !isCompanionPreviewOk(id, assetsDir));
    expect(bad, `re-run: npm run roster:previews — missing/bad: ${bad.join(", ")}`).toEqual(
      [],
    );
  });

  it("every roster id has a separate hero close-up PNG for the picker top portrait", () => {
    const bad = CHARACTER_IDS.filter(
      (id) => !isCompanionHeroPreviewOk(id, assetsDir),
    );
    expect(
      bad,
      `re-run: npm run roster:previews — missing/bad hero: ${bad.join(", ")}`,
    ).toEqual([]);
  });
});
