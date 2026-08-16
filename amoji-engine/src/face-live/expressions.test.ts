import { describe, expect, it } from "vitest";
import {
  inferExpressionFromText,
  lipSyncParameters,
  mouthOpenFromPcm16,
  SAKURA_EXPRESSION_PRESETS,
} from "./expressions.js";

describe("expressions", () => {
  it("maps keywords to expressions", () => {
    expect(inferExpressionFromText("哈哈好開心呀！")).toBe("happy");
    expect(inferExpressionFromText("哇！真係？")).toBe("surprised");
    expect(inferExpressionFromText("我諗緊點解")).toBe("thinking");
    expect(inferExpressionFromText("今日天氣幾好")).toBe("neutral");
  });

  it("derives mouth openness from audio RMS", () => {
    const silent = new Int16Array(256);
    expect(mouthOpenFromPcm16(silent)).toBe(0);

    const loud = new Int16Array(256).fill(16_000);
    expect(mouthOpenFromPcm16(loud)).toBeGreaterThan(0.5);
  });

  it("builds lip-sync parameters", () => {
    const loud = new Int16Array(128).fill(12_000);
    const params = lipSyncParameters(loud);
    expect(params.some((p) => p.id === "ParamMouthOpenY")).toBe(true);
    const mouth = params.find((p) => p.id === "ParamMouthOpenY");
    expect(mouth?.value).toBeGreaterThan(0);
  });

  it("defines presets for every expression", () => {
    const expressions = Object.keys(SAKURA_EXPRESSION_PRESETS);
    expect(expressions).toContain("neutral");
    expect(expressions).toContain("happy");
    expect(SAKURA_EXPRESSION_PRESETS.happy.length).toBeGreaterThan(0);
  });
});
