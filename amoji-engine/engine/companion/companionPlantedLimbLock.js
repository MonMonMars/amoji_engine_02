/**
 * Hard lock for planted legs + hung upper arms after springs / mixer / humanoid flush.
 *
 * Pose writes go to normalized bones only. three-vrm `humanoid.update()` is the
 * only legal raw-bone writer: it bakes rest compensation into the skinned
 * quaternion. Copying normalized Euler onto raw bones drops that compensation
 * and reads as T-pose / ghost arms and skirt weights sliding off the bind pose.
 */
import {
  VRM_FOOT_REST_ROTATIONS,
  VRM_HAND_REST_ROTATIONS,
} from "./companionPoseLibrary.js";

export const COMPANION_PLANTED_LIMB_LOCK_SCHEMA =
  "amoji.companionPlantedLimbLock.v12-solver-owns-raw";

/** Upper-body bones whose raw pose must stay on the humanoid solver (no Euler copy). */
export const PLANTED_ARM_RAW_SYNC_BONES = Object.freeze([
  "leftShoulder",
  "rightShoulder",
  "leftUpperArm",
  "rightUpperArm",
  "leftLowerArm",
  "rightLowerArm",
  "leftHand",
  "rightHand",
]);

/** Pose writes target normalized nodes only — raw skinning comes from humanoid.update(). */
export const PLANTED_LOCK_NORMALIZED_ONLY_BONES = Object.freeze([
  "leftUpperLeg",
  "rightUpperLeg",
  "leftLowerLeg",
  "rightLowerLeg",
  "leftFoot",
  "rightFoot",
  "leftShoulder",
  "rightShoulder",
  "leftUpperArm",
  "rightUpperArm",
  "leftLowerArm",
  "rightLowerArm",
  "leftHand",
  "rightHand",
]);

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
 * Full humanoid chain checked for solver ownership.
 * Do not copy normalized Euler onto these raw bones — that is the ghost-limb bug.
 */
export const HUMANOID_SKINNED_RAW_SYNC_BONES = Object.freeze([
  "hips",
  "spine",
  "chest",
  "upperChest",
  "neck",
  "head",
  ...PLANTED_LOCK_BONE_NAMES,
  "leftShoulder",
  "rightShoulder",
  "leftHand",
  "rightHand",
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
  const normalizedOnlyWrite =
    PLANTED_LOCK_NORMALIZED_ONLY_BONES.includes(name);
  if (norm) writeVrmBoneEuler(norm, rot);
  if (raw && raw !== norm && !normalizedOnlyWrite) writeVrmBoneEuler(raw, rot);
}

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {{
 *   legRestRotations: typeof import('./companionPoseLibrary.js').VRM_LEG_REST_ROTATIONS,
 *   armRestRotations: typeof import('./companionPoseLibrary.js').VRM_ARM_REST_ROTATIONS,
 *   lockUpperArms?: boolean,
 *   lockForearms?: boolean,
 *   legsOnly?: boolean,
 * }} opts
 */
export function enforcePlantedLimbRotations(humanoid, opts) {
  if (!humanoid) return 0;
  const legs = opts.legRestRotations;
  const arms = opts.armRestRotations;
  const legsOnly = opts.legsOnly === true;
  const lockArms = !legsOnly && opts.lockUpperArms !== false;
  const lockForearms = !legsOnly && opts.lockForearms === true;
  let n = 0;
  writeHumanoidBoneRotation(humanoid, "leftUpperLeg", legs.leftUpperLeg);
  writeHumanoidBoneRotation(humanoid, "rightUpperLeg", legs.rightUpperLeg);
  writeHumanoidBoneRotation(humanoid, "leftLowerLeg", legs.leftLowerLeg);
  writeHumanoidBoneRotation(humanoid, "rightLowerLeg", legs.rightLowerLeg);
  writeHumanoidBoneRotation(humanoid, "leftFoot", VRM_FOOT_REST_ROTATIONS.leftFoot);
  writeHumanoidBoneRotation(humanoid, "rightFoot", VRM_FOOT_REST_ROTATIONS.rightFoot);
  n += 6;
  if (legsOnly) {
    humanoid.update?.();
    return n;
  }
  if (lockArms) {
    writeHumanoidBoneRotation(humanoid, "leftShoulder", PLANTED_SHOULDER_REST);
    writeHumanoidBoneRotation(humanoid, "rightShoulder", PLANTED_SHOULDER_REST);
    writeHumanoidBoneRotation(humanoid, "leftUpperArm", arms.leftUpperArm);
    writeHumanoidBoneRotation(humanoid, "rightUpperArm", arms.rightUpperArm);
    if (opts.lockNeck === true) {
      writeHumanoidBoneRotation(humanoid, "neck", PLANTED_SHOULDER_REST);
    }
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

/**
 * @param {{ rotation?: { x?: number, y?: number, z?: number } } | null | undefined} bone
 */
export function readBoneEuler(bone) {
  if (!bone?.rotation) return null;
  return {
    x: Number(bone.rotation.x) || 0,
    y: Number(bone.rotation.y) || 0,
    z: Number(bone.rotation.z) || 0,
  };
}

/**
 * Commit normalized pose onto raw skinning bones via the VRM humanoid solver.
 * Normalized and raw local Eulers are not the same space — do not copy them.
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {readonly string[]} [_boneNames] kept for call-site compatibility
 */
export function syncSkinnedLimbRawFromNormalized(humanoid, _boneNames) {
  void _boneNames;
  if (!humanoid) return 0;
  humanoid.update?.();
  return 0;
}

/** @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid */
export function syncHumanoidSkinnedRawFromNormalized(humanoid) {
  return syncSkinnedLimbRawFromNormalized(humanoid, HUMANOID_SKINNED_RAW_SYNC_BONES);
}

/**
 * Raw skinning pose must already be the humanoid solver output.
 * A second `humanoid.update()` is idempotent when nothing copied Euler onto raw.
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {number} [maxDeltaRad]
 */
export function auditPlantedLimbDualWrite(humanoid, maxDeltaRad = 0.0025) {
  if (!humanoid) {
    return { ok: false, maxDelta: null, issues: [], reason: "no-humanoid" };
  }
  /** @type {{ name: string, d: number }[]} */
  const issues = [];
  /** @type {Map<string, { x: number, y: number, z: number }>} */
  const before = new Map();
  for (const name of HUMANOID_SKINNED_RAW_SYNC_BONES) {
    const raw = humanoid.getRawBoneNode?.(name);
    const euler = readBoneEuler(raw);
    if (euler) before.set(name, euler);
  }
  humanoid.update?.();
  for (const [name, a] of before) {
    const b = readBoneEuler(humanoid.getRawBoneNode?.(name));
    if (!b) continue;
    const d = Math.max(
      Math.abs(a.x - b.x),
      Math.abs(a.y - b.y),
      Math.abs(a.z - b.z),
    );
    if (d > maxDeltaRad) issues.push({ name, d });
  }
  return {
    ok: issues.length === 0,
    maxDelta: issues.length ? Math.max(...issues.map((i) => i.d)) : 0,
    issues,
    reason: issues.length ? "raw-drifted-from-solver" : "solver-owns-raw",
  };
}
