/**
 * Preset LLM providers for the companion — local Ollama + free cloud APIs.
 */
export const COMPANION_LLM_PROVIDERS_SCHEMA = "amoji.companionLlmProviders.v1";

export const LLM_PROVIDER_STORAGE_KEY = "amoji.companion.llmProvider";

/** @typedef {{
 *   id: string,
 *   label: string,
 *   short: string,
 *   description: string,
 *   url: string,
 *   model: string,
 *   needsKey: boolean,
 *   keyStorageKey?: string,
 *   kind: "proxy" | "local" | "cloud-free" | "offline",
 * }} CompanionLlmProvider */

/** @type {readonly CompanionLlmProvider[]} */
export const LLM_PROVIDERS = Object.freeze([
  {
    id: "auto",
    label: "Auto",
    short: "Auto",
    description: "Lab proxy — tries Ollama, then server Groq/OpenAI, then basic",
    url: "",
    model: "",
    needsKey: false,
    kind: "proxy",
  },
  {
    id: "ollama-qwen4",
    label: "Qwen 4B",
    short: "Qwen4",
    description: "Local Ollama — qwen3:4b (fast, D:\\Ollama)",
    url: "http://localhost:11434/v1",
    model: "qwen3:4b",
    needsKey: false,
    kind: "local",
  },
  {
    id: "ollama-qwen8",
    label: "Qwen 8B",
    short: "Qwen8",
    description: "Local Ollama — qwen3:8b (smarter, slower)",
    url: "http://localhost:11434/v1",
    model: "qwen3:8b",
    needsKey: false,
    kind: "local",
  },
  {
    id: "groq",
    label: "Groq",
    short: "Groq",
    description: "Free fast cloud — get key at console.groq.com",
    url: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    needsKey: true,
    keyStorageKey: "amoji.companion.groqKey",
    kind: "cloud-free",
  },
  {
    id: "openrouter-gemma",
    label: "Gemma free",
    short: "Gemma",
    description: "OpenRouter free Gemma model",
    url: "https://openrouter.ai/api/v1",
    model: "google/gemma-2-9b-it:free",
    needsKey: true,
    keyStorageKey: "amoji.companion.openrouterKey",
    kind: "cloud-free",
  },
  {
    id: "openrouter-llama",
    label: "Llama free",
    short: "OR Llama",
    description: "OpenRouter free Llama 3.2",
    url: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.2-3b-instruct:free",
    needsKey: true,
    keyStorageKey: "amoji.companion.openrouterKey",
    kind: "cloud-free",
  },
  {
    id: "together",
    label: "Together",
    short: "Together",
    description: "Together AI — signup free credits",
    url: "https://api.together.xyz/v1",
    model: "meta-llama/Llama-3.2-3B-Instruct-Turbo",
    needsKey: true,
    keyStorageKey: "amoji.companion.togetherKey",
    kind: "cloud-free",
  },
  {
    id: "basic",
    label: "Basic",
    short: "Basic",
    description: "Offline canned replies — no LLM",
    url: "local",
    model: "",
    needsKey: false,
    kind: "offline",
  },
]);

/**
 * @param {string} [id]
 * @returns {CompanionLlmProvider}
 */
export function getLlmProvider(id) {
  const found = LLM_PROVIDERS.find((p) => p.id === id);
  return found || LLM_PROVIDERS[0];
}

/**
 * Providers shown in the UI — hides local Ollama presets when hosted online.
 * @param {boolean} [hosted]
 */
export function getVisibleLlmProviders(hosted = false) {
  if (!hosted) return LLM_PROVIDERS;
  return LLM_PROVIDERS.filter((p) => p.kind !== "local");
}

/**
 * @param {string} providerId
 * @param {Storage | null} [storage]
 */
export function readProviderApiKey(providerId, storage = globalThis.localStorage) {
  const provider = getLlmProvider(providerId);
  if (!provider.needsKey || !provider.keyStorageKey || !storage) return "";
  return String(storage.getItem(provider.keyStorageKey) || "").trim();
}

/**
 * @param {string} providerId
 * @param {string} key
 * @param {Storage | null} [storage]
 */
export function saveProviderApiKey(providerId, key, storage = globalThis.localStorage) {
  const provider = getLlmProvider(providerId);
  if (!provider.keyStorageKey || !storage) return;
  const trimmed = String(key || "").trim();
  if (trimmed) storage.setItem(provider.keyStorageKey, trimmed);
  else storage.removeItem(provider.keyStorageKey);
}

/**
 * Resolve url/model/key for a provider preset.
 * @param {string} providerId
 * @param {{ storage?: Storage | null, fallbackKey?: string }} [opts]
 */
export function resolveProviderConfig(providerId, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage;
  const provider = getLlmProvider(providerId);
  if (provider.id === "basic") {
    return {
      provider,
      url: null,
      model: "",
      apiKey: null,
      forceLocal: true,
      mode: "local",
    };
  }
  if (provider.id === "auto") {
    return {
      provider,
      url: null,
      model: opts.fallbackModel || "qwen3:4b",
      apiKey: null,
      forceLocal: false,
      mode: "proxy",
    };
  }
  const storedKey = readProviderApiKey(provider.id, storage);
  const apiKey = storedKey || String(opts.fallbackKey || "").trim() || null;
  const isOllama =
    provider.kind === "local" || /11434|ollama|localhost/i.test(provider.url);
  const mode = isOllama ? "ollama" : "online";
  const proxyOnly = provider.needsKey && !apiKey;
  return {
    provider,
    url: proxyOnly ? null : provider.url.replace(/\/$/, ""),
    model: provider.model,
    apiKey: provider.needsKey ? apiKey : isOllama ? "ollama" : null,
    proxyOnly,
    forceLocal: false,
    mode: proxyOnly ? "proxy" : mode,
  };
}

/**
 * @param {string} mode
 * @param {string} [model]
 */
export function formatLlmModeLabel(mode, model) {
  const m = String(mode || "local");
  const suffix = model ? ` · ${model}` : "";
  switch (m) {
    case "ollama":
      return `ollama${suffix}`;
    case "online":
      return `online${suffix}`;
    case "proxy":
      return `auto${suffix}`;
    case "local-fallback":
      return `basic brain${suffix}`;
    case "local":
      return "basic brain";
    default:
      return `${m}${suffix}`;
  }
}
