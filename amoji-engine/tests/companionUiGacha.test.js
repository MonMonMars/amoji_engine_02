import { describe, expect, it } from "vitest";
import {
  accentHexToHue,
  celebrateCompanionSwitchReveal,
  COMPANION_UI_GACHA_SCHEMA,
  playCompanionCardTapFx,
  playStartPickerDismissFx,
} from "../engine/companion/companionUiGacha.js";

describe("companionUiGacha", () => {
  it("exports schema", () => {
    expect(COMPANION_UI_GACHA_SCHEMA).toMatch(/gacha/i);
  });

  it("converts accent hex to hue", () => {
    expect(accentHexToHue("#7fd4cf")).toBeGreaterThan(100);
    expect(accentHexToHue("#ff0000")).toBe(0);
  });

  it("adds gacha pop class on card tap", () => {
    if (typeof document === "undefined") return;
    const card = document.createElement("button");
    card.className = "companion-card";
    card.style.setProperty("--card-accent", "#7fd4cf");
    document.body.appendChild(card);
    playCompanionCardTapFx(card, { accent: "#7fd4cf" });
    expect(card.classList.contains("gacha-card-pop")).toBe(true);
    card.remove();
  });

  it("marks switch overlay ready on celebrate", () => {
    if (typeof document === "undefined") return;
    const overlay = document.createElement("div");
    overlay.innerHTML = '<div class="companion-switch-card"></div>';
    celebrateCompanionSwitchReveal(overlay);
    expect(overlay.classList.contains("is-gacha-ready")).toBe(true);
  });

  it("adds dismiss class to start picker", () => {
    if (typeof document === "undefined") return;
    const picker = document.createElement("div");
    playStartPickerDismissFx(picker);
    expect(picker.classList.contains("gacha-start-dismiss")).toBe(true);
  });
});
