import { describe, expect, it } from "vitest";
import {
  buildSpectrumLevels,
  clamp,
  drawEmotionOrbFrame,
  smoothStep,
} from "../engine/companion/companionEmotionOrbCanvas.js";

describe("companionEmotionOrbCanvas", () => {
  it("clamps and smooths volume", () => {
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(smoothStep(0, 1, 0.5)).toBe(0.5);
  });

  it("builds spectrum bar levels from volume", () => {
    const levels = buildSpectrumLevels([], 0.8, 1.2, 8);
    expect(levels).toHaveLength(8);
    expect(levels.every((v) => v >= 0.08 && v <= 1)).toBe(true);
  });

  it("draws orb frame without throwing", () => {
    const calls = [];
    const ctx = {
      clearRect() {
        calls.push("clear");
      },
      createRadialGradient() {
        return {
          addColorStop() {},
        };
      },
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      beginPath() {
        calls.push("path");
      },
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      ellipse() {},
      fill() {},
      stroke() {},
    };
    drawEmotionOrbFrame(ctx, 120, 120, {
      time: 0.5,
      volume: 0.6,
      hue: 38,
      sat: 80,
      light: 58,
      state: "speaking",
    });
    expect(calls.length).toBeGreaterThan(0);
  });
});
