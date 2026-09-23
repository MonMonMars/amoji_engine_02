/**
 * Pre-synthesize wait-time dialogue for faster first spoken filler.
 */
import { LEARN_DIALOGUE } from "./companionLearnDialogue.js";
import { stripReplyTagsForSpeak } from "./companionStreamSpeak.js";
import {
  THINKING_PHRASES_EN,
  THINKING_PHRASES_YUE,
} from "./companionThinkingDialogue.js";

export const COMPANION_DIALOGUE_PRELOAD_SCHEMA = "amoji.companionDialoguePreload.v1";

/** @type {Map<string, Blob>} */
const ttsCache = new Map();

/** @type {Promise<unknown> | null} */
let inflight = null;

/**
 * @param {string} lang
 * @param {string} phrase
 */
export function dialogueTtsCacheKey(lang, phrase) {
  return `${lang}::${phrase}`;
}

/**
 * @param {string} key
 * @returns {Blob | null}
 */
export function getCachedDialogueTts(key) {
  return ttsCache.get(key) || null;
}

/**
 * @param {boolean} [isEnglish]
 */
export function collectIdleDialoguePhrases(isEnglish = false) {
  const bucket = LEARN_DIALOGUE.idle;
  const list = isEnglish ? bucket?.en : bucket?.yue;
  return [...(list || [])];
}

/**
 * @param {boolean} [isEnglish]
 * @param {number} [perPhase]
 */
export function collectWaitDialoguePhrases(isEnglish = false, perPhase = 2) {
  const thinking = isEnglish ? THINKING_PHRASES_EN : THINKING_PHRASES_YUE;
  const idle = collectIdleDialoguePhrases(isEnglish).slice(0, perPhase);
  return [...new Set([...thinking, ...idle].filter(Boolean))];
}

/**
 * @param {{
 *   cloudTtsUrl?: string | null,
 *   isEnglish?: boolean,
 *   voiceName?: string,
 *   lang?: string,
 *   fetchImpl?: typeof fetch,
 *   perPhase?: number,
 *   maxPhrases?: number,
 * }} [opts]
 */
/**
 * @param {string[]} phrases
 * @param {{
 *   cloudTtsUrl: string,
 *   lang?: string,
 *   voiceName?: string,
 *   fetchImpl?: typeof fetch,
 *   performance?: object,
 * }} opts
 */
export async function prefetchDialogueTtsPhrases(phrases, opts = {}) {
  const cloudTtsUrl = opts.cloudTtsUrl || null;
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  if (!cloudTtsUrl || !fetchImpl) {
    return { ok: false, reason: "no-cloud-tts", cached: 0, phrases: 0 };
  }

  const lang = opts.lang || "zh-HK";
  const voiceName = opts.voiceName || "zh-HK-HiuMaanNeural";
  const perf = opts.performance || {
    emotion: "happy",
    nuance: "none",
    talkStyle: "soft",
    speechEnergy: 0.72,
  };

  let cached = 0;
  const list = [...new Set(phrases.map((p) => stripReplyTagsForSpeak(p)).filter(Boolean))];
  for (const phrase of list) {
    const key = dialogueTtsCacheKey(lang, phrase);
    if (ttsCache.has(key)) {
      cached += 1;
      continue;
    }
    try {
      const res = await fetchImpl(cloudTtsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: phrase,
          emotion: perf.emotion || "happy",
          nuance: perf.nuance || "none",
          talkStyle: perf.talkStyle || "soft",
          speechEnergy: perf.speechEnergy ?? 0.72,
          voice: voiceName,
          lang,
        }),
      });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (blob.size > 0) {
        ttsCache.set(key, blob);
        cached += 1;
      }
    } catch {
      /* skip failed phrase */
    }
  }
  return { ok: cached > 0, cached, phrases: list.length };
}

/**
 * Pre-synthesize visible starter-chip answers (paired with tutorial questions).
 * @param {{ reply: string }[]} pack
 * @param {{
 *   cloudTtsUrl?: string | null,
 *   isEnglish?: boolean,
 *   voiceName?: string,
 *   lang?: string,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
export async function prefetchStarterInstantReplies(pack, opts = {}) {
  const replies = (Array.isArray(pack) ? pack : [])
    .map((row) => row?.reply)
    .filter(Boolean);
  if (!replies.length) return { ok: false, reason: "empty-pack", cached: 0, phrases: 0 };
  const isEnglish = Boolean(opts.isEnglish);
  return prefetchDialogueTtsPhrases(replies, {
    cloudTtsUrl: opts.cloudTtsUrl,
    lang: opts.lang || (isEnglish ? "en-US" : "zh-HK"),
    voiceName:
      opts.voiceName ||
      (isEnglish ? "en-US-JennyNeural" : "zh-HK-HiuMaanNeural"),
    fetchImpl: opts.fetchImpl,
    performance: {
      emotion: "happy",
      nuance: "curious",
      talkStyle: "soft",
      speechEnergy: 0.78,
    },
  });
}

export async function prefetchWaitDialogue(opts = {}) {
  const cloudTtsUrl = opts.cloudTtsUrl || null;
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  if (!cloudTtsUrl || !fetchImpl) {
    return { ok: false, reason: "no-cloud-tts" };
  }
  if (inflight) return inflight;

  const isEnglish = Boolean(opts.isEnglish);
  const lang = opts.lang || (isEnglish ? "en-US" : "zh-HK");
  const voiceName = opts.voiceName || (isEnglish ? "en-US-JennyNeural" : "zh-HK-HiuMaanNeural");
  const phrases = collectWaitDialoguePhrases(isEnglish, opts.perPhase ?? 2).slice(
    0,
    opts.maxPhrases ?? 64,
  );

  inflight = (async () => {
    const result = await prefetchDialogueTtsPhrases(phrases, {
      cloudTtsUrl,
      lang,
      voiceName,
      fetchImpl,
      performance: {
        emotion: "thinking",
        nuance: "curious",
        talkStyle: "soft",
        speechEnergy: 0.38,
      },
    });
    return { ok: result.ok, cached: result.cached, phrases: phrases.length };
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.__amojiDialoguePreload = {
    schema: COMPANION_DIALOGUE_PRELOAD_SCHEMA,
    prefetch: prefetchWaitDialogue,
    prefetchStarter: prefetchStarterInstantReplies,
    prefetchPhrases: prefetchDialogueTtsPhrases,
    getCached: getCachedDialogueTts,
    cacheKey: dialogueTtsCacheKey,
  };
}
