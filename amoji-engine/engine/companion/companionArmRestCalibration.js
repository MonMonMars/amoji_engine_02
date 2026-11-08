/**
 * Detect VRM arm-rest Z sign and elbow flex axis — photoreal rigs (e.g. Nova)
 * often invert the A-pose drop axis and bend the elbow on Z, not X.
 */
import * as THREE from "three";
import { VRM_ARM_REST_ROTATIONS } from "./companionPoseLibrary.js";

export const COMPANION_ARM_REST_CALIBRATION_SCHEMA =
  "amoji.companionArmRestCalibration.v1";

const ARM_BONES = [
  "leftUpperArm",
  "rightUpperArm",
  "leftLowerArm",
  "rightLowerArm",
];

const ELBOW_BEND = 0.68;

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {Record<string, { x?: number, y?: number, z?: number }>} rest
 */
function applyArmRest(humanoid, rest) {
  for (const name of ARM_BONES) {
    const bone = humanoid?.getNormalizedBoneNode?.(name);
    const rot = rest[name];
    if (!bone || !rot) continue;
    bone.rotation.x = rot.x ?? 0;
    bone.rotation.y = rot.y ?? 0;
    bone.rotation.z = rot.z ?? 0;
  }
}

/**
 * @param {string} axis
 * @param {number} signedBend
 * @param {string} flexAxis
 */
function lowerArmOnAxis(axis, signedBend, flexAxis) {
  return {
    x: axis === "x" ? signedBend : 0.08,
    y: axis === "y" ? signedBend : 0,
    z: axis === "z" ? signedBend : 0.08,
    flexAxis,
  };
}

/**
 * Pick the lower-arm axis that actually flexes the elbow (shortens hand–upper-arm).
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @param {typeof VRM_ARM_REST_ROTATIONS} upperRest
 * @param {"left" | "right"} side
 */
function detectElbowFlex(vrm, upperRest, side) {
  const humanoid = vrm.humanoid;
  const handName = side === "left" ? "leftHand" : "rightHand";
  const upperName = side === "left" ? "leftUpperArm" : "rightUpperArm";
  const lowerName = side === "left" ? "leftLowerArm" : "rightLowerArm";
  const hand = humanoid.getNormalizedBoneNode?.(handName);
  const upper = humanoid.getNormalizedBoneNode?.(upperName);
  if (!hand?.getWorldPosition || !upper?.getWorldPosition) {
    return upperRest[lowerName];
  }

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const distFor = (lower) => {
    humanoid.resetNormalizedPose?.();
    applyArmRest(humanoid, {
      ...upperRest,
      [lowerName]: lower,
    });
    humanoid.update?.();
    vrm.update?.(0);
    upper.getWorldPosition(a);
    hand.getWorldPosition(b);
    return a.distanceTo(b);
  };

  const restDist = distFor({ x: 0, y: 0, z: 0 });
  let bestAxis = "x";
  let bestSign = 1;
  let bestDist = restDist;
  for (const axis of ["x", "y", "z"]) {
    for (const sign of [1, -1]) {
      const d = distFor({ x: 0, y: 0, z: 0, [axis]: 0.9 * sign });
      if (d < bestDist - 0.025) {
        bestDist = d;
        bestAxis = axis;
        bestSign = sign;
      }
    }
  }

  return lowerArmOnAxis(bestAxis, ELBOW_BEND * bestSign, bestAxis);
}

/**
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @returns {typeof VRM_ARM_REST_ROTATIONS}
 */
export function detectVrmArmRestRotations(vrm) {
  const humanoid = vrm?.humanoid;
  if (!humanoid) return VRM_ARM_REST_ROTATIONS;

  const leftHand = humanoid.getNormalizedBoneNode?.("leftHand");
  const rightHand = humanoid.getNormalizedBoneNode?.("rightHand");
  if (!leftHand || !rightHand) return VRM_ARM_REST_ROTATIONS;

  const flippedZ = Object.freeze({
    leftUpperArm: {
      ...VRM_ARM_REST_ROTATIONS.leftUpperArm,
      z: -VRM_ARM_REST_ROTATIONS.leftUpperArm.z,
    },
    rightUpperArm: {
      ...VRM_ARM_REST_ROTATIONS.rightUpperArm,
      z: -VRM_ARM_REST_ROTATIONS.rightUpperArm.z,
    },
    leftLowerArm: { ...VRM_ARM_REST_ROTATIONS.leftLowerArm },
    rightLowerArm: { ...VRM_ARM_REST_ROTATIONS.rightLowerArm },
  });

  const handHeight = (rest) => {
    humanoid.resetNormalizedPose?.();
    applyArmRest(humanoid, rest);
    humanoid.update?.();
    vrm.update?.(0);
    const w = new THREE.Vector3();
    leftHand.getWorldPosition(w);
    const leftY = w.y;
    rightHand.getWorldPosition(w);
    return (leftY + w.y) * 0.5;
  };

  const standardY = handHeight(VRM_ARM_REST_ROTATIONS);
  const flippedY = handHeight(flippedZ);
  const upperRest =
    flippedY < standardY - 0.04 ? flippedZ : VRM_ARM_REST_ROTATIONS;

  const leftLowerArm = detectElbowFlex(vrm, upperRest, "left");
  const rightLowerArm = detectElbowFlex(vrm, upperRest, "right");

  humanoid.resetNormalizedPose?.();
  return Object.freeze({
    ...upperRest,
    leftLowerArm,
    rightLowerArm,
  });
}
