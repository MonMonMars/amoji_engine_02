/**
 * Download / learning dialogue — spoken while motions install from the cloud.
 * Distinct from generic LLM "thinking" fillers in companionContentMotion.js.
 */

export const LEARN_DIALOGUE_SCHEMA = "amoji.companionLearnDialogue.v1";

/** @typedef {'connecting'|'searching'|'downloading'|'learning'|'installing'|'ready'|'failed'|'progress'|'avatar-load'|'idle'|'character-switch'|'thinking-wait'|'motions-ready'} LearnPhase */

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
      "條下載 bar 行緊喇，我仲拎緊檔案…",
      "網絡傳送中，我陪住你等…",
    ],
    en: [
      "Downloading the new move — hang on…",
      "Pulling the motion pack now…",
      "Still downloading — almost there…",
      "Getting the motion file…",
      "The progress bar is moving — I'm still fetching it…",
      "Hang tight — the file is on its way…",
    ],
  },
  learning: {
    yue: [
      "呢個動作我未學過，等我學吓先…",
      "我要時間學呢招，你等我一下…",
      "新動作呀！等我練熟先…",
      "我學緊呢個動作，稍等…",
      "唔好意思，我要學吓先至做得出…",
      "我而家練緊舞步，睇住呀…",
      "等我記住呢套動作先，好快就得…",
    ],
    en: [
      "I haven't learned this move yet — give me a moment…",
      "New motion! I need a little time to practice…",
      "I'm learning this one now — hold on…",
      "Sorry, I need to study this move first…",
      "Let me practice this before I show you…",
      "Watch me rehearse this — almost got it…",
      "New skill incoming — give me a sec to nail it…",
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
  "avatar-load": {
    yue: [
      "等我醒起身先，載入緊我嘅身體…",
      "我嘅 3D 模型下載中，好快見到你…",
      "裝緊動漫造型，你等我一下…",
      "骨骼同表情載入中，就快出現喇…",
      "我喺度變身中，唔好急呀…",
      "模型檔案好大，但我已經拎緊喇…",
    ],
    en: [
      "Hold on — I'm waking up my 3D body…",
      "Loading my anime model — almost there…",
      "Pulling my avatar together — give me a sec…",
      "Bones and expressions are loading…",
      "I'm materializing — won't be long…",
      "Big model file incoming — I'm on it…",
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
  "character-switch": {
    yue: [
      "等我換個造型先…",
      "轉角色中，等陣呀…",
      "我換緊同伴，好快就返嚟…",
    ],
    en: [
      "Switching my look — one moment…",
      "Changing character — hang on…",
      "I'll be right back in a new outfit…",
    ],
  },
  "thinking-wait": {
    yue: [
      "等我諗清楚先…",
      "我諗緊點答你…",
      "嗯…等我整理下思路…",
      "諗一諗先，唔好急…",
    ],
    en: [
      "Let me think that through…",
      "I'm putting my thoughts together…",
      "Hmm — give me a moment to answer…",
      "Still thinking — almost got it…",
    ],
  },
});

/**
 * Map wait UI kind + phase to a dialogue bucket.
 * @param {string} [kind]
 * @param {string} [phase]
 * @param {number} [progress]
 * @returns {LearnPhase}
 */
export function resolveWaitDialoguePhase(kind, phase, progress = 0) {
  if (kind === "avatar-load" && progress < 0.42) return "avatar-load";
  if (kind === "idle") return "idle";
  if (kind === "character-switch") return "character-switch";
  if (kind === "thinking") return "thinking-wait";
  if (phase === "progress") return "progress";
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
  if (p < 0.08) return "connecting";
  if (p < 0.22) return "searching";
  if (p < 0.55) return "downloading";
  if (p < 0.78) return "learning";
  if (p < 0.95) return "installing";
  return "ready";
}
