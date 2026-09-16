import { describe, expect, it } from "vitest";
import {
  buildTtsInstruct,
  normalizeTtsPerformance,
  resolveChunkTtsPerformance,
  resolveCompanionTtsProsody,
} from "../engine/companion/companionTtsProsody.js";

describe("companionTtsProsody", () => {
  it("boosts happy excited speech above neutral", () => {
    const neutral = resolveCompanionTtsProsody({
      emotion: "neutral",
      text: "你好。",
    });
    const happy = resolveCompanionTtsProsody({
      emotion: "happy",
      nuance: "excited",
      talkStyle: "celebrate",
      speechEnergy: 0.85,
      text: "哇！真係好開心呀！",
    });
    const neutralRate = Number(neutral.edge.rate.replace(/[^0-9-]/g, ""));
    const happyRate = Number(happy.edge.rate.replace(/[^0-9-]/g, ""));
    expect(happyRate).toBeGreaterThan(neutralRate);
    expect(happyRate).toBeGreaterThan(45);
    expect(happy.browser.pitch).toBeGreaterThan(neutral.browser.pitch);
    expect(happy.browser.rate).toBeGreaterThan(neutral.browser.rate);
  });

  it("applies character-specific prosody bias", () => {
    const calm = resolveCompanionTtsProsody({
      emotion: "thinking",
      talkStyle: "thinking",
      speechEnergy: 0.45,
      text: "嗯，我明白你的意思，讓我慢慢整理一下。",
      characterId: "sora",
    });
    const hype = resolveCompanionTtsProsody({
      emotion: "thinking",
      talkStyle: "thinking",
      speechEnergy: 0.45,
      text: "嗯，我明白你的意思，讓我慢慢整理一下。",
      characterId: "kizuna",
    });
    expect(hype.browser.rate).toBeGreaterThan(calm.browser.rate);
    expect(hype.browser.pitch).toBeGreaterThan(calm.browser.pitch);
  });

  it("slows thinking delivery", () => {
    const thinking = resolveCompanionTtsProsody({
      emotion: "thinking",
      nuance: "curious",
      talkStyle: "thinking",
      speechEnergy: 0.3,
      text: "嗯…等我諗諗…",
    });
    const rate = Number(thinking.edge.rate.replace(/[^0-9-]/g, ""));
    expect(rate).toBeLessThan(6);
    expect(thinking.browser.rate).toBeLessThan(1);
  });

  it("raises pitch on questions", () => {
    const statement = resolveCompanionTtsProsody({
      emotion: "neutral",
      text: "我知呀。",
    });
    const question = resolveCompanionTtsProsody({
      emotion: "neutral",
      talkStyle: "question",
      text: "你係咪想知呀？",
    });
    expect(question.browser.pitch).toBeGreaterThan(statement.browser.pitch);
    expect(question.browser.rate).toBeGreaterThanOrEqual(statement.browser.rate);
  });

  it("builds structured instruct lines for Cantonese", () => {
    const instruct = buildTtsInstruct({
      emotion: "happy",
      nuance: "excited",
      lang: "yue",
      text: "你好呀！",
    });
    expect(instruct).toContain("Voice Affect:");
    expect(instruct).toMatch(/咬字清楚|唔好平平淡淡/);
  });

  it("normalizes legacy emotion string", () => {
    const perf = normalizeTtsPerformance("happy");
    expect(perf.emotion).toBe("happy");
    expect(perf.nuance).toBe("excited");
    expect(perf.talkStyle).toBe("celebrate");
    expect(perf.speechEnergy).toBeGreaterThan(0.75);
  });

  it("resolves per-chunk performance from text", () => {
    const chunk = resolveChunkTtsPerformance("哈哈好開心呀！", {
      emotion: "happy",
    });
    expect(chunk.emotion).toBeTruthy();
    expect(chunk.prosody.edge.rate).toMatch(/^[+-]\d+%$/);
    expect(chunk.speechEnergy).toBeGreaterThan(0.4);
  });

  it("defaults to clause-level expressive TTS", () => {
    const perf = normalizeTtsPerformance({ emotion: "happy" });
    expect(perf.expressiveClauses).toBe(true);
    expect(perf.singleUtterance).toBe(false);
    expect(perf.nuance).toBe("excited");
  });

  it("allows a single utterance when requested", () => {
    const perf = normalizeTtsPerformance({
      emotion: "happy",
      singleUtterance: true,
      expressiveClauses: false,
    });
    expect(perf.singleUtterance).toBe(true);
    expect(perf.expressiveClauses).toBe(false);
  });
});
