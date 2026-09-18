import { describe, expect, it } from "vitest";
import {
  accentHexToHue,
  COMPANION_UI_GACHA_SCHEMA,
  playCompanionCardTapFx,
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
});
