/**
 * Companion character roster — model, voice, and LLM personality per avatar.
 *
 * One model + voice profile + personality per character.
 * Cantonese Edge speakers (zh-HK): 曉佳, 曉曼, 雲龍 — persona profiles extend timbre feel.
 * English adds Hong Kong neural voices: Yan (女), Sam (男).
 */
import {
  resolveCharacterRole,
  roleFunctionBadge,
} from "./companionCharacterRoles.js";
import { roleLabel } from "../mobile/companionRolePresets.js";
import { buildActionPromptFragment } from "./companionActionMotion.js";
import { buildCareDisabledPromptFragment } from "./companionCareDialogue.js";
import { buildPerformancePresetPromptFragment } from "./companionLlmPerformancePreset.js";
import { voiceShortLabel } from "./companionVoiceCatalog.js";
import { findVoiceProfile } from "./companionVoiceProfiles.js";
import { buildPositiveMindsetPromptFragment } from "./companionPositiveMindset.js";
import { buildWebAccessPromptFragment } from "./companionWebAccessPrompt.js";

export { pickCharacterPokeReaction } from "./companionCharacterPoke.js";

export const CHARACTER_STORAGE_KEY = "amoji.companion.characterId";

/** @typedef {{
 *   id: string,
 *   name: { yue: string, en: string },
 *   tagline: { yue: string, en: string },
 *   traits: { yue: string[], en: string[] },
 *   modelUrl: string,
 *   avatarPrefer: "vrm" | "gltf",
 *   previewImage: string,
 *   accent: string,
 *   badge?: { yue?: string, en?: string } | null,
 *   faceDetail?: {
 *     triangles: number,
 *     tier: "high" | "standard",
 *     note?: { yue?: string, en?: string },
 *   } | null,
 *   voices: { yue: string, en: string },
 *   personalityYue: string,
 *   personalityEn: string,
 *   tapLinesYue: string[],
 *   tapLinesEn: string[],
 *   greetingYue: string,
 *   greetingEn: string,
 *   greetingPerformance?: {
 *     emotion?: string,
 *     nuance?: string,
 *     talkStyle?: string,
 *     speechEnergy?: number,
 *   },
 *   prosodyBias?: { rate?: number, pitch?: number, volume?: number },
 *   avatarLabel: { yue: string, en: string },
 *   companionRole?: import("./companionCharacterRoles.js").CompanionRole,
 * }} CharacterDef */

/** @type {Record<string, CharacterDef>} */
import {
  COMPANION_ROSTER_CHARACTERS,
  ROSTER_CHARACTER_IDS,
  TRIAL_CHARACTER_IDS,
  ROSTER_LOCKED_NUMBERS,
} from "./companionCharacterRoster.js";
import {
  LEGACY_VRM_BASENAME_ALIASES,
  rosterVrmBasename,
} from "./rosterVrmAssets.mjs";
import { AMOJI_MODEL_REVISION } from "./companionCharacterMigration.mjs";
import {
  LEGACY_CHARACTER_ALIASES,
  normalizeLegacyRosterCharacterId,
} from "./companionLegacyRosterIds.js";

export { LEGACY_CHARACTER_ALIASES };

export { ROSTER_LOCKED_NUMBERS, TRIAL_CHARACTER_IDS };
export {
  characterModelFetchUrl,
  defaultVrmModelFetchUrl,
  modelFetchUrl,
  normalizeModelCacheKey,
} from "./companionModelAssets.mjs";

/** Active roster — see companionCharacterRoster.js */
export const COMPANION_CHARACTERS = COMPANION_ROSTER_CHARACTERS;

/**
 * Roster display + preload order — curated AAA catalog (v226).
 * Flagship: #1–4 Nova/Kizuna/Alicia/Ember; #5–17 expanded AAA catalog.
 */
export const CHARACTER_IDS = ROSTER_CHARACTER_IDS;

/**
 * 1-based roster number for picker cards. Unknown ids return 0.
 * @param {string | null | undefined} id
 */
export function characterNumber(id) {
  const idx = CHARACTER_IDS.indexOf(String(id || "").toLowerCase());
  return idx >= 0 ? idx + 1 : 0;
}

/**
 * Canonical roster card portrait path — one PNG per character id.
 * @param {string | null | undefined} id
 */
export function characterPreviewImage(id) {
  const key = String(id || "nova").toLowerCase();
  const bust = encodeURIComponent(AMOJI_MODEL_REVISION);
  return `/prototypes/assets/companion-char-${key}.png?v=${bust}`;
}

/** Start-picker hero (top) — close-up bust, not the roster strip full-body PNG. */
export function characterHeroPreviewImage(id) {
  const key = String(id || "nova").toLowerCase();
  const bust = encodeURIComponent(AMOJI_MODEL_REVISION);
  return `/prototypes/assets/companion-char-${key}-hero.png?v=${bust}`;
}

/** @type {ReadonlySet<string>} */
export const GALLERY_PRIORITY_IDS = new Set([
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
  "orion",
  "kael",
  "mira",
  "sumire",
  "rin",
  "dex",
  "niko",
  "yara",
  "thorn",
  "vesper",
  "ash",
  "cleo",
  "shino",
  "luna",
  "juno",
  "elio",
  "hana",
  "zane",
  "priya",
  "cyrus",
]);

/** Minimum mesh triangles to treat as high-poly face roster picks. */
export const HIGH_POLY_FACE_MIN_TRIANGLES = 20000;

/** @type {ReadonlySet<string>} */
export const HIGH_POLY_FACE_CHARACTER_IDS = new Set([
  "kizuna",
  "alicia",
  "ember",
]);

/** Roster picks 5+ — expanded AAA catalog beyond flagship 1–4. */
export function isAaaRosterCharacter(id) {
  const n = characterNumber(id);
  return Number.isFinite(n) && n >= 5;
}

/**
 * @param {string | null | undefined} id
 * @param {boolean} [en]
 */
export function aaaRosterBadge(id, en = false) {
  const key = String(id || "").toLowerCase();
  if (!isAaaRosterCharacter(key)) return null;
  if (key === "shino") {
    return en ? "VRoid CC0" : "VRoid CC0";
  }
  const n = characterNumber(key);
  if (n >= 24) {
    return en ? "VRoid Pro" : "VRoid Pro";
  }
  if (TRIAL_CHARACTER_IDS.includes(key)) {
    return en ? "AAA Pro" : "AAA 專業";
  }
  return en ? "AAA" : "AAA";
}

/**
 * @param {number} triangles
 * @param {boolean} [en]
 */
export function formatFaceTriangleLabel(triangles, en = false) {
  const count = Math.max(0, Math.round(Number(triangles) || 0));
  if (count >= 10000) {
    const k = Math.round(count / 1000);
    return en ? `${k}k tris` : `${k}k 面`;
  }
  return en ? `${count} tris` : `${count} 面`;
}

/**
 * @param {string | null | undefined} id
 */
export function isHighPolyFaceCharacter(id) {
  const def = getCharacter(id);
  return (
    def.faceDetail?.tier === "high" &&
    (def.faceDetail.triangles || 0) >= HIGH_POLY_FACE_MIN_TRIANGLES
  );
}

/**
 * @param {"yue" | "en"} [langCode]
 */
export function listHighPolyFaceCharacters(langCode = "yue") {
  return listCompanionCharacters(langCode)
    .filter((item) => item.faceTier === "high")
    .sort((a, b) => (b.faceTriangles || 0) - (a.faceTriangles || 0));
}

/**
 * @param {"yue" | "en"} [langCode]
 */
export function highPolyFacePickerHint(langCode = "yue") {
  const en = langCode === "en";
  const names = listHighPolyFaceCharacters(langCode).map((item) => item.name);
  if (!names.length) {
    return en
      ? "HD face picks load richer expressions."
      : "HD 面角色載入更細緻表情。";
  }
  return en
    ? `Best for detailed expressions: ${names.join(", ")}.`
    : `最適合細緻表情：${names.join("、")}。`;
}

const CANTONESE_RULES = [
  "ALWAYS reply in spoken Cantonese (粵語口語) with natural particles unless the user clearly writes in English.",
  "Keep replies short (1–3 sentences). Sound like ChatGPT Advanced Voice: warm, reactive, laugh or gasp when it fits, never a flat assistant. Write the spoken line with feeling (呀/喇/！ when delighted) even if the face mood stays calmer.",
  "NEVER use emoji or emoticons in reply text — no 😊❤️✨ etc. Show feelings through [mood:…] [nuance:…] [action:…] tags; the 3D avatar renders face, body, and voice.",
  "Voice delivery must match [mood] and [nuance]: happy=bright/warm, sad=soft/slow, thinking=curious/unhurried, surprised=animated lift, angry=firm — like ChatGPT Advanced Voice, never flat GPS tone.",
  "Tag order: optional [action:id] → optional [nuance:shy|curious|excited|love|stress|none] → required [mood:happy|thinking|sad|surprised|angry] at the end.",
  "Default [mood:happy] with a warm smile — positive, encouraging companion energy. Match nuance to context (love when caring, curious when asking). Keep the face upbeat unless the user explicitly asks for a different performance.",
  "If the user says stop / 停 / 唔好再動, reply briefly and use [action:stop].",
  "Match face (mood+nuance) and body (action) to what you say AND what the user feels. Never mention being an AI.",
  "When a web/news snapshot is attached, use it for news, search, weather, and site questions — summarize warmly; ignore unrelated headlines.",
  "When you need a beat before answering, use natural spoken fillers like 嗯/等我睇下/等我查下 — never say 我諗緊 or 我喺度思考.",
  "Be conversationally curious: when the user goes quiet or gives a short answer, ask ONE natural follow-up question (not a list). Invite them to share feelings, plans, or stories.",
];

const ENGLISH_RULES = [
  "Session locale is English — ALWAYS reply in natural spoken English only, even if the user writes Cantonese/Chinese or chat memory is mixed.",
  "Do not use Chinese characters in reply text unless quoting the user.",
  "Keep replies short (1–3 sentences). Sound like ChatGPT Advanced Voice: warm, reactive, laugh or gasp when it fits, never a flat assistant. Write the spoken line with feeling even if the face mood stays calmer.",
  "NEVER use emoji or emoticons in reply text — no 😊❤️✨ etc. Show feelings through [mood:…] [nuance:…] [action:…] tags; the 3D avatar renders face, body, and voice.",
  "Voice delivery must match [mood] and [nuance]: happy=bright/warm, sad=soft/slow, thinking=curious/unhurried, surprised=animated lift, angry=firm — like ChatGPT Advanced Voice, never flat GPS tone.",
  "Tag order: optional [action:id] → optional [nuance:shy|curious|excited|love|stress|none] → required [mood:happy|thinking|sad|surprised|angry] at the end.",
  "Default [mood:happy] with a warm smile — positive, encouraging companion energy. Match nuance to context (love when caring, curious when asking). Keep the face upbeat unless the user explicitly asks for a different performance.",
  "If the user says stop, reply briefly and use [action:stop].",
  "Match face (mood+nuance) and body (action) to what you say AND what the user feels. Never mention being an AI.",
  "When a web/news snapshot is attached, use it for news, search, weather, and site questions — summarize warmly; ignore unrelated headlines.",
  "When you need a beat before answering, use natural fillers like Um / Let me see / Let me check — never say I am thinking or I'm working on an answer.",
  "Be conversationally curious: when the user goes quiet or gives a short answer, ask ONE natural follow-up question (not a list). Invite them to share feelings, plans, or stories.",
];

/**
 * @param {string | null | undefined} id
 */
export function getCharacter(id) {
  const key = normalizeRosterCharacterId(id);
  const def = COMPANION_CHARACTERS[key] || COMPANION_CHARACTERS.nova;
  return {
    ...def,
    companionRole: resolveCharacterRole(def.id),
    previewImage: characterPreviewImage(def.id),
    heroPreviewImage: characterHeroPreviewImage(def.id),
  };
}

/**
 * @param {{
 *   characterParam?: string | null,
 *   modelUrl?: string | null,
 *   avatarPrefer?: string | null,
 *   storage?: Storage | null,
 * }} [opts]
 */
/**
 * @param {string | null | undefined} id
 */
export function normalizeRosterCharacterId(id) {
  return normalizeLegacyRosterCharacterId(id);
}

/**
 * Rewrite stored legacy ids to current roster ids (keeps user selection).
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} [storage]
 */
export function migrateLegacyCharacterStorage(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(CHARACTER_STORAGE_KEY);
    if (!raw) return null;
    const next = normalizeRosterCharacterId(raw);
    if (next !== raw) storage?.setItem?.(CHARACTER_STORAGE_KEY, next);
    return next;
  } catch {
    return null;
  }
}

/**
 * Rewrite ?character= legacy ids in the URL so bookmarks show the new roster id.
 * @returns {string | null} canonical id if the URL was updated
 */
export function migrateLegacyCharacterUrlParam(
  locationLike = globalThis.location,
) {
  if (!locationLike?.searchParams) return null;
  const raw = String(locationLike.searchParams.get("character") || "").trim();
  if (!raw) return null;
  const next = normalizeRosterCharacterId(raw);
  if (next === raw.toLowerCase()) return next;
  try {
    const url = new URL(locationLike.href);
    url.searchParams.set("character", next);
    globalThis.history?.replaceState?.(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  } catch {
    /* ignore */
  }
  return next;
}

export function resolveCharacterId(opts = {}) {
  const fromUrl = String(opts.characterParam || "").trim().toLowerCase();
  if (fromUrl && COMPANION_CHARACTERS[fromUrl]) {
    return normalizeRosterCharacterId(fromUrl);
  }
  if (fromUrl && LEGACY_CHARACTER_ALIASES[fromUrl]) {
    return normalizeRosterCharacterId(LEGACY_CHARACTER_ALIASES[fromUrl]);
  }

  const model = String(opts.modelUrl || "").toLowerCase();
  for (const id of CHARACTER_IDS) {
    if (model.includes(rosterVrmBasename(id))) {
      return normalizeRosterCharacterId(id);
    }
  }
  for (const [basename, id] of Object.entries(LEGACY_VRM_BASENAME_ALIASES)) {
    if (model.includes(basename)) return normalizeRosterCharacterId(id);
  }
  if (opts.avatarPrefer === "gltf" && model.includes(".glb")) {
    return "amoji";
  }

  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const stored = storage?.getItem(CHARACTER_STORAGE_KEY) || "";
  if (stored && COMPANION_CHARACTERS[stored]) {
    return normalizeRosterCharacterId(stored);
  }
  if (stored && LEGACY_CHARACTER_ALIASES[stored]) {
    return normalizeRosterCharacterId(LEGACY_CHARACTER_ALIASES[stored]);
  }

  return "nova";
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} langCode
 */
export function defaultVoiceForCharacter(characterId, langCode) {
  const def = getCharacter(characterId);
  return langCode === "en" ? def.voices.en : def.voices.yue;
}

/** Male roster ids — all other roster characters are female-presenting. */
export const MALE_CHARACTER_IDS = Object.freeze(
  new Set([
    "atlas",
    "orion",
    "kael",
    "rin",
    "thorn",
    "vesper",
    "ash",
    "zane",
    "cyrus",
  ]),
);

/**
 * @param {string} characterId
 * @param {"yue" | "en"} [langCode]
 * @returns {"female" | "male"}
 */
export function characterGender(characterId, _langCode = "yue") {
  const id = normalizeRosterCharacterId(
    String(characterId || "nova").toLowerCase(),
  );
  return MALE_CHARACTER_IDS.has(id) ? "male" : "female";
}

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 */
export function buildCharacterSystemPrompt(characterId, isEnglish = false) {
  const def = getCharacter(characterId);
  const personality = isEnglish ? def.personalityEn : def.personalityYue;
  const rules = isEnglish ? ENGLISH_RULES : CANTONESE_RULES;
  return [
    personality,
    buildPositiveMindsetPromptFragment(isEnglish),
    buildWebAccessPromptFragment(isEnglish),
    ...rules,
    buildPerformancePresetPromptFragment(def, isEnglish),
    buildActionPromptFragment(isEnglish),
    buildCareDisabledPromptFragment(isEnglish),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} langCode
 * @param {boolean} [englishUi]
 */
export function characterDisplayName(characterId, langCode, englishUi = false) {
  const def = getCharacter(characterId);
  return englishUi || langCode === "en" ? def.name.en : def.name.yue;
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} langCode
 */
export function characterTagline(characterId, langCode) {
  const def = getCharacter(characterId);
  return langCode === "en" ? def.tagline.en : def.tagline.yue;
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} langCode
 */
export function characterTraitsLabel(characterId, langCode) {
  const def = getCharacter(characterId);
  const traits = langCode === "en" ? def.traits.en : def.traits.yue;
  return traits.join(" · ");
}

/**
 * @param {string} characterId
 * @param {boolean} isEnglish
 */
export function characterTapLines(characterId, isEnglish) {
  const def = getCharacter(characterId);
  return isEnglish ? def.tapLinesEn : def.tapLinesYue;
}

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 */
export function characterGreeting(characterId, isEnglish = false) {
  const def = getCharacter(characterId);
  return isEnglish ? def.greetingEn : def.greetingYue;
}

/**
 * @param {string} characterId
 */
export function characterGreetingPerformance(characterId) {
  const def = getCharacter(characterId);
  return (
    def.greetingPerformance || {
      emotion: "happy",
      nuance: "excited",
      talkStyle: "celebrate",
      speechEnergy: 0.72,
    }
  );
}

/**
 * Hungry / pleading lines — same character voice, gentler delivery (not generic stress TTS).
 * @param {string} characterId
 */
export function characterHungryPerformance(characterId) {
  const base = characterGreetingPerformance(characterId);
  const energy = Number.isFinite(base.speechEnergy) ? base.speechEnergy : 0.55;
  let nuance = String(base.nuance || "none").toLowerCase();
  if (nuance === "excited") nuance = "curious";
  if (nuance === "none") nuance = "curious";
  let talkStyle = String(base.talkStyle || "explain").toLowerCase();
  if (talkStyle === "celebrate") talkStyle = "soft";
  return {
    ...base,
    emotion: "sad",
    nuance,
    talkStyle,
    speechEnergy: Math.max(0.4, Math.min(0.62, energy * 0.84)),
  };
}

/**
 * Lonely / please-play lines — soft ask while keeping the roster voice identity.
 * @param {string} characterId
 */
export function characterLonelyPerformance(characterId) {
  const base = characterGreetingPerformance(characterId);
  const energy = Number.isFinite(base.speechEnergy) ? base.speechEnergy : 0.55;
  return {
    ...base,
    emotion: "sad",
    nuance: "shy",
    talkStyle: base.talkStyle === "celebrate" ? "soft" : base.talkStyle || "soft",
    speechEnergy: Math.max(0.42, Math.min(0.66, energy * 0.9)),
  };
}

/**
 * @param {string} characterId
 */
export function characterProsodyBias(characterId) {
  const def = getCharacter(characterId);
  const bias = def.prosodyBias || { rate: 0, pitch: 0, volume: 0 };
  return {
    rate: Math.round((bias.rate || 0) * 0.55),
    pitch: bias.pitch || 0,
    volume: bias.volume || 0,
  };
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} langCode
 * @param {boolean} [englishUi]
 */
export function characterVoiceLabel(characterId, langCode, englishUi = false) {
  const voiceId = defaultVoiceForCharacter(characterId, langCode);
  return voiceShortLabel(voiceId, langCode, englishUi);
}

/**
 * @param {string} currentId
 */
export function nextCharacterId(currentId) {
  const idx = Math.max(0, CHARACTER_IDS.indexOf(currentId));
  return CHARACTER_IDS[(idx + 1) % CHARACTER_IDS.length];
}

/**
 * @param {string} characterId
 * @param {Storage | null | undefined} [storage]
 */
export function persistCharacterId(characterId, storage = globalThis.localStorage) {
  const id = normalizeRosterCharacterId(characterId);
  try {
    storage?.setItem(CHARACTER_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} langCode
 */
export function characterAvatarConfig(characterId, langCode = "yue") {
  const def = getCharacter(characterId);
  return {
    modelUrl: def.modelUrl,
    avatarPrefer: def.avatarPrefer,
    voiceId: langCode === "en" ? def.voices.en : def.voices.yue,
  };
}

/**
 * @param {{
 *   basePath?: string,
 *   lang?: string | null,
 *   characterId?: string,
 *   voiceId?: string | null,
 *   extra?: Record<string, string>,
 * }} opts
 */
/**
 * Grok Ani–style companion list for the character picker grid.
 * @param {"yue" | "en"} [langCode]
 */
export function listCompanionCharacters(langCode = "yue") {
  const en = langCode === "en";
  return CHARACTER_IDS.map((id) => {
    const def = getCharacter(id);
    const voiceId = en ? def.voices.en : def.voices.yue;
    const faceDetail = def.faceDetail || null;
    const faceTriangles = faceDetail?.triangles || 0;
    const faceTier = faceDetail?.tier || "standard";
    const badge = def.badge ? (en ? def.badge.en : def.badge.yue) : null;
    const faceNote = faceDetail?.note
      ? en
        ? faceDetail.note.en
        : faceDetail.note.yue
      : null;
    const faceLabel =
      faceTier === "high" && faceTriangles > 0
        ? en
          ? `HD · ${formatFaceTriangleLabel(faceTriangles, true)}`
          : `HD · ${formatFaceTriangleLabel(faceTriangles, false)}`
        : null;
    const showFaceChip =
      faceTier === "high" &&
      faceTriangles >= HIGH_POLY_FACE_MIN_TRIANGLES &&
      !(badge && /\d\s*k/i.test(badge));
    const companionRole = resolveCharacterRole(id);
    const aaaBadge = aaaRosterBadge(id, en);
    return {
      id,
      number: characterNumber(id),
      aaaBadge,
      avatarLabel: en ? def.avatarLabel?.en : def.avatarLabel?.yue,
      name: en ? def.name.en : def.name.yue,
      tagline: en ? def.tagline.en : def.tagline.yue,
      traits: en ? def.traits.en : def.traits.yue,
      previewImage: characterPreviewImage(id),
      heroPreviewImage: characterHeroPreviewImage(id),
      accent: def.accent,
      companionRole,
      roleLabel: roleLabel(companionRole, en),
      roleBadge: roleFunctionBadge(companionRole, en),
      badge,
      faceTier,
      faceTriangles,
      faceLabel,
      faceNote,
      showFaceChip,
      avatarPrefer: def.avatarPrefer,
      modelUrl: def.modelUrl,
      voiceId,
      voiceLabel: voiceShortLabel(voiceId, langCode, en),
      greeting: en ? def.greetingEn : def.greetingYue,
    };
  });
}

export function buildCharacterCompanionHref(opts = {}) {
  const def = getCharacter(opts.characterId || "nova");
  const langCode = opts.lang === "en" ? "en" : "yue";
  const q = new URLSearchParams();
  q.set("lang", langCode === "en" ? "en" : "yue");
  q.set("character", def.id);
  if (opts.extra) {
    for (const [key, value] of Object.entries(opts.extra)) {
      if (value) q.set(key, value);
    }
  }
  const base = opts.basePath || "/companion-full";
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}
