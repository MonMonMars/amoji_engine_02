import { describe, expect, it, vi } from "vitest";
import {
  CHARACTER_IDS,
  listCompanionCharacters,
} from "../engine/companion/companionCharacterCatalog.js";
import {
  companionCardInnerHtml,
  createCompanionStartPicker,
  PICKER_SCENE_SECTION_HTML,
  START_PICKER_PRELOAD_RING_HTML,
} from "../engine/companion/companionCharacterPicker.js";
import { SCENE_BACKGROUND_PRESETS } from "../engine/companion/companionScenePresets.js";
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
    expect(list.length).toBe(CHARACTER_IDS.length);
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
    expect(picker.element.querySelector(".amoji-load-bar__track")).toBeTruthy();
    expect(picker.element.querySelector(".amoji-load-bar__fill")).toBeTruthy();
    picker.setPreloadProgress(42, "Downloading model… 42%");
    expect(
      picker.element.querySelector(".amoji-load-bar__fill")?.style.width,
    ).toBe("42%");
    picker.destroy();
  });

  it("v8 start picker uses showcase layout with hero stage, roster strip, and begin CTA", () => {
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
    expect(picker.schema).toBe("amoji.companionStartPicker.v9");
    expect(picker.element.querySelector(".picker-showcase-stage .picker-hero")).toBeTruthy();
    expect(picker.element.classList.contains("companion-picker--showcase")).toBe(
      true,
    );
    expect(picker.element.querySelector(".picker-roster-dock")).toBeTruthy();
    expect(picker.element.querySelector(".picker-toolbar")).toBeNull();
    expect(picker.element.querySelector(".picker-featured-wrap")).toBeNull();
    expect(
      picker.element.querySelectorAll(".companion-picker-grid--roster .companion-card")
        .length,
    ).toBe(CHARACTER_IDS.length);
    expect(
      picker.element.querySelectorAll(".companion-card--start-strip").length,
    ).toBe(CHARACTER_IDS.length);
    expect(picker.element.querySelector(".picker-begin-btn")).toBeTruthy();
    expect(picker.element.classList.contains("companion-picker--v4")).toBe(true);
    picker.enablePicking(true);
    picker.setSelected("kizuna");
    picker.element.querySelector(".picker-begin-btn")?.click();
    expect(startedWith).toBe("kizuna");
    picker.destroy();
  });

  it("start strip cards show portrait plus name; details appear in hero stage", () => {
    const item = listCompanionCharacters("en")[0];
    const stripHtml = companionCardInnerHtml(item, { compact: true, startStrip: true });
    expect(stripHtml).toContain("companion-card-portrait");
    expect(stripHtml).toContain("companion-card-name");
    expect(stripHtml).toContain("companion-card-number");
    expect(stripHtml).toContain(item.name);
    const sky = listCompanionCharacters("en").find((c) => c.id === "sky");
    const skyStrip = companionCardInnerHtml(sky, { compact: true, startStrip: true });
    expect(skyStrip).toContain(">5<");
    expect(skyStrip).toContain("companion-card-aaa");
    const miniHtml = companionCardInnerHtml(item, { compact: true, startMini: true });
    expect(miniHtml).not.toContain("companion-card-name");
    if (typeof document === "undefined") return;
    const picker = createCompanionStartPicker({
      isEnglish: true,
      selectedId: "kizuna",
      onStart: () => {},
    });
    const hero = picker.element.querySelector(".picker-hero");
    expect(hero?.classList.contains("has-selection")).toBe(true);
    expect(
      picker.element.querySelector(".picker-hero-tagline")?.textContent?.length,
    ).toBeGreaterThan(0);
    expect(
      picker.element.querySelector(".picker-hero-name")?.textContent,
    ).toContain("Kizuna");
    picker.setSelected("ember");
    expect(
      picker.element.querySelector(".picker-hero-name")?.textContent,
    ).toContain("Ember");
    picker.destroy();
  });

  it("includes background swatch row on start picker", () => {
    expect(PICKER_SCENE_SECTION_HTML).toContain("picker-scene-row");
    if (typeof document === "undefined") return;
    const picker = createCompanionStartPicker({
      isEnglish: true,
      selectedId: "nova",
      onStart: () => {},
    });
    expect(
      picker.element.querySelector(".picker-roster-dock .picker-scene-section"),
    ).toBeTruthy();
    expect(picker.element.querySelectorAll(".picker-scene-chip").length).toBe(
      SCENE_BACKGROUND_PRESETS.length,
    );
    expect(picker.getBackgroundId()).toBeTruthy();
    const beach = picker.element.querySelector(
      '.picker-scene-chip .scene-preset__swatch--beach',
    )?.closest(".picker-scene-chip");
    beach?.click();
    expect(picker.getBackgroundId()).toBe("beach");
    expect(
      beach?.classList.contains("is-active"),
    ).toBe(true);
    picker.destroy();
  });

  it("start strip cards omit role strip on the start picker", () => {
    const item = listCompanionCharacters("en")[0];
    const stripHtml = companionCardInnerHtml(item, {
      compact: true,
      startStrip: true,
      hideRoleStrip: true,
    });
    expect(stripHtml).not.toContain("companion-card-role-strip");
    expect(stripHtml).toContain(item.name);
  });

  it("start strip cards can show role strip when not hidden", () => {
    const item = listCompanionCharacters("en")[0];
    const stripHtml = companionCardInnerHtml(item, { compact: true, startStrip: true });
    expect(stripHtml).toContain("companion-card-role-strip");
    expect(stripHtml).toContain(item.roleBadge || "Girlfriend");
  });

  it("showcase roster uses two-row grid copy and numbered strip cards", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionStartPicker({
      isEnglish: true,
      selectedId: "nova",
      onStart: () => {},
    });
    const grid = picker.element.querySelector(".companion-picker-grid--roster");
    expect(grid?.classList.contains("companion-picker-grid--start")).toBe(true);
    expect(picker.element.querySelector(".picker-roster-dock-label")?.textContent).toContain(
      String(CHARACTER_IDS.length),
    );
    expect(picker.element.querySelector(".companion-picker-sub")?.textContent).toContain(
      "1–4 flagship",
    );
    expect(
      picker.element.querySelectorAll(".companion-card--start-strip .companion-card-number").length,
    ).toBe(CHARACTER_IDS.length);
    expect(picker.element.querySelectorAll(".companion-card-role-strip").length).toBe(0);
    picker.destroy();
  });

  it("setLocale refreshes background labels and roster copy", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionStartPicker({
      isEnglish: true,
      selectedId: "nova",
      onStart: () => {},
    });
    picker.setLocale(false);
    expect(
      picker.element.querySelector(".picker-scene-section")?.getAttribute("aria-label"),
    ).toBe("背景");
    expect(picker.element.querySelector(".picker-scene-label")?.textContent).toBe("背景");
    expect(picker.element.querySelector(".picker-roster-dock-label")?.textContent).toContain(
      "名單",
    );
    picker.destroy();
  });

  it("uses Cantonese showcase subtitle copy", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionStartPicker({
      isEnglish: false,
      selectedId: "nova",
      onStart: () => {},
    });
    expect(picker.element.querySelector(".companion-picker-sub")?.textContent).toContain(
      `${CHARACTER_IDS.length} 位同伴`,
    );
    picker.destroy();
  });

  it("skips re-render when selecting the same strip card twice", () => {
    if (typeof document === "undefined") return;
    let changes = 0;
    const picker = createCompanionStartPicker({
      isEnglish: true,
      selectedId: "nova",
      onStart: () => {},
      onSelectionChange: () => {
        changes += 1;
      },
    });
    picker.enablePicking(true);
    const card = picker.element.querySelector('[data-character-id="nova"]');
    card?.click();
    card?.click();
    expect(changes).toBe(0);
    picker.destroy();
  });

  it("hides preload bar shortly after roster reaches 100%", () => {
    if (typeof document === "undefined") return;
    vi.useFakeTimers();
    const picker = createCompanionStartPicker({
      isEnglish: true,
      selectedId: "nova",
      onStart: () => {},
    });
    const preload = picker.element.querySelector(".start-picker-preload");
    picker.setPreloadProgress(100, "Ready to chat");
    expect(preload?.classList.contains("is-ready")).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(preload?.hidden).toBe(true);
    vi.useRealTimers();
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
