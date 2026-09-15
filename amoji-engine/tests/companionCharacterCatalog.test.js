import { describe, expect, it } from "vitest";
import {
  buildCharacterSystemPrompt,
  characterAvatarConfig,
  characterGreeting,
  characterGreetingPerformance,
  characterVoiceLabel,
  defaultVoiceForCharacter,
  getCharacter,
  listCompanionCharacters,
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
      "zh-HK-HiuGaaiNeural",
    );
    expect(defaultVoiceForCharacter("sora", "yue")).toBe(
      "zh-HK-HiuMaanNeural",
    );
    expect(defaultVoiceForCharacter("kizuna", "yue")).toBe(
      "zh-HK-HiuGaaiNeural-idol",
    );
    expect(defaultVoiceForCharacter("sky", "yue")).toBe(
      "zh-HK-HiuMaanNeural-cool",
    );
    expect(defaultVoiceForCharacter("rex", "yue")).toBe(
      "zh-HK-WanLungNeural",
    );
    expect(defaultVoiceForCharacter("rex", "en")).toBe("en-HK-SamNeural");
    expect(defaultVoiceForCharacter("kizuna", "en")).toBe("en-HK-YanNeural");
    expect(defaultVoiceForCharacter("sky", "en")).toBe("en-US-AriaNeural-cool");
    expect(defaultVoiceForCharacter("sora", "en")).toBe("en-US-JennyNeural");
  });

  it("exposes character-specific greetings and voice labels", () => {
    expect(characterGreeting("amoji", false)).toContain("曖咪");
    expect(characterGreeting("rex", true)).toMatch(/rex/i);
    expect(characterGreeting("kizuna", false)).toContain("絆");
    expect(characterGreeting("sora", true)).toMatch(/sora/i);
    expect(characterVoiceLabel("rex", "yue", false)).toBe("雲龍");
    expect(characterVoiceLabel("sora", "en", true)).toBe("Jenny");
    expect(characterGreetingPerformance("kizuna").speechEnergy).toBeGreaterThan(0.8);
    expect(characterGreetingPerformance("sora").talkStyle).toBe("soft");
  });

  it("lists voice metadata for picker cards", () => {
    const list = listCompanionCharacters("yue");
    const rex = list.find((c) => c.id === "rex");
    expect(rex?.voiceLabel).toBe("雲龍");
    expect(list.find((c) => c.id === "kizuna")?.voiceLabel).toBe("曉佳·元氣");
    expect(list.find((c) => c.id === "sky")?.voiceLabel).toBe("曉曼·酷");
    expect(rex?.greeting).toContain("烈");
    expect(list.every((c) => c.voiceId && c.voiceLabel)).toBe(true);
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
    expect(nextCharacterId("rex")).toBe("sky");
    expect(nextCharacterId("sky")).toBe("rose");
    expect(nextCharacterId("mimi")).toBe("amoji");
  });

  it("resolves new 3D character models", () => {
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-rose.vrm" })).toBe(
      "rose",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-robert.vrm" })).toBe(
      "robert",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-rabbit.vrm" })).toBe(
      "mimi",
    );
    expect(defaultVoiceForCharacter("rose", "yue")).toBe("zh-HK-HiuMaanNeural-warm");
    expect(defaultVoiceForCharacter("mimi", "yue")).toBe("zh-HK-HiuGaaiNeural-sweet");
  });

  it("exposes avatar config per character", () => {
    const sora = characterAvatarConfig("sora", "yue");
    expect(sora.avatarPrefer).toBe("gltf");
    expect(sora.modelUrl).toContain(".glb");
    const kizuna = getCharacter("kizuna");
    expect(kizuna.traits.en).toContain("energetic");
    expect(kizuna.modelUrl).toContain("kizuna-kamatte.vrm");
    const rex = characterAvatarConfig("rex", "yue");
    expect(rex.modelUrl).toContain("companion-kai.vrm");
    expect(characterAvatarConfig("kizuna", "en").avatarPrefer).toBe("vrm");
  });
});
