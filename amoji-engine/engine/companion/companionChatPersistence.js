/**
 * Per-character chat history + starter prompts for the companion transcript.
 */
export const CHAT_HISTORY_SCHEMA = "amoji.companion.chatHistory.v1";
export const CHAT_HISTORY_MAX = 40;
export const CHAT_DOM_MAX = 20;

/** @typedef {{ id: string, role: "user" | "assistant", text: string, ts: number }} ChatMessage */

/** @type {Readonly<Record<string, { en: string[], yue: string[] }>>} */
export const CHARACTER_STARTER_PROMPTS = Object.freeze({
  nova: {
    en: ["How are you today?", "Tell me something interesting", "Help me plan my day"],
    yue: ["今日點呀？", "同我講件有趣嘅事", "幫我計劃今日"],
  },
  amoji: {
    en: ["What's fun today?", "Roast me gently", "Tell me a joke"],
    yue: ["今日有咩好玩？", "輕鬆吐槽我一下", "講個笑話俾我聽"],
  },
  sora: {
    en: ["I need calm advice", "Explain something simply", "How do I unwind?"],
    yue: ["我需要啲淡定建議", "用簡單方式解釋件事", "點樣放鬆心情？"],
  },
  default: {
    en: ["Say hi", "What can you do?", "Let's chat"],
    yue: ["打個招呼", "你可以做咩？", "我哋傾下偈"],
  },
});

/**
 * @param {string} characterId
 */
export function chatHistoryStorageKey(characterId) {
  const id = String(characterId || "amoji").toLowerCase();
  return `amoji.companion.chatHistory.${CHAT_HISTORY_SCHEMA}.${id}`;
}

/**
 * @param {ChatMessage[]} messages
 * @param {number} [max]
 */
export function trimChatHistory(messages, max = CHAT_HISTORY_MAX) {
  if (!Array.isArray(messages)) return [];
  if (messages.length <= max) return messages;
  return messages.slice(messages.length - max);
}

/**
 * @param {string} characterId
 * @param {Storage | null | undefined} [storage]
 */
export function loadChatHistory(characterId, storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(chatHistoryStorageKey(characterId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.messages)) return [];
    return trimChatHistory(
      parsed.messages
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.text === "string" &&
            m.text.trim(),
        )
        .map((m) => ({
          id: String(m.id || `${m.role}-${m.ts || Date.now()}`),
          role: m.role,
          text: String(m.text),
          ts: Number(m.ts) || Date.now(),
        })),
    );
  } catch {
    return [];
  }
}

/**
 * @param {string} characterId
 * @param {ChatMessage[]} messages
 * @param {Storage | null | undefined} [storage]
 */
export function saveChatHistory(characterId, messages, storage = globalThis.localStorage) {
  if (!storage) return [];
  const trimmed = trimChatHistory(messages);
  try {
    storage.setItem(
      chatHistoryStorageKey(characterId),
      JSON.stringify({
        schema: CHAT_HISTORY_SCHEMA,
        characterId: String(characterId || "amoji").toLowerCase(),
        messages: trimmed,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    /* quota / private mode */
  }
  return trimmed;
}

/**
 * @param {string} characterId
 * @param {{ role: "user" | "assistant", text: string }} entry
 * @param {Storage | null | undefined} [storage]
 */
export function appendChatHistory(characterId, entry, storage = globalThis.localStorage) {
  const text = String(entry?.text || "").trim();
  if (!text || (entry.role !== "user" && entry.role !== "assistant")) {
    return loadChatHistory(characterId, storage);
  }
  const existing = loadChatHistory(characterId, storage);
  const next = [
    ...existing,
    {
      id: `${entry.role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: entry.role,
      text,
      ts: Date.now(),
    },
  ];
  return saveChatHistory(characterId, next, storage);
}

/**
 * @param {string} characterId
 * @param {Storage | null | undefined} [storage]
 */
export function clearChatHistory(characterId, storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.removeItem(chatHistoryStorageKey(characterId));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 */
export function starterPromptsForCharacter(characterId, isEnglish = false) {
  const id = String(characterId || "amoji").toLowerCase();
  const pack = CHARACTER_STARTER_PROMPTS[id] || CHARACTER_STARTER_PROMPTS.default;
  const lang = isEnglish ? "en" : "yue";
  const prompts = pack[lang] || CHARACTER_STARTER_PROMPTS.default[lang];
  return prompts.slice(0, 3);
}

/**
 * @param {ChatMessage[]} messages
 */
export function hasUserMessages(messages) {
  return Array.isArray(messages) && messages.some((m) => m.role === "user");
}
