import { describe, expect, it } from "vitest";
import { clampActionPose, clampArmPose, clampTalkArmPose } from "../engine/companion/companionPoseLibrary.js";

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
});
