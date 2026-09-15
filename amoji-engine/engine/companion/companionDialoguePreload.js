/**
 * Pre-synthesize wait-time dialogue for faster first spoken filler.
 */
import { LEARN_DIALOGUE } from "./companionLearnDialogue.js";
import {
  THINKING_PHRASES_EN,
  THINKING_PHRASES_YUE,
} from "./companionContentMotion.js";

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
 * @param {number} [perPhase]
 */
export function collectWaitDialoguePhrases(isEnglish = false, perPhase = 2) {
  const phases = [
    "avatar-load",
    "connecting",
    "downloading",
    "learning",
    "idle",
    "thinking-wait",
  ];
  /** @type {string[]} */
  const phrases = [];
  for (const phase of phases) {
    const bucket = LEARN_DIALOGUE[phase];
    const list = isEnglish ? bucket?.en : bucket?.yue;
    if (!list?.length) continue;
    for (let i = 0; i < Math.min(perPhase, list.length); i += 1) {
      phrases.push(list[i]);
    }
  }
  const thinking = isEnglish ? THINKING_PHRASES_EN : THINKING_PHRASES_YUE;
  for (let i = 0; i < Math.min(3, thinking.length); i += 1) {
    phrases.push(thinking[i]);
  }
  return [...new Set(phrases.filter(Boolean))];
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
    opts.maxPhrases ?? 14,
  );

  inflight = (async () => {
    let cached = 0;
    for (const phrase of phrases) {
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
            emotion: "thinking",
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
    return { ok: cached > 0, cached, phrases: phrases.length };
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
    getCached: getCachedDialogueTts,
    cacheKey: dialogueTtsCacheKey,
  };
}
