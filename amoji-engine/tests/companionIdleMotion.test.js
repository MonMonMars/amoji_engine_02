import { describe, expect, it, vi } from "vitest";
import {
  advanceIdleBeat,
  BOOT_SIMPLE_IDLE_SEC,
  createIdleBeatState,
  pickProceduralIdleBeat,
  sampleCalmBreathIdle,
  sampleIdleBodyMotion,
  sampleIdleExpressionBlend,
  mergePlantedAliveIdleIntoPose,
  samplePlantedAliveIdle,
  sampleSimpleBootIdleMotion,
  startIdleBeat,
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

  it("animates neutral idle facial overlays", () => {
    const a = sampleIdleExpressionBlend(0.4, "neutral");
    const b = sampleIdleExpressionBlend(2.1, "neutral");
    expect(a.Happy ?? 0).toBeGreaterThan(0.12);
    expect(b.Happy ?? 0).toBeGreaterThan(0.12);
    expect(a.Happy).not.toBe(b.Happy);
  });

  it("advances idle beat overlay", () => {
    const state = createIdleBeatState(0);
    state.nextAt = 0;
    const first = advanceIdleBeat(state, 0.05, 100);
    expect(first.state.beat).toBeTruthy();
    expect(Object.keys(first.overlay).length).toBeGreaterThan(0);
  });

  it("plays a breathe beat without raising arms high", () => {
    const state = startIdleBeat(createIdleBeatState(0), "breathe", 10);
    const first = advanceIdleBeat(state, 1.05, 10);
    expect(first.state.beat).toBe("breathe");
    expect(first.overlay.armLiftR ?? 0).toBeLessThan(0.12);
    expect(first.overlay.forearmR ?? 0).toBeLessThan(0.12);
  });

  it("plays a look-around beat that turns the head", () => {
    const state = startIdleBeat(createIdleBeatState(0), "look", 10);
    const first = advanceIdleBeat(state, 0.8, 10);
    expect(first.state.beat).toBe("look");
    expect(Math.abs(first.overlay.headZ)).toBeGreaterThan(0.08);
  });

  it("schedules the next idle life beat after the current beat finishes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = createIdleBeatState(0);
    state.nextAt = 0;
    const first = advanceIdleBeat(state, 0.05, 10);
    expect(first.state.beat).toBeTruthy();
    expect(first.state.nextAt).toBeGreaterThan(10 + 1400);
    expect(first.state.nextAt).toBeLessThan(10 + 2400);
    vi.restoreAllMocks();
  });

  it("shifts weight without striding the planted legs", () => {
    const state = startIdleBeat(createIdleBeatState(0), "shift", 10);
    const first = advanceIdleBeat(state, 1.05, 10);
    expect(first.state.beat).toBe("shift");
    expect(first.overlay.upperLegL ?? 0).toBe(0);
    expect(first.overlay.lowerLegR ?? 0).toBe(0);
    expect(Math.abs(first.overlay.hipZ || 0) + Math.abs(first.overlay.leanY || 0)).toBeGreaterThan(0.01);
  });

  it("keeps idle rest soft-smile without Relaxed jaw/lid hazards", () => {
    const blend = sampleIdleExpressionBlend(1.2, "neutral");
    expect(blend.Happy ?? 0).toBeGreaterThan(0.1);
    expect(blend.Relaxed ?? 0).toBe(0);
    expect(blend.Surprised ?? 0).toBeLessThan(0.12);
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
    expect(boot.forearmL).toBeGreaterThan(0.12);
    expect(boot.forearmR).toBeGreaterThan(0.08);
    expect(boot.armLiftL).toBeGreaterThan(0.12);
    expect(boot.upperLegR).toBeLessThan(0.05);
    expect(boot.lowerLegR).toBeLessThan(0.14);
  });

  it("samples a planted calm-breath idle without limb sway", () => {
    const a = sampleCalmBreathIdle(0.4);
    const b = sampleCalmBreathIdle(2.1);
    expect(Math.abs(a.leanY)).toBeLessThan(0.012);
    expect(a.headZ).toBe(0);
    expect(a.forearmL).toBeGreaterThan(0.12);
    expect(a.lowerLegR).toBe(0);
    expect(a.upperLegR).toBe(0);
    expect(a.spineX).not.toBe(b.spineX);
  });

  it("keeps standing idle large enough to read in a portrait crop", () => {
    const idle = sampleIdleBodyMotion(1.4);
    expect(Math.abs(idle.leanY) + Math.abs(idle.headZ)).toBeGreaterThan(0.06);
    expect(idle.armLiftL).toBeGreaterThan(0.08);
    expect(idle.forearmL).toBeGreaterThan(0.3);
    expect(idle.upperLegR).toBe(0);
    expect(idle.lowerLegR).toBe(0);
  });

  it("plants legs while the upper body breathes and looks around", () => {
    const a = samplePlantedAliveIdle(0.5);
    const b = samplePlantedAliveIdle(2.3);
    expect(a.lowerLegR).toBe(0);
    expect(a.upperLegR).toBe(0);
    expect(a.forearmL).toBeGreaterThan(0.12);
    expect(a.armLiftL).toBeGreaterThan(0.04);
    expect(Math.abs(a.headZ) + Math.abs(a.leanY) + Math.abs(a.spineX)).toBeGreaterThan(0.02);
    expect(a.headZ).not.toBe(b.headZ);
  });

  it("merges A-pose idle without procedural upper-arm lift channels", () => {
    const base = { headX: 0, leanY: 0.01 };
    const merged = mergePlantedAliveIdleIntoPose(base, 1.2, {
      bind: "apose",
    });
    expect(merged.armLiftL ?? 0).toBe(0);
    expect(merged.armLiftR ?? 0).toBe(0);
    expect(merged.upperLegL ?? 0).toBe(0);
    expect(Math.abs(merged.forearmL ?? 0)).toBeGreaterThan(0.04);
    expect(Math.abs(merged.headX ?? 0)).toBeGreaterThan(0.012);
  });

  it("merges T-pose idle with low-weight arm lift (no full-channel blend)", () => {
    const base = { headX: 0, leanY: 0.01 };
    const merged = mergePlantedAliveIdleIntoPose(base, 1.2, { bind: "tpose" });
    expect(merged.upperLegL ?? 0).toBe(0);
    expect(Math.abs(merged.armLiftL ?? 0)).toBeLessThan(0.12);
    expect(Math.abs(merged.forearmL ?? 0)).toBeGreaterThan(0.04);
  });

  it("can force a look or breathe idle-life beat", () => {
    const look = startIdleBeat(createIdleBeatState(0), "look", 10);
    expect(look.beat).toBe("look");
    expect(look.duration).toBeGreaterThan(1);
    const breathe = startIdleBeat(createIdleBeatState(0), "breathe", 10);
    expect(breathe.beat).toBe("breathe");
  });

  it("rotates procedural idle beats for wait-act ticks", () => {
    expect(pickProceduralIdleBeat(1)).toBe("breathe");
    expect(pickProceduralIdleBeat(2)).toBe("cross");
    expect(pickProceduralIdleBeat(3)).toBe("sway");
  });

  it("plays an arm-cross beat without raising both arms high", () => {
    const state = startIdleBeat(createIdleBeatState(0), "cross", 10);
    const first = advanceIdleBeat(state, 0.95, 10);
    expect(first.state.beat).toBe("cross");
    expect(first.overlay.armLiftL).toBeLessThan(0.3);
    expect(first.overlay.armLiftR).toBeLessThan(0.3);
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
      VRM_ARM_REST_ROTATIONS.leftLowerArm.x + 0.04,
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
    expect(Math.abs(rot.z - rest.z)).toBeLessThan(0.02);
    expect(bones.get("leftLowerArm").rotation.x).toBeGreaterThan(
      VRM_ARM_REST_ROTATIONS.leftLowerArm.x + 0.02,
    );
  });
});
