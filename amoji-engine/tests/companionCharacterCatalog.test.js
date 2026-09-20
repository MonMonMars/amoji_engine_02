import { describe, expect, it } from "vitest";
import {
  buildCharacterSystemPrompt,
  CHARACTER_IDS,
  characterAvatarConfig,
  characterPreviewImage,
  characterGender,
  MALE_CHARACTER_IDS,
  defaultVoiceForCharacter,
  characterGreeting,
  characterGreetingPerformance,
  characterHungryPerformance,
  characterLonelyPerformance,
  characterNumber,
  characterVoiceLabel,
  COMPANION_CHARACTERS,
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
  LEGACY_CHARACTER_ALIASES,
} from "../engine/companion/companionCharacterCatalog.js";
import { findVoiceProfile } from "../engine/companion/companionVoiceProfiles.js";
import { resolveVoiceForCharacter } from "../engine/companion/companionVoiceCatalog.js";

const ROSTER_SIZE = CHARACTER_IDS.length;

describe("companionCharacterCatalog v363 VTuber roster", () => {
  it("keeps flagship roster numbers 1–4", () => {
    expect(characterNumber("nova")).toBe(1);
    expect(characterNumber("kizuna")).toBe(2);
    expect(characterNumber("alicia")).toBe(3);
    expect(characterNumber("ember")).toBe(4);
    expect(ROSTER_LOCKED_NUMBERS).toEqual([1, 2, 3, 4]);
  });

  it("exposes the VTuber + AAA catalog", () => {
    expect(ROSTER_SIZE).toBe(23);
    expect(CHARACTER_IDS).toEqual([
      "nova",
      "kizuna",
      "alicia",
      "ember",
      "sakura",
      "celeste",
      "mei",
      "luna",
      "atlas",
      "yume",
      "sky",
      "yuki",
      "hina",
      "mio",
      "amoji",
      "rex",
      "nana",
      "sumi",
      "lumi",
      "vera",
      "robert",
      "mikel",
      "mimi",
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
    expect(getCharacter("nana").modelUrl).toContain("companion-chibi.vrm");
    expect(getCharacter("lumi").modelUrl).toContain("companion-polydancer.vrm");
  });

  it("assigns one preview path per roster id", () => {
    const paths = CHARACTER_IDS.map((id) => characterPreviewImage(id));
    expect(new Set(paths).size).toBe(CHARACTER_IDS.length);
  });

  it("resolves default to nova", () => {
    expect(resolveCharacterId({})).toBe("nova");
    expect(getCharacter("missing").id).toBe("nova");
  });

  it("maps legacy roster ids to replacements", () => {
    expect(LEGACY_CHARACTER_ALIASES.sora).toBe("sakura");
    expect(LEGACY_CHARACTER_ALIASES.erika).toBe("yume");
    expect(LEGACY_CHARACTER_ALIASES.chad).toBe("robert");
    expect(resolveCharacterId({ characterParam: "sora" })).toBe("sakura");
    expect(resolveCharacterId({ characterParam: "hugo" })).toBe("mimi");
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
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-chibi.vrm" })).toBe("nana");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-robert.vrm" })).toBe(
      "robert",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-rose.vrm" })).toBe("sakura");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-avatarsample-a.vrm" })).toBe(
      "celeste",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-vroid-male.vrm" })).toBe(
      "atlas",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-erika.vrm" })).toBe("yume");
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
      "yume",
    ]);
    const hd = listHighPolyFaceCharacters("en");
    expect(hd.map((c) => c.id)).toEqual(["kizuna", "rex", "alicia", "yume", "ember"]);
    expect(isHighPolyFaceCharacter("nova")).toBe(false);
  });

  it("cycles roster in order", () => {
    expect(nextCharacterId("nova")).toBe("kizuna");
    expect(nextCharacterId("ember")).toBe("sakura");
    expect(nextCharacterId("yume")).toBe("sky");
    expect(nextCharacterId("sky")).toBe("yuki");
    expect(nextCharacterId("mimi")).toBe("nova");
  });

  it("exposes avatarLabel on picker list items", () => {
    const sakura = listCompanionCharacters("en").find((c) => c.id === "sakura");
    expect(sakura?.avatarLabel).toMatch(/VTuber/i);
    const celeste = listCompanionCharacters("en").find((c) => c.id === "celeste");
    expect(celeste?.avatarLabel).toMatch(/VRoid/i);
  });

  it("lists picker metadata with roster numbers", () => {
    const list = listCompanionCharacters("yue");
    expect(list[0]).toMatchObject({ id: "nova", number: 1 });
    expect(list.find((c) => c.id === "rex")?.number).toBe(16);
    expect(list.find((c) => c.id === "amoji")?.number).toBe(15);
    expect(list.find((c) => c.id === "sakura")?.number).toBe(5);
    expect(list.find((c) => c.id === "atlas")?.number).toBe(9);
    expect(list.find((c) => c.id === "mimi")?.number).toBe(23);
    expect(GALLERY_PRIORITY_IDS.has("amoji")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("nana")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("mimi")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.size).toBe(ROSTER_SIZE);
    expect(isAaaRosterCharacter("sky")).toBe(true);
    expect(isAaaRosterCharacter("nova")).toBe(false);
    expect(aaaRosterBadge("yuki", true)).toBe("AAA Pro");
    expect(aaaRosterBadge("sky", true)).toBe("AAA");
    expect(aaaRosterBadge("nana", true)).toBe("AAA");
  });

  it("builds character-specific prompts", () => {
    expect(buildCharacterSystemPrompt("nova", false)).toContain("諾娃");
    expect(buildCharacterSystemPrompt("rex", true)).toMatch(/Rex|烈/i);
    expect(buildCharacterSystemPrompt("mio", true)).toMatch(/Mio|go-getter/i);
    expect(buildCharacterSystemPrompt("nana", true)).toMatch(/Nana/i);
    expect(characterGreeting("yuki", true)).toMatch(/Yuki/i);
    expect(characterGender("rex", "yue")).toBe("male");
    expect(characterGender("robert", "yue")).toBe("male");
    expect(characterGender("mikel", "yue")).toBe("male");
    expect(characterGender("atlas", "en")).toBe("male");
    expect(characterGender("hina", "yue")).toBe("female");
    expect(characterGender("mimi", "yue")).toBe("female");
    expect(characterVoiceLabel("yuki", "yue", false)).toBeTruthy();
    expect(MALE_CHARACTER_IDS.size).toBe(4);
  });

  it("matches TTS voice gender to character gender for every roster entry", () => {
    for (const id of CHARACTER_IDS) {
      const expected = characterGender(id, "yue");
      for (const lang of ["yue", "en"]) {
        const voiceId = resolveVoiceForCharacter(id, lang);
        const profile = findVoiceProfile(voiceId);
        expect(profile?.gender, `${id} ${lang} ${voiceId}`).toBe(expected);
      }
    }
    expect(defaultVoiceForCharacter("mimi", "yue")).toBe(
      "zh-HK-HiuMaanNeural-chibi",
    );
  });

  it("exposes avatar config per character", () => {
    expect(characterAvatarConfig("rex", "yue").modelUrl).toContain("companion-kai.vrm");
    expect(characterAvatarConfig("mikel", "yue").modelUrl).toContain("companion-mikel.vrm");
    expect(characterGreetingPerformance("sakura").emotion).toBe("happy");
    expect(characterHungryPerformance("mimi").emotion).toBeTruthy();
    expect(characterLonelyPerformance("vera").emotion).toBeTruthy();
  });
});
