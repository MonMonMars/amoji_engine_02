/**
 * ChatGPT-style expressive TTS prosody for the companion.
 * Maps emotion + nuance + talk style + speech energy + text cues → Edge / browser prosody.
 *
 * Face mood can stay calm on everyday lines. Spoken TTS still performs like
 * ChatGPT Advanced Voice: pitch variation, pace changes, never a GPS narrator.
 */
import { analyzeSpeechChunk, inferContentNuance } from "./companionContentMotion.js";
import { resolveTurnPerformance } from "./companionActionResolve.js";
import { characterProsodyBias } from "./companionCharacterCatalog.js";
import { voiceProfileProsodyBias } from "./companionVoiceProfiles.js";
import { inferExpressionFromText } from "../face/emotionExpression.js";

export const COMPANION_TTS_PROSODY_SCHEMA = "amoji.companionTtsProsody.v3";

/** One natural utterance per line — avoids rushed clause stitching. */
export const CHATGPT_STYLE_TTS = Object.freeze({
  singleUtterance: true,
  expressiveClauses: false,
});

/** Must match client chunkTextForCloudTts — server rejects/truncates above this. */
export const MAX_CLOUD_TTS_CHARS = 480;

/** @typedef {{ rate: string, pitch: string, volume: string }} EdgeProsody */
/** @typedef {{ rate: number, pitch: number, volume: number }} BrowserProsody */

const EMOTION_EDGE_BASE = Object.freeze({
  neutral: { rate: 0, pitch: 24, volume: 8 },
  happy: { rate: 10, pitch: 36, volume: 14 },
  thinking: { rate: -10, pitch: 8, volume: 0 },
  sad: { rate: -16, pitch: -8, volume: -4 },
  surprised: { rate: 14, pitch: 40, volume: 12 },
  angry: { rate: 6, pitch: 0, volume: 8 },
});

const NUANCE_EDGE_DELTA = Object.freeze({
  none: { rate: 0, pitch: 0, volume: 0 },
  shy: { rate: -6, pitch: 6, volume: -6 },
  curious: { rate: 4, pitch: 10, volume: 2 },
  excited: { rate: 8, pitch: 14, volume: 6 },
  love: { rate: 4, pitch: 10, volume: 4 },
  stress: { rate: -6, pitch: -6, volume: -4 },
});

const STYLE_EDGE_DELTA = Object.freeze({
  explain: { rate: 0, pitch: 4, volume: 0 },
  soft: { rate: -6, pitch: 2, volume: -4 },
  question: { rate: 2, pitch: 10, volume: 0 },
  emphasize: { rate: 4, pitch: 6, volume: 2 },
  celebrate: { rate: 6, pitch: 10, volume: 4 },
  wave: { rate: 4, pitch: 8, volume: 2 },
  nod: { rate: 0, pitch: 4, volume: 0 },
  point: { rate: 2, pitch: 6, volume: 0 },
  thinking: { rate: -8, pitch: 0, volume: -4 },
  count: { rate: 0, pitch: 4, volume: 0 },
});

const EMOTION_BROWSER_BASE = Object.freeze({
  neutral: { rate: 1, pitch: 1.12, volume: 1 },
  happy: { rate: 1.05, pitch: 1.22, volume: 1 },
  thinking: { rate: 0.94, pitch: 1.04, volume: 0.96 },
  sad: { rate: 0.9, pitch: 0.94, volume: 0.92 },
  surprised: { rate: 1.06, pitch: 1.24, volume: 1 },
  angry: { rate: 1.02, pitch: 0.98, volume: 1 },
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
    rateBoost += Math.min(6, exclamations * 2);
    pitchBoost += Math.min(14, exclamations * 5);
    volumeBoost += Math.min(8, exclamations * 3);
  }
  if (questions) {
    pitchBoost += Math.min(14, questions * 6);
    rateBoost += Math.min(4, questions * 2);
  }
  if (ellipses) {
    rateBoost -= Math.min(8, ellipses * 4);
    pitchBoost -= Math.min(6, ellipses * 3);
    volumeBoost -= Math.min(4, ellipses * 2);
  }
  if (cantoneseParticles) {
    pitchBoost += Math.min(10, cantoneseParticles * 2);
    rateBoost += Math.min(4, cantoneseParticles * 1);
    volumeBoost += Math.min(4, cantoneseParticles * 1);
  }
  if (raw.length <= 12) {
    rateBoost += 1;
    pitchBoost += 6;
    volumeBoost += 1;
  }
  if (/[～~]/.test(raw)) {
    pitchBoost += 4;
    rateBoost -= 2;
  }

  return { rateBoost, pitchBoost, volumeBoost };
}

/**
 * Infer a spoken-performance emotion from the line.
 * Face mood can stay calm; TTS still lifts when the words are warm.
 * @param {string | null | undefined} text
 * @param {string} [fallback]
 */
export function inferSpeechEmotionFromText(text, fallback = "neutral") {
  const raw = String(text || "").trim();
  if (!raw) return fallback;
  const face = inferExpressionFromText(raw);
  if (face && face !== "neutral") return face;
  if (/哈哈|呵呵|嘻嘻|yay|wow/i.test(raw)) return "happy";
  if (/[!！]/.test(raw)) return "happy";
  if (/哇|嘩/.test(raw)) return "surprised";
  if (/thank|thanks|glad|love you|好開心|鍾意你/i.test(raw)) return "happy";
  if (/^(嗨|哈囉|早晨)([呀啊！!]|$)/.test(raw)) return "happy";
  if (/^(hi|hey|hello)\b/i.test(raw) && /[!！]/.test(raw)) return "happy";
  return fallback;
}

/**
 * OpenAI gpt-4o-mini-tts follows speed best when it is written into instructions.
 * @param {{ emotion?: string, speechEnergy?: number }} [opts]
 */
export function instructSpeakingSpeed(opts = {}) {
  const emotion = String(opts.emotion || "neutral").toLowerCase();
  const energy = Number.isFinite(opts.speechEnergy) ? opts.speechEnergy : 0.68;
  let speed =
    emotion === "happy" || emotion === "surprised"
      ? 1.02
      : emotion === "sad"
        ? 0.94
        : emotion === "thinking"
          ? 0.96
          : emotion === "angry"
            ? 1.01
            : 1;
  speed += (energy - 0.55) * 0.08;
  return Number(Math.max(0.9, Math.min(1.06, speed)).toFixed(2));
}

/**
 * ChatGPT Advanced Voice-style natural-language performance hint.
 * Keep it imperative and include an explicit speed — newer TTS snapshots
 * ignore vague “be expressive” copy.
 * @param {{
 *   emotion?: string,
 *   nuance?: string,
 *   talkStyle?: string,
 *   speechEnergy?: number,
 *   lang?: string,
 *   text?: string,
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
  const speed = instructSpeakingSpeed({ emotion, speechEnergy: energy });

  if (nuance === "none" && emotion === "happy") nuance = "excited";
  if (nuance === "none" && emotion === "surprised") nuance = "excited";
  if (nuance === "none" && emotion === "thinking") nuance = "curious";

  const affect =
    emotion === "happy"
      ? "A close friend on a video call who is genuinely delighted. Smile in the voice. Bright vowels, lifted pitch."
      : emotion === "sad"
        ? "A close friend comforting you. Soft, warm, empathetic — still human, never flat."
        : emotion === "thinking"
          ? "A close friend thinking out loud. Curious, unhurried, with pitch that still moves."
          : emotion === "surprised"
            ? "A close friend gasping with delight. Animated lift on key words."
            : emotion === "angry"
              ? "A close friend who is firm and intense, still human, not shouting."
              : "ChatGPT Advanced Voice: a warm close friend on a video call. Emotionally present even on a simple line.";

  const toneBits = [];
  if (nuance === "excited") toneBits.push("enthusiastic", "smiling");
  if (nuance === "shy") toneBits.push("a little shy", "soft");
  if (nuance === "love") toneBits.push("affectionate");
  if (nuance === "curious") toneBits.push("curious", "engaged");
  if (nuance === "stress") toneBits.push("reassuring");
  if (talkStyle === "celebrate") toneBits.push("celebratory");
  if (talkStyle === "question") toneBits.push("inquisitive, rising last word");
  if (talkStyle === "soft") toneBits.push("tender");
  const tone =
    toneBits.length > 0
      ? toneBits.join(", ")
      : isEnglish
        ? "Friendly, playful, emotionally present"
        : "親切、有感情、好似傾偈";

  const pacing =
    energy > 0.75
      ? `Speak at ${speed}x — normal conversational pace. Lift pitch on exclamations; do not rush.`
      : energy < 0.38
        ? `Speak at ${speed}x — calm and unhurried, still vary pitch naturally.`
        : `Speak at ${speed}x — natural everyday pace, like a friend on a video call.`;

  const emotionLine =
    emotion === "happy"
      ? "Let delight show: pitch lifts, brighter vowels, a tiny laugh if the line is playful."
      : emotion === "sad"
        ? "Quiet empathy. Softer volume on caring phrases. Do not go monotone."
        : emotion === "thinking"
          ? "Pondering. Brief breaths where you consider. Keep the voice alive."
          : emotion === "surprised"
            ? "Delighted surprise. Quick lift, almost a gasp, then recover."
            : emotion === "angry"
              ? "Controlled frustration. Sharper consonants. Not shouting."
              : "Even a greeting must feel alive: pitch moves, warmth in the vowels, never GPS.";

  const pronunciation = isEnglish
    ? "Clear and expressive. Lift questions and exclamations. Stress feeling-words."
    : "咬字清楚。問句尾音上揚。感嘆詞要有活力。粵語口語，唔好似朗讀。";

  const laughs = /哈哈|呵呵|嘻嘻|haha|hehe/i.test(text)
    ? "Play the laugh as a real chuckle, not a spoken word."
    : /哇|嘩|wow/i.test(text)
      ? "Let the gasp/wow land with a pitch jump."
      : "";

  const pauses = /[…\.]{3,}/.test(text)
    ? "Meaningful pause around ellipses."
    : /[!！?？]/.test(text)
      ? "Tiny pause after ! or ? then continue."
      : "Light comma pauses. Do not rush.";

  const delivery = isEnglish
    ? `You are ChatGPT Advanced Voice Mode. React. Never sound like Siri, GPS, a newsreader, or an audiobook.`
    : `你係 ChatGPT Advanced Voice。要有反應。絕對唔好似 Siri、導航、新聞或者朗讀。`;

  return [
    `Voice Affect: ${affect}`,
    `Tone: ${tone}`,
    `Pacing: ${pacing}`,
    `Emotion: ${emotionLine}`,
    `Delivery: ${delivery}`,
    `Pronunciation: ${pronunciation}`,
    `Pauses: ${pauses}`,
    laughs ? `Color: ${laughs}` : "",
    `Never: monotone, robotic, even pitch, announcer cadence.`,
  ]
    .filter(Boolean)
    .join("\n");
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

/**
 * Fill in spoken emotion from the line when the caller left it calm/neutral.
 * Face can stay rest; voice still performs.
 * @param {string | object | null | undefined} performance
 * @param {string} [text]
 */
export function enrichTtsPerformance(performance, text = "") {
  const perf = normalizeTtsPerformance(performance);
  const line = String(text || perf.text || "").trim();
  const inferred = inferSpeechEmotionFromText(line, perf.emotion || "neutral");
  const emotion =
    !perf.emotion || perf.emotion === "neutral" ? inferred : perf.emotion;
  let nuance = String(perf.nuance || "none").toLowerCase();
  if (nuance === "none") {
    const fromText = inferContentNuance(line);
    if (fromText && fromText !== "none") nuance = fromText;
    else if (emotion === "happy" || emotion === "surprised") nuance = "excited";
    else if (emotion === "thinking") nuance = "curious";
  }
  const talkStyle = inferTalkStyleFromEmotion(
    emotion,
    nuance,
    line,
    String(perf.talkStyle || "explain").toLowerCase(),
  );
  const speechEnergy = Math.max(
    0,
    Math.min(
      1,
      perf.speechEnergy ??
        (emotion === "happy" || emotion === "surprised"
          ? 0.62
          : emotion === "thinking"
            ? 0.48
            : emotion === "sad"
              ? 0.44
              : 0.55),
    ),
  );
  return {
    ...perf,
    emotion,
    nuance,
    talkStyle,
    speechEnergy,
    text: line || perf.text,
  };
}

export function resolveCompanionTtsProsody(opts = {}) {
  const enriched = enrichTtsPerformance(opts, opts.text);
  const emotion = enriched.emotion;
  const nuance = enriched.nuance;
  const text = String(opts.text || enriched.text || "");
  const talkStyle = inferTalkStyleFromEmotion(
    emotion,
    nuance,
    text,
    String(enriched.talkStyle || opts.talkStyle || "explain").toLowerCase(),
  );
  const speechEnergy = Math.max(
    0,
    Math.min(1, enriched.speechEnergy ?? (emotion === "happy" ? 0.78 : 0.68)),
  );

  const base =
    EMOTION_EDGE_BASE[emotion] || EMOTION_EDGE_BASE.neutral;
  const nuanceDelta = NUANCE_EDGE_DELTA[nuance] || NUANCE_EDGE_DELTA.none;
  const styleDelta = STYLE_EDGE_DELTA[talkStyle] || STYLE_EDGE_DELTA.explain;
  const textCue = analyzeTextExpressiveness(text);
  const characterBias = characterProsodyBias(String(opts.characterId || ""));
  const voiceBias = voiceProfileProsodyBias(String(opts.voiceId || ""));

  const energyRate = (speechEnergy - 0.5) * 8;
  const energyPitch = (speechEnergy - 0.5) * 14;
  const energyVolume = (speechEnergy - 0.5) * 10;

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
    0.86,
    Math.min(
      1.12,
      browserBase.rate +
        (edgeRate / 100) * 0.18 +
        (speechEnergy - 0.5) * 0.06,
    ),
  );
  const browserPitch = Math.max(
    0.82,
    Math.min(
      1.85,
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
      rate: formatEdgeDelta(edgeRate, "%", -40, 72),
      pitch: formatEdgeDelta(edgePitch, "Hz", -28, 72),
      volume: formatEdgeDelta(edgeVolume, "%", -22, 35),
    },
    browser: {
      rate: Number(browserRate.toFixed(3)),
      pitch: Number(browserPitch.toFixed(3)),
      volume: Number(browserVolume.toFixed(3)),
    },
    speed: instructSpeakingSpeed({ emotion, speechEnergy }),
    instruct: buildTtsInstruct({
      ...opts,
      emotion,
      nuance,
      talkStyle,
      speechEnergy,
      text,
      lang: opts.lang || enriched.lang,
    }),
  };
}

/**
 * Analyze a speech chunk and return full TTS performance profile.
 * @param {string | null | undefined} chunk
 * @param {{ emotion?: string, nuance?: string }} [hints]
 */
/**
 * Full voice performance from raw LLM reply (mood/nuance tags + text cues).
 * Use for TTS — never rely on emoji; tags drive pitch, pace, and cloud instruct.
 * @param {string | null | undefined} rawReply
 * @param {{
 *   userText?: string,
 *   moodHint?: string | null,
 *   lang?: string,
 *   isEnglish?: boolean,
 *   characterId?: string,
 * }} [opts]
 */
export function resolveVoicePerformanceFromReply(rawReply, opts = {}) {
  const turn = resolveTurnPerformance(
    opts.userText || "",
    rawReply,
    opts.moodHint ?? null,
  );
  const lang =
    opts.lang ||
    (opts.isEnglish ? "en" : "yue");
  return enrichTtsPerformance(
    {
      emotion: turn.emotion || "neutral",
      nuance: turn.nuance || "none",
      talkStyle: turn.talkStyle || "explain",
      speechEnergy: turn.speechEnergy ?? 0.68,
      lang,
      characterId: opts.characterId,
      singleUtterance: true,
      expressiveClauses: false,
    },
    turn.reply,
  );
}

/**
 * @param {ReturnType<typeof analyzeSpeechChunk>} analysis
 * @param {{ lang?: string, characterId?: string, isEnglish?: boolean }} [opts]
 */
export function voicePerformanceFromAnalysis(analysis, opts = {}) {
  const lang =
    opts.lang ||
    (opts.isEnglish ? "en" : "yue");
  return enrichTtsPerformance(
    {
      emotion: analysis?.emotion || "neutral",
      nuance: analysis?.nuance || "none",
      talkStyle: analysis?.talkStyle || "explain",
      speechEnergy: analysis?.speechEnergy ?? 0.68,
      lang,
      characterId: opts.characterId,
      singleUtterance: true,
      expressiveClauses: false,
    },
    "",
  );
}

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
    const emotion = performance || fallbackEmotion;
    return {
      emotion,
      nuance:
        emotion === "happy" || emotion === "surprised" ? "excited" : "none",
      talkStyle:
        emotion === "happy" || emotion === "surprised" ? "celebrate" : "explain",
      speechEnergy:
        emotion === "happy" || emotion === "surprised"
          ? 0.62
          : emotion === "thinking"
            ? 0.48
            : 0.55,
    };
  }
  const perf = performance || {};
  const emotion = perf.emotion || fallbackEmotion;
  let nuance = perf.nuance || "none";
  if (nuance === "none" && (emotion === "happy" || emotion === "surprised")) {
    nuance = "excited";
  }
  if (nuance === "none" && emotion === "thinking") nuance = "curious";
  const talkStyle =
    perf.talkStyle ||
    (emotion === "happy" || emotion === "surprised" ? "celebrate" : "explain");
  return {
    emotion,
    nuance,
    talkStyle,
    speechEnergy:
      perf.speechEnergy ??
      (emotion === "happy" || emotion === "surprised" ? 0.62 : 0.55),
    lang: perf.lang,
    text: perf.text,
    /**
     * Speak the full line in one cloud TTS job by default.
     * Clause splitting is opt-in: singleUtterance:false + expressiveClauses:true.
     */
    singleUtterance: perf.singleUtterance !== false,
    expressiveClauses:
      perf.singleUtterance === false && perf.expressiveClauses === true,
  };
}

/**
 * JSON body for POST /api/tts — always includes ChatGPT-style instructions.
 * @param {{
 *   text: string,
 *   performance?: string | object,
 *   voice?: string,
 *   lang?: string,
 *   characterId?: string,
 * }} opts
 */
export function buildCloudTtsRequestBody(opts = {}) {
  const text = String(opts.text || "").trim();
  const pack = resolveCompanionTtsProsody({
    ...enrichTtsPerformance(opts.performance, text),
    text,
    lang: opts.lang,
    characterId: opts.characterId,
    voiceId: opts.voice,
  });
  return {
    text,
    emotion: pack.emotion,
    nuance: pack.nuance,
    talkStyle: pack.talkStyle,
    speechEnergy: pack.speechEnergy,
    voice: opts.voice,
    lang: opts.lang,
    characterId: opts.characterId,
    instructions: pack.instruct,
    speed: pack.speed,
  };
}
