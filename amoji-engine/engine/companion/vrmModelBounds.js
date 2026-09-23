import * as THREE from "three";

/** Ignore stray collider / root meshes when fitting humanoid VRMs (e.g. fem_vroid). */
export const VRM_BOUNDS_MAX_MESH_DIM = 4.5;

/**
 * Union bounds of visible meshes, skipping absurdly large nodes that blow up scale.
 * @param {THREE.Object3D} root
 * @returns {THREE.Box3}
 */
export function computeVrmDisplayBounds(root) {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  const size = new THREE.Vector3();
  if (!root) return box;

  root.traverse((child) => {
    if (!child.isMesh || child.visible === false) return;
    tmp.setFromObject(child, true);
    if (tmp.isEmpty()) return;
    tmp.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > VRM_BOUNDS_MAX_MESH_DIM) return;
    box.union(tmp);
  });

  if (box.isEmpty()) {
    box.setFromObject(root);
  }
  return box;
}

/**
 * @param {THREE.Object3D} root
 */
export function vrmDisplayHeight(root) {
  return computeVrmDisplayBounds(root).getSize(new THREE.Vector3()).y;
}

const _hipsPos = new THREE.Vector3();
const _headPos = new THREE.Vector3();

/**
 * Torso height from humanoid bones (stable when mesh AABB is junk or macro-sized).
 * @param {import("@pixiv/three-vrm").VRMHumanoid | null | undefined} humanoid
 * @returns {number}
 */
export function measureVrmHumanoidHeight(humanoid) {
  const head = humanoid?.getNormalizedBoneNode?.("head");
  const hips = humanoid?.getNormalizedBoneNode?.("hips");
  if (!head || !hips) return 0;
  head.updateMatrixWorld(true);
  hips.updateMatrixWorld(true);
  head.getWorldPosition(_headPos);
  hips.getWorldPosition(_hipsPos);
  const torso = Math.abs(_headPos.y - _hipsPos.y);
  return torso > 0.15 ? torso + 0.35 : 0;
}

/**
 * @param {THREE.Object3D} root
 * @param {import("@pixiv/three-vrm").VRMHumanoid | null | undefined} humanoid
 */
export function resolveVrmFitHeight(root, humanoid) {
  const meshH = vrmDisplayHeight(root);
  const boneH = measureVrmHumanoidHeight(humanoid);
  if (boneH > 0.45 && boneH < 2.4) {
    return Math.max(meshH, boneH);
  }
  return meshH;
}
