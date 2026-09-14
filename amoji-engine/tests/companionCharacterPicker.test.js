import { describe, expect, it } from "vitest";
import { listCompanionCharacters } from "../engine/companion/companionCharacterCatalog.js";

describe("companion character picker data", () => {
  it("lists all companions with preview metadata", () => {
    const list = listCompanionCharacters("en");
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.map((c) => c.id)).toContain("kizuna");
    for (const item of list) {
      expect(item.previewImage).toMatch(/^\/prototypes\//);
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.traits.length).toBeGreaterThan(0);
    }
  });

  it("includes official badge for kizuna", () => {
    const kizuna = listCompanionCharacters("en").find((c) => c.id === "kizuna");
    expect(kizuna?.badge).toMatch(/official/i);
    expect(kizuna?.previewImage).toContain("kizuna");
  });
});
