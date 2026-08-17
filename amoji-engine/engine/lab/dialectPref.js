/**
 * Lab dialect preference: auto-detect vs forced yue/en.
 */
export const DIALECT_PREF_STORAGE_KEY = "amoji.dialectPref";
export const DIALECT_PREF_SCHEMA = "amoji.dialectPref.v1";

/** @typedef {'auto' | 'yue' | 'en'} DialectMode */

const MODES = new Set(["auto", "yue", "en"]);

/**
 * @param {string} raw
 * @returns {DialectMode | ''}
 */
export function normalizeDialectMode(raw) {
  const id = String(raw || "")
    .trim()
    .toLowerCase();
  if (id === "zh" || id === "zh-hk" || id === "cantonese" || id === "yue") {
    return "yue";
  }
  if (id === "english" || id === "en-us" || id === "en") return "en";
  if (id === "auto" || id === "detect") return "auto";
  return "";
}

/**
 * Cycle auto → yue → en → auto.
 * @param {DialectMode} mode
 * @returns {DialectMode}
 */
export function nextDialectMode(mode) {
  if (mode === "auto") return "yue";
  if (mode === "yue") return "en";
  return "auto";
}

/**
 * Resolve dialect preference from query, storage, or default.
 * @param {{
 *   search?: string,
 *   storage?: { getItem?: Function, setItem?: Function } | null,
 *   env?: Record<string, string | undefined>,
 *   defaultMode?: DialectMode,
 * }} [opts]
 * @returns {{ mode: DialectMode, forceLanguage: string | null, source: string, schema: string }}
 */
export function resolveDialectPref(opts = {}) {
  const env =
    opts.env ||
    (typeof process !== "undefined" ? process.env : undefined) ||
    {};
  const search =
    opts.search ??
    (typeof globalThis.location !== "undefined"
      ? globalThis.location.search
      : "");
  const storage =
    opts.storage === null
      ? null
      : opts.storage ||
        (typeof globalThis.localStorage !== "undefined"
          ? globalThis.localStorage
          : null);

  let fromQuery = "";
  try {
    const params = new URLSearchParams(search || "");
    fromQuery = String(
      params.get("lang") ||
        params.get("dialect") ||
        params.get("AMOJI_DIALECT") ||
        "",
    ).trim();
  } catch {
    fromQuery = "";
  }

  const fromStorage = String(
    storage?.getItem?.(DIALECT_PREF_STORAGE_KEY) || "",
  ).trim();
  const fromEnv = String(env.AMOJI_DIALECT || "").trim();

  const normalized =
    normalizeDialectMode(fromQuery) ||
    normalizeDialectMode(fromStorage) ||
    normalizeDialectMode(fromEnv) ||
    normalizeDialectMode(opts.defaultMode) ||
    "auto";

  if (fromQuery && storage?.setItem) {
    try {
      storage.setItem(DIALECT_PREF_STORAGE_KEY, normalized);
    } catch {
      /* ignore quota */
    }
  }

  const source = normalizeDialectMode(fromQuery)
    ? "query"
    : normalizeDialectMode(fromStorage)
      ? "storage"
      : normalizeDialectMode(fromEnv)
        ? "env"
        : "default";

  return {
    schema: DIALECT_PREF_SCHEMA,
    mode: normalized,
    forceLanguage: normalized === "auto" ? null : normalized,
    source,
  };
}

/**
 * Persist dialect mode to storage.
 * @param {DialectMode} mode
 * @param {{ storage?: { setItem?: Function } | null }} [opts]
 */
export function persistDialectPref(mode, opts = {}) {
  const normalized = normalizeDialectMode(mode) || "auto";
  const storage =
    opts.storage === null
      ? null
      : opts.storage ||
        (typeof globalThis.localStorage !== "undefined"
          ? globalThis.localStorage
          : null);
  if (storage?.setItem) {
    try {
      storage.setItem(DIALECT_PREF_STORAGE_KEY, normalized);
    } catch {
      /* ignore */
    }
  }
  return {
    schema: DIALECT_PREF_SCHEMA,
    mode: normalized,
    forceLanguage: normalized === "auto" ? null : normalized,
    source: "set",
  };
}
