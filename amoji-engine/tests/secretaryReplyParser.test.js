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

  it("parses task action tags", () => {
    const parsed = parseSecretaryReply(
      "Done! [task:done:Call mom][task:snooze:Email Alex|for:2h][task:delete:Old errand][mood:happy]",
      { isEn: true },
    );
    expect(parsed.taskActions).toEqual([
      { action: "done", title: "Call mom" },
      { action: "snooze", title: "Email Alex", snoozeMs: 7200_000 },
      { action: "delete", title: "Old errand" },
    ]);
    expect(parsed.reply).toBe("Done!");
  });

  it("parses preference tags", () => {
    const parsed = parseSecretaryReply(
      "Updated. [pref:tone:friendly][pref:helpWith:work][pref:morningBrief:on][mood:happy]",
      { isEn: true },
    );
    expect(parsed.preferences).toEqual([
      { key: "tone", value: "friendly" },
      { key: "helpwith", value: "work" },
      { key: "morningbrief", value: "on" },
    ]);
  });

  it("parses ui filter tags", () => {
    const parsed = parseSecretaryReply(
      "Here are work tasks. [ui:tab:tasks][ui:filter:work][mood:happy]",
      { isEn: true },
    );
    expect(parsed.uiIntents).toEqual([
      { type: "tab", value: "tasks" },
      { type: "filter", value: "work" },
    ]);
  });
});
