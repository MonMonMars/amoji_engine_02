/**
 * Conversation-driven UI — LLM [ui:…] tags + light user-text inference.
 */
import { COMPANION_CHARACTERS } from "./companionCharacterCatalog.js";
import {
  parseUiIntentTags,
  stripUiIntentTags,
  UI_MODES,
  UI_TABS,
} from "./companionUiIntentTags.js";

export const COMPANION_UI_INTENT_SCHEMA = "amoji.companionUiIntent.v1";

export { UI_TABS, UI_MODES, parseUiIntentTags, stripUiIntentTags };

/**
 * @typedef {import("./companionUiIntentTags.js").UiIntent} UiIntent
 */

/**
 * @param {string | null | undefined} text
 * @param {boolean} [isEnglish]
 * @returns {UiIntent[]}
 */
export function inferUiIntentFromUserText(text, isEnglish = false) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  /** @type {UiIntent[]} */
  const intents = [];

  const push = (intent) => {
    if (!intents.some((i) => i.type === intent.type && i.value === intent.value)) {
      intents.push(intent);
    }
  };

  if (isEnglish) {
    if (/\b(today|briefing|morning brief|what.?s on today)\b/i.test(lower)) {
      push({ type: "tab", value: "today" });
    }
    if (/\b(tasks?|to-?do|task list|my tasks)\b/i.test(lower)) {
      push({ type: "tab", value: "tasks" });
    }
    if (/\b(settings|preferences|my profile|memory)\b/i.test(lower)) {
      push({ type: "tab", value: "me" });
    }
    if (/\b(chat|talk|let.?s talk)\b/i.test(lower) && !/task/i.test(lower)) {
      push({ type: "tab", value: "chat" });
    }
    if (/\b(work mode|focus mode|i.?m working)\b/i.test(lower)) {
      push({ type: "mode", value: "work" });
    }
    if (/\b(life mode|personal mode)\b/i.test(lower)) {
      push({ type: "mode", value: "life" });
    }
    if (/\b(let.?s chill|chill mode|just chill|relax|take it easy)\b/i.test(lower)) {
      push({ type: "mode", value: "chill" });
    }
    if (/\b(change character|switch character|another companion|pick someone else)\b/i.test(lower)) {
      push({ type: "character", value: "pick" });
    }
    if (/\b(open settings|show settings)\b/i.test(lower)) {
      push({ type: "settings" });
    }
    if (/\b(change voice|switch voice|different voice)\b/i.test(lower)) {
      push({ type: "voice" });
    }
    if (/\b(speak english|english please|in english)\b/i.test(lower)) {
      push({ type: "lang", value: "en" });
    }
    if (/\b(speak cantonese|cantonese please|in cantonese)\b/i.test(lower)) {
      push({ type: "lang", value: "yue" });
    }
    for (const id of Object.keys(COMPANION_CHARACTERS)) {
      const def = COMPANION_CHARACTERS[id];
      const en = def.name.en.toLowerCase();
      if (en.length > 2 && new RegExp(`\\b(switch to|be|play as|i want)\\s+${en}\\b`, "i").test(lower)) {
        push({ type: "character", value: id });
      }
    }
  } else {
    if (/今日|今日概覽|早晨簡報|今日有咩/.test(raw)) push({ type: "tab", value: "today" });
    if (/任務|待辦|to.?do|task/i.test(raw) && !/加任務/.test(raw)) {
      push({ type: "tab", value: "tasks" });
    }
    if (/設定|偏好|記憶|我嘅資料/.test(raw)) push({ type: "tab", value: "me" });
    if (/傾計|聊天|講嘢|同你講/.test(raw) && !/任務/.test(raw)) {
      push({ type: "tab", value: "chat" });
    }
    if (/工作模式/.test(raw)) push({ type: "mode", value: "work" });
    if (/生活模式/.test(raw)) push({ type: "mode", value: "life" });
    if (/閒聊模式|放鬆模式|chill/i.test(raw)) push({ type: "mode", value: "chill" });
    if (/換角色|轉角色|揀另一個|換同伴|轉同伴|其他角色/.test(raw)) {
      push({ type: "character", value: "pick" });
    }
    if (/開設定|打開設定|設定頁/.test(raw)) push({ type: "settings" });
    if (/換語音|轉語音|另一把聲/.test(raw)) push({ type: "voice" });
    if (/講英文|用英文|english/i.test(raw)) push({ type: "lang", value: "en" });
    if (/講粵語|用粵語|廣東話/.test(raw)) push({ type: "lang", value: "yue" });
    for (const id of Object.keys(COMPANION_CHARACTERS)) {
      const yue = COMPANION_CHARACTERS[id].name.yue;
      if (yue && raw.includes(yue) && /換|轉|揀|想同|做/.test(raw)) {
        push({ type: "character", value: id });
      }
    }
  }

  return intents;
}

/**
 * LLM tags override inferred user intents for the same type.
 * @param {UiIntent[]} fromUser
 * @param {UiIntent[]} fromTags
 */
export function mergeUiIntents(fromUser = [], fromTags = []) {
  const tagTypes = new Set(fromTags.map((i) => i.type));
  const merged = [...fromTags];
  for (const intent of fromUser) {
    if (!tagTypes.has(intent.type)) merged.push(intent);
  }
  return merged;
}

/**
 * @param {boolean} [isEnglish]
 * @param {{ surface?: "secretary" | "companion" }} [opts]
 */
export function buildUiIntentPromptFragment(isEnglish = false, opts = {}) {
  const surface = opts.surface === "companion" ? "companion" : "secretary";
  if (surface === "companion") {
    return isEnglish
      ? [
          "UI control (hidden from user — do NOT tell them to press buttons):",
          "When the user wants to change companion, voice, language, or settings, add ONE [ui:…] tag before [mood:…].",
          "Examples: switch character → [ui:character:nova] or [ui:character] to open picker;",
          "settings → [ui:settings]; voice → [ui:voice]; English → [ui:lang:en]; Cantonese → [ui:lang:yue].",
          "Still answer naturally in speech — the app changes UI from your tag.",
        ].join(" ")
      : [
          "UI 控制（用戶睇唔到 — 唔好叫佢撳掣）：",
          "用戶想換角色、語音、語言或設定時，喺 [mood:…] 前加一個 [ui:…] tag。",
          "例：換角色 → [ui:character:nova] 或 [ui:character] 開選人；",
          "設定 → [ui:settings]；語音 → [ui:voice]；英文 → [ui:lang:en]；粵語 → [ui:lang:yue]。",
          "口語照答，界面會跟 tag 自動切換。",
        ].join(" ");
  }
  return isEnglish
    ? [
        "UI control (hidden — never ask user to tap tabs or mode chips):",
        "When navigation or tone mode should change, add [ui:tab:today|chat|tasks|me] and/or [ui:mode:work|life|chill] before [mood:…].",
        "Examples: show tasks → [ui:tab:tasks]; work tone → [ui:mode:work]; profile → [ui:tab:me].",
        "Reply naturally; the app switches panels from your tags.",
      ].join(" ")
    : [
        "UI 控制（用戶睇唔到 — 唔好叫佢撳 tab 或模式掣）：",
        "需要轉頁或語氣模式時，喺 [mood:…] 前加 [ui:tab:today|chat|tasks|me] 同/或 [ui:mode:work|life|chill]。",
        "例：睇任務 → [ui:tab:tasks]；工作語氣 → [ui:mode:work]；我嘅資料 → [ui:tab:me]。",
        "口語照答，界面會跟 tag 自動切。",
      ].join(" ");
}

/**
 * @param {UiIntent[]} intents
 * @param {{
 *   switchTab?: (tab: string) => void,
 *   setMode?: (mode: string) => void,
 *   switchCharacter?: (id: string) => void | Promise<void>,
 *   openCharacterPicker?: () => void,
 *   openSettings?: () => void,
 *   openVoicePicker?: () => void,
 *   switchLanguage?: (lang: "en" | "yue") => void | Promise<void>,
 *   setMic?: (on: boolean) => void | Promise<void>,
 *   closeOverlays?: () => void,
 *   onContextChange?: (ctx: { tab?: string, mode?: string, character?: string }) => void,
 * }} handlers
 */
export async function applyUiIntents(intents, handlers = {}) {
  if (!intents?.length) return { applied: [] };
  /** @type {UiIntent[]} */
  const applied = [];
  /** @type {{ tab?: string, mode?: string, character?: string }} */
  const ctx = {};

  for (const intent of intents) {
    switch (intent.type) {
      case "tab":
        if (intent.value && handlers.switchTab) {
          handlers.switchTab(intent.value);
          ctx.tab = intent.value;
          applied.push(intent);
        }
        break;
      case "mode":
        if (intent.value && handlers.setMode) {
          handlers.setMode(intent.value);
          ctx.mode = intent.value;
          applied.push(intent);
        }
        break;
      case "character":
        if (intent.value === "pick" && handlers.openCharacterPicker) {
          handlers.openCharacterPicker();
          applied.push(intent);
        } else if (
          intent.value &&
          intent.value !== "pick" &&
          COMPANION_CHARACTERS[intent.value] &&
          handlers.switchCharacter
        ) {
          await handlers.switchCharacter(intent.value);
          ctx.character = intent.value;
          applied.push(intent);
        }
        break;
      case "settings":
        if (handlers.openSettings) {
          handlers.openSettings();
          applied.push(intent);
        } else if (handlers.switchTab) {
          handlers.switchTab("me");
          ctx.tab = "me";
          applied.push(intent);
        }
        break;
      case "voice":
        if (handlers.openVoicePicker) {
          handlers.openVoicePicker();
          applied.push(intent);
        }
        break;
      case "lang":
        if (intent.value && handlers.switchLanguage) {
          await handlers.switchLanguage(intent.value === "en" ? "en" : "yue");
          applied.push(intent);
        }
        break;
      case "mic":
        if (handlers.setMic) {
          await handlers.setMic(intent.value === "on");
          applied.push(intent);
        }
        break;
      case "close":
        handlers.closeOverlays?.();
        applied.push(intent);
        break;
      default:
        break;
    }
  }

  if (Object.keys(ctx).length) handlers.onContextChange?.(ctx);
  return { applied };
}

/**
 * @param {UiIntent} intent
 * @param {boolean} [isEnglish]
 */
export function uiIntentLabel(intent, isEnglish = false) {
  if (!intent) return "";
  if (intent.type === "tab") {
    const map = isEnglish
      ? { today: "Today", chat: "Chat", tasks: "Tasks", me: "Me" }
      : { today: "今日", chat: "傾計", tasks: "任務", me: "我" };
    return map[intent.value || ""] || intent.value || "";
  }
  if (intent.type === "mode") {
    const map = isEnglish
      ? { work: "Work", life: "Life", chill: "Chill" }
      : { work: "工作", life: "生活", chill: "閒聊" };
    return map[intent.value || ""] || intent.value || "";
  }
  if (intent.type === "character" && intent.value && intent.value !== "pick") {
    const def = COMPANION_CHARACTERS[intent.value];
    if (def) return isEnglish ? def.name.en : def.name.yue;
  }
  return "";
}
