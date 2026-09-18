/**
 * Smooth VRMA / pose transitions by slerping normalized humanoid bone rotations.
 *
 * Each bone goes from captured pose A (degrees stored as radians internally) to
 * the live mixer pose B via quaternion slerp — equivalent to smooth Euler blend
 * without gimbal pops on most humanoid chains.
 */
import * as THREE from "three";
import { VRM_FINGER_BONE_NAMES } from "./companionFingerPose.js";
import { easeInOutCubic } from "./companionPoseSmoothing.js";

export const VRM_MOTION_TRANSITION_SCHEMA = "amoji.vrmMotionTransition.v3";

/** Default crossfade when switching hosted VRMA clips or entering the library. */
export const DEFAULT_MOTION_CROSSFADE_SEC = 0.48;

export const RAD_TO_DEG = 180 / Math.PI;
export const DEG_TO_RAD = Math.PI / 180;

/** Bones we blend during transitions (body + fingers). */
export const VRM_MOTION_TRANSITION_BONES = Object.freeze([
  "hips",
  "spine",
  "chest",
  "upperChest",
  "neck",
  "head",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "leftToes",
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot",
  "rightToes",
  ...VRM_FINGER_BONE_NAMES,
]);

const _fromEuler = new THREE.Euler();
const _fromQuat = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();
const _blendedQuat = new THREE.Quaternion();

/**
 * @typedef {{ x: number, y: number, z: number, order?: string }} BoneRotationSnapshot
 * @typedef {Map<string, BoneRotationSnapshot>} VrmBoneSnapshot
 * @typedef {{ from: VrmBoneSnapshot, elapsedSec: number, durationSec: number, label?: string }} MotionTransitionState
 */

/**
 * Capture normalized humanoid bone rotations (radians) for transition blending.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {readonly string[]} [boneNames]
 * @returns {VrmBoneSnapshot}
 */
export function captureVrmBoneRotations(vrm, boneNames = VRM_MOTION_TRANSITION_BONES) {
  /** @type {VrmBoneSnapshot} */
  const snapshot = new Map();
  const humanoid = vrm?.humanoid;
  if (!humanoid) return snapshot;

  for (const name of boneNames) {
    const node = humanoid.getNormalizedBoneNode?.(name);
    if (!node?.rotation) continue;
    snapshot.set(name, {
      x: node.rotation.x,
      y: node.rotation.y,
      z: node.rotation.z,
      order: node.rotation.order || "XYZ",
    });
  }
  return snapshot;
}

/**
 * Same as captureVrmBoneRotations but reports degrees (for debug/UI).
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {readonly string[]} [boneNames]
 */
export function captureVrmBoneRotationsDegrees(vrm, boneNames = VRM_MOTION_TRANSITION_BONES) {
  const rad = captureVrmBoneRotations(vrm, boneNames);
  /** @type {VrmBoneSnapshot} */
  const deg = new Map();
  for (const [name, rot] of rad) {
    deg.set(name, {
      x: rot.x * RAD_TO_DEG,
      y: rot.y * RAD_TO_DEG,
      z: rot.z * RAD_TO_DEG,
      order: rot.order,
    });
  }
  return deg;
}

/**
 * Decide whether we need a manual A→B bone blend before the hosted clip owns the skeleton.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {{ isPlaying?: () => boolean, activeActionId?: string | null } | null | undefined} motionPlayer
 * @param {{ nextActionId?: string | null, durationSec?: number, label?: string }} [opts]
 * @returns {MotionTransitionState | null}
 */
export function planMotionTransition(vrm, motionPlayer, opts = {}) {
  const durationSec = opts.durationSec ?? DEFAULT_MOTION_CROSSFADE_SEC;
  const playing = Boolean(motionPlayer?.isPlaying?.());
  const currentId = String(motionPlayer?.activeActionId || "").toLowerCase();
  const nextId = String(opts.nextActionId || "").toLowerCase();

  if (!playing) {
    const from = captureVrmBoneRotations(vrm);
    const state = createMotionTransitionState(from, durationSec);
    if (state && opts.label) state.label = opts.label;
    return state;
  }

  if (nextId && currentId && nextId !== currentId) {
    return null;
  }

  return null;
}

/**
 * @returns {MotionTransitionState | null}
 */
export function createMotionTransitionState(from, durationSec = DEFAULT_MOTION_CROSSFADE_SEC) {
  if (!from?.size) return null;
  return {
    from,
    elapsedSec: 0,
    durationSec: Math.max(0.08, Number(durationSec) || DEFAULT_MOTION_CROSSFADE_SEC),
  };
}

/**
 * Blend captured rotations (A) toward the current mixer-driven pose (B).
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {VrmBoneSnapshot} fromSnapshot
 * @param {number} alpha 0..1
 * @returns {number} bones updated
 */
export function blendVrmBoneRotationsFromSnapshot(vrm, fromSnapshot, alpha) {
  const humanoid = vrm?.humanoid;
  if (!humanoid || !fromSnapshot?.size) return 0;
  const t = easeInOutCubic(Math.max(0, Math.min(1, alpha)));
  if (t >= 0.999) return 0;

  let updated = 0;
  for (const [name, from] of fromSnapshot) {
    const node = humanoid.getNormalizedBoneNode?.(name);
    if (!node?.rotation) continue;
    _fromEuler.set(from.x, from.y, from.z, from.order || "XYZ");
    _fromQuat.setFromEuler(_fromEuler);
    _targetQuat.setFromEuler(node.rotation);
    _blendedQuat.slerpQuaternions(_fromQuat, _targetQuat, t);
    if (node.quaternion?.copy) {
      node.quaternion.copy(_blendedQuat);
    }
    node.rotation.setFromQuaternion?.(_blendedQuat, from.order || "XYZ");
    if (!node.rotation.setFromQuaternion) {
      const e = new THREE.Euler().setFromQuaternion(_blendedQuat, from.order || "XYZ");
      node.rotation.x = e.x;
      node.rotation.y = e.y;
      node.rotation.z = e.z;
    }
    updated += 1;
  }
  return updated;
}

/**
 * Advance a transition state and apply the bone blend after the mixer step.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {MotionTransitionState | null | undefined} state
 * @param {number} dt
 * @param {{ onSynced?: () => void }} [opts]
 */
export function tickVrmMotionTransition(vrm, state, dt, opts = {}) {
  if (!state?.from?.size) {
    return { state, alpha: 1, done: true, bones: 0 };
  }
  state.elapsedSec += Math.max(0, dt);
  const alpha = Math.min(1, state.elapsedSec / state.durationSec);
  const bones = blendVrmBoneRotationsFromSnapshot(vrm, state.from, alpha);
  if (bones > 0) {
    opts.onSynced?.();
  }
  if (alpha >= 1) {
    return { state: null, alpha: 1, done: true, bones };
  }
  return { state, alpha, done: false, bones };
}

/**
 * @param {MotionTransitionState | null | undefined} state
 */
export function motionTransitionProgress(state) {
  if (!state?.durationSec) return 1;
  return Math.min(1, state.elapsedSec / state.durationSec);
}

/**
 * True when a hosted VRMA clip (or crossfade) should own the skeleton this frame.
 * @param {string | null | undefined} vrmaAction
 * @param {{ isPlaying?: () => boolean, isCrossfading?: () => boolean } | null | undefined} motionPlayer
 * @param {boolean} [vrmaPending]
 */
export function libraryOwnsVrmBody(vrmaAction, motionPlayer, vrmaPending = false) {
  if (!vrmaAction) return false;
  if (vrmaPending) return true;
  if (motionPlayer?.isCrossfading?.()) return true;
  return Boolean(motionPlayer?.isPlaying?.());
}
