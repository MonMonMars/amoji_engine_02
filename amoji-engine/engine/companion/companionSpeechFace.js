/**
 * Word / speak-unit driven facial expressions — synced to TTS progress.
 */
import {
  buildVrmExpressionBlend,
  inferContentNuance,
  inferSpeechEnergy,
} from "./companionContentMotion.js";
import { inferExpressionFromText } from "../face/emotionExpression.js";
import { inferTalkGestureFromText } from "../face/talkGestures.js";
import { lipSyncCharWeight } from "./companionViseme.js";

export const COMPANION_SPEECH_FACE_SCHEMA = "amoji.companionSpeechFace.v1";

/**
 * Split spoken text into expression units (CJK char, Latin word, punctuation).
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function tokenizeSpeakUnits(text) {
  const raw = String(text || "");
  /** @type {string[]} */
  const units = [];
  let buf = "";
  const flush = () => {
    const trimmed = buf.trim();
    if (trimmed) units.push(trimmed);
    buf = "";
  };
  for (const ch of raw) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(ch)) {
      flush();
      units.push(ch);
      continue;
    }
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    if (/[.!?。！？,，、:：;…~～]/.test(ch)) {
      flush();
      units.push(ch);
      continue;
    }
    buf += ch;
  }
  flush();
  return units.filter((u) => u.length > 0);
}

/**
 * Score how strongly a unit diverges from the reply baseline.
 * @param {{ emotion?: string, nuance?: string }} unitFace
 * @param {{ emotion?: string, nuance?: string }} base
 */
export function speechFaceUnitScore(unitFace, base = {}) {
  let score = 0;
  const baseEmotion = String(base.emotion || "neutral").toLowerCase();
  const baseNuance = String(base.nuance || "none").toLowerCase();
  const emotion = String(unitFace.emotion || "neutral").toLowerCase();
  const nuance = String(unitFace.nuance || "none").toLowerCase();
  if (emotion !== "neutral" && emotion !== baseEmotion) score += 3;
  if (nuance !== "none" && nuance !== baseNuance) score += 2;
  if (emotion !== "neutral") score += 1;
  return score;
}

/**
 * Infer face mood for one spoken word / character / punctuation mark.
 * @param {string | null | undefined} word
 * @param {{ emotion?: string, nuance?: string }} [baseOpts]
 */
export function analyzeSpeechWord(word, baseOpts = {}) {
  const baseEmotion = String(baseOpts.emotion || "neutral").toLowerCase();
  const baseNuance = String(baseOpts.nuance || "none").toLowerCase();
  const raw = String(word || "").trim();
  if (!raw) {
    return {
      unit: "",
      emotion: baseEmotion,
      nuance: baseNuance,
      talkStyle: inferTalkGestureFromText("", { emotion: baseEmotion }),
      speechEnergy: inferSpeechEnergy("", baseEmotion, baseNuance),
      expressionBlend: buildVrmExpressionBlend(baseEmotion, baseNuance),
    };
  }

  let emotion = inferExpressionFromText(raw);
  let nuance = inferContentNuance(raw);

  if (emotion === "neutral") {
    if (/^[?？]+$/.test(raw)) emotion = "thinking";
    else if (/^[!！]+$/.test(raw)) emotion = "surprised";
    else if (/^[~～]+$/.test(raw)) emotion = "happy";
    else if (/^哈+$|^(hehe|haha|lol|yay|wow|omg)$/i.test(raw)) emotion = "happy";
    else if (/^唉+$|^(sigh|sorry|oops)$/i.test(raw)) emotion = "sad";
    else if (/^(thanks?|thank|ty)$/i.test(raw)) emotion = "happy";
    else if (/^(love|lovely|nice|great|awesome|cool)$/i.test(raw)) emotion = "happy";
    else if (/^(hate|ugh|damn|stupid|idiot)$/i.test(raw)) emotion = "angry";
    else if (/^(hmm|uh+|um+|well|maybe)$/i.test(raw)) emotion = "thinking";
    else if (/^(no|nope|never)$/i.test(raw)) emotion = "sad";
    else if (/^(yes|yeah|yep|sure|ok|okay)$/i.test(raw)) emotion = "happy";
    else emotion = baseEmotion;
  }

  if (nuance === "none") nuance = baseNuance;

  return {
    unit: raw,
    emotion,
    nuance,
    talkStyle: inferTalkGestureFromText(raw, { emotion }),
    speechEnergy: inferSpeechEnergy(raw, emotion, nuance),
    expressionBlend: buildVrmExpressionBlend(emotion, nuance),
  };
}

/**
 * @param {string | null | undefined} text
 * @param {{ emotion?: string, nuance?: string }} [baseOpts]
 */
export function buildSpeechExpressionTimeline(text, baseOpts = {}) {
  const units = tokenizeSpeakUnits(text);
  const weights = units.map((unit) =>
    Array.from(unit).reduce((sum, ch) => sum + lipSyncCharWeight(ch), 0),
  );
  const total = weights.reduce((sum, w) => sum + w, 0) || 1;
  let acc = 0;
  return units.map((unit, index) => {
    const start = acc / total;
    acc += weights[index] || 0;
    const analysis = analyzeSpeechWord(unit, baseOpts);
    return {
      ...analysis,
      index,
      start,
      end: acc / total,
    };
  });
}

/**
 * Face mood for the speak unit currently being voiced.
 * @param {string | null | undefined} text
 * @param {number} progress 0..1
 * @param {{ emotion?: string, nuance?: string }} [baseOpts]
 */
export function expressionAtAudioProgress(text, progress, baseOpts = {}) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const timeline = buildSpeechExpressionTimeline(text, baseOpts);
  if (!timeline.length) {
    return { ...analyzeSpeechWord("", baseOpts), index: 0, progress: p };
  }
  let idx = 0;
  for (let i = 0; i < timeline.length; i += 1) {
    if (timeline[i].start <= p) idx = i;
    else break;
  }
  return { ...timeline[idx], index: idx, progress: p };
}

/**
 * Pick the strongest expression signal inside a lip-sync chunk.
 * @param {string | null | undefined} chunk
 * @param {{ emotion?: string, nuance?: string }} [baseOpts]
 */
export function analyzeSpeechChunkFace(chunk, baseOpts = {}) {
  const raw = String(chunk || "").trim();
  const base = {
    emotion: baseOpts.emotion || "neutral",
    nuance: baseOpts.nuance || "none",
  };
  if (!raw) return analyzeSpeechWord("", base);

  const units = tokenizeSpeakUnits(raw);
  let best = analyzeSpeechWord(raw, base);
  let bestScore = speechFaceUnitScore(best, base);

  for (const unit of units) {
    if (/^[.!?。！？,，、:：;…~～]+$/.test(unit)) continue;
    const candidate = analyzeSpeechWord(unit, base);
    const score = speechFaceUnitScore(candidate, base);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  const boundary = /[.!?。！？,，、:：\uFF01\uFF1F]/.test(raw);
  return {
    ...best,
    boundary,
    gesture: null,
  };
}
