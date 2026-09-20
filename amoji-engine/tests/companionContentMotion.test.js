import { describe, expect, it } from "vitest";
import {
  analyzeCompanionReply,
  analyzeSpeechChunk,
  analyzeStreamingReply,
  analyzeUserInput,
  blendIdleExpressionLayer,
  buildVrmExpressionBlend,
  inferActionFromEmotion,
  inferContentNuance,
  inferOneShotGesture,
  parseReplyMood,
  pickNextThinkingPhrase,
  pickThinkingPhrase,
} from "../engine/companion/companionContentMotion.js";
import { REST_NEUTRAL_HAPPY } from "../engine/companion/companionFaceRest.js";

describe("companionContentMotion", () => {
  it("parses mood tags", () => {
    const parsed = parseReplyMood("你好呀！[mood:happy]");
    expect(parsed.reply).toBe("你好呀！");
    expect(parsed.emotion).toBe("happy");
  });

  it("detects shy nuance from Cantonese blush cues", () => {
    expect(inferContentNuance("哎呀，講到咁我會面紅㗎")).toBe("shy");
  });

  it("maps moods to default body actions for avatar performance", () => {
    expect(inferActionFromEmotion("happy", "none")).toBe("nod");
    expect(inferActionFromEmotion("sad", "none")).toBe("hug");
    expect(inferActionFromEmotion("happy", "love")).toBe("fingerheart");
    expect(inferActionFromEmotion("happy", "excited")).toBe("celebrate");
    expect(inferActionFromEmotion("thinking", "curious")).toBe("thinking");
  });

  it("maps love + happy reply to soft talk and nod gesture", () => {
    const content = analyzeCompanionReply("我都好鍾意你呀！", "happy");
    expect(content.emotion).toBe("happy");
    expect(content.nuance).toBe("love");
    expect(content.talkStyle).toBe("soft");
    expect(content.gesture).toBe("nod");
    expect(content.expressionBlend.Happy).toBeGreaterThan(0.35);
  });

  it("maps curious questions to question style with upbeat face", () => {
    const content = analyzeCompanionReply("好奇喎，點解會咁？", "thinking");
    expect(content.emotion).toBe("happy");
    expect(content.nuance).toBe("curious");
    expect(content.talkStyle).toBe("question");
  });

  it("builds a mild happy blend without shocked Surprised lids", () => {
    const blend = buildVrmExpressionBlend("happy", "excited");
    expect(blend.Happy).toBeGreaterThan(0.35);
    expect(blend.Happy).toBeLessThan(0.75);
    expect(blend.Surprised ?? 0).toBe(0);
    expect(blend.Relaxed ?? 0).toBe(0);
  });

  it("keeps thinking mood warm with a visible smile", () => {
    const blend = buildVrmExpressionBlend("thinking", "curious");
    expect(blend.Relaxed ?? 0).toBe(0);
    expect(blend.Happy ?? 0).toBeGreaterThan(0.35);
    expect(blend.Sad ?? 0).toBeLessThan(0.15);
  });

  it("adds curious brow lift without thinking jaw hazards", () => {
    const blend = buildVrmExpressionBlend("happy", "curious");
    expect(blend.Surprised ?? 0).toBeGreaterThan(0.1);
    expect(blend.Happy ?? 0).toBeGreaterThan(0.5);
  });

  it("lets neutral idle expression breathe below the rest smile cap", () => {
    const base = buildVrmExpressionBlend("neutral", "none");
    const idle = { Happy: 0.18, Surprised: 0.06 };
    const merged = blendIdleExpressionLayer(base, idle, "neutral");
    expect(merged.Happy).toBe(0.18);
    expect(merged.Surprised).toBe(0.06);
  });

  it("gives neutral a soft resting smile (not a blank mask)", () => {
    const blend = buildVrmExpressionBlend("neutral", "none");
    expect(blend.Happy ?? 0).toBeGreaterThan(0.12);
    expect(blend.Happy ?? 0).toBeLessThanOrEqual(REST_NEUTRAL_HAPPY);
    expect(blend.Relaxed ?? 0).toBe(0);
  });

  it("keeps everyday Cantonese particles on a calm face", () => {
    const content = analyzeCompanionReply("你好呀！一齊傾偈啦");
    expect(content.emotion).toBe("happy");
    expect(content.nuance).toBe("none");
    expect(content.expressionBlend.Surprised ?? 0).toBe(0);
  });

  it("keeps a gentle smile on factual untagged replies", () => {
    const content = analyzeCompanionReply("而家香港大約二十七度，有幾陣雨");
    expect(content.emotion).toBe("happy");
    expect(content.expressionBlend.Happy ?? 0).toBeGreaterThan(0.2);
  });

  it("infers user worry as stress nuance for thinking pose", () => {
    const input = analyzeUserInput("我好擔心呀", false);
    expect(input.nuance).toBe("stress");
    expect(input.expressionBlend).toBeTruthy();
  });

  it("streams partial reply into upbeat idle then happy emotion", () => {
    const early = analyzeStreamingReply("");
    expect(early.emotion).toBe("happy");
    const mid = analyzeStreamingReply("哈哈好開心");
    expect(mid.emotion).toBe("happy");
    expect(mid.talkStyle).toBeTruthy();
  });

  it("reads [mood] tags while tokens stream in", () => {
    const beforeMood = analyzeStreamingReply("我陪住你…");
    expect(beforeMood.emotion).not.toBe("sad");
    const withMood = analyzeStreamingReply("我陪住你… [mood:sad] [nuance:stress]");
    expect(withMood.emotion).toBe("happy");
    expect(withMood.nuance).toBe("love");
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
