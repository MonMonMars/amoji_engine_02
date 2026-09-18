/**
 * Secretary LLM prompt fragments — shared by lite shell and unified 3D app.
 */
import { buildUiIntentPromptFragment } from "../companionUiIntent.js";
import { modePromptFragment, readSecretaryMode } from "./modePresets.js";
import { getPreferences, memoryFactsForPrompt } from "./memoryStore.js";

export const SECRETARY_PROMPT_FRAGMENTS_SCHEMA = "amoji.secretary.promptFragments.v1";

/**
 * Hidden tag rules for secretary productivity in voice-first UI.
 * @param {boolean} isEnglish
 */
export function buildSecretaryTagRules(isEnglish = false) {
  if (isEnglish) {
    return [
      "The user talks only — never ask them to press buttons or tap UI.",
      "You decide navigation, mode, tasks, and memory via hidden tags; the app applies them automatically.",
      "End every reply with [mood:happy|thinking|sad|surprised|angry].",
      "When the user wants a task (or you suggest one), add [task:Title|due:tonight] — it saves immediately.",
      "When they complete a task, add [task:done:Title]. Snooze: [task:snooze:Title|for:1h]. Delete: [task:delete:Title].",
      "For tone/help scope/briefing/reminders use [pref:tone:friendly], [pref:helpWith:work], [pref:morningBrief:on], [pref:reminders:off].",
      "When the user shares a preference worth remembering, add [memory:short fact] — it saves immediately.",
      "When drafting email/message text, add [draft:copyable text on one line].",
      buildUiIntentPromptFragment(true, { surface: "secretary" }),
    ].join(" ");
  }
  return [
    "用戶只會講嘢 — 唔好叫佢撳掣或撳界面。",
    "導航、模式、任務、記憶都由你用隱藏 tag 決定，app 會自動執行。",
    "每句回覆結尾加 [mood:happy|thinking|sad|surprised|angry]。",
    "用戶要任務（或者你建議任務）時加 [task:標題|due:今晚] — 會即刻儲存。",
    "完成任務加 [task:done:標題]；延後加 [task:snooze:標題|for:1h]；刪除加 [task:delete:標題]。",
    "語氣/範圍/簡報/提醒用 [pref:tone:friendly]、[pref:helpWith:work]、[pref:morningBrief:on]、[pref:reminders:off]。",
    "用戶分享值得記住嘅偏好時加 [memory:短句] — 會即刻儲存。",
    "起草電郵/訊息時加 [draft:可複製文字，一行]。",
    buildUiIntentPromptFragment(false, { surface: "secretary" }),
  ].join(" ");
}

/**
 * @param {boolean} isEnglish
 * @param {{ storage?: Storage | null }} [opts]
 */
export function buildSecretaryPromptExtras(isEnglish = false, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const prefs = getPreferences({ storage });
  const toneLine = isEnglish
    ? `Tone: ${prefs.tone}. Help scope: ${prefs.helpWith}.`
    : `語氣：${prefs.tone}。幫手範圍：${prefs.helpWith}。`;
  const modeLine = modePromptFragment(readSecretaryMode(storage), isEnglish);
  const memory = memoryFactsForPrompt({ storage });
  const memoryLine = memory
    ? isEnglish
      ? `User memory:\n${memory}`
      : `用戶記憶：\n${memory}`
    : "";
  return [toneLine, modeLine, buildSecretaryTagRules(isEnglish), memoryLine]
    .filter(Boolean)
    .join("\n\n");
}
