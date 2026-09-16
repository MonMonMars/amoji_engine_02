/**
 * Pose interpolation — damped channels so idle beats and action transitions read smoothly.
 */

export const COMPANION_POSE_SMOOTHING_SCHEMA = "amoji.companionPoseSmoothing.v1";

/** Channels merged into VRM body motion each frame. */
export const POSE_CHANNELS = Object.freeze([
  "headX",
  "headZ",
  "leanY",
  "spineX",
  "chestX",
  "hipZ",
  "armLiftL",
  "armLiftR",
  "forearmL",
  "forearmR",
  "upperLegL",
  "upperLegR",
  "lowerLegL",
  "lowerLegR",
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
 */
export function dampPose(current, target, dt, rate = 11) {
  const k = 1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));
  /** @type {Record<string, number>} */
  const out = { ...current };
  for (const key of POSE_CHANNELS) {
    const a = Number(current[key] ?? 0);
    const b = Number(target[key] ?? a);
    out[key] = a + (b - a) * k;
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
  if (actionActive) return 13.5;
  if (talking) return 14.5;
  return 10.8;
}
