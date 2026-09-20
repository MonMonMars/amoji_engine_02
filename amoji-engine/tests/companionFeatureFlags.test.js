import { describe, expect, it } from "vitest";
import {
  COMPANION_CARE_ENABLED,
  COMPANION_EXPRESSIVE_INTERACTIONS,
  isCompanionCareEnabledForRole,
  isCompanionExpressiveEnabled,
} from "../engine/companion/companionFeatureFlags.js";

describe("companionFeatureFlags", () => {
  it("disables care (eating/petting) while talk/body/face ship", () => {
    expect(COMPANION_CARE_ENABLED).toBe(false);
  });

  it("keeps care off in all roles until re-enabled", () => {
    expect(isCompanionCareEnabledForRole("pet")).toBe(false);
    expect(isCompanionCareEnabledForRole("girlfriend")).toBe(false);
    expect(isCompanionCareEnabledForRole("secretary")).toBe(false);
  });

  it("keeps expressive voice, lip sync, and poke interactions on", () => {
    expect(COMPANION_EXPRESSIVE_INTERACTIONS).toBe(true);
    expect(isCompanionExpressiveEnabled()).toBe(true);
  });
});
