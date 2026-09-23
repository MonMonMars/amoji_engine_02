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
  it("defaults to 1× Normal at the established companion pace (0.42 internal)", () => {
    expect(NORMAL_TALK_SPEED_ONE_X).toBe(0.42);
    expect(DEFAULT_TALK_SPEED).toBe(0.42);
    expect(normalizeTalkSpeed(undefined)).toBe(0.42);
    expect(formatTalkSpeedLabel(DEFAULT_TALK_SPEED, true)).toBe("1× Normal");
    expect(talkSpeedToDisplay(0.42)).toBe(1);
    expect(formatTalkSpeedLabel(0.42, true)).toBe("1× Normal");
    expect(formatTalkSpeedLabel(0.42, false)).toBe("1× 正常");
  });

  it("maps display multipliers to internal storage", () => {
    expect(talkSpeedFromDisplay(1)).toBe(0.42);
    expect(talkSpeedFromDisplay(1.5)).toBe(0.63);
    expect(talkSpeedFromDisplay(2)).toBe(0.84);
    expect(talkSpeedFromDisplay(0.5)).toBe(0.21);
    expect(talkSpeedToDisplay(0.63)).toBe(1.5);
    expect(formatTalkSpeedDisplayLabel(2, true)).toBe("2×");
    expect(formatTalkSpeedDisplayLabel(0.5, true)).toBe("0.5×");
  });

  it("cycles through 0.5×–2× presets relative to 1× Normal", () => {
    expect(TALK_SPEED_DISPLAY_PRESETS).toEqual([0.5, 0.75, 1, 1.5, 2]);
    expect(TALK_SPEED_PRESETS[2]).toBe(0.42);
    expect(cycleTalkSpeed(0.42)).toBe(0.63);
    expect(cycleTalkSpeed(0.84)).toBe(0.21);
    expect(TALK_SPEED_PRESETS).toEqual([0.21, 0.32, 0.42, 0.63, 0.84]);
  });

  it("scales instruct speaking speed linearly vs default 1×", () => {
    const normal = instructSpeakingSpeed({
      emotion: "neutral",
      speechEnergy: 0.68,
      speedMultiplier: 0.42,
    });
    const slow = instructSpeakingSpeed({
      emotion: "neutral",
      speechEnergy: 0.68,
      speedMultiplier: 0.21,
    });
    const fast = instructSpeakingSpeed({
      emotion: "neutral",
      speechEnergy: 0.68,
      speedMultiplier: 0.84,
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
      speedMultiplier: 0.84,
    });
    const normal = resolveCompanionTtsProsody({
      emotion: "happy",
      text: "Hello!",
      speedMultiplier: 0.42,
    });
    const slow = resolveCompanionTtsProsody({
      emotion: "happy",
      text: "Hello!",
      speedMultiplier: 0.21,
    });
    expect(slow.browser.rate).toBeLessThan(normal.browser.rate);
    expect(fast.browser.rate).toBeGreaterThan(normal.browser.rate);
    expect(slow.speed).toBeLessThan(normal.speed);
    expect(slowBrowserRate(0.8, 0.21)).toBeLessThan(slowBrowserRate(0.8, 0.42));
    expect(slowBrowserRate(0.8, 0.84)).toBeGreaterThan(slowBrowserRate(0.8, 0.42));
  });

  it("maps stored speed to lip-sync playback ratio", () => {
    expect(talkSpeedPlaybackRatio(0.42)).toBe(1);
    expect(talkSpeedPlaybackRatio(0.21)).toBe(0.5);
    expect(talkSpeedPlaybackRatio(0.84)).toBe(2);
    expect(talkSpeedPlaybackRatio(1)).toBe(1);
  });

  it("describes 1× in TTS instructions at default pace", () => {
    const oneX = buildTtsInstruct({
      emotion: "neutral",
      lang: "en",
      text: "Sure, I can help with that.",
      speedMultiplier: 0.42,
    });
    expect(oneX).toMatch(/1× normal companion pace/i);
    expect(oneX).not.toMatch(/VERY SLOW/i);
    const defaultPace = buildTtsInstruct({
      emotion: "neutral",
      lang: "en",
      text: "Sure, I can help with that.",
      speedMultiplier: DEFAULT_TALK_SPEED,
    });
    expect(defaultPace).toMatch(/1× normal companion pace/i);
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
    expect(formatTalkSpeedLabel(0.42, true)).toBe("1× Normal");
  });

  it("includes speedMultiplier on cloud TTS body", () => {
    const explicit = buildCloudTtsRequestBody({
      text: "Hello",
      performance: { emotion: "neutral", speedMultiplier: 0.42 },
      voice: "en-US-JennyNeural",
      lang: "en-US",
    });
    expect(explicit.speedMultiplier).toBe(0.42);
    expect(explicit.speed).toBeLessThan(0.45);
    expect(explicit.instructions).toMatch(/1× normal companion pace/i);

    const defaulted = buildCloudTtsRequestBody({
      text: "Hello",
      performance: { emotion: "neutral" },
      voice: "en-US-JennyNeural",
      lang: "en-US",
    });
    expect(defaulted.speedMultiplier).toBe(DEFAULT_TALK_SPEED);
    expect(defaulted.instructions).toMatch(/1× normal companion pace/i);
  });
});
