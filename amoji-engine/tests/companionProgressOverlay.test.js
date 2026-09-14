import { describe, expect, it } from "vitest";
import {
  clampProgressPct,
  progressPhaseLabel,
} from "../engine/companion/companionProgressOverlay.js";

describe("companionProgressOverlay", () => {
  it("clamps fractional and percent progress", () => {
    expect(clampProgressPct(0.42)).toBe(42);
    expect(clampProgressPct(42)).toBe(42);
    expect(clampProgressPct(120)).toBe(100);
    expect(clampProgressPct(-5)).toBe(0);
  });

  it("labels phases in English and Cantonese", () => {
    expect(progressPhaseLabel("downloading", true)).toMatch(/download/i);
    expect(progressPhaseLabel("downloading", false)).toMatch(/下載/);
  });
});
