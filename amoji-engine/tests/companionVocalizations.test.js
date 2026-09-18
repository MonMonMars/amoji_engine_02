import { describe, expect, it } from "vitest";
import {
  COMPANION_VOCALIZATIONS_SCHEMA,
  isVocalizationText,
  pickPokeVocalization,
  pickPreSentenceVocalization,
  pickVocalLine,
  textAlreadyHasLeadingVocal,
  vocalizationInstructHint,
  VOCALIZATION_TYPES,
} from "../engine/companion/companionVocalizations.js";

describe("companionVocalizations", () => {
  it("exports schema and vocal types", () => {
    expect(COMPANION_VOCALIZATIONS_SCHEMA).toMatch(/vocalizations/i);
    expect(VOCALIZATION_TYPES).toContain("giggle");
    expect(VOCALIZATION_TYPES).toContain("thinking");
    expect(VOCALIZATION_TYPES.length).toBeGreaterThanOrEqual(8);
  });

  it("detects vocalization-only text", () => {
    expect(isVocalizationText("嗯……")).toBe(true);
    expect(isVocalizationText("Hehe～")).toBe(true);
    expect(isVocalizationText("Hello there friend")).toBe(false);
  });

  it("skips pre-vocal when line already starts with a hum", () => {
    expect(textAlreadyHasLeadingVocal("嗯，今日好開心呀")).toBe(true);
    expect(
      pickPreSentenceVocalization(
        { emotion: "happy", nuance: "excited" },
        "嗯，今日好開心呀",
        { isEnglish: false },
      ),
    ).toBeNull();
  });

  it("picks thinking vocal before thinking mood lines", () => {
    const vocal = pickPreSentenceVocalization(
      { emotion: "thinking", nuance: "curious", talkStyle: "thinking" },
      "等我諗清楚先再答你。",
      { isEnglish: false },
    );
    expect(vocal).not.toBeNull();
    expect(["um", "thinking"]).toContain(vocal.type);
    expect(vocal.text.length).toBeGreaterThan(1);
  });

  it("picks playful poke vocalizations", () => {
    const poke = pickPokeVocalization(false);
    expect(poke.text).toBeTruthy();
    expect(["giggle", "laugh", "smile", "gasp", "coy", "aww"]).toContain(poke.type);
    expect(poke.performance.emotion).toBe("happy");
  });

  it("returns bilingual vocal lines", () => {
    expect(pickVocalLine("giggle", false)).toMatch(/嘻|呵|唔/);
    expect(pickVocalLine("giggle", true)).toMatch(/he|tee|eh/i);
  });

  it("builds TTS instruct hints for vocalizations", () => {
    expect(vocalizationInstructHint("嘻嘻～")).toMatch(/giggle/i);
    expect(vocalizationInstructHint("Um……")).toMatch(/thinking hum/i);
    expect(vocalizationInstructHint("Hello")).toBe("");
  });

  it("respects skipVocalization flag", () => {
    expect(
      pickPreSentenceVocalization(
        { skipVocalization: true, emotion: "happy" },
        "好開心呀！",
        { isEnglish: false },
      ),
    ).toBeNull();
  });
});
