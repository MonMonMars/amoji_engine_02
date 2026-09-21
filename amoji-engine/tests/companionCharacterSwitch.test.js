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

    expect(config.modelUrl).toContain("companion-kizuna.vrm");
    expect(config.avatarPrefer).toBe("vrm");
    expect(prompt).toMatch(/Kizuna/i);
    expect(lines.some((l) => /Kizuna|believe/i.test(l))).toBe(true);
  });

  it("switches voice + model config between characters", () => {
    const nova = characterAvatarConfig("nova", "yue");
    const cool = characterAvatarConfig("cool", "yue");
    expect(nova.voiceId).not.toBe(cool.voiceId);
    expect(nova.modelUrl).not.toBe(cool.modelUrl);
    expect(cool.modelUrl).toContain("companion-cool.vrm");
  });
});
