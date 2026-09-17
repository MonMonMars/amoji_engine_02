/**
 * Rest curl for VRM finger bones so hands are not sticks.
 *
 * Always drive the **normalized** humanoid on Z. three-vrm maps that onto
 * Mixamo `LeftHandIndex1` (raw X) and VRoid `J_Bip_L_Index1` (raw Z).
 * Writing the same Euler onto raw Mixamo bones twists fingers along their
 * length — they look straight. Do not copy normalized Euler onto raw.
 */

export const COMPANION_FINGER_POSE_SCHEMA = "amoji.companionFingerPose.v3";

const LEFT_CURL_Z = 0.62;
const RIGHT_CURL_Z = -0.62;
const MID_CURL = 0.82;
const TIP_CURL = 0.55;

/**
 * @param {number} z
 * @param {number} [mid]
 * @param {number} [tip]
 */
function digit(z, mid = MID_CURL, tip = TIP_CURL) {
  return {
    proximal: { x: 0.02, y: 0, z },
    intermediate: { x: 0.01, y: 0, z: Math.sign(z) * mid },
    distal: { x: 0.01, y: 0, z: Math.sign(z) * tip },
  };
}

const LEFT = digit(LEFT_CURL_Z);
const RIGHT = digit(RIGHT_CURL_Z);

export const VRM_FINGER_REST_ROTATIONS = Object.freeze({
  leftThumbMetacarpal: { x: 0.12, y: 0.38, z: 0.18 },
  leftThumbProximal: { x: 0.18, y: 0.22, z: 0.16 },
  leftThumbDistal: { x: 0.16, y: 0.08, z: 0.14 },
  leftIndexProximal: LEFT.proximal,
  leftIndexIntermediate: LEFT.intermediate,
  leftIndexDistal: LEFT.distal,
  leftMiddleProximal: { ...LEFT.proximal, z: LEFT_CURL_Z + 0.05 },
  leftMiddleIntermediate: LEFT.intermediate,
  leftMiddleDistal: LEFT.distal,
  leftRingProximal: { ...LEFT.proximal, z: LEFT_CURL_Z + 0.08 },
  leftRingIntermediate: LEFT.intermediate,
  leftRingDistal: LEFT.distal,
  leftLittleProximal: { ...LEFT.proximal, z: LEFT_CURL_Z + 0.12 },
  leftLittleIntermediate: LEFT.intermediate,
  leftLittleDistal: LEFT.distal,
  rightThumbMetacarpal: { x: 0.12, y: -0.38, z: -0.18 },
  rightThumbProximal: { x: 0.18, y: -0.22, z: -0.16 },
  rightThumbDistal: { x: 0.16, y: -0.08, z: -0.14 },
  rightIndexProximal: RIGHT.proximal,
  rightIndexIntermediate: RIGHT.intermediate,
  rightIndexDistal: RIGHT.distal,
  rightMiddleProximal: { ...RIGHT.proximal, z: RIGHT_CURL_Z - 0.05 },
  rightMiddleIntermediate: RIGHT.intermediate,
  rightMiddleDistal: RIGHT.distal,
  rightRingProximal: { ...RIGHT.proximal, z: RIGHT_CURL_Z - 0.08 },
  rightRingIntermediate: RIGHT.intermediate,
  rightRingDistal: RIGHT.distal,
  rightLittleProximal: { ...RIGHT.proximal, z: RIGHT_CURL_Z - 0.12 },
  rightLittleIntermediate: RIGHT.intermediate,
  rightLittleDistal: RIGHT.distal,
});

export const VRM_FINGER_BONE_NAMES = Object.freeze(
  Object.keys(VRM_FINGER_REST_ROTATIONS),
);

const FINGER_STRAIGHT_PROBE_NAMES = Object.freeze([
  "leftIndexProximal",
  "leftMiddleProximal",
  "rightIndexProximal",
  "rightMiddleProximal",
]);

/**
 * Normalized VRM fingers always flex on Z. Raw Mixamo names still map
 * through humanoid.update — do not switch the normalized axis to X.
 * @param {unknown} [_humanoid]
 * @returns {"z"}
 */
export function inferFingerFlexAxis(_humanoid) {
  return "z";
}

/**
 * Tiny breath so idle fingers are not frozen.
 * @param {number} [elapsedSec]
 * @param {number} [talkBlend]
 */
export function fingerIdleWiggle(elapsedSec = 0, talkBlend = 0) {
  const t = Number(elapsedSec) || 0;
  const breath = 0.5 + 0.5 * Math.sin(t * 1.55);
  const fidget = 0.5 + 0.5 * Math.sin(t * 2.4 + 0.7);
  return 0.04 + breath * 0.07 + fidget * 0.03 + Math.max(0, Math.min(1, talkBlend)) * 0.05;
}

/**
 * Extra curl while talking so fingers aren't frozen.
 * @param {number} [talkBlend]
 */
export function fingerTalkCurlBoost(talkBlend = 0) {
  return 0.1 + Math.max(0, Math.min(1, talkBlend)) * 0.16;
}

/**
 * Average |Z| curl on index/middle — near zero means Mixamo stick-straight fingers.
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {number} [threshold]
 */
export function fingersLookStraight(humanoid, threshold = 0.14) {
  if (!humanoid?.getNormalizedBoneNode) return true;
  let sum = 0;
  let count = 0;
  for (const name of FINGER_STRAIGHT_PROBE_NAMES) {
    const bone = humanoid.getNormalizedBoneNode(name);
    if (!bone?.rotation) continue;
    sum += Math.abs(Number(bone.rotation.z) || 0);
    count += 1;
  }
  if (!count) return true;
  return sum / count < threshold;
}

/**
 * @param {(name: string, rot: { x: number, y: number, z: number }) => void} applyBone
 * @param {{ talkBlend?: number, flexAxis?: "x" | "z", elapsedSec?: number, blendWeight?: number, readRotation?: (name: string) => { x: number, y: number, z: number } | null }} [opts]
 */
export function applyFingerRestPose(applyBone, opts = {}) {
  if (typeof applyBone !== "function") return 0;
  const flexAxis = opts.flexAxis === "x" ? "x" : "z";
  const weight = Math.max(0, Math.min(1, Number(opts.blendWeight ?? 1)));
  const boost = fingerTalkCurlBoost(opts.talkBlend);
  const wiggle = fingerIdleWiggle(opts.elapsedSec, opts.talkBlend);
  let applied = 0;
  for (const name of VRM_FINGER_BONE_NAMES) {
    const rest = VRM_FINGER_REST_ROTATIONS[name];
    const sign = name.startsWith("right") ? -1 : 1;
    const extra =
      sign * (name.includes("Thumb") ? (boost + wiggle) * 0.45 : boost + wiggle);
    /** @type {{ x: number, y: number, z: number }} */
    let target;
    if (flexAxis === "x") {
      const curl = Math.abs(rest.z) + Math.abs(extra);
      target = {
        x: rest.x + curl,
        y: rest.y,
        z: rest.z * 0.08,
      };
    } else {
      target = {
        x: rest.x,
        y: rest.y,
        z: rest.z + extra,
      };
    }
    if (weight < 0.999 && typeof opts.readRotation === "function") {
      const current = opts.readRotation(name);
      if (current) {
        target = {
          x: current.x + (target.x - current.x) * weight,
          y: current.y + (target.y - current.y) * weight,
          z: current.z + (target.z - current.z) * weight,
        };
      }
    }
    applyBone(name, target);
    applied += 1;
  }
  return applied;
}
