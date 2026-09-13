/**
 * Cloud Cantonese TTS via Microsoft Edge neural voices (no API key).
 * Server-side only — browsers cannot call Edge TTS WebSocket directly.
 */
import { EdgeTTS } from "edge-tts-universal";

export const TTS_HANDLER_SCHEMA = "amoji.ttsHandler.v1";

/** Cantonese (Hong Kong) female — 曉曼 */
export const CANTONESE_FEMALE_VOICE = "zh-HK-HiuMaanNeural";

/** Alternate Cantonese female — 曉佳 */
export const CANTONESE_FEMALE_VOICE_ALT = "zh-HK-HiuGaaiNeural";

/** English (US) female — Aria */
export const ENGLISH_FEMALE_VOICE = "en-US-AriaNeural";

const EMOTION_EDGE_PROSODY = Object.freeze({
  neutral: { rate: "+6%", pitch: "+10Hz" },
  happy: { rate: "+14%", pitch: "+16Hz" },
  thinking: { rate: "-2%", pitch: "+4Hz" },
  sad: { rate: "-8%", pitch: "-4Hz" },
  surprised: { rate: "+18%", pitch: "+20Hz" },
  angry: { rate: "+10%", pitch: "-2Hz" },
});

/**
 * @param {string} text
 * @param {{ voice?: string, emotion?: string, rate?: string, pitch?: string, lang?: string }} [opts]
 * @returns {Promise<{ audio: Buffer, voice: string, contentType: string }>}
 */
export async function synthesizeSpeech(text, opts = {}) {
  const clean = String(text || "")
    .replace(/[*_`#>/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  if (!clean) {
    throw new Error("empty text");
  }

  const emotion = String(opts.emotion || "neutral").toLowerCase();
  const prosody =
    EMOTION_EDGE_PROSODY[emotion] || EMOTION_EDGE_PROSODY.neutral;
  const lang = String(opts.lang || "").toLowerCase();
  const defaultVoice =
    lang === "en" || lang === "en-us" ? ENGLISH_FEMALE_VOICE : CANTONESE_FEMALE_VOICE;
  const voice = opts.voice || defaultVoice;

  const tts = new EdgeTTS(clean, voice, {
    rate: opts.rate || prosody.rate,
    pitch: opts.pitch || prosody.pitch,
  });
  const result = await tts.synthesize();
  const audio = Buffer.from(await result.audio.arrayBuffer());

  return {
    audio,
    voice,
    contentType: "audio/mpeg",
  };
}

/** @deprecated Use synthesizeSpeech */
export const synthesizeCantoneseSpeech = synthesizeSpeech;

export function ttsCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/**
 * @param {{ method?: string, body?: unknown }} req
 * @returns {Promise<{ status: number, headers: Record<string, string>, body: Buffer | object }>}
 */
export async function processTtsRequest(req) {
  if (req.method === "OPTIONS") {
    return { status: 204, headers: ttsCorsHeaders(), body: null };
  }
  if (req.method !== "POST") {
    return {
      status: 405,
      headers: { ...ttsCorsHeaders(), "Content-Type": "application/json" },
      body: { ok: false, error: "Method not allowed" },
    };
  }

  const raw =
    typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : req.body || {};
  const text = raw.text ?? raw.message ?? "";
  const emotion = raw.emotion ?? "neutral";
  const lang = raw.lang ?? raw.language ?? "";

  try {
    const { audio, voice, contentType } = await synthesizeSpeech(text, {
      emotion,
      voice: raw.voice,
      lang,
    });
    return {
      status: 200,
      headers: {
        ...ttsCorsHeaders(),
        "Content-Type": contentType,
        "X-Tts-Voice": voice,
        "Cache-Control": "no-store",
      },
      body: audio,
    };
  } catch (err) {
    return {
      status: 400,
      headers: { ...ttsCorsHeaders(), "Content-Type": "application/json" },
      body: { ok: false, error: err?.message || String(err) },
    };
  }
}
