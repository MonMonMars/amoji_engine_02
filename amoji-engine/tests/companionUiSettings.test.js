import { describe, expect, it } from "vitest";
import {
  applyUiSettingsToAudio,
  defaultUiSettings,
  formatSfxVolumeLabel,
  loadUiSettings,
  normalizeUiSettings,
  saveUiSettings,
  UI_SETTINGS_STORAGE_KEY,
} from "../engine/companion/companionUiSettings.js";

describe("companionUiSettings", () => {
  it("loads defaults when storage is empty", () => {
    const storage = { getItem: () => null, setItem: () => {} };
    const settings = loadUiSettings(storage);
    expect(settings.sfxVolume).toBeCloseTo(0.42);
    expect(settings.haptics).toBe(true);
  });

  it("persists and normalizes volume", () => {
    let saved = "";
    const storage = {
      getItem: (key) => (key === UI_SETTINGS_STORAGE_KEY ? saved : null),
      setItem: (key, value) => {
        if (key === UI_SETTINGS_STORAGE_KEY) saved = value;
      },
    };
    saveUiSettings({ sfxVolume: 1.4, haptics: false }, storage);
    const loaded = loadUiSettings(storage);
    expect(loaded.sfxVolume).toBe(1);
    expect(loaded.haptics).toBe(false);
  });

  it("applies settings to audio controller", () => {
    let volume = 0;
    let haptics = true;
    let reduced = false;
    const audio = {
      setVolume(v) {
        volume = v;
        return v;
      },
      setHaptics(on) {
        haptics = on;
        return on;
      },
      setReducedMotion(on) {
        reduced = on;
      },
    };
    applyUiSettingsToAudio(audio, normalizeUiSettings({ sfxVolume: 0.2, haptics: false }));
    expect(volume).toBe(0.2);
    expect(haptics).toBe(false);
    expect(reduced).toBe(false);
  });

  it("formats sfx volume label", () => {
    expect(formatSfxVolumeLabel(42, true)).toBe("UI sounds: 42%");
    expect(formatSfxVolumeLabel(80, false)).toBe("介面音效：80%");
  });

  it("exports stable schema defaults", () => {
    expect(defaultUiSettings().schema).toMatch(/uiSettings/i);
  });
});
