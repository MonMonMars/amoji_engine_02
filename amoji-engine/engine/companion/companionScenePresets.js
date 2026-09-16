/**
 * Scene presets — background swatches for the companion stage.
 * Outfit presets are placeholders until per-character wardrobe ships.
 */
export const COMPANION_SCENE_PRESETS_SCHEMA = "amoji.companionScenePresets.v1";

export const SCENE_STORAGE_KEY = "amoji.companion.scenePreset";

/** @type {ReadonlyArray<{ id: string, labelEn: string, labelYue: string }>} */
export const SCENE_BACKGROUND_PRESETS = Object.freeze([
  { id: "night-city", labelEn: "Night city", labelYue: "夜景" },
  { id: "studio", labelEn: "Studio", labelYue: "影樓" },
  { id: "sunset", labelEn: "Sunset", labelYue: "黃昏" },
  { id: "minimal", labelEn: "Minimal dark", labelYue: "深色簡約" },
  { id: "aurora", labelEn: "Aurora", labelYue: "極光" },
]);

/** @type {ReadonlyArray<{ id: string, labelEn: string, labelYue: string, soon?: boolean }>} */
export const SCENE_OUTFIT_PRESETS = Object.freeze([
  { id: "default", labelEn: "Default look", labelYue: "原本造型", soon: true },
  { id: "casual", labelEn: "Casual", labelYue: "休閒", soon: true },
  { id: "formal", labelEn: "Formal", labelYue: "正式", soon: true },
]);

/**
 * @param {string | null | undefined} id
 */
export function resolveSceneBackgroundId(id) {
  const key = String(id || "").toLowerCase();
  if (SCENE_BACKGROUND_PRESETS.some((p) => p.id === key)) return key;
  return SCENE_BACKGROUND_PRESETS[0].id;
}

/**
 * @param {boolean} [isEnglish]
 */
export function loadStoredSceneBackground(isEnglish = false) {
  try {
    const raw = localStorage.getItem(SCENE_STORAGE_KEY);
    if (!raw) return SCENE_BACKGROUND_PRESETS[0];
    const parsed = JSON.parse(raw);
    const id = resolveSceneBackgroundId(parsed?.backgroundId);
    const preset = SCENE_BACKGROUND_PRESETS.find((p) => p.id === id);
    return preset || SCENE_BACKGROUND_PRESETS[0];
  } catch {
    return SCENE_BACKGROUND_PRESETS[0];
  }
}

/**
 * @param {string} backgroundId
 */
export function persistSceneBackground(backgroundId) {
  const id = resolveSceneBackgroundId(backgroundId);
  localStorage.setItem(
    SCENE_STORAGE_KEY,
    JSON.stringify({ backgroundId: id, schema: COMPANION_SCENE_PRESETS_SCHEMA }),
  );
  return id;
}

/**
 * @param {HTMLElement | null | undefined} atmosphereEl
 * @param {string} backgroundId
 */
export function applySceneBackground(atmosphereEl, backgroundId) {
  if (!atmosphereEl) return resolveSceneBackgroundId(backgroundId);
  const id = resolveSceneBackgroundId(backgroundId);
  atmosphereEl.dataset.sceneBg = id;
  return id;
}

/**
 * @param {{ id: string, labelEn: string, labelYue: string }} preset
 * @param {boolean} [isEnglish]
 */
export function scenePresetLabel(preset, isEnglish = false) {
  return isEnglish ? preset.labelEn : preset.labelYue;
}
