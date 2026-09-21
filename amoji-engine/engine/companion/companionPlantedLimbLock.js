/**
 * Hard lock for planted legs + hung upper arms after springs / mixer / humanoid flush.
 * Pose channels alone are not enough — raw skinned bones can drift one frame behind.
 */
import {
  VRM_FOOT_REST_ROTATIONS,
  VRM_HAND_REST_ROTATIONS,
} from "./companionPoseLibrary.js";

export const COMPANION_PLANTED_LIMB_LOCK_SCHEMA =
  "amoji.companionPlantedLimbLock.v3-dual-write-shoulders";

/** Shoulders stay neutral when upper arms are planted (pose channels only hit normalized nodes). */
export const PLANTED_SHOULDER_REST = Object.freeze({ x: 0, y: 0, z: 0 });

/** Bones forced to calibrated rest when feet are planted (no full-body action). */
export const PLANTED_LOCK_BONE_NAMES = Object.freeze([
  "leftUpperLeg",
  "rightUpperLeg",
  "leftLowerLeg",
  "rightLowerLeg",
  "leftFoot",
  "rightFoot",
  "leftUpperArm",
  "rightUpperArm",
  "leftLowerArm",
  "rightLowerArm",
]);

/**
 * @param {{ rotation?: { set?: Function, x?: number, y?: number, z?: number, order?: string } } | null | undefined} bone
 * @param {{ x?: number, y?: number, z?: number, flexAxis?: string } | null | undefined} rot
 */
export function writeVrmBoneEuler(bone, rot) {
  if (!bone?.rotation || !rot) return;
  let x = rot.x ?? 0;
  let y = rot.y ?? 0;
  let z = rot.z ?? 0;
  const nameHint = String(bone.name || "").toLowerCase();
  if (
    /lowerarm|lowerleg|upperleg|foot|toes/.test(nameHint) &&
    rot.flexAxis !== "y"
  ) {
    y = 0;
  }
  if (typeof bone.rotation.set === "function") {
    bone.rotation.order = "XYZ";
    bone.rotation.set(x, y, z);
    return;
  }
  bone.rotation.x = x;
  bone.rotation.y = y;
  bone.rotation.z = z;
}

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {string} name
 * @param {{ x?: number, y?: number, z?: number, flexAxis?: string } | null | undefined} rot
 */
export function writeHumanoidBoneRotation(humanoid, name, rot) {
  if (!humanoid || !rot) return;
  const norm = humanoid.getNormalizedBoneNode?.(name);
  const raw = humanoid.getRawBoneNode?.(name);
  if (norm) writeVrmBoneEuler(norm, rot);
  if (raw && raw !== norm) writeVrmBoneEuler(raw, rot);
}

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {{
 *   legRestRotations: typeof import('./companionPoseLibrary.js').VRM_LEG_REST_ROTATIONS,
 *   armRestRotations: typeof import('./companionPoseLibrary.js').VRM_ARM_REST_ROTATIONS,
 *   lockUpperArms?: boolean,
 *   lockForearms?: boolean,
 * }} opts
 */
export function enforcePlantedLimbRotations(humanoid, opts) {
  if (!humanoid) return 0;
  const legs = opts.legRestRotations;
  const arms = opts.armRestRotations;
  const lockArms = opts.lockUpperArms !== false;
  const lockForearms = opts.lockForearms === true;
  let n = 0;
  writeHumanoidBoneRotation(humanoid, "leftUpperLeg", legs.leftUpperLeg);
  writeHumanoidBoneRotation(humanoid, "rightUpperLeg", legs.rightUpperLeg);
  writeHumanoidBoneRotation(humanoid, "leftLowerLeg", legs.leftLowerLeg);
  writeHumanoidBoneRotation(humanoid, "rightLowerLeg", legs.rightLowerLeg);
  writeHumanoidBoneRotation(humanoid, "leftFoot", VRM_FOOT_REST_ROTATIONS.leftFoot);
  writeHumanoidBoneRotation(humanoid, "rightFoot", VRM_FOOT_REST_ROTATIONS.rightFoot);
  n += 6;
  if (lockArms) {
    writeHumanoidBoneRotation(humanoid, "leftShoulder", PLANTED_SHOULDER_REST);
    writeHumanoidBoneRotation(humanoid, "rightShoulder", PLANTED_SHOULDER_REST);
    writeHumanoidBoneRotation(humanoid, "leftUpperArm", arms.leftUpperArm);
    writeHumanoidBoneRotation(humanoid, "rightUpperArm", arms.rightUpperArm);
    n += 4;
  }
  if (lockForearms) {
    writeHumanoidBoneRotation(humanoid, "leftLowerArm", arms.leftLowerArm);
    writeHumanoidBoneRotation(humanoid, "rightLowerArm", arms.rightLowerArm);
    n += 2;
  }
  humanoid.update?.();
  return n;
}

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 */
export function enforcePlantedHandRest(humanoid) {
  if (!humanoid) return;
  writeHumanoidBoneRotation(humanoid, "leftHand", VRM_HAND_REST_ROTATIONS.leftHand);
  writeHumanoidBoneRotation(humanoid, "rightHand", VRM_HAND_REST_ROTATIONS.rightHand);
  humanoid.update?.();
}
