/**
 * Apply auto-camera blend targets to OrbitControls + PerspectiveCamera.
 */
import * as THREE from "three";

export const COMPANION_CAMERA_APPLY_SCHEMA = "amoji.companionCameraApply.v1";

/**
 * @param {import('three').Vector3} anchor
 * @param {number} portraitDist
 * @param {number} baseFov
 */
export function buildPortraitShot(anchor, portraitDist, baseFov) {
  const target = new THREE.Vector3(anchor.x, anchor.y + 0.04, anchor.z);
  const position = new THREE.Vector3(
    anchor.x,
    anchor.y + 0.04,
    anchor.z + portraitDist,
  );
  return {
    target,
    position,
    fov: baseFov,
    distance: portraitDist,
  };
}

/**
 * @param {import('three').Vector3} anchor
 * @param {number} portraitDist
 * @param {number} baseFov
 */
export function buildTalkCloseShot(anchor, portraitDist, baseFov) {
  const dist = portraitDist * 0.78;
  const target = new THREE.Vector3(anchor.x, anchor.y + 0.12, anchor.z);
  const position = new THREE.Vector3(anchor.x, anchor.y + 0.1, anchor.z + dist);
  return {
    target,
    position,
    fov: baseFov - 4,
    distance: dist,
  };
}

/**
 * @param {import('three').Vector3} anchor
 * @param {number} portraitDist
 * @param {number} baseFov
 */
export function buildFullBodyShot(anchor, portraitDist, baseFov) {
  const dist = portraitDist * 1.68;
  const target = new THREE.Vector3(anchor.x, anchor.y - 0.36, anchor.z);
  const position = new THREE.Vector3(anchor.x, anchor.y - 0.12, anchor.z + dist);
  return {
    target,
    position,
    fov: baseFov + 14,
    distance: dist,
  };
}

/**
 * @param {{
 *   target: import('three').Vector3,
 *   position: import('three').Vector3,
 *   fov: number,
 * }} portrait
 * @param {{
 *   target: import('three').Vector3,
 *   position: import('three').Vector3,
 *   fov: number,
 * }} talkClose
 * @param {{
 *   target: import('three').Vector3,
 *   position: import('three').Vector3,
 *   fov: number,
 * }} fullBody
 * @param {{ talkCloseBlend?: number, fullBodyBlend?: number }} blends
 */
export function blendCameraShots(portrait, talkClose, fullBody, blends) {
  const fb = Math.max(0, Math.min(1, blends.fullBodyBlend ?? 0));
  const tc =
    Math.max(0, Math.min(1, blends.talkCloseBlend ?? 0)) * (1 - fb);
  const baseW = Math.max(0, 1 - fb - tc);

  const target = new THREE.Vector3();
  const position = new THREE.Vector3();
  target
    .copy(portrait.target)
    .multiplyScalar(baseW)
    .addScaledVector(talkClose.target, tc)
    .addScaledVector(fullBody.target, fb);
  position
    .copy(portrait.position)
    .multiplyScalar(baseW)
    .addScaledVector(talkClose.position, tc)
    .addScaledVector(fullBody.position, fb);

  return {
    target,
    position,
    fov: portrait.fov * baseW + talkClose.fov * tc + fullBody.fov * fb,
    distance:
      (portrait.position.distanceTo(portrait.target) || 0) * baseW +
      (talkClose.position.distanceTo(talkClose.target) || 0) * tc +
      (fullBody.position.distanceTo(fullBody.target) || 0) * fb,
  };
}

/**
 * Smoothly move camera toward blended auto shot (does not override user orbit).
 * @param {import('three').OrbitControls} controls
 * @param {import('three').PerspectiveCamera} camera
 * @param {import('three').Vector3} anchor
 * @param {number} portraitDist
 * @param {{ talkCloseBlend: number, fullBodyBlend: number }} blends
 * @param {number} dt
 * @param {number} [baseFov]
 */
export function applyAutoCameraFrame(
  controls,
  camera,
  anchor,
  portraitDist,
  blends,
  dt,
  baseFov = 34,
) {
  const portrait = buildPortraitShot(anchor, portraitDist, baseFov);
  const talkClose = buildTalkCloseShot(anchor, portraitDist, baseFov);
  const fullBody = buildFullBodyShot(anchor, portraitDist, baseFov);
  const desired = blendCameraShots(portrait, talkClose, fullBody, blends);

  const rate = Math.min(1, dt * (blends.fullBodyBlend > 0.05 ? 5.5 : 4.2));
  controls.target.lerp(desired.target, rate);
  camera.position.lerp(desired.position, rate);
  camera.fov += (desired.fov - camera.fov) * rate;
  camera.updateProjectionMatrix();
  controls.update();
  return desired;
}
