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
    expect(voiceProfilesForLang("yue").length).toBe(23);
    expect(voiceProfilesForLang("en").length).toBe(12);
    expect(findVoiceProfile("openai-coral")?.openAiVoice).toBe("coral");
    expect(findVoiceProfile("en-HK-YanNeural")?.gender).toBe("female");
    expect(findVoiceProfile("en-HK-SamNeural")?.gender).toBe("male");
  });

  it("assigns a unique Cantonese voice profile per character", () => {
    const yue = CHARACTER_IDS.map((id) => getCharacter(id).voices.yue);
    expect(new Set(yue).size).toBe(CHARACTER_IDS.length);
    for (const id of yue) {
      expect(findVoiceProfile(id)).toBeTruthy();
    }
  });
});
