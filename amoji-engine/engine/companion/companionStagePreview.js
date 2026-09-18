/**
 * Character portrait overlay on the 3D stage while models load or switch.
 */
export const COMPANION_STAGE_PREVIEW_SCHEMA = "amoji.companionStagePreview.v1";

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
      img.src = src;
      img.hidden = false;
      stage?.classList.add("has-stage-preview");
      return true;
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
