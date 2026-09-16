/**
 * Preload all companion character models + preview images at boot;
 * release unused model buffers after the user picks one.
 */
import { listCompanionCharacters } from "./companionCharacterCatalog.js";
import {
  preloadVrmBuffer,
  releaseVrmPreloadExcept,
} from "./companionPreload.js";

export const COMPANION_CHARACTER_PRELOAD_SCHEMA =
  "amoji.companionCharacterPreload.v2";

const PREVIEW_PROGRESS_WEIGHT = 0.22;
const MODEL_PROGRESS_WEIGHT = 0.78;

let rosterPreloadProgress = 0;

/** @returns {number} 0..1 */
export function getRosterPreloadProgress() {
  return rosterPreloadProgress;
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
  }
  return [...urls];
}

/**
 * Inject `<link rel="prefetch">` hints for roster previews + models.
 * @param {"yue" | "en"} [langCode]
 */
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

export async function startCharacterRosterPreload(opts = {}) {
  const langCode = opts.langCode === "en" ? "en" : "yue";
  injectRosterAssetHints(langCode);
  const modelUrls = uniqueCharacterModelUrls(langCode);
  const previewUrls = uniqueCharacterPreviewUrls(langCode);
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function"
      ? globalThis.fetch.bind(globalThis)
      : null);

  let previewDone = 0;
  let modelDone = 0;
  rosterPreloadProgress = 0;
  opts.onProgress?.(0, "");

  const previewJob = preloadPreviewImages(previewUrls, (done) => {
    previewDone = done;
    reportCombinedProgress(
      previewDone,
      previewUrls.length,
      modelDone,
      modelUrls.length,
      opts.onProgress,
      "",
    );
  });

  const modelJob = (async () => {
    if (!fetchImpl || !modelUrls.length) {
      return { ok: true, results: [] };
    }
    const results = await Promise.all(
      modelUrls.map(async (url) => {
        try {
          await preloadVrmBuffer(url, fetchImpl);
          return { url, ok: true };
        } catch (err) {
          return { url, ok: false, error: err?.message || String(err) };
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
      }),
    );
    return { ok: results.some((r) => r.ok), results };
  })();

  const [previewResult, modelResult] = await Promise.all([previewJob, modelJob]);
  rosterPreloadProgress = 1;
  opts.onProgress?.(1, "");

  return {
    ok: Boolean(previewResult.ok || modelResult.ok),
    models: modelUrls,
    results: modelResult.results,
    previews: previewResult.count ?? previewUrls.length,
  };
}

if (typeof document !== "undefined") {
  injectRosterAssetHints("yue");
}

/**
 * Drop prefetched VRM buffers for companions the user did not pick.
 * @param {string | null | undefined} keepModelUrl
 */
export function retainSelectedCharacterCache(keepModelUrl) {
  releaseVrmPreloadExcept(keepModelUrl || null);
}
