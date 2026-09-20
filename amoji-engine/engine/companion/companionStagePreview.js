/**
 * Character portrait overlay on the 3D stage while models load or switch.
 */
export const COMPANION_STAGE_PREVIEW_SCHEMA = "amoji.companionStagePreview.v2";

/**
 * @param {HTMLElement | null | undefined} stageEl
 */
export function createCompanionStagePreview(stageEl) {
  const stage = stageEl || null;
  const img = document.createElement("img");
  img.className = "avatar-stage-preview";
  img.alt = "";
  img.decoding = "async";
  img.hidden = true;
  stage?.appendChild(img);

  return {
    schema: COMPANION_STAGE_PREVIEW_SCHEMA,
    show(url) {
      const src = String(url || "").trim();
      if (!src) return false;
      /** Portrait overlay disabled — chat/UI stay primary while 3D loads in background. */
      img.hidden = true;
      img.removeAttribute("src");
      stage?.classList.remove("has-stage-preview");
      return false;
    },
    hide() {
      img.hidden = true;
      img.removeAttribute("src");
      stage?.classList.remove("has-stage-preview");
    },
    destroy() {
      this.hide();
      img.remove();
    },
  };
}
