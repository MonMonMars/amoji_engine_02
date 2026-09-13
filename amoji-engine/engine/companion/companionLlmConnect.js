/**
 * Auto-detect and connect the best available LLM — no manual API key prompts.
 */
import {
  isOllamaReachable,
  listOllamaModels,
  pickOllamaModel,
  OLLAMA_DEFAULT_HOST,
} from "./companionOllama.js";
import { getLlmProvider, LLM_PROVIDERS } from "./companionLlmProviders.js";

export const COMPANION_LLM_CONNECT_SCHEMA = "amoji.companionLlmConnect.v1";

export const OLLAMA_PROBE_HOSTS = Object.freeze([
  "http://localhost:11434",
  "http://127.0.0.1:11434",
  OLLAMA_DEFAULT_HOST,
]);

/**
 * @param {string[]} [hosts]
 */
export async function probeOllamaDirect(hosts = OLLAMA_PROBE_HOSTS) {
  for (const host of hosts) {
    const up = await isOllamaReachable(host, 3000);
    if (!up) continue;
    const models = await listOllamaModels(host);
    return { ok: true, host, models };
  }
  return { ok: false, host: null, models: [] };
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchLlmStatus(fetchImpl = globalThis.fetch) {
  if (!fetchImpl) return null;
  try {
    const res = await fetchImpl("/api/llm/status");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * @param {{ ollama?: { ok?: boolean, models?: string[] }, groq?: { ok?: boolean }, openai?: { ok?: boolean }, openrouter?: { ok?: boolean }, together?: { ok?: boolean } } | null} status
 * @param {{ ok?: boolean, models?: string[] }} [directOllama]
 */
export function rankAvailableProviders(status, directOllama) {
  const ollamaModels =
    status?.ollama?.models ||
    (directOllama?.ok ? directOllama.models : []) ||
    [];
  const ollamaUp = Boolean(status?.ollama?.ok || directOllama?.ok);

  /** @type {{ id: string, model?: string, reason: string }[]} */
  const ranked = [];

  if (ollamaUp && ollamaModels.length) {
    const has4b = ollamaModels.some((m) => m === "qwen3:4b" || m.startsWith("qwen3:4b"));
    const has8b = ollamaModels.some((m) => m === "qwen3:8b" || m.startsWith("qwen3:8b"));
    if (has4b) ranked.push({ id: "ollama-qwen4", model: "qwen3:4b", reason: "local qwen3:4b" });
    if (has8b) ranked.push({ id: "ollama-qwen8", model: "qwen3:8b", reason: "local qwen3:8b" });
    if (!has4b && !has8b) {
      const model = pickOllamaModel(ollamaModels);
      ranked.push({ id: "auto", model, reason: `local ${model}` });
    }
  }

  if (ollamaUp) ranked.push({ id: "auto", reason: "lab proxy → ollama" });

  if (status?.groq?.ok) ranked.push({ id: "groq", reason: "server Groq key" });
  if (status?.openrouter?.ok) {
    ranked.push({ id: "openrouter-gemma", reason: "server OpenRouter key" });
  }
  if (status?.together?.ok) ranked.push({ id: "together", reason: "server Together key" });
  if (status?.openai?.ok) ranked.push({ id: "auto", reason: "server OpenAI key" });

  ranked.push({ id: "basic", reason: "offline fallback" });

  return ranked;
}

/**
 * Pick first provider id that exists in catalog.
 * @param {{ id: string }[]} ranked
 */
export function pickBestProviderId(ranked) {
  for (const entry of ranked) {
    if (LLM_PROVIDERS.some((p) => p.id === entry.id) && entry.id !== "basic") {
      return entry;
    }
  }
  return ranked.find((e) => e.id === "basic") || { id: "auto", reason: "default" };
}

/**
 * @param {{
 *   chat: { setProvider: (id: string, opts?: object) => object },
 *   fetchImpl?: typeof fetch,
 * }} opts
 */
export async function autoConnectLlm(opts) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const [status, direct] = await Promise.all([
    fetchLlmStatus(fetchImpl),
    probeOllamaDirect(),
  ]);

  const ranked = rankAvailableProviders(status, direct);
  const best = pickBestProviderId(ranked);
  const info = opts.chat.setProvider(best.id, { model: best.model });

  return {
    ok: best.id !== "basic",
    providerId: best.id,
    reason: best.reason,
    status,
    directOllama: direct,
    ranked,
    info,
  };
}

/**
 * Which provider chips are reachable without user typing keys.
 * @param {{ ollama?: { ok?: boolean, models?: string[] }, groq?: { ok?: boolean }, openrouter?: { ok?: boolean }, together?: { ok?: boolean } } | null} status
 * @param {{ ok?: boolean, models?: string[] }} [directOllama]
 */
export function probeProviderAvailability(status, directOllama) {
  const ollamaModels =
    status?.ollama?.models ||
    (directOllama?.ok ? directOllama.models : []) ||
    [];
  const ollamaUp = Boolean(status?.ollama?.ok || directOllama?.ok);

  /** @type {Record<string, boolean>} */
  const available = {};

  for (const p of LLM_PROVIDERS) {
    switch (p.id) {
      case "auto":
        available[p.id] = ollamaUp || Boolean(status?.groq?.ok || status?.openai?.ok);
        break;
      case "ollama-qwen4":
        available[p.id] = ollamaModels.some(
          (m) => m === "qwen3:4b" || m.startsWith("qwen3:4b"),
        );
        break;
      case "ollama-qwen8":
        available[p.id] = ollamaModels.some(
          (m) => m === "qwen3:8b" || m.startsWith("qwen3:8b"),
        );
        break;
      case "groq":
        available[p.id] = Boolean(status?.groq?.ok);
        break;
      case "openrouter-gemma":
      case "openrouter-llama":
        available[p.id] = Boolean(status?.openrouter?.ok);
        break;
      case "together":
        available[p.id] = Boolean(status?.together?.ok);
        break;
      case "basic":
        available[p.id] = true;
        break;
      default:
        available[p.id] = false;
        break;
    }
  }
  return available;
}
