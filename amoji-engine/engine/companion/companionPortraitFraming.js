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

/**
 * Pick +1 or -1 so the portrait camera sits in front of the avatar face.
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').Vector3} anchor
 * @param {number} portraitDist
 */
export function detectPortraitCameraZSign(headBone, anchor, portraitDist) {
  const dist = Math.max(portraitDist, PORTRAIT_DIST_MIN) * 1.04;

  const scoreForSign = (sign) => {
    const camPos = new THREE.Vector3(
      anchor.x,
      anchor.y + 0.08,
      anchor.z + sign * dist,
    );
    if (!headBone) return sign === PORTRAIT_CAMERA_Z_SIGN ? 1 : 0;

    headBone.updateWorldMatrix(true, false);
    const headPos = new THREE.Vector3();
    headBone.getWorldPosition(headPos);
    const toCamera = new THREE.Vector3().subVectors(camPos, headPos);
    toCamera.y = 0;
    if (toCamera.lengthSq() < 1e-6) return 0;
    toCamera.normalize();

    const q = new THREE.Quaternion();
    headBone.getWorldQuaternion(q);
    const faceForward = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    faceForward.y = 0;
    if (faceForward.lengthSq() < 1e-6) return 0;
    faceForward.normalize();
    return faceForward.dot(toCamera);
  };

  // More negative = VRM +Z face points toward that camera (front visible).
  return scoreForSign(1) <= scoreForSign(-1) ? 1 : -1;
}

/**
 * True when the camera sits in front of the face (not behind the head).
 * @param {import('three').Object3D | null | undefined} headBone
 * @param {import('three').PerspectiveCamera} camera
 */
export function isHeadFacingCamera(headBone, camera) {
  if (!headBone || !camera) return true;
  headBone.updateWorldMatrix(true, false);
  const headPos = new THREE.Vector3();
  headBone.getWorldPosition(headPos);
  const toCamera = new THREE.Vector3().subVectors(camera.position, headPos);
  toCamera.y = 0;
  if (toCamera.lengthSq() < 1e-6) return true;
  toCamera.normalize();

  const q = new THREE.Quaternion();
  headBone.getWorldQuaternion(q);
  const faceForward = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  faceForward.y = 0;
  if (faceForward.lengthSq() < 1e-6) return true;
  faceForward.normalize();
  return faceForward.dot(toCamera) < -0.15;
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
