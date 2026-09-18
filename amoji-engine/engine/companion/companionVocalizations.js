/**
 * Expressive non-word vocalizations — smile, laugh, giggle, um, thinking hums, etc.
 * Played before spoken sentences and on character poke/tap.
 */
export const COMPANION_VOCALIZATIONS_SCHEMA = "amoji.companionVocalizations.v1";

/** @typedef {'smile'|'laugh'|'giggle'|'um'|'thinking'|'gasp'|'sigh'|'aww'|'coy'} VocalizationType */

/** Poke/tap uses giggles + laughs only. */
export const POKE_VOCAL_TYPES = Object.freeze(["giggle", "laugh"]);

export const VOCALIZATION_TYPES = Object.freeze([
  "smile",
  "laugh",
  "giggle",
  "um",
  "thinking",
  "gasp",
  "sigh",
  "aww",
  "coy",
]);

/** @type {Record<VocalizationType, { yue: readonly string[], en: readonly string[] }>} */
const VOCAL_LINES = Object.freeze({
  smile: Object.freeze({
    yue: Object.freeze(["呵呵～", "嘿嘿～", "唔呵呵～"]),
    en: Object.freeze(["Heh～", "Mhm～", "Heh heh～"]),
  }),
  laugh: Object.freeze({
    yue: Object.freeze(["哈哈～", "哈哈哈！", "呵哈哈～", "哈哈你戳我～", "呵呵哈哈哈！"]),
    en: Object.freeze(["Ha ha～", "Haha!", "Ahaha～", "Ha ha ha!", "Ahaha you poked me!"]),
  }),
  giggle: Object.freeze({
    yue: Object.freeze(["嘻嘻～", "嘿嘿嘻～", "唔嘻嘻～", "哎呀嘻嘻～", "唔呵呵嘻～"]),
    en: Object.freeze(["Hehe～", "Teehee～", "Ehehe～", "Hehe hehe!", "Tee hee～"]),
  }),
  um: Object.freeze({
    yue: Object.freeze(["嗯……", "唔……", "嗯嗯……"]),
    en: Object.freeze(["Um……", "Umm……", "Uh……"]),
  }),
  thinking: Object.freeze({
    yue: Object.freeze(["嗯唔……", "呣……", "嗯……嗯……"]),
    en: Object.freeze(["Hmm……", "Mmm……", "Hmm… um…"]),
  }),
  gasp: Object.freeze({
    yue: Object.freeze(["哇！", "咦？！", "吓！"]),
    en: Object.freeze(["Oh!", "Oh wow!", "Whoa!"]),
  }),
  sigh: Object.freeze({
    yue: Object.freeze(["唉……", "哎……", "唔……"]),
    en: Object.freeze(["Sigh……", "Ah……", "Hmm……"]),
  }),
  aww: Object.freeze({
    yue: Object.freeze(["啊～", "哎呀～", "哇～"]),
    en: Object.freeze(["Aww～", "Aw～", "Oh～"]),
  }),
  coy: Object.freeze({
    yue: Object.freeze(["唔～", "哼～", "嘿嘿……"]),
    en: Object.freeze(["Mm～", "Heh……", "Oh my～"]),
  }),
});

/** @type {Record<VocalizationType, { emotion: string, nuance: string, talkStyle: string, speechEnergy: number }>} */
export const VOCALIZATION_PERFORMANCE = Object.freeze({
  smile: Object.freeze({
    emotion: "happy",
    nuance: "none",
    talkStyle: "soft",
    speechEnergy: 0.52,
  }),
  laugh: Object.freeze({
    emotion: "happy",
    nuance: "excited",
    talkStyle: "celebrate",
    speechEnergy: 0.78,
  }),
  giggle: Object.freeze({
    emotion: "happy",
    nuance: "shy",
    talkStyle: "soft",
    speechEnergy: 0.65,
  }),
  um: Object.freeze({
    emotion: "thinking",
    nuance: "curious",
    talkStyle: "thinking",
    speechEnergy: 0.38,
  }),
  thinking: Object.freeze({
    emotion: "thinking",
    nuance: "curious",
    talkStyle: "thinking",
    speechEnergy: 0.42,
  }),
  gasp: Object.freeze({
    emotion: "surprised",
    nuance: "excited",
    talkStyle: "celebrate",
    speechEnergy: 0.82,
  }),
  sigh: Object.freeze({
    emotion: "sad",
    nuance: "stress",
    talkStyle: "soft",
    speechEnergy: 0.35,
  }),
  aww: Object.freeze({
    emotion: "happy",
    nuance: "love",
    talkStyle: "soft",
    speechEnergy: 0.58,
  }),
  coy: Object.freeze({
    emotion: "happy",
    nuance: "shy",
    talkStyle: "soft",
    speechEnergy: 0.55,
  }),
});

/** Gap after vocal before the main sentence (ms). */
export const VOCALIZATION_PAUSE_MS = Object.freeze({
  smile: 140,
  laugh: 120,
  giggle: 130,
  um: 180,
  thinking: 200,
  gasp: 100,
  sigh: 160,
  aww: 130,
  coy: 150,
});

export const LEADING_VOCAL_RE =
  /^(嗯+|唔+|呃+|啊+|哇+|咦+|呵+|嘻+|哈+|he+h+|ha+h+|oh+|um+|uh+|hmm+|sigh|唉|哎|呣+)/i;

/**
 * @param {string | null | undefined} text
 */
export function isVocalizationText(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 14) return false;
  return LEADING_VOCAL_RE.test(t);
}

/**
 * @param {string | null | undefined} text
 */
export function textAlreadyHasLeadingVocal(text) {
  return LEADING_VOCAL_RE.test(String(text || "").trim());
}

/**
 * @param {Record<string, number>} weights
 * @param {number} [seed]
 */
function weightedPick(weights, seed = Math.random()) {
  const entries = Object.entries(weights).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (!total) return "smile";
  let r = seed * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[0][0];
}

let lastVocalIndex = -1;
let lastVocalType = "";

/**
 * @param {VocalizationType | string} type
 * @param {boolean} [isEnglish]
 */
export function pickVocalLine(type, isEnglish = false) {
  const bucket = VOCAL_LINES[type] || VOCAL_LINES.smile;
  const list = isEnglish ? bucket.en : bucket.yue;
  if (!list.length) return "";
  let idx = Math.floor(Math.random() * list.length);
  if (list.length > 1 && idx === lastVocalIndex && type === lastVocalType) {
    idx = (idx + 1) % list.length;
  }
  lastVocalIndex = idx;
  lastVocalType = String(type);
  return list[idx];
}

/**
 * @param {string} emotion
 * @param {string} nuance
 * @param {string} talkStyle
 * @param {string} text
 * @returns {Record<string, number>}
 */
function emotionVocalWeights(emotion, nuance, talkStyle, text) {
  const e = String(emotion || "neutral").toLowerCase();
  const n = String(nuance || "none").toLowerCase();
  const style = String(talkStyle || "explain").toLowerCase();
  const raw = String(text || "");

  /** @type {Record<string, number>} */
  const w = { smile: 1.5, um: 1 };

  if (e === "happy") {
    w.giggle = 3;
    w.laugh = 2.5;
    w.smile = 3;
    w.aww = 1.5;
  }
  if (e === "thinking" || style === "thinking") {
    w.thinking = 4;
    w.um = 4;
    w.smile = 0.4;
  }
  if (e === "surprised") {
    w.gasp = 4;
    w.aww = 2;
  }
  if (e === "sad") {
    w.sigh = 4;
    w.um = 2;
  }
  if (n === "shy") {
    w.giggle = 3.5;
    w.coy = 3;
    w.smile = 2;
  }
  if (n === "excited") {
    w.laugh = 3;
    w.gasp = 2;
    w.giggle = 2.5;
  }
  if (n === "love") {
    w.aww = 3.5;
    w.smile = 2;
    w.coy = 2;
  }
  if (n === "curious") {
    w.um = 3;
    w.thinking = 3;
  }
  if (/[?？]/.test(raw)) {
    w.um = (w.um || 0) + 2;
    w.thinking = (w.thinking || 0) + 1.5;
  }
  if (/哈哈|呵呵|haha|hehe/i.test(raw)) {
    w.laugh = 5;
    w.giggle = 3;
  }
  if (/哇|嘩|wow|!{2,}/i.test(raw)) {
    w.gasp = (w.gasp || 0) + 2.5;
    w.laugh = (w.laugh || 0) + 1.5;
  }
  if (e === "neutral") {
    w.smile = 2;
    w.um = 2;
  }

  return w;
}

/**
 * Pick a short vocalization to play before a spoken sentence.
 * @param {Record<string, unknown>} [performance]
 * @param {string | null | undefined} text
 * @param {{ isEnglish?: boolean }} [opts]
 * @returns {{ type: VocalizationType, text: string, performance: Record<string, unknown>, pauseMs: number } | null}
 */
export function pickPreSentenceVocalization(performance = {}, text, opts = {}) {
  if (performance.skipVocalization) return null;
  const raw = String(text || "").trim();
  if (!raw || raw.length < 2) return null;
  if (textAlreadyHasLeadingVocal(raw)) return null;
  if (isVocalizationText(raw)) return null;

  const isEnglish = Boolean(
    opts.isEnglish ?? String(performance.lang || "").startsWith("en"),
  );
  const emotion = String(performance.emotion || "neutral");
  const nuance = String(performance.nuance || "none");
  const talkStyle = String(performance.talkStyle || "explain");

  const type = /** @type {VocalizationType} */ (
    weightedPick(emotionVocalWeights(emotion, nuance, talkStyle, raw))
  );
  const vocalText = pickVocalLine(type, isEnglish);
  if (!vocalText) return null;

  const base = VOCALIZATION_PERFORMANCE[type] || VOCALIZATION_PERFORMANCE.smile;
  const speechEnergy = Math.min(
    base.speechEnergy,
    (Number(performance.speechEnergy) || 0.68) * 0.82 + 0.08,
  );

  return {
    type,
    text: vocalText,
    pauseMs: VOCALIZATION_PAUSE_MS[type] ?? 150,
    performance: {
      ...base,
      ...performance,
      vocalization: type,
      speechEnergy,
      singleUtterance: true,
    },
  };
}

/**
 * Poke/tap reaction vocal — giggle or laugh only (user request).
 * @param {boolean} [isEnglish]
 */
export function pickPokeVocalization(isEnglish = false) {
  const type = /** @type {"giggle" | "laugh"} */ (
    weightedPick({
      giggle: 3,
      laugh: 2,
    })
  );
  const vocalText = pickVocalLine(type, isEnglish);
  const base = VOCALIZATION_PERFORMANCE[type];
  return {
    type,
    text: vocalText,
    pauseMs: VOCALIZATION_PAUSE_MS[type] ?? 120,
    performance: {
      ...base,
      emotion: "happy",
      nuance: type === "giggle" ? "shy" : "excited",
      talkStyle: "celebrate",
      speechEnergy: type === "laugh" ? 0.86 : 0.8,
      vocalization: type,
      pokeReaction: true,
      singleUtterance: true,
    },
  };
}

/**
 * Merge poke giggle/laugh with tap line — brief pause so the laugh lands first.
 * @param {string} vocalText
 * @param {string} sentenceText
 * @param {boolean} [isEnglish]
 */
export function mergePokeVocalIntoSpeech(vocalText, sentenceText, isEnglish = false) {
  const vocal = String(vocalText || "").trim();
  const sentence = String(sentenceText || "").trim();
  if (!vocal) return sentence;
  if (!sentence) return vocal;
  const bridge = isEnglish ? "… " : "～，";
  const lead = vocal.replace(/[～~…]+$/u, "");
  return `${lead}${bridge}${sentence}`;
}

/**
 * @param {VocalizationType | string} type
 */
export function vocalizationPerformance(type) {
  return VOCALIZATION_PERFORMANCE[type] || VOCALIZATION_PERFORMANCE.smile;
}

/**
 * OpenAI / Edge instruct hint for vocalization-only lines.
 * @param {string | null | undefined} text
 */
/**
 * Merge vocal filler + sentence into one TTS utterance (same voice, one clip).
 * @param {string | null | undefined} vocalText
 * @param {string | null | undefined} sentenceText
 */
export function mergeVocalIntoSpeech(vocalText, sentenceText) {
  const vocal = String(vocalText || "").trim();
  const sentence = String(sentenceText || "").trim();
  if (!vocal) return sentence;
  if (!sentence) return vocal;
  const bridge = /[…\.~～]$/.test(vocal) ? " " : "… ";
  return `${vocal}${bridge}${sentence}`;
}

/**
 * Prefix a sentence with a mood vocal — returns merged text for a single TTS job.
 * @param {string} sentenceText
 * @param {Record<string, unknown>} [performance]
 * @param {{ isEnglish?: boolean }} [opts]
 */
export function applyVocalPrefixToSpeech(sentenceText, performance = {}, opts = {}) {
  const raw = String(sentenceText || "").trim();
  if (!raw || performance.skipVocalization) {
    return { text: raw, performance, merged: false };
  }
  const vocal = pickPreSentenceVocalization(performance, raw, opts);
  if (!vocal?.text) {
    return { text: raw, performance, merged: false };
  }
  return {
    text: mergeVocalIntoSpeech(vocal.text, raw),
    performance: {
      ...performance,
      vocalization: vocal.type,
      vocalPrefix: vocal.text,
      skipVocalization: true,
    },
    merged: true,
  };
}

/**
 * Poke/tap: playful vocal merged into the tap line (one TTS clip).
 * @param {string} sentenceText
 * @param {Record<string, unknown>} [performance]
 * @param {boolean} [isEnglish]
 */
export function applyPokeVocalToSpeech(sentenceText, performance = {}, isEnglish = false) {
  const raw = String(sentenceText || "").trim();
  const vocal = pickPokeVocalization(isEnglish);
  return {
    text: mergePokeVocalIntoSpeech(vocal.text, raw, isEnglish),
    performance: {
      ...vocal.performance,
      ...performance,
      skipVocalization: true,
      vocalization: vocal.type,
      vocalPrefix: vocal.text,
      pokeReaction: true,
    },
    merged: true,
  };
}

export function vocalizationInstructHint(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (/嘻嘻|hehe|teehee|ehehe/i.test(raw)) {
    return "Play as a light giggle — breathy, cute, not spelling letters.";
  }
  if (/哈哈|haha|ahaha/i.test(raw)) {
    return "Play as a real laugh/chuckle, not reading the word 'haha'.";
  }
  if (/呵呵|嘿嘿|heh/i.test(raw)) {
    return "A warm smile in the voice — soft, friendly chuckle.";
  }
  if (/嗯|唔|um+|uh+|hmm|呣/i.test(raw)) {
    return "Natural thinking hum — soft vocal filler, not a spoken word.";
  }
  if (/哇|咦|吓|oh|whoa/i.test(raw)) {
    return "Quick surprised gasp or delighted 'oh!' — pitch lift.";
  }
  if (/唉|哎|sigh/i.test(raw)) {
    return "Gentle sigh — empathetic, soft exhale.";
  }
  if (/啊～|aww|aw～/i.test(raw)) {
    return "Tender 'aww' — affectionate, warm vowels.";
  }
  if (/唔～|哼|oh my|mm～/i.test(raw)) {
    return "Coy, shy vocal — playful and soft.";
  }
  if (isVocalizationText(raw)) {
    return "Expressive non-word vocal — emotionally colored, never flat or robotic.";
  }
  return "";
}
