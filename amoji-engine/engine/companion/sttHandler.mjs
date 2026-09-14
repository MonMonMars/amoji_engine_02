/**
 * Cloud speech-to-text for browsers without Web Speech API (e.g. iOS Safari).
 * Uses Groq Whisper when GROQ_API_KEY is set, else OpenAI-compatible endpoint.
 */
export const STT_HANDLER_SCHEMA = "amoji.sttHandler.v1";

const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const OPENAI_STT_URL = "https://api.openai.com/v1/audio/transcriptions";

/**
 * @param {string} lang
 * @returns {string}
 */
export function sttLanguageCode(lang) {
  const code = String(lang || "").toLowerCase();
  if (code.startsWith("en")) return "en";
  return "zh";
}

/**
 * @returns {{ url: string, apiKey: string, model: string } | null}
 */
export function resolveSttProvider() {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return {
      url: GROQ_STT_URL,
      apiKey: groqKey,
      model: process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo",
    };
  }
  const openaiKey = process.env.OPENAI_API_KEY || process.env.AMOJI_LLM_KEY;
  if (openaiKey) {
    const base = process.env.OPENAI_BASE_URL?.replace(/\/$/, "");
    return {
      url: base ? `${base}/audio/transcriptions` : OPENAI_STT_URL,
      apiKey: openaiKey,
      model: process.env.OPENAI_STT_MODEL || "whisper-1",
    };
  }
  return null;
}

export function sttCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/**
 * @param {Buffer} audio
 * @param {{ lang?: string, mimeType?: string }} [opts]
 * @returns {Promise<{ text: string, model: string }>}
 */
export async function transcribeAudioBuffer(audio, opts = {}) {
  const provider = resolveSttProvider();
  if (!provider) {
    throw new Error("no-stt-provider");
  }
  if (!audio?.length) {
    throw new Error("empty audio");
  }

  const mimeType = opts.mimeType || "audio/webm";
  const ext = mimeType.includes("mp4") ? "m4a" : "webm";
  const form = new FormData();
  form.append(
    "file",
    new Blob([audio], { type: mimeType }),
    `speech.${ext}`,
  );
  form.append("model", provider.model);
  form.append("language", sttLanguageCode(opts.lang));
  form.append("response_format", "json");
  form.append("temperature", "0");

  const res = await fetch(provider.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}` },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.error?.message || data?.error || `STT HTTP ${res.status}`;
    throw new Error(String(msg));
  }

  const text = String(data?.text || "").trim();
  if (!text) {
    throw new Error("empty transcript");
  }
  return { text, model: provider.model };
}

/**
 * @param {{ method?: string, body?: unknown }} req
 * @returns {Promise<{ status: number, headers: Record<string, string>, body: object }>}
 */
export async function processSttRequest(req) {
  if (req.method === "OPTIONS") {
    return { status: 204, headers: sttCorsHeaders(), body: null };
  }
  if (req.method !== "POST") {
    return {
      status: 405,
      headers: { ...sttCorsHeaders(), "Content-Type": "application/json" },
      body: { ok: false, error: "Method not allowed" },
    };
  }

  const provider = resolveSttProvider();
  if (!provider) {
    return {
      status: 503,
      headers: { ...sttCorsHeaders(), "Content-Type": "application/json" },
      body: {
        ok: false,
        error: "Cloud STT not configured on server",
        code: "no-stt-provider",
      },
    };
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload || "{}");
    } catch {
      payload = {};
    }
  }
  payload = payload || {};

  const b64 = String(payload.audio || "").trim();
  if (!b64) {
    return {
      status: 400,
      headers: { ...sttCorsHeaders(), "Content-Type": "application/json" },
      body: { ok: false, error: "missing audio (base64)" },
    };
  }

  try {
    const audio = Buffer.from(b64, "base64");
    const { text, model } = await transcribeAudioBuffer(audio, {
      lang: payload.lang,
      mimeType: payload.mimeType || "audio/webm",
    });
    return {
      status: 200,
      headers: { ...sttCorsHeaders(), "Content-Type": "application/json" },
      body: { ok: true, text, model },
    };
  } catch (err) {
    return {
      status: 500,
      headers: { ...sttCorsHeaders(), "Content-Type": "application/json" },
      body: { ok: false, error: err?.message || String(err) },
    };
  }
}
