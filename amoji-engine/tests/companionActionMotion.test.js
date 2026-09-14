import { describe, expect, it } from "vitest";
import {
  inferActionFromReply,
  inferActionFromUserText,
  isUserStopCommand,
  parseReplyTags,
  sampleActionBodyPose,
} from "../engine/companion/companionActionMotion.js";

describe("companionActionMotion", () => {
  it("parses mood and action tags", () => {
    const parsed = parseReplyTags("好呀！我跳俾你睇 [action:jump] [mood:happy]");
    expect(parsed.reply).toBe("好呀！我跳俾你睇");
    expect(parsed.action).toBe("jump");
    expect(parsed.emotion).toBe("happy");
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

  it("samples jump pose with vertical motion", () => {
    const mid = sampleActionBodyPose("jump", 0.5, 0.5);
    expect(mid.spineX).toBeLessThan(0);
    expect(mid.armLiftL).toBeGreaterThan(0);
  });
});
