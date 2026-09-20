import { describe, expect, it } from "vitest";
import {
  buildPositiveMindsetPromptFragment,
  normalizeCompanionPresenceEmotion,
} from "../engine/companion/companionPositiveMindset.js";
import { buildCharacterSystemPrompt } from "../engine/companion/companionCharacterCatalog.js";
import { analyzeCompanionReply } from "../engine/companion/companionContentMotion.js";

describe("companionPositiveMindset", () => {
  it("includes upbeat LLM rules in the system prompt", () => {
    const prompt = buildCharacterSystemPrompt("nova", true);
    expect(prompt).toMatch(/optimistic|positive/i);
    expect(prompt).toMatch(/\[mood:happy\]/i);
  });

  it("builds a positive mindset fragment", () => {
    expect(buildPositiveMindsetPromptFragment(true)).toContain("[mood:happy]");
    expect(buildPositiveMindsetPromptFragment(false)).toContain("正面");
  });

  it("normalizes low moods to happy presence", () => {
    expect(normalizeCompanionPresenceEmotion("sad", "none")).toEqual({
      emotion: "happy",
      nuance: "love",
    });
    expect(normalizeCompanionPresenceEmotion("neutral", "none")).toEqual({
      emotion: "happy",
      nuance: "none",
    });
  });

  it("defaults untagged factual replies to happy calm smile", () => {
    const content = analyzeCompanionReply("而家香港大約二十七度，有幾陣雨");
    expect(content.emotion).toBe("happy");
    expect(content.expressionBlend.Happy ?? 0).toBeGreaterThan(0.2);
  });
});
