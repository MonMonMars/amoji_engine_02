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
  talkSpeedPlaybackRatio,
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
    expect(talkSpeedFromDisplay(1.5)).toBe(0.42);
    expect(talkSpeedFromDisplay(2)).toBe(0.56);
    expect(talkSpeedFromDisplay(0.5)).toBe(0.14);
    expect(talkSpeedToDisplay(0.42)).toBe(1.5);
    expect(formatTalkSpeedDisplayLabel(2, true)).toBe("2×");
    expect(formatTalkSpeedDisplayLabel(0.5, true)).toBe("0.5×");
  });

  it("cycles through 0.5×–2× presets relative to 1× Normal", () => {
    expect(TALK_SPEED_DISPLAY_PRESETS).toEqual([0.5, 0.75, 1, 1.5, 2]);
    expect(TALK_SPEED_PRESETS[2]).toBe(0.28);
    expect(cycleTalkSpeed(0.28)).toBe(0.42);
    expect(cycleTalkSpeed(0.56)).toBe(0.14);
    expect(TALK_SPEED_PRESETS).toEqual([0.14, 0.21, 0.28, 0.42, 0.56]);
  });

  it("scales instruct speaking speed linearly vs default 1×", () => {
    const normal = instructSpeakingSpeed({
      emotion: "neutral",
      speechEnergy: 0.68,
      speedMultiplier: 0.28,
    });
    const slow = instructSpeakingSpeed({
      emotion: "neutral",
      speechEnergy: 0.68,
      speedMultiplier: 0.14,
    });
    const fast = instructSpeakingSpeed({
      emotion: "neutral",
      speechEnergy: 0.68,
      speedMultiplier: 0.56,
    });
    expect(slow).toBeLessThan(normal);
    expect(fast).toBeGreaterThan(normal);
    expect(slow).toBeCloseTo(normal * 0.5, 1);
    expect(fast).toBeCloseTo(normal * 2, 1);
  });

  it("slows browser and cloud prosody relative to 1×", () => {
    const fast = resolveCompanionTtsProsody({
      emotion: "happy",
      text: "Hello!",
      speedMultiplier: 0.56,
    });
    const normal = resolveCompanionTtsProsody({
      emotion: "happy",
      text: "Hello!",
      speedMultiplier: 0.28,
    });
    const slow = resolveCompanionTtsProsody({
      emotion: "happy",
      text: "Hello!",
      speedMultiplier: 0.14,
    });
    expect(slow.browser.rate).toBeLessThan(normal.browser.rate);
    expect(fast.browser.rate).toBeGreaterThan(normal.browser.rate);
    expect(slow.speed).toBeLessThan(normal.speed);
    expect(slowBrowserRate(0.8, 0.14)).toBeLessThan(slowBrowserRate(0.8, 0.28));
    expect(slowBrowserRate(0.8, 0.56)).toBeGreaterThan(slowBrowserRate(0.8, 0.28));
  });

  it("maps stored speed to lip-sync playback ratio", () => {
    expect(talkSpeedPlaybackRatio(0.28)).toBe(1);
    expect(talkSpeedPlaybackRatio(0.14)).toBe(0.5);
    expect(talkSpeedPlaybackRatio(0.56)).toBe(2);
    expect(talkSpeedPlaybackRatio(1)).toBe(1);
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
    saveTalkSpeed(0.42, storage);
    expect(loadTalkSpeed(storage)).toBe(0.42);
    expect(formatTalkSpeedLabel(0.42, true)).toBe("1.5×");
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
