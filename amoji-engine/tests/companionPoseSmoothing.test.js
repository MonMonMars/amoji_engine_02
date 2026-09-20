import { describe, expect, it } from "vitest";
import {
  actionMotionEnvelope,
  dampPose,
  POSE_CHANNELS,
  poseDampingRate,
} from "../engine/companion/companionPoseSmoothing.js";

describe("companionPoseSmoothing", () => {
  it("tracks full-body pose channels including head Y and shoulders", () => {
    expect(POSE_CHANNELS).toContain("headY");
    expect(POSE_CHANNELS).toContain("shoulderL");
    expect(POSE_CHANNELS).toContain("eatChew");
    expect(POSE_CHANNELS.length).toBeGreaterThanOrEqual(20);
  });

  it("eases action enter and exit", () => {
    expect(actionMotionEnvelope(0, 2, 0.4, 0.4, false)).toBe(0);
    expect(actionMotionEnvelope(0.2, 2, 0.4, 0.4, false)).toBeGreaterThan(0.2);
    expect(actionMotionEnvelope(1, 2, 0.4, 0.4, false)).toBeGreaterThan(0.5);
    expect(actionMotionEnvelope(1, 2, 0.4, 0.4, true)).toBeGreaterThan(0.5);
  });

  it("uses responsive idle damping for visible breathing", () => {
    expect(poseDampingRate(false, false)).toBeGreaterThan(14);
    expect(poseDampingRate(false, false)).toBeGreaterThan(
      poseDampingRate(true, false),
    );
  });

  it("decays missing limb channels toward zero instead of holding stale flex", () => {
    const current = { forearmL: 0.42, headX: 0.02 };
    const target = { headX: 0.01 };
    const next = dampPose(current, target, 1 / 30, 20);
    expect(next.forearmL).toBeLessThan(0.42);
    expect(next.forearmL).toBeGreaterThan(0);
    expect(next.headX).toBeLessThan(0.02);
  });
});
