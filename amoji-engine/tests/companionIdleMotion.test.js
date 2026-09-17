import { describe, expect, it, vi } from "vitest";
import {
  advanceIdleBeat,
  BOOT_SIMPLE_IDLE_SEC,
  createIdleBeatState,
  sampleCalmBreathIdle,
  sampleIdleBodyMotion,
  sampleIdleExpressionBlend,
  sampleSimpleBootIdleMotion,
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

  it("plays a comb-hair beat that lifts the right arm", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.45);
    const state = createIdleBeatState(0);
    state.nextAt = 0;
    const first = advanceIdleBeat(state, 1.05, 10);
    expect(first.state.beat).toBe("comb");
    expect(first.overlay.armLiftR).toBeGreaterThan(0.2);
    expect(first.overlay.forearmR).toBeGreaterThan(0.1);
    vi.restoreAllMocks();
  });

  it("shifts weight without striding the planted legs", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    const state = createIdleBeatState(0);
    state.nextAt = 0;
    const first = advanceIdleBeat(state, 1.05, 10);
    expect(first.state.beat).toBe("shift");
    expect(first.overlay.upperLegL ?? 0).toBe(0);
    expect(first.overlay.lowerLegR ?? 0).toBe(0);
    expect(Math.abs(first.overlay.hipZ || 0) + Math.abs(first.overlay.leanY || 0)).toBeGreaterThan(0.01);
    vi.restoreAllMocks();
  });

  it("keeps idle rest morph-neutral so jaws stay shut and lids stay open", () => {
    const blend = sampleIdleExpressionBlend(1.2, "neutral");
    expect(blend.Happy ?? 0).toBe(0);
    expect(blend.Relaxed ?? 0).toBe(0);
    expect(blend.Surprised ?? 0).toBe(0);
  });

  it("keeps Relaxed off so eyelids stay open", () => {
    const atStart = sampleIdleExpressionBlend(0, "neutral");
    const settled = sampleIdleExpressionBlend(2, "neutral");
    expect(atStart.Relaxed ?? 0).toBe(0);
    expect(settled.Relaxed ?? 0).toBe(0);
  });

  it("samples simple boot idle with relaxed forearms", () => {
    const boot = sampleSimpleBootIdleMotion(1.2);
    expect(BOOT_SIMPLE_IDLE_SEC).toBeGreaterThan(3);
    expect(boot.forearmL).toBeGreaterThan(0.32);
    expect(boot.forearmR).toBeGreaterThan(0.28);
    expect(boot.armLiftL).toBeGreaterThan(0.12);
    expect(boot.lowerLegR).toBeGreaterThan(0.2);
  });

  it("samples a planted calm-breath idle without limb sway", () => {
    const a = sampleCalmBreathIdle(0.4);
    const b = sampleCalmBreathIdle(2.1);
    expect(a.leanY).toBe(0);
    expect(a.headZ).toBe(0);
    expect(a.forearmL).toBeGreaterThan(0.32);
    expect(a.lowerLegR).toBeGreaterThan(0.1);
    expect(a.lowerLegR).toBeLessThan(0.2);
    expect(a.spineX).not.toBe(b.spineX);
  });

  it("keeps standing idle large enough to read in a portrait crop", () => {
    const idle = sampleIdleBodyMotion(1.4);
    expect(Math.abs(idle.leanY) + Math.abs(idle.headZ)).toBeGreaterThan(0.08);
    expect(idle.armLiftL).toBeGreaterThan(0.08);
    expect(idle.forearmL).toBeGreaterThan(0.3);
    expect(idle.lowerLegR + idle.upperLegR).toBeGreaterThan(0.28);
  });
});

describe("idle body motion integration", () => {
  it("resetMotionClock restores a planted bent-limb idle", () => {
    const bones = new Map();
    for (const name of ["leftUpperArm", "rightUpperArm", "leftLowerArm", "rightLowerArm"]) {
      bones.set(name, { rotation: { x: 0, y: 0, z: 0 } });
    }
    const humanoid = {
      getNormalizedBoneNode: (name) => bones.get(name) || null,
    };
    const motion = createCompanionBodyMotion(humanoid);
    motion.setTalking(false);
    for (let i = 0; i < 240; i += 1) motion.update(1 / 30);
    motion.resetMotionClock(performance.now() - 1200);
    for (let i = 0; i < 30; i += 1) motion.update(1 / 30, { now: performance.now() });
    expect(bones.get("leftLowerArm").rotation.x).toBeGreaterThan(
      VRM_ARM_REST_ROTATIONS.leftLowerArm.x + 0.12,
    );
  });

  it("keeps bent idle arms without talking", () => {
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
    expect(Math.abs(rot.z - rest.z)).toBeGreaterThan(0.008);
    expect(bones.get("leftLowerArm").rotation.x).toBeGreaterThan(
      VRM_ARM_REST_ROTATIONS.leftLowerArm.x + 0.12,
    );
  });
});
