/**
 * Soft rest curl for VRM finger bones so hands are not sticks.
 * VRoid flexes on Z; Mixamo / photoreal (LeftHandIndex1) flexes on X.
 */

export const COMPANION_FINGER_POSE_SCHEMA = "amoji.companionFingerPose.v2";

const LEFT_CURL_Z = 0.34;
const RIGHT_CURL_Z = -0.34;
const MID_CURL = 0.44;
const TIP_CURL = 0.3;

/**
 * @param {number} z
 * @param {number} [mid]
 * @param {number} [tip]
 */
function digit(z, mid = MID_CURL, tip = TIP_CURL) {
  return {
    proximal: { x: 0.06, y: 0, z },
    intermediate: { x: 0.04, y: 0, z: Math.sign(z) * mid },
    distal: { x: 0.03, y: 0, z: Math.sign(z) * tip },
  };
}

const LEFT = digit(LEFT_CURL_Z);
const RIGHT = digit(RIGHT_CURL_Z);

export const VRM_FINGER_REST_ROTATIONS = Object.freeze({
  leftThumbMetacarpal: { x: 0.1, y: 0.28, z: 0.12 },
  leftThumbProximal: { x: 0.16, y: 0.14, z: 0.1 },
  leftThumbDistal: { x: 0.14, y: 0.04, z: 0.08 },
  leftIndexProximal: LEFT.proximal,
  leftIndexIntermediate: LEFT.intermediate,
  leftIndexDistal: LEFT.distal,
  leftMiddleProximal: LEFT.proximal,
  leftMiddleIntermediate: LEFT.intermediate,
  leftMiddleDistal: LEFT.distal,
  leftRingProximal: { ...LEFT.proximal, z: LEFT_CURL_Z + 0.04 },
  leftRingIntermediate: LEFT.intermediate,
  leftRingDistal: LEFT.distal,
  leftLittleProximal: { ...LEFT.proximal, z: LEFT_CURL_Z + 0.08 },
  leftLittleIntermediate: LEFT.intermediate,
  leftLittleDistal: LEFT.distal,
  rightThumbMetacarpal: { x: 0.1, y: -0.28, z: -0.12 },
  rightThumbProximal: { x: 0.16, y: -0.14, z: -0.1 },
  rightThumbDistal: { x: 0.14, y: -0.04, z: -0.08 },
  rightIndexProximal: RIGHT.proximal,
  rightIndexIntermediate: RIGHT.intermediate,
  rightIndexDistal: RIGHT.distal,
  rightMiddleProximal: RIGHT.proximal,
  rightMiddleIntermediate: RIGHT.intermediate,
  rightMiddleDistal: RIGHT.distal,
  rightRingProximal: { ...RIGHT.proximal, z: RIGHT_CURL_Z - 0.04 },
  rightRingIntermediate: RIGHT.intermediate,
  rightRingDistal: RIGHT.distal,
  rightLittleProximal: { ...RIGHT.proximal, z: RIGHT_CURL_Z - 0.08 },
  rightLittleIntermediate: RIGHT.intermediate,
  rightLittleDistal: RIGHT.distal,
});

export const VRM_FINGER_BONE_NAMES = Object.freeze(
  Object.keys(VRM_FINGER_REST_ROTATIONS),
);

/**
 * Mixamo finger bones flex on X; VRoid / VRM humanoid defaults flex on Z.
 * @param {unknown} humanoid
 * @returns {"x" | "z"}
 */
export function inferFingerFlexAxis(humanoid) {
  if (!humanoid) return "z";
  const node =
    humanoid.getRawBoneNode?.("leftIndexProximal") ||
    humanoid.getNormalizedBoneNode?.("leftIndexProximal");
  const names = [
    node?.name,
    humanoid.humanBones?.leftIndexProximal?.node?.name,
    humanoid._humanBones?.leftIndexProximal?.node?.name,
    humanoid.humanBones?.leftIndexProximal?.name,
  ]
    .filter(Boolean)
    .map((value) => String(value));
  for (const name of names) {
    if (
      /Hand(Index|Middle|Ring|Pinky|Little)\d/i.test(name) ||
      /mixamorig/i.test(name) ||
      /^mixamo/i.test(name)
    ) {
      return "x";
    }
  }
  return "z";
}

/**
 * Extra curl while talking so fingers aren't frozen.
 * @param {number} [talkBlend]
 */
export function fingerTalkCurlBoost(talkBlend = 0) {
  return 0.08 + Math.max(0, Math.min(1, talkBlend)) * 0.12;
}

/**
 * @param {(name: string, rot: { x: number, y: number, z: number }) => void} applyBone
 * @param {{ talkBlend?: number, flexAxis?: "x" | "z" }} [opts]
 */
export function applyFingerRestPose(applyBone, opts = {}) {
  if (typeof applyBone !== "function") return 0;
  const flexAxis = opts.flexAxis === "x" ? "x" : "z";
  const boost = fingerTalkCurlBoost(opts.talkBlend);
  let applied = 0;
  for (const name of VRM_FINGER_BONE_NAMES) {
    const rest = VRM_FINGER_REST_ROTATIONS[name];
    const sign = name.startsWith("right") ? -1 : 1;
    const extra = sign * (name.includes("Thumb") ? boost * 0.35 : boost);
    if (flexAxis === "x") {
      const curl = Math.abs(rest.z) + Math.abs(extra);
      applyBone(name, {
        x: rest.x + curl,
        y: rest.y,
        z: rest.z * 0.12,
      });
    } else {
      applyBone(name, {
        x: rest.x,
        y: rest.y,
        z: rest.z + extra,
      });
    }
    applied += 1;
  }
  return applied;
}
