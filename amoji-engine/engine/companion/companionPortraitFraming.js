/**
 * Shared default portrait / upper-body camera framing for VRM + GLTF avatars.
 */
import * as THREE from "three";

export const COMPANION_PORTRAIT_FRAMING_SCHEMA =
  "amoji.companionPortraitFraming.v9-body-head-facing";

/** Fallback lower-neck height when no head bone (ratio from feet to head). */
export const UPPER_BODY_ANCHOR_RATIO = 0.84;
/** Drop below head bone toward lower neck when only head is available (× fitted body height). */
export const NECK_ANCHOR_HEAD_DROP = 0.115;
/** @deprecated Use {@link NECK_ANCHOR_HEAD_DROP}. */
export const MOUTH_ANCHOR_HEAD_DROP = NECK_ANCHOR_HEAD_DROP;
/** Legacy chest blend — unused when head bone is present. */
export const HEAD_ANCHOR_BLEND = 0.16;

/** Portrait FOV — head + shoulders + torso, legs cropped below waist. */
export const PORTRAIT_FOV = 34;

/** Camera distance ≈ factor × character height — default is pulled back, not face close-up. */
export const PORTRAIT_DIST_FACTOR = 1.82;
export const PORTRAIT_DIST_MIN = 1.55;
/** Extra Z pullback applied to portrait shots (buildPortraitShot / initial frame). */
export const PORTRAIT_Z_DISTANCE_MUL = 1.18;
/** Camera sits above the orbit anchor (eye-level, not upward from the waist). */
export const PORTRAIT_CAMERA_Y_LIFT = 0.22;
/** Orbit target nudge above anchor (keeps face in frame when pivot is at lower neck). */
export const PORTRAIT_TARGET_Y_LIFT = 0.04;

/**
 * User orbit polar range (radians from +Y). Tight clamps (~18°) made the
 * model feel locked; keep a floor so the camera cannot pass through the ground.
 */
export const ORBIT_MIN_POLAR = 0.18;
export const ORBIT_MAX_POLAR = Math.PI * 0.85;

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
    leftEye.updateWorldMatrix(true, false);
    rightEye.updateWorldMatrix(true, false);
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
 * VRM models face +Z in bind pose; root yaw rotates this horizontal forward.
 * @param {import('three').Object3D | null | undefined} model
 * @param {import('three').Vector3} [out]
 */
export function modelBodyForwardHorizontal(model, out = _faceForwardScratch) {
  if (!model) return null;
  model.updateWorldMatrix(true, false);
  out.set(0, 0, 1).transformDirection(model.matrixWorld);
  out.y = 0;
  if (out.lengthSq() < 1e-6) return null;
  return out.normalize();
}

/**
 * @param {import('three').Object3D | null | undefined} model
 * @param {import('three').Vector3} cameraPosition
 */
export function modelBodyFacingScore(model, cameraPosition) {
  if (!model || !cameraPosition) return 0;
  const forward = modelBodyForwardHorizontal(model);
  if (!forward) return 0;
  model.getWorldPosition(_headPosScratch);
  _toCameraScratch.subVectors(cameraPosition, _headPosScratch);
  _toCameraScratch.y = 0;
  if (_toCameraScratch.lengthSq() < 1e-6) return 0;
  _toCameraScratch.normalize();
  return forward.dot(_toCameraScratch);
}

/**
 * True when the avatar root (+Z bind forward) points toward the camera.
 * @param {import('three').Object3D | null | undefined} model
 * @param {import('three').PerspectiveCamera | { position: import('three').Vector3 }} camera
 */
export function isModelBodyFacingCamera(model, camera) {
  if (!model || !camera?.position) return true;
  return modelBodyFacingScore(model, camera.position) > 0.12;
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
export function detectPortraitCameraZSign(
  headBone,
  anchor,
  portraitDist,
  humanoid,
  model = null,
) {
  const dist = Math.max(portraitDist, PORTRAIT_DIST_MIN) * PORTRAIT_Z_DISTANCE_MUL;

  const scoreForSign = (sign) => {
    _camPosScratch.set(
      anchor.x,
      anchor.y + PORTRAIT_CAMERA_Y_LIFT,
      anchor.z + sign * dist,
    );
    if (!headBone && !model) {
      return sign === PORTRAIT_CAMERA_Z_SIGN ? 1 : 0;
    }
    return portraitVisibleFacingScore(
      headBone,
      _camPosScratch,
      humanoid,
      model,
    );
  };

  // More positive = face points toward that camera (front visible).
  return scoreForSign(1) >= scoreForSign(-1) ? 1 : -1;
}

/**
 * Visible portrait facing: prefer eye/head forward; fall back to root +Z when no head.
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').Vector3} cameraPosition
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} [humanoid]
 * @param {import('three').Object3D | null | undefined} [model]
 */
export function portraitVisibleFacingScore(headBone, cameraPosition, humanoid, model) {
  if (!cameraPosition) return 0;
  const body = model ? modelBodyFacingScore(model, cameraPosition) : 0;
  if (!headBone) return body;
  const head = facingAlignmentScore(headBone, cameraPosition, humanoid);
  if (!model) return head;
  if (head * body < 0) {
    if (body > 0.15 && head < -0.05) return body;
    if (head > 0.15 && body < -0.05) return head;
    return Math.abs(head) >= Math.abs(body) ? head : body;
  }
  // Normalized head +Z often disagrees with visible mesh on roster VRMs.
  if (head < 0.06 && body > head + 0.18) return body;
  if (body < 0.06 && head > body + 0.18) return head;
  if (head < 0 && body < 0) return Math.max(head, body);
  return Math.max(head, body * 0.88);
}

/**
 * True when the camera sits in front of the face (not behind the head).
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').PerspectiveCamera} camera
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} [humanoid]
 */
export function isHeadFacingCamera(headBone, camera, humanoid, model) {
  if (!camera) return true;
  if (!headBone && !model) return true;
  return portraitVisibleFacingScore(headBone, camera.position, humanoid, model) > 0.15;
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
 * One-shot yaw fix when the visible face points away from the camera.
 * @param {import('three').Object3D | null | undefined} model
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').PerspectiveCamera | null | undefined} camera
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} [humanoid]
 * @param {number} [minScore]
 */
export function normalizeModelYaw(model) {
  if (!model) return 0;
  model.rotation.y = Math.atan2(
    Math.sin(model.rotation.y),
    Math.cos(model.rotation.y),
  );
  return model.rotation.y;
}

export function correctPortraitModelYaw(model, headBone, camera, humanoid, minScore = 0.12) {
  if (!model || !camera) return false;

  const score = portraitVisibleFacingScore(
    headBone,
    camera.position,
    humanoid,
    model,
  );
  if (score >= minScore) return false;

  model.rotation.y += Math.PI;
  normalizeModelYaw(model);
  model.updateMatrixWorld(true);
  headBone?.updateMatrixWorld(true);
  return true;
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
  const neckFallbackY = fitted.min.y + fittedSize.y * UPPER_BODY_ANCHOR_RATIO;
  if (headWorld) {
    out.copy(headWorld);
    out.y -= fittedSize.y * NECK_ANCHOR_HEAD_DROP;
  } else {
    fitted.getCenter(out);
    out.y = neckFallbackY;
  }
  return out;
}

/**
 * Allow drag-orbit around the companion (yaw + pitch + pinch zoom).
 * @param {import('three').OrbitControls} controls
 */
export function applyUserOrbitLimits(controls) {
  if (!controls) return controls;
  controls.minPolarAngle = ORBIT_MIN_POLAR;
  controls.maxPolarAngle = ORBIT_MAX_POLAR;
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.enablePan = false;
  return controls;
}

/**
 * @param {{
 *   camera: import('three').PerspectiveCamera,
 *   controls: import('three').OrbitControls,
 *   anchor: import('three').Vector3,
 *   fittedHeight: number,
 *   cameraZSign?: number,
 * }} opts
 */
export function applyUpperBodyPortraitFrame(opts) {
  const portraitDist = portraitDistanceForHeight(opts.fittedHeight);
  const cameraZSign = opts.cameraZSign ?? PORTRAIT_CAMERA_Z_SIGN;
  opts.controls.target.copy(opts.anchor);
  opts.controls.target.y += PORTRAIT_TARGET_Y_LIFT;
  opts.camera.position.set(
    opts.anchor.x,
    opts.anchor.y + PORTRAIT_CAMERA_Y_LIFT,
    opts.anchor.z + cameraZSign * portraitDist * PORTRAIT_Z_DISTANCE_MUL,
  );
  opts.camera.fov = PORTRAIT_FOV;
  opts.camera.updateProjectionMatrix();
  opts.controls.minDistance = portraitDist * 0.55;
  opts.controls.maxDistance = portraitDist * 3.4;
  applyUserOrbitLimits(opts.controls);
  opts.controls.update();
  return portraitDist;
}
