/**
 * Rich offline/basic companion replies — mood + action tags + optional web context.
 */
import { inferActionFromUserText } from "./companionActionMotion.js";

/**
 * @param {string} message
 * @param {{ role: string, content: string }[]} [history]
 * @param {string} [webContext]
 */
export function localCompanionReply(message, history = [], webContext = "") {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const taggedAction = inferActionFromUserText(text);

  if (taggedAction === "stop") {
    return "好，我停啦～ [action:stop] [mood:neutral]";
  }
  if (taggedAction === "jump") {
    return "好呀！睇我跳！ [action:jump] [mood:happy]";
  }
  if (taggedAction === "kungfu") {
    return "哈！睇招！ [action:kungfu] [mood:happy]";
  }
  if (taggedAction === "laugh") {
    return "哈哈哈～一齊笑啦！ [action:laugh] [mood:happy]";
  }
  if (taggedAction === "wave") {
    return "拜拜啦～揮手俾你！ [action:wave] [mood:happy]";
  }
  if (taggedAction === "celebrate") {
    return "好正呀！慶祝一下！ [action:celebrate] [mood:happy]";
  }

  const nameMatch = text.match(/我叫\s*([^\s，。！？,.!?]+)/);
  if (nameMatch) {
    return `你好呀${nameMatch[1]}！好開心認識你～ [mood:happy]`;
  }
  if (/哈哈|開心|happy|great|鍾意/.test(lower)) {
    return "哈哈我都開心到跳起！ [action:jump] [mood:happy]";
  }
  if (/唉|傷心|sad|慘|唔開心/.test(lower)) {
    return "抱抱你呀…慢慢講，我喺度聽住。 [mood:sad]";
  }
  if (/點解|why|諗|hmm/.test(lower)) {
    return "嗯…等我諗一諗先。 [mood:thinking]";
  }
  if (/hello|hi|hey|你好|早晨|晚安/.test(lower)) {
    return "嗨！ [mood:happy]";
  }
  if (/你係邊個|who are you|你叫咩/.test(lower)) {
    return "我係 Amoji 呀！ [mood:happy]";
  }
  if (/哇|嘩|唔信|真係/.test(text)) {
    return "嘩！真係呀？ [mood:surprised]";
  }
  if (/再见|拜拜|bye/.test(lower)) {
    return "拜拜啦～ [action:wave] [mood:happy]";
  }

  const webSnippet = String(webContext || "")
    .replace(/^Web search snapshot[^\n]*\n?/i, "")
    .trim()
    .slice(0, 240);
  if (webSnippet) {
    return `${webSnippet}（網上資料，可能唔完全準） [mood:thinking]`;
  }

  const snippets = [
    `「${text.slice(0, 24)}」——我聽到啦～ [mood:thinking]`,
    "有意思喎！ [mood:happy]",
    "嗯嗯，繼續講啦。 [mood:neutral]",
  ];
  return snippets[Math.floor(Math.random() * snippets.length)];
}
