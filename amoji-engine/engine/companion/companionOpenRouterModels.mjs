/**
 * OpenRouter model ids — free tier first (hosted companion default).
 */
export const COMPANION_OPENROUTER_MODELS_SCHEMA = "amoji.companionOpenRouterModels.v1";

/** Zero-cost router — picks among OpenRouter free models. */
export const OPENROUTER_DEFAULT_FREE_MODEL = "openrouter/free";

/**
 * Fallback order when a model 429s or is temporarily unavailable.
 * Keep slugs aligned with OpenRouter `:free` variants.
 */
export const OPENROUTER_FREE_MODEL_FALLBACKS = Object.freeze([
  OPENROUTER_DEFAULT_FREE_MODEL,
  "google/gemma-3-12b-it:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
]);

/**
 * @param {string | undefined | null} requested
 * @param {string | undefined | null} presetModel
 * @param {(name: string) => boolean} [isLocalOllamaModel]
 */
export function resolveOpenRouterPrimaryModel(
  requested,
  presetModel,
  isLocalOllamaModel,
) {
  const envModel =
    process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_FREE_MODEL;
  if (requested && !isLocalOllamaModel(requested)) return requested;
  if (presetModel && !isLocalOllamaModel(presetModel)) return presetModel;
  return envModel;
}

/**
 * @param {string} primary
 */
export function buildOpenRouterModelChain(primary) {
  const head = String(primary || OPENROUTER_DEFAULT_FREE_MODEL).trim();
  const chain = [head];
  for (const id of OPENROUTER_FREE_MODEL_FALLBACKS) {
    if (!chain.includes(id)) chain.push(id);
  }
  return chain;
}

/**
 * @param {string | undefined | null} err
 */
export function isOpenRouterAuthError(err) {
  const msg = String(err || "").toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("user not found") ||
    msg.includes("invalid api key") ||
    msg.includes("missing authentication")
  );
}
