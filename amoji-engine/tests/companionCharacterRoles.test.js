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

  it("uses kael as the default boyfriend pick", () => {
    expect(resolveCharacterRole("rex")).toBe("boyfriend");
    expect(resolveCharacterRole("samurai")).toBe("boyfriend");
    expect(characterIdsForRole("boyfriend")).toEqual([
      "atlas",
      "orion",
      "kael",
      "rin",
      "vesper",
      "ash",
    ]);
    expect(ROLE_DEFAULT_CHARACTER_ID.boyfriend).toBe("kael");
  });

  it("uses shino for secretary defaults", () => {
    expect(ROLE_DEFAULT_CHARACTER_ID.secretary).toBe("shino");
    expect(characterIdsForRole("secretary")).toEqual([
      "shino",
      "luna",
      "hana",
      "zane",
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
      "mira",
      "sumire",
      "niko",
      "thorn",
      "juno",
      "elio",
      "priya",
      "cyrus",
    ]);
  });

  it("lists dex, yara, and cleo as pet mascots", () => {
    expect(resolveCharacterRole("mimi")).toBe("pet");
    expect(ROLE_DEFAULT_CHARACTER_ID.pet).toBe("cleo");
    expect(characterIdsForRole("pet")).toEqual(["dex", "yara", "cleo"]);
  });
});
