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

const GEN2_SLOTS = [
  "pyre",
  "pan",
  "circle",
  "face",
  "cool",
  "samplec",
  "lantern",
  "drift",
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
      ...GEN2_SLOTS,
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
    expect(getCharacter("pan").modelUrl).toContain("companion-pan.vrm");
    expect(getCharacter("drift").modelUrl).toContain("companion-drift.vrm");
    expect(getCharacter("sakura").modelUrl).toContain("companion-sakura.vrm");
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
    expect(LEGACY_CHARACTER_ALIASES.chad).toBe("lantern");
    expect(resolveCharacterId({ characterParam: "sora" })).toBe("sakura");
    expect(resolveCharacterId({ characterParam: "hugo" })).toBe("pan");
    expect(getCharacter("chad").id).toBe("lantern");
    expect(getCharacter("olivia").id).toBe("yuki");
    expect(getCharacter("kate").name.en).toBe(getCharacter("mio").name.en);
  });

  it("maps legacy id kate to mio (companion-kate.vrm roster slot)", () => {
    expect(resolveCharacterId({ characterParam: "kate" })).toBe("mio");
  });

  it("maps curated model urls", () => {
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-rex.vrm" })).toBe(
      "cool",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-yuki.vrm" })).toBe(
      "yuki",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-lydia.vrm" })).toBe("hina");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-mio.vrm" })).toBe("mio");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-amoji.vrm" })).toBe(
      "amoji",
    );
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-nana.vrm" })).toBe("pan");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-kai.vrm" })).toBe("cool");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-robert.vrm" })).toBe(
      "lantern",
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
      "samplec",
      "yume",
    ]);
    const hd = listHighPolyFaceCharacters("en");
    expect(hd.map((c) => c.id)).toEqual(["kizuna", "alicia", "yume", "samplec", "ember"]);
    expect(isHighPolyFaceCharacter("nova")).toBe(false);
  });

  it("cycles roster in order", () => {
    expect(nextCharacterId("nova")).toBe("kizuna");
    expect(nextCharacterId("ember")).toBe("sakura");
    expect(nextCharacterId("yume")).toBe("sky");
    expect(nextCharacterId("sky")).toBe("yuki");
    expect(nextCharacterId("drift")).toBe("nova");
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
    expect(list.find((c) => c.id === "pyre")?.number).toBe(16);
    expect(list.find((c) => c.id === "amoji")?.number).toBe(15);
    expect(list.find((c) => c.id === "sakura")?.number).toBe(5);
    expect(list.find((c) => c.id === "atlas")?.number).toBe(9);
    expect(list.find((c) => c.id === "drift")?.number).toBe(23);
    expect(GALLERY_PRIORITY_IDS.has("amoji")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("pan")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.has("drift")).toBe(true);
    expect(GALLERY_PRIORITY_IDS.size).toBe(ROSTER_SIZE);
    expect(isAaaRosterCharacter("sky")).toBe(true);
    expect(isAaaRosterCharacter("nova")).toBe(false);
    expect(aaaRosterBadge("yuki", true)).toBe("AAA Pro");
    expect(aaaRosterBadge("sky", true)).toBe("AAA");
    expect(aaaRosterBadge("pan", true)).toBe("AAA");
  });

  it("builds character-specific prompts", () => {
    expect(buildCharacterSystemPrompt("nova", false)).toContain("諾娃");
    expect(buildCharacterSystemPrompt("cool", true)).toMatch(/Cool|酷/i);
    expect(buildCharacterSystemPrompt("mio", true)).toMatch(/Mio|go-getter/i);
    expect(buildCharacterSystemPrompt("pan", true)).toMatch(/Pan/i);
    expect(characterGreeting("yuki", true)).toMatch(/Yuki/i);
    expect(characterGender("cool", "yue")).toBe("male");
    expect(characterGender("lantern", "yue")).toBe("male");
    expect(characterGender("atlas", "en")).toBe("male");
    expect(characterGender("hina", "yue")).toBe("female");
    expect(characterGender("pan", "yue")).toBe("female");
    expect(characterVoiceLabel("yuki", "yue", false)).toBeTruthy();
    expect(MALE_CHARACTER_IDS.size).toBe(3);
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
    expect(defaultVoiceForCharacter("pan", "yue")).toBe(
      "zh-HK-HiuMaanNeural-chibi",
    );
  });

  it("exposes avatar config per character", () => {
    expect(characterAvatarConfig("cool", "yue").modelUrl).toContain("companion-cool.vrm");
    expect(characterAvatarConfig("pyre", "yue").modelUrl).toContain("companion-pyre.vrm");
    expect(characterGreetingPerformance("sakura").emotion).toBe("happy");
    expect(characterHungryPerformance("pan").emotion).toBeTruthy();
    expect(characterLonelyPerformance("face").emotion).toBeTruthy();
  });
});
