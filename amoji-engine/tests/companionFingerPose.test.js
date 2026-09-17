import { describe, expect, it } from "vitest";
import {
  applyFingerRestPose,
  fingerTalkCurlBoost,
  VRM_FINGER_BONE_NAMES,
  VRM_FINGER_REST_ROTATIONS,
} from "../engine/companion/companionFingerPose.js";
import { createCompanionBodyMotion } from "../engine/companion/companionBodyMotion.js";

describe("companionFingerPose", () => {
  it("authors a rest curl for every VRM finger bone", () => {
    expect(VRM_FINGER_BONE_NAMES.length).toBe(30);
    expect(VRM_FINGER_REST_ROTATIONS.leftIndexProximal.z).toBeGreaterThan(0.2);
    expect(VRM_FINGER_REST_ROTATIONS.rightIndexProximal.z).toBeLessThan(-0.2);
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
    expect(Math.abs(bones.get("leftIndexProximal").rotation.z)).toBeGreaterThan(0.25);
    expect(Math.abs(bones.get("rightIndexProximal").rotation.z)).toBeGreaterThan(0.25);
  });
});
