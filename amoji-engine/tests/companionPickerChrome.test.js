import { describe, expect, it } from "vitest";
import { listCompanionCharacters } from "../engine/companion/companionCharacterCatalog.js";
import {
  COMPANION_PICKER_CHROME_SCHEMA,
  filterPickerCharacters,
  isPickerFeatured,
  isPickerHdFace,
  isPickerWarmTone,
  pickerCopy,
  pickerFilterButtonsHtml,
  pickerFilterLabels,
  PICKER_FILTER_IDS,
  PICKER_HERO_HTML,
} from "../engine/companion/companionPickerChrome.js";

describe("companionPickerChrome", () => {
  const list = listCompanionCharacters("en");

  it("exports schema and filter ids", () => {
    expect(COMPANION_PICKER_CHROME_SCHEMA).toBe("amoji.companionPickerChrome.v1");
    expect(PICKER_FILTER_IDS).toEqual(["all", "featured", "hd", "warm"]);
  });

  it("provides bilingual copy for hero + confirm CTA", () => {
    const en = pickerCopy(true);
    const yue = pickerCopy(false);
    expect(en.begin).toBe("Begin chat");
    expect(en.switch).toBe("Switch companion");
    expect(yue.begin).toBe("開始傾偈");
    expect(yue.switch).toBe("切換同伴");
    expect(en.searchPlaceholder).toMatch(/Search/i);
    expect(yue.searchPlaceholder).toMatch(/搜尋/);
  });

  it("renders filter chip tabs with active state", () => {
    const html = pickerFilterButtonsHtml(true, "featured");
    expect(html).toContain('data-picker-filter="featured"');
    expect(html).toContain("is-active");
    expect(html).toContain(pickerFilterLabels(true).featured);
  });

  it("includes hero preview markup", () => {
    expect(PICKER_HERO_HTML).toContain("picker-hero-portrait");
    expect(PICKER_HERO_HTML).toContain("picker-hero-traits");
  });

  it("flags gallery priority companions as featured", () => {
    const nova = list.find((c) => c.id === "nova");
    const kizuna = list.find((c) => c.id === "kizuna");
    expect(isPickerFeatured(nova)).toBe(true);
    expect(isPickerFeatured(kizuna)).toBe(true);
    const featured = filterPickerCharacters(list, { filter: "featured" });
    expect(featured.map((c) => c.id)).toContain("nova");
    expect(featured.length).toBeGreaterThanOrEqual(4);
  });

  it("filters HD face roster picks", () => {
    const hd = filterPickerCharacters(list, { filter: "hd" });
    expect(hd.length).toBeGreaterThan(0);
    for (const item of hd) {
      expect(isPickerHdFace(item)).toBe(true);
    }
    const kizuna = list.find((c) => c.id === "kizuna");
    expect(isPickerHdFace(kizuna)).toBe(true);
  });

  it("filters warm-tone companions from traits", () => {
    const warm = filterPickerCharacters(list, { filter: "warm" });
    expect(warm.length).toBeGreaterThan(0);
    for (const item of warm) {
      expect(isPickerWarmTone(item)).toBe(true);
    }
  });

  it("searches by name or roster number", () => {
    const byName = filterPickerCharacters(list, { query: "nova" });
    expect(byName.some((c) => c.id === "nova")).toBe(true);
    const byNum = filterPickerCharacters(list, { query: "2" });
    expect(byNum.some((c) => c.id === "kizuna")).toBe(true);
  });
});
