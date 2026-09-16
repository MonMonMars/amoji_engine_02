import { describe, expect, it } from "vitest";
import {
  buildCompanionHref,
  cloudVoiceLabel,
  companionLangCode,
  nextVoiceId,
  resolveVoiceId,
  voiceGenderLabel,
  voicePickerButtonLabel,
  voicePresetById,
  voicesForLang,
} from "../engine/companion/companionVoiceCatalog.js";

describe("companionVoiceCatalog", () => {
  it("resolves language codes", () => {
    expect(companionLangCode("en")).toBe("en");
    expect(companionLangCode("yue")).toBe("yue");
    expect(companionLangCode("zh-HK")).toBe("yue");
  });

  it("picks default Cantonese voice", () => {
    expect(resolveVoiceId({ lang: "yue" })).toBe("zh-HK-HiuMaanNeural");
  });

  it("cycles Cantonese voices", () => {
    const second = nextVoiceId("zh-HK-HiuMaanNeural", "yue");
    expect(second).toBe("zh-HK-HiuGaaiNeural");
    const third = nextVoiceId(second, "yue");
    expect(third).toBe("zh-HK-HiuGaaiNeural-idol");
  });

  it("builds href with lang and voice", () => {
    expect(
      buildCompanionHref({
        basePath: "/companion-full",
        lang: "en",
        voiceId: "en-US-AriaNeural",
      }),
    ).toBe("/companion-full?lang=en&voice=en-US-AriaNeural");
    expect(
      buildCompanionHref({
        basePath: "/companion-full",
        lang: "yue",
        voiceId: "zh-HK-HiuMaanNeural",
      }),
    ).toBe("/companion-full?lang=yue&voice=zh-HK-HiuMaanNeural");
  });

  it("labels cloud voices", () => {
    expect(cloudVoiceLabel("zh-HK-WanLungNeural")).toMatch(/男聲/);
    expect(cloudVoiceLabel("en-US-AriaNeural")).toMatch(/Aria/);
  });

  it("shows gender labels for voice buttons", () => {
    expect(voiceGenderLabel("zh-HK-HiuMaanNeural", "yue", false)).toBe("女聲");
    expect(voiceGenderLabel("zh-HK-WanLungNeural", "yue", false)).toBe("男聲");
    expect(voiceGenderLabel("en-US-AriaNeural", "en", true)).toBe("Female");
    expect(voiceGenderLabel("en-US-JennyNeural", "en", true)).toBe("Female");
  });

  it("maps voice preset", () => {
    expect(voicePresetById("zh-HK-HiuGaaiNeural")).toEqual({
      name: "zh-HK-HiuGaaiNeural",
      lang: "zh-HK",
      cloud: true,
    });
  });

  it("lists fourteen Cantonese voice personas", () => {
    expect(voicesForLang("yue").length).toBe(14);
    expect(voicesForLang("yue").map((v) => v.id)).toContain(
      "zh-HK-HiuMaanNeural-warm",
    );
  });

  it("formats picker button labels with gender", () => {
    expect(voicePickerButtonLabel("zh-HK-HiuMaanNeural-warm", "yue", false)).toBe(
      "曉曼·溫柔·女聲",
    );
    expect(voicePickerButtonLabel("zh-HK-WanLungNeural-calm", "yue", true)).toBe(
      "WanLung·calm (Male)",
    );
  });
});
