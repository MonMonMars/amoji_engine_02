import { describe, expect, it } from "vitest";
import {
  applyTalkSpeedMultiplier,
  cycleTalkSpeed,
  DEFAULT_TALK_SPEED,
  formatTalkSpeedLabel,
  loadTalkSpeed,
  normalizeTalkSpeed,
  saveTalkSpeed,
  slowBrowserRate,
  TALK_SPEED_PRESETS,
} from "../engine/companion/companionTalkSpeed.js";
import {
  buildCloudTtsRequestBody,
  instructSpeakingSpeed,
  resolveCompanionTtsProsody,
} from "../engine/companion/companionTtsProsody.js";

describe("companionTalkSpeed", () => {
  it("defaults to half speed", () => {
    expect(DEFAULT_TALK_SPEED).toBe(0.5);
    expect(normalizeTalkSpeed(undefined)).toBe(0.5);
  });

  it("cycles through presets", () => {
    expect(cycleTalkSpeed(0.5)).toBe(0.65);
    expect(cycleTalkSpeed(1)).toBe(0.5);
    expect(TALK_SPEED_PRESETS).toEqual([0.5, 0.65, 0.8, 1]);
  });

  it("halves instruct speaking speed at default multiplier", () => {
    const normal = instructSpeakingSpeed({
      emotion: "neutral",
      speechEnergy: 0.68,
      speedMultiplier: 1,
    });
    const slow = instructSpeakingSpeed({
      emotion: "neutral",
      speechEnergy: 0.68,
      speedMultiplier: 0.5,
    });
    expect(slow).toBeLessThan(normal);
    expect(slow).toBeCloseTo(normal * 0.5, 1);
  });

  it("slows browser and cloud prosody", () => {
    const fast = resolveCompanionTtsProsody({
      emotion: "happy",
      text: "Hello!",
      speedMultiplier: 1,
    });
    const slow = resolveCompanionTtsProsody({
      emotion: "happy",
      text: "Hello!",
      speedMultiplier: 0.5,
    });
    expect(slow.browser.rate).toBeLessThan(fast.browser.rate);
    expect(slow.speed).toBeLessThan(fast.speed);
    expect(slowBrowserRate(1, 0.5)).toBeLessThanOrEqual(0.55);
  });

  it("formats labels for the speed button", () => {
    expect(formatTalkSpeedLabel(0.5, true)).toMatch(/Slow/);
    expect(formatTalkSpeedLabel(1, false)).toMatch(/正常/);
  });

  it("persists speed in storage", () => {
    const storage = {
      /** @type {string | null} */
      value: null,
      setItem(_k, v) {
        this.value = v;
      },
      getItem() {
        return this.value;
      },
    };
    saveTalkSpeed(0.8, storage);
    expect(loadTalkSpeed(storage)).toBe(0.8);
  });

  it("includes speedMultiplier on cloud TTS body", () => {
    const body = buildCloudTtsRequestBody({
      text: "Hello",
      performance: { emotion: "neutral", speedMultiplier: 0.5 },
      voice: "en-US-JennyNeural",
      lang: "en-US",
    });
    expect(body.speedMultiplier).toBe(0.5);
    expect(body.speed).toBeLessThan(0.75);
  });
});
