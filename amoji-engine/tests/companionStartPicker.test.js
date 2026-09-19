import { describe, expect, it } from "vitest";
import { listCompanionCharacters } from "../engine/companion/companionCharacterCatalog.js";
import {
  companionCardInnerHtml,
  createCompanionStartPicker,
  START_PICKER_PRELOAD_RING_HTML,
} from "../engine/companion/companionCharacterPicker.js";
import { PICKER_HERO_HTML } from "../engine/companion/companionPickerChrome.js";

describe("companion start picker", () => {
  it("renders compact card html without tagline block", () => {
    const html = companionCardInnerHtml(
      {
        id: "amoji",
        number: 14,
        name: "Amoji",
        tagline: "Playful friend",
        traits: ["warm", "witty"],
        previewImage: "/prototypes/assets/amoji-preview.png",
        accent: "#7fd4cf",
        badge: null,
      },
      { compact: true, selectedId: "amoji" },
    );
    expect(html).toContain("companion-card-portrait");
    expect(html).toContain("companion-card-number");
    expect(html).toContain(">14<");
    expect(html).toContain("14 Amoji");
    expect(html).not.toContain("companion-card-tagline");
  });

  it("lists enough characters for the start grid", () => {
    const list = listCompanionCharacters("en");
    expect(list.length).toBe(10);
    const html = companionCardInnerHtml(list[0], {
      compact: true,
      selectedId: list[0].id,
    });
    expect(html).toContain(list[0].name);
    expect(html).toContain("companion-card-number");
    expect(html).toContain(`>${list[0].number}<`);
  });

  it("start picker uses the same compact card layout as in-session picker", () => {
    const item = listCompanionCharacters("en")[0];
    const startCard = companionCardInnerHtml(item, { compact: true });
    const sessionCard = companionCardInnerHtml(item, { compact: true });
    expect(startCard).toBe(sessionCard);
    expect(startCard).not.toContain("companion-card-tagline");
  });

  it("includes ring plus linear model download bar", () => {
    expect(START_PICKER_PRELOAD_RING_HTML).toContain("companion-progress-ring");
    expect(START_PICKER_PRELOAD_RING_HTML).toContain("companion-progress-ring-fill");
    if (typeof document === "undefined") return;
    const picker = createCompanionStartPicker({
      isEnglish: true,
      selectedId: "nova",
      onStart: () => {},
    });
    expect(picker.element.querySelector(".start-picker-preload-track")).toBeTruthy();
    expect(picker.element.querySelector(".start-picker-preload-fill")).toBeTruthy();
    picker.setPreloadProgress(42, "Downloading model… 42%");
    expect(
      picker.element.querySelector(".start-picker-preload-fill")?.style.width,
    ).toBe("42%");
    picker.destroy();
  });

  it("v4 start picker includes hero preview and begin CTA", () => {
    expect(PICKER_HERO_HTML).toContain("picker-hero-name");
    if (typeof document === "undefined") return;
    let startedWith = null;
    const picker = createCompanionStartPicker({
      isEnglish: true,
      selectedId: "nova",
      onStart: (id) => {
        startedWith = id;
      },
    });
    expect(picker.schema).toBe("amoji.companionStartPicker.v3");
    expect(picker.element.querySelector(".picker-hero")).toBeTruthy();
    expect(picker.element.querySelector(".picker-featured-row")).toBeTruthy();
    expect(picker.element.querySelector(".picker-begin-btn")).toBeTruthy();
    expect(picker.element.classList.contains("companion-picker--v4")).toBe(true);
    picker.enablePicking(true);
    picker.setSelected("kizuna");
    picker.element.querySelector(".picker-begin-btn")?.click();
    expect(startedWith).toBe("kizuna");
    picker.destroy();
  });

  it("card tap selects without starting until begin is pressed", () => {
    if (typeof document === "undefined") return;
    let started = false;
    const picker = createCompanionStartPicker({
      isEnglish: true,
      selectedId: "nova",
      onStart: () => {
        started = true;
      },
    });
    picker.enablePicking(true);
    const card = picker.element.querySelector('[data-character-id="ember"]');
    card?.click();
    expect(started).toBe(false);
    expect(
      picker.element.querySelector('[data-character-id="ember"]')?.classList.contains(
        "is-selected",
      ),
    ).toBe(true);
    picker.destroy();
  });
});
