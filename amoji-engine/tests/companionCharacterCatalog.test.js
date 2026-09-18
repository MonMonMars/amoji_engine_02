import { describe, expect, it } from "vitest";
import {
  buildCharacterSystemPrompt,
  CHARACTER_IDS,
  characterAvatarConfig,
  characterGender,
  characterGreeting,
  characterGreetingPerformance,
  characterHungryPerformance,
  characterLonelyPerformance,
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

describe("companionCharacterCatalog v225 pre-release roster", () => {
  it("keeps flagship roster numbers 1–4", () => {
    expect(characterNumber("nova")).toBe(1);
    expect(characterNumber("kizuna")).toBe(2);
    expect(characterNumber("alicia")).toBe(3);
    expect(characterNumber("ember")).toBe(4);
    expect(ROSTER_LOCKED_NUMBERS).toEqual([1, 2, 3, 4]);
  });

  it("exposes the full AAA + pro-reference catalog", () => {
    expect(CHARACTER_IDS.length).toBe(30);
    expect(CHARACTER_IDS).toContain("amoji");
    expect(CHARACTER_IDS).toContain("rex");
    expect(CHARACTER_IDS).toContain("rose");
    expect(CHARACTER_IDS).toContain("chibi");
    expect(CHARACTER_IDS).toContain("sky");
    expect(CHARACTER_IDS).toContain("hina");
    expect(CHARACTER_IDS).toContain("mio");
    expect(CHARACTER_IDS).toContain("vroidf");
    expect(CHARACTER_IDS).toContain("poly");
    expect(Object.keys(COMPANION_CHARACTERS).sort()).toEqual([...CHARACTER_IDS].sort());
    expect(TRIAL_CHARACTER_IDS.length).toBeGreaterThanOrEqual(10);
  });

  it("uses distinct preview portraits for flagship picks", () => {
    expect(getCharacter("nova").previewImage).toContain("companion-char-nova");
    expect(getCharacter("kizuna").previewImage).toContain("companion-char-kizuna");
    expect(getCharacter("alicia").previewImage).toContain("companion-char-alicia");
    expect(getCharacter("ember").previewImage).toContain("companion-char-ember");
    expect(getCharacter("chibi").previewImage).toContain("companion-char-chibi");
    expect(getCharacter("sky").previewImage).toContain("companion-char-sky");
  });

  it("resolves default to nova", () => {
    expect(resolveCharacterId({})).toBe("nova");
    expect(getCharacter("missing").id).toBe("nova");
  });

  it("maps pro-reference model urls", () => {
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-chad.vrm" })).toBe(
      "chad",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-kai.vrm" })).toBe("rex");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-avatarsample-a.vrm" })).toBe(
      "hina",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-vroid-female.vrm" })).toBe(
      "vroidf",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-girl.glb" })).toBe("sora");
  });

  it("assigns distinct voices per roster character", () => {
    const yue = CHARACTER_IDS.map((id) => getCharacter(id).voices.yue);
    expect(new Set(yue).size).toBe(CHARACTER_IDS.length);
  });

  it("lists high-poly face characters", () => {
    expect([...HIGH_POLY_FACE_CHARACTER_IDS].sort()).toEqual([
      "alicia",
      "ember",
      "kizuna",
      "rex",
    ]);
    const hd = listHighPolyFaceCharacters("en");
    expect(hd.map((c) => c.id)).toEqual(["kizuna", "rex", "alicia", "ember"]);
    expect(isHighPolyFaceCharacter("nova")).toBe(false);
  });

  it("cycles roster in order", () => {
    expect(nextCharacterId("nova")).toBe("kizuna");
    expect(nextCharacterId("ember")).toBe("chibi");
    expect(nextCharacterId("sky")).toBe("yuki");
    expect(nextCharacterId("jennifer")).toBe("nova");
  });

  it("lists picker metadata with roster numbers", () => {
    const list = listCompanionCharacters("yue");
    expect(list[0]).toMatchObject({ id: "nova", number: 1 });
    expect(list.find((c) => c.id === "rex")?.number).toBeGreaterThan(0);
    expect(list.find((c) => c.id === "rose")?.previewImage).toContain("companion-char-rose");
    expect(GALLERY_PRIORITY_IDS.has("chibi")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("amoji")).toBe(true);
  });

  it("builds character-specific prompts", () => {
    expect(buildCharacterSystemPrompt("nova", false)).toContain("諾娃");
    expect(buildCharacterSystemPrompt("rex", true)).toMatch(/Rex|烈/i);
    expect(characterGreeting("kate", true)).toMatch(/Kate/i);
    expect(characterGender("chad", "yue")).toBe("male");
    expect(characterGender("rose", "yue")).toBe("female");
    expect(characterVoiceLabel("kate", "yue", false)).toBe("曉曼·俐落");
  });

  it("exposes avatar config per character", () => {
    expect(characterAvatarConfig("sora", "yue").avatarPrefer).toBe("gltf");
    expect(characterAvatarConfig("rex", "yue").modelUrl).toContain("companion-kai.vrm");
    expect(defaultVoiceForCharacter("poly", "yue")).toBe("zh-HK-HiuGaaiNeural-poly");
  });

  it("keeps hungry lines on the same character voice profile", () => {
    const base = characterGreetingPerformance("amoji");
    const hungry = characterHungryPerformance("amoji");
    expect(hungry.emotion).toBe("sad");
    expect(hungry.nuance).not.toBe("stress");
    expect(hungry.talkStyle).toBe("soft");
    expect(hungry.speechEnergy).toBeLessThan(base.speechEnergy);
    expect(hungry.speechEnergy).toBeGreaterThan(0.38);
    const lonely = characterLonelyPerformance("sora");
    expect(lonely.emotion).toBe("sad");
    expect(lonely.nuance).toBe("shy");
    expect(lonely.talkStyle).toBe("soft");
  });
});
