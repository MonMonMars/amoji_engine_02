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
    expect(happy.browser.pitch).toBeGreaterThan(neutral.browser.pitch);
    expect(happy.browser.rate).toBeGreaterThan(neutral.browser.rate);
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
    const stmtPitch = Number(statement.edge.pitch.replace(/[^0-9-]/g, ""));
    const qPitch = Number(question.edge.pitch.replace(/[^0-9-]/g, ""));
    expect(qPitch).toBeGreaterThan(stmtPitch);
  });

  it("builds Cantonese instruct lines", () => {
    const instruct = buildTtsInstruct({
      emotion: "happy",
      nuance: "excited",
      lang: "yue",
    });
    expect(instruct).toMatch(/粵語/);
    expect(instruct).toMatch(/happy|活力| cheerful/i);
  });

  it("normalizes legacy emotion string", () => {
    const perf = normalizeTtsPerformance("happy");
    expect(perf.emotion).toBe("happy");
    expect(perf.nuance).toBe("none");
  });

  it("resolves per-chunk performance from text", () => {
    const chunk = resolveChunkTtsPerformance("哈哈好開心呀！", {
      emotion: "happy",
    });
    expect(chunk.emotion).toBeTruthy();
    expect(chunk.prosody.edge.rate).toMatch(/^[+-]\d+%$/);
    expect(chunk.speechEnergy).toBeGreaterThan(0.4);
  });
});
