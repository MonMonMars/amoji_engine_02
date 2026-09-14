/**
 * Ollama OpenAI-compatible client (local LLM on http://127.0.0.1:11434).
 */
export const COMPANION_OLLAMA_SCHEMA = "amoji.companionOllama.v1";

export const OLLAMA_DEFAULT_HOST = "http://127.0.0.1:11434";
export const OLLAMA_DEFAULT_MODEL = "qwen3:4b";

/** Hosts probed when auto-detecting local Ollama (also re-exported for legacy imports). */
export const OLLAMA_PROBE_HOSTS = Object.freeze([
  "http://localhost:11434",
  "http://127.0.0.1:11434",
  OLLAMA_DEFAULT_HOST,
]);
/** OpenAI-compatible clients (Cursor, etc.) expect a non-empty API key. */
export const OLLAMA_PLACEHOLDER_API_KEY = "ollama";

/**
 * @param {string} [base]
 */
export function normalizeOllamaBase(base) {
  const raw = String(base || OLLAMA_DEFAULT_HOST).trim();
  if (!raw) return OLLAMA_DEFAULT_HOST;
  return raw.replace(/\/v1\/?$/, "").replace(/\/$/, "");
}

/**
 * @param {string} [base]
 * @param {number} [timeoutMs]
 */
export async function isOllamaReachable(base, timeoutMs = 2500) {
  const host = normalizeOllamaBase(base);
  try {
    const res = await fetch(`${host}/api/tags`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * @param {string} [base]
 */
export async function listOllamaModels(base) {
  const host = normalizeOllamaBase(base);
  try {
    const res = await fetch(`${host}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const models = data?.models || [];
    return models
      .map((m) => String(m.name || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Pick the best available Ollama model.
 * @param {string[]} models
 * @param {string} [preferred]
 */
export function pickOllamaModel(models, preferred) {
  const list = Array.isArray(models) ? models : [];
  const want = String(preferred || "").trim();
  if (want && list.some((m) => m === want || m.startsWith(`${want}:`))) {
    return list.find((m) => m === want || m.startsWith(`${want}:`)) || want;
  }
  const score = (name) => {
    const n = name.toLowerCase();
    let s = 0;
    if (/qwen3:4b|qwen3-4b/.test(n)) s += 100;
    if (/qwen3:8b|qwen3-8b/.test(n)) s += 88;
    if (/qwen3/.test(n)) s += 75;
    if (/qwen2\.5|qwen2/.test(n)) s += 50;
    if (/llama3\.2|llama3\.1|llama3/.test(n)) s += 40;
    if (/gemma2|mistral|phi/.test(n)) s += 35;
    if (/70b|72b/.test(n)) s += 10;
    if (/4b|3b/.test(n)) s += 12;
    if (/8b|7b/.test(n)) s += 8;
    if (/:latest$/.test(n)) s += 2;
    return s;
  };
  return [...list].sort((a, b) => score(b) - score(a))[0] || want || OLLAMA_DEFAULT_MODEL;
}

/**
 * @param {{
 *   base?: string,
 *   model?: string,
 *   messages: { role: string, content: string }[],
 *   temperature?: number,
 *   fetchImpl?: typeof fetch,
 * }} opts
 */
export async function chatOllama(opts) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (!fetchImpl) return { ok: false, error: "no fetch" };

  const host = normalizeOllamaBase(opts.base);
  const models = await listOllamaModels(host);
  const model = pickOllamaModel(models, opts.model);

  const endpoint = `${host}/v1/chat/completions`;
  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OLLAMA_PLACEHOLDER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.75,
      stream: false,
      messages: opts.messages,
    }),
    signal: AbortSignal.timeout(180000),
  });

  const data = await res.json().catch(() => ({}));
  const reply = data?.choices?.[0]?.message?.content;
  if (!res.ok || !reply) {
    return {
      ok: false,
      error: data?.error?.message || data?.error || `HTTP ${res.status}`,
      model,
    };
  }
  return { ok: true, reply: String(reply).trim(), model, mode: "ollama" };
}
