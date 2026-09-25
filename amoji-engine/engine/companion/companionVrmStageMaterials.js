/**
 * Normalize VRM/MToon materials so CC0 samples (e.g. Sendagaya Shino) match stage lighting
 * used for the rest of the roster — no blown-out env maps or emissive hotspots.
 */
import * as THREE from "three";

export const COMPANION_VRM_STAGE_MATERIALS_SCHEMA =
  "amoji.companionVrmStageMaterials.v1";

const DEFAULT_ENV_INTENSITY = 0.38;
const ENV_MIN = 0.12;
const ENV_MAX = 0.52;

/** Roster #24–27 — VRoid CC0 Sendagaya exports; raw MToon is harsher than flagship Alicia. */
export const SENDAGAYA_CC0_STAGE_CHARACTER_IDS = new Set([
  "shino",
  "shibu",
  "fumiriya",
  "darkness_shibu",
]);

/** Alicia (#3) post–VRM0-compat MToon targets (see material name bands in companion-alicia.vrm). */
const ALICIA_MTOON_GI_EQUALIZATION = 0.9;

/**
 * @param {string | null | undefined} meshName
 * @returns {{ shadingToonyFactor: number, shadingShiftFactor: number, matcapScale: number }}
 */
export function aliciaMToonLightingForMeshName(meshName) {
  const n = String(meshName || "").toUpperCase();
  if (n.includes("HAIR")) {
    return { shadingToonyFactor: 0.5, shadingShiftFactor: -0.5, matcapScale: 0.55 };
  }
  if (
    n.includes("EYE") ||
    n.includes("FACE") ||
    n.includes("_SKIN") ||
    n.endsWith("SKIN")
  ) {
    return {
      shadingToonyFactor: 0.925,
      shadingShiftFactor: 0.425,
      matcapScale: 0.45,
    };
  }
  return { shadingToonyFactor: 0.95, shadingShiftFactor: -0.05, matcapScale: 0.5 };
}

/**
 * @param {import('@pixiv/three-vrm-materials-mtoon').MToonMaterial | object} material
 * @param {string | null | undefined} meshName
 */
export function applyAliciaLikeMToonStage(material, meshName) {
  if (!material?.isMToonMaterial) return;
  const target = aliciaMToonLightingForMeshName(meshName);
  material.shadingToonyFactor = target.shadingToonyFactor;
  material.shadingShiftFactor = target.shadingShiftFactor;
  material.giEqualizationFactor = ALICIA_MTOON_GI_EQUALIZATION;
  if (material.matcapFactor?.multiplyScalar) {
    material.matcapFactor.multiplyScalar(target.matcapScale);
  }
}

/**
 * @param {import('three').Object3D | null | undefined} root
 * @param {{ characterId?: string }} [opts]
 */
export function normalizeCompanionVrmStageMaterials(root, opts = {}) {
  if (!root) return 0;
  const characterId = String(opts.characterId || "").toLowerCase();
  const aliciaMToonStage = SENDAGAYA_CC0_STAGE_CHARACTER_IDS.has(characterId);
  let n = 0;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    obj.frustumCulled = false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m) continue;
      m.visible = true;
      if (m.map) {
        m.map.colorSpace = THREE.SRGBColorSpace;
      }
      if (typeof m.envMapIntensity === "number") {
        m.envMapIntensity = THREE.MathUtils.clamp(
          m.envMapIntensity,
          ENV_MIN,
          ENV_MAX,
        );
      } else {
        m.envMapIntensity = DEFAULT_ENV_INTENSITY;
      }
      if (m.emissive && typeof m.emissiveIntensity === "number") {
        m.emissiveIntensity = Math.min(m.emissiveIntensity, 0.12);
      }
      if (typeof m.roughness === "number") {
        m.roughness = Math.min(1, Math.max(0.45, m.roughness));
      }
      if (aliciaMToonStage) {
        applyAliciaLikeMToonStage(m, obj.name);
      }
      m.needsUpdate = true;
      n += 1;
    }
  });
  return n;
}
