/**
 * Persist companion UI language (English / Cantonese) across sessions.
 */
import { companionLangCode } from "./companionVoiceCatalog.js";

export const COMPANION_LOCALE_PREFS_SCHEMA = "amoji.companionLocalePrefs.v1";
export const LANG_STORAGE_KEY = "amoji.companionLang.v1";

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} [storage]
 * @returns {"en" | "yue"}
 */
export function loadCompanionLang(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(LANG_STORAGE_KEY);
    if (!raw) return "yue";
    return companionLangCode(raw) === "en" ? "en" : "yue";
  } catch {
    return "yue";
  }
}

/**
 * @param {string | null | undefined} lang
 * @param {Pick<Storage, "setItem"> | null | undefined} [storage]
 */
export function saveCompanionLang(lang, storage = globalThis.localStorage) {
  const code = companionLangCode(lang) === "en" ? "en" : "yue";
  try {
    storage?.setItem?.(LANG_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
  return code;
}

/**
 * URL lang param wins when present; otherwise stored preference.
 * @param {URLSearchParams | null | undefined} params
 * @param {Pick<Storage, "getItem"> | null | undefined} [storage]
 */
export function resolveCompanionLang(params, storage = globalThis.localStorage) {
  const fromUrl = params?.get?.("lang");
  if (fromUrl) {
    const code = companionLangCode(fromUrl) === "en" ? "en" : "yue";
    saveCompanionLang(code, storage);
    return code;
  }
  return loadCompanionLang(storage);
}
