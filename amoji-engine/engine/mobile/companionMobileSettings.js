/**
 * Settings schema + persistence for mobile app shell.
 */
import { apiFetch, authHeaders, loadAuthSession, saveAuthSession } from "./companionMobileAuth.js";

export const COMPANION_MOBILE_SETTINGS_SCHEMA = "amoji.companionMobileSettings.v1";
export const SETTINGS_STORAGE_KEY = "amoji.mobile.settings.v1";

/**
 * @returns {Record<string, unknown>}
 */
export function defaultMobileSettings() {
  return {
    schema: COMPANION_MOBILE_SETTINGS_SCHEMA,
    lang: "yue",
    voiceEnabled: true,
    notifications: true,
    haptics: true,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    analyticsOptIn: false,
    chaseDifficulty: "normal",
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeMobileSettings(raw) {
  const base = defaultMobileSettings();
  if (!raw || typeof raw !== "object") return base;
  const src = /** @type {Record<string, unknown>} */ (raw);
  return {
    ...base,
    ...src,
    lang: src.lang === "en" ? "en" : "yue",
    chaseDifficulty: ["easy", "normal", "hard"].includes(String(src.chaseDifficulty))
      ? String(src.chaseDifficulty)
      : base.chaseDifficulty,
    musicVolume: clamp01(src.musicVolume, base.musicVolume),
    sfxVolume: clamp01(src.sfxVolume, base.sfxVolume),
  };
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function clamp01(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function loadMobileSettings(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultMobileSettings();
    return normalizeMobileSettings(JSON.parse(raw));
  } catch {
    return defaultMobileSettings();
  }
}

/**
 * @param {Record<string, unknown>} settings
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 */
export function saveMobileSettings(settings, storage = globalThis.localStorage) {
  const next = normalizeMobileSettings(settings);
  try {
    storage?.setItem?.(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/**
 * @param {{ baseUrl?: string, storage?: Storage, token?: string }} [opts]
 */
export async function pullRemoteSettings(opts = {}) {
  const session = loadAuthSession(opts.storage);
  const token = opts.token || session?.token;
  if (!token) return null;
  const data = await apiFetch("/api/user/settings", {
    method: "GET",
    baseUrl: opts.baseUrl,
    headers: authHeaders(token),
  });
  return normalizeMobileSettings(data?.settings);
}

/**
 * @param {Record<string, unknown>} settings
 * @param {{ baseUrl?: string, storage?: Storage, token?: string }} [opts]
 */
export async function pushRemoteSettings(settings, opts = {}) {
  const session = loadAuthSession(opts.storage);
  const token = opts.token || session?.token;
  if (!token) return null;
  const data = await apiFetch("/api/user/settings", {
    method: "POST",
    baseUrl: opts.baseUrl,
    headers: authHeaders(token),
    body: JSON.stringify({ settings: normalizeMobileSettings(settings) }),
  });
  const next = normalizeMobileSettings(data?.settings);
  if (session) {
    saveAuthSession({ ...session, settings: next }, opts.storage);
  }
  return next;
}

/**
 * @param {boolean} isEnglish
 * @param {Record<string, unknown>} settings
 */
export function settingsLabel(isEnglish, settings) {
  const lang = settings?.lang === "en" || isEnglish ? "en" : "yue";
  return lang;
}
