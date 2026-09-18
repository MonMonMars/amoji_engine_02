/**
 * User-adjustable companion talking speed — applies to cloud + browser TTS.
 */
export const COMPANION_TALK_SPEED_SCHEMA = "amoji.companionTalkSpeed.v1";
export const TALK_SPEED_STORAGE_KEY = "amoji.companionTalkSpeed.v2";
const LEGACY_TALK_SPEED_KEY = "amoji.companionTalkSpeed.v1";

/** Default: very slow pace so expression + lip sync can load per word (VN / gacha style). */
export const DEFAULT_TALK_SPEED = 0.38;

/** Cycle order for the topbar speed button. */
export const TALK_SPEED_PRESETS = Object.freeze([0.38, 0.48, 0.6, 0.75, 0.9]);

const MIN_TALK_SPEED = 0.32;
const MAX_TALK_SPEED = 1.05;

/**
 * @param {unknown} value
 * @param {number} [fallback]
 */
export function normalizeTalkSpeed(value, fallback = DEFAULT_TALK_SPEED) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Number(Math.max(MIN_TALK_SPEED, Math.min(MAX_TALK_SPEED, n)).toFixed(2));
}

/**
 * @param {number} current
 */
export function cycleTalkSpeed(current = DEFAULT_TALK_SPEED) {
  const speed = normalizeTalkSpeed(current);
  const idx = TALK_SPEED_PRESETS.indexOf(speed);
  const nextIdx = idx >= 0 ? (idx + 1) % TALK_SPEED_PRESETS.length : 0;
  return TALK_SPEED_PRESETS[nextIdx];
}

/**
 * @param {number} baseSpeed
 * @param {number} [multiplier]
 */
export function applyTalkSpeedMultiplier(baseSpeed, multiplier = DEFAULT_TALK_SPEED) {
  const mult = normalizeTalkSpeed(multiplier);
  const base = Number.isFinite(baseSpeed) ? baseSpeed : 1;
  return Number(Math.max(MIN_TALK_SPEED, Math.min(MAX_TALK_SPEED, base * mult)).toFixed(2));
}

/**
 * @param {number} edgeRatePercent
 * @param {number} [multiplier]
 */
export function slowEdgeRatePercent(edgeRatePercent, multiplier = DEFAULT_TALK_SPEED) {
  const mult = normalizeTalkSpeed(multiplier);
  const shift = (1 - mult) * 52;
  return edgeRatePercent - shift;
}

/**
 * @param {number} browserRate
 * @param {number} [multiplier]
 */
export function slowBrowserRate(browserRate, multiplier = DEFAULT_TALK_SPEED) {
  const mult = normalizeTalkSpeed(multiplier);
  const base = Number.isFinite(browserRate) ? browserRate : 1;
  return Number(Math.max(0.42, Math.min(1.08, base * mult)).toFixed(3));
}

/**
 * @param {number} speed
 * @param {boolean} [isEnglish]
 */
export function formatTalkSpeedLabel(speed, isEnglish = false) {
  const s = normalizeTalkSpeed(speed);
  if (s <= 0.4) return isEnglish ? "0.38× Slow" : "0.38× 慢";
  if (s === 0.48) return isEnglish ? "0.48×" : "0.48×";
  if (s === 0.6) return isEnglish ? "0.6×" : "0.6×";
  if (s === 0.75) return isEnglish ? "0.75×" : "0.75×";
  if (s >= 0.9) return isEnglish ? "0.9× Normal" : "0.9× 正常";
  return `${s}×`;
}

/**
 * @param {number} speed
 */
export function talkSpeedButtonTitle(speed, isEnglish = false) {
  const label = formatTalkSpeedLabel(speed, isEnglish);
  return isEnglish
    ? `Talking speed: ${label} — tap to change`
    : `講嘢速度：${label} — 按一下切換`;
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} [storage]
 */
export function loadTalkSpeed(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(TALK_SPEED_STORAGE_KEY);
    if (raw != null && raw !== "") {
      return normalizeTalkSpeed(JSON.parse(raw));
    }
  } catch {
    /* fall through to legacy */
  }
  try {
    const legacy = storage?.getItem?.(LEGACY_TALK_SPEED_KEY);
    if (legacy != null && legacy !== "") {
      const parsed = JSON.parse(legacy);
      const scaled = normalizeTalkSpeed(Number(parsed) * 0.84);
      saveTalkSpeed(scaled, storage);
      return scaled;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_TALK_SPEED;
}

/**
 * @param {number} speed
 * @param {Pick<Storage, "setItem"> | null | undefined} [storage]
 */
export function saveTalkSpeed(speed, storage = globalThis.localStorage) {
  const next = normalizeTalkSpeed(speed);
  try {
    storage?.setItem?.(TALK_SPEED_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
