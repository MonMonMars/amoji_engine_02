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
