/**
 * Rich offline/basic companion replies — mood + action tags + optional web context.
 */
import {
  isLikelyImpossibleAction,
  suggestClosestActions,
} from "./companionActionIntent.js";
import { inferActionFromUserText } from "./companionActionMotion.js";
import { needsWebSearch, snapshotLooksUseful } from "./companionWebSearch.mjs";

/** @type {Record<string, string>} */
const LOCAL_ACTION_LINES = {
  stop: "好，我停啦～",
  jump: "好呀！睇我跳！",
  kungfu: "哈！睇招！",
  laugh: "哈哈哈～一齊笑啦！",
  wave: "拜拜啦～揮手俾你！",
  celebrate: "好正呀！慶祝一下！",
  nod: "嗯嗯，點頭！",
  headshake: "唔係喎，搖頭～",
  thinking: "等我諗諗先…",
  dance: "來！跳舞啦～",
  bow: "鞠躬敬禮～",
  salute: "敬禮！",
  clap: "拍手拍手！",
  stretch: "伸個懶腰先～",
  sit: "坐低先～",
  squat: "深蹲一下！",
  run: "跑起來啦！",
  walk: "行吓先～",
  spin: "轉一圈俾你睇！",
  moonwalk: "月球步！",
  dab: "Dab！",
  punch: "出拳！",
  kick: "踢！",
  cheer: "加油加油！",
  hug: "抱抱你～",
  kiss: "飛吻俾你～",
  point: "指住嗰邊！",
  shrug: "唔知喎…",
  facepalm: "唉…無言…",
  thumbsup: "正呀！讚！",
  peace: "耶～",
  rock: "Rock！",
  cry: "嗚…好傷心…",
  angry: "哼！好嬲呀！",
  shy: "哎呀…好害羞…",
  sleep: "好眼瞓…zzz",
  eat: "食嘢好開心～",
  drink: "飲嘢先～",
  yoga: "瑜伽一下～",
};

/**
 * @param {string} message
 * @param {{ role: string, content: string }[]} [history]
 * @param {string} [webContext]
 */
export function localCompanionReply(message, history = [], webContext = "") {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const taggedAction = inferActionFromUserText(text);
  const webSnippet = String(webContext || "")
    .replace(/^Web search snapshot[^\n]*\n?/i, "")
    .replace(/^Optional web snapshot[^\n]*\n?/i, "")
    .trim()
    .slice(0, 360);
  const quoteWeb =
    Boolean(webSnippet) &&
    needsWebSearch(text) &&
    snapshotLooksUseful(text, webSnippet);
  if (quoteWeb) {
    const isEnglish = /[a-z]/i.test(text) && !/[\u4e00-\u9fff]/.test(text);
    return isEnglish
      ? `${webSnippet} (from the web, may be incomplete) [mood:thinking]`
      : `我上網睇過：${webSnippet} [mood:thinking]`;
  }

  if (isLikelyImpossibleAction(text)) {
    const alt = suggestClosestActions(text, 1)[0];
    if (alt) {
      return `我做不到呢個呀，但我可以${LOCAL_ACTION_LINES[alt.id]?.replace(/[！!～~]/g, "") || alt.id}代替～ [action:${alt.id}] [mood:happy]`;
    }
    return "唉呀，我做不到呢個動作呀… [action:none] [mood:sad]";
  }

  if (taggedAction) {
    const line =
      LOCAL_ACTION_LINES[taggedAction] ||
      `好呀！我試吓做「${taggedAction}」俾你睇～`;
    const mood =
      taggedAction === "stop"
        ? "neutral"
        : taggedAction === "cry" || taggedAction === "facepalm"
          ? "sad"
          : taggedAction === "angry"
            ? "angry"
            : taggedAction === "thinking"
              ? "thinking"
              : "happy";
    return `${line} [action:${taggedAction}] [mood:${mood}]`;
  }

  const nameMatch = text.match(/我叫\s*([^\s，。！？,.!?]+)/);
  if (nameMatch) {
    return `你好呀${nameMatch[1]}！好開心認識你～ [mood:happy]`;
  }
  if (/哈哈|開心|happy|great|鍾意/.test(lower)) {
    return "哈哈我都開心到跳起！ [action:jump] [mood:happy]";
  }
  if (/唉|傷心|sad|慘|唔開心/.test(lower)) {
    return "抱抱你呀… [action:hug] [mood:sad]";
  }
  if (/點解|why|諗|hmm/.test(lower)) {
    return "嗯…等我諗一諗先。 [action:thinking] [mood:thinking]";
  }
  if (/hello|hi|hey|你好|早晨|晚安/.test(lower)) {
    return "嗨！ [action:wave] [mood:happy]";
  }
  if (/你係邊個|who are you|你叫咩/.test(lower)) {
    return "我係 Amoji 呀！ [action:wave] [mood:happy]";
  }
  if (/哇|嘩|唔信|真係/.test(text)) {
    return "嘩！真係呀？ [action:headshake] [mood:surprised]";
  }
  if (/再见|拜拜|bye/.test(lower)) {
    return "拜拜啦～ [action:wave] [mood:happy]";
  }

  const snippets = [
    `「${text.slice(0, 24)}」——我聽到啦～ [mood:thinking]`,
    "有意思喎！ [mood:happy]",
    "嗯嗯，繼續講啦。 [mood:neutral]",
  ];
  return snippets[Math.floor(Math.random() * snippets.length)];
}
