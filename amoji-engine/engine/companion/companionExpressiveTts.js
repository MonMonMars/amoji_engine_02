/**
 * ChatGPT-style expressive TTS — clause-level prosody from reply content.
 * Splits speech into natural phrases and resolves per-clause emotion/energy.
 */
import { analyzeSpeechChunk } from "./companionContentMotion.js";
import { resolveCompanionTtsProsody } from "./companionTtsProsody.js";

export const COMPANION_EXPRESSIVE_TTS_SCHEMA = "amoji.companionExpressiveTts.v1";

/**
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function splitExpressiveClauses(text) {
  const clean = String(text || "").trim();
  if (!clean) return [];

  const sentenceParts = clean
    .split(/(?<=[。！？!?；;\n])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sentenceParts.length ? sentenceParts : [clean];
}

/**
 * @param {string} clause
 */
export function clausePauseMs(clause) {
  const raw = String(clause || "");
  if (/…|\.{3,}|⋯/.test(raw)) return 380;
  if (/[!！]{2,}|！/.test(raw)) return 300;
  if (/[。！？!?]/.test(raw)) return 240;
  if (/[，,、;；]/.test(raw)) return 160;
  return 120;
}

/**
 * @param {string} clause
 * @param {{
 *   emotion?: string,
 *   nuance?: string,
 *   talkStyle?: string,
 *   speechEnergy?: number,
 *   lang?: string,
 * }} [basePerf]
 * @param {string} [characterId]
 * @param {string} [voiceId]
 */
export function resolveClauseTtsPerformance(
  clause,
  basePerf = {},
  characterId = "",
  voiceId = "",
) {
  const chunk = analyzeSpeechChunk(clause, {
    emotion: basePerf.emotion,
    nuance: basePerf.nuance,
  });
  const speechEnergy =
    chunk.speechEnergy ??
    basePerf.speechEnergy ??
    0.64;
  const prosody = resolveCompanionTtsProsody({
    emotion: chunk.emotion || basePerf.emotion || "neutral",
    nuance: chunk.nuance || basePerf.nuance || "none",
    talkStyle: chunk.talkStyle || basePerf.talkStyle || "explain",
    speechEnergy,
    text: clause,
    lang: basePerf.lang,
    characterId,
    voiceId: voiceId || basePerf.voiceId,
  });
  return {
    emotion: chunk.emotion || basePerf.emotion || "neutral",
    nuance: chunk.nuance || basePerf.nuance || "none",
    talkStyle: chunk.talkStyle || basePerf.talkStyle || "explain",
    speechEnergy,
    prosody,
    pauseMs: clausePauseMs(clause),
  };
}

/**
 * Expand a speak payload into clause-sized cloud TTS jobs.
 * @param {string} text
 * @param {ReturnType<typeof import("./companionTtsProsody.js").normalizeTtsPerformance>} basePerf
 * @param {string} [characterId]
 * @param {string} [lang]
 * @param {string} [voiceId]
 */
export function buildExpressiveTtsPlan(
  text,
  basePerf,
  characterId = "",
  lang = "zh-HK",
  voiceId = "",
) {
  const clauses = [];
  const resolvedVoice = voiceId || basePerf.voiceId || "";
  for (const part of splitExpressiveClauses(text)) {
    const perf = resolveClauseTtsPerformance(
      part,
      { ...basePerf, lang, voiceId: resolvedVoice },
      characterId,
      resolvedVoice,
    );
    clauses.push({
      text: part,
      ...perf,
    });
  }
  return {
    schema: COMPANION_EXPRESSIVE_TTS_SCHEMA,
    clauses,
  };
}
