import { describe, expect, it } from "vitest";
import {
  buildPerformancePresetPromptFragment,
  buildReactionGuideLines,
  CONVERSATION_REACTIONS,
  CHARACTER_PERFORMANCE_STYLE,
} from "../engine/companion/companionLlmPerformancePreset.js";
import {
  buildCharacterSystemPrompt,
  getCharacter,
} from "../engine/companion/companionCharacterCatalog.js";
import { parseReplyTags } from "../engine/companion/companionActionMotion.js";
import { analyzeCompanionReply } from "../engine/companion/companionContentMotion.js";

describe("companionLlmPerformancePreset", () => {
  it("includes mood, nuance, moves, and reactions in prompt", () => {
    const frag = buildPerformancePresetPromptFragment(getCharacter("amoji"), true);
    expect(frag).toMatch(/FACIAL MOODS/i);
    expect(frag).toMatch(/FACE NUANCE/i);
    expect(frag).toMatch(/BODY MOVES/i);
    expect(frag).toMatch(/REACTION GUIDE/i);
    expect(frag).toMatch(/wave/);
  });

  it("has per-character performance style", () => {
    expect(CHARACTER_PERFORMANCE_STYLE.kizuna.moves).toContain("dance");
    expect(CHARACTER_PERFORMANCE_STYLE.rex.moves).toContain("salute");
    const kizuna = buildPerformancePresetPromptFragment(getCharacter("kizuna"), true);
    expect(kizuna).toMatch(/Kizuna/i);
    expect(kizuna).toMatch(/dance/);
  });

  it("defines at least ten conversation reactions", () => {
    expect(CONVERSATION_REACTIONS.length).toBeGreaterThanOrEqual(10);
    const lines = buildReactionGuideLines(true);
    expect(lines.some((l) => /dance/i.test(l))).toBe(true);
  });

  it("embeds preset in character system prompt", () => {
    const prompt = buildCharacterSystemPrompt("hina", true);
    expect(prompt).toMatch(/PERFORMANCE TAG FORMAT/i);
    expect(prompt).toMatch(/Hina/i);
  });
});

describe("nuance tag parsing", () => {
  it("parses nuance tag from reply", () => {
    const parsed = parseReplyTags(
      "好呀！[action:wave] [nuance:excited] [mood:happy]",
    );
    expect(parsed.action).toBe("wave");
    expect(parsed.nuance).toBe("excited");
    expect(parsed.emotion).toBe("happy");
    expect(parsed.reply).toBe("好呀！");
  });

  it("uses tagged nuance in analyzeCompanionReply", () => {
    const analysis = analyzeCompanionReply(
      "我喺度呀 [action:wave] [nuance:shy] [mood:happy]",
    );
    expect(analysis.nuance).toBe("shy");
    expect(analysis.action).toBe("wave");
    expect(analysis.emotion).toBe("happy");
  });
});
