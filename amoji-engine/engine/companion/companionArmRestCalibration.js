/**
 * Detect VRM arm-rest Z sign — some photoreal rigs (e.g. Nova) invert the
 * standard A-pose drop axis compared to anime VRM samples.
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
      x: VRM_ARM_REST_ROTATIONS.leftUpperArm.x,
      y: 0,
      z: -VRM_ARM_REST_ROTATIONS.leftUpperArm.z,
    },
    rightUpperArm: {
      x: VRM_ARM_REST_ROTATIONS.rightUpperArm.x,
      y: 0,
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

  humanoid.resetNormalizedPose?.();
  return flippedY < standardY - 0.04 ? flippedZ : VRM_ARM_REST_ROTATIONS;
}
