import { describe, expect, it } from "vitest";
import { listCompanionCharacters } from "../engine/companion/companionCharacterCatalog.js";
import { COMPANION_CHARACTER_PICKER_SCHEMA } from "../engine/companion/companionCharacterPicker.js";

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

  it("includes per-character voice labels for picker cards", () => {
    const amoji = listCompanionCharacters("yue").find((c) => c.id === "amoji");
    const sora = listCompanionCharacters("yue").find((c) => c.id === "sora");
    expect(amoji?.voiceLabel).toBe("曉佳");
    expect(sora?.voiceLabel).toBe("曉曼");
  });

  it("numbers picker cards in roster order", () => {
    const list = listCompanionCharacters("en");
    expect(list[0]).toMatchObject({ id: "nova", number: 1 });
    expect(list[1]).toMatchObject({ id: "alicia", number: 2 });
    expect(list.map((c) => c.number)).toEqual(
      list.map((_, i) => i + 1),
    );
  });

  it("keeps the in-session picker schema for the top-left chip", () => {
    expect(COMPANION_CHARACTER_PICKER_SCHEMA).toBe("amoji.companionCharacterPicker.v3");
  });
});
