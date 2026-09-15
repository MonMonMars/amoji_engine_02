import { describe, expect, it } from "vitest";
import {
  buildExpressiveTtsPlan,
  clausePauseMs,
  resolveClauseTtsPerformance,
  splitExpressiveClauses,
} from "../engine/companion/companionExpressiveTts.js";

describe("companionExpressiveTts", () => {
  it("splits Cantonese replies into expressive clauses", () => {
    const parts = splitExpressiveClauses("你好呀！今日天氣好好。想出去行下嗎？");
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  it("boosts happy exclamation prosody above neutral", () => {
    const happy = resolveClauseTtsPerformance("哇！真係好開心呀！", {
      emotion: "happy",
      nuance: "excited",
    });
    const neutral = resolveClauseTtsPerformance("今日係星期三。", {
      emotion: "neutral",
    });
    const happyRate = Number(happy.prosody.edge.rate.replace(/[^0-9-]/g, ""));
    const neutralRate = Number(neutral.prosody.edge.rate.replace(/[^0-9-]/g, ""));
    expect(happyRate).toBeGreaterThan(neutralRate);
    expect(happy.speechEnergy).toBeGreaterThan(0.6);
  });

  it("builds multi-clause cloud TTS plan", () => {
    const plan = buildExpressiveTtsPlan(
      "哈囉！我喺度呀。有咩想傾？",
      { emotion: "happy", nuance: "excited" },
      "kizuna",
      "zh-HK",
    );
    expect(plan.clauses.length).toBeGreaterThanOrEqual(2);
    expect(plan.clauses[0].prosody.edge.rate).toMatch(/^[+-]\d+%$/);
  });

  it("adds longer pauses after sentence endings", () => {
    expect(clausePauseMs("好呀！")).toBeGreaterThan(clausePauseMs("好呀，"));
  });
});
