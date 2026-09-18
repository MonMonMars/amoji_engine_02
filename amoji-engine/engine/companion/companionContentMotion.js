/**
 * Content-aware companion motion — Grok Ani / ChatGPT-style cues from reply text.
 * Maps mood tags + lexical cues → emotion, nuance, talk style, gestures, VRM blends.
 */
import { inferExpressionFromText } from "../face/emotionExpression.js";
import { inferTalkGestureFromText } from "../face/talkGestures.js";
import { analyzeSpeechChunkFace } from "./companionSpeechFace.js";
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

export {
  formatReplyForDisplay,
  isUserStopCommand,
  inferActionFromUserText,
  parseReplyTags,
  stripEmojiFromText,
} from "./companionActionMotion.js";

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
  if (/愛你|鍾意你|想你|miss you|love you/.test(lower)) return "love";
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
  let energy = 0.78;
  if (emotion === "happy" || emotion === "surprised") energy += 0.14;
  if (emotion === "angry") energy += 0.12;
  if (emotion === "sad") energy -= 0.16;
  if (emotion === "thinking") energy -= 0.08;
  if (nuance === "excited") energy += 0.16;
  if (nuance === "love") energy += 0.1;
  if (nuance === "shy" || nuance === "stress") energy -= 0.1;
  if (/!{1,}|！{1,}/.test(raw)) energy += 0.12;
  if (/[?？]/.test(raw)) energy += 0.08;
  if (/[呀啊喇喎喔呢咩~～哈哈呵]/.test(raw)) energy += 0.1;
  if (raw.length > 80) energy += 0.04;
  return Math.max(0.32, Math.min(1, energy));
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
      blend.Happy = 0.72;
      break;
    case "thinking":
      // Pensive brow — avoids Relaxed/Surprised presets that droop lids or drop the jaw.
      blend.Sad = 0.2;
      break;
    case "sad":
      blend.Sad = 0.68;
      break;
    case "surprised":
      blend.Surprised = 0.52;
      blend.Happy = 0.28;
      break;
    case "angry":
      blend.Angry = 0.75;
      break;
    default:
      break;
  }

  switch (n) {
    case "shy":
      blend.Happy = Math.min(blend.Happy ?? 0.28, 0.28);
      blend.Sad = Math.max(blend.Sad ?? 0, 0.14);
      break;
    case "love":
      blend.Happy = Math.max(blend.Happy ?? 0.48, 0.56);
      break;
    case "curious":
      if (e !== "thinking") {
        blend.Surprised = Math.max(blend.Surprised ?? 0, 0.18);
      }
      blend.Happy = Math.max(blend.Happy ?? 0, e === "happy" ? 0 : 0.16);
      break;
    case "excited":
      blend.Happy = Math.max(blend.Happy ?? 0.52, 0.64);
      break;
    case "stress":
      blend.Sad = Math.max(blend.Sad ?? 0, 0.3);
      blend.Angry = Math.max(blend.Angry ?? 0, 0.16);
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
  const raw = String(partialText || "");
  const tagged = parseReplyTags(raw);
  const visible = tagged.reply.trim();
  if (!visible && !tagged.emotion) {
    return {
      emotion: "thinking",
      nuance: "none",
      talkStyle: "thinking",
      expressionBlend: buildVrmExpressionBlend("thinking", "none"),
      speechEnergy: 0.28,
    };
  }
  const emotion =
    tagged.emotion ||
    inferExpressionFromText(visible) ||
    "thinking";
  const nuance = tagged.nuance || inferContentNuance(visible);
  const talkStyle = inferTalkGestureFromText(visible, { emotion });
  const action = tagged.action || null;
  return {
    emotion,
    nuance,
    talkStyle,
    action,
    expressionBlend: buildVrmExpressionBlend(emotion, nuance),
    speechEnergy: inferSpeechEnergy(visible, emotion, nuance),
  };
}

/**
 * Per speech-chunk analysis for continuous motion while talking.
 * @param {string | null | undefined} chunk
 * @param {{ emotion?: string, nuance?: string }} [opts]
 */
export function analyzeSpeechChunk(chunk, opts = {}) {
  const raw = String(chunk || "").trim();
  const face = analyzeSpeechChunkFace(raw, {
    emotion: opts.emotion || "neutral",
    nuance: opts.nuance || "none",
  });
  const emotion = face.emotion || opts.emotion || "neutral";
  const nuance = face.nuance || opts.nuance || "none";
  const talkStyle = face.talkStyle || inferTalkGestureFromText(raw, { emotion });
  const boundary =
    face.boundary ?? /[.!?。！？,，、:：\uFF01\uFF1F]/.test(raw);
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
    unit: face.unit,
    speechEnergy: face.speechEnergy ?? inferSpeechEnergy(raw, emotion, nuance),
    expressionBlend:
      face.expressionBlend ?? buildVrmExpressionBlend(emotion, nuance),
  };
}

export {
  THINKING_PHRASES_EN,
  THINKING_PHRASES_YUE,
  pickNextThinkingPhrase,
  pickThinkingPhrase,
} from "./companionThinkingDialogue.js";

/**
 * Default body move when the LLM tags mood/nuance but omits [action:…].
 * @param {string | null | undefined} emotion
 * @param {string | null | undefined} [nuance]
 */
export function inferActionFromEmotion(emotion, nuance = "none") {
  const e = String(emotion || "neutral").toLowerCase();
  const n = String(nuance || "none").toLowerCase();
  if (n === "love") return "fingerheart";
  if (n === "shy") return "shy";
  if (n === "excited") return "celebrate";
  if (n === "stress") return "thinking";
  switch (e) {
    case "happy":
      return "nod";
    case "sad":
      return "hug";
    case "thinking":
      return "thinking";
    case "surprised":
      return "jump";
    case "angry":
      return "angry";
    default:
      return null;
  }
}

export function analyzeCompanionReply(text, moodHint = null) {
  const tagged = parseReplyTags(String(text || ""));
  const reply = tagged.reply;
  const inferred = inferExpressionFromText(reply);
  const inferredMood = inferred && inferred !== "neutral" ? inferred : null;
  const emotion = tagged.emotion || inferredMood || moodHint || "neutral";
  const nuance = tagged.nuance || inferContentNuance(reply);
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
