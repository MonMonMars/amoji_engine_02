import { describe, expect, it } from "vitest";
import {
  analyzeSpeechWord,
  buildSpeechExpressionTimeline,
  expressionAtAudioProgress,
  tokenizeSpeakUnits,
} from "../engine/companion/companionSpeechFace.js";
import { analyzeSpeechChunk } from "../engine/companion/companionContentMotion.js";

describe("companionSpeechFace", () => {
  it("tokenizes CJK chars, Latin words, and punctuation", () => {
    expect(tokenizeSpeakUnits("你好 world!")).toEqual([
      "你",
      "好",
      "world",
      "!",
    ]);
  });

  it("maps emotional words to distinct face moods", () => {
    expect(analyzeSpeechWord("哈哈", { emotion: "neutral" }).emotion).toBe(
      "happy",
    );
    expect(analyzeSpeechWord("sorry", { emotion: "neutral" }).emotion).toBe(
      "sad",
    );
    expect(analyzeSpeechWord("!", { emotion: "neutral" }).emotion).toBe(
      "surprised",
    );
    expect(analyzeSpeechWord("?", { emotion: "happy" }).emotion).toBe(
      "thinking",
    );
  });

  it("walks expression timeline with audio progress", () => {
    const timeline = buildSpeechExpressionTimeline("好呀！真的？", {
      emotion: "neutral",
    });
    expect(timeline.length).toBeGreaterThan(3);
    const mid = expressionAtAudioProgress("好呀！真的？", 0.55, {
      emotion: "neutral",
    });
    expect(mid.unit).toBeTruthy();
    expect(mid.expressionBlend).toBeTruthy();
  });

  it("prefers word-level emotion inside speech chunks over reply baseline", () => {
    const analysis = analyzeSpeechChunk("…哈哈", {
      emotion: "neutral",
      nuance: "none",
    });
    expect(analysis.emotion).toBe("happy");
    expect(["哈", "哈哈", "…哈哈"]).toContain(analysis.unit);
  });
});
