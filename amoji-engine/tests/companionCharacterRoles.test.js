import { describe, expect, it } from "vitest";
import {
  characterIdsForRole,
  CHARACTER_COMPANION_ROLES,
  resolveCharacterRole,
  ROLE_DEFAULT_CHARACTER_ID,
  validateCharacterRoleCoverage,
} from "../engine/companion/companionCharacterRoles.js";
import { ROSTER_CHARACTER_IDS } from "../engine/companion/companionCharacterRoster.js";

describe("companionCharacterRoles", () => {
  it("maps every roster character to a function", () => {
    expect(validateCharacterRoleCoverage()).toEqual([]);
    expect(Object.keys(CHARACTER_COMPANION_ROLES).sort()).toEqual(
      [...ROSTER_CHARACTER_IDS].sort(),
    );
  });

  it("keeps rex as the boyfriend pick", () => {
    expect(resolveCharacterRole("rex")).toBe("boyfriend");
    expect(characterIdsForRole("boyfriend")).toEqual(["rex"]);
    expect(ROLE_DEFAULT_CHARACTER_ID.boyfriend).toBe("rex");
  });

  it("uses nova for secretary defaults", () => {
    expect(ROLE_DEFAULT_CHARACTER_ID.secretary).toBe("nova");
    expect(characterIdsForRole("secretary")).toEqual([]);
  });

  it("lists girlfriend roster characters", () => {
    expect(characterIdsForRole("girlfriend")).toEqual([
      "nova",
      "kizuna",
      "alicia",
      "ember",
      "sky",
      "yuki",
      "hina",
      "mio",
      "amoji",
    ]);
  });
});
