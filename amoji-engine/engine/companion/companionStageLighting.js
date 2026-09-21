/**
 * Stage lighting — keep the avatar evenly lit while the user orbits the camera.
 */
import * as THREE from "three";

export const COMPANION_STAGE_LIGHTING_SCHEMA = "amoji.companionStageLighting.v1";

export const INDOOR_LIGHT_EXPOSURE = 1.12;
export const OUTDOOR_LIGHT_EXPOSURE = 1.18;
export const DARK_BG_LIGHT_EXPOSURE = 1.3;

const _camDir = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _offset = new THREE.Vector3();

/** Backgrounds that need extra fill so the model does not look suddenly dark. */
export const DARK_SCENE_BACKGROUND_IDS = new Set([
  "minimal",
  "night-city",
  "aurora",
  "library",
  "observatory",
  "executive-lounge",
]);

/**
 * @param {"indoor" | "outdoor"} [environment]
 * @param {string | null | undefined} [backgroundId]
 */
export function rendererExposureForScene(environment = "indoor", backgroundId = null) {
  const bg = String(backgroundId || "").toLowerCase();
  if (DARK_SCENE_BACKGROUND_IDS.has(bg)) return DARK_BG_LIGHT_EXPOSURE;
  return environment === "outdoor" ? OUTDOOR_LIGHT_EXPOSURE : INDOOR_LIGHT_EXPOSURE;
}

/**
 * @param {"indoor" | "outdoor"} [environment]
 * @param {string | null | undefined} [backgroundId]
 */
export function hemisphereIntensityForScene(environment = "indoor", backgroundId = null) {
  const bg = String(backgroundId || "").toLowerCase();
  if (DARK_SCENE_BACKGROUND_IDS.has(bg)) return 1.28;
  return environment === "outdoor" ? 1.12 : 1.05;
}

/**
 * Reposition key / fill / rim / face lights relative to camera so orbit never backlights the model.
 * @param {{
 *   camera: import('three').PerspectiveCamera,
 *   anchor: import('three').Vector3,
 *   key: import('three').DirectionalLight,
 *   fill: import('three').DirectionalLight,
 *   rim: import('three').DirectionalLight,
 *   faceLight: import('three').PointLight,
 *   portraitCameraZSign?: number,
 * }} opts
 */
export function syncCameraRelativeStageLights(opts) {
  const { camera, anchor, key, fill, rim, faceLight } = opts;
  const zSign = opts.portraitCameraZSign ?? 1;

  _camDir.subVectors(camera.position, anchor);
  _camDir.y *= 0.42;
  if (_camDir.lengthSq() < 1e-6) {
    _camDir.set(0, 0, zSign);
  } else {
    _camDir.normalize();
  }
  _camRight.crossVectors(_up, _camDir).normalize();

  _offset
    .copy(anchor)
    .addScaledVector(_camDir, 3.4)
    .addScaledVector(_up, 3.6);
  key.position.copy(_offset);

  _offset
    .copy(anchor)
    .addScaledVector(_camDir, 2.2)
    .addScaledVector(_camRight, -1.5)
    .addScaledVector(_up, 1.6);
  fill.position.copy(_offset);

  _offset
    .copy(anchor)
    .addScaledVector(_camDir, -2.6)
    .addScaledVector(_up, 2.4)
    .addScaledVector(_camRight, 1.6);
  rim.position.copy(_offset);

  _offset.copy(anchor).addScaledVector(_camDir, 1.35).addScaledVector(_up, 0.42);
  faceLight.position.copy(_offset);
}
