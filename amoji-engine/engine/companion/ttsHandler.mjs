/**
 * Cloud Cantonese TTS via Microsoft Edge neural voices (no API key).
 * Server-side only — browsers cannot call Edge TTS WebSocket directly.
 */
import { EdgeTTS } from "edge-tts-universal";
import { resolveCompanionTtsProsody } from "./companionTtsProsody.js";
import { resolveEdgeVoiceId } from "./companionVoiceProfiles.js";

export const TTS_HANDLER_SCHEMA = "amoji.ttsHandler.v2";

/** Cantonese (Hong Kong) female — 曉曼 */
export const CANTONESE_FEMALE_VOICE = "zh-HK-HiuMaanNeural";

/** Alternate Cantonese female — 曉佳 */
export const CANTONESE_FEMALE_VOICE_ALT = "zh-HK-HiuGaaiNeural";

/** English (US) female — Aria */
export const ENGLISH_FEMALE_VOICE = "en-US-AriaNeural";

/** Cantonese (Hong Kong) male — 雲龍 */
export const CANTONESE_MALE_VOICE = "zh-HK-WanLungNeural";

/** English (US) female — Jenny */
export const ENGLISH_FEMALE_VOICE_ALT = "en-US-JennyNeural";

/** @deprecated Use resolveCompanionTtsProsody — kept for tests that import the old table */
export const EMOTION_EDGE_PROSODY = Object.freeze({
  neutral: { rate: "+8%", pitch: "+12Hz", volume: "+4%" },
  happy: { rate: "+20%", pitch: "+26Hz", volume: "+10%" },
  thinking: { rate: "-4%", pitch: "+2Hz", volume: "-6%" },
  sad: { rate: "-12%", pitch: "-8Hz", volume: "-10%" },
  surprised: { rate: "+24%", pitch: "+30Hz", volume: "+12%" },
  angry: { rate: "+14%", pitch: "-4Hz", volume: "+8%" },
});

/**
 * @param {string} text
 * @param {{
 *   voice?: string,
 *   emotion?: string,
 *   nuance?: string,
 *   talkStyle?: string,
 *   speechEnergy?: number,
 *   rate?: string,
 *   pitch?: string,
 *   volume?: string,
 *   lang?: string,
 *   characterId?: string,
 * }} [opts]
 * @returns {Promise<{ audio: Buffer, voice: string, contentType: string, prosody: object }>}
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

  const lang = String(opts.lang || "").toLowerCase();
  const prosodyPack = resolveCompanionTtsProsody({
    emotion: opts.emotion || "neutral",
    nuance: opts.nuance || "none",
    talkStyle: opts.talkStyle || "explain",
    speechEnergy: opts.speechEnergy,
    text: clean,
    lang,
    characterId: opts.characterId,
    voiceId: opts.voice,
  });
  const edge = prosodyPack.edge;

  const defaultVoice =
    lang === "en" || lang === "en-us" ? ENGLISH_FEMALE_VOICE : CANTONESE_FEMALE_VOICE;
  const voice = resolveEdgeVoiceId(opts.voice || defaultVoice);

  const tts = new EdgeTTS(clean, voice, {
    rate: opts.rate || edge.rate,
    pitch: opts.pitch || edge.pitch,
    volume: opts.volume || edge.volume,
  });
  const result = await tts.synthesize();
  const audio = Buffer.from(await result.audio.arrayBuffer());

  return {
    audio,
    voice,
    contentType: "audio/mpeg",
    prosody: prosodyPack,
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
      nuance: raw.nuance,
      talkStyle: raw.talkStyle,
      speechEnergy: raw.speechEnergy,
      voice: raw.voice,
      lang,
      characterId: raw.characterId,
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
