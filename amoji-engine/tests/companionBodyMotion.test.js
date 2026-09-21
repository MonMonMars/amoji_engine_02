import { describe, expect, it } from "vitest";
import { createCompanionBodyMotion } from "../engine/companion/companionBodyMotion.js";
import {
  VRM_ARM_REST_ROTATIONS,
  VRM_LEG_REST_ROTATIONS,
} from "../engine/companion/companionPoseLibrary.js";

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
    "leftIndexProximal",
    "rightIndexProximal",
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
    for (let i = 0; i < 45; i += 1) {
      motion.update(1 / 30);
      motion.applyHandRestOnly({ talkBlend: 0 });
    }
    const head = humanoid.bones.get("head").rotation;
    expect(Math.abs(head.x) + Math.abs(head.z)).toBeGreaterThan(0.008);
    const rot = humanoid.bones.get("leftUpperArm").rotation;
    const rest = VRM_ARM_REST_ROTATIONS.leftUpperArm;
    expect(Math.abs(rot.z - rest.z)).toBeLessThan(0.02);
    const leftKnee = humanoid.bones.get("leftLowerLeg").rotation.x;
    const rightKnee = humanoid.bones.get("rightLowerLeg").rotation.x;
    expect(leftKnee).toBeGreaterThan(0.18);
    expect(rightKnee).toBeGreaterThan(0.18);
    expect(Math.abs(rightKnee - leftKnee)).toBeLessThan(0.12);
    expect(humanoid.bones.get("leftHand").rotation.y).not.toBe(0);
    expect(Math.abs(humanoid.bones.get("hips").rotation.z)).toBeLessThanOrEqual(
      0.02,
    );
    expect(
      Math.abs(humanoid.bones.get("leftIndexProximal").rotation.z),
    ).toBeGreaterThan(0.5);
  });

  it("does not pitch thighs or both arms forward while idle", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(false);
    for (let i = 0; i < 60; i += 1) motion.update(1 / 30);
    const leftThigh = humanoid.bones.get("leftUpperLeg").rotation.x;
    const rightThigh = humanoid.bones.get("rightUpperLeg").rotation.x;
    expect(leftThigh).toBeLessThan(VRM_LEG_REST_ROTATIONS.leftUpperLeg.x + 0.05);
    expect(rightThigh).toBeLessThan(VRM_LEG_REST_ROTATIONS.rightUpperLeg.x + 0.05);
    const leftArmX = humanoid.bones.get("leftUpperArm").rotation.x;
    const rightArmX = humanoid.bones.get("rightUpperArm").rotation.x;
    expect(leftArmX).toBeLessThan(VRM_ARM_REST_ROTATIONS.leftUpperArm.x + 0.08);
    expect(rightArmX).toBeLessThan(VRM_ARM_REST_ROTATIONS.rightUpperArm.x + 0.08);
  });

  it("hair idle beat nudges the right arm without kicking the legs forward", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setIdleGender("female");
    motion.setTalking(false);
    const t0 = 1000;
    motion.setArmRestRotations(VRM_ARM_REST_ROTATIONS);
    motion.pulseIdleBeat("hair", t0);
    for (let i = 0; i < 24; i += 1) motion.update(1 / 30, { now: t0 + i * 33 });
    const restR = VRM_ARM_REST_ROTATIONS.rightUpperArm;
    const z = humanoid.bones.get("rightUpperArm").rotation.z;
    expect(Math.abs(z - restR.z)).toBeGreaterThan(0.04);
    expect(humanoid.bones.get("leftUpperLeg").rotation.x).toBeLessThan(
      VRM_LEG_REST_ROTATIONS.leftUpperLeg.x + 0.05,
    );
  });

  it("reactToPoke shakes upper body without root bob or leg lift", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(false);
    motion.reactToPoke({ point: { x: 0.15 }, anchorX: 0, multiClick: false });
    for (let i = 0; i < 12; i += 1) motion.update(1 / 30);
    expect(motion.pokeShakeActive).toBe(true);
    expect(motion.getRootMotion().y).toBe(0);
    expect(motion.getRootMotion().rotY).toBe(0);
    const head = humanoid.bones.get("head").rotation;
    expect(Math.abs(head.x) + Math.abs(head.z)).toBeGreaterThan(0.008);
    const leftThigh = humanoid.bones.get("leftUpperLeg").rotation.x;
    expect(leftThigh).toBeCloseTo(VRM_LEG_REST_ROTATIONS.leftUpperLeg.x, 1);
  });

  it("keeps idle root Y planted without vertical bob", () => {
    const humanoid = mockHumanoid();
    humanoid.bones.get("leftFoot").getWorldPosition = (v) => {
      v.y = 0.05;
      return v;
    };
    humanoid.bones.get("rightFoot").getWorldPosition = (v) => {
      v.y = 0.02;
      return v;
    };
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(false);
    motion.update(1 / 30);
    expect(motion.getRootMotion().y).toBe(0);
  });

  it("plants root Y while talking so a floating foot comes back to the floor", () => {
    const humanoid = mockHumanoid();
    humanoid.bones.get("leftFoot").getWorldPosition = (v) => {
      v.y = 0.05;
      return v;
    };
    humanoid.bones.get("rightFoot").getWorldPosition = (v) => {
      v.y = 0.02;
      return v;
    };
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(true);
    motion.update(1 / 30);
    expect(motion.getRootMotion().y).toBeCloseTo(-0.02);
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

  it("uses smaller idle arm lift on A-pose rigs", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setArmBind("apose");
    motion.setArmRestRotations({
      leftUpperArm: { x: 0.05, y: 0.06, z: -0.14 },
      rightUpperArm: { x: 0.04, y: -0.05, z: 0.14 },
      leftLowerArm: { x: 0.14, y: 0.05, z: 0.05, flexAxis: "x" },
      rightLowerArm: { x: 0.12, y: -0.04, z: -0.04, flexAxis: "x" },
    });
    motion.snapToRestPose();
    const lua = humanoid.bones.get("leftUpperArm");
    expect(Math.abs(lua.rotation.z)).toBeLessThan(0.35);
  });

  it("keeps idle upper-arm X near calibrated rest (no forward Mixamo blend)", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setArmBind("tpose");
    motion.setArmRestRotations({
      leftUpperArm: { x: 0.06, y: 0.08, z: -1.42 },
      rightUpperArm: { x: 0.05, y: -0.06, z: 1.42 },
      leftLowerArm: { x: 0.62, y: 0.14, z: 0.1, flexAxis: "x" },
      rightLowerArm: { x: 0.5, y: -0.1, z: -0.08, flexAxis: "x" },
    });
    motion.resetIdleLife(performance.now());
    for (let i = 0; i < 120; i += 1) {
      motion.update(1 / 30);
      motion.reapplyPlantedLimbs?.();
    }
    const lua = humanoid.bones.get("leftUpperArm");
    const rua = humanoid.bones.get("rightUpperArm");
    expect(lua.rotation.x).toBeLessThan(0.2);
    expect(rua.rotation.x).toBeLessThan(0.2);
  });

  it("keeps A-pose idle arms on calibrated rest (not procedural lift blend)", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setArmBind("apose");
    motion.setArmRestRotations({
      leftUpperArm: { x: 0.05, y: 0.06, z: -0.14 },
      rightUpperArm: { x: 0.04, y: -0.05, z: 0.14 },
      leftLowerArm: { x: 0.14, y: 0.05, z: 0.05, flexAxis: "x" },
      rightLowerArm: { x: 0.12, y: -0.04, z: -0.04, flexAxis: "x" },
    });
    motion.setTalking(false);
    motion.resetIdleLife(performance.now());
    for (let i = 0; i < 90; i += 1) motion.update(1 / 30);
    const lua = humanoid.bones.get("leftUpperArm");
    expect(Math.abs(lua.rotation.z)).toBeLessThan(0.22);
    const head = humanoid.bones.get("head");
    expect(Math.abs(head.rotation.x) + Math.abs(head.rotation.z)).toBeGreaterThan(
      0.012,
    );
  });

  it("clears talk limb channels when speech stops (no blended hang)", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(true);
    motion.setTalkEnergy(0.85);
    for (let i = 0; i < 30; i += 1) motion.update(1 / 30);
    motion.setTalking(false);
    for (let i = 0; i < 8; i += 1) motion.update(1 / 30);
    const leftThigh = humanoid.bones.get("leftUpperLeg").rotation.x;
    const rightThigh = humanoid.bones.get("rightUpperLeg").rotation.x;
    expect(leftThigh).toBeLessThan(VRM_LEG_REST_ROTATIONS.leftUpperLeg.x + 0.06);
    expect(rightThigh).toBeLessThan(VRM_LEG_REST_ROTATIONS.rightUpperLeg.x + 0.06);
    const lua = humanoid.bones.get("leftUpperArm").rotation;
    const rest = VRM_ARM_REST_ROTATIONS.leftUpperArm;
    expect(Math.abs(lua.z - rest.z)).toBeLessThan(0.12);
  });

  it("bends the calibrated knee axis at rest", () => {
    const humanoid = mockHumanoid();
    const motion = createCompanionBodyMotion(humanoid);
    motion.setLegRestRotations({
      leftUpperLeg: { x: 0.08, y: 0, z: 0 },
      rightUpperLeg: { x: 0.2, y: 0, z: 0 },
      leftLowerLeg: { x: 0.06, y: 0, z: 0.3, flexAxis: "z" },
      rightLowerLeg: { x: 0.06, y: 0, z: 0.5, flexAxis: "z" },
    });
    motion.setTalking(false);
    motion.snapToRestPose();
    expect(humanoid.bones.get("rightLowerLeg").rotation.z).toBeGreaterThan(0.45);
    expect(humanoid.bones.get("leftLowerArm").rotation.x).toBeGreaterThan(0.63);
  });
});
