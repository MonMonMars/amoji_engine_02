import { describe, expect, it } from "vitest";
import {
  COMPANION_ROLES,
  isCharacterRecommendedForRole,
  normalizeCompanionRole,
  rolePreset,
  rolePromptFragment,
  saveCompanionRole,
} from "../engine/mobile/companionRolePresets.js";

describe("companionRolePresets", () => {
  it("normalizes role aliases", () => {
    expect(normalizeCompanionRole("bf")).toBe("boyfriend");
    expect(normalizeCompanionRole("assistant")).toBe("secretary");
    expect(normalizeCompanionRole("tamagotchi")).toBe("pet");
  });

  it("maps boyfriend role to chad default", () => {
    const preset = rolePreset("boyfriend");
    expect(preset.defaultCharacterId).toBe("chad");
    expect(preset.characterIds).toContain("david");
  });

  it("recommends characters per role", () => {
    expect(isCharacterRecommendedForRole("boyfriend", "chad")).toBe(true);
    expect(isCharacterRecommendedForRole("boyfriend", "rex")).toBe(true);
    expect(isCharacterRecommendedForRole("boyfriend", "rose")).toBe(false);
    expect(isCharacterRecommendedForRole("pet", "mimi")).toBe(true);
    expect(isCharacterRecommendedForRole("secretary", "rose")).toBe(true);
  });

  it("includes prompt fragments for all roles", () => {
    for (const role of COMPANION_ROLES) {
      expect(rolePromptFragment(role, true)).toMatch(/Role:/);
      expect(rolePromptFragment(role, false).length).toBeGreaterThan(8);
    }
  });

  it("persists role to storage", () => {
    const storage = new Map();
    const mock = {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
    };
    saveCompanionRole("boyfriend", mock);
    expect(storage.get("amoji.companionRole.v1")).toBe("boyfriend");
    expect(storage.get("amoji.mobile.lastCharacterId")).toBe("chad");
  });
});
