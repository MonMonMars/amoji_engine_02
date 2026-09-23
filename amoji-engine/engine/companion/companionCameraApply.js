/**
 * Apply auto-camera blend targets to OrbitControls + PerspectiveCamera.
 */
import * as THREE from "three";
import {
  PORTRAIT_CAMERA_Y_LIFT,
  PORTRAIT_CAMERA_Z_SIGN,
  PORTRAIT_FOV,
  PORTRAIT_TARGET_Y_LIFT,
  PORTRAIT_Z_DISTANCE_MUL,
  detectPortraitCameraZSign,
  facingAlignmentScore,
  modelBodyFacingScore,
  portraitDistanceForHeight,
  portraitVisibleFacingScore,
} from "./companionPortraitFraming.js";

export const COMPANION_CAMERA_APPLY_SCHEMA =
  "amoji.companionCameraApply.v7-visible-facing-score";

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
  const target = new THREE.Vector3(
    anchor.x,
    anchor.y + PORTRAIT_TARGET_Y_LIFT,
    anchor.z,
  );
  const position = new THREE.Vector3(
    anchor.x,
    anchor.y + PORTRAIT_CAMERA_Y_LIFT,
    anchor.z + cameraZSign * portraitDist * PORTRAIT_Z_DISTANCE_MUL,
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
  const dist = portraitDist * 0.98;
  const target = new THREE.Vector3(
    anchor.x,
    anchor.y + PORTRAIT_TARGET_Y_LIFT,
    anchor.z,
  );
  const position = new THREE.Vector3(
    anchor.x,
    anchor.y + PORTRAIT_CAMERA_Y_LIFT * 0.92,
    anchor.z + cameraZSign * dist * PORTRAIT_Z_DISTANCE_MUL,
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

/**
 * Apply a portrait shot to live OrbitControls + camera.
 * @param {import('three').OrbitControls} controls
 * @param {import('three').PerspectiveCamera} camera
 * @param {ReturnType<typeof buildPortraitShot>} shot
 * @param {{ portraitDist?: number }} [opts]
 */
export function applyPortraitShot(controls, camera, shot, opts = {}) {
  controls.target.copy(shot.target);
  camera.position.copy(shot.position);
  camera.fov = shot.fov;
  camera.updateProjectionMatrix();
  if (opts.portraitDist != null) {
    controls.minDistance = opts.portraitDist * 0.55;
    controls.maxDistance = opts.portraitDist * 3.4;
  }
  controls.update();
  return shot;
}

/**
 * Pick model yaw (+0 / +π) and camera Z sign so the portrait faces the user.
 * @param {{
 *   model?: import('three').Object3D | null,
 *   headBone?: import('three').Object3D | null,
 *   humanoid?: import('@pixiv/three-vrm').VRMHumanoid | null,
 *   anchor: import('three').Vector3,
 *   fittedHeight: number,
 *   baseFov?: number,
 * }} opts
 */
export function resolveFrontPortraitFrame(opts) {
  const anchor = opts.anchor;
  const fittedHeight = opts.fittedHeight;
  const baseFov = opts.baseFov ?? PORTRAIT_FOV;
  const portraitDist = portraitDistanceForHeight(fittedHeight);
  const model = opts.model;
  const headBone = opts.headBone;
  const humanoid = opts.humanoid;
  const baseYaw = model?.rotation?.y ?? 0;

  /** @type {{ score: number, yaw: number, zSign: number, shot: ReturnType<typeof buildPortraitShot>, portraitDist: number } | null} */
  let best = null;

  for (const yawAdd of [0, Math.PI]) {
    if (model) {
      model.rotation.y = baseYaw + yawAdd;
      model.updateMatrixWorld(true);
    }
    headBone?.updateMatrixWorld(true);
    const zSign = detectPortraitCameraZSign(
      headBone,
      anchor,
      portraitDist,
      humanoid,
      model,
    );
    for (const sign of [zSign, zSign === 1 ? -1 : 1]) {
      const shot = buildPortraitShot(anchor, portraitDist, baseFov, sign);
      const score = portraitVisibleFacingScore(
        headBone,
        shot.position,
        humanoid,
        model,
      );
      if (!best || score > best.score) {
        best = {
          score,
          yaw: baseYaw + yawAdd,
          zSign: sign,
          shot,
          portraitDist,
        };
      }
    }
  }

  if (model && best) {
    model.rotation.y = best.yaw;
    model.updateMatrixWorld(true);
    headBone?.updateMatrixWorld(true);

    const yawDelta = Math.atan2(
      Math.sin(best.yaw - baseYaw),
      Math.cos(best.yaw - baseYaw),
    );
    const yawNearBase = Math.abs(yawDelta) < 0.2;
    const backCameraOnDefaultPose =
      yawNearBase && best.zSign !== PORTRAIT_CAMERA_Z_SIGN;

    if (backCameraOnDefaultPose && headBone) {
      model.rotation.y = baseYaw + Math.PI;
      model.updateMatrixWorld(true);
      headBone.updateMatrixWorld(true);
      const zSign = detectPortraitCameraZSign(
        headBone,
        anchor,
        portraitDist,
        humanoid,
        model,
      );
      const shot = buildPortraitShot(anchor, portraitDist, baseFov, zSign);
      const score = portraitVisibleFacingScore(
        headBone,
        shot.position,
        humanoid,
        model,
      );
      if (score + 0.02 >= best.score) {
        best = { score, yaw: baseYaw + Math.PI, zSign, shot, portraitDist };
      } else {
        model.rotation.y = best.yaw;
        model.updateMatrixWorld(true);
      }
    }
  }

  if (best && best.score < 0.12 && model && headBone) {
    model.rotation.y = baseYaw + Math.PI;
    model.updateMatrixWorld(true);
    headBone.updateMatrixWorld(true);
    const zSign = detectPortraitCameraZSign(
      headBone,
      anchor,
      portraitDist,
      humanoid,
      model,
    );
    const shot = buildPortraitShot(anchor, portraitDist, baseFov, zSign);
    const score = portraitVisibleFacingScore(
      headBone,
      shot.position,
      humanoid,
      model,
    );
    if (score > best.score) {
      best = { score, yaw: baseYaw + Math.PI, zSign, shot, portraitDist };
    } else {
      model.rotation.y = best.yaw;
      model.updateMatrixWorld(true);
    }
  }

  return (
    best ?? {
      score: 0,
      yaw: baseYaw,
      zSign: PORTRAIT_CAMERA_Z_SIGN,
      shot: buildPortraitShot(anchor, portraitDist, baseFov),
      portraitDist,
    }
  );
}
