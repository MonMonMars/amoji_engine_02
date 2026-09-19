import { describe, expect, it } from "vitest";
import {
  isNaturalFillerPhrase,
  pickNextThinkingPhrase,
  pickThinkingPhrase,
  THINKING_PHRASES_EN,
} from "../engine/companion/companionThinkingDialogue.js";
import { pickPreSentenceVocalization } from "../engine/companion/companionVocalizations.js";

describe("companionThinkingDialogue", () => {
  it("uses natural English fillers, not meta thinking lines", () => {
    expect(THINKING_PHRASES_EN).toContain("Let me see…");
    expect(THINKING_PHRASES_EN).toContain("Let me think. Um…..");
    expect(THINKING_PHRASES_EN).toContain("Um……");
    expect(THINKING_PHRASES_EN).toContain("Let me search online…");
    expect(THINKING_PHRASES_EN).not.toContain("Still thinking…");
    expect(THINKING_PHRASES_EN.join(" ")).not.toMatch(/I am thinking|working on an answer/i);
  });

  it("detects natural filler phrases", () => {
    expect(isNaturalFillerPhrase("Let me see…")).toBe(true);
    expect(isNaturalFillerPhrase("Um…")).toBe(true);
    expect(isNaturalFillerPhrase("Let me think. Um…..")).toBe(true);
    expect(isNaturalFillerPhrase("I am thinking about that")).toBe(false);
  });

  it("picks thinking phrases with ellipsis", () => {
    expect(pickThinkingPhrase(true)).toMatch(/…|\.{3}|Um|Hmm|Let me/);
    const next = pickNextThinkingPhrase(false, 0);
    expect(next.phrase.length).toBeGreaterThan(1);
  });

  it("skips extra vocal prefix on natural filler lines", () => {
    expect(
      pickPreSentenceVocalization(
        { emotion: "thinking" },
        "Let me search online for that.",
        { isEnglish: true },
      ),
    ).toBeNull();
  });
});
