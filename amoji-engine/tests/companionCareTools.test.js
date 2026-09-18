/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  clampCareToolsPosition,
  createCompanionCareTools,
  defaultCareToolsPosition,
  loadCareToolsPosition,
  saveCareToolsPosition,
} from "../engine/companion/companionCareTools.js";

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
    expect(document.getElementById("care-tools-stack")).toBeTruthy();
    expect(tools.toggle.parentElement?.id).toBe("care-tools-stack");
    tools.dispose();
  });

  it("persists draggable stack position", () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
    };
    saveCareToolsPosition(storage, { x: 120, y: 240 });
    expect(loadCareToolsPosition(storage)).toEqual({ x: 120, y: 240 });
    const clamped = clampCareToolsPosition(900, -20, 400, 800, 44, 44);
    expect(clamped.x).toBeLessThan(400);
    expect(clamped.y).toBe(8);
    const def = defaultCareToolsPosition(390, 844, 44, 44);
    expect(def.x).toBeGreaterThan(0);
    expect(def.y).toBeGreaterThan(0);
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
