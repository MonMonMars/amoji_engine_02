import { describe, expect, it } from "vitest";
import {
  buildBasePose,
  clampArmPose,
  companionGestureStyle,
  LISTENING_POSE,
  REST_POSE,
  sampleVrmTalkPose,
} from "../engine/companion/companionPoseLibrary.js";

describe("companionPoseLibrary", () => {
  it("keeps arms low at rest and while listening", () => {
    expect(REST_POSE.armLiftL).toBeLessThan(0.05);
    expect(LISTENING_POSE.armLiftL).toBeLessThan(0.05);
    const listen = buildBasePose({ listening: true, emotion: "neutral" });
    expect(listen.armLiftL).toBeLessThan(0.06);
    expect(listen.armLiftR).toBeLessThan(0.06);
  });

  it("listening adds attentive head lean without raising arms", () => {
    const idle = buildBasePose({ listening: false, emotion: "neutral" });
    const listen = buildBasePose({ listening: true, emotion: "neutral" });
    expect(listen.headZ).toBeGreaterThan(idle.headZ);
    expect(listen.armLiftL).toBe(idle.armLiftL);
  });

  it("thinking emotion does not raise arms in base pose", () => {
    const pose = buildBasePose({ emotion: "thinking" });
    expect(pose.armLiftL).toBeLessThan(0.06);
    expect(pose.forearmL ?? 0).toBeLessThan(0.05);
  });

  it("maps talk gesture library to VRM body channels", () => {
    const explain = sampleVrmTalkPose("explain", 0.5, { intensity: 0.6 });
    expect(explain.armLiftL).toBeDefined();
    expect(explain.armLiftL).toBeLessThan(0.15);
  });

  it("remaps celebrate to soft for VRM companion", () => {
    expect(companionGestureStyle("celebrate")).toBe("soft");
  });

  it("clamps arm lift", () => {
    const out = clampArmPose({ armLiftL: 0.9, armLiftR: 0.8 });
    expect(out.armLiftL).toBeLessThanOrEqual(0.14);
    expect(out.armLiftR).toBeLessThanOrEqual(0.14);
  });
});
