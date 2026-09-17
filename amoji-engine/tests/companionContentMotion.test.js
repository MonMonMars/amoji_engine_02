import { describe, expect, it } from "vitest";
import {
  analyzeCompanionReply,
  analyzeSpeechChunk,
  analyzeStreamingReply,
  analyzeUserInput,
  buildVrmExpressionBlend,
  inferContentNuance,
  inferOneShotGesture,
  parseReplyMood,
  pickNextThinkingPhrase,
  pickThinkingPhrase,
} from "../engine/companion/companionContentMotion.js";

describe("companionContentMotion", () => {
  it("parses mood tags", () => {
    const parsed = parseReplyMood("你好呀！[mood:happy]");
    expect(parsed.reply).toBe("你好呀！");
    expect(parsed.emotion).toBe("happy");
  });

  it("detects shy nuance from Cantonese blush cues", () => {
    expect(inferContentNuance("哎呀，講到咁我會面紅㗎")).toBe("shy");
  });

  it("maps love + happy reply to soft talk and nod gesture", () => {
    const content = analyzeCompanionReply("我都好鍾意你呀！", "happy");
    expect(content.emotion).toBe("happy");
    expect(content.nuance).toBe("love");
    expect(content.talkStyle).toBe("soft");
    expect(content.gesture).toBe("nod");
    expect(content.expressionBlend.Happy).toBeGreaterThan(0.7);
  });

  it("maps curious questions to question style", () => {
    const content = analyzeCompanionReply("好奇喎，點解會咁？", "thinking");
    expect(content.emotion).toBe("thinking");
    expect(content.nuance).toBe("curious");
    expect(content.talkStyle).toBe("question");
  });

  it("builds excited expression blend without sleepy Relaxed lids", () => {
    const blend = buildVrmExpressionBlend("happy", "excited");
    expect(blend.Happy).toBeGreaterThan(0.85);
    expect(blend.Surprised).toBeGreaterThan(0.1);
    expect(blend.Relaxed ?? 0).toBe(0);
  });

  it("does not use Relaxed for thinking", () => {
    const blend = buildVrmExpressionBlend("thinking", "curious");
    expect(blend.Relaxed ?? 0).toBe(0);
  });

  it("keeps untagged rest emotion morph-neutral", () => {
    const blend = buildVrmExpressionBlend("neutral", "none");
    expect(blend.Happy ?? 0).toBe(0);
    expect(blend.Relaxed ?? 0).toBe(0);
    expect(blend.Surprised ?? 0).toBe(0);
  });

  it("defaults untagged spoken replies to a warm happy performance", () => {
    const content = analyzeCompanionReply("你好呀！一齊傾偈啦");
    expect(content.emotion).toBe("happy");
    expect(content.nuance).toBe("excited");
    expect(content.speechEnergy).toBeGreaterThan(0.75);
  });

  it("infers user worry as stress nuance for thinking pose", () => {
    const input = analyzeUserInput("我好擔心呀", false);
    expect(input.nuance).toBe("stress");
    expect(input.expressionBlend).toBeTruthy();
  });

  it("streams partial reply into thinking then happy emotion", () => {
    const early = analyzeStreamingReply("");
    expect(early.emotion).toBe("thinking");
    const mid = analyzeStreamingReply("哈哈好開心");
    expect(mid.emotion).toBe("happy");
    expect(mid.talkStyle).toBeTruthy();
  });

  it("detects speech chunk boundaries for gestures", () => {
    const chunk = analyzeSpeechChunk("好呀！", { emotion: "happy" });
    expect(chunk.boundary).toBe(true);
    expect(chunk.gesture).toBe("nod");
  });

  it("picks a thinking phrase", () => {
    expect(pickThinkingPhrase(false)).toMatch(/…|\.{3}/);
    expect(pickThinkingPhrase(true).length).toBeGreaterThan(2);
    const next = pickNextThinkingPhrase(false, 0);
    expect(next.phrase.length).toBeGreaterThan(1);
    expect(next.index).toBeGreaterThanOrEqual(0);
  });
});
