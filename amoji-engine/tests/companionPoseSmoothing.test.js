import { describe, expect, it } from "vitest";
import {
  dampPose,
  dampRootMotion,
  easeInOutSine,
  idleBeatEnvelope,
} from "../engine/companion/companionPoseSmoothing.js";

describe("companionPoseSmoothing", () => {
  it("eases in and out smoothly", () => {
    expect(easeInOutSine(0)).toBeCloseTo(0, 8);
    expect(easeInOutSine(1)).toBeCloseTo(1, 8);
    expect(easeInOutSine(0.5)).toBeGreaterThan(0.45);
  });

  it("idle beat envelope peaks mid-gesture", () => {
    expect(idleBeatEnvelope(0)).toBeLessThan(0.2);
    expect(idleBeatEnvelope(0.5)).toBeGreaterThan(0.6);
    expect(idleBeatEnvelope(1)).toBeLessThan(0.2);
  });

  it("damps pose toward target", () => {
    const current = { headX: 0, leanY: 0 };
    const target = { headX: 0.2, leanY: -0.1 };
    const next = dampPose(current, target, 1 / 60, 12);
    expect(next.headX).toBeGreaterThan(0);
    expect(next.headX).toBeLessThan(0.2);
    expect(next.leanY).toBeLessThan(0);
  });

  it("damps root motion", () => {
    const next = dampRootMotion({ y: 0, rotY: 0 }, { y: 0.1, rotY: 0.5 }, 0.05);
    expect(next.y).toBeGreaterThan(0);
    expect(next.rotY).toBeGreaterThan(0);
  });
});
