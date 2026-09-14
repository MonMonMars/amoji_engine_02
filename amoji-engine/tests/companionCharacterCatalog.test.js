import { describe, expect, it } from "vitest";
import {
  buildCharacterSystemPrompt,
  characterAvatarConfig,
  defaultVoiceForCharacter,
  getCharacter,
  nextCharacterId,
  resolveCharacterId,
} from "../engine/companion/companionCharacterCatalog.js";

describe("companionCharacterCatalog", () => {
  it("resolves default amoji character", () => {
    expect(resolveCharacterId({})).toBe("amoji");
  });

  it("maps glb model to sora", () => {
    expect(
      resolveCharacterId({
        modelUrl: "/prototypes/assets/companion-girl.glb",
      }),
    ).toBe("sora");
  });

  it("assigns distinct voices per character", () => {
    expect(defaultVoiceForCharacter("amoji", "yue")).toBe(
      "zh-HK-HiuMaanNeural",
    );
    expect(defaultVoiceForCharacter("kizuna", "yue")).toBe(
      "zh-HK-HiuGaaiNeural",
    );
    expect(defaultVoiceForCharacter("rex", "yue")).toBe(
      "zh-HK-WanLungNeural",
    );
    expect(defaultVoiceForCharacter("rex", "en")).toBe("en-US-GuyNeural");
  });

  it("builds character-specific system prompts", () => {
    const amoji = buildCharacterSystemPrompt("amoji", false);
    const rex = buildCharacterSystemPrompt("rex", false);
    expect(amoji).toContain("曖咪");
    expect(rex).toContain("烈");
    expect(rex).not.toContain("曖咪");
  });

  it("cycles characters", () => {
    expect(nextCharacterId("amoji")).toBe("sora");
    expect(nextCharacterId("rex")).toBe("amoji");
  });

  it("exposes avatar config per character", () => {
    const sora = characterAvatarConfig("sora", "yue");
    expect(sora.avatarPrefer).toBe("gltf");
    expect(sora.modelUrl).toContain(".glb");
    const kizuna = getCharacter("kizuna");
    expect(kizuna.traits.en).toContain("energetic");
    expect(kizuna.modelUrl).toContain("kizuna-kamatte.vrm");
    expect(characterAvatarConfig("kizuna", "en").avatarPrefer).toBe("vrm");
  });
});
