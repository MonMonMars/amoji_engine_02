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
      expect.arrayContaining([...ROSTER_CHARACTER_IDS]),
    );
  });

  it("uses cool as the default boyfriend pick (Gen2 slot #20)", () => {
    expect(resolveCharacterRole("rex")).toBe("boyfriend");
    expect(resolveCharacterRole("lantern")).toBe("boyfriend");
    expect(characterIdsForRole("boyfriend")).toEqual(["atlas", "cool", "lantern"]);
    expect(ROLE_DEFAULT_CHARACTER_ID.boyfriend).toBe("cool");
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
      "sakura",
      "celeste",
      "mei",
      "luna",
      "yume",
      "sky",
      "yuki",
      "hina",
      "mio",
      "amoji",
      "pyre",
      "circle",
      "face",
      "samplec",
      "drift",
    ]);
  });

  it("lists pan as pet mascot", () => {
    expect(resolveCharacterRole("mimi")).toBe("pet");
    expect(ROLE_DEFAULT_CHARACTER_ID.pet).toBe("pan");
    expect(characterIdsForRole("pet")).toEqual(["pan"]);
  });
});
