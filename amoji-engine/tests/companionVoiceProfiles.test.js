import { describe, expect, it } from "vitest";
import {
  findVoiceProfile,
  resolveEdgeVoiceId,
  voiceProfilesForLang,
  voiceProfileProsodyBias,
} from "../engine/companion/companionVoiceProfiles.js";
import { CHARACTER_IDS, getCharacter } from "../engine/companion/companionCharacterCatalog.js";

describe("companionVoiceProfiles", () => {
  it("resolves idol profile to HiuGaai edge voice", () => {
    expect(resolveEdgeVoiceId("zh-HK-HiuGaaiNeural-idol")).toBe(
      "zh-HK-HiuGaaiNeural",
    );
    expect(voiceProfileProsodyBias("zh-HK-HiuGaaiNeural-idol").rate).toBeGreaterThan(
      0,
    );
  });

  it("lists expanded Cantonese and Hong Kong English voices", () => {
    expect(voiceProfilesForLang("yue").length).toBe(5);
    expect(voiceProfilesForLang("en").length).toBe(6);
    expect(findVoiceProfile("en-HK-YanNeural")?.gender).toBe("female");
    expect(findVoiceProfile("en-HK-SamNeural")?.gender).toBe("male");
  });

  it("assigns a unique voice profile per character per language", () => {
    const yue = CHARACTER_IDS.map((id) => getCharacter(id).voices.yue);
    const en = CHARACTER_IDS.map((id) => getCharacter(id).voices.en);
    expect(new Set(yue).size).toBe(CHARACTER_IDS.length);
    expect(new Set(en).size).toBe(CHARACTER_IDS.length);
  });
});
