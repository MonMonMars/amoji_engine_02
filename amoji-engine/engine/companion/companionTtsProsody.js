/**
 * ChatGPT-style expressive TTS prosody for the companion.
 * Maps emotion + nuance + talk style + speech energy + text cues → Edge / browser prosody.
 *
 * OpenAI's gpt-4o-mini-tts uses natural-language instructions for tone; here we translate
 * the same performance intent into Edge TTS rate/pitch/volume and Web Speech API values.
 */
import { analyzeSpeechChunk } from "./companionContentMotion.js";
import { characterProsodyBias } from "./companionCharacterCatalog.js";
import { voiceProfileProsodyBias } from "./companionVoiceProfiles.js";

export const COMPANION_TTS_PROSODY_SCHEMA = "amoji.companionTtsProsody.v1";

/** @typedef {{ rate: string, pitch: string, volume: string }} EdgeProsody */
/** @typedef {{ rate: number, pitch: number, volume: number }} BrowserProsody */

const EMOTION_EDGE_BASE = Object.freeze({
  neutral: { rate: 14, pitch: 18, volume: 6 },
  happy: { rate: 34, pitch: 40, volume: 18 },
  thinking: { rate: -8, pitch: 4, volume: -6 },
  sad: { rate: -16, pitch: -10, volume: -10 },
  surprised: { rate: 40, pitch: 46, volume: 20 },
  angry: { rate: 26, pitch: -4, volume: 14 },
});

const NUANCE_EDGE_DELTA = Object.freeze({
  none: { rate: 0, pitch: 0, volume: 0 },
  shy: { rate: -8, pitch: 6, volume: -10 },
  curious: { rate: 8, pitch: 12, volume: 4 },
  excited: { rate: 18, pitch: 20, volume: 14 },
  love: { rate: 10, pitch: 14, volume: 8 },
  stress: { rate: -8, pitch: -8, volume: -6 },
});

const STYLE_EDGE_DELTA = Object.freeze({
  explain: { rate: 2, pitch: 4, volume: 0 },
  soft: { rate: -8, pitch: 2, volume: -6 },
  question: { rate: 6, pitch: 12, volume: 2 },
  emphasize: { rate: 10, pitch: 8, volume: 6 },
  celebrate: { rate: 14, pitch: 16, volume: 10 },
  wave: { rate: 8, pitch: 10, volume: 4 },
  nod: { rate: 4, pitch: 6, volume: 2 },
  point: { rate: 6, pitch: 8, volume: 4 },
  thinking: { rate: -6, pitch: 0, volume: -8 },
  count: { rate: 4, pitch: 6, volume: 2 },
});

const EMOTION_BROWSER_BASE = Object.freeze({
  neutral: { rate: 1.06, pitch: 1.2, volume: 1 },
  happy: { rate: 1.22, pitch: 1.45, volume: 1 },
  thinking: { rate: 0.86, pitch: 1.02, volume: 0.9 },
  sad: { rate: 0.8, pitch: 0.88, volume: 0.86 },
  surprised: { rate: 1.28, pitch: 1.55, volume: 1 },
  angry: { rate: 1.14, pitch: 0.92, volume: 1 },
});

/**
 * @param {number} value
 * @param {string} unit
 * @param {number} min
 * @param {number} max
 */
function formatEdgeDelta(value, unit, min, max) {
  const clamped = Math.max(min, Math.min(max, Math.round(value)));
  const sign = clamped >= 0 ? "+" : "";
  return `${sign}${clamped}${unit}`;
}

/**
 * @param {string | null | undefined} text
 */
function analyzeTextExpressiveness(text) {
  const raw = String(text || "");
  let rateBoost = 0;
  let pitchBoost = 0;
  let volumeBoost = 0;

  const exclamations = (raw.match(/[!！]/g) || []).length;
  const questions = (raw.match(/[?？]/g) || []).length;
  const ellipses = (raw.match(/…|\.{3,}|⋯/g) || []).length;
  const cantoneseParticles = (raw.match(/[呀啊喇喎喔呢咩]/g) || []).length;

  if (exclamations) {
    rateBoost += Math.min(16, exclamations * 6);
    pitchBoost += Math.min(18, exclamations * 7);
    volumeBoost += Math.min(12, exclamations * 4);
  }
  if (questions) {
    pitchBoost += Math.min(20, questions * 9);
    rateBoost += Math.min(10, questions * 4);
  }
  if (ellipses) {
    rateBoost -= Math.min(10, ellipses * 5);
    pitchBoost -= Math.min(6, ellipses * 3);
    volumeBoost -= Math.min(6, ellipses * 2);
  }
  if (cantoneseParticles) {
    pitchBoost += Math.min(14, cantoneseParticles * 3);
    rateBoost += Math.min(10, cantoneseParticles * 2);
    volumeBoost += Math.min(6, cantoneseParticles * 1.5);
  }
  if (raw.length <= 12) {
    rateBoost += 6;
    pitchBoost += 10;
    volumeBoost += 2;
  }
  if (/[～~]/.test(raw)) {
    pitchBoost += 4;
    rateBoost -= 2;
  }

  return { rateBoost, pitchBoost, volumeBoost };
}

/**
 * ChatGPT-style natural-language performance hint (for instruct-capable TTS backends).
 * @param {{
 *   emotion?: string,
 *   nuance?: string,
 *   talkStyle?: string,
 *   speechEnergy?: number,
 *   lang?: string,
 * }} opts
 */
export function buildTtsInstruct(opts = {}) {
  const emotion = String(opts.emotion || "neutral").toLowerCase();
  const nuance = String(opts.nuance || "none").toLowerCase();
  const talkStyle = String(opts.talkStyle || "explain").toLowerCase();
  const energy = opts.speechEnergy ?? 0.5;
  const lang = String(opts.lang || "yue").toLowerCase();
  const isEnglish = lang === "en" || lang.startsWith("en-");

  const moodBits = [];
  if (emotion === "happy") moodBits.push("warm", "cheerful");
  else if (emotion === "sad") moodBits.push("gentle", "soft", "empathetic");
  else if (emotion === "thinking") moodBits.push("thoughtful", "unhurried");
  else if (emotion === "surprised") moodBits.push("bright", "animated");
  else if (emotion === "angry") moodBits.push("firm", "intense");
  else moodBits.push("natural", "conversational");

  if (nuance === "excited") moodBits.push("energetic", "enthusiastic");
  if (nuance === "shy") moodBits.push("shy", "a little hesitant");
  if (nuance === "love") moodBits.push("affectionate", "caring");
  if (nuance === "curious") moodBits.push("curious", "engaged");
  if (nuance === "stress") moodBits.push("concerned", "reassuring");

  if (talkStyle === "question") moodBits.push("inquisitive rising intonation");
  if (talkStyle === "celebrate") moodBits.push("celebratory");
  if (talkStyle === "soft") moodBits.push("softer delivery");
  if (talkStyle === "emphasize") moodBits.push("emphatic");

  const energyHint =
    energy > 0.72
      ? "lively pacing with expressive intonation"
      : energy < 0.35
        ? "calm, measured pacing"
        : "natural conversational pacing";

  if (isEnglish) {
    return `Speak like a close anime friend in ${emotion} mood. Sound ${moodBits.join(", ")}. Use ${energyHint} — vary pitch on questions and exclamations, never monotone.`;
  }
  return `用親切嘅粵語同朋友傾偈，情緒係${emotion}。語氣要${moodBits.join("、")}，${energyHint}，問句尾音上揚，感嘆要有活力，唔好平平淡淡。`;
}

/**
 * @param {{
 *   emotion?: string,
 *   nuance?: string,
 *   talkStyle?: string,
 *   speechEnergy?: number,
 *   text?: string,
 *   lang?: string,
 *   characterId?: string,
 *   voiceId?: string,
 * }} opts
 */
function inferTalkStyleFromEmotion(emotion, nuance, text, talkStyle) {
  if (talkStyle && talkStyle !== "explain") return talkStyle;
  if (/[?？]/.test(String(text || ""))) return "question";
  if (nuance === "excited" || emotion === "surprised") return "celebrate";
  if (nuance === "shy" || emotion === "sad") return "soft";
  if (emotion === "thinking") return "thinking";
  if (emotion === "happy") return "celebrate";
  if (emotion === "angry") return "emphasize";
  return talkStyle || "explain";
}

export function resolveCompanionTtsProsody(opts = {}) {
  const emotion = String(opts.emotion || "neutral").toLowerCase();
  const nuance = String(opts.nuance || "none").toLowerCase();
  const text = String(opts.text || "");
  const talkStyle = inferTalkStyleFromEmotion(
    emotion,
    nuance,
    text,
    String(opts.talkStyle || "explain").toLowerCase(),
  );
  const speechEnergy = Math.max(0, Math.min(1, opts.speechEnergy ?? 0.64));

  const base =
    EMOTION_EDGE_BASE[emotion] || EMOTION_EDGE_BASE.neutral;
  const nuanceDelta = NUANCE_EDGE_DELTA[nuance] || NUANCE_EDGE_DELTA.none;
  const styleDelta = STYLE_EDGE_DELTA[talkStyle] || STYLE_EDGE_DELTA.explain;
  const textCue = analyzeTextExpressiveness(text);
  const characterBias = characterProsodyBias(String(opts.characterId || ""));
  const voiceBias = voiceProfileProsodyBias(String(opts.voiceId || ""));

  const energyRate = (speechEnergy - 0.5) * 18;
  const energyPitch = (speechEnergy - 0.5) * 16;
  const energyVolume = (speechEnergy - 0.5) * 12;

  const edgeRate =
    base.rate +
    nuanceDelta.rate +
    styleDelta.rate +
    textCue.rateBoost +
    energyRate +
    (characterBias.rate || 0) +
    (voiceBias.rate || 0);
  const edgePitch =
    base.pitch +
    nuanceDelta.pitch +
    styleDelta.pitch +
    textCue.pitchBoost +
    energyPitch +
    (characterBias.pitch || 0) +
    (voiceBias.pitch || 0);
  const edgeVolume =
    base.volume +
    nuanceDelta.volume +
    styleDelta.volume +
    textCue.volumeBoost +
    energyVolume +
    (characterBias.volume || 0) +
    (voiceBias.volume || 0);

  const browserBase =
    EMOTION_BROWSER_BASE[emotion] || EMOTION_BROWSER_BASE.neutral;
  const browserRate = Math.max(
    0.72,
    Math.min(
      1.35,
      browserBase.rate +
        (edgeRate / 100) * 0.35 +
        (speechEnergy - 0.5) * 0.12,
    ),
  );
  const browserPitch = Math.max(
    0.82,
    Math.min(
      1.55,
      browserBase.pitch +
        (edgePitch / 40) * 0.22 +
        (speechEnergy - 0.5) * 0.1,
    ),
  );
  const browserVolume = Math.max(
    0.75,
    Math.min(
      1,
      browserBase.volume +
        edgeVolume / 100 +
        (speechEnergy - 0.5) * 0.08,
    ),
  );

  return {
    schema: COMPANION_TTS_PROSODY_SCHEMA,
    emotion,
    nuance,
    talkStyle,
    speechEnergy,
    edge: {
      rate: formatEdgeDelta(edgeRate, "%", -30, 45),
      pitch: formatEdgeDelta(edgePitch, "Hz", -20, 45),
      volume: formatEdgeDelta(edgeVolume, "%", -25, 25),
    },
    browser: {
      rate: Number(browserRate.toFixed(3)),
      pitch: Number(browserPitch.toFixed(3)),
      volume: Number(browserVolume.toFixed(3)),
    },
    instruct: buildTtsInstruct(opts),
  };
}

/**
 * Analyze a speech chunk and return full TTS performance profile.
 * @param {string | null | undefined} chunk
 * @param {{ emotion?: string, nuance?: string }} [hints]
 */
export function resolveChunkTtsPerformance(chunk, hints = {}) {
  const analysis = analyzeSpeechChunk(chunk, hints);
  const prosody = resolveCompanionTtsProsody({
    emotion: analysis.emotion,
    nuance: analysis.nuance,
    talkStyle: analysis.talkStyle,
    speechEnergy: analysis.speechEnergy,
    text: chunk,
    characterId: hints.characterId,
    lang: hints.lang,
  });
  return {
    ...analysis,
    prosody,
  };
}

/**
 * Normalize speak performance args — accepts legacy emotion string or full profile.
 * @param {string | { emotion?: string, nuance?: string, talkStyle?: string, speechEnergy?: number, lang?: string, text?: string }} [performance]
 * @param {string} [fallbackEmotion]
 */
export function normalizeTtsPerformance(performance, fallbackEmotion = "neutral") {
  if (typeof performance === "string") {
    return {
      emotion: performance || fallbackEmotion,
      nuance: "none",
      talkStyle: "explain",
      speechEnergy: 0.64,
    };
  }
  const perf = performance || {};
  return {
    emotion: perf.emotion || fallbackEmotion,
    nuance: perf.nuance || "none",
    talkStyle: perf.talkStyle || "explain",
    speechEnergy: perf.speechEnergy ?? 0.64,
    lang: perf.lang,
    text: perf.text,
  };
}
