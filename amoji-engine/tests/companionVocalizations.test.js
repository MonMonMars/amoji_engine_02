import { describe, expect, it } from "vitest";
import {
  applyPokeVocalToSpeech,
  applyVocalPrefixToSpeech,
  COMPANION_VOCALIZATIONS_SCHEMA,
  isVocalizationText,
  mergeVocalIntoSpeech,
  mergePokeVocalIntoSpeech,
  pickPokeVocalization,
  POKE_VOCAL_TYPES,
  pickPreSentenceVocalization,
  pickVocalLine,
  textAlreadyHasLeadingVocal,
  vocalizationInstructHint,
  VOCALIZATION_TYPES,
} from "../engine/companion/companionVocalizations.js";
import { buildTtsInstruct } from "../engine/companion/companionTtsProsody.js";

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
      "今日天氣真係好舒服呀。",
      { isEnglish: false },
    );
    expect(vocal).not.toBeNull();
    expect(VOCALIZATION_TYPES).toContain(vocal.type);
    expect(vocal.text.length).toBeGreaterThan(1);
  });

  it("picks giggle or laugh for poke only", () => {
    const poke = pickPokeVocalization(false);
    expect(poke.text).toBeTruthy();
    expect(POKE_VOCAL_TYPES).toContain(poke.type);
    expect(poke.performance.emotion).toBe("happy");
    expect(poke.performance.pokeReaction).toBe(true);
    expect(poke.text).toMatch(/嘻|哈|he|ha|tee/i);
  });

  it("mergePokeVocalIntoSpeech pauses between giggle and line", () => {
    expect(mergePokeVocalIntoSpeech("嘻嘻～", "我喺度呀", false)).toBe("嘻嘻～，我喺度呀");
    expect(mergePokeVocalIntoSpeech("Hehe!", "I'm here", true)).toBe("Hehe!… I'm here");
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

  it("merges vocal + sentence into one utterance string", () => {
    expect(mergeVocalIntoSpeech("Um……", "I am thinking about that.")).toBe(
      "Um…… I am thinking about that.",
    );
    expect(mergeVocalIntoSpeech("嗯……", "等我諗諗。")).toBe("嗯…… 等我諗諗。");
  });

  it("applyVocalPrefixToSpeech returns merged single-clip text", () => {
    const applied = applyVocalPrefixToSpeech(
      "I am thinking about that.",
      { emotion: "thinking", nuance: "curious" },
      { isEnglish: true },
    );
    expect(applied.merged).toBe(true);
    expect(applied.text).toMatch(/^Um|^Uh|^Hmm|^Mmm/i);
    expect(applied.text).toContain("I am thinking");
    expect(applied.performance.vocalPrefix).toBeTruthy();
    expect(applied.performance.skipVocalization).toBe(true);
  });

  it("applyPokeVocalToSpeech merges poke vocal into tap line", () => {
    const poke = applyPokeVocalToSpeech("I'm here!", { emotion: "happy" }, true);
    expect(poke.text).toMatch(/he|ha|tee|oh/i);
    expect(poke.text).toContain("I'm here!");
  });

  it("TTS instruct demands same speaker for vocal prefix clips", () => {
    const instruct = buildTtsInstruct({
      text: "Um…… I am thinking.",
      vocalPrefix: "Um……",
      vocalization: "um",
      emotion: "thinking",
      lang: "en",
    });
    expect(instruct).toMatch(/SAME speaker|SAME voice/i);
    expect(instruct).toMatch(/continuous take|one person/i);
  });
});
