/**
 * Start-picker roster preload — chat-first: preview PNGs block the bar,
 * selected VRM loads in the background after "Ready to chat".
 */
import {
  characterAvatarConfig,
  HIGH_POLY_FACE_CHARACTER_IDS,
} from "./companionCharacterCatalog.js";
import { characterModelFetchUrl } from "./companionModelAssets.mjs";
import { startCharacterPreviewPreload } from "./companionCharacterPreload.js";
import {
  getPreloadedVrmPromise,
  preloadVrmBuffer,
  releaseVrmPreload,
  releaseVrmPreloadExcept,
  scheduleCompanionBackgroundWork,
} from "./companionPreload.js";

export const COMPANION_START_PICKER_PRELOAD_SCHEMA =
  "amoji.companionStartPickerPreload.v2";

/** Picker progress bar reaches 100% when priority preview PNGs are warm. */
export const PICKER_PREVIEW_PROGRESS_MAX = 100;

const SELECTION_MODEL_DEBOUNCE_MS = 450;
/** Never block the picker on slow CDN preview PNGs. */
const PICKER_PREVIEW_TIMEOUT_MS = 14_000;

/** Cap how long Begin chat waits on VRM prefetch (Kizuna ~19MB on mobile). */
export const MODEL_ENSURE_READY_CAP_MS = 10_000;
export const MODEL_ENSURE_READY_CAP_HIGH_POLY_MS = 22_000;

/**
 * @param {string | null | undefined} characterId
 * @returns {number}
 */
export function resolveModelEnsureReadyCapMs(characterId) {
  const id = String(characterId || "").trim().toLowerCase();
  if (HIGH_POLY_FACE_CHARACTER_IDS.has(id)) {
    return MODEL_ENSURE_READY_CAP_HIGH_POLY_MS;
  }
  return MODEL_ENSURE_READY_CAP_MS;
}

/** @type {WeakMap<object, { refreshSelectedModel: () => void, previewPromise: Promise<unknown> }>} */
const activeByPicker = new WeakMap();

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
 *   chatFirst?: boolean,
 * }} picker
 * @param {{
 *   isEnglish?: boolean,
 *   langCode?: "yue" | "en",
 *   getSelectedId?: () => string,
 *   fetchImpl?: typeof fetch,
 *   chatFirst?: boolean,
 * }} [opts]
 */
export function attachStartPickerModelPreload(picker, opts = {}) {
  const existing = activeByPicker.get(picker);
  if (existing) return existing;

  const chatFirst = opts.chatFirst !== false && picker.chatFirst !== false;
  let isEnglish = Boolean(opts.isEnglish ?? picker.isEnglish);
  let langCode = opts.langCode === "en" ? "en" : "yue";
  const getSelectedId =
    opts.getSelectedId || picker.getSelectedId || (() => "nova");
  const fetchImpl = opts.fetchImpl;

  let modelJob = 0;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let selectionTimer = null;

  const previewLabel = (pct) =>
    isEnglish ? `Loading roster… ${pct}%` : `載入名單… ${pct}%`;
  const modelLabel = (pct) =>
    isEnglish ? `Downloading model… ${pct}%` : `下載模型… ${pct}%`;
  const readyLabel = isEnglish ? "Model ready" : "模型就緒";
  const chatReadyLabel = isEnglish ? "Ready to chat" : "可以開始傾偈";
  const fallbackReady = isEnglish
    ? "Ready — model loads when you begin"
    : "就緒 — 開始後載入模型";

  const apply = (pct, label) => {
    picker.setPreloadProgress?.(normalizePickerProgressPct(pct), label);
  };

  const setPreloading = (on) => {
    picker.element?.classList.toggle("is-preloading", Boolean(on));
  };

  /**
   * @param {string} characterId
   * @param {{ background?: boolean }} [loadOpts]
   */
  const loadSelectedModel = async (characterId, { background = false } = {}) => {
    const job = ++modelJob;
    const id = String(characterId || "nova").toLowerCase();
    const config = characterAvatarConfig(id, langCode);
    const url = String(config.modelUrl || "").trim();
    const fetchUrl = characterModelFetchUrl(id, langCode);
    if (!url || !/\.(vrm|glb)($|\?)/i.test(url)) {
      if (job !== modelJob || background) return;
      apply(100, chatFirst ? chatReadyLabel : readyLabel);
      setPreloading(false);
      return;
    }

    releaseVrmPreloadExcept(fetchUrl);

    const cached = getPreloadedVrmPromise(fetchUrl);
    if (cached) {
      try {
        await cached;
        if (job !== modelJob) return;
        if (!background) {
          apply(100, chatFirst ? chatReadyLabel : readyLabel);
          setPreloading(false);
        }
        return;
      } catch {
        releaseVrmPreload(url);
      }
    }

    if (!background) {
      apply(PICKER_PREVIEW_PROGRESS_MAX, modelLabel(PICKER_PREVIEW_PROGRESS_MAX));
    }
    try {
      await preloadVrmBuffer(fetchUrl, fetchImpl);
      if (job !== modelJob) return;
      if (!background) {
        apply(100, chatFirst ? chatReadyLabel : readyLabel);
      }
    } catch {
      if (job !== modelJob) return;
      if (!background) {
        apply(100, fallbackReady);
      }
    }
    if (!background) setPreloading(false);
  };

  const refreshSelectedModelBlocking = () =>
    loadSelectedModel(getSelectedId(), { background: false });

  const scheduleSelectedModelBackground = () => {
    if (selectionTimer) clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      scheduleCompanionBackgroundWork(() => {
        void loadSelectedModel(getSelectedId(), { background: true });
      });
    }, SELECTION_MODEL_DEBOUNCE_MS);
  };

  const refreshSelectedModel = chatFirst
    ? scheduleSelectedModelBackground
    : refreshSelectedModelBlocking;

  setPreloading(true);
  apply(2, previewLabel(2));

  const previewLoad = startCharacterPreviewPreload({
    langCode,
    onProgress: (ratio) => {
      const pct = Math.round(ratio * PICKER_PREVIEW_PROGRESS_MAX);
      apply(pct, previewLabel(pct));
    },
  });
  const previewPromise = Promise.race([
    previewLoad,
    new Promise((resolve) => {
      globalThis.setTimeout?.(() => resolve({ ok: true, timedOut: true }), PICKER_PREVIEW_TIMEOUT_MS);
    }),
  ]).then(async (result) => {
    if (result?.timedOut) {
      apply(100, chatFirst ? chatReadyLabel : readyLabel);
      setPreloading(false);
    }
    if (chatFirst) {
      apply(100, chatReadyLabel);
      setPreloading(false);
      scheduleCompanionBackgroundWork(() => {
        void loadSelectedModel(getSelectedId(), { background: true });
      });
      return result;
    }

    await result?.modelsLoading;
    await refreshSelectedModelBlocking();
    return result;
  });

  /**
   * Block until the roster VRM for this character is prefetched (Begin chat / switch).
   * @param {string} characterId
   */
  const ensureModelReady = async (characterId) => {
    modelJob += 1;
    const capMs = resolveModelEnsureReadyCapMs(characterId);
    await Promise.race([
      loadSelectedModel(characterId, { background: false }),
      new Promise((resolve) => {
        globalThis.setTimeout?.(resolve, capMs);
      }),
    ]);
  };

  const handle = {
    schema: COMPANION_START_PICKER_PRELOAD_SCHEMA,
    previewPromise,
    refreshSelectedModel,
    ensureModelReady,
    setLocale(nextEnglish, nextLangCode) {
      isEnglish = Boolean(nextEnglish);
      langCode = nextLangCode === "en" ? "en" : "yue";
    },
  };
  activeByPicker.set(picker, handle);
  return handle;
}
