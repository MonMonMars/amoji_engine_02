/**
 * Per-character chat history + starter prompts for the companion transcript.
 */
import {
  DEMO_STARTER_PROMPTS,
  pickTutorialStarterPrompts,
} from "./companionDemoDialogue.mjs";
import { loadAuthSession } from "../mobile/companionMobileAuth.js";

export const CHAT_HISTORY_SCHEMA = "amoji.companion.chatHistory.v1";
export const CHAT_HISTORY_MAX = 40;
export const CHAT_DOM_MAX = 20;
export const STARTER_PROMPT_COUNT = 4;
export const TUTORIAL_VISIT_STORAGE_KEY = "amoji.companion.tutorialVisit.v1";

/** @typedef {{ id: string, role: "user" | "assistant", text: string, ts: number }} ChatMessage */

/** Re-export demo starter pools for tests and docs. */
export const CHARACTER_STARTER_PROMPTS = DEMO_STARTER_PROMPTS;

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
 * Messages for createCompanionChat().setHistory — keeps LLM context without rendering transcript.
 * @param {string} characterId
 * @param {Storage | null | undefined} [storage]
 */
export function storedChatForLlm(characterId, storage = globalThis.localStorage) {
  return loadChatHistory(characterId, storage).map((m) => ({
    role: m.role,
    content: m.text,
  }));
}

/**
 * Stable per-browser visit id — rotates when storage is cleared; combined with auth userId when logged in.
 * @param {Storage | null | undefined} [storage]
 */
export function resolveTutorialSeed(storage = globalThis.localStorage) {
  const auth = loadAuthSession(storage);
  let visit = "";
  try {
    visit = storage?.getItem?.(TUTORIAL_VISIT_STORAGE_KEY) || "";
  } catch {
    visit = "";
  }
  if (!visit) {
    visit = `visit:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      storage?.setItem?.(TUTORIAL_VISIT_STORAGE_KEY, visit);
    } catch {
      /* private mode */
    }
  }
  if (auth?.userId) return `user:${auth.userId}|${visit}`;
  return visit;
}

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 * @param {{ storage?: Storage | null, seed?: string, max?: number, detailed?: boolean }} [opts]
 */
export function starterPromptsForCharacter(characterId, isEnglish = false, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage;
  const seed = opts.seed ?? resolveTutorialSeed(storage);
  const detailed = pickTutorialStarterPrompts(characterId, isEnglish, {
    max: opts.max ?? STARTER_PROMPT_COUNT,
    seed,
  });
  return opts.detailed ? detailed : detailed.map((p) => p.text);
}

/**
 * @param {ChatMessage[]} messages
 */
export function hasUserMessages(messages) {
  return Array.isArray(messages) && messages.some((m) => m.role === "user");
}
