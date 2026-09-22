/**
 * Detect a living idle rest per VRM bind.
 *
 * Mixamo/T-pose rigs need a large upper-arm Z drop or they stay in a stick
 * T-pose. VRoid/A-pose rigs already hang arms at the sides — applying that
 * Mixamo drop on top turns elbow/knee flex into twist, so limbs look glued
 * straight down. Measure the authored bind, then bend on the axis that
 * actually shortens the limb.
 */
import * as THREE from "three";
import {
  VRM_ARM_REST_ROTATIONS,
  VRM_APOSE_ARM_REST_ROTATIONS,
  VRM_LEG_REST_ROTATIONS,
} from "./companionPoseLibrary.js";

export const COMPANION_ARM_REST_CALIBRATION_SCHEMA =
  "amoji.companionArmRestCalibration.v4-per-side-upper-z";

const ARM_BONES = [
  "leftUpperArm",
  "rightUpperArm",
  "leftLowerArm",
  "rightLowerArm",
];

const LEG_BONES = [
  "leftUpperLeg",
  "rightUpperLeg",
  "leftLowerLeg",
  "rightLowerLeg",
];

const ELBOW_BEND_TPOSE = 0.92;
const ELBOW_BEND_APOSE = 0.22;
const KNEE_BEND_TPOSE = 0.12;
const KNEE_BEND_APOSE = 0.04;
/** Hand already dropped this far from shoulder→hip means authored A-pose. */
const APOSE_DROP_RATIO = 0.28;

const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {string} name
 */
export function vrmBoneNode(humanoid, name) {
  return (
    humanoid?.getNormalizedBoneNode?.(name) ||
    humanoid?.getRawBoneNode?.(name) ||
    null
  );
}

/**
 * Prefer the skinned raw bone after a humanoid flush — that is what the
 * user sees. Fall back to the normalized rig in tests / missing maps.
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {string} name
 */
function measureBone(humanoid, name) {
  return (
    humanoid?.getRawBoneNode?.(name) ||
    humanoid?.getNormalizedBoneNode?.(name) ||
    null
  );
}

/**
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 */
function flushPose(vrm) {
  vrm?.humanoid?.update?.();
  vrm?.scene?.updateMatrixWorld?.(true);
  vrm?.update?.(0);
}

/**
 * @param {import('three').Object3D | null | undefined} node
 * @param {import('three').Vector3} target
 */
function worldPos(node, target) {
  if (!node?.getWorldPosition) return null;
  node.updateWorldMatrix?.(true, false);
  target.set(0, 0, 0);
  node.getWorldPosition(target);
  return target;
}

/**
 * @param {{ rotation?: { set?: Function, x?: number, y?: number, z?: number, order?: string } } | null} bone
 * @param {{ x?: number, y?: number, z?: number } | null | undefined} rot
 */
function writeEuler(bone, rot) {
  if (!bone?.rotation || !rot) return;
  if (typeof bone.rotation.set === "function") {
    bone.rotation.order = "XYZ";
    bone.rotation.set(rot.x ?? 0, rot.y ?? 0, rot.z ?? 0);
    return;
  }
  bone.rotation.x = rot.x ?? 0;
  bone.rotation.y = rot.y ?? 0;
  bone.rotation.z = rot.z ?? 0;
}

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {string[]} names
 * @param {Record<string, { x?: number, y?: number, z?: number }>} rest
 */
function applyNamedRest(humanoid, names, rest) {
  for (const name of names) {
    writeEuler(vrmBoneNode(humanoid, name), rest[name]);
  }
}

/**
 * @param {string} axis
 * @param {number} signedBend
 * @param {string} flexAxis
 */
function hingeOnAxis(axis, signedBend, flexAxis) {
  return {
    x: axis === "x" ? signedBend : 0,
    y: axis === "y" ? signedBend : 0,
    z: axis === "z" ? signedBend : 0,
    flexAxis,
  };
}

/** VRM humanoid elbows/knees hinge on X or Z — never Y (that twists the limb). */
const LIMB_HINGE_AXES = Object.freeze(["x", "z"]);

/**
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @param {(lower: { x: number, y: number, z: number }) => number} metric
 * @param {number} delta
 * @param {readonly string[]} [allowedAxes]
 */
function pickHingeAxis(metric, delta = 0.02, allowedAxes = LIMB_HINGE_AXES) {
  const restMetric = metric({ x: 0, y: 0, z: 0 });
  let bestAxis = allowedAxes[0] || "x";
  let bestSign = 1;
  let bestMetric = restMetric;
  for (const axis of allowedAxes) {
    for (const sign of [1, -1]) {
      const value = metric({ x: 0, y: 0, z: 0, [axis]: 0.9 * sign });
      if (value < bestMetric - delta) {
        bestMetric = value;
        bestAxis = axis;
        bestSign = sign;
      }
    }
  }
  return { axis: bestAxis, sign: bestSign, improved: bestMetric < restMetric - delta };
}

/**
 * @param {{ x?: number, y?: number, z?: number, flexAxis?: string }} rest
 * @param {{ x?: number, y?: number, z?: number, flexAxis?: string }} fallback
 */
function sanitizeLimbHinge(rest, fallback) {
  const axis = rest?.flexAxis;
  if (axis === "y" || Math.abs(Number(rest?.y) || 0) > 0.35) {
    return { ...fallback, flexAxis: fallback.flexAxis || "x" };
  }
  if (axis !== "x" && axis !== "z") {
    return { ...fallback, flexAxis: fallback.flexAxis || "x" };
  }
  return rest;
}

/**
 * Authored bind: T-pose (hands near shoulders) vs A-pose (hands already down).
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @returns {"tpose" | "apose"}
 */
function measureArmDrop(humanoid, side) {
  const handName = side === "left" ? "leftHand" : "rightHand";
  const upperName = side === "left" ? "leftUpperArm" : "rightUpperArm";
  const hand = worldPos(measureBone(humanoid, handName), scratchA);
  const shoulder = worldPos(measureBone(humanoid, upperName), scratchB);
  const hipNode =
    measureBone(humanoid, "hips") ||
    measureBone(humanoid, side === "left" ? "leftUpperLeg" : "rightUpperLeg");
  const hip = worldPos(hipNode, new THREE.Vector3());
  if (!hand || !shoulder || !hip) return null;
  const span = Math.max(0.08, shoulder.y - hip.y);
  return (shoulder.y - hand.y) / span;
}

/**
 * T-pose rigs: pick upper-arm Z per side (global flip breaks asymmetric meshes).
 * @param {import('@pixiv/three-vrm').VRMHumanoid} humanoid
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @param {"left" | "right"} side
 */
function pickUpperArmRestForSide(humanoid, vrm, side) {
  const key = side === "left" ? "leftUpperArm" : "rightUpperArm";
  const otherKey = side === "left" ? "rightUpperArm" : "leftUpperArm";
  const standard = VRM_ARM_REST_ROTATIONS[key];
  const flipped = { ...standard, z: -standard.z };
  const scoreFor = (upper) => {
    humanoid.resetNormalizedPose?.();
    const rest = {
      ...VRM_ARM_REST_ROTATIONS,
      [key]: upper,
      [otherKey]: VRM_ARM_REST_ROTATIONS[otherKey],
    };
    applyNamedRest(humanoid, ARM_BONES, rest);
    flushPose(vrm);
    return measureArmDrop(humanoid, side) ?? 0;
  };
  const stdDrop = scoreFor(standard);
  const flipDrop = scoreFor(flipped);
  return flipDrop > stdDrop + 0.04 ? flipped : standard;
}

export function detectVrmArmBind(vrm) {
  const humanoid = vrm?.humanoid;
  if (!humanoid) return "tpose";
  humanoid.resetNormalizedPose?.();
  flushPose(vrm);
  const leftDrop = measureArmDrop(humanoid, "left");
  const rightDrop = measureArmDrop(humanoid, "right");
  const drops = [leftDrop, rightDrop].filter((v) => v != null);
  if (!drops.length) return "tpose";
  const drop = drops.reduce((sum, v) => sum + v, 0) / drops.length;
  return drop > APOSE_DROP_RATIO ? "apose" : "tpose";
}

/**
 * Pick the lower-arm axis that actually flexes the elbow (shortens hand–upper-arm).
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @param {typeof VRM_ARM_REST_ROTATIONS} upperRest
 * @param {"left" | "right"} side
 * @param {number} bend
 * @param {{ x?: number, y?: number, z?: number, flexAxis?: string }} fallback
 */
function detectElbowFlex(vrm, upperRest, side, bend, fallback) {
  const humanoid = vrm.humanoid;
  const handName = side === "left" ? "leftHand" : "rightHand";
  const upperName = side === "left" ? "leftUpperArm" : "rightUpperArm";
  const lowerName = side === "left" ? "leftLowerArm" : "rightLowerArm";
  const hand = measureBone(humanoid, handName);
  const upper = measureBone(humanoid, upperName);
  if (!hand?.getWorldPosition || !upper?.getWorldPosition) {
    return fallback;
  }

  const metric = (lower) => {
    humanoid.resetNormalizedPose?.();
    applyNamedRest(humanoid, ARM_BONES, {
      ...upperRest,
      [lowerName]: lower,
    });
    flushPose(vrm);
    worldPos(upper, scratchA);
    worldPos(hand, scratchB);
    return scratchA.distanceTo(scratchB);
  };

  const picked = pickHingeAxis(metric, 0.02, LIMB_HINGE_AXES);
  const hinge = hingeOnAxis(picked.axis, bend * picked.sign, picked.axis);
  return sanitizeLimbHinge(hinge, fallback);
}

/**
 * Pick the shin axis that actually bends the knee (shortens hip–foot).
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @param {"left" | "right"} side
 * @param {number} bend
 */
function detectKneeFlex(vrm, side, bend) {
  const humanoid = vrm.humanoid;
  const footName = side === "left" ? "leftFoot" : "rightFoot";
  const hipName = side === "left" ? "leftUpperLeg" : "rightUpperLeg";
  const lowerName = side === "left" ? "leftLowerLeg" : "rightLowerLeg";
  const foot = measureBone(humanoid, footName);
  const hip = measureBone(humanoid, hipName);
  if (!foot?.getWorldPosition || !hip?.getWorldPosition) {
    return {
      ...VRM_LEG_REST_ROTATIONS[lowerName],
      flexAxis: "x",
    };
  }

  const metric = (lower) => {
    humanoid.resetNormalizedPose?.();
    applyNamedRest(humanoid, LEG_BONES, {
      ...VRM_LEG_REST_ROTATIONS,
      [lowerName]: lower,
    });
    flushPose(vrm);
    worldPos(hip, scratchA);
    worldPos(foot, scratchB);
    return scratchA.distanceTo(scratchB);
  };

  const picked = pickHingeAxis(metric, 0.015, LIMB_HINGE_AXES);
  const hinge = hingeOnAxis(picked.axis, bend * picked.sign, picked.axis);
  const fallback =
    side === "left"
      ? VRM_LEG_REST_ROTATIONS.leftLowerLeg
      : VRM_LEG_REST_ROTATIONS.rightLowerLeg;
  const sane = sanitizeLimbHinge(hinge, fallback);
  if (sane.flexAxis === "x" && sane.x < 0) {
    return { ...sane, x: Math.abs(sane.x) };
  }
  if (sane.flexAxis === "z" && sane.z < 0) {
    return { ...sane, z: Math.abs(sane.z) };
  }
  return sane;
}

/**
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @returns {typeof VRM_ARM_REST_ROTATIONS}
 */
export function detectVrmArmRestRotations(vrm) {
  const humanoid = vrm?.humanoid;
  if (!humanoid) return VRM_ARM_REST_ROTATIONS;

  const leftHand = vrmBoneNode(humanoid, "leftHand");
  const rightHand = vrmBoneNode(humanoid, "rightHand");
  if (!leftHand || !rightHand) return VRM_ARM_REST_ROTATIONS;

  const bind = detectVrmArmBind(vrm);
  const elbowBend = bind === "apose" ? ELBOW_BEND_APOSE : ELBOW_BEND_TPOSE;
  /** @type {typeof VRM_ARM_REST_ROTATIONS} */
  let upperRest = VRM_APOSE_ARM_REST_ROTATIONS;
  if (bind === "tpose") {
    upperRest = {
      ...VRM_ARM_REST_ROTATIONS,
      leftUpperArm: pickUpperArmRestForSide(humanoid, vrm, "left"),
      rightUpperArm: pickUpperArmRestForSide(humanoid, vrm, "right"),
    };
  }

  const leftFallback =
    bind === "apose"
      ? VRM_APOSE_ARM_REST_ROTATIONS.leftLowerArm
      : VRM_ARM_REST_ROTATIONS.leftLowerArm;
  const rightFallback =
    bind === "apose"
      ? VRM_APOSE_ARM_REST_ROTATIONS.rightLowerArm
      : VRM_ARM_REST_ROTATIONS.rightLowerArm;
  const leftLowerArm = detectElbowFlex(vrm, upperRest, "left", elbowBend, leftFallback);
  const rightLowerArm = detectElbowFlex(
    vrm,
    upperRest,
    "right",
    elbowBend,
    rightFallback,
  );

  humanoid.resetNormalizedPose?.();
  return Object.freeze({
    ...upperRest,
    leftLowerArm,
    rightLowerArm,
  });
}

/**
 * @param {import('@pixiv/three-vrm').VRM} vrm
 */
export function detectVrmLegRestRotations(vrm) {
  const humanoid = vrm?.humanoid;
  if (!humanoid) return VRM_LEG_REST_ROTATIONS;

  const bind = detectVrmArmBind(vrm);
  const kneeBend = bind === "apose" ? KNEE_BEND_APOSE : KNEE_BEND_TPOSE;
  const leftLowerLeg = detectKneeFlex(vrm, "left", kneeBend);
  const rightLowerLeg = detectKneeFlex(vrm, "right", kneeBend);

  humanoid.resetNormalizedPose?.();
  return Object.freeze({
    leftUpperLeg: { ...VRM_LEG_REST_ROTATIONS.leftUpperLeg },
    rightUpperLeg: { ...VRM_LEG_REST_ROTATIONS.rightUpperLeg },
    leftLowerLeg,
    rightLowerLeg,
  });
}

/**
 * @param {import('@pixiv/three-vrm').VRM} vrm
 */
export function detectVrmIdleRestRotations(vrm) {
  const bind = detectVrmArmBind(vrm);
  const arms = detectVrmArmRestRotations(vrm);
  const legs = detectVrmLegRestRotations(vrm);
  return Object.freeze({ bind, arms, legs });
}
