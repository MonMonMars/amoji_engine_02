/**
 * Scene presets — background swatches and per-character outfit wardrobe (v1).
 */
export const COMPANION_SCENE_PRESETS_SCHEMA = "amoji.companionScenePresets.v1";

export const SCENE_STORAGE_KEY = "amoji.companion.scenePreset";
export const CHAT_PANEL_STORAGE_KEY = "amoji.companion.chatPanelVisible";
export const SCENE_OUTFIT_STORAGE_KEY = "amoji.companion.sceneOutfit";

/** @type {ReadonlyArray<{ id: string, labelEn: string, labelYue: string }>} */
export const SCENE_BACKGROUND_PRESETS = Object.freeze([
  { id: "night-city", labelEn: "Night city", labelYue: "夜景" },
  { id: "studio", labelEn: "Studio", labelYue: "影樓" },
  { id: "sunset", labelEn: "Sunset", labelYue: "黃昏" },
  { id: "minimal", labelEn: "Minimal dark", labelYue: "深色簡約" },
  { id: "aurora", labelEn: "Aurora", labelYue: "極光" },
]);

/** @type {ReadonlyArray<{ id: string, labelEn: string, labelYue: string, swatch?: string, characters?: string[] }>} */
export const SCENE_OUTFIT_PRESETS = Object.freeze([
  { id: "default", labelEn: "Default look", labelYue: "原本造型", swatch: "default" },
  {
    id: "casual",
    labelEn: "Casual soft",
    labelYue: "休閒柔和",
    swatch: "casual",
  },
  {
    id: "formal",
    labelEn: "Formal crisp",
    labelYue: "正式利落",
    swatch: "formal",
  },
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

/**
 * @param {boolean} [defaultVisible]
 */
export function loadChatPanelVisible(defaultVisible = true) {
  try {
    const raw = localStorage.getItem(CHAT_PANEL_STORAGE_KEY);
    if (raw === "false") return false;
    if (raw === "true") return true;
    return defaultVisible;
  } catch {
    return defaultVisible;
  }
}

/**
 * @param {boolean} visible
 */
export function persistChatPanelVisible(visible) {
  try {
    localStorage.setItem(CHAT_PANEL_STORAGE_KEY, String(visible));
  } catch {
    /* ignore quota / private mode */
  }
  return visible;
}

/**
 * @param {string | null | undefined} id
 */
export function resolveSceneOutfitId(id) {
  const key = String(id || "default").toLowerCase();
  if (SCENE_OUTFIT_PRESETS.some((p) => p.id === key)) return key;
  return "default";
}

/**
 * @param {{ characters?: string[] }} preset
 * @param {string} characterId
 */
export function outfitPresetAvailableForCharacter(preset, characterId) {
  const chars = preset?.characters;
  if (!chars?.length) return true;
  return chars.includes(String(characterId || "").toLowerCase());
}

/**
 * @param {string} characterId
 */
export function loadStoredSceneOutfit(characterId) {
  try {
    const raw = localStorage.getItem(SCENE_OUTFIT_STORAGE_KEY);
    if (!raw) return "default";
    const parsed = JSON.parse(raw);
    const byCharacter = parsed?.byCharacter || {};
    const id = resolveSceneOutfitId(byCharacter[String(characterId || "").toLowerCase()]);
    const preset = SCENE_OUTFIT_PRESETS.find((p) => p.id === id);
    if (!preset || !outfitPresetAvailableForCharacter(preset, characterId)) {
      return "default";
    }
    return id;
  } catch {
    return "default";
  }
}

/**
 * @param {string} characterId
 * @param {string} outfitId
 */
export function persistSceneOutfit(characterId, outfitId) {
  const charKey = String(characterId || "amoji").toLowerCase();
  const id = resolveSceneOutfitId(outfitId);
  const preset = SCENE_OUTFIT_PRESETS.find((p) => p.id === id);
  const resolved =
    preset && outfitPresetAvailableForCharacter(preset, charKey) ? id : "default";
  try {
    const raw = localStorage.getItem(SCENE_OUTFIT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const byCharacter = { ...(parsed?.byCharacter || {}), [charKey]: resolved };
    localStorage.setItem(
      SCENE_OUTFIT_STORAGE_KEY,
      JSON.stringify({
        schema: COMPANION_SCENE_PRESETS_SCHEMA,
        byCharacter,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
  return resolved;
}

/**
 * @param {HTMLElement | null | undefined} stageEl
 * @param {string} outfitId
 */
export function applySceneOutfit(stageEl, outfitId) {
  if (!stageEl) return resolveSceneOutfitId(outfitId);
  const id = resolveSceneOutfitId(outfitId);
  stageEl.dataset.sceneOutfit = id;
  return id;
}
