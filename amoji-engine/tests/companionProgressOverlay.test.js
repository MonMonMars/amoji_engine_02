import { describe, expect, it } from "vitest";
import {
  clampProgressPct,
  createCompanionCenterLoadRing,
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
    expect(progressPhaseLabel("almost", true)).toMatch(/almost/i);
    expect(progressPhaseLabel("waking", false)).toMatch(/醒/);
  });

  it("maps percent to circular ring stroke offset", () => {
    expect(progressRingOffset(0)).toBeCloseTo(PROGRESS_RING_CIRCUMFERENCE, 4);
    expect(progressRingOffset(100)).toBe(0);
    expect(progressRingOffset(50)).toBeCloseTo(PROGRESS_RING_CIRCUMFERENCE * 0.5, 4);
  });

  it("creates a borderless center load ring", () => {
    if (typeof document === "undefined") return;
    const ring = createCompanionCenterLoadRing({ root: document.body });
    ring.show({ progress: 40, label: "Loading model" });
    expect(ring.element.classList.contains("is-visible")).toBe(true);
    expect(ring.element.querySelector(".companion-center-load-ring-fill")).toBeTruthy();
    ring.hide();
    ring.destroy();
  });
});
