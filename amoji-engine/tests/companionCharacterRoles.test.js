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

  it("uses samurai as the default boyfriend pick (Gen3 slot #17)", () => {
    expect(resolveCharacterRole("rex")).toBe("boyfriend");
    expect(resolveCharacterRole("samurai")).toBe("boyfriend");
    expect(characterIdsForRole("boyfriend")).toEqual([
      "atlas",
      "knight",
      "samurai",
      "wolf",
      "beach",
      "pirate",
    ]);
    expect(ROLE_DEFAULT_CHARACTER_ID.boyfriend).toBe("samurai");
  });

  it("uses sakura for secretary defaults", () => {
    expect(ROLE_DEFAULT_CHARACTER_ID.secretary).toBe("sakura");
    expect(characterIdsForRole("secretary")).toEqual([
      "sakura",
      "luna",
      "aria",
      "noah",
    ]);
  });

  it("lists girlfriend roster characters", () => {
    expect(characterIdsForRole("girlfriend")).toEqual([
      "nova",
      "kizuna",
      "alicia",
      "ember",
      "mei",
      "sky",
      "yuki",
      "hina",
      "mio",
      "amoji",
      "tiger",
      "leaf",
      "jenny",
      "petal",
      "celeste",
      "yume",
      "rika",
      "vega",
    ]);
  });

  it("lists fox, weirdcat, and bunny as pet mascots", () => {
    expect(resolveCharacterRole("mimi")).toBe("pet");
    expect(ROLE_DEFAULT_CHARACTER_ID.pet).toBe("bunny");
    expect(characterIdsForRole("pet")).toEqual(["fox", "weirdcat", "bunny"]);
  });
});
