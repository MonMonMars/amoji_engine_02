/**
 * Browser-stored API keys for hosted/cloud mode (BYOK — no Vercel env needed).
 */
import { readProviderApiKey } from "./companionLlmProviders.js";

export const COMPANION_CLIENT_KEYS_SCHEMA = "amoji.companionClientKeys.v1";

/** @returns {boolean} */
export function hasClientGroqKey(storage = globalThis.localStorage) {
  const key = readProviderApiKey("groq", storage);
  return Boolean(key && key.startsWith("gsk_"));
}

/** @returns {boolean} */
export function hasClientOpenRouterKey(storage = globalThis.localStorage) {
  const or =
    readProviderApiKey("openrouter-gemma", storage) ||
    readProviderApiKey("openrouter-llama", storage);
  return Boolean(or && or.startsWith("sk-or-"));
}

/** @returns {boolean} */
export function hasAnyClientCloudKey(storage = globalThis.localStorage) {
  return hasClientGroqKey(storage) || hasClientOpenRouterKey(storage);
}

/**
 * Pick key to send with /api/chat for the active provider.
 * @param {string} providerId
 * @param {Storage | null} [storage]
 */
export function resolveClientApiKey(providerId, storage = globalThis.localStorage) {
  const id = String(providerId || "auto");
  if (id === "groq" || id === "auto") {
    const groq = readProviderApiKey("groq", storage);
    if (groq) return groq;
  }
  if (id.startsWith("openrouter") || id === "auto") {
    const or =
      readProviderApiKey("openrouter-gemma", storage) ||
      readProviderApiKey("openrouter-llama", storage);
    if (or) return or;
  }
  if (id === "together") return readProviderApiKey("together", storage) || null;
  return null;
}

/**
 * @param {string} rawKey
 * @returns {"groq" | "openrouter-gemma" | null}
 */
export function inferKeyProvider(rawKey) {
  const key = String(rawKey || "").trim();
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("sk-or-")) return "openrouter-gemma";
  return null;
}
