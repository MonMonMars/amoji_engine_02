/**
 * Apply auto-camera blend targets to OrbitControls + PerspectiveCamera.
 */
import * as THREE from "three";
import { PORTRAIT_CAMERA_Z_SIGN } from "./companionPortraitFraming.js";

export const COMPANION_CAMERA_APPLY_SCHEMA = "amoji.companionCameraApply.v2";

/** Auto follow while talking / full-body moves (~4.2/s). */
export const AUTO_CAMERA_LERP_RATE = 4.2;

/** Explicit portrait reset — 10× gentler than auto follow. */
export const CAMERA_RESET_LERP_RATE = AUTO_CAMERA_LERP_RATE / 10;

/**
 * @param {import('three').Vector3} anchor
 * @param {number} portraitDist
 * @param {number} baseFov
 */
export function buildPortraitShot(anchor, portraitDist, baseFov, cameraZSign = PORTRAIT_CAMERA_Z_SIGN) {
  const target = new THREE.Vector3(anchor.x, anchor.y + 0.02, anchor.z);
  const position = new THREE.Vector3(
    anchor.x,
    anchor.y + 0.08,
    anchor.z + cameraZSign * portraitDist * 1.08,
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
export function buildTalkCloseShot(anchor, portraitDist, baseFov, cameraZSign = PORTRAIT_CAMERA_Z_SIGN) {
  const dist = portraitDist * 0.96;
  const target = new THREE.Vector3(anchor.x, anchor.y + 0.06, anchor.z);
  const position = new THREE.Vector3(
    anchor.x,
    anchor.y + 0.05,
    anchor.z + cameraZSign * dist,
  );
  return {
    target,
    position,
    fov: baseFov - 2,
    distance: dist,
  };
}

/**
 * @param {import('three').Vector3} anchor
 * @param {number} portraitDist
 * @param {number} baseFov
 */
export function buildFullBodyShot(anchor, portraitDist, baseFov, cameraZSign = PORTRAIT_CAMERA_Z_SIGN) {
  const dist = portraitDist * 1.68;
  const target = new THREE.Vector3(anchor.x, anchor.y - 0.36, anchor.z);
  const position = new THREE.Vector3(
    anchor.x,
    anchor.y - 0.12,
    anchor.z + cameraZSign * dist,
  );
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
  cameraZSign = PORTRAIT_CAMERA_Z_SIGN,
) {
  const portrait = buildPortraitShot(anchor, portraitDist, baseFov, cameraZSign);
  const talkClose = buildTalkCloseShot(anchor, portraitDist, baseFov, cameraZSign);
  const fullBody = buildFullBodyShot(anchor, portraitDist, baseFov, cameraZSign);
  const desired = blendCameraShots(portrait, talkClose, fullBody, blends);

  const rate = Math.min(
    1,
    dt *
      (blends.fullBodyBlend > 0.05
        ? AUTO_CAMERA_LERP_RATE + 1.3
        : AUTO_CAMERA_LERP_RATE),
  );
  controls.target.lerp(desired.target, rate);
  camera.position.lerp(desired.position, rate);
  camera.fov += (desired.fov - camera.fov) * rate;
  camera.updateProjectionMatrix();
  controls.update();
  return desired;
}

/**
 * Smoothly glide camera back to a stored portrait shot (reset view).
 * @param {import('three').OrbitControls} controls
 * @param {import('three').PerspectiveCamera} camera
 * @param {{
 *   target: import('three').Vector3,
 *   position: import('three').Vector3,
 *   fov: number,
 * }} desired
 * @param {number} dt
 * @param {number} [ratePerSec]
 */
export function lerpCameraTowardShot(
  controls,
  camera,
  desired,
  dt,
  ratePerSec = CAMERA_RESET_LERP_RATE,
) {
  const rate = Math.min(1, Math.max(0, dt) * ratePerSec);
  controls.target.lerp(desired.target, rate);
  camera.position.lerp(desired.position, rate);
  camera.fov += (desired.fov - camera.fov) * rate;
  camera.updateProjectionMatrix();
  controls.update();
  const posDelta = camera.position.distanceTo(desired.position);
  const targetDelta = controls.target.distanceTo(desired.target);
  const fovDelta = Math.abs(camera.fov - desired.fov);
  return posDelta < 0.004 && targetDelta < 0.004 && fovDelta < 0.08;
}
