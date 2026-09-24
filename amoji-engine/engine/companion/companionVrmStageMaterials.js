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

/**
 * @param {import('three').Object3D | null | undefined} root
 */
export function normalizeCompanionVrmStageMaterials(root) {
  if (!root) return 0;
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
      m.needsUpdate = true;
      n += 1;
    }
  });
  return n;
}
