/**
 * Word / speak-unit driven facial expressions — synced to TTS progress.
 * Timeline is built once per utterance (visual novel / gacha style word hits).
 */
import {
  buildVrmExpressionBlend,
  inferContentNuance,
  inferSpeechEnergy,
} from "./companionContentMotion.js";
import { inferExpressionFromText } from "../face/emotionExpression.js";
import { inferTalkGestureFromText } from "../face/talkGestures.js";
import { lipSyncCharWeight } from "./companionViseme.js";

export const COMPANION_SPEECH_FACE_SCHEMA = "amoji.companionSpeechFace.v2";

const SPEECH_FACE_CACHE = new Map();
const SPEECH_FACE_CACHE_MAX = 72;

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
 * How fast the avatar should snap expression on this spoken unit (0..1).
 * Punctuation and high-emotion words snap like VN / Live2D line hits.
 * @param {string | null | undefined} unit
 * @param {{ emotion?: string, nuance?: string }} [face]
 * @param {{ emotion?: string, nuance?: string }} [base]
 */
export function speechFaceSnapStrength(unit, face = {}, base = {}) {
  const raw = String(unit || "").trim();
  if (!raw) return 0;
  if (/^[~～]+$/.test(raw)) return 0.82;
  if (/^[!！]+$/.test(raw)) return 0.92;
  if (/^[?？]+$/.test(raw)) return 0.78;
  if (/^[.!?。！？]+$/.test(raw)) return 0.88;
  if (/^[,，、:：;…]+$/.test(raw)) return 0.55;
  const score = speechFaceUnitScore(face, base);
  if (score >= 4) return 0.9;
  if (score >= 3) return 0.72;
  if (score >= 2) return 0.58;
  if (/^哈+$|^(hehe|haha|lol|yay|wow|omg)$/i.test(raw)) return 0.85;
  if (/^(love|thanks?|sorry|yes|yeah|no|nope)$/i.test(raw)) return 0.68;
  return 0.28;
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
  const baseEmotion = String(baseOpts.emotion || "neutral").toLowerCase();
  const baseNuance = String(baseOpts.nuance || "none").toLowerCase();
  return units.map((unit, index) => {
    const start = acc / total;
    acc += weights[index] || 0;
    const analysis = analyzeSpeechWord(unit, baseOpts);
    const snapStrength = speechFaceSnapStrength(unit, analysis, {
      emotion: baseEmotion,
      nuance: baseNuance,
    });
    return {
      ...analysis,
      index,
      start,
      end: acc / total,
      snapStrength,
    };
  });
}

/**
 * Cache expression timelines per utterance + baseline mood.
 * @param {string | null | undefined} text
 * @param {{ emotion?: string, nuance?: string }} [baseOpts]
 */
export function buildSpeechExpressionTimelineCached(text, baseOpts = {}) {
  const key = `${String(text || "")}::${baseOpts.emotion || "neutral"}::${baseOpts.nuance || "none"}`;
  if (SPEECH_FACE_CACHE.has(key)) return SPEECH_FACE_CACHE.get(key);
  const timeline = buildSpeechExpressionTimeline(text, baseOpts);
  if (SPEECH_FACE_CACHE.size >= SPEECH_FACE_CACHE_MAX) {
    const first = SPEECH_FACE_CACHE.keys().next().value;
    SPEECH_FACE_CACHE.delete(first);
  }
  SPEECH_FACE_CACHE.set(key, timeline);
  return timeline;
}

/**
 * Face mood for the speak unit at playback progress using a prebuilt timeline.
 * @param {ReturnType<typeof buildSpeechExpressionTimeline>} timeline
 * @param {number} progress 0..1
 */
export function expressionAtTimelineProgress(timeline, progress) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  if (!timeline?.length) {
    return { ...analyzeSpeechWord(""), index: 0, progress: p, snapStrength: 0 };
  }
  let idx = 0;
  for (let i = 0; i < timeline.length; i += 1) {
    if (timeline[i].start <= p) idx = i;
    else break;
  }
  return { ...timeline[idx], index: idx, progress: p };
}

/**
 * Face mood for the speak unit currently being voiced.
 * @param {string | null | undefined} text
 * @param {number} progress 0..1
 * @param {{ emotion?: string, nuance?: string }} [baseOpts]
 */
export function expressionAtAudioProgress(text, progress, baseOpts = {}) {
  const timeline = buildSpeechExpressionTimelineCached(text, baseOpts);
  return expressionAtTimelineProgress(timeline, progress);
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
    snapStrength: speechFaceSnapStrength(best.unit || raw, best, base),
    gesture: null,
  };
}
