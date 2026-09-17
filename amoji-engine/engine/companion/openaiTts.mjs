/**
 * OpenAI gpt-4o-mini-tts — ChatGPT-style emotional speech via natural-language instructions.
 * @see https://developers.openai.com/api/docs/guides/text-to-speech
 */
import {
  buildTtsInstruct,
  instructSpeakingSpeed,
  MAX_CLOUD_TTS_CHARS,
} from "./companionTtsProsody.js";

export const OPENAI_TTS_SCHEMA = "amoji.openaiTts.v2";

const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";
const DEFAULT_MODEL = "gpt-4o-mini-tts";

/** Map Edge / catalog voice ids → OpenAI built-in voices. */
const VOICE_MAP = Object.freeze({
  "zh-hk-hiumaanneural": "marin",
  "zh-hk-hiugaaineural": "coral",
  "zh-hk-wanlungneural": "ash",
  "en-us-arianeural": "marin",
  "en-us-jennyneural": "coral",
  "en-hk-yanneural": "coral",
  "en-hk-samneural": "ash",
  marin: "marin",
  coral: "coral",
  shimmer: "shimmer",
  sage: "sage",
  alloy: "alloy",
  ash: "ash",
});

/**
 * @param {string | null | undefined} voice
 */
export function normalizeOpenAiVoiceKey(voice) {
  let key = String(voice || "")
    .trim()
    .toLowerCase();
  key = key.replace(
    /-(idol|warm|cool|bright|sweet|story|calm|bold|soft|fiery|chibi|hero|sunny|sporty|elegant|sharp)$/i,
    "",
  );
  return key;
}

/**
 * @param {string | null | undefined} voice
 * @param {string | null | undefined} lang
 */
export function resolveOpenAiVoice(voice, lang = "") {
  const key = normalizeOpenAiVoiceKey(voice);
  if (VOICE_MAP[key]) return VOICE_MAP[key];
  if (/wanlung|samneural/.test(key)) return "ash";
  if (/hiumaan|hiugaai|yanneural|jenny|aria/.test(key)) return "marin";
  const lc = String(lang || "").toLowerCase();
  if (lc === "en" || lc.startsWith("en-")) return "marin";
  return "coral";
}

/**
 * @returns {string | null}
 */
export function resolveOpenAiApiKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.AMOJI_LLM_KEY ||
    process.env.AMOJI_OPENAI_KEY ||
    null
  );
}

/**
 * @param {string} text
 * @param {{
 *   voice?: string,
 *   lang?: string,
 *   emotion?: string,
 *   nuance?: string,
 *   talkStyle?: string,
 *   speechEnergy?: number,
 *   instructions?: string,
 *   model?: string,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
export async function synthesizeOpenAiSpeech(text, opts = {}) {
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) return null;

  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (!fetchImpl) return null;

  const clean = String(text || "")
    .replace(/[*_`#>/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CLOUD_TTS_CHARS);
  if (!clean) return null;

  const instructions =
    opts.instructions ||
    buildTtsInstruct({
      emotion: opts.emotion,
      nuance: opts.nuance,
      talkStyle: opts.talkStyle,
      speechEnergy: opts.speechEnergy,
      lang: opts.lang,
      text: clean,
    });
  const speed = instructSpeakingSpeed({
    emotion: opts.emotion,
    speechEnergy: opts.speechEnergy,
  });

  const voice = resolveOpenAiVoice(opts.voice, opts.lang);
  const model = opts.model || process.env.OPENAI_TTS_MODEL || DEFAULT_MODEL;

  const res = await fetchImpl(OPENAI_SPEECH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      input: clean,
      instructions: `${instructions}\n\nSpeak at ${speed}x. Never monotone.`,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `openai-tts-${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`,
    );
  }

  const audio = Buffer.from(await res.arrayBuffer());
  if (!audio.byteLength) {
    throw new Error("openai-tts-empty");
  }

  return {
    audio,
    voice,
    model,
    contentType: "audio/mpeg",
    instructions,
    speed,
  };
}
