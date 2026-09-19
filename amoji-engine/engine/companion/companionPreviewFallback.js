/** Browser-safe roster preview fallback (no Node imports). */

/** Fallback portrait when a roster card PNG fails to load. */
export const COMPANION_PREVIEW_FALLBACK =
  "/prototypes/assets/companion-girl-ref.png";

/**
 * Inline onerror handler for picker card / hero preview images.
 */
export function companionPreviewImgOnErrorAttr() {
  const fb = COMPANION_PREVIEW_FALLBACK;
  return `onerror="this.onerror=null;this.src='${fb}'"`;
}

/**
 * Detect failed WebGL / black canvas roster captures after load.
 * @param {HTMLImageElement} img
 * @returns {boolean}
 */
export function isMostlyBlackPreviewImage(img) {
  if (!img?.complete || !img.naturalWidth || !img.naturalHeight) return false;
  if (typeof document === "undefined") return false;
  try {
    const sampleW = 24;
    const sampleH = 24;
    const canvas = document.createElement("canvas");
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, sampleW, sampleH);
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
    let dark = 0;
    const total = sampleW * sampleH;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (lum < 18) dark += 1;
    }
    return dark / total >= 0.92;
  } catch {
    return false;
  }
}

/**
 * @param {HTMLImageElement | null | undefined} img
 * @param {string} [fallbackSrc]
 */
export function applyCompanionPreviewFallback(img, fallbackSrc = COMPANION_PREVIEW_FALLBACK) {
  if (!img || img.src.includes("companion-girl-ref.png")) return;
  img.src = fallbackSrc;
}

/**
 * @param {HTMLImageElement | null | undefined} img
 */
export function wireCompanionPreviewFallback(img) {
  if (!img || img.dataset.previewFallback === "1") return;
  img.dataset.previewFallback = "1";
  img.addEventListener("error", () => {
    applyCompanionPreviewFallback(img);
  });
  img.addEventListener("load", () => {
    if (isMostlyBlackPreviewImage(img)) {
      applyCompanionPreviewFallback(img);
    }
  });
  if (img.complete && img.naturalWidth > 0) {
    if (isMostlyBlackPreviewImage(img)) {
      applyCompanionPreviewFallback(img);
    }
  }
}
