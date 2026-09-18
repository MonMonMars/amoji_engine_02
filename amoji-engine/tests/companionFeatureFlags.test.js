import { describe, expect, it } from "vitest";
import {
  COMPANION_CARE_ENABLED,
  isCompanionCareEnabledForRole,
} from "../engine/companion/companionFeatureFlags.js";

describe("companionFeatureFlags", () => {
  it("disables care (eating/petting) while talk/body/face ship", () => {
    expect(COMPANION_CARE_ENABLED).toBe(false);
  });

  it("enables care automatically in pet mode", () => {
    expect(isCompanionCareEnabledForRole("pet")).toBe(true);
    expect(isCompanionCareEnabledForRole("girlfriend")).toBe(false);
    expect(isCompanionCareEnabledForRole("secretary")).toBe(false);
  });
});
