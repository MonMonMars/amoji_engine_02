/**
 * Preload all companion character models + preview images at boot;
 * release unused model buffers after the user picks one.
 */
import { listCompanionCharacters } from "./companionCharacterCatalog.js";
import {
  preloadVrmBuffer,
  releaseVrmPreloadExcept,
} from "./companionPreload.js";
import { sortModelUrlsForPreload } from "./companionVrmInspect.js";

export const COMPANION_CHARACTER_PRELOAD_SCHEMA =
  "amoji.companionCharacterPreload.v3";

/** Gallery-priority preview count for instant picker (rest lazy-loads). */
export const PRIORITY_PREVIEW_COUNT = 4;

const PREVIEW_PROGRESS_WEIGHT = 0.22;
const MODEL_PROGRESS_WEIGHT = 0.78;

let rosterPreloadProgress = 0;
/** @type {Promise<{ ok: boolean, results?: unknown[] }> | null} */
let rosterModelsPreloadPromise = null;

/** @returns {number} 0..1 */
export function getRosterPreloadProgress() {
  return rosterPreloadProgress;
}

/** @returns {Promise<{ ok: boolean, results?: unknown[] }> | null} */
export function getRosterModelsPreloadPromise() {
  return rosterModelsPreloadPromise;
}

/**
 * @param {"yue" | "en"} [langCode]
 */
export function uniqueCharacterModelUrls(langCode = "yue") {
  const urls = new Set();
  for (const item of listCompanionCharacters(langCode)) {
    if (
      item.modelUrl &&
      /\.(vrm|glb)($|\?)/i.test(item.modelUrl)
    ) {
      urls.add(item.modelUrl);
    }
  }
  return [...urls];
}

/**
 * @param {"yue" | "en"} [langCode]
 */
export function uniqueCharacterPreviewUrls(langCode = "yue") {
  const urls = new Set();
  for (const item of listCompanionCharacters(langCode)) {
    if (item.previewImage) urls.add(item.previewImage);
    if (item.heroPreviewImage) urls.add(item.heroPreviewImage);
  }
  return [...urls];
}

/**
 * Inject `<link rel="prefetch">` hints for roster previews + models.
 * @param {"yue" | "en"} [langCode]
 */
/**
 * Prefetch only featured preview PNGs — not full roster VRMs at boot.
 * @param {"yue" | "en"} [langCode]
 * @param {number} [previewCount]
 */
export function injectPriorityRosterAssetHints(
  langCode = "yue",
  previewCount = PRIORITY_PREVIEW_COUNT,
) {
  if (typeof document === "undefined") return;
  const urls = uniqueCharacterPreviewUrls(langCode).slice(0, previewCount);
  for (const url of urls) {
    if (document.querySelector(`link[data-amoji-roster-hint="${url}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.dataset.amojiRosterHint = url;
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);
  }
}

export function injectRosterAssetHints(langCode = "yue") {
  if (typeof document === "undefined") return;
  const urls = [
    ...uniqueCharacterPreviewUrls(langCode),
    ...uniqueCharacterModelUrls(langCode),
  ];
  for (const url of urls) {
    if (document.querySelector(`link[data-amoji-roster-hint="${url}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.dataset.amojiRosterHint = url;
    if (/\.(png|jpe?g|webp|gif)($|\?)/i.test(url)) {
      link.as = "image";
    } else {
      link.as = "fetch";
      link.crossOrigin = "anonymous";
    }
    link.href = url;
    document.head.appendChild(link);
  }
}

/**
 * @param {string[]} urls
 * @param {(done: number, total: number) => void} [onProgress]
 */
export function preloadPreviewImages(urls, onProgress) {
  if (typeof Image === "undefined") return Promise.resolve({ ok: true, count: 0 });
  const total = urls.length;
  if (!total) {
    onProgress?.(0, 0);
    return Promise.resolve({ ok: true, count: 0 });
  }
  let done = 0;
  const jobs = urls.map(
    (url) =>
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        const finish = (ok) => {
          done += 1;
          onProgress?.(done, total);
          resolve(ok);
        };
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.src = url;
      }),
  );
  return Promise.all(jobs).then((results) => ({
    ok: results.some(Boolean),
    count: results.filter(Boolean).length,
  }));
}

/**
 * @param {{
 *   langCode?: "yue" | "en",
 *   fetchImpl?: typeof fetch,
 *   onProgress?: (ratio: number, url: string) => void,
 * }} [opts]
 */
function reportCombinedProgress(
  previewDone,
  previewTotal,
  modelDone,
  modelTotal,
  onProgress,
  lastUrl,
) {
  const previewRatio = previewTotal ? previewDone / previewTotal : 1;
  const modelRatio = modelTotal ? modelDone / modelTotal : 1;
  rosterPreloadProgress =
    previewRatio * PREVIEW_PROGRESS_WEIGHT + modelRatio * MODEL_PROGRESS_WEIGHT;
  onProgress?.(rosterPreloadProgress, lastUrl);
}

/**
 * Preview images only — fast boot, no multi-hundred-MB VRM download.
 * @param {{
 *   langCode?: "yue" | "en",
 *   onProgress?: (ratio: number, url: string) => void,
 *   onPreviewsReady?: () => void,
 * }} [opts]
 */
export async function startCharacterPreviewPreload(opts = {}) {
  return startCharacterRosterPreload({ ...opts, preloadModels: false });
}

export async function startCharacterRosterPreload(opts = {}) {
  const langCode = opts.langCode === "en" ? "en" : "yue";
  const preloadModels = opts.preloadModels !== false;
  const modelUrls = preloadModels
    ? sortModelUrlsForPreload(uniqueCharacterModelUrls(langCode))
    : [];
  const previewUrls = uniqueCharacterPreviewUrls(langCode);
  const priorityPreviewUrls = previewUrls.slice(0, PRIORITY_PREVIEW_COUNT);
  const deferredPreviewUrls = previewUrls.slice(PRIORITY_PREVIEW_COUNT);
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function"
      ? globalThis.fetch.bind(globalThis)
      : null);

  let previewDone = 0;
  let modelDone = 0;
  rosterPreloadProgress = 0;
  opts.onProgress?.(0, "");

  if (typeof document !== "undefined" && preloadModels) {
    scheduleCompanionAssetHints(langCode);
  } else if (typeof document !== "undefined") {
    injectPriorityRosterAssetHints(langCode, PRIORITY_PREVIEW_COUNT);
  }

  rosterModelsPreloadPromise = (async () => {
    const priorityPreviewResult = await preloadPreviewImages(
      priorityPreviewUrls,
      (done, total) => {
        previewDone = done;
        if (preloadModels) {
          reportCombinedProgress(
            previewDone,
            previewUrls.length,
            modelDone,
            modelUrls.length,
            opts.onProgress,
            "",
          );
          return;
        }
        const previewTotal = total || priorityPreviewUrls.length || 1;
        const ratio = previewDone / previewTotal;
        rosterPreloadProgress = ratio;
        opts.onProgress?.(ratio, "");
      },
    );
    opts.onPreviewsReady?.();

    if (!preloadModels) {
      rosterPreloadProgress = 1;
      opts.onProgress?.(1, "");
      void preloadPreviewImages(deferredPreviewUrls);
      return {
        ok: Boolean(priorityPreviewResult.ok),
        results: [],
        modelsSkipped: true,
      };
    }

    void preloadPreviewImages(deferredPreviewUrls, (done) => {
      previewDone = priorityPreviewUrls.length + done;
      reportCombinedProgress(
        previewDone,
        previewUrls.length,
        modelDone,
        modelUrls.length,
        opts.onProgress,
        "",
      );
    });

    if (!fetchImpl || !modelUrls.length) {
      rosterPreloadProgress = preloadModels ? rosterPreloadProgress : 1;
      if (!preloadModels) opts.onProgress?.(1, "");
      return {
        ok: Boolean(priorityPreviewResult.ok),
        results: [],
        modelsSkipped: !preloadModels,
      };
    }

    const results = [];
    for (const url of modelUrls) {
      try {
        await preloadVrmBuffer(url, fetchImpl);
        results.push({ url, ok: true });
      } catch (err) {
        results.push({ url, ok: false, error: err?.message || String(err) });
      } finally {
        modelDone += 1;
        reportCombinedProgress(
          previewDone,
          previewUrls.length,
          modelDone,
          modelUrls.length,
          opts.onProgress,
          url,
        );
      }
    }
    rosterPreloadProgress = 1;
    opts.onProgress?.(1, "");
    return { ok: results.some((r) => r.ok), results };
  })();

  return {
    ok: true,
    phase: "background",
    models: modelUrls,
    previews: previewUrls.length,
    preloadModels,
    modelsLoading: rosterModelsPreloadPromise,
  };
}

/**
 * Background download of roster VRM/GLB buffers — run after chat + first avatar.
 * @param {{
 *   langCode?: "yue" | "en",
 *   fetchImpl?: typeof fetch,
 *   onProgress?: (ratio: number, url: string) => void,
 * }} [opts]
 */
export function startCharacterRosterModelPreload(opts = {}) {
  return startCharacterRosterPreload({ ...opts, preloadModels: true });
}

/**
 * Defer full roster prefetch hints so they do not compete with chat boot.
 * @param {"yue" | "en"} langCode
 */
export function scheduleCompanionAssetHints(langCode = "yue") {
  const run = () => injectRosterAssetHints(langCode);
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(run, { timeout: 4000 });
    return;
  }
  globalThis.setTimeout?.(run, 120);
}

/**
 * Drop prefetched VRM buffers for companions the user did not pick.
 * @param {string | null | undefined} keepModelUrl
 */
export function retainSelectedCharacterCache(keepModelUrl) {
  releaseVrmPreloadExcept(keepModelUrl || null);
}
