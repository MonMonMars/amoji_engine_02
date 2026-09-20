import { describe, expect, it } from "vitest";
import { AMOJI_MODEL_REVISION } from "../engine/companion/companionCharacterMigration.mjs";
import {
  defaultVrmModelFetchUrl,
  modelPathMatchesCharacterId,
} from "../engine/companion/companionModelAssets.mjs";

describe("companionModelAssets", () => {
  it("defaultVrmModelFetchUrl uses roster id paths (not legacy girl sample)", () => {
    const yuki = defaultVrmModelFetchUrl("olivia");
    expect(yuki).toContain("/prototypes/assets/companion-yuki.vrm");
    expect(yuki).toContain(AMOJI_MODEL_REVISION);
    expect(yuki).not.toContain("companion-girl");
    expect(yuki).not.toContain("companion-olivia");
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
