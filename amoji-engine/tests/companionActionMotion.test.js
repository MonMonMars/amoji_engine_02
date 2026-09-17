import { describe, expect, it } from "vitest";
import {
  formatReplyForDisplay,
  inferActionFromReply,
  inferActionFromUserText,
  isUserStopCommand,
  parseReplyTags,
  sampleActionBodyPose,
  sampleActionRootMotion,
  stripEmojiFromText,
} from "../engine/companion/companionActionMotion.js";

describe("companionActionMotion", () => {
  it("parses mood and action tags", () => {
    const parsed = parseReplyTags("好呀！我跳俾你睇 [action:jump] [mood:happy]");
    expect(parsed.reply).toBe("好呀！我跳俾你睇");
    expect(parsed.action).toBe("jump");
    expect(parsed.emotion).toBe("happy");
  });

  it("strips emoji from display text while keeping performance tags", () => {
    const parsed = parseReplyTags("好開心呀 😊❤️ [action:wave] [mood:happy]");
    expect(parsed.reply).toBe("好開心呀");
    expect(parsed.emotion).toBe("happy");
    expect(formatReplyForDisplay("收到 🎉 [mood:happy]")).toBe("收到");
    expect(stripEmojiFromText("Hello 👋 world")).toBe("Hello world");
  });

  it("parses nuance tag", () => {
    const parsed = parseReplyTags(
      "收到！[action:nod] [nuance:curious] [mood:thinking]",
    );
    expect(parsed.nuance).toBe("curious");
    expect(parsed.emotion).toBe("thinking");
  });

  it("parses tags anywhere in the reply", () => {
    const parsed = parseReplyTags(
      "[action:kungfu] 哈！睇招！ [mood:happy] 再來！",
    );
    expect(parsed.reply).toBe("哈！睇招！ 再來！");
    expect(parsed.action).toBe("kungfu");
    expect(parsed.emotion).toBe("happy");
  });

  it("detects user stop commands", () => {
    expect(isUserStopCommand("停")).toBe(true);
    expect(isUserStopCommand("stop moving")).toBe(true);
    expect(isUserStopCommand("你好")).toBe(false);
  });

  it("infers kung fu from user text", () => {
    expect(inferActionFromUserText("show me kung fu")).toBe("kungfu");
    expect(inferActionFromUserText("一齊笑")).toBe("laugh");
  });

  it("reads tagged reply action", () => {
    expect(
      inferActionFromReply("睇我打拳！[action:kungfu] [mood:happy]", null),
    ).toBe("kungfu");
  });

  it("treats action:none as no motion", () => {
    expect(
      inferActionFromReply("我飛唔到呀 [action:none] [mood:sad]", null),
    ).toBeNull();
  });

  it("samples jump pose with vertical motion", () => {
    const mid = sampleActionBodyPose("jump", 0.5, 0.5);
    expect(mid.spineX).toBeLessThan(0);
    expect(mid.armLiftL).toBeGreaterThan(0);
  });

  it("samples a hand-to-mouth eat pose", () => {
    const mid = sampleActionBodyPose("eat", 0.4, 0.4);
    expect(mid.armLiftR).toBeGreaterThan(0.3);
    expect(mid.forearmR).toBeGreaterThan(0.3);
    expect(mid.headX).toBeGreaterThan(0.04);
  });

  it("samples a sip drink pose", () => {
    const mid = sampleActionBodyPose("drink", 0.3, 0.3);
    expect(mid.armLiftR).toBeGreaterThan(0.3);
    expect(mid.headX).toBeLessThan(0);
  });

  it("samples jump root bounce", () => {
    const mid = sampleActionRootMotion("jump", 0.5, 0.5);
    expect(mid.y).toBeGreaterThan(0);
  });
});
