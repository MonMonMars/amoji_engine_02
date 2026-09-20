/**
 * One-shot session repairs — legacy ids, flat scenes, missing atmosphere art.
 */
import {
  applySceneBackground,
  loadStoredSceneBackground,
  migrateLegacySceneStorage,
  resolveSceneBackgroundId,
  sceneBackgroundImageUrl,
} from "./companionScenePresets.js";
import {
  migrateLegacyCharacterStorage,
  migrateLegacyCharacterUrlParam,
  normalizeRosterCharacterId,
} from "./companionCharacterCatalog.js";
import { stripLegacyModelSearchParams } from "./companionCharacterMigration.mjs";

export const COMPANION_BOOT_REPAIR_SCHEMA = "amoji.companionBootRepair.v1";

/**
 * @param {HTMLElement | null | undefined} atmosphereEl
 * @param {string | null | undefined} [backgroundId]
 */
export function ensureAtmosphereAnimeBackground(atmosphereEl, backgroundId) {
  if (!atmosphereEl) return null;
  const id = applySceneBackground(
    atmosphereEl,
    resolveSceneBackgroundId(backgroundId),
  );
  const artUrl = sceneBackgroundImageUrl(id);
  let bg = "";
  try {
    bg = globalThis.getComputedStyle?.(atmosphereEl)?.backgroundImage || "";
  } catch {
    bg = "";
  }
  const missingArt =
    !bg ||
    bg === "none" ||
    (!bg.includes("scene-bg") &&
      !bg.includes("companion-bg-anime") &&
      !bg.includes(".svg"));
  if (missingArt && artUrl) {
    atmosphereEl.style.backgroundImage = `linear-gradient(180deg, rgba(7, 10, 16, 0.02) 0%, rgba(5, 7, 12, 0.12) 55%, rgba(3, 5, 10, 0.32) 100%), url("${artUrl}")`;
    atmosphereEl.style.backgroundSize = "cover";
    atmosphereEl.style.backgroundPosition = "center";
    atmosphereEl.style.backgroundRepeat = "no-repeat";
  }
  return id;
}

/**
 * Migrate storage + URL params so roster/scene fixes apply even on stale HTML.
 */
export function repairCompanionSessionBoot() {
  stripLegacyModelSearchParams();
  migrateLegacyCharacterStorage(globalThis.localStorage);
  migrateLegacyCharacterUrlParam();
  migrateLegacySceneStorage(globalThis.localStorage);
  const atmosphereEl = globalThis.document?.querySelector?.(".atmosphere");
  const scene = loadStoredSceneBackground(false);
  ensureAtmosphereAnimeBackground(atmosphereEl, scene.id);
  return {
    ok: true,
    characterId: normalizeRosterCharacterId(
      globalThis.localStorage?.getItem?.("amoji.companion.characterId"),
    ),
    sceneId: scene.id,
  };
}
