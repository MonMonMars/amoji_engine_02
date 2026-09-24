/**
 * Shared chat API logic — local lab server + Vercel/cloud deploy.
 */
import { CANTONESE_COMPANION_PROMPT } from "./companionBodyMotion.js";
import {
  chatOllama,
  isOllamaReachable,
  listOllamaModels,
  pickOllamaModel,
  OLLAMA_DEFAULT_HOST,
} from "./companionOllama.js";
import { getLlmProvider } from "./companionLlmProviders.js";
import { isOllamaLocalModel } from "./companionModelIds.js";
import { localCompanionReply } from "./companionLocalReply.mjs";
import { pickLocalChatReply } from "./secretary/secretaryLocalReply.mjs";
import { buildActionLlmContext } from "./companionActionIntent.js";
import {
  fetchWebContextForChat,
  shouldTryWebSearch,
} from "./companionWebSearch.mjs";
import {
  buildOpenRouterModelChain,
  isOpenRouterAuthError,
  OPENROUTER_DEFAULT_FREE_MODEL,
  resolveOpenRouterPrimaryModel,
} from "./companionOpenRouterModels.mjs";
import {
  buildSessionReplyLanguageRule,
  replyLangFromChatBody,
} from "./companionSessionReplyLanguage.mjs";

export const CHAT_API_HANDLER_SCHEMA = "amoji.chatApiHandler.v3";

/** OpenRouter treats omitted max_tokens as the full context window and 402s low-credit keys. */
export const CLOUD_CHAT_MAX_TOKENS = 1024;

const OLLAMA_HOST_CANDIDATES = [
  process.env.OLLAMA_HOST,
  process.env.OLLAMA_BASE_URL,
  "http://localhost:11434",
  "http://127.0.0.1:11434",
  OLLAMA_DEFAULT_HOST,
].filter(Boolean);

export function isCloudDeploy() {
  return (
    process.env.VERCEL === "1" ||
    process.env.AMOJI_CLOUD_ONLY === "1" ||
    process.env.CF_PAGES === "1"
  );
}

export function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra,
  };
}

export { isOllamaLocalModel } from "./companionModelIds.js";

/**
 * Pick an OpenRouter model id — never pass through Ollama-only names from the client.
 * @param {string | undefined | null} requested
 * @param {string | undefined | null} presetModel
 */
export function resolveOpenRouterModel(requested, presetModel) {
  return resolveOpenRouterPrimaryModel(
    requested,
    presetModel,
    isOllamaLocalModel,
  );
}

async function resolveOllamaHost() {
  if (isCloudDeploy()) {
    return { host: null, models: [], up: false };
  }
  for (const host of OLLAMA_HOST_CANDIDATES) {
    if (await isOllamaReachable(host)) {
      return {
        host,
        models: await listOllamaModels(host),
        up: true,
      };
    }
  }
  return { host: OLLAMA_HOST_CANDIDATES[0] || OLLAMA_DEFAULT_HOST, models: [], up: false };
}

export async function getLlmStatusPayload() {
  const ollama = await resolveOllamaHost();
  const groq = Boolean(process.env.GROQ_API_KEY);
  const openrouter = Boolean(process.env.OPENROUTER_API_KEY);
  const together = Boolean(process.env.TOGETHER_API_KEY);
  const openai = Boolean(process.env.OPENAI_API_KEY || process.env.AMOJI_LLM_KEY);
  return {
    ok: true,
    hosted: isCloudDeploy(),
    ollama: {
      ok: ollama.up,
      host: ollama.host,
      models: ollama.models,
    },
    groq: { ok: groq },
    openai: { ok: openai },
    openrouter: { ok: openrouter },
    together: { ok: together },
    cloudReady: groq || openrouter || together || openai,
    webSearch: true,
  };
}

async function callCloudChat({
  base,
  apiKey,
  model,
  messages,
  extraHeaders = {},
  plugins = null,
}) {
  const endpoint = `${base.replace(/\/$/, "")}/chat/completions`;
  /** @type {Record<string, unknown>} */
  const payload = {
    model,
    temperature: 0.75,
    max_tokens: CLOUD_CHAT_MAX_TOKENS,
    messages,
  };
  if (Array.isArray(plugins) && plugins.length) {
    payload.plugins = plugins;
  }
  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  });
  const data = await upstream.json().catch(() => ({}));
  const reply = data?.choices?.[0]?.message?.content;
  if (!upstream.ok || !reply) {
    return {
      ok: false,
      error: data?.error?.message || data?.error || `HTTP ${upstream.status}`,
    };
  }
  return { ok: true, reply: String(reply).trim(), model };
}

export { localCompanionReply } from "./companionLocalReply.mjs";

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function processChatRequest(body) {
  const message = String(body.message || body.text || "").trim();
  const history = Array.isArray(body.history) ? body.history : [];
  const system = body.system || CANTONESE_COMPANION_PROMPT;

  if (!message) {
    return { ok: false, error: "empty message" };
  }

  const providerId = String(body.providerId || "").trim();
  const providerPreset = providerId ? getLlmProvider(providerId) : null;
  const ollamaResolved = await resolveOllamaHost();
  const ollamaHost = ollamaResolved.host;
  const ollamaUp = ollamaResolved.up;
  const cloud = isCloudDeploy();

  if (message === "__ping__") {
    let mode = "local";
    let model =
      body.model ||
      providerPreset?.model ||
      process.env.OLLAMA_MODEL ||
      process.env.AMOJI_LLM_MODEL ||
      "qwen3:4b";
    if (ollamaUp) {
      mode = "ollama";
      model = pickOllamaModel(ollamaResolved.models, model);
    } else if (
      process.env.OPENROUTER_API_KEY ||
      String(body.apiKey || "").startsWith("sk-or-")
    ) {
      mode = "online";
      model = process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_FREE_MODEL;
    } else if (
      process.env.GROQ_API_KEY ||
      String(body.apiKey || "").startsWith("gsk_")
    ) {
      mode = "online";
      model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    } else if (process.env.OPENAI_API_KEY || process.env.AMOJI_LLM_KEY) {
      mode = "online";
      model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    }
    return {
      ok: true,
      mode,
      model,
      ollama: ollamaUp,
      host: ollamaHost,
      hosted: cloud,
    };
  }

  let webContext = "";
  let webSearched = false;
  let webSource = null;
  const webSearchEnabled = body.webSearch !== false;
  const tryWeb =
    webSearchEnabled &&
    shouldTryWebSearch(message, { force: body.forceWeb === true });
  if (tryWeb) {
    const web = await fetchWebContextForChat(message, fetch, {
      force: body.forceWeb === true,
    });
    webSearched = web.searched;
    webContext = web.context || "";
    webSource = web.source;
  }

  const replyLang = replyLangFromChatBody(body);
  const sessionIsEnglish = replyLang === "en";
  const actionHint = buildActionLlmContext(message, sessionIsEnglish);

  const webInstruction = webContext
    ? `${buildSessionReplyLanguageRule(sessionIsEnglish)} The snapshot may include Google/search results, Google News headlines, Wikipedia, weather, or a website excerpt — use what answers THIS turn. Summarize; do not recite raw search text.`
    : webSearched
      ? "Live web/news lookup returned nothing useful. If they asked for news, search, or a current fact, say you could not reach the web this turn and offer to retry. Otherwise chat normally."
      : "";

  const systemWithWeb = [
    system,
    actionHint,
    webContext,
    webInstruction,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    { role: "system", content: systemWithWeb },
    ...history.slice(-12),
  ];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || last.content !== message) {
    messages.push({ role: "user", content: message });
  }

  if (providerId === "basic") {
    return {
      ok: true,
      reply: pickLocalChatReply(
        message,
        history,
        webContext,
        system,
        localCompanionReply,
        replyLang,
      ),
      mode: webContext ? "local+web" : "local",
      model: null,
      web: webSearched ? { searched: true, source: webSource } : undefined,
    };
  }

  const requestedModel =
    body.model ||
    providerPreset?.model ||
    process.env.OLLAMA_MODEL ||
    process.env.AMOJI_LLM_MODEL;

  // Hosted already has server keys. Stale browser Groq keys return
  // "User not found" and used to skip the working OpenRouter path.
  const clientKey =
    cloud && process.env.OPENROUTER_API_KEY
      ? ""
      : String(body.apiKey || "").trim();
  const clientGroqKey =
    clientKey.startsWith("gsk_") ? clientKey : "";
  const clientOpenRouterKey =
    clientKey.startsWith("sk-or-") ? clientKey : "";

  const autoProvider = !providerId || providerId === "auto";
  const groqApiKey = process.env.GROQ_API_KEY || clientGroqKey;
  const openRouterApiKey =
    process.env.OPENROUTER_API_KEY || clientOpenRouterKey;

  // Hosted: always try OpenRouter first so a leftover groq providerId cannot
  // drop the turn onto canned local replies.
  const wantOpenRouter =
    Boolean(openRouterApiKey) &&
    providerId !== "basic" &&
    providerId !== "together" &&
    (cloud || autoProvider || providerId?.startsWith("openrouter"));
  if (wantOpenRouter && openRouterApiKey) {
    const primaryOr = resolveOpenRouterModel(
      requestedModel,
      providerPreset?.model,
    );
    const orModels = buildOpenRouterModelChain(primaryOr);
    let lastOrError = "";
    for (const orModel of orModels) {
      const openrouter = await callCloudChat({
        base: "https://openrouter.ai/api/v1",
        apiKey: openRouterApiKey,
        model: orModel,
        messages,
        // Prefer our snapshot over OpenRouter's web plugin — the plugin 4xx
        // used to drop the whole turn onto canned local replies.
        extraHeaders: {
          "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://amoji.app",
          "X-Title": "Amoji Companion",
        },
      });
      if (openrouter.ok) {
        return {
          ok: true,
          reply: openrouter.reply,
          mode: webSearched ? "online+web" : "online",
          model: openrouter.model,
          web: webSearched ? { searched: true, source: webSource } : undefined,
        };
      }
      lastOrError = String(openrouter.error || "OpenRouter error");
      console.warn("[chat-api] OpenRouter failed", orModel, lastOrError);
      if (isOpenRouterAuthError(lastOrError)) break;
    }
    if (lastOrError) {
      console.warn("[chat-api] OpenRouter exhausted", lastOrError);
    }
  }

  const wantGroq =
    providerId === "groq" || (autoProvider && (cloud || !ollamaUp));
  if (wantGroq && groqApiKey) {
    const groq = await callCloudChat({
      base: "https://api.groq.com/openai/v1",
      apiKey: groqApiKey,
      model: requestedModel || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages,
    });
    if (groq.ok) {
      return {
        ok: true,
        reply: groq.reply,
        mode: webSearched ? "online+web" : "online",
        model: groq.model,
        web: webSearched ? { searched: true, source: webSource } : undefined,
      };
    }
    console.warn("[chat-api] Groq failed", groq.error);
  }

  if (providerId === "together" && process.env.TOGETHER_API_KEY) {
    const together = await callCloudChat({
      base: "https://api.together.xyz/v1",
      apiKey: process.env.TOGETHER_API_KEY,
      model: requestedModel || providerPreset?.model,
      messages,
    });
    if (together.ok) {
      return {
        ok: true,
        reply: together.reply,
        mode: webSearched ? "online+web" : "online",
        model: together.model,
        web: webSearched ? { searched: true, source: webSource } : undefined,
      };
    }
  }

  const skipOllama =
    cloud ||
    providerId === "groq" ||
    providerId?.startsWith("openrouter") ||
    providerId === "together";

  if (!skipOllama && ollamaUp && process.env.OLLAMA_DISABLED !== "1") {
    const ollama = await chatOllama({
      base: ollamaHost,
      model: requestedModel,
      messages,
      fetchImpl: fetch,
    });
    if (ollama.ok) {
      return {
        ok: true,
        reply: ollama.reply,
        mode: webSearched ? "ollama+web" : "ollama",
        model: ollama.model,
        web: webSearched ? { searched: true, source: webSource } : undefined,
      };
    }
    console.warn("[chat-api] Ollama failed", ollama.error);
  }

  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.AMOJI_LLM_KEY ||
    "";
  const base =
    process.env.OPENAI_BASE_URL ||
    process.env.AMOJI_LLM_URL ||
    "https://api.openai.com/v1";
  const model =
    body.model ||
    process.env.AMOJI_LLM_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  if (apiKey) {
    const openai = await callCloudChat({ base, apiKey, model, messages });
    if (openai.ok) {
      return {
        ok: true,
        reply: openai.reply,
        mode: webSearched ? "online+web" : "online",
        model: openai.model,
        web: webSearched ? { searched: true, source: webSource } : undefined,
      };
    }
    console.warn("[chat-api] OpenAI failed", openai.error);
  }

  const fallbackReply = pickLocalChatReply(
    message,
    history,
    webContext,
    system,
    localCompanionReply,
    replyLang,
  );

  const hadCloudKeys =
    Boolean(process.env.GROQ_API_KEY) ||
    Boolean(process.env.OPENROUTER_API_KEY) ||
    Boolean(apiKey);

  return {
    ok: true,
    reply: fallbackReply,
    mode: hadCloudKeys ? "local-fallback" : "local",
    model: null,
    llmDegraded: hadCloudKeys,
    web: webSearched ? { searched: true, source: webSource } : undefined,
  };
}

export async function getOllamaTagsPayload() {
  const ollama = await resolveOllamaHost();
  return {
    ok: true,
    models: ollama.models,
    host: ollama.host,
    reachable: ollama.up,
  };
}
