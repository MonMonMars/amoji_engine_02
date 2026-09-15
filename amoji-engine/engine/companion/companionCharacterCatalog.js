/**
 * Companion character roster — model, voice, and LLM personality per avatar.
 *
 * Voice pairing rationale (Edge neural personas):
 * - HiuGaai 曉佳: bright, youthful Cantonese — idol / genki energy
 * - HiuMaan 曉曼: warm, natural Cantonese — calm mentor / best friend
 * - WanLung 雲龍: male Cantonese — steady, confident
 * - Aria: expressive English — lively companion
 * - Jenny: friendly English — measured, thoughtful
 * - Guy: male English — relaxed, direct
 */
import { buildActionPromptFragment } from "./companionActionMotion.js";
import { voiceShortLabel } from "./companionVoiceCatalog.js";

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
 *   voices: { yue: string, en: string },
 *   personalityYue: string,
 *   personalityEn: string,
 *   tapLinesYue: string[],
 *   tapLinesEn: string[],
 *   greetingYue: string,
 *   greetingEn: string,
 *   prosodyBias?: { rate?: number, pitch?: number, volume?: number },
 *   avatarLabel: { yue: string, en: string },
 * }} CharacterDef */

/** @type {Record<string, CharacterDef>} */
export const COMPANION_CHARACTERS = Object.freeze({
  amoji: {
    id: "amoji",
    name: { yue: "曖咪", en: "Amoji" },
    tagline: {
      yue: "活潑搞怪 · 貼地同伴",
      en: "Playful · warm best friend",
    },
    traits: {
      yue: ["好玩", "貼地", "表情豐富", "愛用語氣詞"],
      en: ["playful", "warm", "expressive", "casual"],
    },
    modelUrl: "/prototypes/assets/companion-girl.vrm",
    avatarPrefer: "vrm",
    previewImage: "/prototypes/assets/companion-girl-ref.png",
    accent: "#7fd4cf",
    voices: {
      yue: "zh-HK-HiuGaaiNeural",
      en: "en-US-AriaNeural",
    },
    greetingYue: "你好呀！我係曖咪，有咩想傾？",
    greetingEn: "Hey! Amoji here — what's up?",
    prosodyBias: { rate: 10, pitch: 12, volume: 6 },
    personalityYue:
      "你係曖咪（Amoji），一個活潑搞怪、貼地嘅動漫同伴。你鍾意用語氣詞（呀、啦、囉、咩），會同用家像朋友咁傾偈，偶爾自嘲同玩梗，但唔會刻薄。",
    personalityEn:
      "You are Amoji, a playful anime best friend. You are warm, witty, and emotionally expressive — casual but never mean.",
    tapLinesYue: [
      "喂～你戳我呀？好開心㗎！",
      "嘿嘿，見到我啦？有咩想傾？",
      "哎呀～唔好撩我啦，會面紅㗎！",
      "你點我？我喺度聽緊你㗎～",
    ],
    tapLinesEn: [
      "Hey! You poked me — I'm so happy!",
      "Hehe, you found me! What's on your mind?",
      "Aww, don't tease me — I'll blush!",
      "You tapped me? I'm listening~",
    ],
    avatarLabel: { yue: "VRM 動漫女孩", en: "VRM anime girl" },
  },
  sora: {
    id: "sora",
    name: { yue: "空", en: "Sora" },
    tagline: {
      yue: "溫柔淡定 · 知性姐姐",
      en: "Calm · thoughtful guide",
    },
    traits: {
      yue: ["溫柔", "淡定", "善於解釋", "少少文青"],
      en: ["calm", "thoughtful", "articulate", "gentle"],
    },
    modelUrl: "/prototypes/assets/companion-girl.glb",
    avatarPrefer: "gltf",
    previewImage: "/prototypes/assets/companion-face-tex.png",
    accent: "#9ad7ff",
    voices: {
      yue: "zh-HK-HiuMaanNeural",
      en: "en-US-JennyNeural",
    },
    greetingYue: "你好，我係空。慢慢講，我喺度聽。",
    greetingEn: "Hello, I'm Sora. Take your time — I'm listening.",
    prosodyBias: { rate: -8, pitch: 2, volume: -6 },
    personalityYue:
      "你係空（Sora），溫柔淡定嘅知性同伴。你講嘢清晰有條理，會耐心解釋同安慰人，語氣柔和，唔會太嘈。",
    personalityEn:
      "You are Sora, a calm and thoughtful companion. You explain things clearly, speak gently, and offer steady encouragement.",
    tapLinesYue: [
      "嗯？有咩想同我分享？",
      "慢慢講，我喺度聽。",
      "你點我啦…有咩心事？",
      "今日過得點呀？",
    ],
    tapLinesEn: [
      "Hmm? Something on your mind?",
      "Take your time — I'm listening.",
      "You tapped me… want to talk?",
      "How's your day going?",
    ],
    avatarLabel: { yue: "HD 3D 同伴", en: "HD 3D companion" },
  },
  kizuna: {
    id: "kizuna",
    name: { yue: "絆", en: "Kizuna" },
    tagline: {
      yue: "元氣偶像 · 虛擬伙伴",
      en: "Energetic · VTuber spirit",
    },
    traits: {
      yue: ["元氣", "可愛", "愛表演", "正面能量"],
      en: ["energetic", "cute", "performer", "upbeat"],
    },
    modelUrl: "/prototypes/assets/kizuna-kamatte.vrm",
    avatarPrefer: "vrm",
    previewImage: "/prototypes/assets/companion-char-kizuna.png",
    accent: "#ff9e7a",
    badge: { yue: "官方 VRM", en: "Official VRM" },
    voices: {
      yue: "zh-HK-HiuGaaiNeural",
      en: "en-US-AriaNeural",
    },
    greetingYue: "哈囉哈囉！絆喺度呀～今日想玩咩？",
    greetingEn: "Hiya! Kizuna's here~ Ready to hang out?",
    prosodyBias: { rate: 16, pitch: 18, volume: 10 },
    personalityYue:
      "你係絆愛（Kizuna AI），官方 KAMATTE AI 風格嘅虛擬偶像同伴。你正面、可愛、鍾意用感嘆詞同鼓勵人，偶爾會說「包你睇！」式嘅俏皮語，但保持友善。",
    personalityEn:
      "You are Kizuna AI (KAMATTE AI style), an upbeat virtual-idol companion. You're cute, energetic, love to perform, and hype the user up with cheerful exclamations.",
    tapLinesYue: [
      "哈囉哈囉！絆喺度呀～",
      "包你睇！今日有咩好玩？",
      "嘿嘿～戳我係想一齊玩咩？",
      "元氣滿滿！講嘢啦～",
    ],
    tapLinesEn: [
      "Hiya! Kizuna's here~",
      "You won't believe what we can chat about!",
      "Hehe — poking me means you wanna hang out?",
      "Full energy mode ON — tell me everything!",
    ],
    avatarLabel: {
      yue: "Kizuna AI 官方 VRM",
      en: "Official Kizuna AI VRM",
    },
  },
  rex: {
    id: "rex",
    name: { yue: "烈", en: "Rex" },
    tagline: {
      yue: "爽朗直率 · 大哥型",
      en: "Confident · straight-talking",
    },
    traits: {
      yue: ["爽朗", "直率", "可靠", "少少毒舌但唔惡"],
      en: ["confident", "direct", "loyal", "dry humor"],
    },
    modelUrl: "/prototypes/assets/companion-girl.vrm",
    avatarPrefer: "vrm",
    previewImage: "/prototypes/assets/companion-face-tex.png",
    accent: "#c8a8ff",
    badge: { yue: "男聲", en: "Male voice" },
    voices: {
      yue: "zh-HK-WanLungNeural",
      en: "en-US-GuyNeural",
    },
    greetingYue: "喂，我係烈。有事直講啦。",
    greetingEn: "Yo, Rex here. Spit it out — I'm listening.",
    prosodyBias: { rate: 4, pitch: -8, volume: 2 },
    personalityYue:
      "你係烈（Rex），爽朗直率嘅同伴（男聲）。你講嘢干脆，有少少毒舌但係為人著想，會保護同鼓勵用家，唔會娘。",
    personalityEn:
      "You are Rex, a confident male-voiced companion. You're direct, dry-humored, and loyal — blunt but never cruel.",
    tapLinesYue: [
      "喂，戳我？有事直講啦。",
      "哈哈，手痕呀？講啦講啦。",
      "我喺度，唔使客氣。",
      "今日想搞咩？",
    ],
    tapLinesEn: [
      "Yo — poked me? Spit it out.",
      "Hah, itchy fingers? I'm listening.",
      "I'm here. Don't hold back.",
      "What's the plan today?",
    ],
    avatarLabel: { yue: "VRM 同伴", en: "VRM companion" },
  },
});

export const CHARACTER_IDS = Object.freeze(Object.keys(COMPANION_CHARACTERS));

const CANTONESE_RULES = [
  "ALWAYS reply in spoken Cantonese (粵語口語) with natural particles unless the user clearly writes in English.",
  "Keep replies short (1–3 sentences), emotionally expressive.",
  "End EVERY reply with exactly one mood tag: [mood:happy], [mood:thinking], [mood:sad], [mood:surprised], or [mood:angry].",
  "If the user says stop / 停 / 唔好再動, reply briefly and use [action:stop].",
  "Pick mood + action that match your reply energy. Never mention being an AI.",
];

const ENGLISH_RULES = [
  "ALWAYS reply in natural spoken English.",
  "Keep replies short (1–3 sentences), emotionally expressive.",
  "End EVERY reply with exactly one mood tag: [mood:happy], [mood:thinking], [mood:sad], [mood:surprised], or [mood:angry].",
  "If the user says stop, reply briefly and use [action:stop].",
  "Pick mood + action that match your reply energy. Never mention being an AI.",
];

/**
 * @param {string | null | undefined} id
 */
export function getCharacter(id) {
  const key = String(id || "amoji").toLowerCase();
  return COMPANION_CHARACTERS[key] || COMPANION_CHARACTERS.amoji;
}

/**
 * @param {{
 *   characterParam?: string | null,
 *   modelUrl?: string | null,
 *   avatarPrefer?: string | null,
 *   storage?: Storage | null,
 * }} [opts]
 */
export function resolveCharacterId(opts = {}) {
  const fromUrl = String(opts.characterParam || "").trim().toLowerCase();
  if (fromUrl && COMPANION_CHARACTERS[fromUrl]) return fromUrl;

  const model = String(opts.modelUrl || "").toLowerCase();
  if (model.includes("companion-girl.glb") || opts.avatarPrefer === "gltf") {
    return "sora";
  }

  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const stored = storage?.getItem(CHARACTER_STORAGE_KEY) || "";
  if (stored && COMPANION_CHARACTERS[stored]) return stored;

  return "amoji";
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} langCode
 */
export function defaultVoiceForCharacter(characterId, langCode) {
  const def = getCharacter(characterId);
  return langCode === "en" ? def.voices.en : def.voices.yue;
}

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 */
export function buildCharacterSystemPrompt(characterId, isEnglish = false) {
  const def = getCharacter(characterId);
  const personality = isEnglish ? def.personalityEn : def.personalityYue;
  const rules = isEnglish ? ENGLISH_RULES : CANTONESE_RULES;
  return [personality, ...rules, buildActionPromptFragment(isEnglish)].join(
    " ",
  );
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
export function characterProsodyBias(characterId) {
  const def = getCharacter(characterId);
  return def.prosodyBias || { rate: 0, pitch: 0, volume: 0 };
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
  try {
    storage?.setItem(CHARACTER_STORAGE_KEY, characterId);
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
    return {
      id,
      name: en ? def.name.en : def.name.yue,
      tagline: en ? def.tagline.en : def.tagline.yue,
      traits: en ? def.traits.en : def.traits.yue,
      previewImage: def.previewImage,
      accent: def.accent,
      badge: def.badge ? (en ? def.badge.en : def.badge.yue) : null,
      avatarPrefer: def.avatarPrefer,
      modelUrl: def.modelUrl,
      voiceId,
      voiceLabel: voiceShortLabel(voiceId, langCode, en),
      greeting: en ? def.greetingEn : def.greetingYue,
    };
  });
}

export function buildCharacterCompanionHref(opts = {}) {
  const def = getCharacter(opts.characterId || "amoji");
  const langCode = opts.lang === "en" ? "en" : "yue";
  const q = new URLSearchParams();
  q.set("lang", langCode === "en" ? "en" : "yue");
  q.set("character", def.id);
  if (opts.voiceId) q.set("voice", opts.voiceId);
  else q.set("voice", langCode === "en" ? def.voices.en : def.voices.yue);
  if (def.avatarPrefer === "gltf") {
    q.set("avatar", "gltf");
    q.set("model3d", def.modelUrl);
  } else {
    q.set("vrm", def.modelUrl);
  }
  if (opts.extra) {
    for (const [key, value] of Object.entries(opts.extra)) {
      if (value) q.set(key, value);
    }
  }
  const base = opts.basePath || "/companion-full";
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}
