/**
 * Companion cloud TTS — OpenAI gpt-4o-mini-tts (ChatGPT-style instructions) with Edge fallback.
 * Server-side only — browsers cannot call these hosts directly.
 */
import { EdgeTTS } from "edge-tts-universal";
import {
  enrichTtsPerformance,
  MAX_CLOUD_TTS_CHARS,
  resolveCompanionTtsProsody,
} from "./companionTtsProsody.js";
import { resolveEdgeVoiceId } from "./companionVoiceProfiles.js";
import { resolveOpenAiApiKey, synthesizeOpenAiSpeech } from "./openaiTts.mjs";

export const TTS_HANDLER_SCHEMA = "amoji.ttsHandler.v3";

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
    .slice(0, MAX_CLOUD_TTS_CHARS);
  if (!clean) {
    throw new Error("empty text");
  }

  const lang = String(opts.lang || "").toLowerCase();
  const enriched = enrichTtsPerformance(
    {
      emotion: opts.emotion || "neutral",
      nuance: opts.nuance || "none",
      talkStyle: opts.talkStyle || "explain",
      speechEnergy: opts.speechEnergy,
      lang,
    },
    clean,
  );
  const prosodyPack = resolveCompanionTtsProsody({
    ...enriched,
    text: clean,
    lang,
    characterId: opts.characterId,
    voiceId: opts.voice,
  });
  const instructions = opts.instructions || prosodyPack.instruct;

  const provider = String(process.env.AMOJI_TTS_PROVIDER || "auto").toLowerCase();
  const tryOpenAi =
    provider === "openai" ||
    (provider === "auto" && Boolean(resolveOpenAiApiKey()));

  if (tryOpenAi) {
    try {
      const oai = await synthesizeOpenAiSpeech(clean, {
        voice: opts.voice,
        lang,
        emotion: enriched.emotion,
        nuance: enriched.nuance,
        talkStyle: enriched.talkStyle,
        speechEnergy: enriched.speechEnergy,
        instructions,
        fetchImpl: opts.fetchImpl,
      });
      if (oai) {
        return {
          audio: oai.audio,
          voice: oai.voice,
          contentType: oai.contentType,
          prosody: prosodyPack,
          engine: "openai",
          model: oai.model,
        };
      }
    } catch (err) {
      if (provider === "openai") throw err;
      console.warn("[tts] OpenAI TTS failed, using Edge fallback:", err?.message || err);
    }
  }

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
    engine: "edge",
  };
}

/** @deprecated Use synthesizeSpeech */
export const synthesizeCantoneseSpeech = synthesizeSpeech;

export function ttsCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers":
      "X-Tts-Voice, X-Tts-Engine, X-Tts-Emotion, X-Tts-Model",
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
  const lang = raw.lang ?? raw.language ?? "";

  try {
    const { audio, voice, contentType, engine, model, prosody } =
      await synthesizeSpeech(text, {
        emotion: raw.emotion ?? "neutral",
        nuance: raw.nuance,
        talkStyle: raw.talkStyle,
        speechEnergy: raw.speechEnergy,
        voice: raw.voice,
        lang,
        characterId: raw.characterId,
        instructions: raw.instructions,
      });
    return {
      status: 200,
      headers: {
        ...ttsCorsHeaders(),
        "Content-Type": contentType,
        "X-Tts-Voice": voice,
        "X-Tts-Engine": engine || "edge",
        "X-Tts-Emotion": prosody?.emotion || String(raw.emotion || "neutral"),
        ...(model ? { "X-Tts-Model": model } : {}),
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
