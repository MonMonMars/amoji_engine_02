import { describe, expect, it } from "vitest";
import { createCompanionBodyMotion } from "../engine/companion/companionBodyMotion.js";
import { enforcePlantedLimbRotations } from "../engine/companion/companionPlantedLimbLock.js";
import {
  VRM_ARM_REST_ROTATIONS,
  VRM_LEG_REST_ROTATIONS,
} from "../engine/companion/companionPoseLibrary.js";

function mockHumanoid() {
  const bones = new Map();
  for (const name of [
    "leftUpperArm",
    "rightUpperArm",
    "leftLowerArm",
    "rightLowerArm",
    "leftUpperLeg",
    "rightUpperLeg",
    "leftLowerLeg",
    "rightLowerLeg",
    "leftHand",
    "rightHand",
    "leftFoot",
    "rightFoot",
    "leftShoulder",
    "rightShoulder",
    "head",
    "spine",
    "chest",
    "hips",
  ]) {
    bones.set(name, {
      name,
      rotation: {
        x: 0.9,
        y: 0.9,
        z: 0.9,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    });
  }
  return {
    getNormalizedBoneNode: (name) => bones.get(name) || null,
    getRawBoneNode: (name) => bones.get(name) || null,
    update: () => {},
    bones,
  };
}

describe("companion planted limb finish", () => {
  it("legsOnly lock skips arm bones", () => {
    const humanoid = mockHumanoid();
    enforcePlantedLimbRotations(humanoid, {
      legRestRotations: VRM_LEG_REST_ROTATIONS,
      armRestRotations: VRM_ARM_REST_ROTATIONS,
      legsOnly: true,
    });
    expect(humanoid.bones.get("leftUpperLeg").rotation.x).toBe(
      VRM_LEG_REST_ROTATIONS.leftUpperLeg.x,
    );
    expect(humanoid.bones.get("leftUpperArm").rotation.x).toBe(0.9);
  });

  it("reapply locks forearms to calibrated rest when idle (not talking)", () => {
    const humanoid = mockHumanoid();
    humanoid.bones.get("leftLowerArm").rotation.x = 1.2;
    humanoid.bones.get("rightLowerArm").rotation.x = 1.1;
    const motion = createCompanionBodyMotion(humanoid);
    for (let i = 0; i < 8; i += 1) motion.update(1 / 30);
    motion.reapplyPlantedLimbs?.({ force: true });
    expect(humanoid.bones.get("leftLowerArm").rotation.x).toBeCloseTo(
      VRM_ARM_REST_ROTATIONS.leftLowerArm.x,
      2,
    );
    expect(humanoid.bones.get("rightLowerArm").rotation.x).toBeCloseTo(
      VRM_ARM_REST_ROTATIONS.rightLowerArm.x,
      2,
    );
  });

  it("reapply restores talk forearms after poke while speaking", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(true);
    motion.setTalkEnergy(0.8);
    for (let i = 0; i < 12; i += 1) motion.update(1 / 30);
    const before = humanoid.bones.get("leftLowerArm").rotation.x;
    motion.reactToPoke({ point: { x: 0.2 }, anchorX: 0 });
    motion.reapplyPlantedLimbs?.({ force: false });
    const after = humanoid.bones.get("leftLowerArm").rotation.x;
    expect(Math.abs(after - before)).toBeLessThan(0.08);
    const thigh = humanoid.bones.get("leftUpperLeg").rotation.x;
    expect(thigh).toBeLessThan(VRM_LEG_REST_ROTATIONS.leftUpperLeg.x + 0.06);
  });
});
