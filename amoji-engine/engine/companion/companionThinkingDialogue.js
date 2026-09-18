/**
 * Natural thinking / loading fillers — how people actually pause while waiting.
 * Avoid meta lines like "I am thinking" or "I'm working on an answer".
 */
export const COMPANION_THINKING_DIALOGUE_SCHEMA = "amoji.companionThinkingDialogue.v1";

/** @type {readonly string[]} */
export const THINKING_PHRASES_YUE = Object.freeze([
  "嗯…",
  "唔…",
  "等我睇下…",
  "等我諗下…",
  "等我查下…",
  "等我上網搵下…",
  "等陣…",
  "好啦，嗯…",
  "嗯…等我睇吓先…",
]);

/** @type {readonly string[]} */
export const THINKING_PHRASES_EN = Object.freeze([
  "Um…",
  "Hmm…",
  "Let me see…",
  "Let me think…",
  "Let me check…",
  "Let me look that up…",
  "Let me search online…",
  "One sec…",
  "Give me a moment…",
  "Okay, um…",
]);

/** Lines that already sound like a natural pause — skip extra vocal prefix. */
export const NATURAL_FILLER_RE =
  /^(um+|uh+|hmm+|嗯+|唔+|let me (think|see|check|look|search)|give me a (sec|moment)|one sec|hang on|okay,? um|等我|let me look that up|let me search online)/i;

/** Meta / robotic thinking lines we never speak. */
export const ROBOTIC_THINKING_RE =
  /\b(i'?m thinking|i am thinking|still thinking|working on an answer|processing your request)\b/i;

/**
 * @param {string | null | undefined} text
 */
export function isNaturalFillerPhrase(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (ROBOTIC_THINKING_RE.test(raw)) return false;
  if (NATURAL_FILLER_RE.test(raw)) return true;
  if (raw.length <= 16 && /^(嗯|唔|um|uh|hmm|let me|等我)/i.test(raw)) return true;
  return false;
}

/**
 * @param {boolean} [isEnglish]
 */
export function pickThinkingPhrase(isEnglish = false) {
  const list = isEnglish ? THINKING_PHRASES_EN : THINKING_PHRASES_YUE;
  return list[Math.floor(Math.random() * list.length)];
}

/**
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
