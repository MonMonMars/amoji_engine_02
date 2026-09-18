import { describe, expect, it } from "vitest";
import {
  createCompanionCharacterPicker,
  renderCompanionPickerGrid,
} from "../engine/companion/companionCharacterPicker.js";

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
});
