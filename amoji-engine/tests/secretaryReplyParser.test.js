import { describe, expect, it } from "vitest";
import { parseSecretaryReply } from "../engine/companion/secretary/replyParser.js";

describe("secretary replyParser", () => {
  it("strips mood and structured tags from reply", () => {
    const parsed = parseSecretaryReply(
      "好呀，我幫你記低。[task:打電話俾媽媽|due:今晚][memory:媽媽電話晚上8點最方便][mood:happy]",
      { isEn: false },
    );
    expect(parsed.reply).toBe("好呀，我幫你記低。");
    expect(parsed.mood).toBe("happy");
    expect(parsed.tasks[0].title).toMatch(/媽媽/);
    expect(parsed.memories[0]).toMatch(/媽媽/);
  });

  it("parses draft tags", () => {
    const parsed = parseSecretaryReply(
      "Here you go [draft:Hi team, thanks for the update.][mood:happy]",
      { isEn: true },
    );
    expect(parsed.drafts[0]).toMatch(/Hi team/);
    expect(parsed.reply).not.toMatch(/\[draft:/);
  });

  it("parses ui navigation tags", () => {
    const parsed = parseSecretaryReply(
      "好，我幫你睇。[ui:tab:tasks][ui:mode:work][mood:happy]",
      { isEn: false },
    );
    expect(parsed.uiIntents).toEqual([
      { type: "tab", value: "tasks" },
      { type: "mode", value: "work" },
    ]);
    expect(parsed.reply).not.toMatch(/\[ui:/);
  });
});
