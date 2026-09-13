import { describe, expect, it } from "vitest";
import {
  TURN_METRICS_ROLLUP_SCHEMA,
  createTurnMetricsRollup,
  normalizeTurnMetrics,
  percentileNearest,
  summarizeSeries,
} from "../engine/lab/turnMetricsRollup.js";

describe("turnMetricsRollup", () => {
  it("percentileNearest uses nearest-rank", () => {
    expect(percentileNearest([], 50)).toBeNull();
    expect(percentileNearest([10], 95)).toBe(10);
    expect(percentileNearest([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentileNearest([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
  });

  it("summarizeSeries returns mean / p50 / p95", () => {
    const s = summarizeSeries([10, 20, 30, 40, 50]);
    expect(s.count).toBe(5);
    expect(s.mean).toBe(30);
    expect(s.p50).toBe(30);
    expect(s.min).toBe(10);
    expect(s.max).toBe(50);
  });

  it("normalizeTurnMetrics rejects incomplete rows", () => {
    expect(normalizeTurnMetrics(null)).toBeNull();
    expect(normalizeTurnMetrics({ asrMs: 1 })).toBeNull();
    expect(
      normalizeTurnMetrics({
        asrMs: 12,
        robotMs: 34,
        ttsMs: 56,
        totalMs: 102,
        chunkCount: 2,
      }),
    ).toEqual({
      asrMs: 12,
      robotMs: 34,
      ttsMs: 56,
      totalMs: 102,
      barged: false,
      chunkCount: 2,
      speechMs: null,
    });
  });

  it("createTurnMetricsRollup accumulates and formats HUD", () => {
    const rollup = createTurnMetricsRollup({ maxSamples: 3 });
    expect(rollup.formatHud()).toBe("—");

    rollup.push({ asrMs: 10, robotMs: 20, ttsMs: 30, totalMs: 60 });
    rollup.push({ asrMs: 12, robotMs: 22, ttsMs: 40, totalMs: 74, barged: true });
    rollup.push({ asrMs: 8, robotMs: 18, ttsMs: 25, totalMs: 51 });
    rollup.push({ asrMs: 100, robotMs: 100, ttsMs: 100, totalMs: 300 }); // drops oldest

    expect(rollup.length).toBe(3);
    const summary = rollup.summary();
    expect(summary.schema).toBe(TURN_METRICS_ROLLUP_SCHEMA);
    expect(summary.count).toBe(3);
    expect(summary.bargedCount).toBe(1);
    expect(summary.totalMs.p50).toBeGreaterThan(0);
    expect(rollup.formatHud()).toMatch(/^n=3 Σ p50 /);

    const json = rollup.toJSON();
    const other = createTurnMetricsRollup();
    other.fromJSON(json);
    expect(other.length).toBe(3);
    expect(other.summary().totalMs.mean).toBe(summary.totalMs.mean);

    rollup.clear();
    expect(rollup.length).toBe(0);
  });
});
