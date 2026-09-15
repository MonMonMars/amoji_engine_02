/**
 * Secretary conversation modes — Work / Life / Chill.
 */
export const SECRETARY_MODES = ["work", "life", "chill"];
export const SECRETARY_MODE_STORAGE_KEY = "amoji.secretary.mode.v1";

/** @typedef {"work" | "life" | "chill"} SecretaryMode */

/**
 * @param {string | null | undefined} value
 */
export function normalizeSecretaryMode(value) {
  const mode = String(value || "work").toLowerCase();
  if (mode === "life" || mode === "chill") return mode;
  return "work";
}

/**
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function readSecretaryMode(storage = globalThis.localStorage) {
  if (!storage) return "work";
  return normalizeSecretaryMode(storage.getItem(SECRETARY_MODE_STORAGE_KEY));
}

/**
 * @param {SecretaryMode} mode
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function persistSecretaryMode(mode, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(SECRETARY_MODE_STORAGE_KEY, normalizeSecretaryMode(mode));
}

/**
 * @param {SecretaryMode} mode
 * @param {boolean} [isEn]
 */
export function modeLabel(mode, isEn = false) {
  const m = normalizeSecretaryMode(mode);
  if (isEn) {
    if (m === "life") return "Life";
    if (m === "chill") return "Chill";
    return "Work";
  }
  if (m === "life") return "生活";
  if (m === "chill") return "閒聊";
  return "工作";
}

/**
 * @param {SecretaryMode} mode
 * @param {boolean} [isEn]
 */
export function modePromptFragment(mode, isEn = false) {
  const m = normalizeSecretaryMode(mode);
  if (isEn) {
    if (m === "life") {
      return "Mode: Life. Help with errands, habits, plans, and personal admin. Stay warm and practical.";
    }
    if (m === "chill") {
      return "Mode: Chill. Prioritize friendly chat, stories, and emotional support. Do not push tasks unless asked.";
    }
    return "Mode: Work. Be concise and structured. Help plan, draft, prioritize, and capture tasks.";
  }
  if (m === "life") {
    return "模式：生活。幫手處理日常、習慣、計劃同個人瑣事。語氣溫暖實用。";
  }
  if (m === "chill") {
    return "模式：閒聊。以傾計、陪伴、情緒支持為主。除非用戶要求，唔好主動推任務。";
  }
  return "模式：工作。回覆要清晰有條理，幫手計劃、起草、排優先次序同記低任務。";
}

/**
 * @param {boolean} [isEn]
 */
export function discoverPrompts(isEn = false) {
  if (isEn) {
    return [
      "Plan my top 3 for today",
      "Draft a short reply email",
      "Remind me to call mom tonight",
      "Just talk — how was your day?",
    ];
  }
  return [
    "幫我排今日最重要三件事",
    "幫我起草一段短回覆",
    "今晚提醒我打電話俾媽媽",
    "閒聊一下 — 今日過得點呀？",
  ];
}
