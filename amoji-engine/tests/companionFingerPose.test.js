import { describe, expect, it } from "vitest";
import {
  applyFingerRestPose,
  fingerIdleWiggle,
  fingerTalkCurlBoost,
  inferFingerFlexAxis,
  VRM_FINGER_BONE_NAMES,
  VRM_FINGER_REST_ROTATIONS,
} from "../engine/companion/companionFingerPose.js";
import { createCompanionBodyMotion } from "../engine/companion/companionBodyMotion.js";

describe("companionFingerPose", () => {
  it("authors a rest curl for every VRM finger bone", () => {
    expect(VRM_FINGER_BONE_NAMES.length).toBe(30);
    expect(VRM_FINGER_REST_ROTATIONS.leftIndexProximal.z).toBeGreaterThan(0.5);
    expect(VRM_FINGER_REST_ROTATIONS.rightIndexProximal.z).toBeLessThan(-0.5);
  });

  it("applies extra curl while talking", () => {
    expect(fingerTalkCurlBoost(1)).toBeGreaterThan(fingerTalkCurlBoost(0));
    /** @type {Record<string, { x: number, y: number, z: number }>} */
    const applied = {};
    const count = applyFingerRestPose((name, rot) => {
      applied[name] = rot;
    }, { talkBlend: 1 });
    expect(count).toBe(30);
    expect(applied.leftIndexProximal.z).toBeGreaterThan(
      VRM_FINGER_REST_ROTATIONS.leftIndexProximal.z,
    );
  });

  it("wiggles idle fingers over time", () => {
    expect(fingerIdleWiggle(0.4, 0)).toBeGreaterThan(0.04);
    expect(fingerIdleWiggle(1.1, 0)).not.toBe(fingerIdleWiggle(0.2, 0));
  });

  it("keeps optional Mixamo raw-axis helper but defaults normalized fingers to Z", () => {
    /** @type {Record<string, { x: number, y: number, z: number }>} */
    const applied = {};
    applyFingerRestPose((name, rot) => {
      applied[name] = rot;
    }, { flexAxis: "x" });
    expect(applied.leftIndexProximal.x).toBeGreaterThan(
      VRM_FINGER_REST_ROTATIONS.leftIndexProximal.x + 0.2,
    );
    expect(inferFingerFlexAxis({
      getRawBoneNode: () => ({ name: "mixamorig_LeftHandIndex1" }),
    })).toBe("z");
    expect(inferFingerFlexAxis({
      getNormalizedBoneNode: () => ({ name: "J_Bip_L_Index1" }),
    })).toBe("z");
  });
});

describe("finger rest on the body rig", () => {
  it("curls idle fingers instead of leaving them as sticks", () => {
    const bones = new Map();
    for (const name of [
      "leftUpperArm",
      "rightUpperArm",
      "leftLowerArm",
      "rightLowerArm",
      "leftHand",
      "rightHand",
      ...VRM_FINGER_BONE_NAMES,
    ]) {
      bones.set(name, { rotation: { x: 0, y: 0, z: 0 } });
    }
    const humanoid = {
      getNormalizedBoneNode: (name) => bones.get(name) || null,
      getRawBoneNode: (name) => bones.get(name) || null,
      resetNormalizedPose: () => {},
      update: () => {},
    };
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(false);
    motion.update(1 / 30);
    expect(Math.abs(bones.get("leftIndexProximal").rotation.z)).toBeGreaterThan(0.5);
    expect(Math.abs(bones.get("rightIndexProximal").rotation.z)).toBeGreaterThan(0.5);
    expect(Math.abs(bones.get("leftIndexIntermediate").rotation.z)).toBeGreaterThan(0.6);
  });

  it("re-applies Z curl after a library clip would straighten Mixamo hands", () => {
    const bones = new Map();
    for (const name of VRM_FINGER_BONE_NAMES) {
      bones.set(name, { rotation: { x: 0, y: 0, z: 0 } });
    }
    const humanoid = {
      getNormalizedBoneNode: (name) => bones.get(name) || null,
      getRawBoneNode: (name) => ({
        name: name.startsWith("left") ? "LeftHandIndex1" : "RightHandIndex1",
        rotation: bones.get(name).rotation,
      }),
      resetNormalizedPose: () => {},
      update: () => {},
    };
    const motion = createCompanionBodyMotion(humanoid);
    bones.get("leftIndexProximal").rotation.x = 0;
    bones.get("leftIndexProximal").rotation.z = 0;
    motion.applyHandRestOnly({ talkBlend: 0.4, elapsedSec: 0.8 });
    expect(Math.abs(bones.get("leftIndexProximal").rotation.z)).toBeGreaterThan(0.5);
    expect(bones.get("leftIndexProximal").rotation.x).toBeLessThan(0.1);
  });
});
