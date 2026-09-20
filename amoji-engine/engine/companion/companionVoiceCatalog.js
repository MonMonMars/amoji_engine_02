/**
 * Edge TTS voice catalog + URL/localStorage helpers for companion UIs.
 */
import {
  characterGender,
  defaultVoiceForCharacter,
} from "./companionCharacterCatalog.js";
import {
  EN_VOICE_PROFILES,
  findVoiceProfile,
  resolveEdgeVoiceId,
  voiceProfilesForLang,
  YUE_VOICE_PROFILES,
} from "./companionVoiceProfiles.js";

export const VOICE_STORAGE_KEY = "amoji.companion.voiceId";

/** @type {Readonly<Record<string, ReadonlyArray<import("./companionVoiceProfiles.js").VoiceProfile>>>} */
export const COMPANION_VOICES = Object.freeze({
  yue: YUE_VOICE_PROFILES,
  en: EN_VOICE_PROFILES,
});

/**
 * @param {string | null | undefined} raw
 * @returns {"yue" | "en"}
 */
export function companionLangCode(raw) {
  const lang = String(raw || "yue").toLowerCase();
  return lang === "en" || lang === "en-us" ? "en" : "yue";
}

/**
 * @param {"yue" | "en"} langCode
 */
export function voicesForLang(langCode) {
  return voiceProfilesForLang(langCode);
}

/**
 * @param {string} voiceId
 */
export function findVoiceEntry(voiceId) {
  return findVoiceProfile(voiceId);
}

/** @param {string | null | undefined} voiceParam */
export function isVoiceOutputDisabled(voiceParam) {
  const v = String(voiceParam || "")
    .trim()
    .toLowerCase();
  return v === "off" || v === "0" || v === "none" || v === "mute";
}

/**
 * @param {{
 *   lang?: string | null,
 *   voiceParam?: string | null,
 *   storage?: Storage | null,
 * }} opts
 */
export function resolveVoiceId(opts = {}) {
  const langCode = companionLangCode(opts.lang);
  const list = voicesForLang(langCode);
  const fromUrl = String(opts.voiceParam || "").trim();
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const fromStorage = storage?.getItem(VOICE_STORAGE_KEY) || "";
  const candidate = fromUrl || fromStorage;
  const found = list.find((v) => v.id === candidate);
  return (found || list[0]).id;
}

/**
 * Voice is fixed per character — ignores URL/localStorage overrides.
 * @param {string} characterId
 * @param {"yue" | "en" | string | null | undefined} lang
 */
export function resolveVoiceForCharacter(characterId, lang) {
  const langCode = companionLangCode(lang);
  const gender = characterGender(characterId, langCode);
  const rosterVoiceId = defaultVoiceForCharacter(characterId, langCode);
  const rosterProfile = findVoiceProfile(rosterVoiceId);
  if (rosterProfile?.gender === gender) return rosterVoiceId;
  const list = voicesForLang(langCode);
  const matched = list.find((v) => v.gender === gender);
  return matched?.id || rosterVoiceId;
}

/**
 * @param {string} voiceId
 */
export function voicePresetById(voiceId) {
  const entry = findVoiceEntry(voiceId);
  if (!entry) {
    return { name: "zh-HK-HiuMaanNeural", lang: "zh-HK", cloud: true };
  }
  return { name: entry.id, lang: entry.lang, cloud: true };
}

/**
 * @param {string} voiceId
 * @param {"yue" | "en"} langCode
 * @param {boolean} [englishUi]
 */
export function voiceShortLabel(voiceId, langCode, englishUi = false) {
  const list = voicesForLang(langCode);
  const entry = list.find((v) => v.id === voiceId) || list[0];
  return englishUi ? entry.shortLabelEn : entry.shortLabel;
}

/**
 * User-facing voice toggle label — gender only (avoids confusing neural names).
 * @param {string} voiceId
 * @param {"yue" | "en"} langCode
 * @param {boolean} [englishUi]
 */
export function voiceGenderLabel(voiceId, langCode, englishUi = false) {
  const list = voicesForLang(langCode);
  const entry = list.find((v) => v.id === voiceId) || list[0];
  if (englishUi) {
    return entry.gender === "male" ? "Male" : "Female";
  }
  return entry.gender === "male" ? "男聲" : "女聲";
}

/**
 * Full voice name for picker buttons (not gender-only).
 * @param {string} voiceId
 * @param {"yue" | "en"} langCode
 * @param {boolean} [englishUi]
 */
export function voicePickerButtonLabel(voiceId, langCode, englishUi = false) {
  const label = voiceShortLabel(voiceId, langCode, englishUi);
  const gender = voiceGenderLabel(voiceId, langCode, englishUi);
  return englishUi ? `${label} (${gender})` : `${label}·${gender}`;
}

/**
 * @param {string} voiceId
 */
export function cloudVoiceLabel(voiceId) {
  const entry = findVoiceEntry(voiceId);
  if (!entry) return "女聲·粵";
  const gender =
    entry.gender === "male"
      ? entry.lang.startsWith("en")
        ? "Male·EN"
        : "男聲·粵"
      : entry.lang.startsWith("en")
        ? "Female·EN"
        : "女聲·粵";
  const name = entry.lang.startsWith("en") ? entry.shortLabelEn : entry.shortLabel;
  return `${gender}·${name}`;
}

/**
 * @param {string} currentId
 * @param {"yue" | "en"} langCode
 */
export function nextVoiceId(currentId, langCode) {
  const list = voicesForLang(langCode);
  const idx = Math.max(0, list.findIndex((v) => v.id === currentId));
  return list[(idx + 1) % list.length].id;
}

/**
 * Pick a voice when switching language — keep current if valid, else default.
 * @param {"yue" | "en"} langCode
 * @param {string} [currentVoiceId]
 */
export function defaultVoiceForLang(langCode, currentVoiceId) {
  const list = voicesForLang(langCode);
  if (currentVoiceId && list.some((v) => v.id === currentVoiceId)) {
    return currentVoiceId;
  }
  return list[0].id;
}

/**
 * @param {{
 *   lang?: string | null,
 *   voiceId?: string | null,
 *   basePath?: string,
 *   extra?: Record<string, string>,
 * }} opts
 */
/**
 * Keep deploy cache-bust params when syncing session query (picker /play → /n/…).
 * @param {URLSearchParams} q
 * @param {string | URLSearchParams | null | undefined} [search]
 */
export function preserveFreshBootQueryParams(q, search) {
  const cur = new URLSearchParams(
    typeof search === "string"
      ? search.replace(/^\?/, "")
      : search?.toString?.() ||
          String(globalThis.location?.search || "").replace(/^\?/, ""),
  );
  for (const key of ["build", "_cb"]) {
    const value = cur.get(key);
    if (value) q.set(key, value);
  }
}

export function buildCompanionHref(opts = {}) {
  const q = new URLSearchParams();
  const langCode = companionLangCode(opts.lang);
  q.set("lang", langCode === "en" ? "en" : "yue");
  if (opts.voiceId) q.set("voice", opts.voiceId);
  preserveFreshBootQueryParams(q, opts.search ?? globalThis.location?.search);
  if (opts.extra) {
    for (const [key, value] of Object.entries(opts.extra)) {
      if (value) q.set(key, value);
    }
  }
  const base = opts.basePath || "/play";
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Play URL with language + character; role is omitted unless passed in extra (legacy links).
 * @param {{
 *   basePath?: string,
 *   lang?: string | null,
 *   character?: string | null,
 *   extra?: Record<string, string>,
 * }} [opts]
 */
export function buildSessionHref(opts = {}) {
  const extra = { pick: "1", automic: "0", ...(opts.extra || {}) };
  if (opts.character) {
    extra.character = String(opts.character).toLowerCase();
  }
  return buildCompanionHref({
    basePath: opts.basePath || "/play",
    lang: opts.lang,
    extra,
  });
}

/**
 * @param {string} voiceId
 * @param {Storage | null | undefined} [storage]
 */
export function persistVoiceId(voiceId, storage = globalThis.localStorage) {
  try {
    storage?.setItem(VOICE_STORAGE_KEY, voiceId);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {string | URLSearchParams} search
 */
export function syncVoiceToUrl(voiceId, search = globalThis.location?.search) {
  if (!globalThis.history?.replaceState || !globalThis.location) return;
  const params = new URLSearchParams(
    typeof search === "string" ? search : search.toString(),
  );
  params.set("voice", voiceId);
  const qs = params.toString();
  const next = `${globalThis.location.pathname}${qs ? `?${qs}` : ""}`;
  globalThis.history.replaceState(null, "", next);
}
