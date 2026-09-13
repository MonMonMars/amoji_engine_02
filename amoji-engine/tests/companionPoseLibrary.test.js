import { describe, expect, it } from "vitest";
import {
  buildBasePose,
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
    expect(explain.armLiftL).toBeLessThan(0.35);
  });
});
