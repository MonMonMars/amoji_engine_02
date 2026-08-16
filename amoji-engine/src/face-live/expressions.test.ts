import { describe, expect, it } from "vitest";
import {
  inferExpressionFromText,
  lipSyncParameters,
  mouthOpenFromPcm16,
  smoothMouthOpen,
  SAKURA_EXPRESSION_PRESETS,
} from "./expressions.js";

describe("expressions", () => {
  it("maps keywords to expressions", () => {
    expect(inferExpressionFromText("哈哈好開心呀！")).toBe("happy");
    expect(inferExpressionFromText("哇！真係？")).toBe("surprised");
    expect(inferExpressionFromText("我諗緊點解")).toBe("thinking");
    expect(inferExpressionFromText("唉，好傷心")).toBe("sad");
    expect(inferExpressionFromText("今日天氣幾好")).toBe("neutral");
  });

  it("does not let punctuation steal happy cues", () => {
    expect(inferExpressionFromText("哈哈！！")).toBe("happy");
  });

  it("derives mouth openness from audio RMS", () => {
    const silent = new Int16Array(256);
    expect(mouthOpenFromPcm16(silent)).toBe(0);

    const loud = new Int16Array(256).fill(16_000);
    expect(mouthOpenFromPcm16(loud)).toBeGreaterThan(0.5);
  });

  it("smooths mouth openness between frames", () => {
    const smoothed = smoothMouthOpen(1, 0, 0.5);
    expect(smoothed).toBeCloseTo(0.5);
  });

  it("builds lip-sync parameters with optional smoothing", () => {
    const loud = new Int16Array(128).fill(12_000);
    const params = lipSyncParameters(loud, { previousMouthOpen: 0, alpha: 0.5 });
    expect(params.some((p) => p.id === "ParamMouthOpenY")).toBe(true);
    const mouth = params.find((p) => p.id === "ParamMouthOpenY");
    expect(mouth?.value).toBeGreaterThan(0);
    expect(mouth?.value).toBeLessThan(mouthOpenFromPcm16(loud));
  });

  it("defines presets for every expression", () => {
    const expressions = Object.keys(SAKURA_EXPRESSION_PRESETS);
    expect(expressions).toContain("neutral");
    expect(expressions).toContain("happy");
    expect(SAKURA_EXPRESSION_PRESETS.happy.length).toBeGreaterThan(0);
  });
});
