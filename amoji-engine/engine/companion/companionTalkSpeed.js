/**
 * User-adjustable companion talking speed — applies to cloud + browser TTS.
 *
 * Internal stored values are unchanged from the established companion pace
 * (default 0.42). User-facing 1× Normal is that same default — not the older
 * slower 0.28 internal curve.
 */
export const COMPANION_TALK_SPEED_SCHEMA = "amoji.companionTalkSpeed.v4-default-1x";
export const TALK_SPEED_STORAGE_KEY = "amoji.companionTalkSpeed.v7";
const LEGACY_TALK_SPEED_KEY_V6 = "amoji.companionTalkSpeed.v6";
const LEGACY_TALK_SPEED_KEY = "amoji.companionTalkSpeed.v2";
const LEGACY_TALK_SPEED_KEY_V1 = "amoji.companionTalkSpeed.v1";

/** Internal stored speed = display ratio × {@link NORMAL_TALK_SPEED_ONE_X}. */
const MIN_TALK_SPEED = 0.21;
const MAX_TALK_SPEED = 0.84;

/** Internal value that maps to user-facing 1× Normal (today's default pace). */
export const NORMAL_TALK_SPEED_ONE_X = 0.42;

/** User-facing default talking speed. */
export const DEFAULT_TALK_SPEED_DISPLAY = 1;

/** Default internal speed — same absolute pace as before recalibration. */
export const DEFAULT_TALK_SPEED = Number(
  Math.max(
    MIN_TALK_SPEED,
    Math.min(MAX_TALK_SPEED, DEFAULT_TALK_SPEED_DISPLAY * NORMAL_TALK_SPEED_ONE_X),
  ).toFixed(2),
);

/** User-facing speed steps relative to today's default 1× pace. */
export const TALK_SPEED_DISPLAY_PRESETS = Object.freeze([0.5, 0.75, 1, 1.5, 2]);

/** Internal cycle order for the settings speed button. */
export const TALK_SPEED_PRESETS = Object.freeze(
  TALK_SPEED_DISPLAY_PRESETS.map((display) =>
    Number(
      Math.max(
        MIN_TALK_SPEED,
        Math.min(MAX_TALK_SPEED, display * NORMAL_TALK_SPEED_ONE_X),
      ).toFixed(2),
    ),
  ),
);

/** Scale stored v2 speeds down to the slower v3 default curve. */
const LEGACY_V2_TO_V3_SCALE = 0.737;

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
 * Convert stored internal speed to user-facing multiplier (1× = normal).
 * @param {number} internalSpeed
 */
export function talkSpeedToDisplay(internalSpeed) {
  const internal = normalizeTalkSpeed(internalSpeed);
  return Number((internal / NORMAL_TALK_SPEED_ONE_X).toFixed(2));
}

/**
 * Convert user-facing multiplier to stored internal speed.
 * @param {number} displayMultiplier
 */
export function talkSpeedFromDisplay(displayMultiplier) {
  const display = Number(displayMultiplier);
  if (!Number.isFinite(display) || display <= 0) return DEFAULT_TALK_SPEED;
  return normalizeTalkSpeed(display * NORMAL_TALK_SPEED_ONE_X);
}

/**
 * @param {number} displayMultiplier
 * @param {boolean} [isEnglish]
 */
export function formatTalkSpeedDisplayLabel(displayMultiplier, isEnglish = false) {
  const display = Number(displayMultiplier);
  if (!Number.isFinite(display)) {
    return isEnglish ? "1× Normal" : "1× 正常";
  }
  const rounded = Math.round(display * 100) / 100;
  const num =
    Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
  if (rounded >= 0.98 && rounded <= 1.02) {
    return isEnglish ? "1× Normal" : "1× 正常";
  }
  return `${num}×`;
}

/**
 * @param {number} current
 */
export function cycleTalkSpeed(current = DEFAULT_TALK_SPEED) {
  const speed = normalizeTalkSpeed(current);
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < TALK_SPEED_PRESETS.length; i += 1) {
    const dist = Math.abs(TALK_SPEED_PRESETS[i] - speed);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  const nextIdx = (bestIdx + 1) % TALK_SPEED_PRESETS.length;
  return TALK_SPEED_PRESETS[nextIdx];
}

/**
 * @param {number} baseSpeed
 * @param {number} [multiplier]
 */
export function applyTalkSpeedMultiplier(baseSpeed, multiplier = DEFAULT_TALK_SPEED) {
  const internal = normalizeTalkSpeed(multiplier);
  const display = internal / NORMAL_TALK_SPEED_ONE_X;
  const base = Number.isFinite(baseSpeed) ? baseSpeed : 1;
  const atOneX = base * NORMAL_TALK_SPEED_ONE_X;
  return Number(Math.max(0.1, Math.min(1.64, atOneX * display)).toFixed(2));
}

/**
 * Playback ratio for lip sync / duration (1 = current default talk pace).
 * @param {number} [internalOrRatio]
 */
export function talkSpeedPlaybackRatio(internalOrRatio = DEFAULT_TALK_SPEED) {
  const n = Number(internalOrRatio);
  if (!Number.isFinite(n)) return 1;
  if (n >= MIN_TALK_SPEED - 0.001 && n <= MAX_TALK_SPEED + 0.001) {
    return talkSpeedToDisplay(normalizeTalkSpeed(n));
  }
  return Math.max(0.25, Math.min(2.5, n));
}

/**
 * @param {number} edgeRatePercent
 * @param {number} [multiplier]
 */
export function slowEdgeRatePercent(edgeRatePercent, multiplier = DEFAULT_TALK_SPEED) {
  const internal = normalizeTalkSpeed(multiplier);
  const display = Math.max(0.25, internal / NORMAL_TALK_SPEED_ONE_X);
  const shiftAtOneX = (1 - NORMAL_TALK_SPEED_ONE_X) * 72;
  return edgeRatePercent - shiftAtOneX / display;
}

/**
 * @param {number} browserRate
 * @param {number} [multiplier]
 */
export function slowBrowserRate(browserRate, multiplier = DEFAULT_TALK_SPEED) {
  const internal = normalizeTalkSpeed(multiplier);
  const display = internal / NORMAL_TALK_SPEED_ONE_X;
  const base = Number.isFinite(browserRate) ? browserRate : 1;
  const atOneX = Number(
    Math.max(0.28, Math.min(0.92, base * NORMAL_TALK_SPEED_ONE_X)).toFixed(3),
  );
  return Number(Math.max(0.14, Math.min(0.92, atOneX * display)).toFixed(3));
}

/**
 * @param {number} speed Internal stored speed (0.28 = 1× Normal).
 * @param {boolean} [isEnglish]
 */
export function formatTalkSpeedLabel(speed, isEnglish = false) {
  return formatTalkSpeedDisplayLabel(talkSpeedToDisplay(speed), isEnglish);
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
/**
 * Older builds stored display "1×" as internal `1.0` (shows ~2×) or default pace as `0.84`.
 * @param {number} internal
 */
function migrateMisstoredTalkSpeed(internal) {
  const n = Number(internal);
  if (!Number.isFinite(n)) return DEFAULT_TALK_SPEED;
  if (n >= 0.98 && n <= 1.02) return DEFAULT_TALK_SPEED;
  if (n >= 0.83 && n <= 0.85) return DEFAULT_TALK_SPEED;
  return normalizeTalkSpeed(n);
}

export function loadTalkSpeed(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(TALK_SPEED_STORAGE_KEY);
    if (raw != null && raw !== "") {
      return migrateMisstoredTalkSpeed(JSON.parse(raw));
    }
  } catch {
    /* fall through to legacy */
  }
  try {
    const legacyV6 = storage?.getItem?.(LEGACY_TALK_SPEED_KEY_V6);
    if (legacyV6 != null && legacyV6 !== "") {
      const parsed = migrateMisstoredTalkSpeed(JSON.parse(legacyV6));
      saveTalkSpeed(parsed, storage);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const legacyV5 = storage?.getItem?.("amoji.companionTalkSpeed.v5");
    if (legacyV5 != null && legacyV5 !== "") {
      const parsed = normalizeTalkSpeed(JSON.parse(legacyV5));
      saveTalkSpeed(parsed, storage);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const legacyV4 = storage?.getItem?.("amoji.companionTalkSpeed.v4");
    if (legacyV4 != null && legacyV4 !== "") {
      const parsed = normalizeTalkSpeed(JSON.parse(legacyV4));
      saveTalkSpeed(parsed, storage);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const legacyV3 = storage?.getItem?.("amoji.companionTalkSpeed.v3");
    if (legacyV3 != null && legacyV3 !== "") {
      const parsed = normalizeTalkSpeed(JSON.parse(legacyV3));
      saveTalkSpeed(parsed, storage);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const legacy = storage?.getItem?.(LEGACY_TALK_SPEED_KEY);
    if (legacy != null && legacy !== "") {
      const parsed = JSON.parse(legacy);
      const scaled = normalizeTalkSpeed(Number(parsed) * LEGACY_V2_TO_V3_SCALE);
      saveTalkSpeed(scaled, storage);
      return scaled;
    }
  } catch {
    /* ignore */
  }
  try {
    const legacyV1 = storage?.getItem?.(LEGACY_TALK_SPEED_KEY_V1);
    if (legacyV1 != null && legacyV1 !== "") {
      const parsed = JSON.parse(legacyV1);
      const scaled = normalizeTalkSpeed(Number(parsed) * 0.62);
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
