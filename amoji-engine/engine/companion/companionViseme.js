/**
 * Lip-sync viseme mapping — shared by companionVoice and face test pages.
 * CJK uses interjection + common-char tables (VN / gacha style), with audio RMS
 * driving jaw openness so lips stay synced to the waveform.
 */
import { TALK_MOUTH_OPEN_MAX } from "./companionFaceRest.js";
import { talkSpeedPlaybackRatio } from "./companionTalkSpeed.js";

/** Scale raw char openness before the global talk cap. */
export const VISEME_OPEN_SCALE = 0.52;

/**
 * @param {number} open
 * @returns {number}
 */
export function clampVisemeOpen(open) {
  const v = Math.max(0, Math.min(1, Number(open) || 0));
  return Math.min(TALK_MOUTH_OPEN_MAX, v * VISEME_OPEN_SCALE);
}

/**
 * @param {{ shape: string, open: number }} viseme
 * @returns {{ shape: string, open: number }}
 */
function normalizeViseme(viseme) {
  return { shape: viseme.shape, open: clampVisemeOpen(viseme.open) };
}

/** @type {Record<string, { shape: string, open: number }>} */
const CJK_CHAR_VISEME = {
  // Wide open — 啊類
  啊: { shape: "aa", open: 0.86 },
  阿: { shape: "aa", open: 0.82 },
  呀: { shape: "aa", open: 0.8 },
  吖: { shape: "aa", open: 0.78 },
  哇: { shape: "aa", open: 0.88 },
  哈: { shape: "aa", open: 0.84 },
  呵: { shape: "aa", open: 0.8 },
  嘻: { shape: "aa", open: 0.78 },
  嘿: { shape: "aa", open: 0.76 },
  媽: { shape: "aa", open: 0.74 },
  爸: { shape: "aa", open: 0.74 },
  大: { shape: "aa", open: 0.72 },
  話: { shape: "aa", open: 0.7 },
  講: { shape: "aa", open: 0.72 },
  看: { shape: "aa", open: 0.68 },
  喊: { shape: "aa", open: 0.82 },
  叫: { shape: "aa", open: 0.76 },
  // Round — 哦 / 我類
  哦: { shape: "oh", open: 0.74 },
  喔: { shape: "oh", open: 0.74 },
  噢: { shape: "oh", open: 0.72 },
  我: { shape: "oh", open: 0.7 },
  多: { shape: "oh", open: 0.68 },
  過: { shape: "oh", open: 0.66 },
  可: { shape: "oh", open: 0.64 },
  坐: { shape: "oh", open: 0.62 },
  波: { shape: "oh", open: 0.66 },
  國: { shape: "oh", open: 0.64 },
  落: { shape: "oh", open: 0.68 },
  做: { shape: "oh", open: 0.66 },
  果: { shape: "oh", open: 0.64 },
  哥: { shape: "oh", open: 0.7 },
  說: { shape: "oh", open: 0.68 },
  // Smile / spread — 呢你類
  呢: { shape: "ee", open: 0.62 },
  你: { shape: "ee", open: 0.6 },
  的: { shape: "ee", open: 0.52 },
  系: { shape: "ee", open: 0.58 },
  係: { shape: "ee", open: 0.58 },
  這: { shape: "ee", open: 0.56 },
  些: { shape: "ee", open: 0.54 },
  喜: { shape: "ee", open: 0.64 },
  笑: { shape: "ee", open: 0.66 },
  比: { shape: "ee", open: 0.56 },
  地: { shape: "ee", open: 0.54 },
  里: { shape: "ee", open: 0.54 },
  理: { shape: "ee", open: 0.56 },
  已: { shape: "ee", open: 0.5 },
  以: { shape: "ee", open: 0.52 },
  // Closed / nasal — 嗯唔類
  嗯: { shape: "ee", open: 0.18 },
  唔: { shape: "ee", open: 0.22 },
  恩: { shape: "ee", open: 0.2 },
  呣: { shape: "ee", open: 0.16 },
  嘛: { shape: "ee", open: 0.24 },
  吧: { shape: "ee", open: 0.26 },
  咩: { shape: "ee", open: 0.28 },
  // Small / tight — 一思類
  一: { shape: "ih", open: 0.42 },
  日: { shape: "ih", open: 0.44 },
  知: { shape: "ih", open: 0.48 },
  思: { shape: "ih", open: 0.46 },
  意: { shape: "ih", open: 0.5 },
  西: { shape: "ih", open: 0.46 },
  事: { shape: "ih", open: 0.48 },
  七: { shape: "ih", open: 0.4 },
  時: { shape: "ih", open: 0.5 },
  點: { shape: "ih", open: 0.52 },
  系: { shape: "ih", open: 0.48 },
  // Rounded pucker — 好去類
  好: { shape: "ou", open: 0.72 },
  去: { shape: "ou", open: 0.7 },
  出: { shape: "ou", open: 0.68 },
  雨: { shape: "ou", open: 0.66 },
  路: { shape: "ou", open: 0.64 },
  度: { shape: "ou", open: 0.62 },
  都: { shape: "ou", open: 0.66 },
  土: { shape: "ou", open: 0.6 },
  戶: { shape: "ou", open: 0.62 },
  苦: { shape: "ou", open: 0.64 },
  哭: { shape: "ou", open: 0.7 },
  書: { shape: "ou", open: 0.58 },
  女: { shape: "ou", open: 0.64 },
  主: { shape: "ou", open: 0.6 },
  住: { shape: "ou", open: 0.62 },
  // Sigh / sad
  唉: { shape: "aa", open: 0.62 },
  哎: { shape: "aa", open: 0.58 },
  嗚: { shape: "ou", open: 0.56 },
  呃: { shape: "ih", open: 0.32 },
  欸: { shape: "ee", open: 0.36 },
};

/** Vowel ring fallback — smoother than charCode % 5. */
const CJK_VOWEL_RING = Object.freeze([
  { shape: "aa", open: 0.78 },
  { shape: "oh", open: 0.7 },
  { shape: "ee", open: 0.6 },
  { shape: "ih", open: 0.54 },
  { shape: "ou", open: 0.68 },
  { shape: "aa", open: 0.74 },
  { shape: "oh", open: 0.66 },
  { shape: "ee", open: 0.58 },
  { shape: "ih", open: 0.5 },
  { shape: "ou", open: 0.64 },
  { shape: "aa", open: 0.72 },
]);

const LIP_SYNC_CACHE = new Map();
const LIP_SYNC_CACHE_MAX = 72;

/**
 * Map a character to a viseme shape + openness for lip sync.
 * @param {string} ch
 * @returns {{ shape: string, open: number }}
 */
export function charToViseme(ch) {
  const raw = String(ch || " ");
  const c = raw.toLowerCase();
  if (/[\s.,!?;:'"()\-—…]/.test(c)) return normalizeViseme({ shape: "ee", open: 0.08 });
  if (/[aeæəàáâãäå]/.test(c)) return normalizeViseme({ shape: "aa", open: 0.82 });
  if (/[iɪyìíîï]/.test(c)) return normalizeViseme({ shape: "ih", open: 0.58 });
  if (/[oɔòóôõö]/.test(c)) return normalizeViseme({ shape: "oh", open: 0.72 });
  if (/[uʊwùúûü]/.test(c)) return normalizeViseme({ shape: "ou", open: 0.68 });
  if (/[eɛèéêë]/.test(c)) return normalizeViseme({ shape: "ee", open: 0.62 });
  if (/[mbp]/.test(c)) return normalizeViseme({ shape: "ee", open: 0.12 });
  if (/[fv]/.test(c)) return normalizeViseme({ shape: "ih", open: 0.22 });
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(raw)) {
    const mapped = CJK_CHAR_VISEME[raw];
    if (mapped) return normalizeViseme(mapped);
    const code = raw.codePointAt(0) || 0;
    const idx =
      (code % 997) +
      Math.floor(code / 997) +
      (code & 0xf) +
      Math.floor((code >> 4) & 0xf);
    return normalizeViseme(CJK_VOWEL_RING[idx % CJK_VOWEL_RING.length]);
  }
  return normalizeViseme({ shape: "aa", open: 0.45 });
}

/**
 * Match mouth-walk speed to real audio (or CJK vs Latin speech rate).
 * @param {string} text
 * @param {number} [durationMs]
 * @param {number} [speedMultiplier] internal stored speed or legacy ratio (1 = default pace)
 */
export function estimateLipSyncMsPerChar(text, durationMs, speedMultiplier = 1) {
  const clean = String(text || "");
  const len = Math.max(1, clean.length);
  const ms = Number(durationMs);
  const speed = talkSpeedPlaybackRatio(speedMultiplier);
  if (Number.isFinite(ms) && ms > 0) {
    return Math.max(24, Math.min(320, (ms / len) / speed));
  }
  const cjk = (clean.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const base = cjk / len > 0.3 ? 168 : 54;
  return base / speed;
}

/**
 * Spoken duration weight for one character.
 * @param {string} ch
 */
export function lipSyncCharWeight(ch) {
  const c = String(ch || "");
  if (!c || /[\s.,!?;:'"()\-—…，。！？、；：～~]/.test(c)) return 0.22;
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(c)) return 1;
  return 0.48;
}

/**
 * @param {string} text
 * @returns {{ chars: string[], starts: number[], total: number }}
 */
export function buildLipSyncTimeline(text) {
  const chars = Array.from(String(text || ""));
  const weights = chars.map((ch) => lipSyncCharWeight(ch));
  const total = weights.reduce((sum, w) => sum + w, 0) || 1;
  let acc = 0;
  const starts = weights.map((w) => {
    const start = acc / total;
    acc += w;
    return start;
  });
  return { chars, starts, total };
}

/**
 * Cache lip-sync timelines per utterance (rebuilt once per speak() call).
 * @param {string} text
 */
export function buildLipSyncTimelineCached(text) {
  const key = String(text || "");
  if (LIP_SYNC_CACHE.has(key)) return LIP_SYNC_CACHE.get(key);
  const timeline = buildLipSyncTimeline(key);
  if (LIP_SYNC_CACHE.size >= LIP_SYNC_CACHE_MAX) {
    const first = LIP_SYNC_CACHE.keys().next().value;
    LIP_SYNC_CACHE.delete(first);
  }
  LIP_SYNC_CACHE.set(key, timeline);
  return timeline;
}

/**
 * Blend char viseme shape with audio RMS for jaw openness (VTuber-style).
 * @param {{ shape: string, open: number }} viseme
 * @param {number} audioLevel
 */
export function blendVisemeWithAudioLevel(viseme, audioLevel = 0) {
  const level = Math.max(0, Math.min(1, Number(audioLevel) || 0));
  const baseOpen = Math.max(0, Math.min(TALK_MOUTH_OPEN_MAX, Number(viseme.open) || 0));
  if (level < 0.06) {
    return { shape: viseme.shape, open: baseOpen * 0.88 };
  }
  const rmsOpen = level * 0.68;
  const open = Math.min(
    TALK_MOUTH_OPEN_MAX,
    Math.max(baseOpen * 0.42 + rmsOpen * 0.58, baseOpen * 0.48),
  );
  return { shape: viseme.shape, open };
}

/**
 * Map 0..1 playback progress to a viseme using a prebuilt timeline.
 * @param {{ chars: string[], starts: number[] }} timeline
 * @param {number} progress
 * @param {number} [audioLevel]
 */
export function visemeAtTimelineProgress(timeline, progress, audioLevel = 0) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const level = Math.max(0, Math.min(1, Number(audioLevel) || 0));
  const chars = timeline?.chars || [];
  const starts = timeline?.starts || [];
  if (!chars.length || p >= 0.995) {
    return {
      shape: "ee",
      open: Math.min(0.1, level * 0.28),
      index: chars.length,
      char: "",
    };
  }
  let idx = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if (starts[i] <= p) idx = i;
    else break;
  }
  const ch = chars[idx] || " ";
  const viseme = charToViseme(ch);
  const blended = blendVisemeWithAudioLevel(viseme, level);
  return { shape: blended.shape, open: blended.open, index: idx, char: ch };
}

/**
 * Map 0..1 playback progress to a viseme.
 * @param {string} text
 * @param {number} progress
 * @param {number} [audioLevel]
 */
export function visemeAtAudioProgress(text, progress, audioLevel = 0) {
  const timeline = buildLipSyncTimelineCached(text);
  return visemeAtTimelineProgress(timeline, progress, audioLevel);
}
