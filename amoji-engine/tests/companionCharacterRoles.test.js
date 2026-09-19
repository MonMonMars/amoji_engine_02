import { describe, expect, it } from "vitest";
import {
  CHARACTER_COMPANION_ROLES,
  characterIdsForRole,
  resolveCharacterRole,
  roleFunctionBadge,
  validateCharacterRoleCoverage,
} from "../engine/companion/companionCharacterRoles.js";
import { ROSTER_CHARACTER_IDS } from "../engine/companion/companionCharacterRoster.js";

describe("companionCharacterRoles", () => {
  it("maps every roster character to a function", () => {
    expect(validateCharacterRoleCoverage()).toEqual([]);
    expect(Object.keys(CHARACTER_COMPANION_ROLES).length).toBeGreaterThanOrEqual(
      ROSTER_CHARACTER_IDS.length,
    );
  });

  it("resolves embedded function from character id", () => {
    expect(resolveCharacterRole("nova")).toBe("girlfriend");
    expect(resolveCharacterRole("chad")).toBe("boyfriend");
    expect(resolveCharacterRole("kate")).toBe("secretary");
    expect(resolveCharacterRole("mimi")).toBe("pet");
  });

  it("groups characters by function", () => {
    expect(characterIdsForRole("boyfriend")).toContain("rex");
    expect(characterIdsForRole("secretary")).toContain("rose");
    expect(characterIdsForRole("pet")).toContain("chibi");
    expect(characterIdsForRole("girlfriend")).toContain("amoji");
  });

  it("labels function badges", () => {
    expect(roleFunctionBadge("secretary", true)).toBe("Secretary");
    expect(roleFunctionBadge("pet", false)).toBe("寵物");
  });
});
