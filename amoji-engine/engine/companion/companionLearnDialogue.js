/**
 * Download / learning dialogue — spoken while motions install from the cloud.
 * Loading phases stay quiet at first, then hum thinking sounds near the end.
 * Distinct from generic LLM "thinking" fillers in companionContentMotion.js.
 */

export const LEARN_DIALOGUE_SCHEMA = "amoji.companionLearnDialogue.v2";

/** Stay quiet when a load starts; speak later or when almost done. */
export const LEARN_SPEAK_DELAY_MS = 4800;
export const LEARN_SPEAK_STALL_MS = 11000;
export const LEARN_SPEAK_MIN_PROGRESS = 0.68;
export const LEARN_SPEAK_NEAR_DONE = 0.86;
export const LEARN_SPEAK_INTERVAL_MS = 4400;
export const LEARN_SPEAK_COOLDOWN_MS = 3600;
export const LEARN_SPEAK_POLL_MS = 500;

/**
 * @typedef {'connecting'|'waking'|'searching'|'assembling'|'downloading'|'warming'|'learning'|'installing'|'settling'|'almost'|'ready'|'failed'|'progress'|'avatar-load'|'idle'|'character-switch'|'thinking-wait'|'motions-ready'} LearnPhase
 */

/** @type {ReadonlySet<string>} */
export const LOADING_LEARN_PHASES = Object.freeze(
  new Set([
    "connecting",
    "waking",
    "searching",
    "assembling",
    "downloading",
    "warming",
    "learning",
    "installing",
    "settling",
    "almost",
    "progress",
    "avatar-load",
    "character-switch",
    "ready",
  ]),
);

/** @type {ReadonlySet<string>} */
export const LOADING_WAIT_KINDS = Object.freeze(
  new Set([
    "avatar-load",
    "motion",
    "download",
    "motion-pack",
    "character-switch",
  ]),
);

const LOAD_HUMS_YUE = Object.freeze([
  "嗯………",
  "嗯嗯……",
  "唔………",
  "啊嘛………",
  "嗯啊……",
  "呣………",
  "嗯哼……",
  "啊………",
  "嗯呣……",
  "唔嗯……",
  "嗯嗯嗯……",
  "啊嗯……",
  "呣嗯……",
  "唔唔……",
  "嗯……嗯……",
  "啊嘛嘛……",
  "嗯哼哼……",
  "唔……嗯",
  "呣呣……",
  "嗯啊啊……",
]);

const LOAD_HUMS_EN = Object.freeze([
  "Um……….",
  "Ammmmmm…",
  "Hmm………",
  "Ummmm…",
  "Mmm……",
  "Uh………",
  "Ahhhh…",
  "Uhhh…",
  "Mm-hmm…",
  "Amm…",
  "Umm………",
  "Hmmmm…",
  "Uh-huh…",
  "Mmmmm…",
  "Um… um…",
  "Ammmmm…",
  "Hmm… um…",
  "Umm…",
  "Ah………",
  "Mmm-hmm…",
]);

/**
 * Unique thinking-sound slice per loading phase.
 * @param {number} offset
 * @param {number} [count]
 */
function humBucket(offset, count = 8) {
  /** @type {string[]} */
  const yue = [];
  /** @type {string[]} */
  const en = [];
  for (let i = 0; i < count; i += 1) {
    yue.push(LOAD_HUMS_YUE[(offset + i * 3) % LOAD_HUMS_YUE.length]);
    en.push(LOAD_HUMS_EN[(offset + i * 3) % LOAD_HUMS_EN.length]);
  }
  return Object.freeze({
    yue: Object.freeze(yue),
    en: Object.freeze(en),
  });
}

const LOADING_HUMS = Object.freeze({
  connecting: humBucket(0),
  waking: humBucket(1),
  searching: humBucket(2),
  assembling: humBucket(3),
  downloading: humBucket(4),
  warming: humBucket(5),
  learning: humBucket(6),
  installing: humBucket(7),
  settling: humBucket(8),
  almost: humBucket(9),
  progress: humBucket(10),
  "avatar-load": humBucket(11),
  "character-switch": humBucket(12),
  ready: Object.freeze({
    yue: Object.freeze(["嗯。", "嗯嗯。", "呣。"]),
    en: Object.freeze(["Mm.", "Mm-hmm.", "Mhm."]),
  }),
});

/** @type {Record<LearnPhase, { yue: readonly string[], en: readonly string[] }>} */
export const LEARN_DIALOGUE = Object.freeze({
  ...LOADING_HUMS,
  failed: {
    yue: [
      "哎呀，下載唔到呢個動作…",
      "連線失敗，我試唔到學呢招…",
      "動作伺服器好似有問題，等陣再試啦…",
    ],
    en: [
      "Oops — I couldn't download that move…",
      "The motion server didn't respond…",
      "Download failed — maybe try again later?",
    ],
  },
  "motions-ready": {
    yue: [
      "動作庫搞掂喇！我可以揮手、跳舞、鞠躬、太極、霹靂舞等等 — 話我知想做咩。",
      "我學識咗十幾個身體動作，等緊你都可以叫我表演。",
      "想睇我做動作？試下話「跳個舞」或者「揮手」。",
      "我而家識 wave、dance、bow、clap、spin… 隨時可以叫我做。",
    ],
    en: [
      "Motion library ready — I can wave, dance, bow, tai chi, breakdance, and more. Just ask!",
      "I learned a dozen body moves — I can perform them while we wait too.",
      "Want a demo? Try \"do a dance\" or \"wave at me\".",
      "I know wave, dance, bow, clap, spin… ask anytime.",
    ],
  },
  idle: {
    yue: [
      "我喺度等緊你呀…",
      "有咩想傾，隨時開口…",
      "我喺度陪住你，唔使急…",
      "等緊你講嘢呀…",
      "我仲喺度呀，有咩想玩？",
      "靜靜地陪住你等…",
      "唔急，慢慢嚟都得…",
      "我喺度呀，想傾咩都得…",
      "等你開口，我聽住…",
      "得閒就同我傾下偈啦…",
      "我保持安靜，等你話畀我知…",
      "有咩心事，可以同我講…",
      "我唔會走㗎，陪住你…",
      "想打字或者開 mic 都得…",
      "我喺度扮靜，其實好期待你講嘢…",
      "慢慢諗，我會等…",
      "今日想玩咩動作，話我知 — 我識揮手、跳舞、鞠躬、太極呀…",
      "我伸個腰，等緊你…",
      "有咩新鮮事想分享？",
      "我喺度呀，隨時可以開口…",
      "唔好意思打擾你，不過我喺度…",
      "等緊你下一句呀…",
      "你想我表演下動作都得…",
      "我陪住你發呆先…",
      "有咩煩惱，可以同我講吓…",
      "我聽緊環境音，等你講嘢…",
      "唔使客氣，想點都得…",
      "我喺度 smile 住等緊你…",
    ],
    en: [
      "I'm here whenever you're ready…",
      "Just hanging out — say something anytime…",
      "I'll keep you company while we wait…",
      "Still here — tap the mic when you want to chat…",
      "Take your time — I'm not going anywhere…",
      "Quiet moment together…",
      "No rush — we can just chill…",
      "I'm around if you want to talk…",
      "I'm listening whenever you speak up…",
      "Feel free to chat whenever…",
      "I'll stay quiet until you're ready…",
      "You can tell me anything on your mind…",
      "I'm not leaving — I'm right here…",
      "Type or use the mic — either works…",
      "I'm pretending to be calm but I'm excited to hear you…",
      "Think it over — I'll wait…",
      "Want me to do a move? I can wave, dance, bow, tai chi — just ask…",
      "Stretching a little while I wait for you…",
      "Got something new to share?",
      "Still here — jump in anytime…",
      "Didn't mean to interrupt — just keeping you company…",
      "Waiting for your next line…",
      "I can show you a move if you'd like…",
      "Hanging out in idle mode with you…",
      "If something's bothering you, I'm here…",
      "Listening to the room — speak when ready…",
      "Don't be shy — I'm all ears…",
      "Smiling quietly until you say hi…",
    ],
  },
  "thinking-wait": {
    yue: [
      "嗯………",
      "嗯嗯……",
      "唔………",
      "啊嘛………",
    ],
    en: [
      "Um……….",
      "Hmm………",
      "Ammmmmm…",
      "Ummmm…",
    ],
  },
});

/**
 * @param {string} [phase]
 */
export function isLoadingLearnPhase(phase) {
  return LOADING_LEARN_PHASES.has(String(phase || ""));
}

/**
 * @param {string} [kind]
 */
export function isLoadingWaitKind(kind) {
  return LOADING_WAIT_KINDS.has(String(kind || ""));
}

/**
 * Loading fillers stay quiet at the start. Speak later, or when almost done.
 * @param {{
 *   elapsedMs?: number,
 *   progress?: number,
 *   spokenCount?: number,
 *   phase?: string,
 *   kind?: string,
 *   sinceLastSpeakMs?: number,
 * }} [opts]
 */
export function shouldSpeakLearnFill({
  elapsedMs = 0,
  progress = 0,
  spokenCount = 0,
  phase = "",
  kind = "",
  sinceLastSpeakMs = Number.POSITIVE_INFINITY,
} = {}) {
  const loading = isLoadingLearnPhase(phase) || isLoadingWaitKind(kind);
  if (!loading) return true;

  if (spokenCount > 0 && sinceLastSpeakMs < LEARN_SPEAK_COOLDOWN_MS) {
    return false;
  }

  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  if (elapsedMs < LEARN_SPEAK_DELAY_MS) return false;
  if (p >= LEARN_SPEAK_NEAR_DONE) return true;
  if (p >= LEARN_SPEAK_MIN_PROGRESS) return true;
  if (spokenCount === 0 && elapsedMs >= LEARN_SPEAK_STALL_MS) return true;
  return false;
}

/**
 * True when a learn phrase is a thinking hum, not a sentence.
 * @param {string} [phrase]
 */
export function isLearnThinkingSound(phrase) {
  const text = String(phrase || "").trim();
  if (!text) return false;
  return /^(um+|amm+|hmm+|uh+|mm+|ah+|mhm|嗯|唔|啊|呣)/i.test(text);
}

/**
 * Map wait UI kind + phase to a dialogue bucket.
 * @param {string} [kind]
 * @param {string} [phase]
 * @param {number} [progress]
 * @returns {LearnPhase}
 */
export function resolveWaitDialoguePhase(kind, phase, progress = 0) {
  if (kind === "idle") return "idle";
  if (kind === "thinking") return "thinking-wait";
  if (phase === "failed") return "failed";
  if (kind === "character-switch" && progress < 0.18) return "character-switch";
  if (kind === "avatar-load" && progress < 0.18) return "avatar-load";
  if (progress > 0) return learnPhaseForProgress(progress);
  if (phase && LEARN_DIALOGUE[phase]) return phase;
  return learnPhaseForProgress(progress);
}

/**
 * @param {LearnPhase} phase
 * @param {boolean} [isEnglish]
 * @param {{ pct?: number, actionLabel?: string }} [ctx]
 */
export function pickLearnPhrase(phase, isEnglish = false, ctx = {}) {
  const bucket = LEARN_DIALOGUE[phase] || LEARN_DIALOGUE.learning;
  const list = isEnglish ? bucket.en : bucket.yue;
  let phrase = list[Math.floor(Math.random() * list.length)] || "";
  if (ctx.pct != null && phrase.includes("{pct}")) {
    phrase = phrase.replace(/\{pct\}/g, String(Math.round(ctx.pct)));
  }
  if (ctx.actionLabel && phrase.includes("{action}")) {
    phrase = phrase.replace(/\{action\}/g, ctx.actionLabel);
  }
  return phrase;
}

/**
 * Cycle learn phrases without immediate repeats.
 * @param {LearnPhase} phase
 * @param {boolean} [isEnglish]
 * @param {number} [lastIndex]
 * @param {{ pct?: number, actionLabel?: string }} [ctx]
 */
export function pickNextLearnPhrase(
  phase,
  isEnglish = false,
  lastIndex = -1,
  ctx = {},
) {
  const bucket = LEARN_DIALOGUE[phase] || LEARN_DIALOGUE.learning;
  const list = isEnglish ? bucket.en : bucket.yue;
  if (list.length <= 1) {
    return { phrase: pickLearnPhrase(phase, isEnglish, ctx), index: 0 };
  }
  let index = Math.floor(Math.random() * list.length);
  if (index === lastIndex) index = (index + 1) % list.length;
  let phrase = list[index];
  if (ctx.pct != null && phrase.includes("{pct}")) {
    phrase = phrase.replace(/\{pct\}/g, String(Math.round(ctx.pct)));
  }
  return { phrase, index };
}

/**
 * Map download progress 0..1 to a dialogue phase.
 * @param {number} progress
 * @returns {LearnPhase}
 */
export function learnPhaseForProgress(progress) {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.06) return "connecting";
  if (p < 0.12) return "waking";
  if (p < 0.18) return "searching";
  if (p < 0.26) return "assembling";
  if (p < 0.4) return "downloading";
  if (p < 0.5) return "warming";
  if (p < 0.62) return "learning";
  if (p < 0.72) return "installing";
  if (p < 0.82) return "settling";
  if (p < 0.92) return "almost";
  return "ready";
}
