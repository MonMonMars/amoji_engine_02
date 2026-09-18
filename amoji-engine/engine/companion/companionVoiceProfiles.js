/**
 * Character voice profiles — maps picker/TTS ids to Edge voices + per-persona prosody.
 * Microsoft Edge exposes only 3 zh-HK neural speakers; profiles differentiate timbre feel.
 */
export const COMPANION_VOICE_PROFILES_SCHEMA =
  "amoji.companionVoiceProfiles.v1";

/** @typedef {{
 *   id: string,
 *   edgeVoice: string,
 *   shortLabel: string,
 *   shortLabelEn: string,
 *   lang: string,
 *   gender: "female" | "male",
 *   source: string,
 *   openAiVoice?: string,
 *   samplePath?: string,
 *   prosodyBias?: { rate?: number, pitch?: number, volume?: number },
 *   emotionRank?: number,
 * }} VoiceProfile */

/** @type {ReadonlyArray<VoiceProfile>} */
export const YUE_VOICE_PROFILES = Object.freeze([
  {
    id: "zh-HK-HiuMaanNeural",
    edgeVoice: "zh-HK-HiuMaanNeural",
    shortLabel: "曉曼",
    shortLabelEn: "HiuMaan",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiumaan.mp3",
    prosodyBias: { rate: 0, pitch: 0, volume: 0 },
  },
  {
    id: "zh-HK-HiuGaaiNeural",
    edgeVoice: "zh-HK-HiuGaaiNeural",
    shortLabel: "曉佳",
    shortLabelEn: "HiuGaai",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiugaai.mp3",
    prosodyBias: { rate: 0, pitch: 0, volume: 0 },
  },
  {
    id: "zh-HK-HiuGaaiNeural-idol",
    edgeVoice: "zh-HK-HiuGaaiNeural",
    shortLabel: "曉佳·元氣",
    shortLabelEn: "HiuGaai·idol",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiugaai.mp3",
    prosodyBias: { rate: 12, pitch: 16, volume: 10 },
  },
  {
    id: "zh-HK-HiuMaanNeural-cool",
    edgeVoice: "zh-HK-HiuMaanNeural",
    shortLabel: "曉曼·酷",
    shortLabelEn: "HiuMaan·cool",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiumaan.mp3",
    prosodyBias: { rate: 6, pitch: -4, volume: 4 },
  },
  {
    id: "zh-HK-WanLungNeural",
    edgeVoice: "zh-HK-WanLungNeural",
    shortLabel: "雲龍",
    shortLabelEn: "WanLung",
    lang: "zh-HK",
    gender: "male",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/wanlung.mp3",
    prosodyBias: { rate: 0, pitch: 0, volume: 0 },
  },
  {
    id: "zh-HK-HiuMaanNeural-warm",
    edgeVoice: "zh-HK-HiuMaanNeural",
    shortLabel: "曉曼·溫柔",
    shortLabelEn: "HiuMaan·warm",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiumaan.mp3",
    prosodyBias: { rate: -6, pitch: 8, volume: -2 },
  },
  {
    id: "zh-HK-HiuMaanNeural-bright",
    edgeVoice: "zh-HK-HiuMaanNeural",
    shortLabel: "曉曼·明亮",
    shortLabelEn: "HiuMaan·bright",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiumaan.mp3",
    prosodyBias: { rate: 10, pitch: 14, volume: 8 },
  },
  {
    id: "zh-HK-HiuGaaiNeural-sweet",
    edgeVoice: "zh-HK-HiuGaaiNeural",
    shortLabel: "曉佳·甜美",
    shortLabelEn: "HiuGaai·sweet",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiugaai.mp3",
    prosodyBias: { rate: 4, pitch: 12, volume: 4 },
  },
  {
    id: "zh-HK-HiuGaaiNeural-story",
    edgeVoice: "zh-HK-HiuGaaiNeural",
    shortLabel: "曉佳·敘事",
    shortLabelEn: "HiuGaai·story",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiugaai.mp3",
    prosodyBias: { rate: -4, pitch: 6, volume: 0 },
  },
  {
    id: "zh-HK-WanLungNeural-calm",
    edgeVoice: "zh-HK-WanLungNeural",
    shortLabel: "雲龍·沉穩",
    shortLabelEn: "WanLung·calm",
    lang: "zh-HK",
    gender: "male",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/wanlung.mp3",
    prosodyBias: { rate: -8, pitch: -4, volume: -4 },
  },
  {
    id: "zh-HK-WanLungNeural-bold",
    edgeVoice: "zh-HK-WanLungNeural",
    shortLabel: "雲龍·爽朗",
    shortLabelEn: "WanLung·bold",
    lang: "zh-HK",
    gender: "male",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/wanlung.mp3",
    prosodyBias: { rate: 8, pitch: -2, volume: 6 },
  },
  {
    id: "zh-HK-HiuGaaiNeural-fiery",
    edgeVoice: "zh-HK-HiuGaaiNeural",
    shortLabel: "曉佳·熱情",
    shortLabelEn: "HiuGaai·fiery",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiugaai.mp3",
    prosodyBias: { rate: 14, pitch: 18, volume: 10 },
  },
  {
    id: "zh-HK-HiuMaanNeural-chibi",
    edgeVoice: "zh-HK-HiuMaanNeural",
    shortLabel: "曉曼·Q版",
    shortLabelEn: "HiuMaan·chibi",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiumaan.mp3",
    prosodyBias: { rate: 12, pitch: 20, volume: 8 },
  },
  {
    id: "zh-HK-HiuMaanNeural-hero",
    edgeVoice: "zh-HK-HiuMaanNeural",
    shortLabel: "曉曼·英氣",
    shortLabelEn: "HiuMaan·hero",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiumaan.mp3",
    prosodyBias: { rate: 6, pitch: 4, volume: 6 },
  },
  {
    id: "zh-HK-HiuGaaiNeural-sunny",
    edgeVoice: "zh-HK-HiuGaaiNeural",
    shortLabel: "曉佳·陽光",
    shortLabelEn: "HiuGaai·sunny",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiugaai.mp3",
    prosodyBias: { rate: 10, pitch: 14, volume: 6 },
  },
  {
    id: "zh-HK-HiuGaaiNeural-sporty",
    edgeVoice: "zh-HK-HiuGaaiNeural",
    shortLabel: "曉佳·運動",
    shortLabelEn: "HiuGaai·sporty",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiugaai.mp3",
    prosodyBias: { rate: 8, pitch: 10, volume: 8 },
  },
  {
    id: "zh-HK-HiuMaanNeural-elegant",
    edgeVoice: "zh-HK-HiuMaanNeural",
    shortLabel: "曉曼·優雅",
    shortLabelEn: "HiuMaan·elegant",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiumaan.mp3",
    prosodyBias: { rate: -6, pitch: 6, volume: -2 },
  },
  {
    id: "zh-HK-HiuMaanNeural-sharp",
    edgeVoice: "zh-HK-HiuMaanNeural",
    shortLabel: "曉曼·俐落",
    shortLabelEn: "HiuMaan·sharp",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiumaan.mp3",
    prosodyBias: { rate: 4, pitch: 2, volume: 4 },
  },
  {
    id: "zh-HK-HiuMaanNeural-yuki",
    edgeVoice: "zh-HK-HiuMaanNeural",
    shortLabel: "曉曼·雪",
    shortLabelEn: "HiuMaan·Yuki",
    lang: "zh-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/hiumaan.mp3",
    prosodyBias: { rate: -2, pitch: 10, volume: 0 },
  },
  {
    id: "zh-HK-WanLungNeural-chad",
    edgeVoice: "zh-HK-WanLungNeural",
    shortLabel: "雲龍·哲",
    shortLabelEn: "WanLung·Chad",
    lang: "zh-HK",
    gender: "male",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/wanlung.mp3",
    prosodyBias: { rate: 6, pitch: -2, volume: 4 },
  },
  {
    id: "zh-HK-WanLungNeural-david",
    edgeVoice: "zh-HK-WanLungNeural",
    shortLabel: "雲龍·大衛",
    shortLabelEn: "WanLung·David",
    lang: "zh-HK",
    gender: "male",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/wanlung.mp3",
    prosodyBias: { rate: -8, pitch: -8, volume: -4 },
  },
  {
    id: "zh-HK-WanLungNeural-hugo",
    edgeVoice: "zh-HK-WanLungNeural",
    shortLabel: "雲龍·雨果",
    shortLabelEn: "WanLung·Hugo",
    lang: "zh-HK",
    gender: "male",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/wanlung.mp3",
    prosodyBias: { rate: 8, pitch: 0, volume: 6 },
  },
  {
    id: "zh-HK-WanLungNeural-ren",
    edgeVoice: "zh-HK-WanLungNeural",
    shortLabel: "雲龍·朗",
    shortLabelEn: "WanLung·Ren",
    lang: "zh-HK",
    gender: "male",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/wanlung.mp3",
    prosodyBias: { rate: -4, pitch: -10, volume: -2 },
  },
]);

/** @type {ReadonlyArray<VoiceProfile>} */
export const EN_VOICE_PROFILES = Object.freeze([
  {
    id: "en-US-AriaNeural",
    edgeVoice: "en-US-AriaNeural",
    shortLabel: "Aria",
    shortLabelEn: "Aria",
    lang: "en-US",
    gender: "female",
    source: "Edge TTS",
    prosodyBias: { rate: 0, pitch: 0, volume: 0 },
  },
  {
    id: "en-US-JennyNeural",
    edgeVoice: "en-US-JennyNeural",
    shortLabel: "Jenny",
    shortLabelEn: "Jenny",
    lang: "en-US",
    gender: "female",
    source: "Edge TTS",
    prosodyBias: { rate: 0, pitch: 0, volume: 0 },
  },
  {
    id: "en-HK-YanNeural",
    edgeVoice: "en-HK-YanNeural",
    shortLabel: "Yan",
    shortLabelEn: "Yan",
    lang: "en-HK",
    gender: "female",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/yan-en-hk.mp3",
    prosodyBias: { rate: 4, pitch: 8, volume: 4 },
  },
  {
    id: "en-US-GuyNeural",
    edgeVoice: "en-US-GuyNeural",
    shortLabel: "Guy",
    shortLabelEn: "Guy",
    lang: "en-US",
    gender: "male",
    source: "Edge TTS",
    prosodyBias: { rate: 0, pitch: 0, volume: 0 },
  },
  {
    id: "en-HK-SamNeural",
    edgeVoice: "en-HK-SamNeural",
    shortLabel: "Sam",
    shortLabelEn: "Sam",
    lang: "en-HK",
    gender: "male",
    source: "Edge TTS",
    samplePath: "/prototypes/assets/voice-samples/sam-en-hk.mp3",
    prosodyBias: { rate: 2, pitch: -4, volume: 2 },
  },
  {
    id: "en-US-AriaNeural-cool",
    edgeVoice: "en-US-AriaNeural",
    shortLabel: "Aria·cool",
    shortLabelEn: "Aria·cool",
    lang: "en-US",
    gender: "female",
    source: "Edge TTS",
    prosodyBias: { rate: -4, pitch: -6, volume: 2 },
  },
  {
    id: "openai-coral",
    edgeVoice: "en-US-AriaNeural",
    openAiVoice: "coral",
    shortLabel: "Coral",
    shortLabelEn: "Coral (OpenAI)",
    lang: "en-US",
    gender: "female",
    source: "OpenAI TTS",
    prosodyBias: { rate: 8, pitch: 12, volume: 6 },
    emotionRank: 1,
  },
  {
    id: "openai-marin",
    edgeVoice: "en-US-AriaNeural",
    openAiVoice: "marin",
    shortLabel: "Marin",
    shortLabelEn: "Marin (OpenAI)",
    lang: "en-US",
    gender: "female",
    source: "OpenAI TTS",
    prosodyBias: { rate: 6, pitch: 10, volume: 4 },
    emotionRank: 2,
  },
  {
    id: "openai-shimmer",
    edgeVoice: "en-US-JennyNeural",
    openAiVoice: "shimmer",
    shortLabel: "Shimmer",
    shortLabelEn: "Shimmer (OpenAI)",
    lang: "en-US",
    gender: "female",
    source: "OpenAI TTS",
    prosodyBias: { rate: 10, pitch: 14, volume: 6 },
    emotionRank: 2,
  },
  {
    id: "openai-sage",
    edgeVoice: "en-US-JennyNeural",
    openAiVoice: "sage",
    shortLabel: "Sage",
    shortLabelEn: "Sage (OpenAI)",
    lang: "en-US",
    gender: "female",
    source: "OpenAI TTS",
    prosodyBias: { rate: -2, pitch: 4, volume: 0 },
    emotionRank: 7,
  },
  {
    id: "openai-alloy",
    edgeVoice: "en-US-GuyNeural",
    openAiVoice: "alloy",
    shortLabel: "Alloy",
    shortLabelEn: "Alloy (OpenAI)",
    lang: "en-US",
    gender: "female",
    source: "OpenAI TTS",
    prosodyBias: { rate: 0, pitch: 0, volume: 0 },
    emotionRank: 8,
  },
  {
    id: "openai-ash",
    edgeVoice: "en-US-GuyNeural",
    openAiVoice: "ash",
    shortLabel: "Ash",
    shortLabelEn: "Ash (OpenAI)",
    lang: "en-US",
    gender: "male",
    source: "OpenAI TTS",
    prosodyBias: { rate: 4, pitch: -2, volume: 4 },
    emotionRank: 9,
  },
]);

const ALL_PROFILES = [...YUE_VOICE_PROFILES, ...EN_VOICE_PROFILES];

/**
 * @param {string} voiceProfileId
 */
export function findVoiceProfile(voiceProfileId) {
  const id = String(voiceProfileId || "").trim();
  return ALL_PROFILES.find((p) => p.id === id) || null;
}

/**
 * Edge TTS speaker id (strips persona suffix profiles).
 * @param {string} voiceProfileId
 */
export function resolveEdgeVoiceId(voiceProfileId) {
  const profile = findVoiceProfile(voiceProfileId);
  if (profile) return profile.edgeVoice;
  return String(voiceProfileId || "").trim();
}

/**
 * @param {string} voiceProfileId
 */
export function voiceProfileProsodyBias(voiceProfileId) {
  const profile = findVoiceProfile(voiceProfileId);
  return profile?.prosodyBias || { rate: 0, pitch: 0, volume: 0 };
}

/**
 * @param {"yue" | "en"} langCode
 */
export function voiceProfilesForLang(langCode) {
  return langCode === "en" ? EN_VOICE_PROFILES : YUE_VOICE_PROFILES;
}

/**
 * English voices sorted by emotion expressiveness (OpenAI first when deployed).
 * @param {boolean} [openAiAvailable]
 */
export function rankedEnglishVoicesForEmotion(openAiAvailable = true) {
  const list = [...EN_VOICE_PROFILES];
  return list.sort((a, b) => {
    const aOpenAi = a.source === "OpenAI TTS";
    const bOpenAi = b.source === "OpenAI TTS";
    if (openAiAvailable && aOpenAi !== bOpenAi) return aOpenAi ? -1 : 1;
    return (a.emotionRank ?? 50) - (b.emotionRank ?? 50);
  });
}

/**
 * @param {string} voiceProfileId
 */
export function isOpenAiVoiceProfile(voiceProfileId) {
  const profile = findVoiceProfile(voiceProfileId);
  if (profile?.source === "OpenAI TTS") return true;
  return String(voiceProfileId || "")
    .trim()
    .toLowerCase()
    .startsWith("openai-");
}

/**
 * OpenAI built-in voice id for a profile (openai-coral → coral).
 * @param {string} voiceProfileId
 */
export function resolveOpenAiVoiceFromProfile(voiceProfileId) {
  const profile = findVoiceProfile(voiceProfileId);
  if (profile?.openAiVoice) return profile.openAiVoice;
  const raw = String(voiceProfileId || "")
    .trim()
    .toLowerCase();
  if (raw.startsWith("openai-")) return raw.slice("openai-".length);
  return null;
}
