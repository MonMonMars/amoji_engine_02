/**
 * Proactive companion dialogue — follow-up questions & idle conversation starters.
 * Keeps the character engaging when the user is quiet (without spamming).
 */

export const PROACTIVE_TALK_SCHEMA = "amoji.companionProactiveTalk.v1";

/** First nudge after greeting if user stays quiet. */
export const PROACTIVE_GREETING_FOLLOWUP_MS = 11000;
/** Nudge after assistant finishes speaking. */
export const PROACTIVE_AFTER_REPLY_MS = 22000;
/** Periodic idle conversation starter. */
export const PROACTIVE_IDLE_INTERVAL_MS = 48000;
/** Minimum gap between any two proactive lines. */
export const PROACTIVE_SPEAK_COOLDOWN_MS = 32000;

/** @typedef {"greeting" | "followup" | "idle"} ProactiveBucket */

/** @type {Readonly<Record<string, { en: readonly string[], yue: readonly string[] }>>} */
export const CHARACTER_PROACTIVE_LINES = Object.freeze({
  nova: {
    en: [
      "So — what's on your mind today?",
      "Anything fun happen since we last talked?",
      "Want to tell me about your day?",
      "I'm curious — what brought you here?",
      "Got a goal you're working on? I'd love to hear it.",
    ],
    yue: [
      "咁 — 今日有咩心事想同我講？",
      "有咩開心或者煩惱事想分享？",
      "今日過成點？同我講吓啦。",
      "我好好奇 — 你今日想傾咩？",
      "有冇咩目標進行緊？我想聽吓。",
    ],
  },
  kizuna: {
    en: [
      "Hey~ anything you wanna chat about?",
      "I'm bored waiting — entertain me?",
      "Got a secret to tell me?",
      "What should we do together today?",
      "You seem quiet — everything okay?",
    ],
    yue: [
      "喂~ 有咩想同我傾呀？",
      "我好悶呀 — 陪下我傾偈啦？",
      "有冇秘密想話我知？",
      "今日想同我做咩？",
      "你好似好靜 — 冇事嘛？",
    ],
  },
  amoji: {
    en: [
      "C'mon, say something — I'm all ears!",
      "Roast me, praise me, or just vent — your call.",
      "What's the vibe today? Spill it.",
      "Got a hot take you want to test on me?",
      "Tell me something I don't know yet.",
    ],
    yue: [
      "喂，講嘢啦 — 我聽緊！",
      "吐槽我、讚我、或者發洩都得 — 你話事。",
      "今日咩 mood？講嚟聽下。",
      "有冇啲大膽想法想同我試下講？",
      "同我講件我未聽過嘅事啦。",
    ],
  },
  sora: {
    en: [
      "Take your time — but I'm here if you want to talk.",
      "Is something weighing on you? You can tell me.",
      "What would feel good to chat about right now?",
      "Want to unpack your day together?",
      "Any small win you want to celebrate?",
    ],
    yue: [
      "唔使急 — 想傾嘅話我喺度。",
      "有冇嘢壓住你？可以同我講。",
      "而家傾咩會舒服啲？",
      "想唔想一齊梳理下今日？",
      "有冇小成就想同我分享？",
    ],
  },
  rose: {
    en: [
      "What's on your schedule — anything I can help organize?",
      "Any tasks you want to talk through?",
      "How's your day going so far?",
      "Want to plan something together?",
    ],
    yue: [
      "今日有咩安排 — 有冇我可以幫手整理？",
      "有冇任務想同我傾清楚？",
      "今日過到而家點呀？",
      "想唔想一齊計劃啲嘢？",
    ],
  },
  rex: {
    en: [
      "Spit it out — what's going on?",
      "You got something to say or what?",
      "What's the move today?",
      "Hit me with a topic — anything.",
    ],
    yue: [
      "有咩就講啦 — 發生緊咩事？",
      "有嘢想講定係點？",
      "今日搞咩？",
      "丟個話題過嚟 — 咩都得。",
    ],
  },
  default: {
    en: [
      "What's on your mind?",
      "Want to tell me about your day?",
      "I'm here — what should we talk about?",
      "Got a question for me?",
      "Anything you want to get off your chest?",
      "How are you feeling right now?",
      "Tell me something good that happened lately.",
      "Want to try a fun topic together?",
    ],
    yue: [
      "有咩心事？",
      "想同我講今日過成點？",
      "我喺度 — 想傾咩？",
      "有冇問題想問我？",
      "有咩想發洩可以同我講。",
      "而家心情點呀？",
      "同我講件最近開心嘅事啦。",
      "想唔想玩個有趣話題？",
    ],
  },
});

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 * @param {{ bucket?: ProactiveBucket, avoid?: Set<string> }} [opts]
 */
export function pickProactiveLine(characterId, isEnglish = false, opts = {}) {
  const id = String(characterId || "nova").toLowerCase();
  const pack =
    CHARACTER_PROACTIVE_LINES[id] || CHARACTER_PROACTIVE_LINES.default;
  const lang = isEnglish ? "en" : "yue";
  const pool = [...(pack[lang] || CHARACTER_PROACTIVE_LINES.default[lang])];
  const avoid = opts.avoid || new Set();
  const filtered = pool.filter((line) => !avoid.has(line));
  const choices = filtered.length ? filtered : pool;
  if (!choices.length) return "";
  return choices[Math.floor(Math.random() * choices.length)];
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
