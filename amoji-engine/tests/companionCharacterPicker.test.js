import { describe, expect, it } from "vitest";
import { listCompanionCharacters } from "../engine/companion/companionCharacterCatalog.js";
import {
  COMPANION_CHARACTER_PICKER_SCHEMA,
  COMPANION_START_PICKER_SCHEMA,
} from "../engine/companion/companionCharacterPicker.js";

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

  it("includes high-poly official badge for kizuna", () => {
    const kizuna = listCompanionCharacters("en").find((c) => c.id === "kizuna");
    expect(kizuna?.badge).toMatch(/#2/i);
    expect(kizuna?.faceTier).toBe("high");
    expect(kizuna?.faceTriangles).toBeGreaterThan(70000);
  });

  it("exposes HD face metadata for high-poly roster picks", () => {
    const ember = listCompanionCharacters("en").find((c) => c.id === "ember");
    const alicia = listCompanionCharacters("en").find((c) => c.id === "alicia");
    expect(ember?.faceTier).toBe("high");
    expect(ember?.faceLabel).toMatch(/23k/i);
    expect(alicia?.faceTier).toBe("high");
    expect(alicia?.faceLabel).toMatch(/32k/i);
  });

  it("includes per-character voice labels for picker cards", () => {
    const nova = listCompanionCharacters("yue").find((c) => c.id === "nova");
    const hina = listCompanionCharacters("yue").find((c) => c.id === "hina");
    expect(nova?.voiceLabel).toBe("曉曼·明亮");
    expect(hina?.voiceLabel).toBeTruthy();
  });

  it("numbers picker cards in roster order", () => {
    const list = listCompanionCharacters("en");
    expect(list[0]).toMatchObject({ id: "nova", number: 1 });
    expect(list[1]).toMatchObject({ id: "kizuna", number: 2 });
    expect(list.map((c) => c.number)).toEqual(
      list.map((_, i) => i + 1),
    );
  });

  it("bumps picker schemas for v4 hero + confirm flow", () => {
    expect(COMPANION_CHARACTER_PICKER_SCHEMA).toBe(
      "amoji.companionCharacterPicker.v7-roster27-scenes27",
    );
    expect(COMPANION_START_PICKER_SCHEMA).toBe("amoji.companionStartPicker.v11");
  });
});
