/**
 * Lab listen / VAD sensitivity preference (quiet room ↔ noisy room).
 */
export const LISTEN_PREF_STORAGE_KEY = "amoji.listenPref";
export const LISTEN_PREF_SCHEMA = "amoji.listenPref.v1";

/** @typedef {'high' | 'normal' | 'low'} ListenSensitivity */

/**
 * Presets: high = more sensitive (picks up quiet speech);
 * low = less sensitive (noisy rooms / less false triggers).
 */
export const LISTEN_SENSITIVITY_PRESETS = Object.freeze({
  high: Object.freeze({
    id: "high",
    label: "High",
    energyThreshold: 0.015,
    bargeEnergyThreshold: 0.025,
    minSpeechMs: 120,
    trailingSilenceMs: 450,
    bargeMinSpeechMs: 80,
  }),
  normal: Object.freeze({
    id: "normal",
    label: "Normal",
    energyThreshold: 0.025,
    bargeEnergyThreshold: 0.04,
    minSpeechMs: 150,
    trailingSilenceMs: 550,
    bargeMinSpeechMs: 100,
  }),
  low: Object.freeze({
    id: "low",
    label: "Low",
    energyThreshold: 0.045,
    bargeEnergyThreshold: 0.07,
    minSpeechMs: 180,
    trailingSilenceMs: 650,
    bargeMinSpeechMs: 140,
  }),
});

const ORDER = /** @type {ListenSensitivity[]} */ (["high", "normal", "low"]);

/**
 * @param {string} raw
 * @returns {ListenSensitivity | ''}
 */
export function normalizeListenSensitivity(raw) {
  const id = String(raw || "")
    .trim()
    .toLowerCase();
  if (id === "high" || id === "sensitive" || id === "quiet") return "high";
  if (id === "normal" || id === "med" || id === "medium" || id === "default") {
    return "normal";
  }
  if (id === "low" || id === "noisy" || id === "loud") return "low";
  return "";
}

/**
 * @param {ListenSensitivity} id
 * @returns {ListenSensitivity}
 */
export function nextListenSensitivity(id) {
  const cur = normalizeListenSensitivity(id) || "normal";
  const idx = ORDER.indexOf(cur);
  return ORDER[(idx + 1) % ORDER.length];
}

/**
 * @param {ListenSensitivity | string} id
 */
export function listenPresetFor(id) {
  const key = normalizeListenSensitivity(id) || "normal";
  return LISTEN_SENSITIVITY_PRESETS[key];
}

/**
 * Resolve listen preference from query, storage, or default.
 * @param {{
 *   search?: string,
 *   storage?: { getItem?: Function, setItem?: Function } | null,
 *   env?: Record<string, string | undefined>,
 *   defaultSensitivity?: ListenSensitivity,
 * }} [opts]
 */
export function resolveListenPref(opts = {}) {
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
      params.get("vad") ||
        params.get("listen") ||
        params.get("AMOJI_VAD") ||
        "",
    ).trim();
  } catch {
    fromQuery = "";
  }

  const fromStorage = String(
    storage?.getItem?.(LISTEN_PREF_STORAGE_KEY) || "",
  ).trim();
  const fromEnv = String(env.AMOJI_VAD || env.AMOJI_LISTEN || "").trim();

  const sensitivity =
    normalizeListenSensitivity(fromQuery) ||
    normalizeListenSensitivity(fromStorage) ||
    normalizeListenSensitivity(fromEnv) ||
    normalizeListenSensitivity(opts.defaultSensitivity) ||
    "normal";

  if (fromQuery && storage?.setItem) {
    try {
      storage.setItem(LISTEN_PREF_STORAGE_KEY, sensitivity);
    } catch {
      /* ignore quota */
    }
  }

  const source = normalizeListenSensitivity(fromQuery)
    ? "query"
    : normalizeListenSensitivity(fromStorage)
      ? "storage"
      : normalizeListenSensitivity(fromEnv)
        ? "env"
        : "default";

  const preset = listenPresetFor(sensitivity);
  return {
    schema: LISTEN_PREF_SCHEMA,
    sensitivity,
    source,
    preset,
    vad: {
      energyThreshold: preset.energyThreshold,
      bargeEnergyThreshold: preset.bargeEnergyThreshold,
      minSpeechMs: preset.minSpeechMs,
      trailingSilenceMs: preset.trailingSilenceMs,
      bargeMinSpeechMs: preset.bargeMinSpeechMs,
    },
  };
}

/**
 * @param {ListenSensitivity | string} sensitivity
 * @param {{ storage?: { setItem?: Function } | null }} [opts]
 */
export function persistListenPref(sensitivity, opts = {}) {
  const id = normalizeListenSensitivity(sensitivity) || "normal";
  const storage =
    opts.storage === null
      ? null
      : opts.storage ||
        (typeof globalThis.localStorage !== "undefined"
          ? globalThis.localStorage
          : null);
  if (storage?.setItem) {
    try {
      storage.setItem(LISTEN_PREF_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return resolveListenPref({
    search: "",
    storage: {
      getItem: () => id,
      setItem: storage?.setItem?.bind(storage),
    },
    env: {},
    defaultSensitivity: id,
  });
}
