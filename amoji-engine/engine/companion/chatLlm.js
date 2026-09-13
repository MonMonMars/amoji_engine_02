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
  let model = opts.model || "gpt-4o";
  const systemPrompt =
    opts.systemPrompt ||
    [
      "You are Amoji, a witty, emotionally intelligent anime companion.",
      "Reply in the user's language (Cantonese/中文/English).",
      "Be specific, curious, and helpful — never generic or robotic.",
      "Keep answers concise (1–4 sentences) unless they ask for detail.",
      "Show personality: warm humor, empathy, light teasing when appropriate.",
      "Never mention APIs, models, or being an AI assistant.",
    ].join(" ");

  const robot = createVoiceRobotBridge({ language: "yue" });
  /** @type {{ role: string, content: string }[]} */
  const history = [];

  const mode = () => (apiUrl && fetchImpl ? "online" : "local");

  /**
   * @param {string} userText
   * @param {{ onToken?: (chunk: string, full: string) => void }} [opts]
   */
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
    history.push({ role: "user", content: text });
    const onToken = opts.onToken;

    // Prefer lab proxy first — uses server-side OPENAI_API_KEY when configured
    if (fetchImpl) {
      try {
        const proxied = await callLocalProxy({
          fetchImpl,
          text,
          history,
          systemPrompt,
          model,
        });
        if (proxied.ok && proxied.mode !== "local") {
          const replyText = proxied.reply;
          if (onToken) await emitTypewriter(replyText, onToken);
          history.push({ role: "assistant", content: replyText });
          return {
            ok: true,
            reply: replyText,
            emotion: inferExpressionFromText(replyText),
            mode: proxied.mode || "proxy",
            model: proxied.model || model,
          };
        }
      } catch {
        /* try client online or local stub */
      }
    }

    if (apiUrl && fetchImpl) {
      try {
        const online = await callOpenAiCompatible({
          fetchImpl,
          apiUrl,
          apiKey,
          model,
          systemPrompt,
          history,
          onToken,
          stream: Boolean(onToken),
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
        online.error && console.warn("[companion] online llm failed", online.error);
      } catch (err) {
        console.warn("[companion] online llm error", err);
      }
    }

    if (fetchImpl) {
      try {
        const proxied = await callLocalProxy({
          fetchImpl,
          text,
          history,
          systemPrompt,
          model,
        });
        if (proxied.ok) {
          const replyText = proxied.reply;
          if (onToken) await emitTypewriter(replyText, onToken);
          history.push({ role: "assistant", content: replyText });
          return {
            ok: true,
            reply: replyText,
            emotion: inferExpressionFromText(replyText),
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
    if (onToken) await emitTypewriter(replyText, onToken);
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

async function callLocalProxy({ fetchImpl, text, history, systemPrompt, model }) {
  const res = await fetchImpl("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      history: history.slice(-12),
      system: systemPrompt,
      model,
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

async function emitTypewriter(text, onToken) {
  const full = String(text || "");
  let acc = "";
  for (const ch of full) {
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
}) {
  const endpoint = apiUrl.includes("/chat/completions")
    ? apiUrl
    : `${apiUrl}/chat/completions`;
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-12),
  ];

  if (stream && onToken) {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.8,
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
    const streamed = await readOpenAiStream(res, onToken);
    if (!streamed) return { ok: false, error: "empty stream" };
    return { ok: true, reply: streamed.trim(), model };
  }

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.8,
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

async function readOpenAiStream(res, onToken) {
  const reader = res.body?.getReader?.();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
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
