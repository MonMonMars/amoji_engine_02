import { describe, expect, it } from "vitest";
import {
  charToViseme,
  femaleVoiceLabel,
  formatMicError,
  pickFemaleVoice,
} from "../engine/companion/companionVoice.js";

describe("companionVoice", () => {
  it("maps vowels to viseme shapes", () => {
    expect(charToViseme("a").shape).toBe("aa");
    expect(charToViseme("i").shape).toBe("ih");
  });

  it("formats mic permission errors for the UI", () => {
    expect(formatMicError("not-allowed")).toMatch(/Microphone blocked/i);
    expect(formatMicError("unsupported")).toMatch(/speech recognition/i);
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
});
