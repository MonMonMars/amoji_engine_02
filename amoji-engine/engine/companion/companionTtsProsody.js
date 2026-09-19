/**
 * ChatGPT-style expressive TTS prosody for the companion.
 * Maps emotion + nuance + talk style + speech energy + text cues → Edge / browser prosody.
 *
 * Face mood can stay calm on everyday lines. Spoken TTS still performs like
 * ChatGPT Advanced Voice: pitch variation, pace changes, never a GPS narrator.
 */
import {
  analyzeSpeechChunk,
  inferContentNuance,
  inferSpeechEnergy,
} from "./companionContentMotion.js";
import { resolveTurnPerformance } from "./companionActionResolve.js";
import { characterProsodyBias } from "./companionCharacterCatalog.js";
import { voiceProfileProsodyBias } from "./companionVoiceProfiles.js";
import { inferExpressionFromText } from "../face/emotionExpression.js";
import { vocalizationInstructHint } from "./companionVocalizations.js";
import { parseProsodyMarkers } from "../voice/prosodyMarkers.js";
import {
  applyTalkSpeedMultiplier,
  normalizeTalkSpeed,
  slowBrowserRate,
  slowEdgeRatePercent,
  talkSpeedToDisplay,
} from "./companionTalkSpeed.js";

export const COMPANION_TTS_PROSODY_SCHEMA = "amoji.companionTtsProsody.v4";

/**
 * Default delivery — short lines stay one clip; multi-sentence replies auto-split
 * into expressive clauses via resolveTtsDeliveryMode().
 */
export const CHATGPT_STYLE_TTS = Object.freeze({
  singleUtterance: true,
  expressiveClauses: false,
  autoExpressiveClauses: true,
});

/** Must match client chunkTextForCloudTts — server rejects/truncates above this. */
export const MAX_CLOUD_TTS_CHARS = 480;

/** @typedef {{ rate: string, pitch: string, volume: string }} EdgeProsody */
/** @typedef {{ rate: number, pitch: number, volume: number }} BrowserProsody */

const EMOTION_EDGE_BASE = Object.freeze({
  neutral: { rate: -2, pitch: 28, volume: 8 },
  happy: { rate: 6, pitch: 50, volume: 20 },
  thinking: { rate: -20, pitch: 10, volume: -2 },
  sad: { rate: -26, pitch: -16, volume: -8 },
  surprised: { rate: 8, pitch: 54, volume: 18 },
  angry: { rate: 4, pitch: 2, volume: 14 },
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
  neutral: { rate: 0.78, pitch: 1.14, volume: 1 },
  happy: { rate: 0.8, pitch: 1.28, volume: 1 },
  thinking: { rate: 0.72, pitch: 1.06, volume: 0.96 },
  sad: { rate: 0.7, pitch: 0.92, volume: 0.9 },
  surprised: { rate: 0.82, pitch: 1.32, volume: 1 },
  angry: { rate: 0.76, pitch: 1, volume: 1 },
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
  if (/thank|thanks|glad|love you|好開心|鍾意你|開心|興奮|excited|yay/i.test(raw)) {
    return "happy";
  }
  if (/^(嗨|哈囉|早晨)([呀啊！!]|$)/.test(raw)) return "happy";
  if (/^(hi|hey|hello)\b/i.test(raw) && /[!！]/.test(raw)) return "happy";
  if (/唔開心|傷心|sad|sorry|對唔住|miss you|掛住/i.test(raw)) return "sad";
  if (/唔知|諗諗|hmm|let me think|等我諗/i.test(raw)) return "thinking";
  if (/真係|really|seriously|唔係呀|what/i.test(raw) && /[?？!！]/.test(raw)) {
    return "surprised";
  }
  return fallback;
}

/**
 * Count speakable sentences for auto clause-level TTS.
 * @param {string | null | undefined} text
 */
export function countSpeakSentences(text) {
  const clean = String(text || "")
    .trim()
    .replace(/\[\s*(pause|fast|slow|soft|bright|rate)(?:\s*[:=]\s*[0-9.]*)?\s*\]/gi, "");
  if (!clean) return 0;
  const parts = clean
    .split(/(?<=[。！？!?；;\n])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length || 1;
}

/**
 * Auto-enable per-clause expressive TTS for multi-sentence replies.
 * @param {string | null | undefined} text
 * @param {ReturnType<typeof normalizeTtsPerformance>} [perf]
 */
export function resolveTtsDeliveryMode(text, perf = {}) {
  const normalized = normalizeTtsPerformance(perf);
  if (normalized.singleUtterance === false && normalized.expressiveClauses) {
    return normalized;
  }
  if (perf.autoExpressiveClauses === false) {
    return normalized;
  }
  const raw = String(text || perf.text || "").trim();
  const sentenceCount = countSpeakSentences(raw);
  const useExpressive = sentenceCount >= 2 && raw.length >= 10;
  return {
    ...normalized,
    singleUtterance: !useExpressive,
    expressiveClauses: useExpressive,
  };
}

/**
 * OpenAI gpt-4o-mini-tts follows speed best when it is written into instructions.
 * @param {{ emotion?: string, speechEnergy?: number }} [opts]
 */
export function instructSpeakingSpeed(opts = {}) {
  const emotion = String(opts.emotion || "neutral").toLowerCase();
  const energy = Number.isFinite(opts.speechEnergy) ? opts.speechEnergy : 0.68;
  const speedMultiplier = normalizeTalkSpeed(opts.speedMultiplier);
  let speed =
    emotion === "happy" || emotion === "surprised"
      ? 0.78
      : emotion === "sad"
        ? 0.68
        : emotion === "thinking"
          ? 0.72
          : emotion === "angry"
            ? 0.76
            : 0.74;
  speed += (energy - 0.55) * 0.04;
  speed = applyTalkSpeedMultiplier(speed, speedMultiplier);
  return Number(Math.max(0.22, Math.min(0.82, speed)).toFixed(2));
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
  const speedMultiplier = normalizeTalkSpeed(opts.speedMultiplier);
  const speed = instructSpeakingSpeed({ emotion, speechEnergy: energy, speedMultiplier });

  if (nuance === "none" && emotion === "happy") nuance = "excited";
  if (nuance === "none" && emotion === "surprised") nuance = "excited";
  if (nuance === "none" && emotion === "thinking") nuance = "curious";

  const affect =
    emotion === "happy"
      ? "A close friend on a video call who is genuinely delighted — audible smile, bright vowels, playful lift on exclamations."
      : emotion === "sad"
        ? "A close friend comforting you. Soft, warm, empathetic — voice trembles slightly on caring words, never flat."
        : emotion === "thinking"
          ? "A close friend thinking out loud. Curious hums, breath before ideas, pitch that rises when a thought lands."
          : emotion === "surprised"
            ? "A close friend gasping with delight — quick pitch jump, almost breathless, then warm recovery."
            : emotion === "angry"
              ? "A close friend who is firm and intense — sharper consonants, controlled heat, never shouting."
              : "ChatGPT Advanced Voice: a warm close friend on a video call. Emotionally alive on every syllable — never GPS, never newsreader.";

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

  const displaySpeed = talkSpeedToDisplay(speedMultiplier);
  const pacing =
    displaySpeed <= 0.9
      ? isEnglish
        ? `Speak at ${speed}x (${displaySpeed}×) — slower than normal. Relaxed VN/gacha pace. Long breath between phrases and words. Never rush or clip syllables.`
        : `用 ${speed}x（${displaySpeed}×）慢過正常 — 視覺小說節奏，字與字之間留位，句與句之間停一停，絕對唔好急。`
      : displaySpeed <= 1.08
        ? isEnglish
          ? `Speak at ${speed}x (1× normal companion pace). Relaxed VN/gacha rhythm — unhurried, with natural pauses between phrases. Never rush or clip syllables.`
          : `用 ${speed}x（1× 正常同伴節奏）— 視覺小說節奏，放鬆、唔好急，句與句之間留啲位。`
        : displaySpeed <= 1.85
          ? isEnglish
            ? `Speak at ${speed}x (${displaySpeed}×) — a bit quicker than normal, still clear and expressive.`
            : `用 ${speed}x（${displaySpeed}×）— 比正常快少少，仍然清楚有感情。`
          : energy > 0.75
            ? `Speak at ${speed}x (${displaySpeed}×) — warm, lively pace. Lift pitch on exclamations; still clear.`
            : energy < 0.38
              ? `Speak at ${speed}x (${displaySpeed}×) — calm and unhurried, still vary pitch naturally.`
              : `Speak at ${speed}x (${displaySpeed}×) — faster companion pace, like an excited friend on a video call. Never mumble.`;

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

  const vocalHint = vocalizationInstructHint(text);
  const laughs =
    vocalHint ||
    (/哈哈|呵呵|嘻嘻|haha|hehe/i.test(text)
      ? "Play the laugh as a real chuckle, not a spoken word."
      : /哇|嘩|wow/i.test(text)
        ? "Let the gasp/wow land with a pitch jump."
        : /嗯|唔|um+|hmm|呣/i.test(text)
          ? "Natural thinking hum before the sentence — soft filler, not a word."
          : "");

  const pauses = /[…\.]{3,}/.test(text)
    ? "Meaningful pause around ellipses."
    : /[!！?？]/.test(text)
      ? "Tiny pause after ! or ? then continue."
      : "Light comma pauses. Do not rush.";

  const delivery = isEnglish
    ? `You are ChatGPT Advanced Voice Mode. React. Never sound like Siri, GPS, a newsreader, or an audiobook.`
    : `你係 ChatGPT Advanced Voice。要有反應。絕對唔好似 Siri、導航、新聞或者朗讀。`;

  const vocalPrefix = String(opts.vocalPrefix || "").trim();
  const pokeReaction = Boolean(opts.pokeReaction);
  const vocalLead = vocalPrefix
    ? pokeReaction && (opts.vocalization === "giggle" || opts.vocalization === "laugh")
      ? isEnglish
        ? `POKE REACTION: Start with a real ${opts.vocalization} ("${vocalPrefix}") — breathy, playful, cute — SAME voice — then continue the line still smiling and amused. Never spell "haha" or "hehe" as words.`
        : `戳一下：先 genuine ${opts.vocalization === "giggle" ? "嘻嘻" : "哈哈"}（"${vocalPrefix}"）— 俏皮可愛 — 同一個人 — 再講后面句，保持開心笑住。`
      : isEnglish
        ? `Opening: "${vocalPrefix}" as a natural ${opts.vocalization || "soft"} vocal — SAME speaker, SAME voice — then flow seamlessly into the rest without resetting tone or switching persona.`
        : `開頭："${vocalPrefix}" 做自然${opts.vocalization || "軟"}聲 — 同一個人、同一把聲 — 然後順滑接落去，唔好換人換聲。`
    : "";

  const continuity = vocalPrefix
    ? isEnglish
      ? "This entire clip is ONE continuous take from one person. Never sound like two different speakers mid-sentence."
      : "成段音係同一個人一次過錄。絕對唔好講到一半似換咗另一個人。"
    : isEnglish
      ? "Keep one consistent voice identity for the entire clip — same person start to finish."
      : "成段音保持同一把聲、同一個人，由頭到尾一致。";

  return [
    `Voice Affect: ${affect}`,
    `Tone: ${tone}`,
    `Pacing: ${pacing}`,
    `Emotion: ${emotionLine}`,
    `Delivery: ${delivery}`,
    vocalLead,
    `Continuity: ${continuity}`,
    `Pronunciation: ${pronunciation}`,
    `Pauses: ${pauses}`,
    laughs ? `Color: ${laughs}` : "",
    `Never: monotone, robotic, even pitch, announcer cadence, or switching speaker mid-clip.`,
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
      perf.speechEnergy ?? inferSpeechEnergy(line, emotion, nuance),
    ),
  );
  const delivery = resolveTtsDeliveryMode(line || perf.text, {
    ...perf,
    emotion,
    nuance,
    talkStyle,
    speechEnergy,
  });
  return {
    ...perf,
    emotion,
    nuance,
    talkStyle,
    speechEnergy,
    singleUtterance: delivery.singleUtterance,
    expressiveClauses: delivery.expressiveClauses,
    text: line || perf.text,
    vocalPrefix: perf.vocalPrefix,
    vocalization: perf.vocalization,
    skipVocalization: perf.skipVocalization,
    speedMultiplier: normalizeTalkSpeed(perf.speedMultiplier),
    pokeReaction: perf.pokeReaction,
  };
}

export function resolveCompanionTtsProsody(opts = {}) {
  const enriched = enrichTtsPerformance(opts, opts.text);
  const speedMultiplier = normalizeTalkSpeed(
    opts.speedMultiplier ?? enriched.speedMultiplier,
  );
  const emotion = enriched.emotion;
  const nuance = enriched.nuance;
  const rawText = String(opts.text || enriched.text || "");
  const parsedMarkers = parseProsodyMarkers(rawText);
  const text = parsedMarkers.text || rawText;
  const markerOverrides = parsedMarkers.overrides || {};
  const talkStyle = inferTalkStyleFromEmotion(
    emotion,
    nuance,
    text,
    String(enriched.talkStyle || opts.talkStyle || "explain").toLowerCase(),
  );
  let speechEnergy = Math.max(
    0,
    Math.min(1, enriched.speechEnergy ?? (emotion === "happy" ? 0.78 : 0.68)),
  );
  if (markerOverrides.energyMul && markerOverrides.energyMul !== 1) {
    speechEnergy = Math.max(
      0.15,
      Math.min(1.2, speechEnergy * markerOverrides.energyMul),
    );
  }

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

  let edgeRate =
    base.rate +
    nuanceDelta.rate +
    styleDelta.rate +
    textCue.rateBoost +
    energyRate +
    (characterBias.rate || 0) +
    (voiceBias.rate || 0);
  if (markerOverrides.speedMul && markerOverrides.speedMul !== 1) {
    edgeRate = Math.round(edgeRate * markerOverrides.speedMul);
  }
  edgeRate = slowEdgeRatePercent(edgeRate, speedMultiplier);
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
  const browserRate = slowBrowserRate(
    Math.max(
      0.68,
      Math.min(
        0.92,
        browserBase.rate +
          (edgeRate / 100) * 0.14 +
          (speechEnergy - 0.5) * 0.04,
      ),
    ),
    speedMultiplier,
  );
  const browserPitch = Math.max(
    0.82,
    Math.min(
      1.85,
      browserBase.pitch +
        (edgePitch / 40) * 0.22 +
        (speechEnergy - 0.5) * 0.1 +
        (markerOverrides.pitchAdd || 0),
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
    speed: instructSpeakingSpeed({ emotion, speechEnergy, speedMultiplier }),
    speedMultiplier,
    instruct: buildTtsInstruct({
      ...opts,
      emotion,
      nuance,
      talkStyle,
      speechEnergy,
      text,
      lang: opts.lang || enriched.lang,
      speedMultiplier,
      vocalPrefix: opts.vocalPrefix || enriched.vocalPrefix,
      vocalization: opts.vocalization || enriched.vocalization,
      pokeReaction: opts.pokeReaction ?? enriched.pokeReaction,
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
      ...CHATGPT_STYLE_TTS,
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
      ...CHATGPT_STYLE_TTS,
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
    autoExpressiveClauses: perf.autoExpressiveClauses !== false,
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
    speedMultiplier: pack.speedMultiplier,
  };
}
