import { describe, expect, it } from "vitest";
import { COMPANION_CARE_ENABLED } from "../engine/companion/companionFeatureFlags.js";

describe("companionFeatureFlags", () => {
  it("disables care (eating/petting) while talk/body/face ship", () => {
    expect(COMPANION_CARE_ENABLED).toBe(false);
  });
});
