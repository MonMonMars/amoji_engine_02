import { describe, expect, it } from "vitest";
import {
  clampActionPose,
  clampArmPose,
  clampIdleArmPose,
  clampTalkArmPose,
  restDirectedLift,
  withElbowBend,
} from "../engine/companion/companionPoseLibrary.js";

describe("companionPoseLibrary clamps", () => {
  it("keeps talk gestures subtle", () => {
    const clamped = clampArmPose({ armLiftL: 0.35, forearmL: 0.2 });
    expect(clamped.armLiftL).toBeLessThanOrEqual(0.14);
    expect(clamped.forearmL).toBeLessThanOrEqual(0.12);
  });

  it("allows full-body action lifts", () => {
    const clamped = clampActionPose({ armLiftL: 0.35, forearmL: 0.2, upperLegL: 0.3 });
    expect(clamped.armLiftL).toBeGreaterThan(0.3);
    expect(clamped.upperLegL).toBeGreaterThan(0.25);
  });

  it("allows visible talk-arm lifts", () => {
    const clamped = clampTalkArmPose({ armLiftL: 0.35, forearmL: 0.2 });
    expect(clamped.armLiftL).toBeGreaterThan(0.3);
    expect(clamped.forearmL).toBeGreaterThan(0.18);
  });

  it("allows idle elbows to bend past the talk-gesture clamp", () => {
    const clamped = clampIdleArmPose({ armLiftL: 0.28, forearmL: 0.4 });
    expect(clamped.armLiftL).toBeGreaterThan(0.2);
    expect(clamped.forearmL).toBeGreaterThan(0.3);
    expect(clamped.forearmL).toBeLessThanOrEqual(0.7);
  });

  it("adds idle elbow bend on the calibrated flex axis only", () => {
    const bent = withElbowBend({ x: 0.2, y: 0.05, z: 0.1, flexAxis: "z" }, 0.3);
    expect(bent.z).toBeCloseTo(0.4);
    expect(bent.x).toBe(0);
    expect(bent.y).toBe(0);
    expect(bent.flexAxis).toBe("z");
  });

  it("lifts arms toward neutral from T-pose or flipped-Z rest", () => {
    expect(restDirectedLift(-1.42, 0.3, 1)).toBeCloseTo(-1.12);
    expect(restDirectedLift(1.42, 0.3, -1)).toBeCloseTo(1.12);
    expect(restDirectedLift(-0.14, 0.2, 1)).toBeCloseTo(0.06);
    expect(restDirectedLift(1.42, 0.92, -1)).toBeCloseTo(0.5);
  });
});
