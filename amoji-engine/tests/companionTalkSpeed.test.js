import { describe, expect, it } from "vitest";
import {
  applyTalkSpeedMultiplier,
  cycleTalkSpeed,
  DEFAULT_TALK_SPEED,
  formatTalkSpeedDisplayLabel,
  formatTalkSpeedLabel,
  loadTalkSpeed,
  NORMAL_TALK_SPEED_ONE_X,
  normalizeTalkSpeed,
  saveTalkSpeed,
  slowBrowserRate,
  TALK_SPEED_DISPLAY_PRESETS,
  TALK_SPEED_PRESETS,
  talkSpeedFromDisplay,
  talkSpeedToDisplay,
} from "../engine/companion/companionTalkSpeed.js";
import {
  buildCloudTtsRequestBody,
  buildTtsInstruct,
  instructSpeakingSpeed,
  resolveCompanionTtsProsody,
} from "../engine/companion/companionTtsProsody.js";

describe("companionTalkSpeed", () => {
  it("treats the established slow pace as 1× Normal", () => {
    expect(NORMAL_TALK_SPEED_ONE_X).toBe(0.28);
    expect(DEFAULT_TALK_SPEED).toBe(0.28);
    expect(normalizeTalkSpeed(undefined)).toBe(0.28);
    expect(talkSpeedToDisplay(0.28)).toBe(1);
    expect(formatTalkSpeedLabel(0.28, true)).toBe("1× Normal");
    expect(formatTalkSpeedLabel(0.28, false)).toBe("1× 正常");
  });

  it("maps display multipliers to internal storage", () => {
    expect(talkSpeedFromDisplay(1)).toBe(0.28);
    expect(talkSpeedFromDisplay(1.35)).toBe(0.38);
    expect(talkSpeedToDisplay(0.75)).toBeCloseTo(2.68, 2);
    expect(formatTalkSpeedDisplayLabel(2.7, true)).toMatch(/Fast/);
  });

  it("cycles through relative presets from 1× Normal", () => {
    expect(TALK_SPEED_DISPLAY_PRESETS[1]).toBe(1);
    expect(TALK_SPEED_PRESETS[1]).toBe(0.28);
    expect(cycleTalkSpeed(0.28)).toBe(0.38);
    expect(cycleTalkSpeed(0.76)).toBe(0.24);
    expect(TALK_SPEED_PRESETS).toEqual([
      0.24, 0.28, 0.38, 0.48, 0.59, 0.76,
    ]);
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
    expect(slowBrowserRate(1, 0.5)).toBeLessThanOrEqual(0.52);
  });

  it("describes default pace as normal in TTS instructions", () => {
    const instruct = buildTtsInstruct({
      emotion: "neutral",
      lang: "en",
      text: "Sure, I can help with that.",
      speedMultiplier: 0.28,
    });
    expect(instruct).toMatch(/1× normal companion pace/i);
    expect(instruct).not.toMatch(/VERY SLOW/i);
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
    expect(formatTalkSpeedLabel(0.8, true)).toMatch(/Fast/);
  });

  it("includes speedMultiplier on cloud TTS body", () => {
    const body = buildCloudTtsRequestBody({
      text: "Hello",
      performance: { emotion: "neutral", speedMultiplier: 0.28 },
      voice: "en-US-JennyNeural",
      lang: "en-US",
    });
    expect(body.speedMultiplier).toBe(0.28);
    expect(body.speed).toBeLessThan(0.45);
    expect(body.instructions).toMatch(/1× normal companion pace/i);
  });
});
