/**
 * Preload all companion character models + preview images at boot;
 * release unused VRM buffers after the user picks one.
 */
import { listCompanionCharacters } from "./companionCharacterCatalog.js";
import {
  preloadVrmBuffer,
  releaseVrmPreloadExcept,
} from "./companionPreload.js";

export const COMPANION_CHARACTER_PRELOAD_SCHEMA =
  "amoji.companionCharacterPreload.v1";

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
    if (item.modelUrl && /\.vrm($|\?)/i.test(item.modelUrl)) {
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
 * @param {string[]} urls
 */
export function preloadPreviewImages(urls) {
  if (typeof Image === "undefined") return Promise.resolve({ ok: true, count: 0 });
  const jobs = urls.map(
    (url) =>
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
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
export async function startCharacterRosterPreload(opts = {}) {
  const langCode = opts.langCode === "en" ? "en" : "yue";
  const modelUrls = uniqueCharacterModelUrls(langCode);
  const previewUrls = uniqueCharacterPreviewUrls(langCode);
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function"
      ? globalThis.fetch.bind(globalThis)
      : null);

  void preloadPreviewImages(previewUrls);

  if (!fetchImpl || !modelUrls.length) {
    return { ok: true, models: [], previews: previewUrls.length };
  }

  let done = 0;
  rosterPreloadProgress = 0;
  const results = await Promise.all(
    modelUrls.map(async (url) => {
      try {
        await preloadVrmBuffer(url, fetchImpl);
        return { url, ok: true };
      } catch (err) {
        return { url, ok: false, error: err?.message || String(err) };
      } finally {
        done += 1;
        rosterPreloadProgress = done / modelUrls.length;
        opts.onProgress?.(rosterPreloadProgress, url);
      }
    }),
  );
  rosterPreloadProgress = 1;

  return {
    ok: results.some((r) => r.ok),
    models: modelUrls,
    results,
    previews: previewUrls.length,
  };
}

/**
 * Drop prefetched VRM buffers for companions the user did not pick.
 * @param {string | null | undefined} keepModelUrl
 */
export function retainSelectedCharacterCache(keepModelUrl) {
  releaseVrmPreloadExcept(keepModelUrl || null);
}
