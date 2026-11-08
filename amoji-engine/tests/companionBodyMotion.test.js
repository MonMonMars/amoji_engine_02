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
    "leftUpperLeg",
    "rightUpperLeg",
    "leftLowerLeg",
    "rightLowerLeg",
    "leftHand",
    "rightHand",
    "leftFoot",
    "rightFoot",
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
  it("applies visible arm sway while talking", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setEmotion("happy");
    motion.setTalking(true);
    motion.setTalkEnergy(0.85);
    motion.setTalkStyle("celebrate");
    for (let i = 0; i < 20; i += 1) motion.update(1 / 30);
    const rot = humanoid.bones.get("leftUpperArm").rotation;
    const rest = VRM_ARM_REST_ROTATIONS.leftUpperArm;
    expect(Math.abs(rot.z - rest.z)).toBeGreaterThan(0.04);
  });

  it("applies gentle idle sway when not talking", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(false);
    for (let i = 0; i < 45; i += 1) motion.update(1 / 30);
    const rot = humanoid.bones.get("leftUpperArm").rotation;
    const rest = VRM_ARM_REST_ROTATIONS.leftUpperArm;
    expect(Math.abs(rot.z - rest.z)).toBeGreaterThan(0.008);
    const knee = humanoid.bones.get("rightLowerLeg").rotation.x;
    expect(knee).toBeGreaterThan(0.2);
    expect(humanoid.bones.get("leftHand").rotation.y).not.toBe(0);
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
    const analysis = motion.reactToSpeechChunk("你好呀！", { emotion: "happy" });
    expect(analysis.talkStyle).toBe("celebrate");
  });

  it("plays kungfu action with visible arm lift", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.playAction("kungfu", { emotion: "happy" });
    for (let i = 0; i < 12; i += 1) motion.update(1 / 30);
    const rot = humanoid.bones.get("leftUpperArm").rotation;
    const rest = VRM_ARM_REST_ROTATIONS.leftUpperArm;
    expect(Math.abs(rot.z - rest.z)).toBeGreaterThan(0.14);
    expect(motion.currentAction).toBe("kungfu");
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

  it("plays explicit action sequences back-to-back", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    const ok = motion.playActionSequence(["wave", "nod"], { emotion: "happy" });
    expect(ok).toBe(true);
    expect(motion.currentAction).toBe("wave");
    for (let i = 0; i < 80; i += 1) motion.update(1 / 30);
    expect(motion.currentAction).toBe("nod");
  });
});
