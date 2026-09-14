import { describe, expect, it } from "vitest";
import {
  buildActionLlmContext,
  isActionRequest,
  isLikelyImpossibleAction,
  suggestClosestActions,
} from "../engine/companion/companionActionIntent.js";

describe("companionActionIntent", () => {
  it("detects action requests", () => {
    expect(isActionRequest("跳一下")).toBe(true);
    expect(isActionRequest("what is AI")).toBe(false);
    expect(isActionRequest("做個後空翻")).toBe(true);
  });

  it("flags impossible moves", () => {
    expect(isLikelyImpossibleAction("飛上天")).toBe(true);
    expect(isLikelyImpossibleAction("跳舞")).toBe(false);
  });

  it("suggests closest actions for unknown requests", () => {
    const picks = suggestClosestActions("backflip please");
    expect(picks[0]?.id).toBe("spin");
  });

  it("builds LLM context with decline rules", () => {
    const ctx = buildActionLlmContext("做後空翻", false);
    expect(ctx).toContain("[action:none]");
    expect(ctx).toContain("spin");
  });
});
