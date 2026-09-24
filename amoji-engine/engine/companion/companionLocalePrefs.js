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

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;

/**
 * TTS locale for a spoken line — use script cues when the LLM language drifts from session UI.
 * @param {string | null | undefined} text
 * @param {"en" | "yue"} sessionLangCode
 * @returns {"en" | "yue"}
 */
export function resolveUtteranceSpeechLang(text, sessionLangCode = "yue") {
  const raw = String(text || "");
  const cjk = (raw.match(CJK_RE) || []).length;
  const latin = (raw.match(/[a-zA-Z]/g) || []).length;
  if (cjk >= 2 && cjk >= latin) return "yue";
  if (latin >= 2 && latin > cjk * 1.5) return "en";
  return sessionLangCode === "en" ? "en" : "yue";
}
