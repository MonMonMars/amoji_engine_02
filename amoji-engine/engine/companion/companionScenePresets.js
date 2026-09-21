/**
 * Scene presets — background swatches and per-character outfit wardrobe.
 */
import {
  COMPANION_ANIME_BG_PATH,
  pickerArtFetchUrl,
} from "./companionPickerAssets.mjs";

export const COMPANION_SCENE_PRESETS_SCHEMA =
  "amoji.companionScenePresets.v9-ultra-detail-scene-art";

/** First-run default — warm anime interior (not flat gray studio). */
export const DEFAULT_SCENE_BACKGROUND_ID = "cozy-room";

/** Retired flat / single-color presets → rich anime replacement. */
export const LEGACY_FLAT_SCENE_BACKGROUND_IDS = Object.freeze({
  minimal: "cozy-room",
});

export const SCENE_STORAGE_KEY = "amoji.companion.scenePreset";
export const CHAT_PANEL_STORAGE_KEY = "amoji.companion.chatPanelVisible";
export const SCENE_OUTFIT_STORAGE_KEY = "amoji.companion.sceneOutfit";

/** @typedef {"indoor" | "outdoor"} SceneEnvironment */

/**
 * @type {ReadonlyArray<{
 *   id: string,
 *   labelEn: string,
 *   labelYue: string,
 *   environment: SceneEnvironment,
 * }>}
 */
export const SCENE_BACKGROUND_PRESETS = Object.freeze([
  { id: "night-city", labelEn: "Night city", labelYue: "夜景", environment: "outdoor" },
  { id: "rooftop", labelEn: "Rooftop", labelYue: "天台", environment: "outdoor" },
  { id: "park", labelEn: "Park", labelYue: "公園", environment: "outdoor" },
  { id: "beach", labelEn: "Beach", labelYue: "海灘", environment: "outdoor" },
  { id: "sunset", labelEn: "Sunset", labelYue: "黃昏", environment: "outdoor" },
  { id: "aurora", labelEn: "Aurora", labelYue: "極光", environment: "outdoor" },
  { id: "rain-street", labelEn: "Rainy street", labelYue: "雨夜街道", environment: "outdoor" },
  { id: "cherry-blossom", labelEn: "Cherry blossom", labelYue: "櫻花", environment: "outdoor" },
  { id: "mountain", labelEn: "Mountain view", labelYue: "山景", environment: "outdoor" },
  { id: "harbor", labelEn: "Harbor", labelYue: "海港", environment: "outdoor" },
  { id: "meadow", labelEn: "Meadow", labelYue: "草原", environment: "outdoor" },
  { id: "studio", labelEn: "Studio", labelYue: "影樓", environment: "indoor" },
  { id: "cozy-room", labelEn: "Cozy room", labelYue: "溫馨房間", environment: "indoor" },
  { id: "cafe", labelEn: "Café", labelYue: "咖啡室", environment: "indoor" },
  { id: "library", labelEn: "Library", labelYue: "圖書館", environment: "indoor" },
  { id: "bedroom", labelEn: "Bedroom", labelYue: "睡房", environment: "indoor" },
  { id: "office", labelEn: "Office", labelYue: "辦公室", environment: "indoor" },
  { id: "classroom", labelEn: "Classroom", labelYue: "課室", environment: "indoor" },
  { id: "greenhouse", labelEn: "Greenhouse", labelYue: "玻璃花房", environment: "indoor" },
  { id: "loft", labelEn: "Loft", labelYue: "複式 loft", environment: "indoor" },
  { id: "kitchen", labelEn: "Kitchen", labelYue: "廚房", environment: "indoor" },
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

const LEGACY_BACKGROUND_ALIASES = Object.freeze({
  "night-city": "night-city",
});

/**
 * @param {string | null | undefined} id
 */
export function resolveSceneBackgroundId(id) {
  const key = String(id || "").toLowerCase();
  const legacyFlat =
    LEGACY_FLAT_SCENE_BACKGROUND_IDS[key] ||
    LEGACY_FLAT_SCENE_BACKGROUND_IDS[LEGACY_BACKGROUND_ALIASES[key] || ""];
  const normalized = legacyFlat || LEGACY_BACKGROUND_ALIASES[key] || key;
  if (SCENE_BACKGROUND_PRESETS.some((p) => p.id === normalized)) return normalized;
  return DEFAULT_SCENE_BACKGROUND_ID;
}

/**
 * @param {string | null | undefined} backgroundId
 * @returns {SceneEnvironment}
 */
export function resolveSceneEnvironment(backgroundId) {
  const id = resolveSceneBackgroundId(backgroundId);
  const preset = SCENE_BACKGROUND_PRESETS.find((p) => p.id === id);
  return preset?.environment === "outdoor" ? "outdoor" : "indoor";
}

/**
 * @param {string | null | undefined} backgroundId
 */
export function isOutdoorSceneBackground(backgroundId) {
  return resolveSceneEnvironment(backgroundId) === "outdoor";
}

/**
 * @param {boolean} [isEnglish]
 */
export function loadStoredSceneBackground(isEnglish = false) {
  void isEnglish;
  try {
    const raw = localStorage.getItem(SCENE_STORAGE_KEY);
    if (!raw) {
      return (
        SCENE_BACKGROUND_PRESETS.find((p) => p.id === DEFAULT_SCENE_BACKGROUND_ID) ||
        SCENE_BACKGROUND_PRESETS[0]
      );
    }
    const parsed = JSON.parse(raw);
    let id = resolveSceneBackgroundId(parsed?.backgroundId);
    if (
      parsed?.schema !== COMPANION_SCENE_PRESETS_SCHEMA &&
      LEGACY_FLAT_SCENE_BACKGROUND_IDS[parsed?.backgroundId]
    ) {
      id = resolveSceneBackgroundId(parsed?.backgroundId);
      persistSceneBackground(id);
    }
    const preset = SCENE_BACKGROUND_PRESETS.find((p) => p.id === id);
    return (
      preset ||
      SCENE_BACKGROUND_PRESETS.find((p) => p.id === DEFAULT_SCENE_BACKGROUND_ID) ||
      SCENE_BACKGROUND_PRESETS[0]
    );
  } catch {
    return (
      SCENE_BACKGROUND_PRESETS.find((p) => p.id === DEFAULT_SCENE_BACKGROUND_ID) ||
      SCENE_BACKGROUND_PRESETS[0]
    );
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
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} [storage]
 */
export function migrateLegacySceneStorage(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(SCENE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = resolveSceneBackgroundId(parsed?.backgroundId);
    if (
      parsed?.schema !== COMPANION_SCENE_PRESETS_SCHEMA ||
      String(parsed?.backgroundId || "").toLowerCase() !== id
    ) {
      storage?.setItem?.(
        SCENE_STORAGE_KEY,
        JSON.stringify({
          backgroundId: id,
          schema: COMPANION_SCENE_PRESETS_SCHEMA,
        }),
      );
    }
    return id;
  } catch {
    return null;
  }
}

/**
 * Cache-busted art URL for inline / repair bootstrapping.
 * @param {string | null | undefined} backgroundId
 */
export function sceneBackgroundImageUrl(backgroundId) {
  const id = resolveSceneBackgroundId(backgroundId);
  if (id === "night-city") {
    return pickerArtFetchUrl(COMPANION_ANIME_BG_PATH);
  }
  return pickerArtFetchUrl(`/prototypes/assets/scene-bg/${id}.png`);
}

/**
 * @param {HTMLElement | null | undefined} atmosphereEl
 * @param {string} backgroundId
 */
export function applySceneBackground(atmosphereEl, backgroundId) {
  const id = resolveSceneBackgroundId(backgroundId);
  const environment = resolveSceneEnvironment(id);
  if (atmosphereEl) {
    atmosphereEl.dataset.sceneBg = id;
    atmosphereEl.dataset.sceneEnvironment = environment;
  }
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
