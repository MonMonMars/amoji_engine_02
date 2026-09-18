/**
 * Start-picker roster + selected companion model preload with live progress.
 */
import { characterAvatarConfig } from "./companionCharacterCatalog.js";
import { characterModelFetchUrl } from "./companionModelAssets.mjs";
import { startCharacterPreviewPreload } from "./companionCharacterPreload.js";
import {
  getPreloadedVrmPromise,
  preloadVrmBuffer,
  releaseVrmPreloadExcept,
} from "./companionPreload.js";

export const COMPANION_START_PICKER_PRELOAD_SCHEMA =
  "amoji.companionStartPickerPreload.v1";

/** @type {WeakMap<object, { refreshSelectedModel: () => Promise<void> }>} */
const activeByPicker = new WeakMap();

/** Preview warm-up maps to 0–35% of the picker bar. */
export const PICKER_PREVIEW_PROGRESS_MAX = 35;

/**
 * @param {number} value 0..1 ratio or 0..100 percent
 * @returns {number} 0..100
 */
export function normalizePickerProgressPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n <= 1) return Math.round(n * 100);
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * @param {{
 *   setPreloadProgress?: (pct: number, label?: string) => void,
 *   element?: HTMLElement | null,
 *   getSelectedId?: () => string,
 *   isEnglish?: boolean,
 *   langCode?: "yue" | "en",
 * }} picker
 * @param {{ isEnglish?: boolean, langCode?: "yue" | "en", getSelectedId?: () => string }} [opts]
 */
export function attachStartPickerModelPreload(picker, opts = {}) {
  const existing = activeByPicker.get(picker);
  if (existing) return existing;

  const isEnglish = Boolean(opts.isEnglish ?? picker.isEnglish);
  const langCode = opts.langCode === "en" ? "en" : "yue";
  const getSelectedId =
    opts.getSelectedId || picker.getSelectedId || (() => "nova");
  const fetchImpl = opts.fetchImpl;

  let modelJob = 0;

  const previewLabel = (pct) =>
    isEnglish ? `Loading roster… ${pct}%` : `載入名單… ${pct}%`;
  const modelLabel = (pct) =>
    isEnglish ? `Downloading model… ${pct}%` : `下載模型… ${pct}%`;
  const readyLabel = isEnglish ? "Model ready" : "模型就緒";
  const fallbackReady = isEnglish
    ? "Ready — model loads when you begin"
    : "就緒 — 開始後載入模型";

  const apply = (pct, label) => {
    picker.setPreloadProgress?.(normalizePickerProgressPct(pct), label);
  };

  const setPreloading = (on) => {
    picker.element?.classList.toggle("is-preloading", Boolean(on));
  };

  const loadSelectedModel = async (characterId) => {
    const job = ++modelJob;
    const id = String(characterId || "nova").toLowerCase();
    const config = characterAvatarConfig(id, langCode);
    const url = String(config.modelUrl || "").trim();
    const fetchUrl = characterModelFetchUrl(id, langCode);
    if (!url || !/\.(vrm|glb)($|\?)/i.test(url)) {
      if (job !== modelJob) return;
      apply(100, readyLabel);
      setPreloading(false);
      return;
    }

    releaseVrmPreloadExcept(url);

    const cached = getPreloadedVrmPromise(fetchUrl);
    if (cached) {
      try {
        await cached;
        if (job !== modelJob) return;
        apply(100, readyLabel);
        setPreloading(false);
        return;
      } catch {
        releaseVrmPreload(url);
      }
    }

    apply(PICKER_PREVIEW_PROGRESS_MAX, modelLabel(PICKER_PREVIEW_PROGRESS_MAX));
    try {
      await preloadVrmBuffer(fetchUrl, fetchImpl);
      if (job !== modelJob) return;
      apply(100, readyLabel);
    } catch {
      if (job !== modelJob) return;
      apply(100, fallbackReady);
    }
    setPreloading(false);
  };

  const refreshSelectedModel = () => loadSelectedModel(getSelectedId());

  setPreloading(true);
  apply(0, previewLabel(0));

  const previewPromise = startCharacterPreviewPreload({
    langCode,
    onProgress: (ratio) => {
      const pct = Math.round(ratio * PICKER_PREVIEW_PROGRESS_MAX);
      apply(pct, previewLabel(pct));
    },
  }).then(async (result) => {
    await result?.modelsLoading;
    await refreshSelectedModel();
    return result;
  });

  const handle = {
    schema: COMPANION_START_PICKER_PRELOAD_SCHEMA,
    previewPromise,
    refreshSelectedModel,
  };
  activeByPicker.set(picker, handle);
  return handle;
}
