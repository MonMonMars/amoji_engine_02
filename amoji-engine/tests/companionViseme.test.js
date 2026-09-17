import { describe, expect, it } from "vitest";
import {
  buildLipSyncTimeline,
  charToViseme,
  visemeAtAudioProgress,
} from "../engine/companion/companionViseme.js";

describe("companionViseme", () => {
  it("maps vowels and CJK to viseme shapes", () => {
    expect(charToViseme("a")).toEqual({ shape: "aa", open: 0.82 });
    expect(charToViseme("i").shape).toBe("ih");
    expect(charToViseme("你").shape).toMatch(/^(aa|ih|oh|ou|ee)$/);
  });

  it("builds a monotonic lip sync timeline", () => {
    const { starts, total } = buildLipSyncTimeline("Hi!");
    expect(starts[0]).toBe(0);
    expect(total).toBeGreaterThan(0);
    expect(starts.every((s, i) => i === 0 || s >= starts[i - 1])).toBe(true);
  });

  it("walks visemes across audio progress", () => {
    const mid = visemeAtAudioProgress("aeiou", 0.5, 0.4);
    expect(mid.shape).toBeTruthy();
    expect(mid.open).toBeGreaterThan(0.1);
    const end = visemeAtAudioProgress("aeiou", 1, 0);
    expect(end.open).toBeLessThan(0.2);
  });
});
