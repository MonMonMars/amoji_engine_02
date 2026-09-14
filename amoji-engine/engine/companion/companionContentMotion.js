/**
 * Content-aware companion motion — Grok Ani / ChatGPT-style cues from reply text.
 * Maps mood tags + lexical cues → emotion, nuance, talk style, gestures, VRM blends.
 */
import { inferExpressionFromText } from "../face/emotionExpression.js";
import { inferTalkGestureFromText } from "../face/talkGestures.js";

/**
 * @param {string} text
 */
export function parseReplyMood(text) {
  const raw = String(text || "").trim();
  const moodMatch = raw.match(/\s*\[mood:(\w+)\]\s*$/i);
  if (moodMatch) {
    const parsedEmotion = moodMatch[1].toLowerCase();
    const reply = raw.replace(/\s*\[mood:\w+\]\s*$/i, "").trim();
    return { reply, emotion: parsedEmotion };
  }
  return { reply: raw, emotion: null };
}

export const COMPANION_CONTENT_MOTION_SCHEMA = "amoji.companionContentMotion.v1";

/** Grok Ani–style nuance labels (subset mapped to VRM-safe motion). */
export const CONTENT_NUANCES = Object.freeze([
  "none",
  "shy",
  "curious",
  "excited",
  "love",
  "stress",
]);

/**
 * @param {string | null | undefined} text
 * @returns {string}
 */
export function inferContentNuance(text) {
  const raw = String(text || "");
  const lower = raw.toLowerCase();
  if (/害羞|面紅| blush|embarrass|唔好意思咁/.test(lower)) return "shy";
  if (/愛你|鍾意你|想你|miss you|love you|💕|❤/.test(lower)) return "love";
  if (/好奇|想知道|interesting|curious|咁嘅|原來/.test(lower)) return "curious";
  if (/緊張|擔心|stress|anxious|worried|唔安/.test(lower)) return "stress";
  if (/超正|好兴奋|amazing|awesome|哇|嘩|yay|！{2,}|!{2,}/.test(raw)) {
    return "excited";
  }
  return "none";
}

/**
 * @param {string | null | undefined} text
 * @param {string} emotion
 * @param {string} nuance
 * @returns {string | null}
 */
export function inferOneShotGesture(text, emotion, nuance) {
  const lower = String(text || "").toLowerCase();
  if (/呢個|呢度|嗰個|睇下|this|that|here|there|look/.test(lower)) {
    return "point";
  }
  if (
    /^(係|係呀|冇錯|啱|exactly|right|ok|okay|好呀|好嘅)[.!?。！？?~，,]*$/i.test(
      String(text || "").trim(),
    )
  ) {
    return "nod";
  }
  if (/拜拜|再見|bye|hello|早晨|hi\b/.test(lower)) {
    return "nod";
  }
  if (nuance === "shy" || nuance === "love") return "nod";
  if (emotion === "happy" && /哈哈|hehe|呵呵/.test(lower)) return "nod";
  return null;
}

/**
 * @param {number} text
 * @param {string} emotion
 * @param {string} nuance
 */
export function inferSpeechEnergy(text, emotion, nuance) {
  const raw = String(text || "");
  let energy = 0.42;
  if (emotion === "happy" || emotion === "surprised") energy += 0.18;
  if (emotion === "angry") energy += 0.12;
  if (emotion === "sad" || emotion === "thinking") energy -= 0.12;
  if (nuance === "excited") energy += 0.22;
  if (nuance === "shy" || nuance === "stress") energy -= 0.1;
  if (/!{1,}|！{1,}/.test(raw)) energy += 0.08;
  if (raw.length > 80) energy += 0.05;
  return Math.max(0.15, Math.min(1, energy));
}

/**
 * VRM expression preset weights (preset name → 0..1).
 * @param {string} emotion
 * @param {string} nuance
 * @returns {Record<string, number>}
 */
export function buildVrmExpressionBlend(emotion, nuance) {
  const e = String(emotion || "neutral").toLowerCase();
  const n = String(nuance || "none").toLowerCase();

  /** @type {Record<string, number>} */
  const blend = {};

  switch (e) {
    case "happy":
      blend.Happy = 0.82;
      blend.Relaxed = 0.22;
      break;
    case "thinking":
      blend.Relaxed = 0.48;
      break;
    case "sad":
      blend.Sad = 0.78;
      blend.Relaxed = 0.12;
      break;
    case "surprised":
      blend.Surprised = 0.88;
      break;
    case "angry":
      blend.Angry = 0.78;
      break;
    default:
      break;
  }

  switch (n) {
    case "shy":
      blend.Happy = Math.min(blend.Happy ?? 0.35, 0.42);
      blend.Relaxed = Math.max(blend.Relaxed ?? 0.35, 0.55);
      break;
    case "love":
      blend.Happy = Math.max(blend.Happy ?? 0.7, 0.72);
      blend.Relaxed = Math.max(blend.Relaxed ?? 0.25, 0.38);
      break;
    case "curious":
      blend.Relaxed = Math.max(blend.Relaxed ?? 0.4, 0.52);
      break;
    case "excited":
      blend.Happy = Math.max(blend.Happy ?? 0.75, 0.88);
      blend.Surprised = Math.max(blend.Surprised ?? 0, 0.18);
      break;
    case "stress":
      blend.Sad = Math.max(blend.Sad ?? 0, 0.22);
      blend.Angry = Math.max(blend.Angry ?? 0, 0.15);
      blend.Relaxed = Math.max(blend.Relaxed ?? 0, 0.2);
      break;
    default:
      break;
  }

  return blend;
}

/**
 * Analyze assistant reply for avatar + voice performance.
 * @param {string | null | undefined} text
 * @param {string | null | undefined} [moodHint]
 */
/**
 * Infer how the companion should feel while replying to this user message.
 * @param {string | null | undefined} text
 * @param {boolean} [isEnglish]
 */
export function analyzeUserInput(text, isEnglish = false) {
  const raw = String(text || "").trim();
  const emotion = inferExpressionFromText(raw) || "neutral";
  const nuance = inferContentNuance(raw);
  const talkStyle = inferTalkGestureFromText(raw, { emotion });
  return {
    emotion,
    nuance,
    talkStyle,
    expressionBlend: buildVrmExpressionBlend(emotion, nuance),
    speechEnergy: inferSpeechEnergy(raw, emotion, nuance),
  };
}

/**
 * Incremental analysis while LLM tokens stream in (before mood tag is complete).
 * @param {string | null | undefined} partialText
 */
export function analyzeStreamingReply(partialText) {
  const visible = String(partialText || "")
    .replace(/\s*\[mood:\w*\]?/i, "")
    .trim();
  if (!visible) {
    return {
      emotion: "thinking",
      nuance: "none",
      talkStyle: "thinking",
      expressionBlend: buildVrmExpressionBlend("thinking", "none"),
      speechEnergy: 0.28,
    };
  }
  const parsed = parseReplyMood(visible);
  const emotion =
    parsed.emotion || inferExpressionFromText(parsed.reply) || "thinking";
  const nuance = inferContentNuance(parsed.reply);
  const talkStyle = inferTalkGestureFromText(parsed.reply, { emotion });
  return {
    emotion,
    nuance,
    talkStyle,
    expressionBlend: buildVrmExpressionBlend(emotion, nuance),
    speechEnergy: inferSpeechEnergy(parsed.reply, emotion, nuance),
  };
}

/**
 * Per speech-chunk analysis for continuous motion while talking.
 * @param {string | null | undefined} chunk
 * @param {{ emotion?: string, nuance?: string }} [opts]
 */
export function analyzeSpeechChunk(chunk, opts = {}) {
  const raw = String(chunk || "").trim();
  const emotion = opts.emotion || inferExpressionFromText(raw) || "neutral";
  const nuance = opts.nuance || inferContentNuance(raw);
  const talkStyle = inferTalkGestureFromText(raw, { emotion });
  const boundary = /[.!?。！？,，、:：\uFF01\uFF1F]/.test(raw);
  const gesture =
    boundary && /[.!?。！？\uFF01\uFF1F]/.test(raw)
      ? inferOneShotGesture(raw, emotion, nuance)
      : null;
  return {
    emotion,
    nuance,
    talkStyle,
    gesture,
    boundary,
    speechEnergy: inferSpeechEnergy(raw, emotion, nuance),
    expressionBlend: buildVrmExpressionBlend(emotion, nuance),
  };
}

/**
 * @param {boolean} [isEnglish]
 */
export function pickThinkingPhrase(isEnglish = false) {
  const yue = ["嗯…", "等我諗諗…", "咁呀…", "讓我想想…"];
  const en = ["Hmm…", "Let me think…", "Okay…", "One moment…"];
  const list = isEnglish ? en : yue;
  return list[Math.floor(Math.random() * list.length)];
}

export function analyzeCompanionReply(text, moodHint = null) {
  const parsed = parseReplyMood(String(text || ""));
  const reply = parsed.reply;
  const tagged = parsed.emotion || moodHint || null;
  const inferred = inferExpressionFromText(reply);
  const emotion = tagged || inferred || "neutral";
  const nuance = inferContentNuance(reply);
  const talkStyle = inferTalkGestureFromText(reply, { emotion });
  const gesture = inferOneShotGesture(reply, emotion, nuance);
  const speechEnergy = inferSpeechEnergy(reply, emotion, nuance);
  const expressionBlend = buildVrmExpressionBlend(emotion, nuance);

  return {
    schema: COMPANION_CONTENT_MOTION_SCHEMA,
    reply,
    emotion,
    nuance,
    talkStyle,
    gesture,
    speechEnergy,
    expressionBlend,
  };
}
