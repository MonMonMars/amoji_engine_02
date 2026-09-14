import { describe, expect, it } from "vitest";
import {
  createMicLevelSmoother,
  normalizeMicLevel,
  rmsFromByteTimeDomain,
} from "../engine/companion/companionMicLevel.js";

describe("companionMicLevel", () => {
  it("computes RMS from byte time-domain buffer", () => {
    const buf = new Uint8Array(4);
    buf[0] = 128;
    buf[1] = 158;
    buf[2] = 98;
    buf[3] = 128;
    const rms = rmsFromByteTimeDomain(buf);
    expect(rms).toBeGreaterThan(0.05);
    expect(rms).toBeLessThan(0.2);
  });

  it("normalizes quiet and loud RMS into 0–1", () => {
    expect(normalizeMicLevel(0)).toBe(0);
    expect(normalizeMicLevel(0.13)).toBe(1);
    expect(normalizeMicLevel(0.065)).toBeGreaterThan(0.4);
    expect(normalizeMicLevel(0.065)).toBeLessThan(0.6);
  });

  it("smooths level changes over pushes", () => {
    const meter = createMicLevelSmoother(0.5);
    meter.push(0.13);
    const first = meter.level;
    meter.push(0);
    expect(meter.level).toBeLessThan(first);
    meter.reset();
    expect(meter.level).toBe(0);
  });
});
