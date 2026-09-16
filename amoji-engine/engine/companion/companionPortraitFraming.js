/**
 * Shared default portrait / upper-body camera framing for VRM + GLTF avatars.
 */
import * as THREE from "three";

export const COMPANION_PORTRAIT_FRAMING_SCHEMA = "amoji.companionPortraitFraming.v1";

/** Chest-level orbit target (ratio from feet to head). */
export const UPPER_BODY_ANCHOR_RATIO = 0.5;
/** How much head height influences anchor (lower = more chest framing). */
export const HEAD_ANCHOR_BLEND = 0.12;

/** Portrait FOV — head + shoulders + torso, legs cropped below waist. */
export const PORTRAIT_FOV = 30;

/** Camera distance ≈ 1.3× character height — relaxed first view, not face close-up. */
export const PORTRAIT_DIST_FACTOR = 1.3;
export const PORTRAIT_DIST_MIN = 1.12;

/**
 * Default camera Z offset sign (matches @pixiv/three-vrm examples: camera on +Z).
 * Per-avatar {@link detectPortraitCameraZSign} overrides when exports differ.
 */
export const PORTRAIT_CAMERA_Z_SIGN = 1;

const _headPosScratch = new THREE.Vector3();
const _toCameraScratch = new THREE.Vector3();
const _faceForwardScratch = new THREE.Vector3();
const _camPosScratch = new THREE.Vector3();
const _quatScratch = new THREE.Quaternion();
const _leftEyeScratch = new THREE.Vector3();
const _rightEyeScratch = new THREE.Vector3();

/**
 * Horizontal face-forward from eye midpoint when available (photoreal VRM rigs
 * often disagree with head-bone +Z). Falls back to head bone +Z.
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} [humanoid]
 * @param {import('three').Vector3} [out]
 */
export function resolveFaceForwardHorizontal(headBone, humanoid, out = _faceForwardScratch) {
  if (!headBone) return null;
  headBone.updateWorldMatrix(true, false);
  headBone.getWorldPosition(_headPosScratch);

  const leftEye = humanoid?.getNormalizedBoneNode?.("leftEye");
  const rightEye = humanoid?.getNormalizedBoneNode?.("rightEye");
  if (leftEye && rightEye) {
    leftEye.getWorldPosition(_leftEyeScratch);
    rightEye.getWorldPosition(_rightEyeScratch);
    out
      .copy(_leftEyeScratch)
      .add(_rightEyeScratch)
      .multiplyScalar(0.5)
      .sub(_headPosScratch);
    out.y = 0;
    if (out.lengthSq() > 1e-5) {
      return out.normalize();
    }
  }

  headBone.getWorldQuaternion(_quatScratch);
  out.set(0, 0, 1).applyQuaternion(_quatScratch);
  out.y = 0;
  if (out.lengthSq() < 1e-6) return null;
  return out.normalize();
}

/**
 * Lower = camera sits more clearly in front of the visible face.
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').Vector3} cameraPosition
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} [humanoid]
 */
export function facingAlignmentScore(headBone, cameraPosition, humanoid) {
  if (!headBone || !cameraPosition) return 0;
  headBone.updateWorldMatrix(true, false);
  headBone.getWorldPosition(_headPosScratch);
  _toCameraScratch.subVectors(cameraPosition, _headPosScratch);
  _toCameraScratch.y = 0;
  if (_toCameraScratch.lengthSq() < 1e-6) return 0;
  _toCameraScratch.normalize();

  const faceForward = resolveFaceForwardHorizontal(headBone, humanoid);
  if (!faceForward) return 0;
  return faceForward.dot(_toCameraScratch);
}

/**
 * Pick +1 or -1 so the portrait camera sits in front of the avatar face.
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').Vector3} anchor
 * @param {number} portraitDist
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} [humanoid]
 */
export function detectPortraitCameraZSign(headBone, anchor, portraitDist, humanoid) {
  const dist = Math.max(portraitDist, PORTRAIT_DIST_MIN) * 1.04;

  const scoreForSign = (sign) => {
    _camPosScratch.set(anchor.x, anchor.y + 0.08, anchor.z + sign * dist);
    if (!headBone) return sign === PORTRAIT_CAMERA_Z_SIGN ? 1 : 0;
    return facingAlignmentScore(headBone, _camPosScratch, humanoid);
  };

  // More positive = face points toward that camera (front visible).
  return scoreForSign(1) >= scoreForSign(-1) ? 1 : -1;
}

/**
 * True when the camera sits in front of the face (not behind the head).
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').PerspectiveCamera} camera
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} [humanoid]
 */
export function isHeadFacingCamera(headBone, camera, humanoid) {
  if (!headBone || !camera) return true;
  return facingAlignmentScore(headBone, camera.position, humanoid) > 0.15;
}

/**
 * Pick 0 or Math.PI model yaw so the portrait camera sees the face, not the back.
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').PerspectiveCamera} camera
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} [humanoid]
 */
export function portraitModelYawOffset(headBone, camera, humanoid) {
  if (!headBone || !camera) return 0;
  const score = facingAlignmentScore(headBone, camera.position, humanoid);
  return score > 0.15 ? 0 : Math.PI;
}

/**
 * @param {number} fittedHeight
 */
export function portraitDistanceForHeight(fittedHeight) {
  const h = Math.max(fittedHeight, 0.001);
  return Math.max(PORTRAIT_DIST_MIN, h * PORTRAIT_DIST_FACTOR);
}

/**
 * @param {import('three').Box3} fitted
 * @param {import('three').Vector3 | null | undefined} headWorld
 * @param {import('three').Vector3} [out]
 */
export function computeUpperBodyAnchor(fitted, headWorld, out = new THREE.Vector3()) {
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const upperBodyY = fitted.min.y + fittedSize.y * UPPER_BODY_ANCHOR_RATIO;
  if (headWorld) {
    out.copy(headWorld);
    out.y = out.y * HEAD_ANCHOR_BLEND + upperBodyY * (1 - HEAD_ANCHOR_BLEND);
  } else {
    fitted.getCenter(out);
    out.y = upperBodyY;
  }
  return out;
}

/**
 * @param {{
 *   camera: import('three').PerspectiveCamera,
 *   controls: import('three').OrbitControls,
 *   anchor: import('three').Vector3,
 *   fittedHeight: number,
 * }} opts
 */
export function applyUpperBodyPortraitFrame(opts) {
  const portraitDist = portraitDistanceForHeight(opts.fittedHeight);
  const cameraZSign = opts.cameraZSign ?? PORTRAIT_CAMERA_Z_SIGN;
  opts.controls.target.copy(opts.anchor);
  opts.controls.target.y += 0.02;
  opts.camera.position.set(
    opts.anchor.x,
    opts.anchor.y + 0.08,
    opts.anchor.z + cameraZSign * portraitDist * 1.04,
  );
  opts.camera.fov = PORTRAIT_FOV;
  opts.camera.updateProjectionMatrix();
  opts.controls.minDistance = portraitDist * 0.82;
  opts.controls.maxDistance = portraitDist * 2.8;
  opts.controls.minPolarAngle = Math.PI * 0.42;
  opts.controls.maxPolarAngle = Math.PI * 0.52;
  opts.controls.update();
  return portraitDist;
}
