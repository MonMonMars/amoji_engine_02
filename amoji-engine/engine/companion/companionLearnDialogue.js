/**
 * Download / learning dialogue — spoken while motions install from the cloud.
 * Distinct from generic LLM "thinking" fillers in companionContentMotion.js.
 */

export const LEARN_DIALOGUE_SCHEMA = "amoji.companionLearnDialogue.v1";

/** @typedef {'connecting'|'searching'|'downloading'|'learning'|'installing'|'ready'|'failed'|'progress'} LearnPhase */

/** @type {Record<LearnPhase, { yue: readonly string[], en: readonly string[] }>} */
export const LEARN_DIALOGUE = Object.freeze({
  connecting: {
    yue: [
      "等我連上動作伺服器先…",
      "我開緊動作庫連線…",
      "連線中，等陣呀…",
    ],
    en: [
      "Connecting to the motion server…",
      "Opening the motion library link…",
      "One sec — I'm connecting…",
    ],
  },
  searching: {
    yue: [
      "我搵吓呢個動作喺邊…",
      "等我喺雲端搵吓先…",
      "搵緊動作檔案…",
    ],
    en: [
      "Let me find that move on the server…",
      "Searching the cloud library…",
      "Looking up that motion…",
    ],
  },
  downloading: {
    yue: [
      "下載緊新動作，等我一下…",
      "動作檔下載中，唔好急…",
      "我拎緊動作包落來…",
      "下載中呀，就快好…",
    ],
    en: [
      "Downloading the new move — hang on…",
      "Pulling the motion pack now…",
      "Still downloading — almost there…",
      "Getting the motion file…",
    ],
  },
  learning: {
    yue: [
      "呢個動作我未學過，等我學吓先…",
      "我要時間學呢招，你等我一下…",
      "新動作呀！等我練熟先…",
      "我學緊呢個動作，稍等…",
      "唔好意思，我要學吓先至做得出…",
    ],
    en: [
      "I haven't learned this move yet — give me a moment…",
      "New motion! I need a little time to practice…",
      "I'm learning this one now — hold on…",
      "Sorry, I need to study this move first…",
      "Let me practice this before I show you…",
    ],
  },
  installing: {
    yue: [
      "裝緊入我身體動作庫…",
      "安裝動作中，就快可以表演…",
      "我將動作存落本地先…",
    ],
    en: [
      "Installing it into my motion library…",
      "Saving the move locally…",
      "Almost ready — installing now…",
    ],
  },
  progress: {
    yue: [
      "下載咗 {pct}% 啦…",
      "進度 {pct}%，再等一陣…",
      "已經 {pct}% 喇，快完成…",
    ],
    en: [
      "Downloaded {pct}% so far…",
      "{pct}% done — almost there…",
      "Progress: {pct}%…",
    ],
  },
  ready: {
    yue: [
      "學識喇！等我表演俾你睇…",
      "搞掂！新動作準備好喇…",
      "OK，我識做呢個動作喇！",
    ],
    en: [
      "Got it! Let me show you…",
      "All set — here's the new move!",
      "Learned it! Watch this…",
    ],
  },
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
});

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
  if (p < 0.08) return "connecting";
  if (p < 0.22) return "searching";
  if (p < 0.55) return "downloading";
  if (p < 0.78) return "learning";
  if (p < 0.95) return "installing";
  return "ready";
}
