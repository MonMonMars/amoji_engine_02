import { describe, expect, it } from "vitest";
import {
  audioPlaybackProgress,
  browserTtsTimeoutMs,
  charToViseme,
  cloudTtsSafetyBudgetMs,
  configureCompanionAudioElement,
  estimateLipSyncMsPerChar,
  femaleVoiceLabel,
  formatMicError,
  lipSyncCharWeight,
  pickFemaleVoice,
  readAnalyserMouthLevel,
  unlockAudioSync,
  visemeAtAudioProgress,
} from "../engine/companion/companionVoice.js";

describe("companionVoice", () => {
  it("maps vowels to viseme shapes", () => {
    expect(charToViseme("a").shape).toBe("aa");
    expect(charToViseme("i").shape).toBe("ih");
  });

  it("formats mic permission errors for the UI", () => {
    expect(formatMicError("not-allowed")).toMatch(/Microphone blocked/i);
    expect(formatMicError("unsupported")).toMatch(/Mic unavailable/i);
    expect(formatMicError("unknown-code")).toMatch(/Mic error/);
  });

  it("prefers female Cantonese voices when available", () => {
    const voices = [
      { name: "Daniel", lang: "en-US", localService: true },
      { name: "Sin-Ji", lang: "zh-HK", localService: true },
    ];
    expect(pickFemaleVoice(voices)?.name).toBe("Sin-Ji");
  });

  it("labels cloud Cantonese neural voice", () => {
    expect(
      femaleVoiceLabel({
        name: "zh-HK-HiuMaanNeural",
        lang: "zh-HK",
        cloud: true,
      }),
    ).toBe("女聲·粵·曉曼");
  });

  it("configures audio elements for inline mobile playback", () => {
    const audio = configureCompanionAudioElement({
      preload: "",
      setAttribute() {},
      playsInline: false,
    });
    expect(audio.preload).toBe("auto");
    expect(audio.playsInline).toBe(true);
  });

  it("unlockAudioSync is safe without window", () => {
    expect(unlockAudioSync()).toBe(false);
  });

  it("slows CJK lip-sync to spoken Cantonese pace", () => {
    expect(estimateLipSyncMsPerChar("你好呀，今日開心嗎？")).toBeGreaterThan(120);
    expect(estimateLipSyncMsPerChar("hello there friend")).toBeLessThan(80);
  });

  it("scales lip-sync to real audio duration", () => {
    const ms = estimateLipSyncMsPerChar("你好呀", 600);
    expect(ms).toBeCloseTo(200, 0);
  });

  it("readAnalyserMouthLevel is 0 without an analyser", () => {
    expect(readAnalyserMouthLevel(null)).toBe(0);
  });

  it("weights CJK beats longer than punctuation", () => {
    expect(lipSyncCharWeight("你")).toBeGreaterThan(lipSyncCharWeight("！"));
    expect(lipSyncCharWeight("a")).toBeGreaterThan(lipSyncCharWeight(" "));
  });

  it("allows long cloud TTS playback budgets from real audio duration", () => {
    const greeting =
      "Hello, I'm Nova. Take your time — I'm listening closely.";
    expect(cloudTtsSafetyBudgetMs(greeting)).toBeGreaterThan(12000);
    expect(cloudTtsSafetyBudgetMs(greeting, 8.4)).toBe(13400);
  });

  it("allows long browser TTS for Cantonese replies", () => {
    const reply = "我".repeat(120);
    expect(browserTtsTimeoutMs(reply)).toBeGreaterThan(40000);
    expect(browserTtsTimeoutMs(reply)).toBeLessThanOrEqual(120000);
  });

  it("maps mouth visemes to audio progress instead of a char timer", () => {
    const start = visemeAtAudioProgress("你好呀", 0.05);
    const mid = visemeAtAudioProgress("你好呀", 0.5);
    const end = visemeAtAudioProgress("你好呀", 1);
    expect(start.index).toBe(0);
    expect(start.char).toBe("你");
    expect(mid.index).toBe(1);
    expect(end.open).toBeLessThan(0.1);
    expect(end.index).toBe(3);
    expect(mid.open).toBeGreaterThan(0.5);
  });

  it("reads playback progress from audio.currentTime", () => {
    expect(audioPlaybackProgress({ currentTime: 0.4, duration: 2 }, 0, 0)).toBeCloseTo(
      0.2,
      5,
    );
    expect(audioPlaybackProgress({ currentTime: 0, duration: NaN }, 250, 1000)).toBeCloseTo(
      0.25,
      5,
    );
  });
});
