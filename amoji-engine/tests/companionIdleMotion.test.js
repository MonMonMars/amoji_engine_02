import { describe, expect, it } from "vitest";
import {
  advanceIdleBeat,
  createIdleBeatState,
  sampleIdleBodyMotion,
  sampleIdleExpressionBlend,
} from "../engine/companion/companionIdleMotion.js";
import { createCompanionBodyMotion } from "../engine/companion/companionBodyMotion.js";
import { VRM_ARM_REST_ROTATIONS } from "../engine/companion/companionPoseLibrary.js";

describe("companionIdleMotion", () => {
  it("samples non-zero idle sway", () => {
    const a = sampleIdleBodyMotion(0.5);
    const b = sampleIdleBodyMotion(2.3);
    expect(Math.abs(a.leanY)).toBeGreaterThan(0.01);
    expect(a.headZ).not.toBe(b.headZ);
  });

  it("advances idle beat overlay", () => {
    const state = createIdleBeatState(0);
    state.nextAt = 0;
    const first = advanceIdleBeat(state, 0.05, 100);
    expect(first.state.beat).toBeTruthy();
    expect(Object.keys(first.overlay).length).toBeGreaterThan(0);
  });

  it("adds idle expression life", () => {
    const blend = sampleIdleExpressionBlend(1.2, "neutral");
    expect(blend.Relaxed).toBeGreaterThan(0.15);
    expect(blend.Happy).toBeGreaterThan(0.05);
  });
});

describe("idle body motion integration", () => {
  it("moves arms while idle without talking", () => {
    const bones = new Map();
    for (const name of [
      "leftUpperArm",
      "rightUpperArm",
      "leftLowerArm",
      "rightLowerArm",
      "head",
      "spine",
      "chest",
      "hips",
    ]) {
      bones.set(name, { rotation: { x: 0, y: 0, z: 0 } });
    }
    const humanoid = {
      getNormalizedBoneNode: (name) => bones.get(name) || null,
    };
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(false);
    for (let i = 0; i < 60; i += 1) motion.update(1 / 30);
    const rot = bones.get("leftUpperArm").rotation;
    const rest = VRM_ARM_REST_ROTATIONS.leftUpperArm;
    expect(Math.abs(rot.z - rest.z)).toBeGreaterThan(0.01);
  });
});
