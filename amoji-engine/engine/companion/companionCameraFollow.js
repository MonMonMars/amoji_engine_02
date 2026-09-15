/**
 * Keep OrbitControls target (and camera offset) synced to the avatar anchor.
 */
import * as THREE from "three";

export const COMPANION_CAMERA_FOLLOW_SCHEMA = "amoji.companionCameraFollow.v1";

/**
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @param {import('three').Object3D} model
 * @param {import('three').Vector3} [out]
 */
export function computeVrmFrameAnchor(vrm, model, out = new THREE.Vector3()) {
  model.updateWorldMatrix(true, true);
  const fitted = new THREE.Box3().setFromObject(model);
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const head =
    vrm.humanoid?.getNormalizedBoneNode?.("head") ||
    vrm.humanoid?.getNormalizedBoneNode?.("neck");
  const upperBodyY = fitted.min.y + fittedSize.y * 0.58;
  if (head) {
    head.getWorldPosition(out);
    out.y = out.y * 0.25 + upperBodyY * 0.75;
  } else {
    fitted.getCenter(out);
    out.y = upperBodyY;
  }
  return out;
}

/**
 * @param {import('three').Object3D} model
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').Vector3} [out]
 */
export function computeGltfFrameAnchor(model, headBone, out = new THREE.Vector3()) {
  model.updateWorldMatrix(true, true);
  const fitted = new THREE.Box3().setFromObject(model);
  const fittedSize = fitted.getSize(new THREE.Vector3());
  if (headBone) {
    headBone.getWorldPosition(out);
    return out;
  }
  out.set(0, fitted.min.y + fittedSize.y * 0.88, 0);
  model.localToWorld(out);
  return out;
}

/**
 * Shift orbit target to anchor and move camera by the same delta so framing stays locked.
 * @param {import('three').OrbitControls} controls
 * @param {import('three').PerspectiveCamera} camera
 * @param {import('three').Vector3} anchor
 */
export function applyOrbitFollowAnchor(controls, camera, anchor) {
  const dx = anchor.x - controls.target.x;
  const dy = anchor.y - controls.target.y;
  const dz = anchor.z - controls.target.z;
  if (dx * dx + dy * dy + dz * dz < 1e-12) {
    return false;
  }
  controls.target.copy(anchor);
  camera.position.x += dx;
  camera.position.y += dy;
  camera.position.z += dz;
  return true;
}
