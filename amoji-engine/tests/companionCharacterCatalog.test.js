import { describe, expect, it } from "vitest";
import {
  buildCharacterSystemPrompt,
  CHARACTER_IDS,
  characterAvatarConfig,
  characterGender,
  characterGreeting,
  characterNumber,
  characterVoiceLabel,
  COMPANION_CHARACTERS,
  defaultVoiceForCharacter,
  getCharacter,
  GALLERY_PRIORITY_IDS,
  HIGH_POLY_FACE_CHARACTER_IDS,
  isHighPolyFaceCharacter,
  listCompanionCharacters,
  listHighPolyFaceCharacters,
  nextCharacterId,
  resolveCharacterId,
  ROSTER_LOCKED_NUMBERS,
  TRIAL_CHARACTER_IDS,
} from "../engine/companion/companionCharacterCatalog.js";

describe("companionCharacterCatalog v216 roster", () => {
  it("keeps locked roster numbers 1,2,3,4,13,14,16", () => {
    expect(characterNumber("nova")).toBe(1);
    expect(characterNumber("kizuna")).toBe(2);
    expect(characterNumber("alicia")).toBe(3);
    expect(characterNumber("ember")).toBe(4);
    expect(characterNumber("kate")).toBe(13);
    expect(characterNumber("quinn")).toBe(14);
    expect(characterNumber("sora")).toBe(16);
    expect(ROSTER_LOCKED_NUMBERS).toEqual([1, 2, 3, 4, 13, 14, 16]);
  });

  it("has 16 roster entries with trial slots 5-12 and 15", () => {
    expect(CHARACTER_IDS.length).toBe(16);
    expect(CHARACTER_IDS.slice(4, 12)).toEqual([
      "yuki",
      "vroidm",
      "chad",
      "david",
      "hugo",
      "poly",
      "aesthe",
      "shiro",
    ]);
    expect(CHARACTER_IDS[14]).toBe("jennifer");
    expect(TRIAL_CHARACTER_IDS.length).toBe(9);
    expect(Object.keys(COMPANION_CHARACTERS).sort()).toEqual([...CHARACTER_IDS].sort());
  });

  it("resolves default to nova", () => {
    expect(resolveCharacterId({})).toBe("nova");
    expect(getCharacter("missing").id).toBe("nova");
  });

  it("maps trial model urls", () => {
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-chad.vrm" })).toBe(
      "chad",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-polydancer.vrm" })).toBe(
      "poly",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-jennifer.vrm" })).toBe(
      "jennifer",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-girl.glb" })).toBe("sora");
  });

  it("assigns distinct voices per roster character", () => {
    const yue = CHARACTER_IDS.map((id) => getCharacter(id).voices.yue);
    expect(new Set(yue).size).toBe(CHARACTER_IDS.length);
  });

  it("lists high-poly face characters without removed rex", () => {
    expect([...HIGH_POLY_FACE_CHARACTER_IDS].sort()).toEqual(["alicia", "ember", "kizuna"]);
    const hd = listHighPolyFaceCharacters("en");
    expect(hd.map((c) => c.id)).toEqual(["kizuna", "alicia", "ember"]);
    expect(isHighPolyFaceCharacter("nova")).toBe(false);
  });

  it("cycles roster in order", () => {
    expect(nextCharacterId("nova")).toBe("kizuna");
    expect(nextCharacterId("ember")).toBe("yuki");
    expect(nextCharacterId("shiro")).toBe("kate");
    expect(nextCharacterId("quinn")).toBe("jennifer");
    expect(nextCharacterId("sora")).toBe("nova");
  });

  it("lists picker metadata", () => {
    const list = listCompanionCharacters("yue");
    expect(list[0]).toMatchObject({ id: "nova", number: 1 });
    expect(list.find((c) => c.id === "chad")?.number).toBe(7);
    expect(list.find((c) => c.id === "sora")?.number).toBe(16);
    expect(GALLERY_PRIORITY_IDS.has("nova")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("chibi")).toBe(false);
  });

  it("builds character-specific prompts", () => {
    expect(buildCharacterSystemPrompt("nova", false)).toContain("諾娃");
    expect(buildCharacterSystemPrompt("chad", true)).toContain("Chad");
    expect(characterGreeting("kate", true)).toMatch(/Kate/i);
    expect(characterGender("chad", "yue")).toBe("male");
    expect(characterGender("nova", "yue")).toBe("female");
    expect(characterVoiceLabel("kate", "yue", false)).toBe("曉曼·俐落");
  });

  it("exposes avatar config per character", () => {
    expect(characterAvatarConfig("sora", "yue").avatarPrefer).toBe("gltf");
    expect(characterAvatarConfig("chad", "yue").modelUrl).toContain("companion-chad.vrm");
    expect(defaultVoiceForCharacter("poly", "yue")).toBe("zh-HK-HiuMaanNeural-cool");
  });
});
