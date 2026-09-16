/**
 * Phase A — stream TTS helpers: strip mood tags and emit speakable sentence chunks
 * as LLM tokens arrive (Grok / ChatGPT-style low latency).
 */

import { stripUiIntentTags } from "./companionUiIntentTags.js";

export const COMPANION_STREAM_SPEAK_SCHEMA = "amoji.companionStreamSpeak.v1";

const MOOD_TAG_RE = /\s*\[mood:\w+\]\s*$/i;
const PARTIAL_MOOD_RE = /\s*\[mood:\w*$/i;
const ACTION_TAG_RE = /\s*\[action:\w+\]\s*/gi;
const PARTIAL_ACTION_RE = /\s*\[action:\w*$/i;
const SENTENCE_END_RE = /[.!?。！？\n\uFF01\uFF1F]/;
const SOFT_BREAK_RE = /[,，、;；:：]/;

/**
 * @param {string | null | undefined} text
 */
export function stripMoodTagForSpeak(text) {
  return String(text || "")
    .replace(MOOD_TAG_RE, "")
    .replace(PARTIAL_MOOD_RE, "")
    .trim();
}

/**
 * Strip LLM performance tags so TTS offset tracking matches visible reply text.
 * @param {string | null | undefined} text
 */
export function stripReplyTagsForSpeak(text) {
  return stripMoodTagForSpeak(
    stripUiIntentTags(String(text || ""))
      .replace(ACTION_TAG_RE, " ")
      .replace(PARTIAL_ACTION_RE, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} chunk
 * @param {number} [minLen]
 */
export function isSpeakableChunk(chunk, minLen = 4) {
  const clean = String(chunk || "").replace(/\s+/g, " ").trim();
  return clean.length >= minLen;
}

/**
 * Stateful planner — call `feed(fullText)` on each streamed token update.
 */
export function createStreamSpeakPlanner(opts = {}) {
  const minLen = opts.minLen ?? 4;
  const maxHold = opts.maxHoldChars ?? 42;
  let spokenOffset = 0;

  const reset = () => {
    spokenOffset = 0;
  };

  /**
   * @param {string | null | undefined} fullRaw
   * @returns {string[]}
   */
  const feed = (fullRaw) => {
    const full = stripReplyTagsForSpeak(fullRaw);
    if (full.length <= spokenOffset) return [];

    const slice = full.slice(spokenOffset);
    /** @type {string[]} */
    const segments = [];
    let buf = "";

    for (const ch of slice) {
      buf += ch;
      const trimmed = buf.trim();
      const atEnd = SENTENCE_END_RE.test(ch);
      const softBreak = SOFT_BREAK_RE.test(ch) && trimmed.length >= minLen + 2;
      const tooLong = trimmed.length >= maxHold;

      if (trimmed && (atEnd || softBreak || tooLong) && isSpeakableChunk(trimmed, minLen)) {
        segments.push(trimmed);
        spokenOffset += buf.length;
        buf = "";
      }
    }

    return segments;
  };

  /**
   * @param {string | null | undefined} fullRaw
   * @returns {string[]}
   */
  const flush = (fullRaw) => {
    const full = stripReplyTagsForSpeak(fullRaw);
    const tail = full.slice(spokenOffset).trim();
    spokenOffset = full.length;
    if (!tail || !isSpeakableChunk(tail, 1)) return [];
    return [tail];
  };

  return {
    schema: COMPANION_STREAM_SPEAK_SCHEMA,
    feed,
    flush,
    reset,
    get spokenOffset() {
      return spokenOffset;
    },
  };
}
