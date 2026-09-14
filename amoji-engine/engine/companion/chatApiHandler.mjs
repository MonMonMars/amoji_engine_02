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

export const CHAT_API_HANDLER_SCHEMA = "amoji.chatApiHandler.v1";

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
  const envModel = process.env.OPENROUTER_MODEL || "openrouter/auto";
  if (requested && !isOllamaLocalModel(requested)) return requested;
  if (presetModel && !isOllamaLocalModel(presetModel)) return presetModel;
  return envModel;
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
  };
}

async function callCloudChat({ base, apiKey, model, messages, extraHeaders = {} }) {
  const endpoint = `${base.replace(/\/$/, "")}/chat/completions`;
  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      messages,
    }),
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

/** Tiny Cantonese/English fallback when no API key is configured. */
export function localCompanionReply(message, history = []) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const nameMatch = text.match(/我叫\s*([^\s，。！？,.!?]+)/);
  if (nameMatch) {
    return `你好呀${nameMatch[1]}！好開心認識你～今日想傾啲咩？ [mood:happy]`;
  }
  if (/哈哈|開心|happy|great|鍾意/.test(lower)) {
    return "哈哈我都開心到跳起！再講多啲啦～ [mood:happy]";
  }
  if (/唉|傷心|sad|慘|唔開心/.test(lower)) {
    return "抱抱你呀…慢慢講，我喺度聽住。 [mood:sad]";
  }
  if (/點解|why|諗|hmm/.test(lower)) {
    return "嗯…等我諗一諗先。你覺得邊方面最關鍵？ [mood:thinking]";
  }
  if (/hello|hi|hey|你好|早晨|晚安/.test(lower)) {
    return "嗨呀～我係 Amoji！同我傾偈啦，我會用粵語答你㗎。 [mood:happy]";
  }
  if (/你係邊個|who are you|你叫咩/.test(lower)) {
    return "我係 Amoji 呀，你嘅動漫夥伴，會做表情同手勢㗎！ [mood:happy]";
  }
  if (/哇|嘩|唔信|真係/.test(text)) {
    return "嘩！真係呀？講多啲俾我聽啦！ [mood:surprised]";
  }
  if (lastUser?.content && /再见|拜拜|bye/.test(lower)) {
    return "拜拜啦～記得返嚟搵我呀！ [mood:happy]";
  }
  const snippets = [
    `「${text.slice(0, 24)}」——我聽到啦，再講深啲？ [mood:thinking]`,
    "有意思喎！我覺得幾好玩呀～ [mood:happy]",
    "嗯嗯，繼續講，我跟住你情緒走。 [mood:neutral]",
  ];
  return snippets[Math.floor(Math.random() * snippets.length)];
}

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
      model = process.env.OPENROUTER_MODEL || "openrouter/auto";
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

  const messages = [
    { role: "system", content: system },
    ...history.slice(-12),
  ];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || last.content !== message) {
    messages.push({ role: "user", content: message });
  }

  if (providerId === "basic") {
    return {
      ok: true,
      reply: localCompanionReply(message, history),
      mode: "local",
      model: null,
    };
  }

  const requestedModel =
    body.model ||
    providerPreset?.model ||
    process.env.OLLAMA_MODEL ||
    process.env.AMOJI_LLM_MODEL;

  const clientKey = String(body.apiKey || "").trim();
  const clientGroqKey =
    clientKey.startsWith("gsk_") ? clientKey : "";
  const clientOpenRouterKey =
    clientKey.startsWith("sk-or-") ? clientKey : "";

  const autoProvider = !providerId || providerId === "auto";
  const groqApiKey = process.env.GROQ_API_KEY || clientGroqKey;
  const openRouterApiKey =
    process.env.OPENROUTER_API_KEY || clientOpenRouterKey;

  // OpenRouter first on cloud — Groq console/signup is often flaky
  const wantOpenRouter =
    providerId?.startsWith("openrouter") ||
    (autoProvider && cloud && openRouterApiKey) ||
    (cloud && !providerId && openRouterApiKey);
  if (wantOpenRouter && openRouterApiKey) {
    const orModel = resolveOpenRouterModel(
      requestedModel,
      providerPreset?.model,
    );
    const openrouter = await callCloudChat({
      base: "https://openrouter.ai/api/v1",
      apiKey: openRouterApiKey,
      model: orModel,
      messages,
      extraHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://amoji.app",
        "X-Title": "Amoji Companion",
      },
    });
    if (openrouter.ok) {
      return {
        ok: true,
        reply: openrouter.reply,
        mode: "online",
        model: openrouter.model,
      };
    }
    console.warn("[chat-api] OpenRouter failed", openrouter.error);
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
      return { ok: true, reply: groq.reply, mode: "online", model: groq.model };
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
      return { ok: true, reply: together.reply, mode: "online", model: together.model };
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
        mode: "ollama",
        model: ollama.model,
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
      return { ok: true, reply: openai.reply, mode: "online", model: openai.model };
    }
    console.warn("[chat-api] OpenAI failed", openai.error);
  }

  return {
    ok: true,
    reply: localCompanionReply(message, history),
    mode: process.env.GROQ_API_KEY || apiKey ? "local-fallback" : "local",
    model: null,
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
