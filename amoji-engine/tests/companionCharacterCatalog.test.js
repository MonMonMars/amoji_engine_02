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

const GEN3_SLOTS = [
  "knight",
  "samurai",
  "tiger",
  "leaf",
  "wolf",
  "fox",
  "jenny",
  "weirdcat",
  "petal",
  "beach",
  "pirate",
  "bunny",
];

describe("companionCharacterCatalog v363 VTuber roster", () => {
  it("keeps flagship roster numbers 1–4", () => {
    expect(characterNumber("nova")).toBe(1);
    expect(characterNumber("kizuna")).toBe(2);
    expect(characterNumber("alicia")).toBe(3);
    expect(characterNumber("ember")).toBe(4);
    expect(ROSTER_LOCKED_NUMBERS).toEqual([1, 2, 3, 4]);
  });

  it("exposes the VTuber + AAA catalog", () => {
    expect(ROSTER_SIZE).toBe(31);
    expect(CHARACTER_IDS).toEqual([
      "nova",
      "kizuna",
      "alicia",
      "ember",
      "mei",
      "atlas",
      "sky",
      "yuki",
      "hina",
      "mio",
      "amoji",
      ...GEN3_SLOTS,
      "sakura",
      "luna",
      "celeste",
      "yume",
      "aria",
      "noah",
      "rika",
      "vega",
    ]);
    expect(Object.keys(COMPANION_CHARACTERS).sort()).toEqual([...CHARACTER_IDS].sort());
    expect(TRIAL_CHARACTER_IDS).toEqual(["yuki", "hina", "mio"]);
  });

  it("uses distinct preview portraits for flagship picks", () => {
    expect(getCharacter("nova").previewImage).toBe(characterPreviewImage("nova"));
    expect(getCharacter("kizuna").previewImage).toBe(characterPreviewImage("kizuna"));
    expect(getCharacter("sky").previewImage).toBe(characterPreviewImage("sky"));
    expect(getCharacter("yuki").modelUrl).toContain("companion-yuki.vrm");
    expect(getCharacter("hina").modelUrl).toContain("companion-hina.vrm");
    expect(getCharacter("mio").modelUrl).toContain("companion-mio.vrm");
    expect(getCharacter("fox").modelUrl).toContain("companion-fox.vrm");
    expect(getCharacter("bunny").modelUrl).toContain("companion-bunny.vrm");
    expect(getCharacter("mei").modelUrl).toContain("companion-mei.vrm");
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
    expect(LEGACY_CHARACTER_ALIASES.sora).toBe("mei");
    expect(LEGACY_CHARACTER_ALIASES.erika).toBe("mei");
    expect(LEGACY_CHARACTER_ALIASES.sakura).toBeUndefined();
    expect(LEGACY_CHARACTER_ALIASES.chad).toBe("samurai");
    expect(resolveCharacterId({ characterParam: "sora" })).toBe("mei");
    expect(resolveCharacterId({ characterParam: "hugo" })).toBe("fox");
    expect(getCharacter("chad").id).toBe("samurai");
    expect(getCharacter("olivia").id).toBe("yuki");
    expect(getCharacter("kate").name.en).toBe(getCharacter("mio").name.en);
  });

  it("maps legacy id kate to mio (companion-kate.vrm roster slot)", () => {
    expect(resolveCharacterId({ characterParam: "kate" })).toBe("mio");
  });

  it("maps curated model urls", () => {
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-rex.vrm" })).toBe(
      "wolf",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-yuki.vrm" })).toBe(
      "yuki",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-lydia.vrm" })).toBe("hina");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-mio.vrm" })).toBe("mio");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-amoji.vrm" })).toBe(
      "amoji",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-nana.vrm" })).toBe("fox");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-kai.vrm" })).toBe("wolf");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-robert.vrm" })).toBe(
      "samurai",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-rose.vrm" })).toBe("mei");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-avatarsample-a.vrm" })).toBe(
      "mei",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-vroid-male.vrm" })).toBe(
      "atlas",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-erika.vrm" })).toBe("mei");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-sakura.vrm" })).toBe(
      "sakura",
    );
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
    ]);
    const hd = listHighPolyFaceCharacters("en");
    expect(hd.map((c) => c.id)).toEqual(["kizuna", "alicia", "ember"]);
    expect(isHighPolyFaceCharacter("nova")).toBe(false);
  });

  it("cycles roster in order", () => {
    expect(nextCharacterId("nova")).toBe("kizuna");
    expect(nextCharacterId("ember")).toBe("mei");
    expect(nextCharacterId("mei")).toBe("atlas");
    expect(nextCharacterId("sky")).toBe("yuki");
    expect(nextCharacterId("bunny")).toBe("sakura");
    expect(nextCharacterId("yume")).toBe("aria");
    expect(nextCharacterId("vega")).toBe("nova");
  });

  it("exposes avatarLabel on picker list items", () => {
    const mei = listCompanionCharacters("en").find((c) => c.id === "mei");
    expect(mei?.avatarLabel).toMatch(/VRoid/i);
    const atlas = listCompanionCharacters("en").find((c) => c.id === "atlas");
    expect(atlas?.avatarLabel).toMatch(/VRoid/i);
  });

  it("lists picker metadata with roster numbers", () => {
    const list = listCompanionCharacters("yue");
    expect(list[0]).toMatchObject({ id: "nova", number: 1 });
    expect(list.find((c) => c.id === "knight")?.number).toBe(12);
    expect(list.find((c) => c.id === "amoji")?.number).toBe(11);
    expect(list.find((c) => c.id === "mei")?.number).toBe(5);
    expect(list.find((c) => c.id === "atlas")?.number).toBe(6);
    expect(list.find((c) => c.id === "bunny")?.number).toBe(23);
    expect(list.find((c) => c.id === "yume")?.number).toBe(27);
    expect(list.find((c) => c.id === "vega")?.number).toBe(31);
    expect(GALLERY_PRIORITY_IDS.has("amoji")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("fox")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("bunny")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.size).toBe(ROSTER_SIZE);
    expect(isAaaRosterCharacter("sky")).toBe(true);
    expect(isAaaRosterCharacter("nova")).toBe(false);
    expect(aaaRosterBadge("yuki", true)).toBe("AAA Pro");
    expect(aaaRosterBadge("sky", true)).toBe("AAA");
    expect(aaaRosterBadge("fox", true)).toBe("AAA");
    expect(aaaRosterBadge("sakura", true)).toBe("VRoid Pro");
  });

  it("builds character-specific prompts", () => {
    expect(buildCharacterSystemPrompt("nova", false)).toContain("諾娃");
    expect(buildCharacterSystemPrompt("wolf", true)).toMatch(/Wolf|狼/i);
    expect(buildCharacterSystemPrompt("mio", true)).toMatch(/Mio|go-getter/i);
    expect(buildCharacterSystemPrompt("fox", true)).toMatch(/Fox/i);
    expect(characterGreeting("yuki", true)).toMatch(/Yuki/i);
    expect(characterGender("wolf", "yue")).toBe("male");
    expect(characterGender("samurai", "yue")).toBe("male");
    expect(characterGender("atlas", "en")).toBe("male");
    expect(characterGender("hina", "yue")).toBe("female");
    expect(characterGender("fox", "yue")).toBe("female");
    expect(characterVoiceLabel("yuki", "yue", false)).toBeTruthy();
    expect(MALE_CHARACTER_IDS.size).toBe(8);
    expect(characterGender("noah", "en")).toBe("male");
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
    expect(defaultVoiceForCharacter("fox", "yue")).toBe(
      "zh-HK-HiuMaanNeural-chibi",
    );
  });

  it("exposes avatar config per character", () => {
    expect(characterAvatarConfig("wolf", "yue").modelUrl).toContain("companion-wolf.vrm");
    expect(characterAvatarConfig("knight", "yue").modelUrl).toContain("companion-knight.vrm");
    expect(characterGreetingPerformance("mei").emotion).toBe("happy");
    expect(characterHungryPerformance("fox").emotion).toBeTruthy();
    expect(characterLonelyPerformance("petal").emotion).toBeTruthy();
  });
});
