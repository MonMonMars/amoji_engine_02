import { describe, expect, it } from "vitest";
import {
  buildCharacterSystemPrompt,
  characterAvatarConfig,
  characterTapLines,
} from "../engine/companion/companionCharacterCatalog.js";

describe("companionCharacterSwitch helpers", () => {
  it("builds per-character session bundle for hot swap", () => {
    const id = "kizuna";
    const config = characterAvatarConfig(id, "en");
    const prompt = buildCharacterSystemPrompt(id, true);
    const lines = characterTapLines(id, true);

    expect(config.modelUrl).toContain("kizuna-kamatte.vrm");
    expect(config.avatarPrefer).toBe("vrm");
    expect(prompt).toMatch(/Kizuna/i);
    expect(lines.some((l) => /Kizuna|believe/i.test(l))).toBe(true);
  });

  it("switches voice + model config between characters", () => {
    const amoji = characterAvatarConfig("amoji", "yue");
    const rex = characterAvatarConfig("rex", "yue");
    expect(amoji.voiceId).not.toBe(rex.voiceId);
    expect(amoji.modelUrl).toBe(rex.modelUrl);
  });
});
