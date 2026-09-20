import { describe, expect, it } from "vitest";
import {
  createCompanionCharacterPicker,
  renderCompanionPickerGrid,
} from "../engine/companion/companionCharacterPicker.js";
import { SCENE_BACKGROUND_PRESETS } from "../engine/companion/companionScenePresets.js";

describe("companionCharacterPicker UI", () => {
  it("shows empty state when filter matches nothing", () => {
    if (typeof document === "undefined") return;
    const grid = document.createElement("div");
    renderCompanionPickerGrid(grid, "en", {
      roster: [],
      isEnglish: true,
    });
    expect(grid.querySelector(".picker-empty")).toBeTruthy();
    expect(grid.textContent).toMatch(/No companions/i);
  });

  it("in-session picker uses AAA session presentation classes", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: () => {},
    });
    expect(picker.element.classList.contains("companion-picker--aaa-theme")).toBe(true);
    expect(picker.element.classList.contains("companion-picker--session")).toBe(true);
    picker.destroy();
  });

  it("syncFromSession updates copy without rebuilding roster while closed", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: () => {},
    });
    picker.open();
    const grid = picker.element.querySelector(".companion-picker-grid");
    const beforeHtml = grid?.innerHTML;
    picker.close();
    picker.syncFromSession({
      selectedId: "nova",
      isEnglish: true,
      pickerCopy: { title: "Switch companion" },
    });
    expect(picker.element.querySelector(".companion-picker-title")?.textContent).toBe(
      "Switch companion",
    );
    expect(grid?.innerHTML).toBe(beforeHtml);
    picker.destroy();
  });

  it("setSelected while closed does not rebuild grid DOM", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: () => {},
    });
    picker.open();
    const grid = picker.element.querySelector(".companion-picker-grid");
    const beforeHtml = grid?.innerHTML;
    picker.close();
    picker.setSelected("nova");
    expect(grid?.innerHTML).toBe(beforeHtml);
    expect(picker.getActiveCharacterId()).toBe("nova");
    picker.destroy();
  });

  it("in-session picker shows background row below the roster grid", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: () => {},
    });
    picker.open();
    expect(
      picker.element.querySelector(".picker-roster-panel .picker-scene-section"),
    ).toBeTruthy();
    expect(picker.element.querySelectorAll(".picker-scene-chip").length).toBe(
      SCENE_BACKGROUND_PRESETS.length,
    );
    picker.destroy();
  });

  it("in-session picker hides role badges on roster cards", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: () => {},
    });
    picker.open();
    expect(picker.element.querySelectorAll(".companion-card-role").length).toBe(0);
    expect(picker.element.querySelectorAll(".companion-card-role-strip").length).toBe(
      0,
    );
    picker.destroy();
  });

  it("refreshSessionContext updates role-specific picker title", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: () => {},
    });
    picker.refreshSessionContext({
      pickerCopy: { title: "Pick your secretary" },
    });
    expect(picker.element.querySelector(".companion-picker-title")?.textContent).toBe(
      "Pick your secretary",
    );
    picker.destroy();
  });

  it("in-session picker shows featured quick-pick row", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: () => {},
    });
    picker.open();
    const featured = picker.element.querySelectorAll(
      ".picker-featured-row .companion-card",
    );
    expect(featured.length).toBeGreaterThanOrEqual(4);
    picker.destroy();
  });

  it("in-session picker confirms switch on button click", () => {
    if (typeof document === "undefined") return;
    let switchedTo = null;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: (id) => {
        switchedTo = id;
      },
    });
    picker.open();
    picker.setSelected("ember");
    picker.element.querySelector(".picker-switch-btn")?.click();
    expect(switchedTo).toBe("ember");
    picker.destroy();
  });

  it("in-session picker closes via close button and backdrop", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: () => {},
    });
    picker.open();
    expect(picker.isOpen()).toBe(true);
    picker.element.querySelector(".companion-picker-close")?.click();
    expect(picker.isOpen()).toBe(false);
    picker.open();
    picker.element.querySelector(".companion-picker-backdrop")?.click();
    expect(picker.isOpen()).toBe(false);
    picker.destroy();
  });

  it("in-session picker closes when confirming same character", () => {
    if (typeof document === "undefined") return;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: () => {},
    });
    picker.open();
    expect(picker.isOpen()).toBe(true);
    picker.element.querySelector(".picker-switch-btn")?.click();
    expect(picker.isOpen()).toBe(false);
    picker.destroy();
  });

  it("switches after hot-swap when active character differs from initial opts", () => {
    if (typeof document === "undefined") return;
    let switchedTo = null;
    const picker = createCompanionCharacterPicker({
      isEnglish: true,
      selectedId: "nova",
      onSelect: (id) => {
        switchedTo = id;
      },
    });
    picker.setSelected("ember");
    expect(picker.getActiveCharacterId()).toBe("ember");
    picker.open();
    picker.setSelected("nova");
    picker.element.querySelector(".picker-switch-btn")?.click();
    expect(switchedTo).toBe("nova");
    picker.destroy();
  });
});
