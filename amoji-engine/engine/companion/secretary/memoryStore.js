/**
 * Editable secretary memory + onboarding preferences (localStorage).
 */
export const MEMORY_STORE_SCHEMA = "amoji.secretary.memory.v1";
export const MEMORY_STORE_KEY = MEMORY_STORE_SCHEMA;

/**
 * @typedef {"work" | "life" | "both" | "chat"} HelpWith
 * @typedef {"professional" | "friendly" | "playful"} SecretaryTone
 * @typedef {{
 *   id: string,
 *   text: string,
 *   category?: string,
 *   updatedAt: number,
 * }} MemoryFact
 * @typedef {{
 *   morningBrief: boolean,
 *   tone: SecretaryTone,
 *   helpWith: HelpWith,
 *   onboarded: boolean,
 * }} SecretaryPreferences
 */

const DEFAULT_PREFS = {
  morningBrief: true,
  tone: "friendly",
  helpWith: "both",
  onboarded: false,
};

/**
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function readMemoryStore(storage = globalThis.localStorage) {
  if (!storage) {
    return { facts: [], preferences: { ...DEFAULT_PREFS } };
  }
  try {
    const raw = storage.getItem(MEMORY_STORE_KEY);
    if (!raw) {
      return { facts: [], preferences: { ...DEFAULT_PREFS } };
    }
    const parsed = JSON.parse(raw);
    return {
      facts: Array.isArray(parsed?.facts) ? parsed.facts : [],
      preferences: {
        ...DEFAULT_PREFS,
        ...(parsed?.preferences || {}),
      },
    };
  } catch {
    return { facts: [], preferences: { ...DEFAULT_PREFS } };
  }
}

/**
 * @param {{ facts: MemoryFact[], preferences: SecretaryPreferences }} store
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function writeMemoryStore(store, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(MEMORY_STORE_KEY, JSON.stringify(store));
}

/**
 * @param {string} text
 * @param {{ category?: string, storage?: Storage | null, now?: number }} [opts]
 */
export function addMemoryFact(text, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const now = opts.now ?? Date.now();
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  const store = readMemoryStore(storage);
  const fact = {
    id: `mem_${now}_${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    category: opts.category || "general",
    updatedAt: now,
  };
  store.facts.unshift(fact);
  writeMemoryStore(store, storage);
  return fact;
}

/**
 * @param {string} id
 * @param {{ storage?: Storage | null }} [opts]
 */
export function removeMemoryFact(id, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const store = readMemoryStore(storage);
  const next = store.facts.filter((f) => f.id !== id);
  if (next.length === store.facts.length) return false;
  writeMemoryStore({ ...store, facts: next }, storage);
  return true;
}

/**
 * @param {Partial<SecretaryPreferences>} prefs
 * @param {{ storage?: Storage | null }} [opts]
 */
export function savePreferences(prefs, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const store = readMemoryStore(storage);
  store.preferences = {
    ...store.preferences,
    ...prefs,
  };
  writeMemoryStore(store, storage);
  return store.preferences;
}

/**
 * @param {{ storage?: Storage | null }} [opts]
 */
export function getPreferences(opts = {}) {
  return readMemoryStore(opts.storage).preferences;
}

/**
 * @param {{ storage?: Storage | null, limit?: number }} [opts]
 */
export function memoryFactsForPrompt(opts = {}) {
  const limit = opts.limit ?? 8;
  const facts = readMemoryStore(opts.storage).facts.slice(0, limit);
  if (!facts.length) return "";
  return facts.map((f) => `- ${f.text}`).join("\n");
}

export const LAST_CHAT_SUMMARY_KEY = "amoji.secretary.lastChatSummary.v1";

/**
 * @param {string} summary
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function saveLastChatSummary(summary, storage = globalThis.localStorage) {
  if (!storage) return;
  const text = String(summary || "").trim();
  if (!text) return;
  storage.setItem(
    LAST_CHAT_SUMMARY_KEY,
    JSON.stringify({ text, updatedAt: Date.now() }),
  );
}

/**
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function readLastChatSummary(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(LAST_CHAT_SUMMARY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.text ? String(parsed.text) : null;
  } catch {
    return null;
  }
}
