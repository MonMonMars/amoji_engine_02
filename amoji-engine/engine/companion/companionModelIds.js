/**
 * Shared model-id helpers — safe for browser + server bundles.
 */

/** Ollama/local model ids must not be forwarded to OpenRouter (e.g. qwen3:4b). */
export function isOllamaLocalModel(model) {
  const m = String(model || "").trim();
  if (!m) return false;
  if (/^openrouter\//i.test(m) || m.includes("/")) return false;
  return /qwen|ollama|llama3|gemma2|mistral|phi|deepseek/i.test(m);
}
