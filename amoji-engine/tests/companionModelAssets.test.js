import { describe, expect, it } from "vitest";
import { AMOJI_MODEL_REVISION } from "../engine/companion/companionCharacterMigration.mjs";
import { defaultVrmModelFetchUrl } from "../engine/companion/companionModelAssets.mjs";

describe("companionModelAssets", () => {
  it("defaultVrmModelFetchUrl uses roster id paths (not legacy girl sample)", () => {
    const yuki = defaultVrmModelFetchUrl("olivia");
    expect(yuki).toContain("/prototypes/assets/companion-yuki.vrm");
    expect(yuki).toContain(AMOJI_MODEL_REVISION);
    expect(yuki).not.toContain("companion-girl");
    expect(yuki).not.toContain("companion-olivia");
  });
});
