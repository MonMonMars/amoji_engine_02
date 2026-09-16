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
  neutral: { rate: 18, pitch: 22, volume: 8 },
  happy: { rate: 52, pitch: 58, volume: 26 },
  thinking: { rate: -10, pitch: 6, volume: -4 },
  sad: { rate: -24, pitch: -16, volume: -10 },
  surprised: { rate: 58, pitch: 62, volume: 28 },
  angry: { rate: 36, pitch: -2, volume: 20 },
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
  happy: { rate: 1.28, pitch: 1.55, volume: 1 },
  thinking: { rate: 0.86, pitch: 1.02, volume: 0.9 },
  sad: { rate: 0.78, pitch: 0.86, volume: 0.86 },
  surprised: { rate: 1.34, pitch: 1.62, volume: 1 },
  angry: { rate: 1.16, pitch: 0.92, volume: 1 },
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
  let nuance = String(opts.nuance || "none").toLowerCase();
  const talkStyle = String(opts.talkStyle || "explain").toLowerCase();
  const text = String(opts.text || "");
  const energy = opts.speechEnergy ?? 0.68;
  const lang = String(opts.lang || "yue").toLowerCase();
  const isEnglish = lang === "en" || lang.startsWith("en-");

  if (nuance === "none" && emotion === "happy") nuance = "excited";
  if (nuance === "none" && emotion === "surprised") nuance = "excited";
  if (nuance === "none" && emotion === "thinking") nuance = "curious";

  const affect =
    emotion === "happy"
      ? "Bright, warm, and very playful — like ChatGPT Advanced Voice: a close friend who is genuinely delighted."
      : emotion === "sad"
        ? "Soft, gentle, and empathetic — caring without sounding flat or robotic."
        : emotion === "thinking"
          ? "Thoughtful and unhurried, with quiet curiosity."
          : emotion === "surprised"
            ? "Animated and bright, with lifted energy on key words — almost a gasp of delight."
            : emotion === "angry"
              ? "Firm and intense, but still human and controlled."
              : "Natural, relaxed, and conversational — never monotone.";

  const toneBits = [];
  if (nuance === "excited") toneBits.push("enthusiastic", "smiling voice");
  if (nuance === "shy") toneBits.push("a little shy", "soft edges");
  if (nuance === "love") toneBits.push("affectionate", "caring");
  if (nuance === "curious") toneBits.push("curious", "engaged");
  if (nuance === "stress") toneBits.push("reassuring", "steady");
  if (talkStyle === "celebrate") toneBits.push("celebratory");
  if (talkStyle === "question") toneBits.push("inquisitive");
  if (talkStyle === "soft") toneBits.push("tender");
  const tone =
    toneBits.length > 0
      ? toneBits.join(", ")
      : isEnglish
        ? "Friendly and emotionally present"
        : "親切、有感情";

  const pacing =
    energy > 0.75
      ? "Lively and expressive; speed up slightly on exclamations."
      : energy < 0.38
        ? "Slow, calm, and measured."
        : "Natural conversational pacing with light variation.";

  const emotionLine =
    emotion === "happy"
      ? "Genuine warmth and delight — let happiness show in pitch lifts and brighter vowels."
      : emotion === "sad"
        ? "Quiet empathy; slightly slower with softer volume on sympathetic phrases."
        : emotion === "thinking"
          ? "Curious pondering; brief pauses where the character is considering."
          : emotion === "surprised"
            ? "Delighted surprise; quick lift on reactions."
            : emotion === "angry"
              ? "Controlled frustration; sharper consonants, not shouting."
              : "Neutral but engaged — still sound human, not a GPS voice.";

  const pronunciation = isEnglish
    ? "Clear and expressive. Lift pitch on questions and exclamations; emphasize emotional words."
    : "咬字清楚，問句尾音上揚，感嘆詞要有活力，唔好平平淡淡。";

  const pauses = /[…\.]{3,}/.test(text)
    ? "Use meaningful pauses around ellipses; let suspense breathe."
    : /[!！?？]/.test(text)
      ? "Brief pause after exclamations or questions before continuing."
      : "Light pauses at commas; don't rush through the line.";

  return [
    `Voice Affect: ${affect}`,
    `Tone: ${tone}`,
    `Pacing: ${pacing}`,
    `Emotion: ${emotionLine}`,
    `Pronunciation: ${pronunciation}`,
    `Pauses: ${pauses}`,
  ].join("\n\n");
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
  let nuance = String(opts.nuance || "none").toLowerCase();
  const text = String(opts.text || "");
  if (nuance === "none" && emotion === "happy") nuance = "excited";
  if (nuance === "none" && emotion === "surprised") nuance = "excited";
  const talkStyle = inferTalkStyleFromEmotion(
    emotion,
    nuance,
    text,
    String(opts.talkStyle || "explain").toLowerCase(),
  );
  const speechEnergy = Math.max(
    0,
    Math.min(1, opts.speechEnergy ?? (emotion === "happy" ? 0.78 : 0.68)),
  );

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
    instruct: buildTtsInstruct({
      ...opts,
      emotion,
      nuance,
      talkStyle,
      speechEnergy,
      text,
    }),
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
    /** Multi-clause Edge TTS by default (holdSpeaking keeps playback continuous). */
    expressiveClauses: perf.expressiveClauses === true,
    singleUtterance:
      perf.singleUtterance === true ||
      (perf.expressiveClauses !== true && perf.singleUtterance !== false),
  };
}
