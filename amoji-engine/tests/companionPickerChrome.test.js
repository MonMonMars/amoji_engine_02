import { describe, expect, it } from "vitest";
import { listCompanionCharacters } from "../engine/companion/companionCharacterCatalog.js";
import {
  COMPANION_PICKER_CHROME_SCHEMA,
  filterPickerCharacters,
  isPickerFeatured,
  isPickerHdFace,
  isPickerWarmTone,
  listPickerFeatured,
  pickerCopy,
  pickerFilterButtonsHtml,
  pickerFilterLabels,
  PICKER_FEATURED_ROW_HTML,
  PICKER_FILTER_IDS,
  PICKER_HERO_HTML,
  syncPickerCardTabIndex,
  wirePickerRosterKeyboard,
} from "../engine/companion/companionPickerChrome.js";

describe("companionPickerChrome", () => {
  const list = listCompanionCharacters("en");

  it("exports schema and filter ids", () => {
    expect(COMPANION_PICKER_CHROME_SCHEMA).toBe("amoji.companionPickerChrome.v1");
    expect(PICKER_FILTER_IDS).toEqual([
      "all",
      "girlfriend",
      "boyfriend",
      "secretary",
      "pet",
      "featured",
      "hd",
      "warm",
    ]);
  });

  it("provides bilingual copy for hero + confirm CTA", () => {
    const en = pickerCopy(true);
    const yue = pickerCopy(false);
    expect(en.begin).toBe("Start");
    expect(en.switch).toBe("Switch companion");
    expect(yue.begin).toBe("開始");
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
    expect(PICKER_FEATURED_ROW_HTML).toContain("picker-featured-row");
  });

  it("lists featured banner picks in roster order", () => {
    const featured = listPickerFeatured(list, 4);
    expect(featured.length).toBe(4);
    expect(featured[0].id).toBe("nova");
    expect(featured[1].id).toBe("kizuna");
  });

  it("defaults featured banner to the full roster", () => {
    expect(listPickerFeatured(list).length).toBe(list.length);
    expect(listPickerFeatured(list).map((c) => c.id)).toContain("yuki");
    expect(listPickerFeatured(list).map((c) => c.id)).toContain("knight");
  });

  it("syncs roving tabindex for selected card", () => {
    if (typeof document === "undefined") return;
    const root = document.createElement("div");
    root.innerHTML = `
      <button class="companion-card" data-character-id="nova"></button>
      <button class="companion-card" data-character-id="kizuna"></button>
    `;
    syncPickerCardTabIndex(root, "kizuna");
    expect(root.querySelector('[data-character-id="nova"]').tabIndex).toBe(-1);
    expect(root.querySelector('[data-character-id="kizuna"]').tabIndex).toBe(0);
  });

  it("moves selection with arrow keys on roster strip", () => {
    if (typeof document === "undefined") return;
    const grid = document.createElement("div");
    grid.innerHTML = `
      <button class="companion-card" data-character-id="nova" tabindex="0"></button>
      <button class="companion-card" data-character-id="kizuna" tabindex="-1"></button>
    `;
    document.body.appendChild(grid);
    let selected = "nova";
    wirePickerRosterKeyboard(grid, {
      getSelectedId: () => selected,
      setSelectedId: (id) => {
        selected = id;
      },
    });
    const nova = grid.querySelector('[data-character-id="nova"]');
    nova?.focus();
    nova?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(selected).toBe("kizuna");
    grid.remove();
  });

  it("flags gallery priority companions as featured", () => {
    const nova = list.find((c) => c.id === "nova");
    const kizuna = list.find((c) => c.id === "kizuna");
    expect(isPickerFeatured(nova)).toBe(true);
    expect(isPickerFeatured(kizuna)).toBe(true);
    const featured = filterPickerCharacters(list, { filter: "featured" });
    expect(featured.map((c) => c.id)).toContain("nova");
    expect(featured.length).toBe(list.length);
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

  it("provides empty-results copy", () => {
    expect(pickerCopy(true).emptyResults).toMatch(/No companions/i);
    expect(pickerCopy(false).emptyResults).toMatch(/搵唔到/);
    expect(filterPickerCharacters(list, { query: "zzznomatch" })).toHaveLength(0);
  });

  it("enter on roster confirms when handler is wired", () => {
    if (typeof document === "undefined") return;
    const grid = document.createElement("div");
    grid.innerHTML = `<button class="companion-card" data-character-id="nova"></button>`;
    document.body.appendChild(grid);
    let confirmed = false;
    wirePickerRosterKeyboard(grid, {
      getSelectedId: () => "nova",
      setSelectedId: () => {},
      onConfirm: () => {
        confirmed = true;
      },
    });
    const card = grid.querySelector(".companion-card");
    card?.focus();
    card?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(confirmed).toBe(true);
    grid.remove();
  });
});
