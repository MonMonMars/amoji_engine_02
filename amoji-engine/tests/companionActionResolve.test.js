import { describe, expect, it } from "vitest";
import {
  resolveStreamingAction,
  resolveTurnPerformance,
} from "../engine/companion/companionActionResolve.js";

describe("companionActionResolve", () => {
  it("uses LLM action tag when present", () => {
    const out = resolveTurnPerformance("跳舞", "好呀！[action:dance] [mood:happy]");
    expect(out.action).toBe("dance");
  });

  it("falls back to user text when LLM omits action tag", () => {
    const out = resolveTurnPerformance("揮手俾我睇", "好呀，我揮手啦！[mood:happy]");
    expect(out.action).toBe("wave");
  });

  it("infers action from assistant reply prose", () => {
    const out = resolveTurnPerformance("hello", "Let me dance for you! [mood:happy]");
    expect(out.action).toBe("dance");
  });

  it("picks closest action for impossible-but-action requests", () => {
    const out = resolveTurnPerformance("做後空翻", "我試下轉一圈代替。[mood:happy]");
    expect(out.action).toBe("spin");
  });

  it("parses streaming action tags", () => {
    expect(resolveStreamingAction("OK [action:wave] [mood:")).toBe("wave");
    expect(resolveStreamingAction("hi [action:none]")).toBe(null);
  });

  it("infers body action from mood when LLM omits action tag", () => {
    const out = resolveTurnPerformance("今日好唔開心", "我陪住你。[mood:sad]");
    expect(out.action).toBe("hug");
    expect(out.emotion).toBe("sad");
  });
});
