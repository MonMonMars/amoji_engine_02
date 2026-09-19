/**
 * Outfit tint presets — v1 wardrobe via material tone shifts (Nova and other VRMs).
 */
import * as THREE from "three";

export const COMPANION_OUTFIT_SCHEMA = "amoji.companionOutfit.v1";

/** @typedef {{ color?: string, emissive?: string, emissiveIntensity?: number, metalness?: number, roughness?: number }} OutfitMaterialShift */

/** @type {Readonly<Record<string, OutfitMaterialShift | null>>} */
export const OUTFIT_MATERIAL_SHIFTS = Object.freeze({
  default: null,
  casual: {
    color: "#f2ddd0",
    emissive: "#3d2a22",
    emissiveIntensity: 0.04,
    roughness: 0.62,
  },
  formal: {
    color: "#d8e2ef",
    emissive: "#1a2840",
    emissiveIntensity: 0.06,
    metalness: 0.08,
    roughness: 0.48,
  },
});

/**
 * @param {import('three').Object3D | null | undefined} root
 * @param {string} outfitId
 */
export function applyVrmOutfitTint(root, outfitId) {
  if (!root) return resolveOutfitId(outfitId);
  const id = resolveOutfitId(outfitId);
  const shift = OUTFIT_MATERIAL_SHIFTS[id] ?? null;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const name = String(obj.name || "").toLowerCase();
    const isSkinOrFace = /hair|face|skin|head|eye|brow|lash|teeth|mouth|tongue|nail/.test(
      name,
    );
    const isClothing = /cloth|shirt|pant|skirt|dress|jacket|coat|torso|top|bottom|outfit|wear|uniform|suit|vest|hoodie|shoe|boot|sock|glove|belt|accessory|acc_/.test(
      name,
    );
    if (isSkinOrFace || !isClothing) {
      if (id !== "default") return;
    }

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat?.color) continue;
      if (!mat.userData.outfitBaseColor) {
        mat.userData.outfitBaseColor = mat.color.clone();
        mat.userData.outfitBaseEmissive = mat.emissive?.clone?.() || null;
        mat.userData.outfitBaseEmissiveIntensity = mat.emissiveIntensity ?? 0;
        mat.userData.outfitBaseMetalness = mat.metalness ?? 0;
        mat.userData.outfitBaseRoughness = mat.roughness ?? 1;
      }
      const base = mat.userData.outfitBaseColor;
      if (!shift) {
        mat.color.copy(base);
        if (mat.emissive && mat.userData.outfitBaseEmissive) {
          mat.emissive.copy(mat.userData.outfitBaseEmissive);
        }
        mat.emissiveIntensity = mat.userData.outfitBaseEmissiveIntensity;
        if (typeof mat.metalness === "number") {
          mat.metalness = mat.userData.outfitBaseMetalness;
        }
        if (typeof mat.roughness === "number") {
          mat.roughness = mat.userData.outfitBaseRoughness;
        }
        mat.needsUpdate = true;
        continue;
      }
      if (shift.color) {
        mat.color.copy(base).lerp(new THREE.Color(shift.color), 0.28);
      }
      if (shift.emissive && mat.emissive) {
        mat.emissive.set(shift.emissive);
        mat.emissiveIntensity = shift.emissiveIntensity ?? 0.05;
      }
      if (typeof shift.metalness === "number" && typeof mat.metalness === "number") {
        mat.metalness = shift.metalness;
      }
      if (typeof shift.roughness === "number" && typeof mat.roughness === "number") {
        mat.roughness = shift.roughness;
      }
      mat.needsUpdate = true;
    }
  });
  return id;
}

/**
 * @param {string | null | undefined} id
 */
export function resolveOutfitId(id) {
  const key = String(id || "default").toLowerCase();
  if (key in OUTFIT_MATERIAL_SHIFTS) return key;
  return "default";
}
