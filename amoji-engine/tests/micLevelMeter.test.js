import { describe, expect, it } from "vitest";
import { createMicLevelMeter } from "../engine/lab/micLevelMeter.js";

function loudFrame(n = 480) {
  return new Int16Array(n).fill(12_000);
}

function silentFrame(n = 480) {
  return new Int16Array(n);
}

describe("micLevelMeter", () => {
  it("smooths energy and reports over-threshold speech", () => {
    const meter = createMicLevelMeter({
      alpha: 1,
      peakDecay: 1,
      threshold: 0.05,
    });
    expect(meter.push(silentFrame()).over).toBe(false);
    const loud = meter.push(loudFrame());
    expect(loud.level).toBeGreaterThan(0.05);
    expect(loud.over).toBe(true);
    expect(loud.peak).toBeGreaterThanOrEqual(loud.level);
    expect(meter.formatHud()).toMatch(/SPEECH/);
  });

  it("setThreshold updates speech gate", () => {
    const meter = createMicLevelMeter({ alpha: 1, threshold: 0.9 });
    meter.push(loudFrame());
    expect(meter.snapshot().over).toBe(false);
    meter.setThreshold(0.01);
    expect(meter.snapshot().over).toBe(true);
    meter.reset();
    expect(meter.level).toBe(0);
    expect(meter.formatHud()).toMatch(/quiet/);
  });
});
