import { describe, expect, it } from "vitest";
import {
  buildCharacterSystemPrompt,
  CHARACTER_IDS,
  characterAvatarConfig,
  characterPreviewImage,
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
  aaaRosterBadge,
  GALLERY_PRIORITY_IDS,
  isAaaRosterCharacter,
  HIGH_POLY_FACE_CHARACTER_IDS,
  isHighPolyFaceCharacter,
  listCompanionCharacters,
  listHighPolyFaceCharacters,
  nextCharacterId,
  resolveCharacterId,
  ROSTER_LOCKED_NUMBERS,
  TRIAL_CHARACTER_IDS,
} from "../engine/companion/companionCharacterCatalog.js";

const ROSTER_SIZE = CHARACTER_IDS.length;

describe("companionCharacterCatalog v352 AAA roster", () => {
  it("keeps flagship roster numbers 1–4", () => {
    expect(characterNumber("nova")).toBe(1);
    expect(characterNumber("kizuna")).toBe(2);
    expect(characterNumber("alicia")).toBe(3);
    expect(characterNumber("ember")).toBe(4);
    expect(ROSTER_LOCKED_NUMBERS).toEqual([1, 2, 3, 4]);
  });

  it("exposes the expanded AAA catalog", () => {
    expect(ROSTER_SIZE).toBe(23);
    expect(CHARACTER_IDS).toEqual([
      "nova",
      "kizuna",
      "alicia",
      "ember",
      "sora",
      "aria",
      "mei",
      "luna",
      "atlas",
      "erika",
      "sky",
      "yuki",
      "hina",
      "mio",
      "amoji",
      "rex",
      "shiro",
      "jennifer",
      "poly",
      "aesthe",
      "chad",
      "david",
      "hugo",
    ]);
    expect(Object.keys(COMPANION_CHARACTERS).sort()).toEqual([...CHARACTER_IDS].sort());
    expect(TRIAL_CHARACTER_IDS).toEqual(["yuki", "hina", "mio"]);
  });

  it("uses distinct preview portraits for flagship picks", () => {
    expect(getCharacter("nova").previewImage).toBe(characterPreviewImage("nova"));
    expect(getCharacter("kizuna").previewImage).toBe(characterPreviewImage("kizuna"));
    expect(getCharacter("sky").previewImage).toBe(characterPreviewImage("sky"));
    expect(getCharacter("yuki").modelUrl).toContain("companion-olivia.vrm");
    expect(getCharacter("hina").modelUrl).toContain("companion-lydia.vrm");
    expect(getCharacter("mio").modelUrl).toContain("companion-kate.vrm");
    expect(getCharacter("shiro").modelUrl).toContain("companion-shiro.vrm");
    expect(getCharacter("poly").modelUrl).toContain("companion-polydancer.vrm");
  });

  it("assigns one preview path per roster id", () => {
    const paths = CHARACTER_IDS.map((id) => characterPreviewImage(id));
    expect(new Set(paths).size).toBe(CHARACTER_IDS.length);
  });

  it("resolves default to nova", () => {
    expect(resolveCharacterId({})).toBe("nova");
    expect(getCharacter("missing").id).toBe("nova");
  });

  it("maps legacy lite secretary id kate to nova", () => {
    expect(resolveCharacterId({ characterParam: "kate" })).toBe("nova");
  });

  it("maps curated model urls", () => {
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-kai.vrm" })).toBe("rex");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-olivia.vrm" })).toBe(
      "yuki",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-lydia.vrm" })).toBe("hina");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-kate.vrm" })).toBe("mio");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-girl.vrm" })).toBe("amoji");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-shiro.vrm" })).toBe(
      "shiro",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-chad.vrm" })).toBe("chad");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-avatarsample-c.vrm" })).toBe(
      "sora",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-vroid-male.vrm" })).toBe(
      "atlas",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-erika.vrm" })).toBe("erika");
  });

  it("assigns distinct voices per roster character", () => {
    const yue = CHARACTER_IDS.map((id) => getCharacter(id).voices.yue);
    expect(new Set(yue).size).toBe(CHARACTER_IDS.length);
  });

  it("lists high-poly face characters", () => {
    expect([...HIGH_POLY_FACE_CHARACTER_IDS].sort()).toEqual([
      "alicia",
      "ember",
      "erika",
      "kizuna",
      "rex",
    ]);
    const hd = listHighPolyFaceCharacters("en");
    expect(hd.map((c) => c.id)).toEqual(["kizuna", "rex", "alicia", "erika", "ember"]);
    expect(isHighPolyFaceCharacter("nova")).toBe(false);
  });

  it("cycles roster in order", () => {
    expect(nextCharacterId("nova")).toBe("kizuna");
    expect(nextCharacterId("ember")).toBe("sora");
    expect(nextCharacterId("erika")).toBe("sky");
    expect(nextCharacterId("sky")).toBe("yuki");
    expect(nextCharacterId("hugo")).toBe("nova");
  });

  it("lists picker metadata with roster numbers", () => {
    const list = listCompanionCharacters("yue");
    expect(list[0]).toMatchObject({ id: "nova", number: 1 });
    expect(list.find((c) => c.id === "rex")?.number).toBe(16);
    expect(list.find((c) => c.id === "amoji")?.number).toBe(15);
    expect(list.find((c) => c.id === "sora")?.number).toBe(5);
    expect(list.find((c) => c.id === "atlas")?.number).toBe(9);
    expect(list.find((c) => c.id === "hugo")?.number).toBe(23);
    expect(GALLERY_PRIORITY_IDS.has("amoji")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("shiro")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("hugo")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.size).toBe(ROSTER_SIZE);
    expect(isAaaRosterCharacter("sky")).toBe(true);
    expect(isAaaRosterCharacter("nova")).toBe(false);
    expect(aaaRosterBadge("yuki", true)).toBe("AAA Pro");
    expect(aaaRosterBadge("sky", true)).toBe("AAA");
    expect(aaaRosterBadge("shiro", true)).toBe("AAA");
  });

  it("builds character-specific prompts", () => {
    expect(buildCharacterSystemPrompt("nova", false)).toContain("諾娃");
    expect(buildCharacterSystemPrompt("rex", true)).toMatch(/Rex|烈/i);
    expect(buildCharacterSystemPrompt("mio", true)).toMatch(/Mio|go-getter/i);
    expect(buildCharacterSystemPrompt("shiro", true)).toMatch(/Shiro/i);
    expect(characterGreeting("yuki", true)).toMatch(/Yuki/i);
    expect(characterGender("rex", "yue")).toBe("male");
    expect(characterGender("chad", "yue")).toBe("male");
    expect(characterGender("hina", "yue")).toBe("female");
    expect(characterVoiceLabel("yuki", "yue", false)).toBeTruthy();
  });

  it("exposes avatar config per character", () => {
    expect(characterAvatarConfig("rex", "yue").modelUrl).toContain("companion-kai.vrm");
    expect(characterAvatarConfig("david", "yue").modelUrl).toContain("companion-david.vrm");
    expect(defaultVoiceForCharacter("yuki", "yue")).toBe("zh-HK-HiuMaanNeural-yuki");
    expect(defaultVoiceForCharacter("jennifer", "yue")).toBe("zh-HK-HiuMaanNeural-jennifer");
  });

  it("keeps hungry lines on the same character voice profile", () => {
    const base = characterGreetingPerformance("amoji");
    const hungry = characterHungryPerformance("amoji");
    expect(hungry.emotion).toBe("sad");
    expect(hungry.nuance).not.toBe("stress");
    expect(hungry.talkStyle).toBe("soft");
    expect(hungry.speechEnergy).toBeLessThan(base.speechEnergy);
    expect(hungry.speechEnergy).toBeGreaterThan(0.38);
    const lonely = characterLonelyPerformance("hina");
    expect(lonely.emotion).toBe("sad");
    expect(lonely.nuance).toBe("shy");
    expect(lonely.talkStyle).toBe("soft");
  });
});
