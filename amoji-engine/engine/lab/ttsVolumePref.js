/**
 * Lab TTS playback volume preference (soft / normal / loud).
 */
export const TTS_VOLUME_STORAGE_KEY = "amoji.ttsVolume";
export const TTS_VOLUME_SCHEMA = "amoji.ttsVolume.v1";

/** @typedef {'soft' | 'normal' | 'loud'} TtsVolumeLevel */

/**
 * Gain presets (linear). Soft ≈ -6dB-ish, loud ≈ +3dB capped.
 */
export const TTS_VOLUME_PRESETS = Object.freeze({
  soft: Object.freeze({ id: "soft", label: "Soft", gain: 0.45 }),
  normal: Object.freeze({ id: "normal", label: "Normal", gain: 1 }),
  loud: Object.freeze({ id: "loud", label: "Loud", gain: 1.35 }),
});

const ORDER = /** @type {TtsVolumeLevel[]} */ (["soft", "normal", "loud"]);

/**
 * @param {string} raw
 * @returns {TtsVolumeLevel | ''}
 */
export function normalizeTtsVolume(raw) {
  const id = String(raw || "")
    .trim()
    .toLowerCase();
  if (id === "soft" || id === "quiet" || id === "low") return "soft";
  if (id === "normal" || id === "med" || id === "medium" || id === "default") {
    return "normal";
  }
  if (id === "loud" || id === "high" || id === "max") return "loud";
  return "";
}

/**
 * @param {TtsVolumeLevel} id
 * @returns {TtsVolumeLevel}
 */
export function nextTtsVolume(id) {
  const cur = normalizeTtsVolume(id) || "normal";
  const idx = ORDER.indexOf(cur);
  return ORDER[(idx + 1) % ORDER.length];
}

/**
 * @param {TtsVolumeLevel} id
 * @returns {TtsVolumeLevel}
 */
export function prevTtsVolume(id) {
  const cur = normalizeTtsVolume(id) || "normal";
  const idx = ORDER.indexOf(cur);
  return ORDER[(idx - 1 + ORDER.length) % ORDER.length];
}

/**
 * @param {TtsVolumeLevel | string} id
 */
export function ttsVolumePresetFor(id) {
  const key = normalizeTtsVolume(id) || "normal";
  return TTS_VOLUME_PRESETS[key];
}

/**
 * @param {{
 *   search?: string,
 *   storage?: { getItem?: Function, setItem?: Function } | null,
 *   env?: Record<string, string | undefined>,
 *   defaultLevel?: TtsVolumeLevel,
 * }} [opts]
 */
export function resolveTtsVolumePref(opts = {}) {
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
      params.get("vol") ||
        params.get("volume") ||
        params.get("AMOJI_TTS_VOLUME") ||
        "",
    ).trim();
  } catch {
    fromQuery = "";
  }

  const fromStorage = String(
    storage?.getItem?.(TTS_VOLUME_STORAGE_KEY) || "",
  ).trim();
  const fromEnv = String(env.AMOJI_TTS_VOLUME || "").trim();

  const level =
    normalizeTtsVolume(fromQuery) ||
    normalizeTtsVolume(fromStorage) ||
    normalizeTtsVolume(fromEnv) ||
    normalizeTtsVolume(opts.defaultLevel) ||
    "normal";

  if (fromQuery && storage?.setItem) {
    try {
      storage.setItem(TTS_VOLUME_STORAGE_KEY, level);
    } catch {
      /* ignore */
    }
  }

  const source = normalizeTtsVolume(fromQuery)
    ? "query"
    : normalizeTtsVolume(fromStorage)
      ? "storage"
      : normalizeTtsVolume(fromEnv)
        ? "env"
        : "default";

  const preset = ttsVolumePresetFor(level);
  return {
    schema: TTS_VOLUME_SCHEMA,
    level,
    source,
    preset,
    gain: preset.gain,
  };
}

/**
 * @param {TtsVolumeLevel | string} level
 * @param {{ storage?: { setItem?: Function } | null }} [opts]
 */
export function persistTtsVolumePref(level, opts = {}) {
  const id = normalizeTtsVolume(level) || "normal";
  const storage =
    opts.storage === null
      ? null
      : opts.storage ||
        (typeof globalThis.localStorage !== "undefined"
          ? globalThis.localStorage
          : null);
  if (storage?.setItem) {
    try {
      storage.setItem(TTS_VOLUME_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return resolveTtsVolumePref({
    search: "",
    storage: {
      getItem: () => id,
      setItem: storage?.setItem?.bind(storage),
    },
    env: {},
    defaultLevel: id,
  });
}
