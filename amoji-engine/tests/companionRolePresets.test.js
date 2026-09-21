import { describe, expect, it } from "vitest";
import {
  isCharacterRecommendedForRole,
  rolePreset,
} from "../engine/mobile/companionRolePresets.js";

describe("companionRolePresets", () => {
  it("recommends cool for boyfriend and girlfriend roster for romance", () => {
    expect(isCharacterRecommendedForRole("boyfriend", "cool")).toBe(true);
    expect(isCharacterRecommendedForRole("boyfriend", "nova")).toBe(false);
    expect(isCharacterRecommendedForRole("secretary", "nova")).toBe(false);
    expect(rolePreset("boyfriend").defaultCharacterId).toBe("cool");
    expect(rolePreset("girlfriend").characterIds).toContain("nova");
    expect(rolePreset("secretary").defaultCharacterId).toBe("nova");
  });
});
