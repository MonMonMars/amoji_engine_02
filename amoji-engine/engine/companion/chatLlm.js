/**
 * Companion chat LLM client — OpenAI-compatible online API + local stub.
 */
import {
  createVoiceRobotBridge,
} from "../voice/voiceRobotBridge.js";
import { inferExpressionFromText } from "../face/emotionExpression.js";
import { CANTONESE_COMPANION_PROMPT } from "./companionBodyMotion.js";
import { parseReplyTags } from "./companionActionMotion.js";
import {
  LLM_PROVIDER_STORAGE_KEY,
  resolveProviderConfig,
  saveProviderApiKey,
} from "./companionLlmProviders.js";
import { chatOllama } from "./companionOllama.js";
import {
  hasAnyClientCloudKey,
  resolveClientApiKey,
} from "./companionClientKeys.js";
import {
  isHostedCompanion,
  probeOllamaDirect,
  OLLAMA_PROBE_HOSTS,
} from "./companionLlmConnect.js";
import { isOllamaLocalModel } from "./companionModelIds.js";
import { getLlmProvider, readProviderApiKey } from "./companionLlmProviders.js";
import {
  buildActionLlmContext,
  buildAlwaysActionReminder,
} from "./companionActionIntent.js";
import { fetchWebContextForChat } from "./companionWebSearch.mjs";

export const COMPANION_CHAT_SCHEMA = "amoji.companionChat.v1";

/**
 * @param {{
 *   apiUrl?: string | null,
 *   apiKey?: string | null,
 *   model?: string,
 *   systemPrompt?: string,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
export function createCompanionChat(opts = {}) {
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function"
      ? globalThis.fetch.bind(globalThis)
      : null);
  let apiUrl = normalizeUrl(opts.apiUrl);
  let apiKey = String(opts.apiKey || "").trim() || null;
  let model = opts.model || "qwen3:4b";
  let providerId =
    opts.providerId ||
    globalThis.localStorage?.getItem(LLM_PROVIDER_STORAGE_KEY) ||
    "auto";
  let forceLocal = false;
  let systemPrompt = opts.systemPrompt || CANTONESE_COMPANION_PROMPT;

  const finalizeReply = (replyText) => {
    const raw = String(replyText || "").trim();
    const parsed = parseReplyTags(raw);
    return {
      reply: parsed.reply,
      raw,
      emotion: parsed.emotion || inferExpressionFromText(parsed.reply),
      action: parsed.action,
    };
  };

  const robot = createVoiceRobotBridge({ language: "yue" });
  /** @type {{ role: string, content: string }[]} */
  const history = [];
  /** @type {AbortController | null} */
  let replyAbort = null;

  const mode = () => {
    if (forceLocal) return "local";
    if (!apiUrl) return "proxy";
    if (isOllamaUrl(apiUrl)) return "ollama";
    if (apiUrl && fetchImpl) return "online";
    return "local";
  };

  const applyProvider = (id, extra = {}) => {
    providerId = String(id || "auto");
    const resolved = resolveProviderConfig(providerId, {
      fallbackModel: model,
      fallbackKey: extra.apiKey || apiKey || "",
    });
    forceLocal = resolved.forceLocal;
    let useProvider = resolved.provider;
    if (extra.apiKey && resolved.provider.keyStorageKey) {
      saveProviderApiKey(providerId, extra.apiKey);
    }
    if (resolved.forceLocal) {
      apiUrl = null;
      apiKey = null;
    } else if (resolved.provider.id === "auto") {
      const hosted = isHostedCompanion();
      const orKey =
        readProviderApiKey("openrouter-gemma") ||
        readProviderApiKey("openrouter-llama");
      const groqKey = readProviderApiKey("groq");
      if (hosted) {
        apiUrl = null;
        apiKey = null;
        if (orKey) {
          useProvider = getLlmProvider("openrouter-gemma");
          model = useProvider.model || "openrouter/free";
          providerId = useProvider.id;
        } else if (groqKey) {
          useProvider = getLlmProvider("groq");
          model = useProvider.model;
          providerId = useProvider.id;
        }
      } else {
        apiUrl = null;
        apiKey = null;
      }
    } else {
      apiUrl = normalizeUrl(resolved.url);
      apiKey = resolved.apiKey;
      model = resolved.model || model;
      if (resolved.proxyOnly) {
        apiUrl = null;
        apiKey = null;
      }
    }
    if (extra.model) model = extra.model;
    globalThis.localStorage?.setItem(LLM_PROVIDER_STORAGE_KEY, providerId);
    return {
      providerId,
      apiUrl,
      hasKey: Boolean(apiKey),
      model,
      mode: mode(),
      forceLocal,
    };
  };

  /**
   * @param {string} userText
   * @param {{ onToken?: (chunk: string, full: string) => void }} [opts]
   */
  function abort() {
    replyAbort?.abort();
    replyAbort = null;
  }

  async function reply(userText, opts = {}) {
    const text = String(userText || "").trim();
    if (!text) {
      return {
        ok: false,
        error: "empty",
        reply: "",
        emotion: "neutral",
        mode: mode(),
      };
    }
    abort();
    const turnAbort = new AbortController();
    replyAbort = turnAbort;
    const signal = turnAbort.signal;

    history.push({ role: "user", content: text });
    const onToken = opts.onToken;
    const isEnglish =
      /[a-z]/i.test(text) && !/[\u4e00-\u9fff]/.test(text);
    const actionHint = [
      buildAlwaysActionReminder(isEnglish),
      buildActionLlmContext(text, isEnglish),
    ]
      .filter(Boolean)
      .join("\n");
    let webMeta = { searched: false, source: null };
    let effectiveSystem = [systemPrompt, actionHint].filter(Boolean).join("\n\n");
    const ensureWebSnapshot = async () => {
      if (webMeta.searched || !fetchImpl || opts.webSearch === false) return;
      try {
        const web = await fetchWebContextForChat(text, fetchImpl, {
          viaApi: true,
        });
        webMeta = { searched: Boolean(web.searched), source: web.source || null };
        const webBlock = web.context
          ? `${web.context}\nUse a fact from this snapshot only if it answers this turn. Ignore it if unrelated. Do not paste it.`
          : web.searched
            ? "Live lookup returned nothing useful. Chat normally unless they asked for a current fact."
            : "";
        if (webBlock) {
          effectiveSystem = [systemPrompt, actionHint, webBlock]
            .filter(Boolean)
            .join("\n\n");
        }
      } catch {
        /* keep system prompt */
      }
    };

    const throwIfAborted = () => {
      if (signal.aborted) {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }
    };

    try {
    // Prefer lab/cloud proxy — server-side keys when configured
    if (!forceLocal && fetchImpl) {
      try {
        throwIfAborted();
        const proxied = await callLocalProxy({
          fetchImpl,
          text,
          history,
          systemPrompt: effectiveSystem,
          model,
          providerId,
          signal,
          webSearch: opts.webSearch !== false,
        });
        if (
          proxied.ok &&
          (isSmartProxyMode(proxied.mode) ||
            (isHostedCompanion() &&
              proxied.mode !== "local-fallback" &&
              proxied.mode !== "local"))
        ) {
          const finalized = finalizeReply(proxied.reply);
          if (onToken) await emitTypewriter(finalized.reply, onToken, signal);
          throwIfAborted();
          history.push({ role: "assistant", content: finalized.reply });
          return {
            ok: true,
            reply: finalized.reply,
            raw: finalized.raw,
            emotion: finalized.emotion,
            action: finalized.action,
            mode: proxied.mode || "proxy",
            model: proxied.model || model,
            web: proxied.web || webMeta,
          };
        }
      } catch (err) {
        if (signal.aborted || err?.name === "AbortError") throw err;
        /* try client online or local stub */
      }
    }

    // Hosted + browser key → call OpenRouter/Groq directly (no Vercel env needed)
    if (
      !forceLocal &&
      apiUrl &&
      apiKey &&
      fetchImpl &&
      isHostedCompanion() &&
      !isOllamaUrl(apiUrl)
    ) {
      try {
        throwIfAborted();
        await ensureWebSnapshot();
        const online = await callOpenAiCompatible({
          fetchImpl,
          apiUrl,
          apiKey,
          model,
          systemPrompt: effectiveSystem,
          history,
          onToken,
          stream: Boolean(onToken),
          signal,
          extraHeaders: apiUrl.includes("openrouter")
            ? {
                "HTTP-Referer": globalThis.location?.origin || "https://amoji.app",
                "X-Title": "Amoji Companion",
              }
            : {},
        });
        if (online.ok) {
          const finalized = finalizeReply(online.reply);
          if (onToken && !online.streamed) {
            await emitTypewriter(finalized.reply, onToken, signal);
          }
          throwIfAborted();
          history.push({ role: "assistant", content: finalized.reply });
          return {
            ok: true,
            reply: finalized.reply,
            raw: finalized.raw,
            emotion: finalized.emotion,
            action: finalized.action,
            mode: webMeta.searched ? "online+web" : "online",
            model: online.model || model,
            web: webMeta,
          };
        }
        console.warn("[companion] hosted direct llm failed", online.error);
      } catch (err) {
        if (signal.aborted || err?.name === "AbortError") throw err;
        console.warn("[companion] hosted direct llm error", err);
      }
    }

    if (!forceLocal && apiUrl && fetchImpl) {
      try {
        throwIfAborted();
        await ensureWebSnapshot();
        const online = await callOpenAiCompatible({
          fetchImpl,
          apiUrl,
          apiKey,
          model,
          systemPrompt: effectiveSystem,
          history,
          onToken,
          stream: Boolean(onToken) && !isOllamaUrl(apiUrl),
          signal,
        });
        if (online.ok) {
          const finalized = finalizeReply(online.reply);
          throwIfAborted();
          history.push({ role: "assistant", content: finalized.reply });
          const clientMode = /11434|ollama/i.test(apiUrl) ? "ollama" : "online";
          return {
            ok: true,
            reply: finalized.reply,
            raw: finalized.raw,
            emotion: finalized.emotion,
            action: finalized.action,
            mode: webMeta.searched ? `${clientMode}+web` : clientMode,
            model: online.model || model,
            web: webMeta,
          };
        }
        online.error && console.warn("[companion] online llm failed", online.error);
      } catch (err) {
        if (signal.aborted || err?.name === "AbortError") throw err;
        console.warn("[companion] online llm error", err);
      }
    }

    if (
      !forceLocal &&
      fetchImpl &&
      !isHostedCompanion() &&
      isOllamaProvider(providerId)
    ) {
      try {
        const direct = await tryDirectOllama({
          fetchImpl,
          model,
          systemPrompt: effectiveSystem,
          history,
          onToken,
        });
        if (direct.ok) {
          const finalized = finalizeReply(direct.reply);
          if (onToken && !direct.streamed) {
            await emitTypewriter(finalized.reply, onToken, signal);
          }
          throwIfAborted();
          history.push({ role: "assistant", content: finalized.reply });
          return {
            ok: true,
            reply: finalized.reply,
            raw: finalized.raw,
            emotion: finalized.emotion,
            action: finalized.action,
            mode: "ollama",
            model: direct.model || model,
          };
        }
      } catch (err) {
        if (signal.aborted || err?.name === "AbortError") throw err;
        console.warn("[companion] direct ollama error", err);
      }
    }

    if (!forceLocal && fetchImpl) {
      try {
        const proxied = await callLocalProxy({
          fetchImpl,
          text,
          history,
          systemPrompt: effectiveSystem,
          model,
          providerId,
          webSearch: opts.webSearch !== false,
        });
        if (
          proxied.ok &&
          (proxied.mode !== "local-fallback" || providerId === "basic")
        ) {
          const finalized = finalizeReply(proxied.reply);
          if (onToken) await emitTypewriter(finalized.reply, onToken, signal);
          throwIfAborted();
          history.push({ role: "assistant", content: finalized.reply });
          return {
            ok: true,
            reply: finalized.reply,
            raw: finalized.raw,
            emotion: finalized.emotion,
            action: finalized.action,
            mode: proxied.mode || "proxy",
            model: proxied.model || null,
            web: proxied.web || webMeta,
          };
        }
      } catch (err) {
        if (signal.aborted || err?.name === "AbortError") throw err;
        /* local stub */
      }
    }

    throwIfAborted();
    const turn = await robot.runTurn(text, { speakMs: 0 });
    const finalized = finalizeReply(turn.reply || "嗯，我喺度呀！");
    if (onToken) await emitTypewriter(finalized.reply, onToken, signal);
    throwIfAborted();
    history.push({ role: "assistant", content: finalized.reply });
    return {
      ok: true,
      reply: finalized.reply,
      raw: finalized.raw,
      emotion: turn.emotion || finalized.emotion,
      action: finalized.action,
      mode: "local",
      annotatedReply: turn.annotatedReply || null,
    };
    } catch (err) {
      if (signal.aborted || err?.name === "AbortError") {
        return {
          ok: false,
          aborted: true,
          error: "aborted",
          reply: "",
          emotion: "neutral",
          mode: mode(),
        };
      }
      throw err;
    } finally {
      if (replyAbort === turnAbort) replyAbort = null;
    }
  }

  return {
    schema: COMPANION_CHAT_SCHEMA,
    get mode() {
      return mode();
    },
    get providerId() {
      return providerId;
    },
    get history() {
      return history.slice();
    },
    setProvider(id, extra = {}) {
      return applyProvider(id, extra);
    },
    setApi({ url, key, model: nextModel, provider: nextProvider } = {}) {
      if (nextProvider) return applyProvider(nextProvider, { apiKey: key });
      if (url !== undefined) apiUrl = normalizeUrl(url);
      if (key !== undefined) apiKey = String(key || "").trim() || null;
      if (nextModel) model = nextModel;
      forceLocal = false;
      providerId = "custom";
      return { apiUrl, hasKey: Boolean(apiKey), model, mode: mode(), providerId };
    },
    clearHistory() {
      history.length = 0;
    },
    /**
     * Replace in-memory turn history (e.g. hydrate from persisted storage without showing UI).
     * @param {{ role: string, content?: string, text?: string }[]} entries
     */
    setHistory(entries = []) {
      history.length = 0;
      if (!Array.isArray(entries)) return history.slice();
      for (const entry of entries) {
        const rawRole = String(entry?.role || "").toLowerCase();
        if (rawRole !== "user" && rawRole !== "assistant") continue;
        const content = String(entry.content ?? entry.text ?? "").trim();
        if (content) history.push({ role: rawRole, content });
      }
      return history.slice();
    },
    setSystemPrompt(next) {
      systemPrompt = String(next || CANTONESE_COMPANION_PROMPT);
      return systemPrompt;
    },
    get systemPrompt() {
      return systemPrompt;
    },
    abort,
    reply,
  };
}

const CHAT_FETCH_TIMEOUT_MS = 28_000;

function isSmartProxyMode(mode) {
  const m = String(mode || "");
  return (
    m === "ollama" ||
    m === "online" ||
    m.startsWith("online+") ||
    m === "local+web" ||
    m === "proxy"
  );
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {string} url
 * @param {RequestInit} init
 * @param {number} [ms]
 */
async function fetchWithTimeout(
  fetchImpl,
  url,
  init,
  ms = CHAT_FETCH_TIMEOUT_MS,
  externalSignal = null,
) {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener?.("abort", onExternalAbort);
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener?.("abort", onExternalAbort);
  }
}

function isOllamaUrl(url) {
  return /11434|ollama|localhost/i.test(String(url || ""));
}

function isOllamaProvider(id) {
  return (
    id === "auto" ||
    String(id || "").startsWith("ollama") ||
    id === "custom"
  );
}

function normalizeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || raw === "off" || raw === "local") return null;
  return raw.replace(/\/$/, "");
}

async function tryDirectOllama({
  fetchImpl,
  model,
  systemPrompt,
  history,
  onToken,
}) {
  const probed = await probeOllamaDirect(OLLAMA_PROBE_HOSTS);
  if (!probed.ok) return { ok: false, error: "ollama offline" };

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-12),
  ];
  const result = await chatOllama({
    base: probed.host,
    model,
    messages,
    fetchImpl,
  });
  if (!result.ok || !result.reply) return { ok: false, error: result.error };
  return {
    ok: true,
    reply: result.reply,
    model: result.model,
    streamed: false,
  };
}

async function callLocalProxy({
  fetchImpl,
  text,
  history,
  systemPrompt,
  model,
  providerId,
  signal = null,
  webSearch = true,
}) {
  const hosted = isHostedCompanion();
  const proxyModel =
    hosted && isOllamaLocalModel(model) ? undefined : model || undefined;
  let res;
  try {
    res = await fetchWithTimeout(
      fetchImpl,
      "/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history.slice(-12),
          system: systemPrompt,
          model: proxyModel,
          providerId: providerId && providerId !== "custom" ? providerId : undefined,
          apiKey: hosted
            ? undefined
            : resolveClientApiKey(providerId) || undefined,
          webSearch,
        }),
      },
      CHAT_FETCH_TIMEOUT_MS,
      signal,
    );
  } catch (err) {
    const aborted = err?.name === "AbortError";
    return { ok: false, error: aborted ? "chat-timeout" : err?.message || "fetch failed" };
  }
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const data = await res.json().catch(() => ({}));
  if (!data?.reply) return { ok: false, error: data?.error || "no reply" };
  return {
    ok: true,
    reply: String(data.reply),
    mode: data.mode || "proxy",
    model: data.model || null,
    web: data.web || null,
  };
}

async function emitTypewriter(text, onToken, signal = null) {
  const full = String(text || "");
  let acc = "";
  for (const ch of full) {
    if (signal?.aborted) return;
    acc += ch;
    onToken(ch, acc);
    await new Promise((r) => setTimeout(r, 18));
  }
}

async function callOpenAiCompatible({
  fetchImpl,
  apiUrl,
  apiKey,
  model,
  systemPrompt,
  history,
  onToken,
  stream,
  signal = null,
  extraHeaders = {},
}) {
  const endpoint = apiUrl.includes("/chat/completions")
    ? apiUrl
    : `${apiUrl}/chat/completions`;
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  const authKey =
    apiKey || (/11434|ollama|localhost/i.test(apiUrl) ? "ollama" : null);
  if (authKey) headers.Authorization = `Bearer ${authKey}`;
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-12),
  ];

  if (stream && onToken) {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      signal: signal || undefined,
        body: JSON.stringify({
          model,
          temperature: 0.8,
          max_tokens: 1024,
          stream: true,
          messages,
        }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: data?.error?.message || `HTTP ${res.status}`,
      };
    }
    const streamed = await readOpenAiStream(res, onToken, signal);
    if (!streamed) return { ok: false, error: "empty stream" };
    return { ok: true, reply: streamed.trim(), model };
  }

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers,
    signal: signal || undefined,
    body: JSON.stringify({
      model,
      temperature: 0.8,
      max_tokens: 1024,
      messages,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error?.message || `HTTP ${res.status}`,
    };
  }
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) return { ok: false, error: "empty completion" };
  return { ok: true, reply: String(reply).trim(), model };
}

async function readOpenAiStream(res, onToken, signal = null) {
  const reader = res.body?.getReader?.();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    if (signal?.aborted) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      return full;
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const chunk = json?.choices?.[0]?.delta?.content || "";
        if (chunk) {
          full += chunk;
          onToken(chunk, full);
        }
      } catch {
        /* partial SSE */
      }
    }
  }
  return full;
}
