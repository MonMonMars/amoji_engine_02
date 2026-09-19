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
 * @param {HTMLImageElement | null | undefined} img
 */
export function wireCompanionPreviewFallback(img) {
  if (!img || img.dataset.previewFallback === "1") return;
  img.dataset.previewFallback = "1";
  img.addEventListener("error", () => {
    if (img.src.includes("companion-girl-ref.png")) return;
    img.src = COMPANION_PREVIEW_FALLBACK;
  });
}
