/**
 * Companion chat LLM client — OpenAI-compatible online API + local stub.
 */
import {
  createVoiceRobotBridge,
} from "../voice/voiceRobotBridge.js";
import { inferExpressionFromText } from "../face/emotionExpression.js";

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
  let model = opts.model || "gpt-4o-mini";
  const systemPrompt =
    opts.systemPrompt ||
    "You are Amoji, a warm Cantonese-first anime companion. Keep replies short (1-3 sentences), expressive, and friendly. Mix 粵語 naturally when the user writes Chinese; use English when they write English. Never mention being an API.";

  const robot = createVoiceRobotBridge({ language: "yue" });
  /** @type {{ role: string, content: string }[]} */
  const history = [];

  const mode = () => (apiUrl && fetchImpl ? "online" : "local");

  /**
   * @param {string} userText
   */
  async function reply(userText) {
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
    history.push({ role: "user", content: text });

    if (apiUrl && fetchImpl) {
      try {
        const online = await callOpenAiCompatible({
          fetchImpl,
          apiUrl,
          apiKey,
          model,
          systemPrompt,
          history,
        });
        if (online.ok) {
          history.push({ role: "assistant", content: online.reply });
          return {
            ok: true,
            reply: online.reply,
            emotion: inferExpressionFromText(online.reply),
            mode: "online",
            model: online.model || model,
          };
        }
        // fall through to local on soft failure
        online.error && console.warn("[companion] online llm failed", online.error);
      } catch (err) {
        console.warn("[companion] online llm error", err);
      }
    }

    // Local / same-origin proxy first
    if (fetchImpl) {
      try {
        const proxied = await callLocalProxy({
          fetchImpl,
          text,
          history,
          systemPrompt,
        });
        if (proxied.ok) {
          history.push({ role: "assistant", content: proxied.reply });
          return {
            ok: true,
            reply: proxied.reply,
            emotion: inferExpressionFromText(proxied.reply),
            mode: proxied.mode || "proxy",
            model: proxied.model || null,
          };
        }
      } catch {
        /* local stub */
      }
    }

    const turn = await robot.runTurn(text, { speakMs: 0 });
    const replyText = turn.reply || "嗯，我喺度呀！";
    history.push({ role: "assistant", content: replyText });
    return {
      ok: true,
      reply: replyText,
      emotion: turn.emotion || inferExpressionFromText(replyText),
      mode: "local",
      annotatedReply: turn.annotatedReply || null,
    };
  }

  return {
    schema: COMPANION_CHAT_SCHEMA,
    get mode() {
      return mode();
    },
    get history() {
      return history.slice();
    },
    setApi({ url, key, model: nextModel } = {}) {
      if (url !== undefined) apiUrl = normalizeUrl(url);
      if (key !== undefined) apiKey = String(key || "").trim() || null;
      if (nextModel) model = nextModel;
      return { apiUrl, hasKey: Boolean(apiKey), model, mode: mode() };
    },
    clearHistory() {
      history.length = 0;
    },
    reply,
  };
}

function normalizeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || raw === "off" || raw === "local") return null;
  return raw.replace(/\/$/, "");
}

async function callLocalProxy({ fetchImpl, text, history, systemPrompt }) {
  const res = await fetchImpl("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      history: history.slice(-12),
      system: systemPrompt,
    }),
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const data = await res.json().catch(() => ({}));
  if (!data?.reply) return { ok: false, error: data?.error || "no reply" };
  return {
    ok: true,
    reply: String(data.reply),
    mode: data.mode || "proxy",
    model: data.model || null,
  };
}

async function callOpenAiCompatible({
  fetchImpl,
  apiUrl,
  apiKey,
  model,
  systemPrompt,
  history,
}) {
  const endpoint = apiUrl.includes("/chat/completions")
    ? apiUrl
    : `${apiUrl}/chat/completions`;
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-12),
      ],
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
