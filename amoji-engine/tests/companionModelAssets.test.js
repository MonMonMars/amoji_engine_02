import { describe, expect, it } from "vitest";
import { AMOJI_MODEL_REVISION } from "../engine/companion/companionCharacterMigration.mjs";
import {
  defaultVrmModelFetchUrl,
  modelPathMatchesCharacterId,
  modelPreloadCacheKey,
  normalizeModelCacheKey,
} from "../engine/companion/companionModelAssets.mjs";

describe("companionModelAssets", () => {
  it("defaultVrmModelFetchUrl uses roster id paths (not legacy girl sample)", () => {
    const yuki = defaultVrmModelFetchUrl("olivia");
    expect(yuki).toContain("/prototypes/assets/companion-yuki.vrm");
    expect(yuki).toContain(AMOJI_MODEL_REVISION);
    expect(yuki).not.toContain("companion-girl");
    expect(yuki).not.toContain("companion-olivia");
  });

  it("modelPreloadCacheKey keeps ?v= revision separate from pathname-only key", () => {
    const path = "/prototypes/assets/companion-shino.vrm";
    const a = `${path}?v=roster-v559-wave3-cache`;
    const b = `${path}?v=roster-v561-vtuber-meshes`;
    expect(normalizeModelCacheKey(a)).toBe(normalizeModelCacheKey(b));
    expect(modelPreloadCacheKey(a)).not.toBe(modelPreloadCacheKey(b));
    expect(modelPreloadCacheKey(a)).toContain("v=roster-v559");
  });

  it("modelPathMatchesCharacterId accepts roster fetch URLs", () => {
    const ember = defaultVrmModelFetchUrl("ember");
    expect(modelPathMatchesCharacterId(ember, "ember")).toBe(true);
    expect(modelPathMatchesCharacterId(ember, "nova")).toBe(false);
    expect(
      modelPathMatchesCharacterId("/prototypes/assets/companion-kizuna.vrm", "kizuna"),
    ).toBe(true);
  });
});
