/**
 * Keep OrbitControls target (and camera offset) synced to the avatar anchor.
 */
import * as THREE from "three";
import { computeUpperBodyAnchor } from "./companionPortraitFraming.js";

export const COMPANION_CAMERA_FOLLOW_SCHEMA = "amoji.companionCameraFollow.v2-lower-neck";

/** Neck → upper chest blend for orbit pivot (lower neck, not jaw). */
export const LOWER_NECK_CHEST_BLEND = 0.38;
/** Head → neck blend when chest bone is missing. */
export const LOWER_NECK_HEAD_NECK_BLEND = 0.72;

const _neckScratch = new THREE.Vector3();
const _chestScratch = new THREE.Vector3();
const _headScratch = new THREE.Vector3();

/**
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @param {import('three').Object3D} model
 * @param {import('three').Vector3} [out]
 */
export function computeVrmFrameAnchor(vrm, model, out = new THREE.Vector3()) {
  model.updateWorldMatrix(true, true);
  const fitted = new THREE.Box3().setFromObject(model);
  const humanoid = vrm.humanoid;
  const neck = humanoid?.getNormalizedBoneNode?.("neck");
  const head = humanoid?.getNormalizedBoneNode?.("head");
  const chest =
    humanoid?.getNormalizedBoneNode?.("upperChest") ||
    humanoid?.getNormalizedBoneNode?.("chest");

  if (neck) {
    neck.getWorldPosition(_neckScratch);
    if (chest) {
      chest.getWorldPosition(_chestScratch);
      out.copy(_neckScratch).lerp(_chestScratch, LOWER_NECK_CHEST_BLEND);
      return out;
    }
    if (head) {
      head.getWorldPosition(_headScratch);
      out.copy(_headScratch).lerp(_neckScratch, LOWER_NECK_HEAD_NECK_BLEND);
      return out;
    }
    out.copy(_neckScratch);
    return out;
  }

  const headBone = head || neck;
  const headPos = headBone ? new THREE.Vector3() : null;
  if (headBone && headPos) headBone.getWorldPosition(headPos);
  return computeUpperBodyAnchorFromBox(fitted, headPos, out);
}

/**
 * @param {import('three').Box3} fitted
 * @param {import('three').Vector3 | null | undefined} headWorld
 * @param {import('three').Vector3} [out]
 */
export function computeUpperBodyAnchorFromBox(fitted, headWorld, out = new THREE.Vector3()) {
  return computeUpperBodyAnchor(fitted, headWorld, out);
}

/**
 * @param {import('three').Object3D} model
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').Vector3} [out]
 */
export function computeGltfFrameAnchor(model, headBone, out = new THREE.Vector3()) {
  model.updateWorldMatrix(true, true);
  const fitted = new THREE.Box3().setFromObject(model);
  const headPos = headBone ? new THREE.Vector3() : null;
  if (headBone && headPos) headBone.getWorldPosition(headPos);
  return computeUpperBodyAnchor(fitted, headPos, out);
}

/**
 * Low-pass filter for orbit anchors — tames spring-bone / bbox jitter.
 * @param {import('three').Vector3} smoothed
 * @param {import('three').Vector3} next
 * @param {number} dt
 * @param {number} [tauSec]
 */
export function smoothFrameAnchor(smoothed, next, dt, tauSec = 0.2) {
  const k = tauSec <= 0 ? 1 : Math.min(1, dt / tauSec);
  smoothed.lerp(next, k);
  return smoothed;
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
  if (dx * dx + dy * dy + dz * dz < 2.5e-5) {
    return false;
  }
  controls.target.copy(anchor);
  camera.position.x += dx;
  camera.position.y += dy;
  camera.position.z += dz;
  return true;
}
