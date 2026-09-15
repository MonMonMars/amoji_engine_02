/**
 * Content-aware companion motion — Grok Ani / ChatGPT-style cues from reply text.
 * Maps mood tags + lexical cues → emotion, nuance, talk style, gestures, VRM blends.
 */
import { inferExpressionFromText } from "../face/emotionExpression.js";
import { inferTalkGestureFromText } from "../face/talkGestures.js";
import { getActionDef } from "./companionActionCatalog.js";
import {
  inferActionFromReply,
  inferActionFromUserText,
  isUserStopCommand,
  parseReplyTags,
  resolveAction,
} from "./companionActionMotion.js";

/**
 * @param {string} text
 */
export function parseReplyMood(text) {
  const parsed = parseReplyTags(text);
  return { reply: parsed.reply, emotion: parsed.emotion };
}

export { isUserStopCommand, inferActionFromUserText, parseReplyTags } from "./companionActionMotion.js";

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
  let energy = 0.55;
  if (emotion === "happy" || emotion === "surprised") energy += 0.22;
  if (emotion === "angry") energy += 0.14;
  if (emotion === "sad" || emotion === "thinking") energy -= 0.14;
  if (nuance === "excited") energy += 0.24;
  if (nuance === "love") energy += 0.1;
  if (nuance === "shy" || nuance === "stress") energy -= 0.12;
  if (/!{1,}|！{1,}/.test(raw)) energy += 0.12;
  if (/[?？]/.test(raw)) energy += 0.06;
  if (/[呀啊喇喎喔呢咩~～]/.test(raw)) energy += 0.08;
  if (raw.length > 80) energy += 0.04;
  return Math.max(0.2, Math.min(1, energy));
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
  let emotion = inferExpressionFromText(raw) || "neutral";
  const nuance = inferContentNuance(raw);
  const talkStyle = inferTalkGestureFromText(raw, { emotion });
  const action = inferActionFromUserText(raw);
  const actionDef = action ? getActionDef(action) : null;
  if (actionDef?.emotion) emotion = actionDef.emotion;
  return {
    emotion,
    nuance,
    talkStyle,
    action,
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
    .replace(/\s*\[action:\w*\]?/i, "")
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
  const actionMatch = String(partialText || "").match(/\[action:(\w+)\]/i);
  const action = actionMatch ? resolveAction(actionMatch[1]) : null;
  return {
    emotion,
    nuance,
    talkStyle,
    action,
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

/** @type {readonly string[]} */
export const THINKING_PHRASES_YUE = Object.freeze([
  "嗯…",
  "等我諗諗…",
  "等陣…",
  "我諗緊點答你…",
  "等我整理下思路…",
  "諗一諗先…",
  "好問題呀，等我諗吓…",
]);

/** @type {readonly string[]} */
export const THINKING_PHRASES_EN = Object.freeze([
  "Hmm…",
  "Let me think…",
  "One moment…",
  "I'm working on an answer…",
  "Give me a sec to think…",
  "That's a good question — hold on…",
  "Still thinking…",
]);

/**
 * @param {boolean} [isEnglish]
 */
export function pickThinkingPhrase(isEnglish = false) {
  const list = isEnglish ? THINKING_PHRASES_EN : THINKING_PHRASES_YUE;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Cycle through thinking fillers without immediate repeats.
 * @param {boolean} [isEnglish]
 * @param {number} [lastIndex]
 */
export function pickNextThinkingPhrase(isEnglish = false, lastIndex = -1) {
  const list = isEnglish ? THINKING_PHRASES_EN : THINKING_PHRASES_YUE;
  if (list.length <= 1) return { phrase: list[0], index: 0 };
  let index = Math.floor(Math.random() * list.length);
  if (index === lastIndex) index = (index + 1) % list.length;
  return { phrase: list[index], index };
}

export function analyzeCompanionReply(text, moodHint = null) {
  const tagged = parseReplyTags(String(text || ""));
  const reply = tagged.reply;
  const emotion =
    tagged.emotion || moodHint || inferExpressionFromText(reply) || "neutral";
  const nuance = inferContentNuance(reply);
  const talkStyle = inferTalkGestureFromText(reply, { emotion });
  const gesture = inferOneShotGesture(reply, emotion, nuance);
  const action = inferActionFromReply(String(text || ""), tagged.action);
  const speechEnergy = inferSpeechEnergy(reply, emotion, nuance);
  const expressionBlend = buildVrmExpressionBlend(emotion, nuance);

  return {
    schema: COMPANION_CONTENT_MOTION_SCHEMA,
    reply,
    emotion,
    nuance,
    talkStyle,
    gesture,
    action,
    speechEnergy,
    expressionBlend,
  };
}
