import { describe, expect, it } from "vitest";
import {
  buildCharacterSystemPrompt,
  CHARACTER_IDS,
  characterAvatarConfig,
  characterGreeting,
  characterGreetingPerformance,
  characterVoiceLabel,
  COMPANION_CHARACTERS,
  defaultVoiceForCharacter,
  getCharacter,
  GALLERY_PRIORITY_IDS,
  listCompanionCharacters,
  nextCharacterId,
  resolveCharacterId,
} from "../engine/companion/companionCharacterCatalog.js";

describe("companionCharacterCatalog", () => {
  it("resolves default gallery-priority nova character", () => {
    expect(resolveCharacterId({})).toBe("nova");
  });

  it("lists gallery pretty-girl picks first", () => {
    expect(CHARACTER_IDS.slice(0, 5)).toEqual([
      "nova",
      "alicia",
      "ember",
      "chibi",
      "sky",
    ]);
    expect(GALLERY_PRIORITY_IDS.has("nova")).toBe(true);
    expect(CHARACTER_IDS.indexOf("mikel")).toBeGreaterThan(
      CHARACTER_IDS.indexOf("kate"),
    );
    expect(Object.keys(COMPANION_CHARACTERS).sort()).toEqual(
      [...CHARACTER_IDS].sort(),
    );
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
    expect(amoji).toContain("ChatGPT Advanced Voice");
    expect(rex).toContain("烈");
    expect(rex).not.toContain("曖咪");
  });

  it("cycles characters", () => {
    expect(nextCharacterId("nova")).toBe("alicia");
    expect(nextCharacterId("sky")).toBe("kizuna");
    expect(nextCharacterId("mimi")).toBe("olivia");
    expect(nextCharacterId("amoji")).toBe("sora");
    expect(nextCharacterId("mikel")).toBe("nova");
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
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-alicia.vrm" })).toBe(
      "alicia",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-nova.vrm" })).toBe(
      "nova",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-ember.vrm" })).toBe(
      "ember",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-chibi.vrm" })).toBe(
      "chibi",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-quinn.glb" })).toBe(
      "quinn",
    );
    expect(defaultVoiceForCharacter("nova", "yue")).toBe("zh-HK-HiuMaanNeural-bright");
    expect(defaultVoiceForCharacter("quinn", "yue")).toBe("zh-HK-HiuMaanNeural-hero");
    expect(defaultVoiceForCharacter("ember", "yue")).toBe("zh-HK-HiuGaaiNeural-fiery");
    expect(defaultVoiceForCharacter("chibi", "yue")).toBe("zh-HK-HiuMaanNeural-chibi");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-olivia.vrm" })).toBe(
      "olivia",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-erika.vrm" })).toBe(
      "erika",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-lydia.vrm" })).toBe(
      "lydia",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-kate.vrm" })).toBe(
      "kate",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-mikel.vrm" })).toBe(
      "mikel",
    );
    expect(defaultVoiceForCharacter("mikel", "yue")).toBe("zh-HK-WanLungNeural-bold");
    expect(defaultVoiceForCharacter("kate", "yue")).toBe("zh-HK-HiuMaanNeural-sharp");
    expect(defaultVoiceForCharacter("olivia", "yue")).toBe("zh-HK-HiuGaaiNeural-sunny");
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
