/**
 * Web companion UI settings — SFX volume, haptics, reduced motion.
 */
export const COMPANION_UI_SETTINGS_SCHEMA = "amoji.companionUiSettings.v1";
export const UI_SETTINGS_STORAGE_KEY = "amoji.companion.uiSettings.v1";

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function clamp01(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, 0, 1);
}

/**
 * @returns {{
 *   schema: string,
 *   sfxVolume: number,
 *   haptics: boolean,
 *   reducedMotion: boolean,
 * }}
 */
export function defaultUiSettings() {
  return {
    schema: COMPANION_UI_SETTINGS_SCHEMA,
    sfxVolume: 0.42,
    haptics: true,
    reducedMotion: false,
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeUiSettings(raw) {
  const base = defaultUiSettings();
  if (!raw || typeof raw !== "object") return base;
  const src = /** @type {Record<string, unknown>} */ (raw);
  return {
    ...base,
    ...src,
    sfxVolume: clamp01(src.sfxVolume, base.sfxVolume),
    haptics: src.haptics !== false,
    reducedMotion: Boolean(src.reducedMotion),
  };
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function loadUiSettings(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(UI_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultUiSettings();
    return normalizeUiSettings(JSON.parse(raw));
  } catch {
    return defaultUiSettings();
  }
}

/**
 * @param {Record<string, unknown>} settings
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 */
export function saveUiSettings(settings, storage = globalThis.localStorage) {
  const next = normalizeUiSettings(settings);
  try {
    storage?.setItem?.(UI_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

/**
 * @param {{
 *   setVolume?: (v: number) => number,
 *   setHaptics?: (on: boolean) => boolean,
 *   setReducedMotion?: (on: boolean) => void,
 * } | null | undefined} audio
 * @param {ReturnType<typeof defaultUiSettings>} settings
 */
export function applyUiSettingsToAudio(audio, settings) {
  if (!audio || !settings) return settings;
  audio.setVolume?.(settings.sfxVolume);
  audio.setHaptics?.(settings.haptics);
  audio.setReducedMotion?.(settings.reducedMotion);
  return settings;
}

/**
 * @param {number} pct
 * @param {boolean} isEnglish
 */
export function formatSfxVolumeLabel(pct, isEnglish = true) {
  const clamped = Math.round(clamp(Number(pct) || 0, 0, 100));
  return isEnglish ? `UI sounds: ${clamped}%` : `介面音效：${clamped}%`;
}
