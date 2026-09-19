import { describe, expect, it } from "vitest";
import {
  blendVisemeWithAudioLevel,
  buildLipSyncTimeline,
  buildLipSyncTimelineCached,
  charToViseme,
  clampVisemeOpen,
  estimateLipSyncMsPerChar,
  VISEME_OPEN_SCALE,
  visemeAtAudioProgress,
  visemeAtTimelineProgress,
} from "../engine/companion/companionViseme.js";
import { TALK_MOUTH_OPEN_MAX } from "../engine/companion/companionFaceRest.js";

describe("companionViseme", () => {
  it("maps vowels and CJK interjections to viseme shapes", () => {
    expect(charToViseme("a")).toEqual({
      shape: "aa",
      open: clampVisemeOpen(0.82),
    });
    expect(clampVisemeOpen(0.82)).toBeCloseTo(0.82 * VISEME_OPEN_SCALE);
    expect(charToViseme("i").shape).toBe("ih");
    expect(charToViseme("啊").shape).toBe("aa");
    expect(charToViseme("嗯").open).toBeLessThan(0.3);
    expect(charToViseme("好").shape).toBe("ou");
    expect(charToViseme("你").shape).toBe("ee");
  });

  it("builds a monotonic lip sync timeline", () => {
    const { starts, total } = buildLipSyncTimeline("Hi!");
    expect(starts[0]).toBe(0);
    expect(total).toBeGreaterThan(0);
    expect(starts.every((s, i) => i === 0 || s >= starts[i - 1])).toBe(true);
  });

  it("caches lip sync timelines per utterance", () => {
    const a = buildLipSyncTimelineCached("你好呀");
    const b = buildLipSyncTimelineCached("你好呀");
    expect(a).toBe(b);
  });

  it("walks visemes across audio progress", () => {
    const mid = visemeAtAudioProgress("aeiou", 0.5, 0.4);
    expect(mid.shape).toBeTruthy();
    expect(mid.open).toBeGreaterThan(0.1);
    const end = visemeAtAudioProgress("aeiou", 1, 0);
    expect(end.open).toBeLessThan(0.2);
  });

  it("boosts jaw openness from audio RMS", () => {
    const quiet = blendVisemeWithAudioLevel({ shape: "aa", open: 0.5 }, 0);
    const loud = blendVisemeWithAudioLevel({ shape: "aa", open: 0.5 }, 0.8);
    expect(loud.open).toBeGreaterThan(quiet.open);
    expect(loud.open).toBeLessThanOrEqual(TALK_MOUTH_OPEN_MAX);
  });

  it("slows lip sync estimate when talk speed is lower", () => {
    const normal = estimateLipSyncMsPerChar("你好", 0, 1);
    const slow = estimateLipSyncMsPerChar("你好", 0, 0.45);
    expect(slow).toBeGreaterThan(normal);
  });

  it("uses cached timeline for progress sampling", () => {
    const timeline = buildLipSyncTimelineCached("啊哦嗯");
    const sample = visemeAtTimelineProgress(timeline, 0.2, 0.5);
    expect(sample.char).toBeTruthy();
    expect(sample.open).toBeGreaterThan(0.1);
  });
});
