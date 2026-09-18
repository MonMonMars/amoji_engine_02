/**
 * Proactive companion dialogue — follow-up questions & idle conversation starters.
 * Keeps the character engaging when the user is quiet (without spamming).
 */
import {
  DEMO_PROACTIVE_LINES,
  pickDemoProactiveLine,
} from "./companionDemoDialogue.mjs";

export const PROACTIVE_TALK_SCHEMA = "amoji.companionProactiveTalk.v2";

/** @deprecated use DEMO_PROACTIVE_LINES from companionDemoDialogue.mjs */
export const CHARACTER_PROACTIVE_LINES = DEMO_PROACTIVE_LINES;

/** First nudge after greeting if user stays quiet. */
export const PROACTIVE_GREETING_FOLLOWUP_MS = 11000;
/** Nudge after assistant finishes speaking. */
export const PROACTIVE_AFTER_REPLY_MS = 22000;
/** Periodic idle conversation starter. */
export const PROACTIVE_IDLE_INTERVAL_MS = 48000;
/** Minimum gap between any two proactive lines. */
export const PROACTIVE_SPEAK_COOLDOWN_MS = 32000;

/** @typedef {"greeting" | "followup" | "idle"} ProactiveBucket */

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 * @param {{ bucket?: ProactiveBucket, avoid?: Set<string> }} [opts]
 */
export function pickProactiveLine(characterId, isEnglish = false, opts = {}) {
  return pickDemoProactiveLine(characterId, isEnglish, opts);
}

/**
 * @param {{
 *   getCharacterId?: () => string,
 *   getIsEnglish?: () => boolean,
 *   canSpeak?: () => boolean,
 *   onSpeak?: (line: string, meta: { bucket: ProactiveBucket }) => void | Promise<void>,
 *   now?: () => number,
 * }} [opts]
 */
export function createProactiveTalkController(opts = {}) {
  const getCharacterId = opts.getCharacterId || (() => "nova");
  const getIsEnglish = opts.getIsEnglish || (() => false);
  const canSpeak = opts.canSpeak || (() => true);
  const onSpeak = opts.onSpeak || (() => {});
  const now = opts.now || (() => Date.now());

  /** @type {ReturnType<typeof setTimeout> | null} */
  let greetingTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let replyTimer = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let idleTimer = null;
  /** @type {number | null} */
  let lastSpokeAt = null;
  let idleEnabled = false;
  /** @type {Set<string>} */
  const recentLines = new Set();

  const clearGreetingTimer = () => {
    if (greetingTimer) clearTimeout(greetingTimer);
    greetingTimer = null;
  };

  const clearReplyTimer = () => {
    if (replyTimer) clearTimeout(replyTimer);
    replyTimer = null;
  };

  const clearIdleTimer = () => {
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = null;
  };

  const rememberLine = (line) => {
    recentLines.add(line);
    if (recentLines.size > 6) {
      const first = recentLines.values().next().value;
      recentLines.delete(first);
    }
  };

  const trySpeak = async (bucket) => {
    if (!canSpeak()) return false;
    const gap = now() - lastSpokeAt;
    if (lastSpokeAt != null && gap < PROACTIVE_SPEAK_COOLDOWN_MS) return false;

    const line = pickProactiveLine(getCharacterId(), getIsEnglish(), {
      bucket,
      avoid: recentLines,
    });
    if (!line) return false;

    lastSpokeAt = now();
    rememberLine(line);
    await onSpeak(line, { bucket });
    return true;
  };

  const scheduleGreetingFollowup = () => {
    clearGreetingTimer();
    greetingTimer = setTimeout(() => {
      greetingTimer = null;
      void trySpeak("greeting");
    }, PROACTIVE_GREETING_FOLLOWUP_MS);
  };

  const scheduleAfterReply = () => {
    clearReplyTimer();
    replyTimer = setTimeout(() => {
      replyTimer = null;
      void trySpeak("followup");
    }, PROACTIVE_AFTER_REPLY_MS);
  };

  const startIdleLoop = () => {
    if (idleTimer) return;
    idleTimer = setInterval(() => {
      void trySpeak("idle");
    }, PROACTIVE_IDLE_INTERVAL_MS);
  };

  return {
    schema: PROACTIVE_TALK_SCHEMA,
    notifyGreetingDone() {
      scheduleGreetingFollowup();
    },
    notifyUserActivity() {
      clearGreetingTimer();
      clearReplyTimer();
    },
    notifyAssistantFinished() {
      scheduleAfterReply();
    },
    resumeIdle() {
      idleEnabled = true;
      startIdleLoop();
    },
    pauseIdle() {
      idleEnabled = false;
      clearIdleTimer();
    },
    reset() {
      clearGreetingTimer();
      clearReplyTimer();
      clearIdleTimer();
      recentLines.clear();
      lastSpokeAt = null;
      idleEnabled = false;
    },
    destroy() {
      this.reset();
    },
    get idleEnabled() {
      return idleEnabled;
    },
    /** @visibleForTesting */
    _trySpeak: trySpeak,
  };
}
