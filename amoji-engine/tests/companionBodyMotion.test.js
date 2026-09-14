import { describe, expect, it } from "vitest";
import { createCompanionBodyMotion } from "../engine/companion/companionBodyMotion.js";
import { VRM_ARM_REST_ROTATIONS } from "../engine/companion/companionPoseLibrary.js";

function mockHumanoid() {
  const bones = new Map();
  const names = [
    "leftUpperArm",
    "rightUpperArm",
    "leftLowerArm",
    "rightLowerArm",
    "head",
    "spine",
    "chest",
    "hips",
  ];
  for (const name of names) {
    bones.set(name, { rotation: { x: 0.5, y: 0.5, z: 0.5 } });
  }
  return {
    getNormalizedBoneNode: (name) => bones.get(name) || null,
    getRawBoneNode: (name) => bones.get(name) || null,
    resetNormalizedPose: () => {},
    update: () => {},
    bones,
  };
}

describe("createCompanionBodyMotion", () => {
  it("forces arm bones to A-pose rest every frame", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setEmotion("happy");
    motion.setTalking(true);
    motion.update(1 / 60);
    for (const name of [
      "leftUpperArm",
      "rightUpperArm",
      "leftLowerArm",
      "rightLowerArm",
    ]) {
      const rot = humanoid.bones.get(name).rotation;
      const rest = VRM_ARM_REST_ROTATIONS[name];
      expect(rot.x).toBe(rest.x);
      expect(rot.y).toBe(rest.y);
      expect(rot.z).toBe(rest.z);
    }
  });

  it("uses content-aware nod for happy laughter without arm overlay", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.playGestureForText("哈哈好開心！", { emotion: "happy" });
    expect(motion.activeGesture).toBe("nod");
    expect(motion.emotion).toBe("happy");
  });

  it("remaps happy speech chunks away from celebrate", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setEmotion("happy");
    const style = motion.reactToSpeechChunk("你好呀！", { emotion: "happy" });
    expect(style).toBe("soft");
  });

  it("allows nod gesture without arm overlay", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.playGesture("nod");
    expect(motion.activeGesture).toBe("nod");
    motion.update(1 / 60);
    const rot = humanoid.bones.get("leftUpperArm").rotation;
    expect(rot.z).toBe(VRM_ARM_REST_ROTATIONS.leftUpperArm.z);
  });
});
