/**
 * Map SenseVoice / robot emotion labels onto Sakura Face Live expression presets.
 */
import {
  SAKURA_EXPRESSION_CYCLE,
  SAKURA_EXPRESSION_PRESETS,
} from "./sakuraFaceLiveClient.js";

export const EMOTION_EXPRESSION_SCHEMA = "amoji.emotionExpression.v1";

/** @type {Record<string, keyof typeof SAKURA_EXPRESSION_PRESETS>} */
const EMOTION_ALIASES = Object.freeze({
  neutral: "neutral",
  calm: "neutral",
  idle: "neutral",
  happy: "happy",
  joy: "happy",
  cheerful: "happy",
  laughing: "happy",
  laughter: "happy",
  thinking: "thinking",
  curious: "thinking",
  confused: "thinking",
  sad: "sad",
  sorrow: "sad",
  cry: "sad",
  surprised: "surprised",
  surprise: "surprised",
  shocked: "surprised",
  angry: "angry",
  anger: "angry",
  mad: "angry",
  fearful: "surprised",
  fear: "surprised",
  disgusted: "angry",
  disgust: "angry",
});

/**
 * @param {string | null | undefined} emotion
 * @param {{ fallback?: keyof typeof SAKURA_EXPRESSION_PRESETS }} [opts]
 * @returns {keyof typeof SAKURA_EXPRESSION_PRESETS}
 */
export function mapEmotionToExpression(emotion, opts = {}) {
  const fallback = opts.fallback || "neutral";
  const key = String(emotion || "")
    .trim()
    .toLowerCase();
  if (!key) return fallback;
  if (SAKURA_EXPRESSION_PRESETS[key]) return key;
  return EMOTION_ALIASES[key] || fallback;
}

/**
 * @param {string | null | undefined} emotion
 */
export function expressionParamsForEmotion(emotion) {
  const name = mapEmotionToExpression(emotion);
  return {
    schema: EMOTION_EXPRESSION_SCHEMA,
    expression: name,
    parameters: (SAKURA_EXPRESSION_PRESETS[name] || SAKURA_EXPRESSION_PRESETS.neutral).map(
      (p) => ({ ...p }),
    ),
  };
}

/**
 * Keyword heuristics for Cantonese/English emotion cues in transcripts.
 * Mirrors TS `inferExpressionFromText` in `src/face-live/expressions.ts`.
 * @param {string | null | undefined} text
 * @returns {keyof typeof SAKURA_EXPRESSION_PRESETS}
 */
export function inferExpressionFromText(text) {
  const raw = String(text || "");
  const lower = raw.toLowerCase();
  // Order matters: check sad/thinking before generic punctuation surprises.
  if (/唉|唔開心|傷心|sorry|sad|慘|好難過/.test(lower)) return "sad";
  if (/諗|思考|點解|why|hmm|唔知|好奇|原來/.test(lower)) return "thinking";
  if (
    /哈哈|開心|好呀|正|掂|thank|thanks|great|鍾意|愛你|心動|超正/.test(lower)
  ) {
    return "happy";
  }
  if (/嬲|生氣|angry|mad|憎|烦|好烦/.test(lower)) return "angry";
  if (/哇|嘩|唔信|真係|嚇死/.test(raw) || /!{2,}|！{2,}/.test(raw)) {
    return "surprised";
  }
  return "neutral";
}

/**
 * Prefer an explicit SER/robot emotion label; otherwise infer from text.
 * @param {{ emotion?: string | null, text?: string | null, fallback?: string }} [input]
 */
export function resolveExpressionFromTurn(input = {}) {
  const emotionKey = String(input.emotion || "")
    .trim()
    .toLowerCase();
  if (
    emotionKey &&
    (SAKURA_EXPRESSION_PRESETS[emotionKey] || EMOTION_ALIASES[emotionKey])
  ) {
    return {
      expression: mapEmotionToExpression(emotionKey),
      source: "emotion",
    };
  }
  if (input.text) {
    return {
      expression: inferExpressionFromText(input.text),
      source: "text",
    };
  }
  return {
    expression: mapEmotionToExpression(input.fallback || "neutral"),
    source: "default",
  };
}

/**
 * @param {string | null | undefined} current
 * @returns {keyof typeof SAKURA_EXPRESSION_PRESETS}
 */
export function nextExpressionPreset(current) {
  const cur = mapEmotionToExpression(current);
  const idx = SAKURA_EXPRESSION_CYCLE.indexOf(cur);
  const next = SAKURA_EXPRESSION_CYCLE[(idx + 1) % SAKURA_EXPRESSION_CYCLE.length];
  return next;
}

/**
 * @returns {string[]}
 */
export function listExpressionPresets() {
  return SAKURA_EXPRESSION_CYCLE.slice();
}
