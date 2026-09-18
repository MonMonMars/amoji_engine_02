import { describe, expect, it } from "vitest";
import { loadUiSettings } from "../engine/companion/companionUiSettings.js";

describe("secretaryLite UI bootstrap", () => {
  it("loads shared UI settings defaults for lite shell", () => {
    const settings = loadUiSettings({ getItem: () => null, setItem: () => {} });
    expect(settings.sfxVolume).toBeGreaterThan(0);
    expect(settings.haptics).toBe(true);
  });
});
