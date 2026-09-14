import { describe, expect, it } from "vitest";
import {
  analyzeCompanionReply,
  buildVrmExpressionBlend,
  inferContentNuance,
  inferOneShotGesture,
  parseReplyMood,
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

  it("builds excited expression blend", () => {
    const blend = buildVrmExpressionBlend("happy", "excited");
    expect(blend.Happy).toBeGreaterThan(0.85);
    expect(blend.Surprised).toBeGreaterThan(0.1);
  });
});
