import { describe, expect, it } from "vitest";
import {
  charToViseme,
  configureCompanionAudioElement,
  estimateLipSyncMsPerChar,
  femaleVoiceLabel,
  formatMicError,
  pickFemaleVoice,
  readAnalyserMouthLevel,
  unlockAudioSync,
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
});
