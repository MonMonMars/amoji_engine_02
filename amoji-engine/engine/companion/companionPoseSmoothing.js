/**
 * Pose interpolation — damped channels so idle beats and action transitions read smoothly.
 */
import { POSE_LIMB_BLEND_KEYS } from "./companionPoseLibrary.js";

export const COMPANION_POSE_SMOOTHING_SCHEMA = "amoji.companionPoseSmoothing.v2-limb-snap";

const LIMB_BLEND_KEY_SET = new Set(POSE_LIMB_BLEND_KEYS);

/**
 * Abstract pose channels → normalized humanoid bones in companionBodyMotion.
 * Each scalar is one primary rotation axis on a bone chain (full 3-DOF per bone
 * is handled by rest rotations + these deltas, or by VRMA clips).
 */
export const POSE_CHANNELS = Object.freeze([
  "headX",
  "headY",
  "headZ",
  "leanY",
  "spineX",
  "spineZ",
  "chestX",
  "chestY",
  "hipZ",
  "shoulderL",
  "shoulderR",
  "armLiftL",
  "armLiftR",
  "forearmL",
  "forearmR",
  "handWaveL",
  "handWaveR",
  "upperLegL",
  "upperLegR",
  "lowerLegL",
  "lowerLegR",
  "eatChew",
]);

/**
 * @param {number} t 0..1
 */
export function easeInOutSine(t) {
  const p = Math.max(0, Math.min(1, t));
  return -(Math.cos(Math.PI * p) - 1) / 2;
}

/**
 * @param {number} t 0..1
 */
export function easeInOutCubic(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

/**
 * Fade envelope for micro-gestures (soft attack + release).
 * @param {number} phase 0..1 within beat
 */
export function idleBeatEnvelope(phase) {
  const p = Math.max(0, Math.min(1, phase));
  const attack = easeInOutSine(Math.min(1, p / 0.22));
  const release = easeInOutSine(Math.min(1, (1 - p) / 0.28));
  return Math.min(attack, release);
}

/**
 * Exponential damping toward a target pose.
 * @param {Record<string, number>} current
 * @param {Record<string, number>} target
 * @param {number} dt seconds
 * @param {number} [rate] higher = snappier
 * @param {{ snapLimbs?: boolean }} [opts]
 */
export function dampPose(current, target, dt, rate = 11, opts = {}) {
  const k = 1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));
  const limbRate = rate * 1.45;
  const limbK = 1 - Math.exp(-Math.max(0, limbRate) * Math.max(0, dt));
  const snapLimbs = opts.snapLimbs === true;
  /** @type {Record<string, number>} */
  const out = { ...current };
  for (const key of POSE_CHANNELS) {
    const a = Number(current[key] ?? 0);
    const hasTarget = Object.prototype.hasOwnProperty.call(target, key);
    const b = hasTarget
      ? Number(target[key] ?? 0)
      : LIMB_BLEND_KEY_SET.has(key)
        ? 0
        : a;
    if (snapLimbs && LIMB_BLEND_KEY_SET.has(key)) {
      out[key] = b;
      continue;
    }
    const blendK = LIMB_BLEND_KEY_SET.has(key) ? limbK : k;
    out[key] = a + (b - a) * blendK;
  }
  return out;
}

/**
 * @param {{ y?: number, rotY?: number }} current
 * @param {{ y?: number, rotY?: number }} target
 * @param {number} dt
 * @param {number} [rate]
 */
export function dampRootMotion(current, target, dt, rate = 9) {
  const k = 1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));
  const ay = Number(current.y ?? 0);
  const by = Number(target.y ?? 0);
  const ar = Number(current.rotY ?? 0);
  const br = Number(target.rotY ?? 0);
  return {
    y: ay + (by - ay) * k,
    rotY: ar + (br - ar) * k,
  };
}

/**
 * Pick damping rate — scripted actions stay responsive; idle stays soft.
 * @param {boolean} actionActive
 * @param {boolean} talking
 */
export function poseDampingRate(actionActive, talking) {
  if (actionActive) return 12.8;
  if (talking) return 13.8;
  return 15.4;
}

/**
 * Smooth action enter/exit envelope (0..1).
 * @param {number} elapsedSec
 * @param {number} durationSec
 * @param {number} fadeInSec
 * @param {number} fadeOutSec
 * @param {boolean} loop
 */
export function actionMotionEnvelope(
  elapsedSec,
  durationSec,
  fadeInSec = 0.42,
  fadeOutSec = 0.48,
  loop = false,
) {
  const fadeIn = easeInOutCubic(Math.min(1, Math.max(0, elapsedSec) / fadeInSec));
  const fadeOut = loop
    ? 1
    : easeInOutCubic(
        Math.min(1, Math.max(0, (durationSec - elapsedSec) / fadeOutSec)),
      );
  return Math.min(fadeIn, fadeOut);
}
