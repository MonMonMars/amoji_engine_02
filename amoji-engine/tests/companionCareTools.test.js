/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { createCompanionCareTools } from "../engine/companion/companionCareTools.js";

describe("companionCareTools", () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.body.classList.remove("companion-care-collapsed", "companion-care-open");
  });

  it("starts collapsed and hides care chrome on body", () => {
    const tools = createCompanionCareTools({
      root: document.body,
      isEnglish: true,
    });
    expect(document.body.classList.contains("companion-care-collapsed")).toBe(true);
    expect(tools.isOpen()).toBe(false);
    expect(tools.isMenuVisible()).toBe(false);
    tools.dispose();
  });

  it("opens menu and fires activity handlers", () => {
    const onActivity = vi.fn();
    const tools = createCompanionCareTools({
      root: document.body,
      isEnglish: true,
      onActivity,
    });
    tools.open();
    expect(document.body.classList.contains("companion-care-open")).toBe(true);
    expect(tools.isMenuVisible()).toBe(true);
    const snack = document.querySelector('.care-tools-menu__btn[data-activity="snack"]');
    snack?.click();
    expect(onActivity).toHaveBeenCalledWith("snack");
    expect(tools.isOpen()).toBe(true);
    expect(tools.isMenuVisible()).toBe(false);
    tools.dispose();
  });

  it("toggle closes everything when menu is open", () => {
    const tools = createCompanionCareTools({
      root: document.body,
      isEnglish: true,
    });
    tools.open();
    tools.togglePanel();
    expect(tools.isOpen()).toBe(false);
    expect(document.body.classList.contains("companion-care-collapsed")).toBe(true);
    tools.dispose();
  });
});
