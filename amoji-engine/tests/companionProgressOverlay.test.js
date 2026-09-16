import { describe, expect, it } from "vitest";
import {
  clampProgressPct,
  PROGRESS_RING_CIRCUMFERENCE,
  progressPhaseLabel,
  progressRingOffset,
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

  it("maps percent to circular ring stroke offset", () => {
    expect(progressRingOffset(0)).toBeCloseTo(PROGRESS_RING_CIRCUMFERENCE, 4);
    expect(progressRingOffset(100)).toBe(0);
    expect(progressRingOffset(50)).toBeCloseTo(PROGRESS_RING_CIRCUMFERENCE * 0.5, 4);
  });
});
