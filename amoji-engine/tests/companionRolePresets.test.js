import { describe, expect, it } from "vitest";
import {
  isCharacterRecommendedForRole,
  rolePreset,
} from "../engine/mobile/companionRolePresets.js";

describe("companionRolePresets", () => {
  it("recommends samurai for boyfriend and girlfriend roster for romance", () => {
    expect(isCharacterRecommendedForRole("boyfriend", "samurai")).toBe(true);
    expect(isCharacterRecommendedForRole("boyfriend", "nova")).toBe(false);
    expect(isCharacterRecommendedForRole("secretary", "nova")).toBe(false);
    expect(isCharacterRecommendedForRole("secretary", "sakura")).toBe(true);
    expect(isCharacterRecommendedForRole("secretary", "luna")).toBe(true);
    expect(rolePreset("boyfriend").defaultCharacterId).toBe("samurai");
    expect(rolePreset("girlfriend").characterIds).toContain("nova");
    expect(rolePreset("secretary").defaultCharacterId).toBe("sakura");
  });
});
