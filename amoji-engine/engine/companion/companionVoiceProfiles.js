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
 *   samplePath?: string,
 *   prosodyBias?: { rate?: number, pitch?: number, volume?: number },
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
